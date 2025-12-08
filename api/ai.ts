
export const config = {
  runtime: 'edge', // 使用 Edge Runtime，支持流式传输且没有 10s 超时限制
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, model } = await req.json();

    // 1. 安全性：Key 只在服务器端读取，前端无法获取
    const apiKey = process.env.ALIYUN_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 构造阿里云请求
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable" // 开启流式输出 (Server-Sent Events)
      },
      body: JSON.stringify({
        model: model || "qwen-plus",
        input: { messages },
        parameters: {
          result_format: "message",
          enable_search: false,
          incremental_output: true // 增量输出，降低延迟
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error: ${err}` }), { status: response.status });
    }

    // 3. 建立流式管道 (Pipe)
    // 直接把阿里云的流转发给前端，不进行缓冲，彻底解决 504 超时问题
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();

    if (!reader) throw new Error("No response body");

    // 异步处理流
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 解析阿里云的 SSE 格式
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
               const jsonStr = line.replace('data:', '').trim();
               if (jsonStr === '' || jsonStr === '[DONE]') continue;
               try {
                  const data = JSON.parse(jsonStr);
                  if (data.output && data.output.choices && data.output.choices[0].message.content) {
                      const text = data.output.choices[0].message.content;
                      await writer.write(encoder.encode(text));
                  }
               } catch (e) {
                   // Ignore parse errors for partial chunks
               }
            }
          }
        }
      } catch (e) {
        console.error("Stream error", e);
        await writer.write(encoder.encode(`\n[ERROR: ${e}]`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}

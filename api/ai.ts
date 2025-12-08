
export const config = {
  runtime: 'edge', // 使用 Edge Runtime，支持流式传输
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { messages, model } = await req.json();

    const apiKey = process.env.ALIYUN_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing ALIYUN_API_KEY in Vercel env' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 调用阿里云 DashScope (兼容 OpenAI 格式或直接使用阿里云格式，这里用阿里云原生 SSE)
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-SSE": "enable" // 关键：开启 SSE 流式输出
      },
      body: JSON.stringify({
        model: model || "qwen-plus",
        input: { messages },
        parameters: {
          result_format: "message",
          incremental_output: true // 关键：增量输出，降低延迟
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `Aliyun API Error: ${err}` }), { status: response.status });
    }

    // 创建流式管道
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
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
               const jsonStr = line.replace('data:', '').trim();
               if (!jsonStr || jsonStr === '[DONE]') continue;
               
               try {
                  const data = JSON.parse(jsonStr);
                  // 阿里云返回结构: output.choices[0].message.content
                  if (data.output?.choices?.[0]?.message?.content) {
                      const text = data.output.choices[0].message.content;
                      await writer.write(encoder.encode(text));
                  }
               } catch (e) {
                   // 忽略解析错误的片段
               }
            }
          }
        }
      } catch (e) {
        console.error("Stream processing error:", e);
        await writer.write(encoder.encode(`\n[System Error: Stream interrupted]`));
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


import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";
import { dataService } from "./dataService";

// 阿里云配置 
// 策略调整: qwen-max 太慢会导致 CORS 代理 504 超时。
// 改用 qwen-plus (速度快且质量高)，并做降级处理。
const MODEL_MAIN = "qwen-plus"; 
const MODEL_FAST = "qwen-turbo"; 
const ALIYUN_MODEL_IMAGE = "wanx-v1";

// CORS 代理列表 (如果一个挂了可以切另一个，这里暂时用最稳的一个)
const CORS_PROXY = "https://corsproxy.io/?";

let _cachedKey: string | null = null;

export const resetAiClient = () => {
  _cachedKey = null;
};

// 获取阿里云 Key (优先查数据库)
const getAliyunKey = async (): Promise<string> => {
  if (_cachedKey) return _cachedKey;

  try {
    const dbKey = await dataService.fetchSystemConfig('ALIYUN_API_KEY');
    if (dbKey && dbKey.startsWith('sk-')) {
      _cachedKey = dbKey;
      console.log("✅ [Aliyun] 使用数据库配置的 Key");
      return dbKey;
    }
  } catch (e) {
    console.warn("数据库 Key 读取失败");
  }

  throw new Error(
    "未配置阿里云 API Key。\n" +
    "请点击左下角【系统设置】，输入您的 DashScope Key (sk-开头)。\n" +
    "申请地址: https://bailian.console.aliyun.com/"
  );
};

// 核心调用函数 (包含重试机制)
const callDashScope = async (messages: any[], useJsonMode: boolean = false): Promise<string> => {
  const apiKey = await getAliyunKey();
  
  // 内部函数：发送单次请求
  const sendRequest = async (model: string) => {
    const payload: any = {
      model: model,
      input: { messages },
      parameters: {
        result_format: "message",
        // 如果需要 JSON，强制模型输出 JSON 格式
        enable_search: false // 关闭联网搜索以提高速度
      }
    };

    const targetUrl = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;

    console.log(`🚀 AI Request: ${model} ...`);

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      // 处理 CORS 代理特有的 504 错误
      if (response.status === 504) {
        throw new Error("TIMEOUT");
      }
      throw new Error(`Aliyun Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (!data.output || !data.output.choices || data.output.choices.length === 0) {
        throw new Error("Empty Response");
    }
    return data.output.choices[0].message.content;
  };

  try {
    // 1. 尝试使用主力模型 (Plus)
    return await sendRequest(MODEL_MAIN);
  } catch (error: any) {
    // 2. 如果超时 (TIMEOUT) 或其他网络错误，降级到极速模型 (Turbo)
    if (error.message === "TIMEOUT" || error.message.includes("504") || error.message.includes("Failed to fetch")) {
        console.warn(`⚠️ ${MODEL_MAIN} 超时，正在降级到 ${MODEL_FAST} 重试...`);
        try {
            return await sendRequest(MODEL_FAST);
        } catch (retryError: any) {
            throw new Error(`AI 生成失败: 网络连接不稳定 (${retryError.message})`);
        }
    }
    throw error;
  }
};

// 强力 JSON 解析器
const extractJson = (text: string): any => {
  let jsonString = text.trim();
  const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) jsonString = match[1];
  
  // 修复常见的 JSON 结尾错误
  const firstOpen = jsonString.indexOf('{');
  const firstArr = jsonString.indexOf('[');
  
  // 确定是对象还是数组
  const isArray = firstArr !== -1 && (firstOpen === -1 || firstArr < firstOpen);
  
  if (isArray) {
      const lastArr = jsonString.lastIndexOf(']');
      if (firstArr !== -1 && lastArr !== -1) jsonString = jsonString.substring(firstArr, lastArr + 1);
  } else {
      const lastOpen = jsonString.lastIndexOf('}');
      if (firstOpen !== -1 && lastOpen !== -1) jsonString = jsonString.substring(firstOpen, lastOpen + 1);
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON Parse Error", text);
    throw new Error("AI 生成数据格式解析失败，请重试");
  }
};

// --- 业务功能 ---

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  try {
    const prompt = `
      任务：批改小学${subject}作业。
      学生：${studentName}
      内容：${content}
      要求：JSON格式返回 {"score": number, "feedback": "string"}
    `;
    const text = await callDashScope([{ role: "user", content: prompt }]);
    const res = extractJson(text);
    return { score: res.score || 85, feedback: res.feedback || "批改完成" };
  } catch (error) {
    console.error(error);
    return { score: 0, feedback: "AI 服务暂时不可用" };
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  subject: Subject,
  recentScores: number[]
): Promise<string> => {
  const prompt = `
    请分析学生${studentName}(${subject})的近期成绩:${recentScores.join(',')}。
    请给出：1.成绩趋势 2.能力画像 3.提升建议。
    Markdown格式，语气专业亲切。
  `;
  return await callDashScope([{ role: "user", content: prompt }]);
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  const context = textbookContext || "通用教材";
  const prompt = `
    角色：小学${subject}特级教师。
    任务：为"${topic}"设计教案。
    背景：${context}。
    要求：
    1. 环节完整(导入、新授、练习、总结)。
    2. 严格输出 JSON 格式。
    
    JSON结构示例:
    {
      "topic": "${topic}",
      "textbookContext": "...",
      "objectives": ["目标1", "目标2"],
      "keyPoints": ["重点1", "难点1"],
      "process": [
         {"phase": "一、导入", "duration": "5分钟", "activity": "..."}
      ],
      "blackboard": ["板书内容"],
      "homework": "..."
    }
  `;
  const text = await callDashScope([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generatePPTSlides = async (
  topic: string,
  objectives: string[],
  subject: string
): Promise<PresentationSlide[]> => {
  const prompt = `
    任务：为"${topic}"生成PPT大纲(6-8页)。
    要求：JSON数组格式。
    
    结构示例:
    [
      {
        "layout": "TITLE",
        "title": "${topic}",
        "content": ["副标题"],
        "notes": "...",
        "visualPrompt": "English prompt for cover image"
      },
      {
        "layout": "CONTENT",
        "title": "...",
        "content": ["..."],
        "notes": "...",
        "visualPrompt": "English prompt"
      }
    ]
  `;
  const text = await callDashScope([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateQuiz = async (
  topic: string,
  keyPoints: string[]
): Promise<QuizQuestion[]> => {
  const prompt = `
    任务：为"${topic}"出10道单选题。
    要求：JSON数组。
    
    结构示例:
    [
      {
        "difficulty": "基础",
        "question": "...",
        "options": ["A","B","C","D"],
        "correctAnswer": 0,
        "explanation": "..."
      }
    ]
  `;
  const text = await callDashScope([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  try {
    const apiKey = await getAliyunKey();
    // 生图接口 (Wanx) 通常比较快，不太容易 504，但我们也加上 try catch
    const submitUrl = `${CORS_PROXY}${encodeURIComponent("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis")}`;
    
    const response = await fetch(submitUrl, {
      method: "POST",
      headers: {
        "X-DashScope-WorkSpace": "model", 
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: ALIYUN_MODEL_IMAGE,
        input: { prompt: prompt + ", cartoon style, simple, educational" },
        parameters: { size: "1024*1024", n: 1 }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.output && data.output.task_id) {
       return await pollImageTask(data.output.task_id, apiKey);
    }
    return null;
  } catch (e) {
    console.error("Image Gen Error", e);
    return null; 
  }
};

const pollImageTask = async (taskId: string, apiKey: string): Promise<string | null> => {
  const checkUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(checkUrl)}`;

  for (let i = 0; i < 20; i++) { // 轮询 20 次
    await new Promise(r => setTimeout(r, 2000));
    try {
        const response = await fetch(proxyUrl, { headers: { "Authorization": `Bearer ${apiKey}` } });
        if (!response.ok) continue;
        const data = await response.json();
        if (data.output && data.output.task_status === 'SUCCEEDED') return data.output.results[0].url; 
        if (data.output && data.output.task_status === 'FAILED') return null;
    } catch(e) {}
  }
  return null;
};

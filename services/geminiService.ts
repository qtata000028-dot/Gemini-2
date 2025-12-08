
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";
import { dataService } from "./dataService";

// 商用级配置: 调用 Vercel Serverless 后端
const API_ENDPOINT = "/api/ai"; 

// 模型配置
const MODEL_TEXT = "qwen-max"; // 使用最强模型，后端流式传输支持，不怕超时
const MODEL_IMAGE = "wanx-v1"; // 生图依然走代理或后端

export const resetAiClient = () => {
  // 无需重置，无状态
};

// 核心调用函数：调用我们自己的后端
const callBackendAI = async (messages: any[], useJsonMode: boolean = false): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        model: MODEL_TEXT
      })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `后端请求失败 (${response.status})`);
    }

    // 处理流式响应 (Streaming Response)
    // 即使后端一点点吐数据，我们也等待全部接收完再处理 (简单起见)
    // 如果需要打字机效果，可以在 UI 层改进，但目前为了兼容旧代码，我们在这里聚合所有文本
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) throw new Error("无法读取响应流");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
    }

    if (!fullText) throw new Error("AI 返回内容为空");
    return fullText;

  } catch (error: any) {
    console.error("AI Service Error:", error);
    // 友好的错误提示
    if (error.message.includes("Missing API Key")) {
        throw new Error("系统配置错误：Vercel 环境变量中未配置 ALIYUN_API_KEY");
    }
    throw new Error(`智能生成失败: ${error.message}`);
  }
};

// 强力 JSON 解析器
const extractJson = (text: string): any => {
  let jsonString = text.trim();
  // 移除可能存在的 Markdown 代码块标记
  jsonString = jsonString.replace(/^```json\s*/i, '').replace(/```$/, '');
  
  // 尝试寻找 JSON 的开始和结束
  const firstOpen = jsonString.indexOf('{');
  const firstArr = jsonString.indexOf('[');
  
  // 确定是对象还是数组
  const isArray = firstArr !== -1 && (firstOpen === -1 || firstArr < firstOpen);
  
  let startIndex = isArray ? firstArr : firstOpen;
  let endIndex = -1;

  if (startIndex !== -1) {
      if (isArray) {
          endIndex = jsonString.lastIndexOf(']');
      } else {
          endIndex = jsonString.lastIndexOf('}');
      }
      if (endIndex !== -1) {
          jsonString = jsonString.substring(startIndex, endIndex + 1);
      }
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON Parse Error, Raw Text:", text);
    throw new Error("AI 生成的数据格式有误，请重试");
  }
};

// --- 业务功能实现 ---

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  const prompt = `
    角色：小学${subject}资深教师。
    任务：批改学生"${studentName}"的作业。
    作业内容：${content}
    
    请严格按照以下 JSON 格式返回：
    {
      "score": number (0-100),
      "feedback": "string (评语，语气亲切，指出优点和改进点)"
    }
  `;
  try {
    const text = await callBackendAI([{ role: "user", content: prompt }]);
    const res = extractJson(text);
    return { score: res.score || 85, feedback: res.feedback || "作业已阅。" };
  } catch (e) {
    console.error(e);
    return { score: 0, feedback: "AI 服务繁忙，请稍后重试" };
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  subject: Subject,
  recentScores: number[]
): Promise<string> => {
  const prompt = `
    请分析学生${studentName}在${subject}学科的近期成绩变化：${recentScores.join(', ')}。
    请生成一份简短的诊断报告，包含：
    1. 成绩趋势分析
    2. 存在的潜在问题
    3. 针对性的提升建议
    
    使用 Markdown 格式，排版清晰。
  `;
  return await callBackendAI([{ role: "user", content: prompt }]);
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  const context = textbookContext ? `参考教材内容：${textbookContext}` : "基于人教版小学教材标准";
  const prompt = `
    你是一位有着20年经验的小学${subject}特级教师。请为课题"${topic}"设计一份详尽的教案。
    ${context}
    
    要求：
    1. 教学目标明确（三维目标）。
    2. 教学过程设计要有趣味性，包含具体的师生互动脚本。
    3. 必须输出为合法的 JSON 格式。

    JSON 结构模板：
    {
      "topic": "${topic}",
      "textbookContext": "简述教材分析",
      "objectives": ["目标1", "目标2", "目标3"],
      "keyPoints": ["重点1", "难点1"],
      "process": [
         {"phase": "一、激趣导入", "duration": "5分钟", "activity": "详细的活动描述和对话..."},
         {"phase": "二、探究新知", "duration": "15分钟", "activity": "..."}
      ],
      "blackboard": ["板书设计点1", "板书设计点2"],
      "homework": "具体的作业内容"
    }
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generatePPTSlides = async (
  topic: string,
  objectives: string[],
  subject: string
): Promise<PresentationSlide[]> => {
  const prompt = `
    请为小学${subject}课"${topic}"生成一份 8 页的 PPT 大纲。
    教学目标：${objectives.join('; ')}。
    
    要求返回 JSON 数组，每个元素是一个 Slide 对象：
    [
      {
        "layout": "TITLE" | "CONTENT" | "TWO_COLUMN" | "CONCLUSION",
        "title": "页标题",
        "content": ["要点1", "要点2"],
        "notes": "演讲备注",
        "visualPrompt": "Detailed English description for an educational illustration representing this slide, cartoon style"
      }
    ]
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateQuiz = async (
  topic: string,
  keyPoints: string[]
): Promise<QuizQuestion[]> => {
  const prompt = `
    请根据课题"${topic}"的重点(${keyPoints.join(',')})，出 5 道单项选择题，用于课堂检测。
    
    返回 JSON 数组：
    [
      {
        "difficulty": "基础" | "进阶" | "挑战",
        "question": "题目内容",
        "options": ["选项A", "选项B", "选项C", "选项D"],
        "correctAnswer": 0 (0-3, 代表正确选项索引),
        "explanation": "答案解析"
      }
    ]
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

// 生图功能目前仍需直接调用（或通过后端转发，暂保持现状）
// 注意：商业版通常会把生图也移到后端，这里为了简化先通过前端代理调用，后续可升级
export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  try {
     // 临时方案：这里需要前端获取 Key，但为了商用安全，建议后续也将此移至 api/ai-image.ts
     // 这里我们暂时返回 null，建议用户使用 PPT 自带的模板背景，直到配置好后端生图
     return null; 
  } catch (e) {
    return null;
  }
};

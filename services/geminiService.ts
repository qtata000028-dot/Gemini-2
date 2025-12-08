
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";

let _cachedClient: GoogleGenAI | null = null;

// 使用稳定版模型，防止 404 错误
const MODEL_NAME = "gemini-1.5-flash";
// 图片生成仍尝试使用专用模型，如果您的 Key 不支持，代码会自动降级处理（不生成图片）
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

export const resetAiClient = () => {
  _cachedClient = null;
};

const getAiClient = async (): Promise<GoogleGenAI> => {
  if (_cachedClient) {
    return _cachedClient;
  }

  let apiKey = "";
  
  // 1. 优先读取 Vite 注入的变量 (适用于 Vercel 部署的前端项目)
  // Vite 默认只暴露以 VITE_ 开头的环境变量
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    apiKey = import.meta.env.VITE_API_KEY;
  } 
  // 2. 兼容 Node 环境或旧有的 process.env 配置 (兜底)
  else if (typeof process !== 'undefined' && process.env && process.env.VITE_API_KEY) {
    apiKey = process.env.VITE_API_KEY;
  }

  // 3. 最后的尝试：检查是否有未带 VITE_ 前缀的 API_KEY
  if (!apiKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
     apiKey = process.env.API_KEY;
  }

  // 严格校验
  if (!apiKey || apiKey.length < 10) {
    console.error("❌ Critical Error: API Key is missing.");
    throw new Error(
      "API Key 未配置或无效。\n\n" +
      "请在 Vercel 环境变量中设置 VITE_API_KEY 并重新部署。\n" +
      "(注意：变量名必须严格为 'VITE_API_KEY'，否则前端代码无法读取)"
    );
  }

  _cachedClient = new GoogleGenAI({ apiKey: apiKey });
  return _cachedClient;
};

const handleGeminiError = (error: any, context: string) => {
  console.error(`Gemini Error [${context}]:`, error);
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('429') || msg.includes('quota') || msg.includes('too many requests')) {
    throw new Error("AI 服务繁忙 (429): API 调用次数超限，请稍后重试。");
  }
  if (msg.includes('401') || msg.includes('key') || msg.includes('invalid')) {
    throw new Error("API Key 无效 (401): 请检查 Vercel 环境变量 VITE_API_KEY 是否配置正确。");
  }
  if (msg.includes('404') || msg.includes('not found')) {
    throw new Error(`模型不可用 (404): 当前 Key 可能不支持 ${MODEL_NAME}，或模型未对该区域开放。`);
  }
  throw new Error(`AI 请求失败: ${msg.substring(0, 80)}...`);
};

// --- Schemas ---

const gradingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Score from 0 to 100" },
    feedback: { type: Type.STRING, description: "Constructive feedback in Chinese" },
  },
  required: ["score", "feedback"],
};

const lessonPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    textbookContext: { type: Type.STRING },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    process: { 
      type: Type.ARRAY, 
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING },
          duration: { type: Type.STRING },
          activity: { type: Type.STRING },
        },
        required: ["phase", "duration", "activity"]
      } 
    },
    blackboard: { type: Type.ARRAY, items: { type: Type.STRING } },
    homework: { type: Type.STRING },
  },
  required: ["topic", "objectives", "keyPoints", "process", "blackboard", "homework"],
};

const slideSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      layout: { type: Type.STRING, enum: ["TITLE", "CONTENT", "TWO_COLUMN", "CONCLUSION"] },
      title: { type: Type.STRING },
      content: { type: Type.ARRAY, items: { type: Type.STRING } },
      notes: { type: Type.STRING },
      visualPrompt: { type: Type.STRING, description: "English prompt for image generation" },
    },
    required: ["layout", "title", "content", "visualPrompt"]
  }
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      difficulty: { type: Type.STRING, enum: ["基础", "进阶", "挑战"] },
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswer: { type: Type.NUMBER, description: "Index of correct option (0-3)" },
      explanation: { type: Type.STRING },
    },
    required: ["difficulty", "question", "options", "correctAnswer", "explanation"]
  }
};

// --- API Functions ---

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      Task: Grade this homework for a primary school ${subject} student named ${studentName}.
      Homework Content: "${content}"
      Requirements: Give a score (0-100) and encouraging feedback in Chinese.
    `;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: gradingSchema 
      }
    });

    // Google GenAI SDK v1.0+ 使用 .text 属性 (getter)
    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      score: result.score || 85,
      feedback: result.feedback || "作业已收到，继续努力！"
    };
  } catch (error) {
    handleGeminiError(error, 'Grading');
    return { score: 0, feedback: "AI 批改服务暂时不可用" };
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  subject: Subject,
  recentScores: number[]
): Promise<string> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      分析学生 ${studentName} (${subject}) 的近期成绩: ${recentScores.join(', ')}。
      生成"成绩走势"、"薄弱点"、"3条建议"。
    `;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "暂无分析数据。";
  } catch (error: any) {
    handleGeminiError(error, 'Analysis');
    return "分析报告生成失败";
  }
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  try {
    const ai = await getAiClient();
    const contextStr = textbookContext ? `教材内容参考: ${textbookContext}` : "基于通用小学教材标准";
    const prompt = `
      Role: Expert Primary School ${subject} Teacher.
      Task: Create a detailed lesson plan for "${topic}".
      Context: ${contextStr}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: lessonPlanSchema
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    handleGeminiError(error, 'LessonPlan');
    return null;
  }
};

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = await getAiClient();
    // 尝试使用专用图像模型
    // 注意：如果您的 Key 无法访问 gemini-2.5-flash-image，此处会报错并被捕获，不影响主流程
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt + " high quality, educational illustration, 4k, clean style, vector art style, soft colors, minimalist background" }]
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    // 默默失败，不打断 PPT 生成流程
    console.warn("Image Gen Error (Non-fatal): Model likely not available.", error);
    return null;
  }
};

export const generatePPTSlides = async (
  topic: string,
  objectives: string[],
  subject: string
): Promise<PresentationSlide[]> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      Design an 8-slide PowerPoint outline for Primary School ${subject}.
      Topic: "${topic}"
      Learning Objectives: ${objectives.join(', ')}
      Requirements: 1. Slide 1 TITLE, Last CONCLUSION. "visualPrompt" for AI image gen. Language: Chinese.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: slideSchema
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    handleGeminiError(error, 'PPT');
    return [];
  }
};

export const generateQuiz = async (
  topic: string,
  keyPoints: string[]
): Promise<QuizQuestion[]> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      Topic: ${topic}
      Key Concepts: ${keyPoints.join(', ')}
      Task: Generate 10 quiz questions (3 Easy, 4 Medium, 3 Hard).
      Format: JSON. Language: Chinese.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: quizSchema
      }
    });
    
    const data = JSON.parse(response.text || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleGeminiError(error, 'Quiz');
    return [];
  }
};

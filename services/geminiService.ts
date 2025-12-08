
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";

let _cachedClient: GoogleGenAI | null = null;

// 清除缓存
export const resetAiClient = () => {
  _cachedClient = null;
};

// Async initializer for the AI client
const getAiClient = async (): Promise<GoogleGenAI> => {
  if (_cachedClient) {
    return _cachedClient;
  }

  // 核心修复 1: 适配 Vite 的环境变量标准
  // Vercel 部署时，请在 Settings -> Environment Variables 中添加 "VITE_API_KEY"
  // 这样不需要修改 vite.config.ts 也能读取到
  let apiKey = "";
  
  // 尝试读取 Vite 注入的变量
  // Use type casting to access .env on import.meta to avoid TS errors
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_API_KEY) {
    apiKey = meta.env.VITE_API_KEY;
  } 
  // 兼容旧的 process.env 写法
  else if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }

  // 严格校验
  if (!apiKey || apiKey.length < 10) {
    console.error("❌ Critical Error: API Key is missing.");
    throw new Error(
      "系统未检测到有效的 API Key。\n\n" +
      "【Vercel 部署修复指南】\n" +
      "1. 进入 Vercel 项目设置 -> Environment Variables\n" +
      "2. 添加变量名: VITE_API_KEY (推荐) 或 API_KEY\n" +
      "3. 填入您的 Key 值\n" +
      "4. 保存后，必须点击 Deployments -> Redeploy 才能生效！"
    );
  }

  _cachedClient = new GoogleGenAI({ apiKey: apiKey });
  return _cachedClient;
};

const handleGeminiError = (error: any, context: string) => {
  console.error(`Gemini Error [${context}]:`, error);
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('429') || msg.includes('too many requests')) {
    throw new Error("AI 服务繁忙 (429): 请稍后再试 (Public Key 额度耗尽)。");
  }
  if (msg.includes('401') || msg.includes('api key') || msg.includes('invalid')) {
    throw new Error("API Key 无效 (401): 请检查 Vercel 环境变量配置。");
  }
  throw new Error(`AI 请求失败: ${msg.substring(0, 80)}...`);
};

// --- Schemas (核心修复 2: 使用 Schema 强制 JSON 结构) ---

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
      
      Requirements:
      1. Give a score (0-100).
      2. Provide encouraging feedback in Chinese (approx 50 words).
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: gradingSchema 
      }
    });

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
    // Analysis is free-form text, no JSON schema needed
    const prompt = `
      分析学生 ${studentName} (${subject}) 的近期成绩: ${recentScores.join(', ')}。
      生成"成绩走势"、"薄弱点"、"3条建议"。请用加粗作为标题，不要用Markdown标题语法。
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
      
      Requirements:
      - Objectives: 3 clear goals.
      - Key Points: 2-3 difficult points.
      - Process: 4-5 steps with duration and detailed activities.
      - Blackboard: Layout design points.
      - Homework: Specific assignment.
      - Language: Chinese.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
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
    console.warn("Image Gen Error (Non-fatal):", error);
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
    // 核心修复 3: 强化 Context，把教学目标传给 PPT 生成
    const prompt = `
      Design an 8-slide PowerPoint outline for Primary School ${subject}.
      Topic: "${topic}"
      Learning Objectives: ${objectives.join(', ')}
      
      Requirements:
      1. Slide 1 must be TITLE layout.
      2. Last slide must be CONCLUSION layout.
      3. Other slides: CONTENT or TWO_COLUMN.
      4. "visualPrompt": Write a specific, simple English prompt for an AI image generator to create a background for this slide (e.g. "cute cartoon math numbers vector art").
      5. Content language: Chinese.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    // 核心修复 3: 强化 Context
    const prompt = `
      Topic: ${topic}
      Key Concepts to Cover: ${keyPoints.join(', ')}
      
      Task: Generate 10 quiz questions for primary school students.
      Distribution: 3 Easy (基础), 4 Medium (进阶), 3 Hard (挑战).
      Format: Multiple choice (4 options).
      Language: Chinese.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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

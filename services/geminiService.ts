
import { GoogleGenAI } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";
import { dataService } from "./dataService";

let _cachedClient: GoogleGenAI | null = null;
let _cachedKey: string | null = null;

// 清除缓存（当用户在 UI 更新 Key 后调用）
export const resetAiClient = () => {
  console.log("🔄 重置 AI 客户端缓存，下次请求将重新读取数据库...");
  _cachedClient = null;
  _cachedKey = null;
};

// Async initializer for the AI client
const getAiClient = async (): Promise<GoogleGenAI> => {
  // 如果已有缓存，直接返回。注意：如果用户在 UI 重置了 key，_cachedClient 会变成 null，从而触发重新读取。
  if (_cachedClient && _cachedKey) {
    return _cachedClient;
  }

  console.log("🔌 正在连接 AI 服务，读取数据库配置...");
  let finalKey = null;

  // 1. 【唯一真理】从数据库 System Config 表读取
  try {
    const dbKey = await dataService.fetchSystemConfig('GEMINI_API_KEY');
    if (dbKey && dbKey.length > 10) { 
      // 关键修复：去除可能的空格和换行符
      finalKey = dbKey.trim();
      console.log(`✅ 成功从数据库获取 API Key (Key末尾: ...${finalKey.slice(-4)})`);
    } else {
      console.log("⚠️ 数据库 system_config 表中未找到 'GEMINI_API_KEY'，或值为空。");
    }
  } catch (e) {
    console.error("❌ 读取数据库配置失败:", e);
  }

  // 2. 如果数据库没有，再尝试读取环境变量 (Vercel) - 但不作为主要依赖
  if (!finalKey) {
     if (typeof process !== 'undefined' && process.env?.API_KEY && process.env.API_KEY.length > 20) {
       console.log("✅ 使用 process.env.API_KEY");
       finalKey = process.env.API_KEY.trim();
     } else if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY && (window as any).process.env.API_KEY.length > 20) {
       console.log("✅ 使用 window.process.env.API_KEY");
       finalKey = (window as any).process.env.API_KEY.trim();
     }
  }

  if (!finalKey) {
     console.error("❌ 致命错误: 未找到任何可用的 API Key");
     throw new Error("系统未配置 AI Key！请点击左下角【设置】图标，将您的 Google Gemini API Key 存入数据库。");
  }

  _cachedKey = finalKey;
  _cachedClient = new GoogleGenAI({ apiKey: finalKey });
  return _cachedClient;
};

const handleGeminiError = (error: any, context: string) => {
  console.error(`Gemini Error [${context}]:`, error);
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('429') || msg.includes('too many requests')) {
    throw new Error("AI 服务繁忙 (429): Key 额度已耗尽。请在设置中更换新的 Key。");
  }
  if (msg.includes('401') || msg.includes('api key') || msg.includes('invalid')) {
    // 这里的提示更明确，告诉用户数据库里的 key 可能是错的
    throw new Error("API Key 无效 (401)。请检查设置中的 Key 是否有多余空格或已过期。");
  }
  if (msg.includes('403')) {
      throw new Error("API Key 权限不足 (403)。请检查 Google Cloud 计费或地区限制。");
  }
  throw new Error(`AI 服务请求失败: ${msg.substring(0, 100)}`);
};

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  try {
    const ai = await getAiClient();
    const prompt = `
      你是一位经验丰富的小学${subject}老师。学生${studentName}提交了作业："${content}"。
      请批改并返回JSON: { "score": number, "feedback": "50字左右温和的评语" }。
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      score: result.score || 85,
      feedback: result.feedback || "作业已收到，继续努力！"
    };
  } catch (error) {
    handleGeminiError(error, 'Grading');
    return { score: 0, feedback: "AI 批改失败" };
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
      生成"成绩走势"、"薄弱点"、"3条建议"。请用加粗作为标题，不要用Markdown标题语法。
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "暂无分析数据。";
  } catch (error: any) {
    handleGeminiError(error, 'Analysis');
    return "分析生成失败";
  }
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  try {
    const ai = await getAiClient();
    const contextStr = textbookContext ? `教材: ${textbookContext}` : "通用小学教材";
    const prompt = `
      角色：资深${subject}教师。
      任务：基于"${contextStr}"设计"${topic}"的详细教案。
      
      返回严格JSON结构:
      {
        "topic": "${topic}",
        "textbookContext": "${textbookContext || '通用'}",
        "objectives": ["目标1", "目标2", "目标3"],
        "keyPoints": ["重点1", "难点1"],
        "process": [
          { "phase": "环节名称", "duration": "时长", "activity": "详细活动" }
        ],
        "blackboard": ["板书要点1", "板书要点2"],
        "homework": "作业内容"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
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
        parts: [{ text: prompt + " high quality, educational illustration, 4k, clean style, vector art style" }]
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
    const prompt = `
      Design a 8-slide PPT for primary school ${subject}: "${topic}".
      Return JSON Array:
      [
        {
          "layout": "TITLE" | "CONTENT" | "TWO_COLUMN" | "CONCLUSION",
          "title": "Slide Title",
          "content": ["Point 1", "Point 2"],
          "notes": "Speaker notes",
          "visualPrompt": "English prompt for background image generation (simple, abstract, educational)"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
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
      Topic: ${topic}. KeyPoints: ${keyPoints.join(',')}.
      Generate 10 quiz questions (3 Easy, 4 Medium, 3 Hard).
      Return JSON Array:
      [{
        "difficulty": "基础"|"进阶"|"挑战",
        "question": "text",
        "options": ["A","B","C","D"],
        "correctAnswer": 0, // index 0-3
        "explanation": "short explanation"
      }]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(response.text || "[]");
    if (Array.isArray(data)) return data;
    return [];
  } catch (error) {
    handleGeminiError(error, 'Quiz');
    return [];
  }
};

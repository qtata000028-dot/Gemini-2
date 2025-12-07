
import { GoogleGenAI } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";
import { dataService } from "./dataService";

let _cachedClient: GoogleGenAI | null = null;
let _cachedKey: string | null = null;

// Async initializer for the AI client
const getAiClient = async (): Promise<GoogleGenAI> => {
  if (_cachedClient) return _cachedClient;

  // 1. Try Env (Standard)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    _cachedKey = process.env.API_KEY;
  }
  // 2. Try Polyfill
  else if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
     _cachedKey = (window as any).process.env.API_KEY;
  }
  
  // 3. Try Database (The User Preferred Method)
  if (!_cachedKey) {
     const dbKey = await dataService.fetchSystemConfig('GEMINI_API_KEY');
     if (dbKey) _cachedKey = dbKey;
  }

  // 4. Fallback (Hardcoded) - Last resort
  if (!_cachedKey) {
     console.warn("Using fallback API key. Please configure 'GEMINI_API_KEY' in 'system_config' table.");
     _cachedKey = 'AIzaSyBWoddFIDsKvjIuzC_Wu1dRW9O-lqqW7js';
  }

  _cachedClient = new GoogleGenAI({ apiKey: _cachedKey });
  return _cachedClient;
};

const handleGeminiError = (error: any, context: string) => {
  console.error(`Gemini Error [${context}]:`, error);
  const msg = error.message || '';
  if (msg.includes('429') || msg.includes('Too Many Requests')) {
    throw new Error("AI 服务繁忙 (429)，请稍后重试。");
  }
  if (msg.includes('401') || msg.includes('API key')) {
    throw new Error("API Key 无效，请检查数据库 system_config 配置。");
  }
  throw new Error("AI 服务连接失败，请稍后重试。");
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
    console.error("Grading Error:", error);
    return { score: 0, feedback: "AI 暂时无法批改，请检查配置。" };
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
    if (error.message?.includes('429')) return "⚠️ 额度已耗尽 (429)，请稍后重试。";
    return "AI 分析生成失败，请检查网络或配置。";
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
        parts: [{ text: prompt + " high quality, educational illustration, 4k, clean style" }]
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
          "visualPrompt": "English prompt for background image generation"
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
        "correctAnswer": 0,
        "explanation": "text"
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

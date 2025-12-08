
import { GoogleGenAI } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";

let _cachedClient: GoogleGenAI | null = null;

// 清除缓存 (虽然不再支持动态切换，但保留接口以备不时之需)
export const resetAiClient = () => {
  _cachedClient = null;
};

// Async initializer for the AI client
const getAiClient = async (): Promise<GoogleGenAI> => {
  if (_cachedClient) {
    return _cachedClient;
  }

  // 标准化读取 Vercel 环境变量
  // 注意：在 Vercel 构建过程中，构建工具(Vite/Webpack)会将 process.env.API_KEY 替换为实际的字符串常量
  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : "";

  // 严格校验
  if (!apiKey || apiKey === 'undefined' || apiKey.length < 10) {
    console.error("❌ Critical Error: process.env.API_KEY is missing or invalid.");
    throw new Error(
      "系统未检测到有效的 API Key。\n\n" +
      "如果您正在使用 Vercel 部署，请检查以下几点：\n" +
      "1. 进入项目 Settings > Environment Variables\n" +
      "2. 确保已添加名为 'API_KEY' 的变量\n" +
      "3. 添加变量后，务必执行 Redeploy (重新部署) 以便构建生效"
    );
  }

  _cachedClient = new GoogleGenAI({ apiKey: apiKey });
  return _cachedClient;
};

const handleGeminiError = (error: any, context: string) => {
  console.error(`Gemini Error [${context}]:`, error);
  const msg = (error.message || '').toLowerCase();
  
  if (msg.includes('429') || msg.includes('too many requests')) {
    throw new Error("AI 服务繁忙 (429): 当前 Key 的调用额度已耗尽，请稍后再试。");
  }
  if (msg.includes('401') || msg.includes('api key') || msg.includes('invalid')) {
    throw new Error("API Key 无效 (401): 请检查 Vercel 环境变量配置是否正确。");
  }
  if (msg.includes('403')) {
      throw new Error("权限不足 (403): 您的 Key 可能受到地区限制或结算账户异常。");
  }
  throw new Error(`AI 请求失败: ${msg.substring(0, 80)}...`);
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
        parts: [{ text: prompt + " high quality, educational illustration, 4k, clean style, vector art style, soft colors" }]
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

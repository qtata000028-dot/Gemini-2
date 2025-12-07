
import { GoogleGenAI } from "@google/genai";
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";

// Helper to robustly get API Key in various environments (Vercel, Local, etc.)
const getApiKey = (): string => {
  // 1. Try standard process.env (Node/Webpack)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  
  // 2. Try window.process (Our Polyfill in index.html)
  if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
    return (window as any).process.env.API_KEY;
  }

  // 3. Fallback: Hardcoded Key (User provided)
  // 注意：在正式生产环境中，建议通过后端转发或 Vercel Rewrites 隐藏 Key，
  // 但为了目前项目能直接跑通，这里作为最后一道防线。
  return 'AIzaSyBWoddFIDsKvjIuzC_Wu1dRW9O-lqqW7js';
};

// Helper to get lazy initialized client
const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("CRITICAL: API Key is missing. AI features will fail.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  const modelId = 'gemini-2.5-flash';

  const prompt = `
    你是一位经验丰富、和蔼可亲的小学${subject}老师。
    学生姓名：${studentName}。
    作业内容/答案：
    "${content}"

    请根据作业内容进行专业批改。
    1. 给出一个合理的预估分数（0-100），如果是数学题请严格检查计算，如果是作文请关注文采和逻辑。
    2. 给出一段评语（50字左右）：
       - 语气要温暖、鼓励，像一位真正的老师在对话。
       - 指出具体的优点（例如：计算准确、描写生动）。
       - 温柔地指出不足之处。
    
    请严格以JSON格式返回，不要包含Markdown代码块标记：
    {
      "score": number,
      "feedback": "string"
    }
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      score: result.score || 85,
      feedback: result.feedback || "作业完成得很认真，老师看到了你的努力，继续保持！"
    };
  } catch (error) {
    console.error("Gemini Grading Error:", error);
    return {
      score: 0,
      feedback: "AI 助教暂时休息中，请老师手动批改哦。"
    };
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  subject: Subject,
  recentScores: number[]
): Promise<string> => {
  const modelId = 'gemini-2.5-flash';
  
  const prompt = `
    你是一位资深的${subject}教研组长。
    学生 ${studentName} 最近5次的${subject}测验成绩为：${recentScores.join(', ')}。
    
    请生成一份专业的"定点优化辅导分析报告"：
    
    1. **成绩走势诊断**：用专业的教学术语分析成绩波动情况。
    2. **薄弱点推测**：根据分数段推测学生可能在哪些知识模块（如计算、阅读理解、语法等）存在短板。
    3. **个性化提升方案**：给出3条具体的、可执行的学习建议（例如推荐什么样的练习题，或者学习习惯的调整）。
    
    请不要使用Markdown标题语法（如# ##），直接使用加粗文本作为小标题。语气要专业、客观且充满教育关怀。
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "暂无足够数据生成详细分析。";
  } catch (error: any) {
    console.error("Gemini Analysis Error Full Detail:", error);
    // Return a more descriptive error if possible
    if (error.message?.includes('429')) return "AI 服务调用太频繁，请稍后重试。";
    if (error.message?.includes('401') || error.message?.includes('API key')) return "API Key 配置有误，请检查。";
    return "系统连接 AI 服务超时，请刷新重试。";
  }
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  const modelId = 'gemini-2.5-flash';

  const contextStr = textbookContext ? `教材版本上下文：${textbookContext}` : "通用小学标准教材";

  const prompt = `
    你是一位全国特级${subject}教师。
    请基于"${contextStr}"，针对"${topic}"这一单元/课题，设计一份**完整的深度教学体系**。
    
    要求生成极其详细的教案，包含以下部分：
    1. 教学目标（三维目标：知识与技能、过程与方法、情感态度价值观）
    2. 教学重难点
    3. 教学过程（精确到分钟的脚本，包含师生互动、提问设计、活动安排）
    4. 板书设计（结构化展示）
    5. 作业设计（分层作业）

    请严格返回如下JSON结构：
    {
      "topic": "${topic}",
      "textbookContext": "${textbookContext || '通用'}",
      "objectives": ["目标1", "目标2", "目标3"],
      "keyPoints": ["重点1", "难点1"],
      "process": [
        {
          "phase": "一、激趣导入",
          "duration": "5分钟",
          "activity": "详细描述老师怎么说，学生怎么做..."
        },
        {
          "phase": "二、探究新知",
          "duration": "15分钟",
          "activity": "..."
        }
      ],
      "blackboard": ["主标题", "左侧要点", "右侧绘图"],
      "homework": "详细的作业描述"
    }
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Lesson Plan Error:", error);
    return null;
  }
};

// --- New Features with Banana (Gemini Image) ---

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  // Use the specific model ID for image generation
  const modelId = 'gemini-2.5-flash-image';
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { text: prompt + " high quality, educational illustration, 4k resolution, clean style, no text, vivid colors, photorealistic or high-end 3d render" }
        ]
      }
    });

    // Iterate through parts to find the image (inlineData)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
};

export const generatePPTSlides = async (
  topic: string,
  objectives: string[],
  subject: string
): Promise<PresentationSlide[]> => {
  const modelId = 'gemini-2.5-flash';
  const prompt = `
    作为一名专业的小学${subject}教师和PPT设计专家，请为课题 "${topic}" 设计一套**8-12页**的高端教学PPT大纲。
    
    设计要求：
    1. **视觉Prompt设计**：为每一页生成一个英文 'visualPrompt'。
       - 封面页：要求生成 "Masterpiece, 3D abstract composition related to ${topic}, cinematic lighting, high detail, warm colors"。
       - 内容页：要求生成 "Soft educational background pattern, minimalist, ${subject} elements, light colors, ample whitespace for text"。
    2. **内容精炼**：内容要适合PPT展示，每页不超过4个要点。
    3. **结构**：
       - 第1页：Title (封面)
       - 第2页：Objectives (教学目标)
       - 第3-N页：Teaching Content (核心知识点，图文并茂)
       - 倒数第2页：Interactive Quiz (课堂互动)
       - 最后一页：Conclusion & Homework (总结与作业)

    请严格返回JSON数组：
    [
      {
        "layout": "TITLE" | "CONTENT" | "TWO_COLUMN" | "CONCLUSION",
        "title": "页面标题",
        "content": ["要点1", "要点2", "要点3"],
        "notes": "演讲备注...",
        "visualPrompt": "Detailed English description for image generation"
      }
    ]
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("PPT Generation Error", error);
    return [];
  }
};

export const generateQuiz = async (
  topic: string,
  keyPoints: string[]
): Promise<QuizQuestion[]> => {
  const modelId = 'gemini-2.5-flash';
  // Enforce 10 questions explicitly
  const prompt = `
    基于课题 "${topic}" 和重难点: ${keyPoints.join(',')}，
    设计一份包含 **10道** 题目的课后练习闯关卷。
    
    要求：
    1. 包含 3道基础题，4道进阶题，3道挑战题。
    2. 题目要生动有趣，贴近小学生生活，避免枯燥的计算或死记硬背。
    3. 选项要有干扰性，但解析要清晰。
    
    请严格返回JSON数组：
    [
      {
        "difficulty": "基础" | "进阶" | "挑战",
        "question": "题目内容",
        "options": ["选项A", "选项B", "选项C", "选项D"],
        "correctAnswer": 0, // 0-3
        "explanation": "解析内容"
      }
    ]
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(response.text || "[]");
    // Fallback if model returns less than 10
    if (Array.isArray(data) && data.length > 0) return data;
    return [];
  } catch (error) {
    console.error("Quiz Generation Error", error);
    return [];
  }
};

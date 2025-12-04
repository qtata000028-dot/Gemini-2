import { GoogleGenAI } from "@google/genai";
import { Subject, LessonPlan } from "../types";

// Helper to get lazy initialized client
const getAiClient = () => {
  // Ensure we don't crash if env is missing, though polyfill handles it.
  const apiKey = process.env.API_KEY || ''; 
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
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "系统繁忙，请稍后重试分析。";
  }
};

export const generateLessonPlan = async (
  topic: string,
  subject: string
): Promise<LessonPlan | null> => {
  const modelId = 'gemini-2.5-flash';

  const prompt = `
    你是一位专业的${subject}老师。请根据课题"${topic}"，为小学三年级学生设计一份PPT讲课大纲。
    请返回严格的JSON格式，结构如下：
    {
      "topic": "${topic}",
      "outline": [
        {
          "title": "幻灯片标题",
          "points": ["要点1", "要点2", "互动问题"],
          "duration": "预计时长(如5分钟)"
        }
      ]
    }
    请设计 4-6 张幻灯片，包含导入、知识讲解、课堂练习、总结。内容要生动有趣。
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
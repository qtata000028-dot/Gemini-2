
import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";

// Vercel Serverless Backend
const API_ENDPOINT = "/api/ai"; 

// 阿里云通义千问 Max (逻辑最强)
const MODEL_TEXT = "qwen-max"; 

export const resetAiClient = () => {};

/**
 * 核心调用函数 (支持流式回调)
 * @param messages 对话历史
 * @param onUpdate 可选：流式接收数据的回调函数
 */
const callBackendAI = async (
  messages: any[], 
  onUpdate?: (chunk: string) => void
): Promise<string> => {
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

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) throw new Error("无法读取响应流");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码当前数据块
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // 实时通知前端 UI 更新
        if (onUpdate) {
            onUpdate(fullText);
        }
    }

    if (!fullText) throw new Error("AI 返回内容为空");
    return fullText;

  } catch (error: any) {
    console.error("AI Service Error:", error);
    if (error.message.includes("Missing API Key")) {
        throw new Error("系统配置错误：Vercel 环境变量中未配置 ALIYUN_API_KEY");
    }
    throw new Error(`智能生成失败: ${error.message}`);
  }
};

const extractJson = (text: string): any => {
  let jsonString = text.trim();
  jsonString = jsonString.replace(/^```json\s*/i, '').replace(/```$/, '');
  
  const firstOpen = jsonString.indexOf('{');
  const firstArr = jsonString.indexOf('[');
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
    throw new Error("AI 生成的数据结构不完整，请尝试重新生成");
  }
};

// --- 业务功能 (火力全开版) ---

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  const prompt = `
    角色：拥有一颗温暖心灵的${subject}特级教师。
    任务：批改学生"${studentName}"的作业。
    作业内容：${content}
    
    要求：
    1. **评分**：满分100，客观公正。
    2. **评语**：请用“三明治法”（肯定+建议+鼓励）。
    3. **深度**：必须指出具体错在哪，或者好在哪，不要只说“真棒”。
    
    返回 JSON: { "score": number, "feedback": "string" }
  `;
  try {
    const text = await callBackendAI([{ role: "user", content: prompt }]);
    const res = extractJson(text);
    return { score: res.score || 85, feedback: res.feedback || "作业已阅。" };
  } catch (e) {
    return { score: 0, feedback: "AI 服务繁忙，请稍后重试" };
  }
};

export const generateStudentAnalysis = async (
  studentName: string,
  subject: Subject,
  recentScores: number[],
  onStream?: (text: string) => void
): Promise<string> => {
  const prompt = `
    角色：资深教育数据分析师 & 心理咨询师。
    分析对象：${studentName}，科目：${subject}。
    成绩序列：${recentScores.join(', ')} (时间由远及近)。

    请生成一份**精美的 Markdown 格式诊断报告**，要求包含：

    1. **🏆 核心结论**：用一句话总结该生的状态（如：📈 潜力爆发型 / 📉 基础动摇型）。
    2. **📊 数据洞察 (请使用 Markdown 表格)**：
       | 维度 | 评分 (1-10) | 评语 |
       |---|---|---|
       | 稳定性 | ... | ... |
       | 爆发力 | ... | ... |
    3. **🧠 深度归因**：不要只看分数，要分析背后的原因（知识点断层？粗心？畏难情绪？）。
    4. **🚀 提分锦囊**：给出 3 条极具操作性的建议，每条建议前加 Emoji。

    排版要求：使用 H3 标题，重点文字加粗，多用 Emoji 活跃气氛。
  `;
  return await callBackendAI([{ role: "user", content: prompt }], onStream);
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext: string | undefined,
  onStream?: (text: string) => void
): Promise<LessonPlan | null> => {
  const context = textbookContext ? `参考教材内容：${textbookContext}` : "基于最新国家课程标准 (New Curriculum Standards)";
  const prompt = `
    你是一位追求完美的${subject}特级教师。请为"${topic}"设计一份**史诗级的公开课教案**。
    ${context}
    
    **核心要求 (Verbatim Script Mode)**：
    1. **逐字稿模式**：教学过程中的每一个环节，必须包含【教师语言】、【学生预设】、【设计意图】。不要只写大纲！
    2. **互动设计**：必须包含至少 3 个高互动环节（如：辩论、角色扮演、实物演示）。
    3. **结构完整**：JSON 必须包含 objectives, keyPoints, process, blackboard, homework。

    JSON 结构模板 (请严格遵守):
    {
      "topic": "${topic}",
      "textbookContext": "在这里写深度教材分析...",
      "objectives": ["目标1", "目标2"],
      "keyPoints": ["重点1", "难点1"],
      "process": [
         {
             "phase": "一、激趣导入 (5min)", 
             "duration": "5m", 
             "activity": "### 教师语言\n同学们，你们见过...吗？\n\n### 学生预设\n见过！是...\n\n### 设计意图\n通过生活实例..." 
         },
         {
             "phase": "二、核心探究 (15min)", 
             "duration": "15m", 
             "activity": "..."
         }
      ],
      "blackboard": ["主标题", "左侧：知识点", "右侧：学生生成资源"],
      "homework": "1. 基础题...\n2. 挑战题..."
    }
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }], onStream);
  return extractJson(text);
};

export const generatePPTSlides = async (
  topic: string,
  objectives: string[],
  subject: string
): Promise<PresentationSlide[]> => {
  const prompt = `
    为${subject}课"${topic}"设计一份**TED演讲级别**的 PPT 大纲 (8页)。
    目标：${objectives.join('; ')}。
    
    要求：
    1. **视觉化**：visualPrompt 必须是英文，描述极其详细的画面 (e.g., "A futuristic classroom scene, 3D render, Pixar style")。
    2. **内容丰富**：content 数组里不要写短语，要写完整的知识点长句。
    3. **演讲备注**：notes 字段要写给老师看的口语化演讲稿。

    返回 JSON 数组 (PresentationSlide 结构)。
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateQuiz = async (
  topic: string,
  keyPoints: string[]
): Promise<QuizQuestion[]> => {
  const prompt = `
    为"${topic}"设计 5 道**高信度**的单选题。
    要求：
    1. 必须包含一道“陷阱题”，考察学生易错点。
    2. explanation 字段必须详细解释每个选项为什么对/错。
    
    返回 QuizQuestion[] JSON。
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  return null; 
};


import { Subject, LessonPlan, PresentationSlide, QuizQuestion } from "../types";
import { dataService } from "./dataService";

// 商用级配置: 调用 Vercel Serverless 后端
const API_ENDPOINT = "/api/ai"; 

// 模型配置
// qwen-max: 通义千问千亿级旗舰模型，适合复杂任务
const MODEL_TEXT = "qwen-max"; 

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

// --- 业务功能实现 (火力全开版) ---

export const generateGradingSuggestion = async (
  subject: Subject,
  studentName: string,
  content: string
): Promise<{ score: number; feedback: string }> => {
  const prompt = `
    角色：拥有30年教龄的小学${subject}特级教师。
    任务：深度批改学生"${studentName}"的作业。
    作业内容：${content}
    
    请进行“专家级”批改，要求：
    1. 评分标准：严格且公正，满分100。
    2. 评语风格：使用“三明治评价法”（肯定优点 -> 指出具体问题 -> 提出改进建议），语气要亲切、有激励性。
    3. 评语内容：拒绝笼统的“做得不错”，必须指出具体的知识点漏洞或逻辑错误。
    
    严格返回 JSON:
    {
      "score": number (0-100),
      "feedback": "string (100字左右的详细评语)"
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
    角色：资深教育心理学家 & 数据分析师。
    分析对象：${studentName}，科目：${subject}。
    近期成绩序列：${recentScores.join(', ')} (按时间顺序，最后一次为最近)。

    请生成一份《深度学情诊断报告》，字数约 400 字，Markdown 格式。
    内容必须包含：
    1. **📊 成绩趋势雷达**：计算波动率，判断是“稳步上升”、“起伏不定”还是“下滑预警”。
    2. **🧠 归因分析**：结合学科特点，推测可能的薄弱环节（如：计算粗心、阅读理解偏差、逻辑思维断层、学习态度问题）。
    3. **❤️ 心理状态评估**：分析是否存在畏难情绪、学习倦怠或考试焦虑。
    4. **🚀 精准提升方案**：给出下周具体的复习计划（精确到每天做什么，例如：周一复习错题本，周二专项训练）。
  `;
  return await callBackendAI([{ role: "user", content: prompt }]);
};

export const generateLessonPlan = async (
  topic: string,
  subject: string,
  textbookContext?: string
): Promise<LessonPlan | null> => {
  const context = textbookContext ? `参考教材深度解析：${textbookContext}` : "基于最新国家课程标准 (New Curriculum Standards)";
  const prompt = `
    你是一位追求卓越的小学${subject}特级教师。请为课题"${topic}"设计一份**特级公开课级别的逐字稿教案**。
    ${context}
    
    **核心要求 (火力全开模式)**：
    1. **拒绝简略**：不要只写“提问”，要写出“【教师语言】... 【预设学生回答】...”。
    2. **设计意图**：每个环节都要标注背后的教育心理学原理或设计意图。
    3. **互动性**：设计至少 3 个高思维含量的互动环节（小组讨论、角色扮演、实验探究）。
    4. **结构完整**：JSON 结构必须严格符合要求。

    JSON 结构模板:
    {
      "topic": "${topic}",
      "textbookContext": "深度教材分析与学情预估...",
      "objectives": ["知识与技能目标...", "过程与方法目标...", "情感态度价值观目标..."],
      "keyPoints": ["核心重难点1", "易错点解析"],
      "process": [
         {
             "phase": "一、情境导入 (5分钟)", 
             "duration": "5m", 
             "activity": "【教师语言】同学们... \n【学生活动】观察... \n【设计意图】通过..."
         },
         {
             "phase": "二、深度探究 (15分钟)", 
             "duration": "15m", 
             "activity": "..."
         }
         // 需包含至少 4-5 个环节
      ],
      "blackboard": ["主板书设计...", "副板书(草稿区)..."],
      "homework": "分层作业设计：\n1. 基础题...\n2. 拓展题..."
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
    为小学${subject}公开课"${topic}"设计一份世界级的 PPT 演示大纲 (8页)。
    教学目标：${objectives.join('; ')}。
    
    要求：
    1. **内容充实**：每一页的 content 数组至少包含 4-5 个详细的知识点或指令，绝不要只写标题。
    2. **视觉提示 (Visual Prompt)**：为每一页生成极具艺术感的 AI 绘画提示词 (英文)，风格统一为 "3D Pixar style education illustration, bright colors, high detail"。
    3. **演讲备注 (Notes)**：为老师提供详细的口述脚本，就像演讲提词器一样。

    返回 JSON 数组 (PresentationSlide 结构):
    [
      {
        "layout": "TITLE" | "CONTENT" | "TWO_COLUMN" | "CONCLUSION",
        "title": "页标题",
        "content": ["要点1 (详细)", "要点2 (详细)"],
        "notes": "老师演讲脚本...",
        "visualPrompt": "English prompt for AI image generation..."
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
    基于课题"${topic}"，设计 5 道**高信度、高区分度**的课堂检测题。
    
    要求：
    1. **难度分层**：1道基础，2道中等，1道易错陷阱题，1道高阶思维题。
    2. **解析详尽**：explanation 字段必须解释“为什么选A，为什么不选BCD”，指出干扰项的设置逻辑。
    
    返回 JSON 数组:
    [
      {
        "difficulty": "基础" | "进阶" | "挑战",
        "question": "题目内容",
        "options": ["选项A", "选项B", "选项C", "选项D"],
        "correctAnswer": 0 (0-3),
        "explanation": "详细解析..."
      }
    ]
  `;
  const text = await callBackendAI([{ role: "user", content: prompt }]);
  return extractJson(text);
};

export const generateEducationalImage = async (prompt: string): Promise<string | null> => {
  // 图片生成目前暂未对接后端流式，后续可扩展
  return null;
};

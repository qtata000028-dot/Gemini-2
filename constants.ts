import { Teacher, Subject, Student, Homework, Exam } from './types';

export const TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: '王福斌',
    subject: Subject.MATH,
    // Stable, professional male teacher avatar
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
  },
  {
    id: 't2',
    name: '李文',
    subject: Subject.ENGLISH,
    // Stable, professional female teacher avatar
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'
  },
  {
    id: 't3',
    name: '罗成',
    subject: Subject.CHINESE,
    // Stable, professional male teacher avatar
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan'
  }
];

export const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: '张小明', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Alex', recentScores: [85, 90, 88, 92, 95] },
  { id: 's2', name: '李朵朵', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Bella', recentScores: [78, 82, 80, 85, 88] },
  { id: 's3', name: '王强', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Charlie', recentScores: [60, 65, 58, 70, 72] },
  { id: 's4', name: '陈思思', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Daisy', recentScores: [95, 98, 96, 99, 100] },
  { id: 's5', name: '赵子龙', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Ethan', recentScores: [88, 89, 90, 91, 92] },
  { id: 's6', name: '孙悟空', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix', recentScores: [70, 75, 72, 78, 80] },
  { id: 's7', name: '白骨精', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Grace', recentScores: [92, 94, 91, 95, 98] },
  { id: 's8', name: '猪八戒', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Henry', recentScores: [65, 68, 70, 72, 75] },
  { id: 's9', name: '沙和尚', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Ivan', recentScores: [80, 82, 84, 86, 88] },
  { id: 's10', name: '唐僧', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jack', recentScores: [98, 99, 100, 99, 100] },
  { id: 's11', name: '哪吒', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kyle', recentScores: [75, 78, 80, 82, 85] },
  { id: 's12', name: '杨戬', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Leo', recentScores: [90, 92, 94, 96, 98] },
  { id: 's13', name: '雷震子', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Max', recentScores: [82, 85, 88, 86, 90] },
  { id: 's14', name: '姜子牙', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Nora', recentScores: [95, 96, 97, 98, 99] },
  { id: 's15', name: '申公豹', grade: '三年级', className: '三年级二班', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Oscar', recentScores: [70, 68, 72, 75, 74] },
];

export const MOCK_HOMEWORK: Homework[] = [
  {
    id: 'h1',
    studentId: 's1',
    title: '数学：分数的初步认识',
    content: '1. 把一个西瓜平均分成4份，每份是它的几分之几？\n答：1/4\n2. 1/3 和 1/5 哪个大？\n答：1/5 大（做错了）',
    submittedAt: '10-24 16:30',
    status: 'pending'
  },
  {
    id: 'h2',
    studentId: 's3',
    title: '语文：作文《我的植物朋友》',
    content: '我家有一盆仙人掌，它全身长满了刺。虽然它不好看，但是它生命力很顽强。有一次我不小心碰到了它，好痛啊。我喜欢我的仙人掌。',
    submittedAt: '10-24 17:00',
    status: 'pending'
  },
  {
    id: 'h3',
    studentId: 's4',
    title: '英语：Unit 3 课文抄写',
    content: 'I have a new pencil box. Look! It\'s blue and white. What\'s in it? An eraser and two rulers.',
    submittedAt: '10-24 17:15',
    status: 'graded',
    score: 100,
    feedback: '书写非常规范，字母饱满，卷面整洁，值得全班表扬！',
    aiAnalysis: '书写能力优秀，基础知识牢固'
  },
  {
    id: 'h4',
    studentId: 's2',
    title: '数学：周长与面积计算',
    content: '一个长方形花坛，长8米，宽4米。\n(1) 周长：(8+4)x2 = 24米\n(2) 面积：8+4 = 12平方米',
    submittedAt: '10-24 17:30',
    status: 'pending'
  },
  {
    id: 'h5',
    studentId: 's5',
    title: '语文：古诗《山行》默写',
    content: '远上寒山石径斜，白云深处有人家。停车坐爱枫林晚，霜叶红于二月花。',
    submittedAt: '10-24 18:00',
    status: 'graded',
    score: 98,
    feedback: '默写准确无误，字迹清晰工整。',
    aiAnalysis: '记忆力好，汉字书写规范'
  },
  {
    id: 'h6',
    studentId: 's6',
    title: '数学：脱式计算',
    content: '36 + 12 x 4\n= 48 x 4\n= 192',
    submittedAt: '10-24 18:15',
    status: 'pending'
  },
  {
    id: 'h7',
    studentId: 's7',
    title: '英语：My Family 作文',
    content: 'This is my family. My father is tall. My mother is beautiful. I love my family.',
    submittedAt: '10-24 18:30',
    status: 'graded',
    score: 95,
    feedback: '句子通顺，单词拼写正确。可以尝试用更多形容词来描写哦！',
    aiAnalysis: '句型掌握良好'
  },
  {
    id: 'h8',
    studentId: 's8',
    title: '语文：看图写话',
    content: '图上画的是春天。小草发芽了，燕子飞回来了。小朋友们在放风筝，大家都很开心。',
    submittedAt: '10-24 19:00',
    status: 'pending'
  },
  {
    id: 'h9',
    studentId: 's9',
    title: '数学：应用题专项',
    content: '三(1)班有45人，每人发3本练习本，一共需要多少本？\n答：45 + 3 = 48 本',
    submittedAt: '10-24 19:15',
    status: 'pending'
  },
  {
    id: 'h10',
    studentId: 's10',
    title: '英语：单词听写',
    content: 'red, green, yellow, blue, black, white, orange',
    submittedAt: '10-24 19:30',
    status: 'graded',
    score: 100,
    feedback: '全部正确！Very Good!',
    aiAnalysis: '词汇量达标'
  },
  {
    id: 'h11',
    studentId: 's11',
    title: '语文：日记一则',
    content: '今天我帮妈妈洗碗了。虽然打碎了一个盘子，但是妈妈没有怪我，通过这件事我明白了做事要小心。',
    submittedAt: '10-24 20:00',
    status: 'pending'
  },
  {
    id: 'h12',
    studentId: 's12',
    title: '数学：两位数乘法',
    content: '24 x 12 = \n  24\nx 12\n----\n  48\n 24\n----\n 288',
    submittedAt: '10-24 20:30',
    status: 'graded',
    score: 100,
    feedback: '竖式计算过程标准，结果正确！',
    aiAnalysis: '运算能力强'
  }
];

export const MOCK_EXAMS: Exam[] = [
  { id: 'e1', title: '2023-2024第一学期期中考试', date: '2023-11-10', averageScore: 88.5, totalStudents: 45 },
  { id: 'e2', title: '10月份月度综合测评', date: '2023-10-25', averageScore: 86.2, totalStudents: 45 },
  { id: 'e3', title: '第三单元：图形的运动', date: '2023-10-10', averageScore: 90.5, totalStudents: 45 },
  { id: 'e4', title: '国庆假期作业检测', date: '2023-10-08', averageScore: 84.0, totalStudents: 44 },
  { id: 'e5', title: '9月份月度综合测评', date: '2023-09-28', averageScore: 92.0, totalStudents: 45 },
  { id: 'e6', title: '第二单元：万以内的加减法', date: '2023-09-15', averageScore: 85.5, totalStudents: 45 },
  { id: 'e7', title: '第一单元：时分秒', date: '2023-09-05', averageScore: 81.5, totalStudents: 45 },
  { id: 'e8', title: '开学摸底考试', date: '2023-09-01', averageScore: 78.0, totalStudents: 45 },
];
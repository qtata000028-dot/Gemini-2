export enum Subject {
  MATH = '数学',
  ENGLISH = '英语',
  CHINESE = '语文'
}

export interface Teacher {
  id: string;
  name: string;
  subject: Subject;
  avatar: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  recentScores: number[]; // Last 5 test scores
}

export interface Homework {
  id: string;
  studentId: string;
  title: string;
  content: string; // Could be text or description of image
  submittedAt: string;
  status: 'pending' | 'graded';
  score?: number;
  feedback?: string;
  aiAnalysis?: string;
}

export interface Exam {
  id: string;
  title: string;
  date: string;
  averageScore: number;
  totalStudents: number;
}

export interface LessonPlan {
  topic: string;
  outline: {
    title: string;
    points: string[];
    duration: string;
  }[];
}

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  HOMEWORK = 'HOMEWORK',
  EXAMS = 'EXAMS',
  ANALYSIS = 'ANALYSIS',
  LESSON_PREP = 'LESSON_PREP'
}
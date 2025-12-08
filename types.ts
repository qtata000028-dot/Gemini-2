
export enum Subject {
  MATH = '数学',
  ENGLISH = '英语',
  CHINESE = '语文'
}

export type UserRole = 'teacher' | 'student';

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
  className: string; // e.g. "三年级二班"
  avatar: string;
  recentScores: number[];
  needsReset?: boolean; // Force password reset flag
}

export interface Assignment {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  classTarget: string;
  attachmentUrl?: string; // PDF link
  createdAt: string;
}

export interface Homework {
  id: string;
  studentId: string;
  assignmentId?: string; // Linked to Assignment
  title: string;
  content: string; // Could be text or description of image
  imageUrl?: string; // Student uploaded image
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
  details?: {
    subjects: string[];
    students: {
      name: string;
      scores: Record<string, number>;
      total: number;
    }[];
  };
}

export interface Textbook {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
}

// Updated Types for High-End PPT and Interactive Quiz
export interface PresentationSlide {
  layout: 'TITLE' | 'SECTION' | 'CONTENT' | 'CONCLUSION'; // Strict layouts for template mapping
  title: string;
  subtitle?: string; // For title slides
  content: string[]; 
  notes: string; 
  visualPrompt?: string; 
}

export interface QuizQuestion {
  difficulty: '基础' | '进阶' | '挑战';
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  explanation: string; // Detailed analysis for interactive feedback
}

export interface LessonPlan {
  topic: string;
  textbookContext?: string;
  objectives: string[]; 
  keyPoints: string[];  
  process: {
    phase: string;      
    duration: string;   
    activity: string;   
  }[];
  blackboard: string[]; 
  homework: string;     
  // Extended fields
  slides?: PresentationSlide[];
  quiz?: QuizQuestion[];
}

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  STUDENTS = 'STUDENTS', 
  PUBLISH = 'PUBLISH',   
  HOMEWORK = 'HOMEWORK',
  EXAMS = 'EXAMS',
  ANALYSIS = 'ANALYSIS',
  LESSON_PREP = 'LESSON_PREP'
}

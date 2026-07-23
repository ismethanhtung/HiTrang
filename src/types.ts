export type QuestionType = 'single_choice' | 'true_false' | 'short_answer';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswers?: boolean[]; // For true_false statement questions (length 4)
  type?: QuestionType;
  sectionTitle?: string;
  shortAnswerKey?: string;
  explanation?: string;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade?: string; // '8', '9', '10', '11', '12'
  duration: number; // in minutes
  questions: Question[];
  createdAt: string;
  isPublic?: boolean; // true = công khai, false = riêng tư
}

export type UserPlan = 'nothing' | 'basic' | 'vip';

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'teacher' | 'student';
  plan?: UserPlan;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Submission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  studentUsername?: string;
  score: number; // percentage or correct answers count
  totalQuestions: number;
  submittedAt: string;
  answers: Record<string, any>; // questionId -> chosen index, boolean[], or short answer string
  timeSpent?: number; // time spent in seconds
}


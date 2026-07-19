export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  points: number;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration: number; // in minutes
  questions: Question[];
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'teacher' | 'student';
  avatarUrl?: string;
}

export interface Submission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  score: number; // percentage or correct answers count
  totalQuestions: number;
  submittedAt: string;
  answers: Record<string, number>; // questionId -> chosen index
}

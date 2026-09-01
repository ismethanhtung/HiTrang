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
  scoringConfig?: {
    type: 'EQUAL_WEIGHT' | 'SECTION_BASED' | 'THPT_QG';
    sections?: { section_id: string; total_points: number }[];
    true_false_rules?: Record<string, number>;
  };
}

export type UserPlan = 'nothing' | 'basic' | 'vip';

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'student';
  plan?: UserPlan;
  grade?: string;
  avatarUrl?: string;
  createdAt?: string;
  lastActiveAt?: string;
  activeExam?: {
    quizId: string;
    quizTitle: string;
    startedAt: string;
    expiresAt: string;
    durationMinutes: number;
  } | null;
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

export interface QuizLeaderboardEntry {
  rankPosition: number;
  studentId: string;
  studentName: string;
  studentUsername: string;
  studentGrade: string | null;
  studentAvatarUrl?: string;
  score: number;
  durationSeconds: number;
  submittedAt: string;
}

export interface OverallLeaderboardEntry {
  rankPosition: number;
  previousRankPosition: number | null;
  studentId: string;
  studentName: string;
  studentUsername: string;
  studentGrade: string | null;
  studentAvatarUrl?: string;
  totalPoints: number;
  testsCompleted: number;
}



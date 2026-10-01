export type Language = "en" | "fa";

export interface User {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: Language;
}

export interface TimeSession {
  id: string;
  userId: string;
  /** calendar date YYYY-MM-DD this session belongs to */
  date: string;
  /** ISO timestamps */
  checkInAt: string;
  checkOutAt: string | null;
  note?: string;
}

export interface Task {
  id: string;
  userId: string;
  /** calendar date YYYY-MM-DD */
  date: string;
  title: string;
  description?: string;
  isDone: boolean;
  completedAt?: string | null;
  createdAt: string;
}

export interface DaySummary {
  date: string;
  sessions: TimeSession[];
  tasks: Task[];
  totalMinutes: number;
}

export interface MonthDayRow {
  date: string;
  sessions: TimeSession[];
  tasks: Task[];
  totalMinutes: number;
}

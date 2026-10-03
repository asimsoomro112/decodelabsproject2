export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface Course {
  id: string;
  title: string;
  description?: string;
  level: Level;
  seats: number;
  startDate: string; // YYYY-MM-DD
  createdAt: string; // ISO-8601 datetime
}

export interface Learner {
  id: string;
  name: string;
  email: string; // always stored lowercase
  createdAt: string; // ISO-8601 datetime
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

// Validation middleware stashes parsed input here. (Express 5 already types req.id.)
declare global {
  namespace Express {
    interface Request {
      parsedQuery?: unknown;
      parsedParams?: unknown;
    }
  }
}

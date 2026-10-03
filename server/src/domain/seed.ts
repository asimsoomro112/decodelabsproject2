import { courseStore, learnerStore, resetStores } from './store.ts';
import type { Course, Learner } from './types.ts';

function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Seed data uses dates relative to boot time so "not in the past" never rots. */
export function seed(): void {
  resetStores();

  const courses: Array<Omit<Course, 'id' | 'createdAt'>> = [
    {
      title: 'REST API Design Fundamentals',
      description: 'Design clean, predictable REST APIs: resources as nouns, verbs as methods, status codes and versioning.',
      level: 'beginner', seats: 120, startDate: isoDatePlusDays(30),
    },
    {
      title: 'TypeScript for Backend Engineers',
      description: 'Types, generics and strict mode for reliable Node.js services.',
      level: 'intermediate', seats: 80, startDate: isoDatePlusDays(45),
    },
    {
      title: 'Advanced Node.js Performance',
      description: 'Event loop, streams, clustering and profiling production Node.',
      level: 'advanced', seats: 50, startDate: isoDatePlusDays(60),
    },
    {
      title: 'Database Modeling Essentials',
      description: 'From ER diagrams to indexes: model data that scales.',
      level: 'beginner', seats: 200, startDate: isoDatePlusDays(21),
    },
    {
      title: 'Authentication & Authorization Patterns',
      description: 'Sessions, JWT, OAuth2 and RBAC — who are you, and may you?',
      level: 'intermediate', seats: 90, startDate: isoDatePlusDays(75),
    },
    {
      title: 'System Design Crash Course',
      description: 'Caching, queues, sharding and the trade-offs behind real systems.',
      level: 'advanced', seats: 60, startDate: isoDatePlusDays(90),
    },
  ];
  for (const c of courses) courseStore.create(c);

  const learners: Array<Omit<Learner, 'id' | 'createdAt'>> = [
    { name: 'Areeba Shah', email: 'areeba.shah@example.com' },
    { name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com' },
    { name: 'Chen Wei', email: 'chen.wei@example.com' },
    { name: 'Dania Raza', email: 'dania.raza@example.com' },
    { name: 'Ethan Cole', email: 'ethan.cole@example.com' },
    { name: 'Fatima Noor', email: 'fatima.noor@example.com' },
    { name: 'George Miller', email: 'george.miller@example.com' },
    { name: 'Hina Tariq', email: 'hina.tariq@example.com' },
  ];
  for (const l of learners) learnerStore.create(l);
}

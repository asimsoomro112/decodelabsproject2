import { InMemoryRepository } from './memoryStore.ts';
import type { Repository } from './repository.ts';
import type { Course, Learner } from './types.ts';

// Singletons wired to the Repository interface — the only thing routes import.
export const courseStore: Repository<Course> = new InMemoryRepository<Course>();
export const learnerStore: Repository<Learner> = new InMemoryRepository<Learner>();

export function resetStores(): void {
  courseStore.clear();
  learnerStore.clear();
}

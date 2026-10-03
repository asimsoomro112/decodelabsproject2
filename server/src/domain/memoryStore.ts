import { randomUUID } from 'node:crypto';
import type { Repository } from './repository.ts';

/** In-memory Repository implementation. No sessions, no per-client state — stateless. */
export class InMemoryRepository<T extends { id: string; createdAt: string }> implements Repository<T> {
  private items = new Map<string, T>();

  list(): T[] {
    return [...this.items.values()];
  }

  getById(id: string): T | undefined {
    return this.items.get(id);
  }

  find(predicate: (item: T) => boolean): T[] {
    return this.list().filter(predicate);
  }

  create(data: Omit<T, 'id' | 'createdAt'>): T {
    const item = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    } as T;
    this.items.set(item.id, item);
    return item;
  }

  count(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }
}

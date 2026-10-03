/**
 * Repository<T> — the seam Project 3 will swap for a real database.
 * Everything above this interface (routes, validation, OpenAPI) only talks
 * to these six methods, so no route code changes when persistence does.
 */
export interface Repository<T extends { id: string; createdAt: string }> {
  list(): T[];
  getById(id: string): T | undefined;
  find(predicate: (item: T) => boolean): T[];
  create(data: Omit<T, 'id' | 'createdAt'>): T;
  count(): number;
  clear(): void;
}

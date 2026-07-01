class SimpleCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }
  
  set(key: string, value: any, ttlMs: number): void {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  
  del(key: string): void {
    this.cache.delete(key);
  }

  flush(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();
export default cache;

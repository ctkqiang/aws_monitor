const pendingRequests = new Map<string, Promise<unknown>>();
const lastRequestTime = new Map<string, number>();

function getMinInterval(key: string): number {
  return 200;
}

export async function rateLimit<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const last = lastRequestTime.get(key) || 0;
  const minInterval = getMinInterval(key);
  const wait = Math.max(0, minInterval - (now - last));

  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }

  lastRequestTime.set(key, Date.now());
  return fn();
}

export function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    if (pendingRequests.get(key) === promise) {
      pendingRequests.delete(key);
    }
  });

  pendingRequests.set(key, promise);
  return promise;
}

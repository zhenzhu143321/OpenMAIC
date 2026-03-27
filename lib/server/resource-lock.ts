export function createResourceLock<T extends string = string>() {
  const locks = new Map<T, Promise<void>>();

  return async function withLock<R>(
    resourceId: T,
    fn: () => Promise<R>
  ): Promise<R> {
    const prev = locks.get(resourceId) ?? Promise.resolve();
    let resolve: () => void;
    const next = new Promise<void>((r) => {
      resolve = r;
    });
    locks.set(resourceId, next);
    try {
      await prev;
      return await fn();
    } finally {
      resolve!();
      if (locks.get(resourceId) === next) locks.delete(resourceId);
    }
  };
}

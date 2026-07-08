/** Bounded concurrency pool for async work. */
export function createConcurrencyLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            const next = queue.shift();
            if (next) next();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

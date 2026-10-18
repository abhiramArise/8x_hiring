export function withStorageTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = 4000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Browser storage timed out.")),
      timeoutMs,
    );
    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });
}

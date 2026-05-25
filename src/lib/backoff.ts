import { logger } from "./logger";

interface BackoffOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
}

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 32000,
    factor = 2,
  } = options;

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (isNonRetryable(lastError)) {
        throw lastError;
      }

      if (attempt === maxRetries) break;

      const baseDelay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
      const jitter = Math.random() * baseDelay * 0.1;
      const delay = Math.round(baseDelay + jitter);

      logger.warn("Retrying after error", {
        attempt,
        delay,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

function isNonRetryable(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("400") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("404")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

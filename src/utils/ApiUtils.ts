
/**
 * Executes a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => 
      error instanceof TypeError || 
      error.message.includes('network') ||
      error.message.includes('5') // 5xx errors
  } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries}`);
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
        );
      }
      
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if shouldRetry returns false
      if (!shouldRetry(lastError) || attempt === maxRetries) {
        break;
      }
    }
  }
  
  throw lastError;
}

/**
 * Creates a timeout that will abort a fetch request
 */
export function createRequestTimeout(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  clearTimeout: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    controller,
    timeoutId,
    clearTimeout: () => clearTimeout(timeoutId)
  };
}

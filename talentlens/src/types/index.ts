export type ApiResponse<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function err(error: string, details?: unknown): ApiResponse<never> {
  return { success: false, error, details };
}

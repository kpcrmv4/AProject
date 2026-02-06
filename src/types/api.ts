// Standard API response format (ตาม blueprint section 8)
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } };

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function successResponse<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function errorResponse(
  code: ApiErrorCode,
  message: string
): ApiResponse<never> {
  return { data: null, error: { code, message } };
}

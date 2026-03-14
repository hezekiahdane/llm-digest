/**
 * Consistent API response envelope used across all API routes.
 *
 * Usage:
 *   return NextResponse.json(successResponse(data));
 *   return NextResponse.json(errorResponse('Not found'), { status: 404 });
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = null> {
  success: boolean;
  data: T;
  error: string | null;
  meta?: PaginationMeta;
}

export function successResponse<T>(
  data: T,
  meta?: PaginationMeta,
): ApiResponse<T> {
  return { success: true, data, error: null, ...(meta ? { meta } : {}) };
}

export function errorResponse(message: string): ApiResponse<null> {
  return { success: false, data: null, error: message };
}

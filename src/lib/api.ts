import type {
  CategoryListItem,
  CategoryStatusValue,
  PaginatedResult,
} from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Where the JWT lives for now (parked auth). A real login flow will own this
// key; until then a valid admin token can be placed here manually.
const TOKEN_STORAGE_KEY = 'oams_token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, headers, ...rest } = options;

  const url = new URL(`${API_BASE_URL}/api${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem(TOKEN_STORAGE_KEY)
      : null;

  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : errorBody.message;
      }
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface GetCategoriesParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function getCategories(
  params: GetCategoriesParams = {},
): Promise<PaginatedResult<CategoryListItem>> {
  const query: Record<string, string | number | undefined> = {
    search: params.search,
    status: params.status,
    page: params.page,
    limit: params.limit,
  };
  return request<PaginatedResult<CategoryListItem>>('/categories', { query });
}

export function getCategory(id: string) {
  return request(`/categories/${id}`);
}

export function updateCategoryStatus(id: string, status: CategoryStatusValue) {
  return request(`/categories/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function deleteCategory(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

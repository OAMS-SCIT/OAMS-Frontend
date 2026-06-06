import type {
  AssetDetail,
  AssetListItem,
  AssetStatus,
  AssetUpgrade,
  AuthUser,
  CategoryDetail,
  CategoryListItem,
  CategoryStatusValue,
  CreateAssetPayload,
  CreateCategoryPayload,
  CreateUpgradePayload,
  CreateUserPayload,
  CreateUserResponse,
  DesignationListItem,
  LoginResponse,
  ManualAssetStatus,
  PaginatedResult,
  UpdateAssetPayload,
  UpdateCategoryPayload,
  UpdateUpgradePayload,
  UpdateUserPayload,
  UserListItem,
  UserRole,
  UserStatus,
} from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// localStorage key that holds the admin JWT. Owned by the auth provider
// (auth-provider.tsx); read here to authenticate every API request.
export const TOKEN_STORAGE_KEY = 'oams_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, string | number | boolean | undefined>;
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

  const token = getToken();

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
    // A 401 on an authenticated request means the token is missing/expired —
    // drop it so the route guard sends the user back to /login.
    if (response.status === 401 && token) {
      clearToken();
    }
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

// ── Auth ─────────────────────────────────────────────────────────────────

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getProfile(): Promise<AuthUser> {
  return request<AuthUser>('/auth/profile');
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore — the token is cleared by the caller regardless.
  }
}

// ── Users ─────────────────────────────────────────────────────────────────

export interface GetUsersParams {
  search?: string;
  role?: UserRole | '';
  status?: UserStatus | '';
  page?: number;
  limit?: number;
}

export function getUsers(
  params: GetUsersParams = {},
): Promise<PaginatedResult<UserListItem>> {
  const query: Record<string, string | number | undefined> = {
    search: params.search,
    role: params.role || undefined,
    status: params.status || undefined,
    page: params.page,
    limit: params.limit,
  };
  return request<PaginatedResult<UserListItem>>('/users', { query });
}

export function updateUserStatus(id: string, status: UserStatus): Promise<UserListItem> {
  return request<UserListItem>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<UserListItem> {
  return request<UserListItem>(`/users/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  return request<CreateUserResponse>('/users', {
    method: 'POST',
    body: payload,
  });
}

// ── Designations ──────────────────────────────────────────────────────────

export function getDesignations(): Promise<DesignationListItem[]> {
  return request<DesignationListItem[]>('/designations');
}

// ── Categories ────────────────────────────────────────────────────────────

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

export function getCategory(id: string): Promise<CategoryDetail> {
  return request<CategoryDetail>(`/categories/${id}`);
}

export function createCategory(payload: CreateCategoryPayload): Promise<CategoryDetail> {
  return request<CategoryDetail>('/categories', {
    method: 'POST',
    body: payload,
  });
}

export function updateCategory(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<CategoryDetail> {
  return request<CategoryDetail>(`/categories/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateCategoryStatus(
  id: string,
  status: CategoryStatusValue,
): Promise<CategoryDetail> {
  return request<CategoryDetail>(`/categories/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function deleteCategory(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

// ── Assets ────────────────────────────────────────────────────────────────

export interface GetAssetsParams {
  search?: string;
  categoryId?: string;
  status?: AssetStatus | '';
  brand?: string;
  sortBy?: 'name' | 'purchaseDate' | 'warrantyExpiryDate' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export function getAssets(
  params: GetAssetsParams = {},
): Promise<PaginatedResult<AssetListItem>> {
  const query: Record<string, string | number | undefined> = {
    search: params.search,
    categoryId: params.categoryId,
    status: params.status || undefined,
    brand: params.brand,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    page: params.page,
    limit: params.limit,
  };
  return request<PaginatedResult<AssetListItem>>('/assets', { query });
}

export function getAsset(id: string): Promise<AssetDetail> {
  return request<AssetDetail>(`/assets/${id}`);
}

export function createAsset(payload: CreateAssetPayload): Promise<AssetDetail> {
  return request<AssetDetail>('/assets', {
    method: 'POST',
    body: payload,
  });
}

export function updateAsset(
  id: string,
  payload: UpdateAssetPayload,
): Promise<AssetDetail> {
  return request<AssetDetail>(`/assets/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function updateAssetStatus(
  id: string,
  status: ManualAssetStatus,
): Promise<AssetDetail> {
  return request<AssetDetail>(`/assets/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function deleteAsset(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/assets/${id}`, {
    method: 'DELETE',
  });
}

// ── Upgrade Log ───────────────────────────────────────────────────────────

export function getUpgrades(
  assetId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResult<AssetUpgrade>> {
  return request<PaginatedResult<AssetUpgrade>>(
    `/assets/${assetId}/upgrades`,
    { query: { page, limit } },
  );
}

export function createUpgrade(
  assetId: string,
  payload: CreateUpgradePayload,
): Promise<AssetUpgrade> {
  return request<AssetUpgrade>(`/assets/${assetId}/upgrades`, {
    method: 'POST',
    body: payload,
  });
}

export function updateUpgrade(
  id: string,
  payload: UpdateUpgradePayload,
): Promise<AssetUpgrade> {
  return request<AssetUpgrade>(`/upgrades/${id}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteUpgrade(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/upgrades/${id}`, {
    method: 'DELETE',
  });
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('fu_admin_token') : null;

  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  let body: BodyInit | null | undefined = options.body;
  if (
    body != null &&
    typeof body === 'string' &&
    method !== 'GET' &&
    method !== 'HEAD'
  ) {
    headers.delete('Content-Type');
    body = new Blob([body], { type: 'application/json' });
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || 'Request failed');
  }

  return response.json();
}
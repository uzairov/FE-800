'use client';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

function getToken(key: string): string | null {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function setToken(key: string, value: string) {
  // Store in the same place where accessToken lives
  const inLocal = !!localStorage.getItem('accessToken');
  (inLocal ? localStorage : sessionStorage).setItem(key, value);
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getToken('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch('/api/auth/refresh', {
    method:      'POST',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ refreshToken }),
    credentials: 'include',
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.success) return null;

  setToken('accessToken', data.data.accessToken);
  if (data.data.refreshToken) setToken('refreshToken', data.data.refreshToken);
  return data.data.accessToken;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const token = getToken('accessToken');

  const doFetch = (t: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (!newToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return { success: false, error: 'Session expired' };
    }
    res = await doFetch(newToken);
  }

  try {
    return await res.json();
  } catch {
    return { success: false, error: 'Invalid server response' } as ApiResult<T>;
  }
}

'use client';

type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.success) return null;

  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  return data.data.accessToken;
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const token = localStorage.getItem('accessToken');

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

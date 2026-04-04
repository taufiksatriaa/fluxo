export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000/api";

type ApiErrorPayload = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function isApiError(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") return false;
  if (!("ok" in value) || !("error" in value)) return false;
  const v = value as { ok?: unknown; error?: unknown };
  if (v.ok !== false) return false;
  if (!v.error || typeof v.error !== "object") return false;
  const e = v.error as { message?: unknown };
  return typeof e.message === "string";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }
  if (options.token) {
    headers.set("authorization", `Bearer ${options.token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    if (isApiError(json)) throw new Error(json.error.message);
    throw new Error(`Request failed (${res.status})`);
  }

  return json as T;
}

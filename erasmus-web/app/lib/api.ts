export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  let data: unknown = null;
  if (text.trim()) {
    if (contentType.includes("application/json")) {
      data = JSON.parse(text);
    } else {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "detail" in data
        ? (data as { detail?: string }).detail || "Request failed"
        : typeof data === "string"
          ? data
          : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

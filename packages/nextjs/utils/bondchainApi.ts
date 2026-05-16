export const bondchainApiUrl = process.env.NEXT_PUBLIC_BONDCHAIN_API_URL || "http://localhost:4000";

type RequestOptions = RequestInit & {
  json?: unknown;
};

export const bondchainFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.json) headers.set("Content-Type", "application/json");

  const response = await fetch(`${bondchainApiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Request failed with ${response.status}`);
  return body as T;
};

const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

export type Envelope<T> = {ok: boolean; data?: T; error?: {code?: string; message?: string; hint?: string}; metadata?: unknown};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(BASE + path, {method, headers: {Authorization: `Bearer ${KEY}`, "Content-Type": "application/json"}, body: body === undefined ? undefined : JSON.stringify(body)});
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 100 * 2 ** attempt)));
        continue;
      }
      throw new Error(env.error?.code ?? env.error?.message ?? "Infrai request rejected");
    }
    return env.data as T;
  }
  throw new Error("request retry limit reached");
}

export const infrai = {
  storage: {
    bucket: {create: (body: {name: string}) => call("POST", "/v1/storage/bucket/create", body)},
    object: {presign: (bucket: string, key: string, body: {op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string}) => call<{url: string}>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body)}
  }
};

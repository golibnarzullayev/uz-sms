import { SmsProviderError } from "../errors.js";
import type { ProviderName } from "../types.js";

/** `fetch` wrapper that enforces a timeout and tags failures with the provider. */
export async function httpFetch(
  provider: ProviderName,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SmsProviderError(provider, `Request timed out after ${timeoutMs}ms`);
    }
    throw new SmsProviderError(
      provider,
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      { raw: err },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a response body as JSON, falling back to text on malformed payloads. */
export async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

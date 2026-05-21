import { SmsProviderError } from "../errors.js";
import { httpFetch, parseBody } from "../internal/http.js";
import { normalizePhone } from "../internal/phone.js";
import type {
  EskizConfig,
  SendSmsParams,
  SendSmsResult,
  SmsProvider,
} from "../types.js";

const DEFAULT_BASE_URL = "https://notify.eskiz.uz/api";

/** Adapter for Eskiz (notify.eskiz.uz). Auth is a bearer token minted on demand. */
export class EskizProvider implements SmsProvider {
  readonly name = "eskiz" as const;

  private readonly baseUrl: string;
  private token?: string;

  constructor(
    private readonly config: EskizConfig,
    private readonly timeoutMs: number,
  ) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const body = new URLSearchParams({
      mobile_phone: normalizePhone(params.to),
      message: params.text,
      from: params.from ?? this.config.from ?? "4546",
    });
    if (params.callbackUrl) body.set("callback_url", params.callbackUrl);

    const raw = await this.request("/message/sms/send", body);
    const data = raw as { id?: string | number; status?: string };

    return {
      provider: this.name,
      messageId: data.id != null ? String(data.id) : undefined,
      status: data.status === "waiting" ? "queued" : "sent",
      raw,
    };
  }

  async getBalance(): Promise<number> {
    const token = await this.auth();
    const res = await httpFetch(
      this.name,
      `${this.baseUrl}/user/get-limit`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      this.timeoutMs,
    );
    const raw = await parseBody(res);
    if (!res.ok) {
      throw new SmsProviderError(this.name, "Failed to fetch balance", {
        status: res.status,
        raw,
      });
    }
    const balance = (raw as { data?: { balance?: number } }).data?.balance;
    return typeof balance === "number" ? balance : Number(balance ?? 0);
  }

  /** POST a form body to an authenticated endpoint, retrying once on a 401. */
  private async request(path: string, body: URLSearchParams): Promise<unknown> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.auth();
      const res = await httpFetch(
        this.name,
        `${this.baseUrl}${path}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        },
        this.timeoutMs,
      );
      const raw = await parseBody(res);

      if (res.status === 401 && attempt === 0) {
        this.token = undefined;
        continue;
      }
      if (!res.ok) {
        throw new SmsProviderError(this.name, this.describe(raw), {
          status: res.status,
          raw,
        });
      }
      return raw;
    }
    // Unreachable: the loop either returns or throws.
    throw new SmsProviderError(this.name, "Request failed after token refresh");
  }

  /** Return a cached bearer token, minting a fresh one if needed. */
  private async auth(): Promise<string> {
    if (this.token) return this.token;

    const body = new URLSearchParams({
      email: this.config.email,
      password: this.config.password,
    });
    const res = await httpFetch(
      this.name,
      `${this.baseUrl}/auth/login`,
      { method: "POST", body },
      this.timeoutMs,
    );
    const raw = await parseBody(res);
    const token = (raw as { data?: { token?: string } }).data?.token;

    if (!res.ok || !token) {
      throw new SmsProviderError(this.name, "Authentication failed", {
        status: res.status,
        raw,
      });
    }
    this.token = token;
    return token;
  }

  private describe(raw: unknown): string {
    if (raw && typeof raw === "object" && "message" in raw) {
      return String((raw as { message: unknown }).message);
    }
    return "Provider rejected the request";
  }
}

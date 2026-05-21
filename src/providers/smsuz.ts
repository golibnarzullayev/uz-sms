import { SmsProviderError } from "../errors.js";
import { httpFetch, parseBody } from "../internal/http.js";
import { normalizePhone } from "../internal/phone.js";
import type {
  SendSmsParams,
  SendSmsResult,
  SmsProvider,
  SmsUzConfig,
} from "../types.js";

const DEFAULT_BASE_URL = "https://api.sms.uz/sms/send";

/** Default query-param names; override via `SmsUzConfig.params` per account. */
const DEFAULT_PARAMS = {
  login: "login",
  password: "password",
  phone: "phone",
  text: "text",
  from: "from",
} as const;

/** Adapter for SMS.uz — a simple HTTP GET gateway. */
export class SmsUzProvider implements SmsProvider {
  readonly name = "smsuz" as const;

  private readonly baseUrl: string;
  private readonly fields: Record<keyof typeof DEFAULT_PARAMS, string>;

  constructor(
    private readonly config: SmsUzConfig,
    private readonly timeoutMs: number,
  ) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.fields = { ...DEFAULT_PARAMS, ...config.params };
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const url = new URL(this.baseUrl);
    url.searchParams.set(this.fields.login, this.config.login);
    url.searchParams.set(this.fields.password, this.config.password);
    url.searchParams.set(this.fields.phone, normalizePhone(params.to));
    url.searchParams.set(this.fields.text, params.text);

    const from = params.from ?? this.config.from;
    if (from) url.searchParams.set(this.fields.from, from);

    const res = await httpFetch(
      this.name,
      url.toString(),
      { method: "GET" },
      this.timeoutMs,
    );
    const raw = await parseBody(res);

    if (!res.ok) {
      throw new SmsProviderError(this.name, this.describe(raw), {
        status: res.status,
        raw,
      });
    }

    return {
      provider: this.name,
      messageId: this.extractId(raw),
      status: "sent",
      raw,
    };
  }

  private extractId(raw: unknown): string | undefined {
    if (raw && typeof raw === "object") {
      const id = (raw as { id?: unknown; message_id?: unknown }).id ??
        (raw as { message_id?: unknown }).message_id;
      if (id != null) return String(id);
    }
    return undefined;
  }

  private describe(raw: unknown): string {
    if (raw && typeof raw === "object" && "error" in raw) {
      return String((raw as { error: unknown }).error);
    }
    if (typeof raw === "string" && raw) return raw;
    return "Provider rejected the request";
  }
}

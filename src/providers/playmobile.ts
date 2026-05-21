import { SmsProviderError } from "../errors.js";
import { httpFetch, parseBody } from "../internal/http.js";
import { normalizePhone } from "../internal/phone.js";
import type {
  PlayMobileConfig,
  SendSmsParams,
  SendSmsResult,
  SmsProvider,
} from "../types.js";

const DEFAULT_BASE_URL = "https://send.smsxabar.uz/broker-api";

/** Adapter for Play Mobile (broker-api). Auth is HTTP Basic on every request. */
export class PlayMobileProvider implements SmsProvider {
  readonly name = "playmobile" as const;

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(
    private readonly config: PlayMobileConfig,
    private readonly timeoutMs: number,
  ) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const creds = `${config.login}:${config.password}`;
    this.authHeader = `Basic ${Buffer.from(creds).toString("base64")}`;
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const messageId = `uz-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      messages: [
        {
          recipient: normalizePhone(params.to),
          "message-id": messageId,
          sms: {
            originator: params.from ?? this.config.from,
            content: { text: params.text },
          },
        },
      ],
    };

    const res = await httpFetch(
      this.name,
      `${this.baseUrl}/send`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
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
      messageId,
      // Play Mobile accepts the batch and delivers asynchronously.
      status: "queued",
      raw,
    };
  }

  private describe(raw: unknown): string {
    if (raw && typeof raw === "object" && "error" in raw) {
      return String((raw as { error: unknown }).error);
    }
    if (typeof raw === "string" && raw) return raw;
    return "Provider rejected the request";
  }
}

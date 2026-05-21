import { SmsProviderError } from "../errors.js";
import { httpFetch, parseBody } from "../internal/http.js";
import { normalizePhone } from "../internal/phone.js";
import type {
  OctotelecomConfig,
  SendSmsParams,
  SendSmsResult,
  SmsProvider,
} from "../types.js";

const DEFAULT_BASE_URL = "https://api.octotelecom.uz";

/** Adapter for Octotelecom (JSONv2 API). Auth is HTTP Basic on every request. */
export class OctotelecomProvider implements SmsProvider {
  readonly name = "octotelecom" as const;

  private readonly endpoint: string;
  private readonly authHeader: string;

  constructor(
    private readonly config: OctotelecomConfig,
    private readonly timeoutMs: number,
  ) {
    const base = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.endpoint = `${base}/${config.clientId}/json2/simple`;
    const creds = `${config.username}:${config.password}`;
    this.authHeader = `Basic ${Buffer.from(creds).toString("base64")}`;
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const extraId = `uz-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const callbackUrl = params.callbackUrl ?? this.config.callbackUrl;

    const payload: Record<string, unknown> = {
      // Octotelecom expects the number without a leading "+".
      phone_number: normalizePhone(params.to),
      extra_id: extraId,
      tag: this.config.tag ?? "uz-sms",
      channels: ["sms"],
      channel_options: {
        sms: {
          text: params.text,
          alpha_name: params.from ?? this.config.from,
          ttl: this.config.ttl ?? 300,
        },
      },
    };
    if (callbackUrl) payload.callback_url = callbackUrl;

    const res = await httpFetch(
      this.name,
      this.endpoint,
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
    const data = raw as { message_id?: string | number; error_text?: string };

    // Octotelecom can return a 200 with an `error_text` instead of an HTTP error.
    if (!res.ok || data?.error_text) {
      throw new SmsProviderError(
        this.name,
        data?.error_text ?? "Provider rejected the request",
        { status: res.status, raw },
      );
    }

    return {
      provider: this.name,
      messageId: data?.message_id != null ? String(data.message_id) : extraId,
      status: "sent",
      raw,
    };
  }
}

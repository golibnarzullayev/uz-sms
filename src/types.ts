/** Supported provider identifiers. */
export type ProviderName = "eskiz" | "playmobile" | "smsuz" | "octotelecom";

/** Parameters for a single outgoing SMS. */
export interface SendSmsParams {
  /** Recipient phone number. Accepts +998..., 998..., or spaced forms — normalized internally to 998XXXXXXXXX. */
  to: string;
  /** Message body. */
  text: string;
  /** Sender / alpha-name. Falls back to the provider's configured `from`. */
  from?: string;
  /** Optional delivery-report callback URL (supported by Eskiz). */
  callbackUrl?: string;
}

/** Normalized result returned by every provider. */
export interface SendSmsResult {
  /** Provider that handled the message. */
  provider: ProviderName;
  /** Provider-side message id, when available. */
  messageId?: string;
  /** Coarse delivery status reported at send time. */
  status: "sent" | "queued" | "failed";
  /** Untouched provider response, for debugging / advanced use. */
  raw: unknown;
}

/** Adapter contract every provider implements. */
export interface SmsProvider {
  readonly name: ProviderName;
  send(params: SendSmsParams): Promise<SendSmsResult>;
  /** Account balance in the provider's billing unit (UZS). Optional. */
  getBalance?(): Promise<number>;
}

/** Eskiz (notify.eskiz.uz) credentials & options. */
export interface EskizConfig {
  email: string;
  password: string;
  /** Default sender. Eskiz test sender is `4546`. */
  from?: string;
  /** Override API base. Default: https://notify.eskiz.uz/api */
  baseUrl?: string;
}

/** Play Mobile (broker-api) credentials & options. */
export interface PlayMobileConfig {
  login: string;
  password: string;
  /** Originator / alpha-name registered with Play Mobile. */
  from: string;
  /** Override API base. Default: https://send.smsxabar.uz/broker-api */
  baseUrl?: string;
}

/**
 * SMS.uz credentials & options.
 *
 * SMS.uz exposes a simple HTTP GET gateway whose exact field names vary per
 * account. Defaults below match the common `login/password/phone/text` shape;
 * override `params` if your account uses different names.
 */
export interface SmsUzConfig {
  login: string;
  password: string;
  from?: string;
  /** Override API base. Default: https://api.sms.uz/sms/send */
  baseUrl?: string;
  /** Query-param name mapping, if your gateway differs from the defaults. */
  params?: {
    login?: string;
    password?: string;
    phone?: string;
    text?: string;
    from?: string;
  };
}

/**
 * Octotelecom credentials & options.
 *
 * Octotelecom exposes a JSONv2 endpoint at
 * `{baseUrl}/{clientId}/json2/simple` with HTTP Basic auth.
 */
export interface OctotelecomConfig {
  /** Client id — a path segment in the JSONv2 endpoint. */
  clientId: string;
  username: string;
  password: string;
  /** Default alpha-name / sender. */
  from?: string;
  /** Default delivery-report callback URL. Overridable per message. */
  callbackUrl?: string;
  /** Tag attached to every message, for provider-side reporting. Default: `uz-sms`. */
  tag?: string;
  /** Message time-to-live in seconds. Default: 300. */
  ttl?: number;
  /** Override API base. Default: https://api.octotelecom.uz */
  baseUrl?: string;
}

/** Top-level client config. Exactly one provider is active per client. */
export interface SmsClientConfig {
  /** Which provider this client sends through. */
  provider: ProviderName;
  /** Request timeout in ms. Default: 15000. */
  timeoutMs?: number;
  eskiz?: EskizConfig;
  playmobile?: PlayMobileConfig;
  smsuz?: SmsUzConfig;
  octotelecom?: OctotelecomConfig;
}

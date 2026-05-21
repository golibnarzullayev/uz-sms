import type { ProviderName } from "./types.js";

/** Base error for every failure raised by this package. */
export class SmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsError";
  }
}

/** Bad client/provider configuration (missing credentials, unknown provider). */
export class SmsConfigError extends SmsError {
  constructor(message: string) {
    super(message);
    this.name = "SmsConfigError";
  }
}

/** A provider rejected the request or returned a non-OK response. */
export class SmsProviderError extends SmsError {
  /** Provider that produced the error. */
  readonly provider: ProviderName;
  /** HTTP status, when the failure originated from an HTTP response. */
  readonly status?: number;
  /** Raw provider payload, for debugging. */
  readonly raw?: unknown;

  constructor(
    provider: ProviderName,
    message: string,
    opts: { status?: number; raw?: unknown } = {},
  ) {
    super(`[${provider}] ${message}`);
    this.name = "SmsProviderError";
    this.provider = provider;
    this.status = opts.status;
    this.raw = opts.raw;
  }
}

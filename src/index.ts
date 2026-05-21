import { SmsConfigError } from "./errors.js";
import { EskizProvider } from "./providers/eskiz.js";
import { PlayMobileProvider } from "./providers/playmobile.js";
import { SmsUzProvider } from "./providers/smsuz.js";
import type {
  SendSmsParams,
  SendSmsResult,
  SmsClientConfig,
  SmsProvider,
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 15_000;

/** A configured SMS client bound to exactly one provider. */
export class SmsClient {
  private readonly provider: SmsProvider;

  constructor(config: SmsClientConfig) {
    this.provider = buildProvider(config);
  }

  /** Provider this client sends through. */
  get providerName() {
    return this.provider.name;
  }

  /** Send one SMS. */
  send(params: SendSmsParams): Promise<SendSmsResult> {
    return this.provider.send(params);
  }

  /** Account balance in UZS. Throws if the active provider has no balance API. */
  getBalance(): Promise<number> {
    if (!this.provider.getBalance) {
      throw new SmsConfigError(
        `Provider "${this.provider.name}" does not support balance lookup`,
      );
    }
    return this.provider.getBalance();
  }
}

/** Construct an {@link SmsClient} from config. */
export function createSmsClient(config: SmsClientConfig): SmsClient {
  return new SmsClient(config);
}

function buildProvider(config: SmsClientConfig): SmsProvider {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  switch (config.provider) {
    case "eskiz":
      if (!config.eskiz) {
        throw new SmsConfigError('Missing "eskiz" config for provider "eskiz"');
      }
      return new EskizProvider(config.eskiz, timeoutMs);

    case "playmobile":
      if (!config.playmobile) {
        throw new SmsConfigError(
          'Missing "playmobile" config for provider "playmobile"',
        );
      }
      return new PlayMobileProvider(config.playmobile, timeoutMs);

    case "smsuz":
      if (!config.smsuz) {
        throw new SmsConfigError('Missing "smsuz" config for provider "smsuz"');
      }
      return new SmsUzProvider(config.smsuz, timeoutMs);

    default: {
      const exhaustive: never = config.provider;
      throw new SmsConfigError(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}

export { normalizePhone } from "./internal/phone.js";
export {
  SmsError,
  SmsConfigError,
  SmsProviderError,
} from "./errors.js";
export type {
  ProviderName,
  SendSmsParams,
  SendSmsResult,
  SmsProvider,
  EskizConfig,
  PlayMobileConfig,
  SmsUzConfig,
  SmsClientConfig,
} from "./types.js";

# uz-sms

Unified SMS client for Uzbekistan providers: **Eskiz**, **Play Mobile**, **SMS.uz**.

One API, one result shape. Swap providers by changing config.

## Install

```bash
npm install uz-sms
```

Requires Node.js >= 18 (uses the global `fetch`).

## Quick start

```ts
import { createSmsClient } from "uz-sms";

const sms = createSmsClient({
  provider: "eskiz",
  eskiz: { email: "you@example.uz", password: "secret" },
});

const result = await sms.send({
  to: "+998 90 123 45 67",
  text: "Salom!",
});

console.log(result.provider, result.status, result.messageId);
```

## Phone numbers

`to` is normalized internally. All of these resolve to `998901234567`:

- `+998 90 123 45 67`
- `998901234567`
- `(90) 123-45-67`
- `901234567` (9-digit national form)

Invalid numbers throw `SmsError`.

## Providers

### Eskiz

```ts
createSmsClient({
  provider: "eskiz",
  eskiz: {
    email: "you@example.uz",
    password: "secret",
    from: "4546", // optional; 4546 is the Eskiz test sender
  },
});
```

- Bearer token is minted on demand, cached, and refreshed automatically on a 401.
- Supports `getBalance()` and per-message `callbackUrl` (delivery reports).

### Play Mobile

```ts
createSmsClient({
  provider: "playmobile",
  playmobile: {
    login: "login",
    password: "secret",
    from: "ALPHANAME", // registered originator
  },
});
```

- HTTP Basic auth. Messages are queued; `result.status` is `"queued"`.

### SMS.uz

```ts
createSmsClient({
  provider: "smsuz",
  smsuz: {
    login: "login",
    password: "secret",
    from: "ALPHANAME", // optional
    // Override query-param names if your gateway differs:
    // params: { phone: "number", text: "msg" },
  },
});
```

- Simple HTTP GET gateway. Field names vary per account — override via `params`.

## API

### `createSmsClient(config): SmsClient`

Builds a client bound to exactly one provider. Throws `SmsConfigError` if the
matching provider block is missing.

### `client.send(params): Promise<SendSmsResult>`

```ts
interface SendSmsParams {
  to: string;
  text: string;
  from?: string;        // overrides the provider's configured sender
  callbackUrl?: string; // Eskiz only
}

interface SendSmsResult {
  provider: "eskiz" | "playmobile" | "smsuz";
  messageId?: string;
  status: "sent" | "queued" | "failed";
  raw: unknown; // untouched provider response
}
```

### `client.getBalance(): Promise<number>`

Account balance in UZS. Throws `SmsConfigError` on providers without a balance
API (Play Mobile, SMS.uz).

### `normalizePhone(input): string`

Exported standalone for validation use.

## Errors

| Error              | When                                                    |
| ------------------ | ------------------------------------------------------- |
| `SmsError`         | Base class; also thrown for invalid phone numbers.      |
| `SmsConfigError`   | Missing credentials or unsupported operation.           |
| `SmsProviderError` | Provider rejected the request, timed out, or network.   |

`SmsProviderError` carries `provider`, `status?`, and `raw?` for debugging.

```ts
import { SmsProviderError } from "uz-sms";

try {
  await sms.send({ to: "998901234567", text: "hi" });
} catch (err) {
  if (err instanceof SmsProviderError) {
    console.error(err.provider, err.status, err.raw);
  }
}
```

## Config: timeout

`timeoutMs` applies to every HTTP request (default `15000`).

```ts
createSmsClient({ provider: "eskiz", timeoutMs: 8000, eskiz: { /* ... */ } });
```

## Development

```bash
npm run build      # bundle with tsup (ESM + CJS + d.ts)
npm run typecheck  # tsc --noEmit
npm test           # build, then node --test
```

## License

MIT

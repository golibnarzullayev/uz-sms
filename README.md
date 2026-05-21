<div align="center">

# uz-sms

**Unified SMS client for Uzbekistan providers — one API for [Eskiz](https://eskiz.uz), [Play Mobile](https://playmobile.uz), [SMS.uz](https://sms.uz), and [Octotelecom](https://octotelecom.uz).**

[![npm version](https://img.shields.io/npm/v/uz-sms.svg?style=flat-square)](https://www.npmjs.com/package/uz-sms)
[![npm downloads](https://img.shields.io/npm/dm/uz-sms.svg?style=flat-square)](https://www.npmjs.com/package/uz-sms)
[![CI](https://img.shields.io/github/actions/workflow/status/golibnarzullayev/uz-sms/ci.yml?branch=main&style=flat-square)](https://github.com/golibnarzullayev/uz-sms/actions)
[![license](https://img.shields.io/npm/l/uz-sms.svg?style=flat-square)](./LICENSE)
[![types](https://img.shields.io/npm/types/uz-sms.svg?style=flat-square)](https://www.npmjs.com/package/uz-sms)

</div>

---

Swap SMS providers by changing one config field. Every provider returns the
same result shape, throws the same typed errors, and accepts phone numbers in
any common Uzbek format.

```ts
const sms = createSmsClient({ provider: "eskiz", eskiz: { /* ... */ } });
await sms.send({ to: "+998 90 123 45 67", text: "Salom!" });
```

## Features

- 📱 **Four providers, one API** — Eskiz, Play Mobile, SMS.uz, Octotelecom behind a single interface.
- 🔁 **Drop-in swappable** — change `provider`, keep the rest of your code.
- 🧩 **Fully typed** — ships `.d.ts`, strict mode, exhaustive provider checks.
- 📦 **ESM + CJS** — works with `import` and `require`.
- ☎️ **Phone normalization** — `+998 90 …`, `998…`, `(90) 123-45-67`, 9-digit — all accepted.
- 🛡️ **Typed errors** — `SmsError`, `SmsConfigError`, `SmsProviderError` with provider/status/raw.
- ⏱️ **Per-request timeout** — `AbortController`-based, configurable.
- 🪶 **Zero runtime dependencies** — just the platform `fetch`.

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Providers](#providers)
  - [Eskiz](#eskiz)
  - [Play Mobile](#play-mobile)
  - [SMS.uz](#smsuz)
  - [Octotelecom](#octotelecom)
- [Phone numbers](#phone-numbers)
- [API reference](#api-reference)
- [Error handling](#error-handling)
- [Recipes](#recipes)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
npm install uz-sms
```

```bash
pnpm add uz-sms
```

```bash
yarn add uz-sms
```

> **Requirements:** Node.js >= 18 (relies on the global `fetch`).

## Quick start

```ts
import { createSmsClient } from "uz-sms";

const sms = createSmsClient({
  provider: "eskiz",
  eskiz: {
    email: "you@example.uz",
    password: "secret",
  },
});

const result = await sms.send({
  to: "+998 90 123 45 67",
  text: "Salom!",
});

console.log(result);
// {
//   provider: "eskiz",
//   messageId: "4385062",
//   status: "sent",
//   raw: { ... }
// }
```

CommonJS works too:

```js
const { createSmsClient } = require("uz-sms");
```

## Providers

| Provider     | `provider` value | Auth         | `getBalance()` | `callbackUrl` | Send status |
| ------------ | ---------------- | ------------ | :------------: | :-----------: | ----------- |
| Eskiz        | `"eskiz"`        | Bearer token |       ✅       |      ✅       | `sent`      |
| Play Mobile  | `"playmobile"`   | HTTP Basic   |       ❌       |      ❌       | `queued`    |
| SMS.uz       | `"smsuz"`        | Query params |       ❌       |      ❌       | `sent`      |
| Octotelecom  | `"octotelecom"`  | HTTP Basic   |       ❌       |      ✅       | `sent`      |

### Eskiz

```ts
const sms = createSmsClient({
  provider: "eskiz",
  eskiz: {
    email: "you@example.uz",
    password: "secret",
    from: "4546",                       // optional — 4546 is the Eskiz test sender
    baseUrl: "https://notify.eskiz.uz/api", // optional override
  },
});

await sms.send({
  to: "998901234567",
  text: "Your code: 1234",
  callbackUrl: "https://your-app.uz/sms/dlr", // delivery report webhook
});

const balance = await sms.getBalance(); // UZS
```

The bearer token is minted on demand, cached, and **refreshed automatically on a 401** — you never manage tokens.

### Play Mobile

```ts
const sms = createSmsClient({
  provider: "playmobile",
  playmobile: {
    login: "your-login",
    password: "secret",
    from: "ALPHANAME",                          // registered originator
    baseUrl: "https://send.smsxabar.uz/broker-api", // optional override
  },
});

await sms.send({ to: "998901234567", text: "Salom!" });
```

Play Mobile accepts messages into a queue, so `result.status` is `"queued"`.

### SMS.uz

```ts
const sms = createSmsClient({
  provider: "smsuz",
  smsuz: {
    login: "your-login",
    password: "secret",
    from: "ALPHANAME", // optional
    // SMS.uz query-param names vary per account — override if yours differ:
    params: {
      phone: "number",
      text: "msg",
    },
  },
});

await sms.send({ to: "998901234567", text: "Salom!" });
```

SMS.uz is a plain HTTP GET gateway. Defaults match the common
`login/password/phone/text/from` shape; use `params` to remap field names.

### Octotelecom

```ts
const sms = createSmsClient({
  provider: "octotelecom",
  octotelecom: {
    clientId: "your-client-id",
    username: "your-username",
    password: "secret",
    from: "ALPHANAME",                       // default alpha-name / sender
    callbackUrl: "https://your-app.uz/dlr",  // optional delivery-report webhook
    tag: "uz-sms",                           // optional, default "uz-sms"
    ttl: 300,                                // optional message TTL in seconds
    baseUrl: "https://api.octotelecom.uz",   // optional override
  },
});

await sms.send({ to: "998901234567", text: "Salom!" });
```

Octotelecom uses the JSONv2 endpoint `{baseUrl}/{clientId}/json2/simple` with
HTTP Basic auth. It may return HTTP 200 with an `error_text` field — that case
is detected and surfaced as `SmsProviderError`.

## Phone numbers

`to` is normalized before every request. All of these resolve to `998901234567`:

| Input                  | Normalized     |
| ---------------------- | -------------- |
| `+998 90 123 45 67`    | `998901234567` |
| `998901234567`         | `998901234567` |
| `(90) 123-45-67`       | `998901234567` |
| `901234567`            | `998901234567` |

A 9-digit national number is assumed Uzbek and prefixed with `998`. Anything
else throws [`SmsError`](#error-handling).

`normalizePhone` is exported standalone for form validation:

```ts
import { normalizePhone } from "uz-sms";

normalizePhone("+998 90 123 45 67"); // "998901234567"
```

## API reference

### `createSmsClient(config): SmsClient`

Builds a client bound to exactly one provider. Throws `SmsConfigError` if the
matching provider config block is missing.

```ts
interface SmsClientConfig {
  provider: "eskiz" | "playmobile" | "smsuz" | "octotelecom";
  timeoutMs?: number;        // per-request timeout, default 15000
  eskiz?: EskizConfig;
  playmobile?: PlayMobileConfig;
  smsuz?: SmsUzConfig;
  octotelecom?: OctotelecomConfig;
}
```

### `SmsClient`

| Member                      | Returns                  | Notes                                                        |
| --------------------------- | ------------------------ | ------------------------------------------------------------ |
| `client.providerName`       | `ProviderName`           | The active provider.                                         |
| `client.send(params)`       | `Promise<SendSmsResult>` | Sends one SMS.                                               |
| `client.getBalance()`       | `Promise<number>`        | Balance in UZS. Throws `SmsConfigError` if unsupported.      |

#### `send(params)`

```ts
interface SendSmsParams {
  to: string;           // any common Uzbek format — normalized internally
  text: string;         // message body
  from?: string;        // overrides the provider's configured sender
  callbackUrl?: string; // delivery-report webhook (Eskiz only)
}

interface SendSmsResult {
  provider: "eskiz" | "playmobile" | "smsuz" | "octotelecom";
  messageId?: string;   // provider-side id, when available
  status: "sent" | "queued" | "failed";
  raw: unknown;         // untouched provider response
}
```

### `normalizePhone(input): string`

Normalizes an Uzbek number to `998XXXXXXXXX`. Throws `SmsError` on invalid input.

## Error handling

Every failure is a typed subclass of `SmsError`.

| Error              | Thrown when                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `SmsError`         | Base class. Also thrown directly for invalid phone numbers.      |
| `SmsConfigError`   | Missing credentials, unknown provider, unsupported operation.    |
| `SmsProviderError` | Provider rejected the request, timed out, or a network failure.  |

`SmsProviderError` carries debugging context:

```ts
import { SmsProviderError } from "uz-sms";

try {
  await sms.send({ to: "998901234567", text: "hi" });
} catch (err) {
  if (err instanceof SmsProviderError) {
    console.error(err.provider); // "eskiz"
    console.error(err.status);   // 422 (when from an HTTP response)
    console.error(err.raw);      // raw provider payload
  }
}
```

## Recipes

### Choose a provider from an environment variable

```ts
import { createSmsClient, type ProviderName } from "uz-sms";

const sms = createSmsClient({
  provider: process.env.SMS_PROVIDER as ProviderName,
  eskiz: { email: process.env.ESKIZ_EMAIL!, password: process.env.ESKIZ_PASSWORD! },
  playmobile: {
    login: process.env.PM_LOGIN!,
    password: process.env.PM_PASSWORD!,
    from: process.env.PM_FROM!,
  },
});
```

### Express OTP endpoint

```ts
import express from "express";
import { createSmsClient, SmsError } from "uz-sms";

const sms = createSmsClient({
  provider: "eskiz",
  eskiz: { email: process.env.ESKIZ_EMAIL!, password: process.env.ESKIZ_PASSWORD! },
});

app.post("/otp", async (req, res) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try {
    await sms.send({ to: req.body.phone, text: `Code: ${code}` });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof SmsError ? err.message : "SMS failed";
    res.status(502).json({ ok: false, error: message });
  }
});
```

## FAQ

**Does it send to one number at a time?**
Yes — `send()` sends a single message. Loop for bulk sends.

**Can I use one client for multiple providers?**
No. A client is bound to one provider; create one client per provider and pick at call time.

**Which Node versions are supported?**
Node 18, 20, and 22 are tested in CI. Node < 18 lacks the global `fetch`.

**Does it work in the browser / edge runtimes?**
The code only uses `fetch`, `URL`, and `Buffer` (Play Mobile auth). Node-like
runtimes with `Buffer` work; pure-browser use is not a supported target.

## Contributing

```bash
git clone https://github.com/golibnarzullayev/uz-sms.git
cd uz-sms
npm install

npm run typecheck   # tsc --noEmit
npm test            # build, then node --test
npm run build       # tsup → dist/ (ESM + CJS + d.ts)
```

Issues and PRs welcome at
[github.com/golibnarzullayev/uz-sms](https://github.com/golibnarzullayev/uz-sms).

## License

[MIT](./LICENSE) © golibnarzullayev

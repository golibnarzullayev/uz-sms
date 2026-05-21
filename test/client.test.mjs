import test from "node:test";
import assert from "node:assert/strict";
import { createSmsClient, SmsConfigError } from "../dist/index.js";

test("createSmsClient: missing provider config throws SmsConfigError", () => {
  assert.throws(() => createSmsClient({ provider: "eskiz" }), SmsConfigError);
});

test("createSmsClient: exposes providerName", () => {
  const client = createSmsClient({
    provider: "playmobile",
    playmobile: { login: "u", password: "p", from: "TEST" },
  });
  assert.equal(client.providerName, "playmobile");
});

test("getBalance: throws on providers without balance API", () => {
  const client = createSmsClient({
    provider: "smsuz",
    smsuz: { login: "u", password: "p" },
  });
  assert.throws(() => client.getBalance(), SmsConfigError);
});

test("createSmsClient: octotelecom provider", () => {
  const client = createSmsClient({
    provider: "octotelecom",
    octotelecom: { clientId: "c", username: "u", password: "p", from: "TEST" },
  });
  assert.equal(client.providerName, "octotelecom");
});

test("createSmsClient: octotelecom missing config throws", () => {
  assert.throws(
    () => createSmsClient({ provider: "octotelecom" }),
    SmsConfigError,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, SmsError } from "../dist/index.js";

test("normalizePhone: full 998 form", () => {
  assert.equal(normalizePhone("998901234567"), "998901234567");
});

test("normalizePhone: +998 with spaces", () => {
  assert.equal(normalizePhone("+998 90 123 45 67"), "998901234567");
});

test("normalizePhone: 9-digit national form", () => {
  assert.equal(normalizePhone("901234567"), "998901234567");
});

test("normalizePhone: dashes and parens", () => {
  assert.equal(normalizePhone("(90) 123-45-67"), "998901234567");
});

test("normalizePhone: rejects too-short input", () => {
  assert.throws(() => normalizePhone("12345"), SmsError);
});

test("normalizePhone: rejects 12 digits not starting with 998", () => {
  assert.throws(() => normalizePhone("123456789012"), SmsError);
});

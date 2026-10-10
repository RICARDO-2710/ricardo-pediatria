const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneForSms } = require('../lib/sms.js');

test('normalizePhoneForSms adds Brazil country code when missing', () => {
  assert.equal(normalizePhoneForSms('(11) 99999-8888'), '+5511999998888');
});

test('normalizePhoneForSms keeps a valid E.164 number', () => {
  assert.equal(normalizePhoneForSms('+5511987654321'), '+5511987654321');
});

test('normalizePhoneForSms rejects invalid values', () => {
  assert.equal(normalizePhoneForSms('abc'), null);
});

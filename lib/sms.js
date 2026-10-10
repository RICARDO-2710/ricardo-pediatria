function normalizePhoneForSms(value) {
  if (typeof value !== 'string') return null;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length === 10) return `+55${digits}`;
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return `+${digits}`;

  return null;
}

module.exports = {
  normalizePhoneForSms,
};

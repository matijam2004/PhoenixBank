export function cleanPhone(phone) {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

export function formatPhoneNumber(value) {
  const phone = value.replace(/\D/g, "");
  if (phone.length <= 3) return phone;
  if (phone.length <= 6) return `(${phone.slice(0, 3)}) ${phone.slice(3)}`;
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
}

export function validPhone(phone) {
  return phone.replace(/\D/g, "").length == 10;
}

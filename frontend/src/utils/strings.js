export function maskId(id, visible = 4) {
  if (!id) return "";

  id = id.toUpperCase();
  const len = id.length;
  if (len <= visible) return id;
  return "•".repeat(4) + id.slice(-visible);
}

export function capitalize(str) {
  if (!str) return "";

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseJwt(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function ensureUserIdFromToken(token) {
  const payload = parseJwt(token);
  const userId = payload?.sub;
  if (!userId) throw new Error("Missing user id; please sign in again.");
  return userId;
}
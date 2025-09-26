export function getUserInfo() {
  const stored = localStorage.getItem("user-info");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

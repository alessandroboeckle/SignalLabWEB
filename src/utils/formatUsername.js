// Display username = the local part of the email, before the "@" —
// e.g. "alessandro.boeckle@stadlerrail.com" -> "alessandro.boeckle".
// Used everywhere a person's name is shown in the UI instead of their
// full email address (header, admin list, presence, toasts).
export function usernameFromEmail(email) {
  if (!email) return "";
  const at = email.indexOf("@");
  return at === -1 ? email : email.slice(0, at);
}

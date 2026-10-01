/** A local invite works in another browser on this computer, not on the internet. */
export function isLocalInviteUrl(value: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

/** Use a configured public HTTPS origin in production; never create broken localhost invites. */
export function inviteOrigin(requestUrl: string, configuredUrl: string | undefined, production: boolean): string | null {
  if (production && !configuredUrl) return null;
  try {
    const url = new URL(configuredUrl || requestUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalInviteUrl(url.href))) return null;
    if (production && isLocalInviteUrl(url.href)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

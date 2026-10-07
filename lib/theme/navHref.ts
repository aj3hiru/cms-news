/** Link target for a menu item / header button: none when the URL is empty or "#" (a bare "#" only adds "#" to the address bar). */
export function navHref(url: string | null | undefined): string | undefined {
  const u = (url ?? "").trim();
  return u && u !== "#" ? u : undefined;
}

/**
 * Phones and tablets (and any device reporting 4 GB of memory or less) get a smaller memory
 * budget. Mobile browsers kill a tab that uses too much memory and then reload it from the
 * start, which looked like the app "going back to the welcome screen" after opening a planet.
 * iOS / iPadOS never report navigator.deviceMemory, so the device type is detected too.
 */
let cached: boolean | null = null;

export function isMemoryConstrained(): boolean {
  if (cached !== null) return cached;
  if (typeof navigator === 'undefined') return (cached = false);
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean };
  };
  const ua = nav.userAgent || '';
  cached =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    nav.userAgentData?.mobile === true ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    // iPadOS identifies itself as a Mac with a touch screen
    (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  return cached;
}

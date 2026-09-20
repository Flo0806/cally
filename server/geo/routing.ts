// OSRM demo server: free, no key, no live traffic. Good enough for "about 35 minutes".
const cache = new Map<string, number>();

export async function driveMinutes(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): Promise<number | null> {
  const key = `${from.lat},${from.lon}>${to.lat},${to.lon}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) return null;
  const data = (await response.json()) as { code: string; routes?: { duration: number }[] };
  const seconds = data.code === "Ok" ? data.routes?.[0]?.duration : undefined;
  if (seconds === undefined) return null;
  const minutes = Math.round(seconds / 60);
  cache.set(key, minutes);
  return minutes;
}

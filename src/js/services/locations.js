export async function findUSLocation(query) {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Location search returned ${response.status}.`);
  if (!data.results?.length) throw new Error(`Couldn't find “${query}” in the United States. Try a city and state, such as “Portland, Oregon”.`);
  const match = data.results[0];
  return { name: match.name, admin1: match.admin1, country: match.country, latitude: match.latitude, longitude: match.longitude, timezone: match.timezone, display: [match.name, match.admin1].filter(Boolean).join(', ') };
}

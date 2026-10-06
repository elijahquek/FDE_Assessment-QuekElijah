const cache = new Map();
const CACHE_MS = 60_000;

async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(12_000) });
  } catch (cause) {
    const provider = url.hostname;
    const message = cause.name === 'TimeoutError'
      ? `${provider} did not respond in time. Try again shortly.`
      : `Could not reach ${provider}. Check internet access and try again.`;
    throw Object.assign(new Error(message), { status: 502 });
  }
  if (!response.ok) {
    const error = new Error(`Data provider returned HTTP ${response.status}.`);
    error.status = response.status === 400 ? 400 : 502;
    throw error;
  }
  return response.json();
}

async function cached(url, options) {
  const key = url.toString();
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_MS) return entry.data;
  const data = await fetchJson(url, options);
  if (cache.size > 300) {
    for (const [cachedUrl, cachedValue] of cache) if (Date.now() - cachedValue.at > CACHE_MS) cache.delete(cachedUrl);
    if (cache.size > 300) cache.clear();
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

export async function getGeocoding(query) {
  if (!query?.trim() || query.length > 100) throw Object.assign(new Error('Enter a location under 100 characters.'), { status: 400 });
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: query.trim(), count: '5', language: 'en', format: 'json', countryCode: 'US' });
  return cached(url);
}

export async function getForecast(params) {
  const latitude = Number(params.get('latitude'));
  const longitude = Number(params.get('longitude'));
  const date = params.get('date');
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw Object.assign(new Error('Invalid forecast location or date.'), { status: 400 });
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude, longitude, hourly: 'temperature_2m,precipitation_probability,precipitation,rain,showers,snowfall,wind_speed_10m,wind_gusts_10m,visibility,weather_code', start_date: date, end_date: date, temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: params.get('timezone') || 'auto' });
  return cached(url);
}

export async function getAlerts(params) {
  const latitude = Number(params.get('latitude'));
  const longitude = Number(params.get('longitude'));
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw Object.assign(new Error('Invalid alert location.'), { status: 400 });
  const url = new URL('https://api.weather.gov/alerts/active');
  url.searchParams.set('point', `${latitude},${longitude}`);
  return cached(url, { headers: { Accept: 'application/geo+json', 'User-Agent': 'Routewatch/1.0 (travel disruption assessment prototype)' } });
}

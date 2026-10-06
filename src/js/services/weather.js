export async function fetchDailyWeather(location, date) {
  const query = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, date, timezone: location.timezone || 'auto' });
  const response = await fetch(`/api/forecast?${query}`, { signal: AbortSignal.timeout(17000) });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 400) throw new Error('Forecast is not available for this date. Open-Meteo provides a limited forecast window; try a date within the next 16 days.');
    throw new Error(data.error || `Weather forecast returned ${response.status}.`);
  }
  if (!data.hourly?.time?.length) throw new Error('No hourly forecast is available for this location and date.');
  return summarize(data);
}

function summarize(data) {
  const h = data.hourly;
  const max = (key) => Math.max(...(h[key] || []).filter(Number.isFinite));
  const min = (key) => Math.min(...(h[key] || []).filter(Number.isFinite));
  const codes = [...new Set(h.weather_code || [])];
  return {
    temperature: Math.round((min('temperature_2m') + max('temperature_2m')) / 2),
    low: Math.round(min('temperature_2m')), high: Math.round(max('temperature_2m')),
    precipitationProbability: Math.round(max('precipitation_probability')),
    precipitation: Number(max('precipitation').toFixed(2)), snowfall: Number(max('snowfall').toFixed(2)),
    wind: Math.round(max('wind_speed_10m')), gust: Math.round(max('wind_gusts_10m')),
    visibility: Math.round(min('visibility') / 1609.34), codes,
    summary: describeWeather(codes, max('precipitation_probability'), max('wind_gusts_10m'), max('snowfall')),
    sourceUpdated: data.hourly.time.at(-1), timezone: data.timezone
  };
}

function describeWeather(codes, rain, gust, snow) {
  const code = Math.max(...codes);
  if (code >= 95) return 'Thunderstorms possible';
  if (snow > 0.1 || (code >= 71 && code <= 77)) return 'Snow or wintry mix';
  if (code >= 65 || rain >= 70) return 'Periods of rain';
  if (code >= 51 || rain >= 40) return 'Chance of showers';
  if (gust >= 35) return 'Windy conditions';
  if (code === 0) return 'Mostly clear';
  if (code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Fog possible';
  return 'Variable conditions';
}

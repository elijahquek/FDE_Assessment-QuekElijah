export async function fetchPointAlerts(location) {
  const params = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude });
  const response = await fetch(`/api/alerts?${params}`, { signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `NWS alerts returned ${response.status}.`);
  return (data.features || []).map(({ properties: p }) => ({
    id: p.id, event: p.event || 'Weather alert', headline: p.headline || p.event || 'Weather alert',
    description: (p.description || p.instruction || '').replace(/\s+/g, ' ').trim().slice(0, 260), severity: severity(p.severity, p.urgency),
    source: 'National Weather Service', area: p.areaDesc || location.display,
    onset: p.onset || p.effective, expires: p.expires, url: p.id
  }));
}

function severity(level, urgency) {
  if (level === 'Extreme' || (level === 'Severe' && urgency === 'Immediate')) return 'high';
  if (['Severe', 'Moderate'].includes(level) || urgency === 'Expected') return 'moderate';
  return 'low';
}

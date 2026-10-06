const disruptionCodes = new Set([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

export function assessTrip(points, date) {
  const findings = [];
  for (const point of points) {
    for (const alert of point.alerts) {
      if (!overlapsLocalDay(alert, date, point.location.timezone)) continue;
      const expiry = alert.expires ? new Date(alert.expires).toLocaleString([], { timeZone: point.location.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }) : '';
      findings.push({ kind: 'alert', severity: alert.severity, title: alert.headline, detail: `${alert.event} · ${alert.area}${expiry ? ` · expires ${expiry}` : ''}${alert.description ? ` · ${alert.description}` : ''}`, source: 'NWS alert', location: point.location.display, url: alert.url, onset: alert.onset, id: alert.id });
    }
    if (point.weatherError || !point.weather) continue;
    const w = point.weather;
    const maxCode = Math.max(...w.codes);
    if (maxCode >= 95 || w.snowfall >= .1 || w.gust >= 45 || w.visibility <= 1) {
      findings.push({ kind: 'forecast', severity: 'high', title: `${w.summary} forecast near ${point.location.name}`, detail: `Daily high gusts ${w.gust} mph · precipitation chance ${w.precipitationProbability}%${w.visibility <= 1 ? ` · visibility down to ${w.visibility} mi` : ''}.`, source: 'Open-Meteo forecast', location: point.location.display });
    } else if (w.precipitationProbability >= 50 || w.gust >= 30 || w.visibility <= 3 || [...disruptionCodes].some((c) => w.codes.includes(c))) {
      findings.push({ kind: 'forecast', severity: 'moderate', title: `${w.summary} may affect travel near ${point.location.name}`, detail: `Daily high precipitation chance ${w.precipitationProbability}% · gusts up to ${w.gust} mph · ${w.low}–${w.high}°F.`, source: 'Open-Meteo forecast', location: point.location.display });
    }
  }
  const rank = { high: 3, moderate: 2, low: 1 };
  findings.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0));
  const top = findings.some((item) => item.severity === 'high') ? 'high'
    : findings.some((item) => item.severity === 'moderate') ? 'moderate' : 'clear';
  const alertsOk = points.every((p) => !p.alertError);
  const weatherOk = points.every((p) => !p.weatherError);
  return { findings, level: top, alertsOk, weatherOk };
}

function overlapsLocalDay(alert, date, timezone = 'UTC') {
  if (!alert.onset || !alert.expires) return false;
  const start = localMidnight(date, timezone);
  const nextDay = new Date(`${date}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const end = localMidnight(nextDay.toISOString().slice(0, 10), timezone);
  const onset = Date.parse(alert.onset);
  const expires = Date.parse(alert.expires);
  return Number.isFinite(onset) && Number.isFinite(expires) && onset < end && expires > start;
}

function localMidnight(date, timezone) {
  const [year, month, day] = date.split('-').map(Number);
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const adjustment = target - represented;
    instant += adjustment;
    if (adjustment === 0) break;
  }
  return instant;
}

export function adviceFor(level) {
  if (level === 'high') return { label: 'REVIEW', text: 'Review the active warning and contact the traveler. Confirm conditions with the carrier before departure.' };
  if (level === 'moderate') return { label: 'MONITOR', text: 'Monitor conditions and check with the carrier closer to departure. Consider a traveler heads-up.' };
  return { label: 'ROUTINE', text: 'No major weather signals found at the checked locations. Recheck closer to departure.' };
}

import { adviceFor } from './assessment.js';

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function setToday(date, minDate, maxDate) {
  $('#travel-date').value = date;
  $('#travel-date').min = minDate;
  $('#travel-date').max = maxDate;
  $('#today-label').textContent = new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function setBusy(busy) {
  const button = $('#trip-form button[type=submit]');
  button.disabled = busy;
  button.innerHTML = busy ? '<span>Checking sources…</span><span class="spinner"></span>' : '<span>Assess trip</span><span>→</span>';
}

export function showMessage(text, type = 'loading') {
  $('#message-area').innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
  $('#assessment-grid').hidden = true;
}

export function renderAssessment({ origin, destination, date, points, assessment, completedAt }) {
  $('#message-area').innerHTML = '';
  $('#assessment-grid').hidden = false;
  $('#result-title').innerHTML = `${escapeHtml(origin.name)} <span>→</span> ${escapeHtml(destination.name)}`;
  $('#result-subtitle').textContent = new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  $('#updated-label').textContent = `Updated ${completedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  renderRisk(assessment);
  $('#location-cards').innerHTML = points.map((point, index) => renderLocation(point, index === 0 ? 'ORIGIN' : 'DESTINATION')).join('');
  renderEvidence(assessment.findings, points);
}

function renderRisk(assessment) {
  const card = $('#risk-card');
  const level = !assessment.weatherOk && !assessment.alertsOk ? 'unknown' : assessment.level;
  card.dataset.level = level;
  const config = {
    high: ['Elevated risk', '⚠', 'A significant weather signal needs a closer look.'],
    moderate: ['Some disruption risk', '◉', 'Weather may affect parts of the travel day.'],
    clear: ['No major signals', '✓', 'No threshold-level weather signal found at the checked points.'],
    unknown: ['Assessment unavailable', '!', 'Sources could not provide enough information for a useful assessment.']
  }[level];
  $('#risk-icon').textContent = config[1];
  $('#risk-label').textContent = config[0];
  $('#risk-copy').textContent = config[2];
  const advice = level === 'unknown' ? { label: 'CHECK', text: 'Check official weather and carrier updates directly before making travel decisions.' } : adviceFor(level);
  $('#action-row').innerHTML = `<span class="action-tag">${advice.label}</span><span>${advice.text}</span>`;
  $('#coverage-count').textContent = `${Number(assessment.weatherOk) + Number(assessment.alertsOk)} of 2 sources complete`;
  if (level === 'moderate') card.dataset.level = 'moderate';
  if (level === 'high') card.dataset.level = 'high';
}

function renderLocation(point, label) {
  const w = point.weather;
  const failed = point.weatherError;
  return `<article class="location-card"><div class="loc-heading"><span class="loc-label">${label} CONDITIONS</span><span class="loc-pin">⌖</span></div><div class="loc-name">${escapeHtml(point.location.name)}</div><div class="loc-region">${escapeHtml([point.location.admin1, 'United States'].filter(Boolean).join(' · '))}</div>${failed ? `<div class="weather-unavailable">Forecast unavailable: ${escapeHtml(failed)}</div>` : `<div class="weather-row"><div class="weather-summary">${escapeHtml(w.summary)}<br>Daily range</div><div class="temperature">${w.temperature}°</div></div><div class="weather-stats"><div class="weather-stat">PRECIP. CHANCE<strong>${w.precipitationProbability}%</strong></div><div class="weather-stat">WIND GUSTS<strong>${w.gust} mph</strong></div><div class="weather-stat">LOW / HIGH<strong>${w.low}° / ${w.high}°</strong></div></div><div class="weather-note">Weather forecast · ${escapeHtml(point.location.timezone || 'local time')}</div>`}${point.alertError ? `<div class="weather-note">NWS alert coverage unavailable for this point.</div>` : ''}</article>`;
}

function renderEvidence(findings, points) {
  const list = $('#evidence-list');
  $('#evidence-count').textContent = `${findings.length} ${findings.length === 1 ? 'signal' : 'signals'}`;
  const unavailable = points.flatMap((p) => [p.weatherError && `Forecast for ${p.location.name}: ${p.weatherError}`, p.alertError && `NWS alerts for ${p.location.name}: ${p.alertError}`].filter(Boolean));
  const entries = findings.map((item) => `<article class="evidence-item" data-severity="${item.severity}"><div class="evidence-symbol">${item.severity === 'high' ? '!' : item.kind === 'alert' ? '⚑' : '◌'}</div><div><p class="evidence-title">${escapeHtml(item.title)}</p><div class="evidence-detail">${escapeHtml(item.detail)}<br>${escapeHtml(item.location)} · <strong>${escapeHtml(item.source)}</strong></div></div><div class="evidence-meta">${item.severity === 'high' ? 'HIGH' : item.severity === 'moderate' ? 'MODERATE' : 'ADVISORY'}</div></article>`).join('');
  const failures = unavailable.map((item) => `<div class="evidence-item"><div class="evidence-symbol">!</div><div><p class="evidence-title">${escapeHtml(item)}</p><div class="evidence-detail">This source did not return data. Treat this as unknown coverage, not a clear condition.</div></div><div class="evidence-meta">NO DATA</div></div>`).join('');
  list.innerHTML = entries + failures + (!findings.length && !unavailable.length ? '<div class="evidence-empty"><strong>No notable weather signals surfaced.</strong><br>Both public weather sources responded, and neither returned an active NWS point alert overlapping the selected day nor a forecast condition above this prototype’s screening thresholds. Future alerts may still be issued. This does not rule out airline, airport, airspace, road, or local travel disruption.</div>' : '');
}

export function readRoute() {
  return { origin: $('#origin').value.trim(), destination: $('#destination').value.trim(), date: $('#travel-date').value };
}

export function swapRoute() {
  const from = $('#origin');
  const to = $('#destination');
  [from.value, to.value] = [to.value, from.value];
}

export function onSubmit(handler) { $('#trip-form').addEventListener('submit', (event) => { event.preventDefault(); handler(); }); }
export function onSwap() { $('#swap-route').addEventListener('click', swapRoute); }

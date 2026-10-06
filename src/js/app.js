import { findUSLocation } from './services/locations.js';
import { fetchDailyWeather } from './services/weather.js';
import { fetchPointAlerts } from './services/alerts.js';
import { assessTrip } from './assessment.js';
import { setToday, setBusy, showMessage, renderAssessment, readRoute, onSubmit, onSwap } from './ui.js';

const day = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

setToday(day(1), day(0), day(15));
onSwap();
onSubmit(runAssessment);

async function runAssessment() {
  const route = readRoute();
  if (!route.origin || !route.destination || !route.date) return;
  if (route.origin.toLowerCase() === route.destination.toLowerCase()) {
    showMessage('Choose two different places to assess a route.', 'error');
    return;
  }
  setBusy(true);
  showMessage('Resolving places and checking public weather sources…');
  try {
    const [origin, destination] = await Promise.all([findUSLocation(route.origin), findUSLocation(route.destination)]);
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) throw new Error('Those place names resolve to the same location. Add a state name to distinguish them.');
    const locations = [origin, destination];
    const points = await Promise.all(locations.map(async (location) => {
      const [weather, alerts] = await Promise.allSettled([fetchDailyWeather(location, route.date), fetchPointAlerts(location)]);
      return {
        location,
        weather: weather.status === 'fulfilled' ? weather.value : null,
        weatherError: weather.status === 'rejected' ? messageOf(weather.reason) : null,
        alerts: alerts.status === 'fulfilled' ? alerts.value : [],
        alertError: alerts.status === 'rejected' ? messageOf(alerts.reason) : null
      };
    }));
    points.forEach((point) => {
      if (point.weatherError) point.weather = { summary: 'Forecast unavailable', temperature: '—', precipitationProbability: '—', gust: '—', low: '—', high: '—', snowfall: 0, visibility: 99, codes: [] };
    });
    const assessment = assessTrip(points, route.date);
    if (!assessment.weatherOk || !assessment.alertsOk) showMessage('Some public data could not be retrieved. Available signals are shown below; missing coverage is marked explicitly.', 'warning');
    renderAssessment({ origin, destination, date: route.date, points, assessment, completedAt: new Date() });
    if (!assessment.weatherOk || !assessment.alertsOk) document.querySelector('#message-area').innerHTML = '<div class="message warning">Partial source coverage. Review the marked gaps below before using this assessment.</div>';
  } catch (error) {
    showMessage(messageOf(error), 'error');
  } finally {
    setBusy(false);
  }
}

function messageOf(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'The request timed out. Try again in a moment.';
  return error?.message || 'The request failed. Try again.';
}

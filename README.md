# Routewatch

Routewatch is a small travel-disruption screening prototype for Operations teams. Enter two U.S. cities and a travel date to see public weather forecasts, active National Weather Service alerts near each endpoint, a simple risk summary, and a suggested next action.

## Run locally

Requirements: Node.js 18 or newer. The project has no package dependencies.

```bash
npm start
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The app defaults to tomorrow and supports dates through 15 days from today. Internet access is needed for place lookup, forecasts, and alerts.

## How it works

- `server.mjs` serves the static interface and exposes three narrow same-origin API routes.
- `server/sources.mjs` validates requests, calls the external providers, and caches successful responses in memory for one minute. It does not store trip history.
- `src/js/services/locations.js` resolves a place against Open-Meteo's U.S.-filtered geocoder. The first match is selected; add a state to disambiguate a city.
- `src/js/services/weather.js` requests hourly conditions for each city's center on the selected local date and summarizes temperature range, precipitation chance, wind gusts, visibility, and weather codes.
- `src/js/services/alerts.js` gets active NWS alerts covering each point.
- `src/js/assessment.js` ranks high, moderate, and lower weather signals and suggests review, monitor, or routine follow-up.
- `src/js/ui.js` renders the assessment, evidence, source gaps, and route-specific details.

## Public data sources

1. **Open-Meteo Geocoding API and Forecast API** — place resolution and hourly forecast variables. The free API is intended for non-commercial use and Open-Meteo asks users to attribute the data. See [geocoding documentation](https://open-meteo.com/en/docs/geocoding-api), [forecast documentation](https://open-meteo.com/en/docs), and [licensing and usage](https://open-meteo.com/en/pricing).
2. **National Weather Service API** — active weather alerts for a coordinate. The API is a U.S. public service for forecasts, alerts, and observations. See [API documentation](https://www.weather.gov/documentation/services-web-api) and [alerts documentation](https://www.weather.gov/documentation/services-web-alerts).

Provider access is free for this prototype; there are no paid plans, credentials, or API keys in the project. Provider availability and usage policies can change. The source names and outbound links appear in the interface.

## Assessment meaning

This is a screening aid, not a trip-specific prediction. Current thresholds are intentionally simple and visible in `src/js/assessment.js`: severe point alerts, thunderstorm codes, substantial snow, strong gusts, or very low visibility raise a high signal; lesser precipitation, wind, low visibility, or other precipitation codes raise a moderate signal. Only currently active NWS alerts whose stated window overlaps the selected local day are included; the NWS active-alert feed does not predict alerts that may be issued later. This does not estimate probabilities of delay or cancellation. An empty evidence list means the checked sources returned no overlapping active point alert and no forecast condition above these thresholds; it does not mean the journey is disruption-free.

## Scope and limitations

- City-center coordinates stand in for airports and the route corridor. The application does not know the itinerary, transport mode, airport pair, stops, departure time, or ground-transfer plans.
- Weather forecasts and NWS alerts are the only disruption signals. Airline status, FAA traffic initiatives, airport operations, road closures, security queues, and local events are not queried.
- Daily summaries take the most disruptive forecast values during the date, not just the travel hours. Weather time zones come from the geocoder.
- The weather forecast horizon is limited. If the selected date is not supported, the source error is shown; missing data is never described as a confirmed clear condition.
- A city's first geocoder result is used. If place matching matters, enter a more specific city and state.
- Public endpoints have no uptime commitment in this demo. A one-minute in-memory cache reduces repeated requests during a session.

## Product discovery notes

### User stories

- As a traveler, I want to enter my U.S. route and date so I can check for relevant disruption signals.
- As an Operations coordinator, I want the route outlook and evidence in one place so I can decide whether to notify or assist someone.
- As an Operations coordinator, I want an action suggestion connected to the signal so I can tell whether to monitor, review, or take routine follow-up.
- As a user, I want to know which sources responded and when the assessment was updated so I can judge its freshness and coverage.
- As a user, I want missing data shown as unknown coverage so that a failed source does not look like an all-clear.

### Pain points and risks

Staff need to reconcile multiple sources and interpret whether a warning applies to a particular segment and time. The prototype exposes the evidence and retrieval time, but location-based weather can be geographically coarse, daily aggregation can overstate conditions outside the traveler’s hours, and source outages can leave partial coverage. City names can also be ambiguous, and public weather feeds do not reveal airline-specific operational impacts.

### Follow-on edge cases

Ambiguous cities; same city or airport at both ends; locations with no geocoding result; past or unsupported forecast dates; midnight and time-zone boundaries; multi-stop or long-distance routes; endpoint outages or stale data; conflicting signals; a warning whose timing does not overlap travel; and a forecast that is clear while airport or carrier operations are not.

## Potential next steps

For operational use, require airport selection or a flight itinerary, assess relevant route segments and travel windows, integrate airport/FAA and carrier status, retain source timestamps, and validate thresholds with Operations users before treating recommendations as policy.

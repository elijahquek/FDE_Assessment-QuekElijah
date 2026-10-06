import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGeocoding, getForecast, getAlerts } from './server/sources.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'src');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    try {
      let data;
      if (url.pathname === '/api/geocode') data = await getGeocoding(url.searchParams.get('q'));
      else if (url.pathname === '/api/forecast') data = await getForecast(url.searchParams);
      else if (url.pathname === '/api/alerts') data = await getAlerts(url.searchParams);
      else return json(res, 404, { error: 'Unknown API endpoint.' });
      return json(res, 200, data);
    } catch (error) {
      return json(res, error.status || 502, { error: error.message || 'Upstream data source unavailable.' });
    }
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Invalid path');
  }
  const relative = pathname === '/' ? 'index.html' : normalize(pathname).replace(/^[/\\]+/, '');
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(relative)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
const port = Number(process.env.PORT || 4173);
server.listen(port, '127.0.0.1', () => console.log(`Routewatch ready at http://127.0.0.1:${port}`));

const http = require('http');
const fs = require('fs');
const path = require('path');

const host = '127.0.0.1';
const port = Number(process.env.PORT) || 3000;
const htmlPath = path.join(__dirname, 'index.html');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([^#=]+)=([\s\S]*)$/);

    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

loadEnv();

function searchOmdb(query, response) {
  const apiUrl = process.env.OMDB_API_URL || 'https://www.omdbapi.com/';
  const apiKey = process.env.OMDB_API_KEY;

  if (!apiKey) {
    response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Clé OMDb manquante dans le fichier .env' }));
    return;
  }

  if (!query) {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Veuillez saisir un titre de film' }));
    return;
  }

  const url = new URL(apiUrl);
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('t', query);

  const client = url.protocol === 'http:' ? require('http') : require('https');
  const request = client.get(url, (apiResponse) => {
    let body = '';

    apiResponse.on('data', (chunk) => {
      body += chunk;
    });

    apiResponse.on('end', () => {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(body);
    });
  });

  request.on('error', () => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Impossible de joindre OMDb' }));
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === '/api/search') {
    searchOmdb(requestUrl.searchParams.get('title'), response);
    return;
  }

  if (requestUrl.pathname !== '/' && requestUrl.pathname !== '/index.html') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Page introuvable');
    return;
  }

  fs.readFile(htmlPath, (error, html) => {
    if (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Erreur lors du chargement de la page');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  });
});

server.listen(port, host, () => {
  console.log(`Serveur disponible sur http://${host}:${port}`);
});

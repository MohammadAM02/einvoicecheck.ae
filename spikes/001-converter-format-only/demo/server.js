#!/usr/bin/env node
/**
 * Spike 001 demo server — zero dependencies, Node http only.
 *
 * Runs the REAL convert() pipeline from ../convert.js and serves the two demo
 * pages. Start:
 *   node demo/server.js            (http://localhost:7357)
 *
 * Routes:
 *   GET  /                  -> redirect to /format-only.html
 *   GET  /format-only.html  -> format repair demo
 *   GET  /full-converter.html -> full guardrailed pipeline demo
 *   GET  /demo.css|demo.js  -> shared demo assets
 *   GET  /samples/<file>    -> spike fixtures (basename only)
 *   POST /api/convert       -> body {"xml": "...", "mode": "format"|"full"}
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { convert } = require('../convert.js');

const ROOT = __dirname;
const SAMPLES = path.join(ROOT, '..', 'samples');
const PORT = Number(process.env.PORT || 7357);
const MAX_BODY = 256 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function send(res, code, body, type = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found: ' + filePath);
    send(res, 200, data, MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  });
}

function safePath(base, name) {
  const resolved = path.normalize(path.join(base, path.basename(name)));
  return resolved.startsWith(path.normalize(base)) ? resolved : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // --- POST /api/convert ---------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/api/convert') {
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return send(res, 413, JSON.stringify({ error: 'Payload exceeds 256 KB.' }));
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return send(res, 400, JSON.stringify({ error: 'Request body must be JSON: {"xml": "...", "mode": "format"|"full"}.' }));
      }
      if (typeof data.xml !== 'string' || data.xml.trim() === '') {
        return send(res, 400, JSON.stringify({ error: 'Field "xml" must be a non-empty string.' }));
      }
      const mode = data.mode === 'format' ? 'format' : 'full';
      try {
        const result = convert(data.xml, { mode });
        send(res, 200, JSON.stringify(result), 'application/json');
      } catch (e) {
        send(res, 500, JSON.stringify({ error: 'Converter crashed: ' + e.message }));
      }
    });
    return;
  }

  // --- static ----------------------------------------------------------------
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');

  if (url.pathname === '/') {
    res.writeHead(302, { Location: '/format-only.html' });
    return res.end();
  }
  if (url.pathname.startsWith('/samples/')) {
    const fp = safePath(SAMPLES, url.pathname.slice('/samples/'.length));
    return fp ? serveFile(res, fp) : send(res, 404, 'Not found');
  }
  const fp = safePath(ROOT, url.pathname.slice(1));
  return fp ? serveFile(res, fp) : send(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log(`spike-001 demo running at http://localhost:${PORT}`);
  console.log(`  format-only  -> http://localhost:${PORT}/format-only.html`);
  console.log(`  full-converter -> http://localhost:${PORT}/full-converter.html`);
});

#!/usr/bin/env node
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOST = process.env.SONOFF_WEB_HOST || '127.0.0.1';
const PORT = Number(process.env.SONOFF_WEB_PORT || 8787);
const WORKDIR = '/home/isouza/.openclaw/workspace';
const PUBLIC_DIR = path.join(WORKDIR, 'sonoff', 'web');
const SCRIPT = path.join(WORKDIR, 'sonoff', 'ewelink-cloud.sh');

const timerJobs = new Map();

function runScript(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [SCRIPT, ...args], {
      cwd: WORKDIR,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || stdout || `exit ${code}`));
      }
      resolve(stdout.trim());
    });
  });
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  res.end(body);
}

function serveStatic(url, res) {
  url = url === '/' ? '/index.html' : url;
  const safePath = path.normalize(url).replace(/^\/+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('forbidden'); return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('not found'); return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error('Payload muito grande'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function getDevices() {
  const out = await runScript(['list']);
  const parsed = JSON.parse(out);
  return parsed.devices || [];
}

async function getDeviceByIdOrName(idOrName) {
  const devices = await getDevices();
  const target = String(idOrName || '').trim().toLowerCase();
  return devices.find((d) => {
    const id = String(d.id || '').toLowerCase();
    const name = String(d.name || '').toLowerCase();
    return id === target || name === target;
  }) || null;
}

function extractPath(url, pattern) {
  const m = url.match(pattern);
  if (!m) return null;
  return decodeURIComponent(m[1]);
}

const server = http.createServer(async (req, res) => {
  try {
    const rawUrl = req.url || '/';
    const url = rawUrl.startsWith('/sonoff/') ? rawUrl.slice('/sonoff'.length) : (rawUrl === '/sonoff' ? '/' : rawUrl);

    if (req.method === 'GET' && url === '/api/devices') {
      const out = await runScript(['list']);
      const parsed = JSON.parse(out);
      return sendJson(res, 200, parsed);
    }

    if (req.method === 'GET' && /^\/api\/device\/[^/]+$/.test(url)) {
      const deviceId = extractPath(url, /^\/api\/device\/([^/]+)$/);
      const out = await runScript(['status', deviceId]);
      const parsed = JSON.parse(out);
      if (parsed?.error === 'device_not_found') {
        return sendJson(res, 404, { ok: false, error: 'Dispositivo não encontrado' });
      }
      return sendJson(res, 200, { ok: true, device: parsed });
    }

    if (req.method === 'POST' && url === '/api/set') {
      const bodyRaw = await readBody(req);
      try {
        const payload = JSON.parse(bodyRaw || '{}');
        const name = String(payload.name || '').trim();
        const state = String(payload.state || '').trim();
        if (!name || !['on', 'off'].includes(state)) {
          return sendJson(res, 400, { ok: false, error: 'Parâmetros inválidos' });
        }

        const out = await runScript(['set', name, state], { SONOFF_CONFIRM: 'YES' });
        const parsed = JSON.parse(out);
        return sendJson(res, 200, { ok: true, result: parsed });
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message });
      }
    }

    if (req.method === 'POST' && /^\/api\/device\/[^/]+\/toggle$/.test(url)) {
      try {
        const deviceId = extractPath(url, /^\/api\/device\/([^/]+)\/toggle$/);
        const found = await getDeviceByIdOrName(deviceId);
        if (!found) {
          return sendJson(res, 404, { ok: false, error: 'Dispositivo não encontrado' });
        }

        const current = found?.params?.switch;
        if (!['on', 'off'].includes(current)) {
          return sendJson(res, 409, { ok: false, error: 'Estado atual desconhecido; não foi possível alternar' });
        }

        const next = current === 'on' ? 'off' : 'on';
        const out = await runScript(['set', found.id, next], { SONOFF_CONFIRM: 'YES' });
        const parsed = JSON.parse(out);

        return sendJson(res, 200, {
          ok: true,
          id: found.id,
          name: found.name,
          from: current,
          to: next,
          result: parsed
        });
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message });
      }
    }

    if (req.method === 'POST' && /^\/api\/device\/[^/]+\/timer$/.test(url)) {
      try {
        const deviceId = extractPath(url, /^\/api\/device\/([^/]+)\/timer$/);
        const bodyRaw = await readBody(req);
        const payload = JSON.parse(bodyRaw || '{}');

        const state = String(payload.state || '').trim();
        const delaySec = Number(payload.delaySec);
        if (!['on', 'off'].includes(state) || !Number.isFinite(delaySec) || delaySec < 1 || delaySec > 86400) {
          return sendJson(res, 400, { ok: false, error: 'Use state=on|off e delaySec entre 1 e 86400' });
        }

        const found = await getDeviceByIdOrName(deviceId);
        if (!found) {
          return sendJson(res, 404, { ok: false, error: 'Dispositivo não encontrado' });
        }

        const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const executeAt = new Date(Date.now() + delaySec * 1000).toISOString();

        const timeout = setTimeout(async () => {
          try {
            await runScript(['set', found.id, state], { SONOFF_CONFIRM: 'YES' });
          } catch (_) {
            // Erros de execução ficam só em log interno.
          } finally {
            timerJobs.delete(jobId);
          }
        }, delaySec * 1000);

        timerJobs.set(jobId, {
          id: jobId,
          deviceId: found.id,
          deviceName: found.name,
          state,
          delaySec,
          executeAt,
          timeout
        });

        return sendJson(res, 202, {
          ok: true,
          jobId,
          deviceId: found.id,
          deviceName: found.name,
          state,
          delaySec,
          executeAt
        });
      } catch (e) {
        return sendJson(res, 500, { ok: false, error: e.message });
      }
    }

    if (url.startsWith('/api/')) {
      return sendJson(res, 404, { ok: false, error: 'API não encontrada' });
    }

    return serveStatic(url, res);
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Sonoff Web Panel: http://${HOST}:${PORT}`);
});

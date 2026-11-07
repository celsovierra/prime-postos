const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) {}

const router = require('express').Router();
const cache = new Map();
const hits = new Map();

router.get('/api/placa/:placa', async (req, res) => {
  const key = process.env.CDP_API_KEY;
  if (!key) return res.status(503).json({ error: 'Serviço de consulta por placa não configurado.' });
  const placa = String(req.params.placa).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) return res.status(400).json({ error: 'Placa inválida.' });
  const now = Date.now();
  const lista = (hits.get(req.ip) || []).filter(t => now - t < 60000);
  if (lista.length >= 10) return res.status(429).json({ error: 'Muitas consultas. Tente em 1 minuto.' });
  lista.push(now); hits.set(req.ip, lista);
  const c = cache.get(placa);
  if (c && now - c.t < 86400000) return res.status(c.status).json(c.body);
  const out = (status, body, guardar) => {
    if (guardar) cache.set(placa, { t: now, status, body });
    return res.status(status).json(body);
  };
  try {
    const r = await fetch('https://consultadeplaca.net/api/v1/lookups', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({ plate: placa }),
      signal: AbortSignal.timeout(30000)
    });
    const j = await r.json().catch(() => ({}));
    if (r.status !== 201) {
      console.error('placa erro', r.status, j.code, j.request_id);
      return out(502, { error: 'Consulta indisponível agora.' });
    }
    if (j.result !== 'found') return out(404, { error: 'Placa não encontrada.' }, true);
    const v = j.vehicle, f = v.fipe || {};
    return out(200, {
      placa: v.plate, marca: v.brand, modelo: v.model, versao: v.version,
      anoFab: v.manufacture_year, anoModelo: v.model_year, cor: v.color,
      combustivel: v.fuel, cidade: v.city, uf: v.state,
      fipeCodigo: f.code || null, fipeValor: f.amount || null,
      fipeVersoes: (f.versions || []).slice(0, 5)
    }, true);
  } catch (e) {
    console.error('placa erro', e.message);
    return out(502, { error: 'Consulta indisponível agora.' });
  }
});

module.exports = router;

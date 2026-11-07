const express = require('express');
const Database = require('better-sqlite3');
const db = new Database('data.db');
db.exec(`
CREATE TABLE IF NOT EXISTS cities(id INTEGER PRIMARY KEY, name TEXT UNIQUE, lat REAL, lng REAL);
CREATE TABLE IF NOT EXISTS stations(id INTEGER PRIMARY KEY, city_id INTEGER, name TEXT, brand TEXT, address TEXT, lat REAL, lng REAL, promo INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS prices(station_id INTEGER, fuel TEXT, price REAL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(station_id, fuel));
`);
if (!db.prepare('SELECT COUNT(*) c FROM cities').get().c) {
  const c = db.prepare('INSERT INTO cities(name,lat,lng) VALUES(?,?,?)').run('Teresina, PI', -5.0892, -42.8019).lastInsertRowid;
  const s = db.prepare('INSERT INTO stations(city_id,name,brand,address,lat,lng,promo) VALUES(?,?,?,?,?,?,?)');
  const p = db.prepare('INSERT INTO prices(station_id,fuel,price) VALUES(?,?,?)');
  [['Posto Centro','Rede A','Av. Frei Serafim',-5.085,-42.799,1,6.19,4.45],
   ['Posto Norte','Rede A','Av. Duque de Caxias',-5.039,-42.811,0,5.99,4.29]].forEach(x => {
    const id = s.run(c, x[0], x[1], x[2], x[3], x[4], x[5]).lastInsertRowid;
    p.run(id, 'gasolina', x[6]);
    p.run(id, 'etanol', x[7]);
  });
}
const app = express();
app.use(express.json());
app.get('/api/cities', (req, res) => {
  res.json(db.prepare('SELECT * FROM cities').all());
});
app.get('/api/stations', (req, res) => {
  const rows = db.prepare('SELECT s.*, c.name city FROM stations s JOIN cities c ON c.id=s.city_id WHERE c.name=?').all(req.query.city || '');
  const pr = db.prepare('SELECT fuel, price FROM prices WHERE station_id=?');
  res.json(rows.map(s => ({ ...s, prices: Object.fromEntries(pr.all(s.id).map(x => [x.fuel, x.price])) })));
});
app.use(express.static(__dirname));
app.listen(process.env.PORT || 8080, () => console.log('Rodando na porta 8080'));
const FIPE = 'https://fipe.parallelum.com.br/api/v2';
const fipeCache = new Map();
app.get(/^\/api\/fipe\/(.+)$/, async (req, res) => {
  const path = req.params[0];
  if (!/^[a-z0-9\/-]+$/i.test(path)) return res.status(400).json({ erro: 'caminho inválido' });
  const hit = fipeCache.get(path);
  if (hit && Date.now() - hit.t < 6 * 3600e3) return res.json(hit.d);
  try {
    const r = await fetch(FIPE + '/' + path);
    const d = await r.json();
    if (r.ok) fipeCache.set(path, { t: Date.now(), d });
    res.status(r.status).json(d);
  } catch (e) {
    res.status(502).json({ erro: 'FIPE indisponível' });
  }
});
app.get('/api/placa/:placa', async (req, res) => {
  const p = (req.params.placa || '').toUpperCase();
  if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)) return res.status(400).json({ erro: 'Placa inválida.' });
  const url = process.env.PLACA_API_URL, token = process.env.PLACA_API_TOKEN;
  if (!url || !token) return res.status(503).json({ erro: 'Serviço de consulta por placa não configurado.' });
  try {
    const r = await fetch(url.replace('{placa}', p), { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    if (!r.ok) return res.status(502).json({ erro: 'Consulta indisponível.' });
    const g = (...k) => { for (const x of k) if (d[x] != null && d[x] !== '') return d[x]; return ''; };
    res.json({
      marca: g('marca', 'MARCA'), modelo: g('modelo', 'MODELO'), versao: g('versao', 'VERSAO'),
      ano: g('ano', 'anoModelo', 'ANO'), cor: g('cor', 'COR'), combustivel: g('combustivel', 'COMBUSTIVEL'),
      chassi: g('chassi', 'CHASSI'), municipio: g('municipio', 'MUNICIPIO'), uf: g('uf', 'UF'),
      fipe: g('fipe', 'valorFipe', 'valor'), codigoFipe: g('codigoFipe', 'codigo_fipe'), referencia: g('referencia', 'mesReferencia')
    });
  } catch (e) {
    res.status(502).json({ erro: 'Consulta indisponível.' });
  }
});

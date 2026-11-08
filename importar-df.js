// Importa postos do DF (arquivo /tmp/df.json do OpenStreetMap). Sem preco, sem dono.
// Uso: node importar-df.js [caminho-do-json]
const fs = require('fs');
const D = require('better-sqlite3');
const arq = process.argv[2] || '/tmp/df.json';
const j = JSON.parse(fs.readFileSync(arq, 'utf8'));
const db = new D('data.db');
const CIDADE = 'Brasília, DF';
let c = db.prepare('SELECT id FROM cities WHERE name=?').get(CIDADE);
const cid = c ? c.id : db.prepare('INSERT INTO cities(name,lat,lng) VALUES(?,?,?)').run(CIDADE, -15.7939, -47.8828).lastInsertRowid;
const limpa = (t, n) => String(t || '').trim().slice(0, n);
const existe = db.prepare('SELECT 1 FROM stations WHERE city_id=? AND name=? AND ABS(lat-?)<0.0002 AND ABS(lng-?)<0.0002');
const ins = db.prepare('INSERT INTO stations(city_id,name,brand,address,lat,lng,promo) VALUES(?,?,?,?,?,?,0)');
let novos = 0, pulados = 0;
db.exec('BEGIN');
for (const e of j.elements) {
  const t = e.tags || {};
  const lat = e.lat != null ? e.lat : e.center && e.center.lat;
  const lng = e.lon != null ? e.lon : e.center && e.center.lon;
  if (lat == null || lng == null) continue;
  const brand = limpa(t.brand || t.operator, 40);
  const name = limpa(t.name, 80) || (brand ? 'Posto ' + brand : 'Posto sem nome');
  const end = limpa([t['addr:street'], t['addr:housenumber'], t['addr:suburb']].filter(Boolean).join(', '), 160);
  if (existe.get(cid, name, lat, lng)) { pulados++; continue; }
  ins.run(cid, name, brand, end, lat, lng);
  novos++;
}
db.exec('COMMIT');
console.log('IMPORTADOS:', novos, '| JA EXISTIAM:', pulados);

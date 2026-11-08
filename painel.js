module.exports = function (app, db, h) {
  const hoje = () => new Date().toISOString().slice(0, 10);
  const fuels = () => {
    const l = db.prepare('SELECT DISTINCT fuel FROM prices ORDER BY fuel').all().map(r => r.fuel);
    return l.length ? l : ['gasolina', 'etanol', 'diesel', 'gnv'];
  };
  const postos = (where, arg) => {
    const l = db.prepare('SELECT s.id, s.name, s.brand, s.address, s.promo, s.owner_id, c.name AS city FROM stations s LEFT JOIN cities c ON c.id = s.city_id ' + where + ' ORDER BY s.name').all(...arg);
    const p = db.prepare('SELECT fuel, price, updated_at FROM prices WHERE station_id=?');
    l.forEach(s => { s.prices = p.all(s.id); });
    return l;
  };
  const salvarPreco = (id, fuel, price) => {
    db.prepare("INSERT INTO prices(station_id,fuel,price,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(station_id,fuel) DO UPDATE SET price=excluded.price, updated_at=excluded.updated_at").run(id, fuel, price);
  };
  const lerPreco = (b) => {
    const p = parseFloat(String(b.price).replace(',', '.'));
    if (!(p >= 0.01 && p < 100)) return null;
    return Math.round(p * 100) / 100;
  };

  const requireOwner = (req, res, next) => {
    const u = h.getUser(req);
    if (!u) return res.status(401).json({ erro: 'Entre na sua conta.' });
    if (u.role !== 'owner') return res.status(403).json({ erro: 'Só dono de posto.' });
    const o = db.prepare('SELECT paid_until, active FROM owners WHERE user_id=?').get(u.id);
    if (!o || !o.active) return res.status(403).json({ erro: 'Acesso bloqueado. Fale com o administrador.' });
    if (!o.paid_until || o.paid_until < hoje()) return res.status(402).json({ erro: 'Acesso vencido. Renove com o administrador.' });
    req.dono = u;
    next();
  };

  app.get('/api/dono/postos', requireOwner, (req, res) => {
    res.json({ fuels: fuels(), postos: postos('WHERE s.owner_id = ?', [req.dono.id]) });
  });

  app.post('/api/dono/preco', requireOwner, (req, res) => {
    const b = req.body || {};
    const s = db.prepare('SELECT id FROM stations WHERE id=? AND owner_id=?').get(Number(b.station_id) || 0, req.dono.id);
    if (!s) return res.status(403).json({ erro: 'Este posto não é seu.' });
    const p = lerPreco(b);
    if (p === null) return res.status(400).json({ erro: 'Preço inválido.' });
    if (!fuels().includes(b.fuel)) return res.status(400).json({ erro: 'Combustível inválido.' });
    salvarPreco(s.id, b.fuel, p);
    res.json({ ok: true });
  });

  app.get('/api/admin/postos', h.requireAdmin, (req, res) => {
    res.json({ fuels: fuels(), postos: postos('', []) });
  });

  app.post('/api/admin/postos', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 80);
    const city = String(b.city || '').trim().slice(0, 80).replace(/, ([a-z]{2})$/, (m, u) => ', ' + u.toUpperCase());
    const lat = parseFloat(String(b.lat).replace(',', '.'));
    const lng = parseFloat(String(b.lng).replace(',', '.'));
    if (!name) return res.status(400).json({ erro: 'Informe o nome do posto.' });
    if (!/^.+, [A-Z]{2}$/.test(city)) return res.status(400).json({ erro: 'Cidade no formato: Teresina, PI' });
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return res.status(400).json({ erro: 'Latitude e longitude inválidas.' });
    db.prepare('INSERT OR IGNORE INTO cities(name,lat,lng) VALUES(?,?,?)').run(city, lat, lng);
    const c = db.prepare('SELECT id FROM cities WHERE name=?').get(city);
    const owner = b.owner_id ? Number(b.owner_id) : null;
    const id = db.prepare('INSERT INTO stations(city_id,name,brand,address,lat,lng,promo,owner_id) VALUES(?,?,?,?,?,?,0,?)')
      .run(c.id, name, String(b.brand || '').slice(0, 40), String(b.address || '').slice(0, 160), lat, lng, owner).lastInsertRowid;
    res.json({ id });
  });

  app.post('/api/admin/postos/:id', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const id = Number(req.params.id);
    if (!db.prepare('SELECT 1 FROM stations WHERE id=?').get(id)) return res.status(404).json({ erro: 'Posto não encontrado.' });
    if ('owner_id' in b) db.prepare('UPDATE stations SET owner_id=? WHERE id=?').run(b.owner_id ? Number(b.owner_id) : null, id);
    if ('promo' in b) db.prepare('UPDATE stations SET promo=? WHERE id=?').run(b.promo ? 1 : 0, id);
    res.json({ ok: true });
  });

  app.post('/api/admin/postos/:id/apagar', h.requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM prices WHERE station_id=?').run(id);
    db.prepare('DELETE FROM stations WHERE id=?').run(id);
    res.json({ ok: true });
  });

  app.post('/api/admin/preco', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const id = Number(b.station_id) || 0;
    if (!db.prepare('SELECT 1 FROM stations WHERE id=?').get(id)) return res.status(404).json({ erro: 'Posto não encontrado.' });
    const p = lerPreco(b);
    if (p === null) return res.status(400).json({ erro: 'Preço inválido.' });
    if (!fuels().includes(b.fuel)) return res.status(400).json({ erro: 'Combustível inválido.' });
    salvarPreco(id, b.fuel, p);
    res.json({ ok: true });
  });

  app.post('/api/admin/donos/:id', h.requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const o = db.prepare('SELECT * FROM owners WHERE user_id=?').get(id);
    if (!o) return res.status(404).json({ erro: 'Dono não encontrado.' });
    const b = req.body || {};
    if ('active' in b) db.prepare('UPDATE owners SET active=? WHERE user_id=?').run(b.active ? 1 : 0, id);
    const dias = parseInt(b.add_days, 10);
    if (dias > 0 && dias <= 3650) {
      const base = o.paid_until && o.paid_until > hoje() ? o.paid_until : hoje();
      const d = new Date(base + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + dias);
      db.prepare('UPDATE owners SET paid_until=? WHERE user_id=?').run(d.toISOString().slice(0, 10), id);
    }
    res.json({ ok: true });
  });
};

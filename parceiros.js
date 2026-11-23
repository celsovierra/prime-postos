// Seja um parceiro: formulario publico + lista no /admin.
module.exports = (app, db, h) => {
  db.exec(`CREATE TABLE IF NOT EXISTS parceiros(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT, telefone TEXT, email TEXT,
    status TEXT DEFAULT 'novo',
    criado_em TEXT DEFAULT (datetime('now')))`);
  for (const c of ["valor REAL DEFAULT 0","vencimento TEXT","pago TEXT DEFAULT 'nao'","tipo TEXT","estab TEXT"]) { try { db.exec('ALTER TABLE parceiros ADD COLUMN '+c); } catch (e) {} }
  for (const t of ['stations','servicos']) for (const c of ['foto TEXT','mapa TEXT']) { try { db.exec('ALTER TABLE '+t+' ADD COLUMN '+c); } catch (e) {} }
  const limpa = (t, n) => String(t == null ? '' : t).trim().slice(0, n);
  const tent = {};
  app.post('/api/parceiros', (req, res) => {
    const ip = req.headers['x-real-ip'] || req.ip || 'x';
    const agora = Date.now();
    const l = (tent[ip] || []).filter(t => agora - t < 3600000);
    if (l.length >= 5) return res.status(429).json({ erro: 'Muitas tentativas. Tente mais tarde.' });
    const b = req.body || {};
    const nome = limpa(b.nome, 80), telefone = limpa(b.telefone, 30), email = limpa(b.email, 120);
    const dig = telefone.replace(/\D/g, '');
    if (nome.length < 2) return res.status(400).json({ erro: 'Informe o nome.' });
    if (dig.length < 10 || dig.length > 13) return res.status(400).json({ erro: 'Telefone inválido.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
    l.push(agora); tent[ip] = l;
    db.prepare('INSERT INTO parceiros(nome,telefone,email) VALUES(?,?,?)').run(nome, telefone, email);
    res.json({ ok: true });
  });
  app.get('/api/admin/parceiros', h.requireAdmin, (req, res) => {
    res.json(db.prepare("SELECT p.*, CASE WHEN p.estab LIKE 'posto:%' THEN (SELECT name FROM stations WHERE id=CAST(substr(p.estab,7) AS INTEGER)) WHEN p.estab LIKE 'servico:%' THEN (SELECT nome FROM servicos WHERE id=CAST(substr(p.estab,9) AS INTEGER)) END AS estab_nome FROM parceiros p ORDER BY p.id DESC").all());
  });
  app.post('/api/admin/parceiros/:id', h.requireAdmin, (req, res) => {
    const st = (req.body || {}).status === 'contatado' ? 'contatado' : 'novo';
    res.json({ ok: db.prepare('UPDATE parceiros SET status=? WHERE id=?').run(st, req.params.id).changes });
  });
  app.post('/api/admin/parceiros/:id/dados', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const st = ['novo','contatado','autorizado'].includes(b.status) ? b.status : 'novo';
    const valor = Math.max(0, Number(b.valor) || 0);
    const venc = /^\d{4}-\d{2}-\d{2}$/.test(b.vencimento || '') ? b.vencimento : null;
    const pago = b.pago === 'sim' ? 'sim' : 'nao';
    const TIPOS=['posto','guincho','chaveiro','borracheiro','mecanico','farmacia','telefones'];
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : null;
    const estab = /^(posto|servico):\d+$/.test(b.estab||'') ? b.estab : null;
    res.json({ ok: db.prepare('UPDATE parceiros SET status=?,valor=?,vencimento=?,pago=?,tipo=?,estab=COALESCE(?,estab) WHERE id=?').run(st, valor, venc, pago, tipo, estab, req.params.id).changes });
  });
  app.get('/api/admin/estabelecimentos', h.requireAdmin, (req, res) => {
    const tipo = String(req.query.tipo || '');
    if (tipo === 'posto') return res.json(db.prepare("SELECT 'posto:'||s.id AS ref, s.name AS nome, s.address AS info FROM stations s ORDER BY s.name LIMIT 500").all());
    res.json(db.prepare("SELECT 'servico:'||id AS ref, nome, cidade AS info FROM servicos WHERE tipo=? ORDER BY nome LIMIT 500").all(tipo));
  });
  app.post('/api/admin/estabelecimentos', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const tipo = String(b.tipo || ''), nome = limpa(b.nome, 80), cidade = limpa(b.cidade, 80), tel = limpa(b.telefone, 30);
    const foto = /^uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(b.foto || '') ? b.foto : null;
    const mapa = /^https:\/\/[^\s]{4,400}$/.test(String(b.mapa || '').trim()) ? String(b.mapa).trim() : null;
    if (nome.length < 2) return res.status(400).json({ erro: 'Informe o nome.' });
    if (tipo === 'posto') {
      const cid = db.prepare('SELECT id FROM cities WHERE name=? OR name LIKE ? LIMIT 1').get(cidade, cidade + '%');
      const r = db.prepare('INSERT INTO stations(city_id,name,address,foto,mapa) VALUES(?,?,?,?,?)').run(cid ? cid.id : null, nome, tel, foto, mapa);
      return res.json({ ref: 'posto:' + r.lastInsertRowid });
    }
    const r = db.prepare('INSERT INTO servicos(cidade,tipo,nome,telefone,foto,mapa) VALUES(?,?,?,?,?,?)').run(cidade, tipo, nome, tel, foto, mapa);
    res.json({ ref: 'servico:' + r.lastInsertRowid });
  });
  app.post('/api/admin/parceiros/:id/link', h.requireAdmin, (req, res) => {
    const x = db.prepare('SELECT * FROM parceiros WHERE id=?').get(req.params.id);
    if (!x || !/^posto:\d+$/.test(x.estab || '')) return res.status(400).json({ erro: 'Associe um posto primeiro.' });
    const sid = Number(x.estab.slice(6));
    const token = require('crypto').randomBytes(24).toString('hex');
    const exp = new Date(Date.now() + 7 * 86400000).toISOString();
    const em = String(x.email || '').trim().toLowerCase();
    db.prepare('INSERT INTO invites(token,name,email,days,created_by,expires_at,station_id) VALUES(?,?,?,?,?,?,?)').run(token, x.nome, em, 365, ((req.user&&req.user.id)||null), exp, sid);
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    res.json({ link: proto + '://' + req.get('host') + '/editar?t=' + token, expira: exp });
  });
  app.post('/api/admin/parceiros/:id/apagar', h.requireAdmin, (req, res) => {
    res.json({ ok: db.prepare('DELETE FROM parceiros WHERE id=?').run(req.params.id).changes });
  });
};

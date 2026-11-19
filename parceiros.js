// Seja um parceiro: formulario publico + lista no /admin.
module.exports = (app, db, h) => {
  db.exec(`CREATE TABLE IF NOT EXISTS parceiros(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT, telefone TEXT, email TEXT,
    status TEXT DEFAULT 'novo',
    criado_em TEXT DEFAULT (datetime('now')))`);
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
    res.json(db.prepare('SELECT * FROM parceiros ORDER BY id DESC').all());
  });
  app.post('/api/admin/parceiros/:id', h.requireAdmin, (req, res) => {
    const st = (req.body || {}).status === 'contatado' ? 'contatado' : 'novo';
    res.json({ ok: db.prepare('UPDATE parceiros SET status=? WHERE id=?').run(st, req.params.id).changes });
  });
  app.post('/api/admin/parceiros/:id/apagar', h.requireAdmin, (req, res) => {
    res.json({ ok: db.prepare('DELETE FROM parceiros WHERE id=?').run(req.params.id).changes });
  });
};

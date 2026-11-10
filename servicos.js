// Guincho, chaveiro e telefones uteis por cidade. Cadastro pelo /admin.
module.exports = (app, db, h) => {
  db.exec(`CREATE TABLE IF NOT EXISTS servicos(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cidade TEXT, tipo TEXT, nome TEXT, telefone TEXT, ativo INTEGER DEFAULT 1)`);
  const limpa = (t, n) => String(t == null ? '' : t).trim().slice(0, n);
  const TIPOS = ['guincho', 'chaveiro', 'telefones', 'borracheiro', 'mecanico', 'farmacia'];
  const NACIONAIS = [
    { id: 0, nome: 'Polícia Militar', telefone: '190' },
    { id: 0, nome: 'SAMU', telefone: '192' },
    { id: 0, nome: 'Bombeiros', telefone: '193' },
    { id: 0, nome: 'Defesa Civil', telefone: '199' }
  ];
  app.get('/api/servicos', (req, res) => {
    const tipo = limpa(req.query.tipo, 20), cidade = limpa(req.query.city, 80);
    if (!TIPOS.includes(tipo)) return res.json([]);
    const l = db.prepare('SELECT id,nome,telefone FROM servicos WHERE ativo=1 AND tipo=? AND cidade=? COLLATE NOCASE ORDER BY nome').all(tipo, cidade);
    res.json(tipo === 'telefones' ? NACIONAIS.concat(l) : l);
  });
  app.get('/api/admin/servicos', h.requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM servicos ORDER BY cidade,tipo,nome').all());
  });
  app.post('/api/admin/servicos', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const cidade = limpa(b.cidade, 80), tipo = limpa(b.tipo, 20), nome = limpa(b.nome, 80), tel = limpa(b.telefone, 30);
    if (!cidade || !nome || !tel || !TIPOS.includes(tipo)) return res.status(400).json({ error: 'dados invalidos' });
    const r = db.prepare('INSERT INTO servicos(cidade,tipo,nome,telefone) VALUES(?,?,?,?)').run(cidade, tipo, nome, tel);
    res.json({ id: r.lastInsertRowid });
  });
  app.post('/api/admin/servicos/:id/apagar', h.requireAdmin, (req, res) => {
    res.json({ apagados: db.prepare('DELETE FROM servicos WHERE id=?').run(Number(req.params.id)).changes });
  });
};

// Anuncios (patrocinadores) editaveis pelo /admin. Fica no banco, imagens em uploads/.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
module.exports = (app, db, h) => {
  const express = require('express');
  const DIR = path.join(__dirname, 'uploads');
  fs.mkdirSync(DIR, { recursive: true });
  db.exec(`CREATE TABLE IF NOT EXISTS ads(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT, texto TEXT, whatsapp TEXT, site TEXT, img TEXT,
    ordem INTEGER DEFAULT 0, ativo INTEGER DEFAULT 1)`);
  app.use('/uploads', express.static(DIR, { maxAge: '7d' }));
  const limpa = (t, n) => String(t == null ? '' : t).trim().slice(0, n);
  const zap = t => String(t || '').replace(/\D/g, '').slice(0, 15);
  const url = t => { t = limpa(t, 300); return /^https?:\/\//i.test(t) ? t : ''; };

  // publico: so os ativos, na ordem
  app.get('/api/patrocinadores', (req, res) => {
    res.json(db.prepare('SELECT id,titulo,texto,whatsapp,site,img FROM ads WHERE ativo=1 ORDER BY ordem,id').all());
  });
  // admin: todos
  app.get('/api/admin/anuncios', h.requireAdmin, (req, res) => {
    res.json(db.prepare('SELECT * FROM ads ORDER BY ordem,id').all());
  });

  // upload: envia o arquivo puro (Content-Type image/jpeg, png ou webp), ate 5 MB
  const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  app.post('/api/admin/anuncios/imagem', h.requireAdmin,
    express.raw({ type: Object.keys(EXT), limit: '5mb' }), (req, res) => {
      const ext = EXT[(req.headers['content-type'] || '').split(';')[0]];
      if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ erro: 'Envie JPG, PNG ou WebP de ate 5 MB.' });
      const nome = crypto.randomBytes(12).toString('hex') + ext;
      fs.writeFileSync(path.join(DIR, nome), req.body);
      res.json({ img: 'uploads/' + nome });
    });

  const campos = b => [limpa(b.titulo, 80), limpa(b.texto, 200), zap(b.whatsapp), url(b.site),
    limpa(b.img, 300), parseInt(b.ordem) || 0, b.ativo === 0 || b.ativo === false ? 0 : 1];
  app.post('/api/admin/anuncios', h.requireAdmin, (req, res) => {
    const id = db.prepare('INSERT INTO ads(titulo,texto,whatsapp,site,img,ordem,ativo) VALUES(?,?,?,?,?,?,?)')
      .run(...campos(req.body || {})).lastInsertRowid;
    res.json({ ok: true, id });
  });
  app.post('/api/admin/anuncios/:id', h.requireAdmin, (req, res) => {
    const r = db.prepare('UPDATE ads SET titulo=?,texto=?,whatsapp=?,site=?,img=?,ordem=?,ativo=? WHERE id=?')
      .run(...campos(req.body || {}), req.params.id);
    res.json({ ok: r.changes > 0 });
  });
  app.post('/api/admin/anuncios/:id/apagar', h.requireAdmin, (req, res) => {
    const a = db.prepare('SELECT img FROM ads WHERE id=?').get(req.params.id);
    if (a && /^uploads\/[a-f0-9]+\.(jpg|png|webp)$/.test(a.img || '')) fs.rmSync(path.join(__dirname, a.img), { force: true });
    res.json({ ok: db.prepare('DELETE FROM ads WHERE id=?').run(req.params.id).changes > 0 });
  });
};

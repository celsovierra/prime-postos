const crypto = require('crypto');

module.exports = function (app, db, h) {
  db.exec(`
CREATE TABLE IF NOT EXISTS invites(token TEXT PRIMARY KEY, name TEXT, email TEXT, days INTEGER DEFAULT 30, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, expires_at TEXT, used_at TEXT, user_id INTEGER);
CREATE TABLE IF NOT EXISTS owners(user_id INTEGER PRIMARY KEY, paid_until TEXT, active INTEGER DEFAULT 1);
`);
  try { db.exec('ALTER TABLE stations ADD COLUMN owner_id INTEGER'); } catch (e) {}

  const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

  const achar = (t) => {
    const i = db.prepare('SELECT * FROM invites WHERE token=?').get(String(t));
    if (!i || i.used_at || i.expires_at < new Date().toISOString()) return null;
    return i;
  };

  app.post('/api/admin/invites', h.requireAdmin, (req, res) => {
    const b = req.body || {};
    const name = String(b.name || '').trim().slice(0, 80);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    const days = Math.min(Math.max(parseInt(b.days, 10) || 30, 1), 365);
    if (!name) return res.status(400).json({ erro: 'Informe o nome do dono ou do posto.' });
    const token = crypto.randomBytes(24).toString('hex');
    const exp = new Date(Date.now() + 7 * 86400000).toISOString();
    const admin = h.getUser(req);
    db.prepare('INSERT INTO invites(token,name,email,days,created_by,expires_at) VALUES(?,?,?,?,?,?)')
      .run(token, name, email, days, admin.id, exp);
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    res.json({ link: proto + '://' + req.get('host') + '/convite?t=' + token, expira: exp });
  });

  app.get('/api/convite/:token', (req, res) => {
    const i = achar(req.params.token);
    if (!i) return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
    res.json({ name: i.name, email: i.email || '' });
  });

  app.post('/api/convite/:token', h.limite, (req, res) => {
    const i = achar(req.params.token);
    if (!i) return res.status(404).json({ erro: 'Convite inválido ou expirado.' });
    const b = req.body || {};
    const email = String(i.email || b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' });
    if (password.length < 8) return res.status(400).json({ erro: 'A senha precisa ter 8 caracteres ou mais.' });
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) return res.status(409).json({ erro: 'Este e-mail já tem conta.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const id = db.prepare('INSERT INTO users(email,name,hash,salt,role) VALUES(?,?,?,?,?)')
      .run(email, i.name, h.hashPw(password, salt), salt, 'owner').lastInsertRowid;
    db.prepare('INSERT INTO owners(user_id,paid_until) VALUES(?,?)').run(id, dia(i.days));
    db.prepare("UPDATE invites SET used_at=datetime('now'), user_id=? WHERE token=?").run(id, i.token);
    h.startSession(res, id);
    res.json({ ok: true });
  });

  app.get('/api/admin/donos', h.requireAdmin, (req, res) => {
    res.json(db.prepare(`SELECT u.id, u.name, u.email, o.paid_until, o.active,
      (SELECT COUNT(*) FROM stations s WHERE s.owner_id = u.id) AS postos
      FROM owners o JOIN users u ON u.id = o.user_id ORDER BY u.name`).all());
  });
};

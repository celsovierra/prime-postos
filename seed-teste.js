// Contas de TESTE (usuario, adm, posto). Sempre criadas. Para desligar: SEED_TESTE=0.
const crypto = require('crypto');
module.exports = (db, hashPw) => {
  if (process.env.SEED_TESTE === '0') return;
  const contas = [
    ['usuario', 'Usuario Teste', 'usuario', 'user'],
    ['adm', 'Admin Teste', 'adm', 'admin'],
    ['posto', 'Dono Teste', 'posto', 'owner'],
  ];
  const ids = {};
  for (const [email, name, pw, role] of contas) {
    const salt = crypto.randomBytes(16).toString('hex');
    const h = hashPw(pw, salt);
    const u = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (u) {
      db.prepare('UPDATE users SET name=?,hash=?,salt=?,role=? WHERE id=?').run(name, h, salt, role, u.id);
      ids[role] = u.id;
    } else {
      ids[role] = db.prepare('INSERT INTO users(email,name,hash,salt,role) VALUES(?,?,?,?,?)').run(email, name, h, salt, role).lastInsertRowid;
    }
  }
  db.prepare("INSERT OR REPLACE INTO owners(user_id,paid_until,active) VALUES(?,?,1)").run(ids.owner, '2099-12-31');
  if (!db.prepare('SELECT 1 FROM stations WHERE owner_id=?').get(ids.owner)) {
    db.prepare('UPDATE stations SET owner_id=? WHERE id=(SELECT id FROM stations WHERE owner_id IS NULL ORDER BY id LIMIT 1)').run(ids.owner);
  }
  console.log('SEED_TESTE: contas usuario, adm e posto prontas');
};

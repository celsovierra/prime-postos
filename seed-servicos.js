// Contatos iniciais de Brasilia, DF. Rodar a mao: node seed-servicos.js (Codespaces e VPS). Nao duplica.
const D = require('better-sqlite3');
const db = new D('data.db');
db.exec(`CREATE TABLE IF NOT EXISTS servicos(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cidade TEXT, tipo TEXT, nome TEXT, telefone TEXT, ativo INTEGER DEFAULT 1)`);
const C = 'Brasília, DF';
const L = [
  ['guincho', 'Auto Socorro Beno 24h', '(61) 99603-7650'],
  ['guincho', 'AP Transportes Guincho 24h', '(61) 99158-4228'],
  ['guincho', 'Gama Guincho 24h', '(61) 99522-1209'],
  ['guincho', 'Guincho JLD Taguatinga 24h', '(61) 99366-6921'],
  ['chaveiro', 'Chaveiro 10 24h (Guará)', '(61) 99453-8754'],
  ['chaveiro', 'Chaveiro 24h Lago Norte', '(61) 97400-9986'],
  ['chaveiro', 'Chaveiro Asafe 24h (Asa Norte)', '(61) 4101-2420'],
  ['chaveiro', 'Chaveiro Águas Claras 24h', '(61) 99461-2480'],
  ['chaveiro', 'Chaveiro Gel 24h (Sobradinho)', '(61) 98467-8575']
];
const existe = db.prepare('SELECT id FROM servicos WHERE cidade=? AND tipo=? AND telefone=?');
const ins = db.prepare('INSERT INTO servicos(cidade,tipo,nome,telefone) VALUES(?,?,?,?)');
let n = 0;
for (const [t, nome, tel] of L) if (!existe.get(C, t, tel)) { ins.run(C, t, nome, tel); n++; }
console.log('inseridos: ' + n);

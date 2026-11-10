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
  ['chaveiro', 'Chaveiro Gel 24h (Sobradinho)', '(61) 98467-8575'],
  ['borracheiro', 'Borracharia Móvel 24h (Asa Sul)', '(61) 99888-0940'],
  ['borracheiro', 'Borracharia do Mineiro (Sobradinho II)', '(61) 3485-2358'],
  ['mecanico', 'Rodrigues Auto Center (Recanto das Emas)', '(61) 98604-6551'],
  ['mecanico', 'KM Auto Mecânica (Guará)', '(61) 3465-4785'],
  ['mecanico', 'MF Auto Center (Santa Maria)', '(61) 99214-2054'],
  ['mecanico', 'Matrix Auto Centro (Núcleo Bandeirante)', '(61) 99361-8800'],
  ['mecanico', 'DF Auto Center (Asa Norte)', '(61) 98562-8037'],
  ['mecanico', 'Mp Car Auto Center (Itapoã)', '(61) 99570-7971'],
  ['mecanico', 'GilCar Auto Center (Núcleo Bandeirante)', '(61) 3552-0909'],
  ['mecanico', 'W. Fontinele Auto Center (Brazlândia)', '(61) 99284-5743'],
  ['mecanico', 'KM Auto Center (Ceilândia)', '(61) 3397-5755'],
  ['farmacia', 'Droga Maia 24h (Taguatinga)', '(61) 3397-6369'],
  ['telefones', 'Detran-DF', '154'],
  ['telefones', 'Caesb (água e esgoto)', '115'],
  ['telefones', 'Hemocentro de Brasília', '160'],
  ['telefones', 'Hospital Regional de Taguatinga', '(61) 3353-1000'],
  ['telefones', 'Hospital Regional de Ceilândia', '(61) 3371-3444'],
  ['telefones', 'Hospital Regional do Guará', '(61) 3567-1300'],
  ['telefones', 'Hospital Regional da Asa Norte', '(61) 3325-4313'],
  ['telefones', 'Hospital Regional do Gama', '(61) 3385-9810'],
  ['telefones', 'Hospital Regional de Sobradinho', '(61) 3487-9328']
];
const existe = db.prepare('SELECT id FROM servicos WHERE cidade=? AND tipo=? AND telefone=?');
const ins = db.prepare('INSERT INTO servicos(cidade,tipo,nome,telefone) VALUES(?,?,?,?)');
let n = 0;
for (const [t, nome, tel] of L) if (!existe.get(C, t, tel)) { ins.run(C, t, nome, tel); n++; }
console.log('inseridos: ' + n);

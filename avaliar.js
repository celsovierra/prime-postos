// Estrela: acha o Place ID do posto no Google (uma vez), guarda e abre a janela de avaliar.
const fs = require('fs'), path = require('path');
function chave() {
  if (process.env.GOOGLE_PLACES_KEY) return process.env.GOOGLE_PLACES_KEY;
  try {
    const m = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').match(/^GOOGLE_PLACES_KEY=(.+)$/m);
    return m ? m[1].trim() : '';
  } catch (e) { return ''; }
}
module.exports = (app, db) => {
  const falhou = {};
  app.get('/api/avaliar/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const s = db.prepare('SELECT s.*, c.name city FROM stations s JOIN cities c ON c.id=s.city_id WHERE s.id=?').get(id);
    if (!s) return res.redirect(302, '/');
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' ' + (s.address && s.address.length > 3 ? s.address : '') + ' ' + s.city);
    if (s.place_id) return res.redirect(302, 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(s.place_id));
    const k = chave();
    if (!k || (falhou[id] && Date.now() - falhou[id] < 86400000)) return res.redirect(302, maps);
    try {
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': k, 'X-Goog-FieldMask': 'places.id' },
        body: JSON.stringify({
          textQuery: s.name + ' ' + (s.address && s.address.length > 3 ? s.address : '') + ' ' + s.city,
          maxResultCount: 1,
          locationBias: { circle: { center: { latitude: s.lat, longitude: s.lng }, radius: 300 } }
        })
      });
      const j = await r.json();
      const pid = j.places && j.places[0] && j.places[0].id;
      if (pid) {
        db.prepare('UPDATE stations SET place_id=? WHERE id=?').run(pid, id);
        return res.redirect(302, 'https://search.google.com/local/writereview?placeid=' + encodeURIComponent(pid));
      }
      falhou[id] = Date.now();
    } catch (e) { falhou[id] = Date.now(); }
    res.redirect(302, maps);
  });
};

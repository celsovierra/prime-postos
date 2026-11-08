#!/bin/bash
# Prime Postos - instala na VPS Ubuntu 24.04. Pode rodar de novo: pula o que ja existe.
# Uso: bash deploy-vps.sh postos.gpscell.site
set -e
DOMINIO="${1:-postos.gpscell.site}"
DIR=/root/prime-postos
export DEBIAN_FRONTEND=noninteractive

echo "[1/8] Pacotes base"
apt-get update -qq
apt-get install -y -qq curl git build-essential python3 ufw ca-certificates nginx certbot python3-certbot-nginx

echo "[2/8] Node 24"
if [ "$(node -v 2>/dev/null | cut -d. -f1)" != "v24" ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -qq nodejs
else
  echo "Node ja esta no v24, pulando"
fi

echo "[3/8] pm2"
command -v pm2 >/dev/null || npm install -g pm2

echo "[4/8] Projeto"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull
else
  git clone https://github.com/celsovierra/prime-postos "$DIR"
fi
cd "$DIR"
npm install --omit=dev
node -e "const D=require('better-sqlite3');new D(':memory:').prepare('select 1').get()" && echo "SQLite OK"

echo "[5/8] pm2 (inicia no boot)"
if pm2 describe prime-postos >/dev/null 2>&1; then
  pm2 restart prime-postos
else
  pm2 start server.js --name prime-postos
fi
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "[6/8] nginx"
if [ ! -f /etc/nginx/sites-available/prime-postos ]; then
cat > /etc/nginx/sites-available/prime-postos << NGX
server {
    listen 80;
    server_name $DOMINIO;
    client_max_body_size 5m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGX
else
  echo "Arquivo do nginx ja existe, mantendo (HTTPS preservado)"
fi

ln -sf /etc/nginx/sites-available/prime-postos /etc/nginx/sites-enabled/prime-postos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "[7/8] HTTPS (certbot)"
if [ -d "/etc/letsencrypt/live/$DOMINIO" ]; then
  echo "Certificado ja existe, pulando"
else
  getent hosts "$DOMINIO" >/dev/null || { echo "ERRO: o DNS de $DOMINIO ainda nao aponta para esta VPS. Crie o registro A e rode de novo."; exit 1; }
  certbot --nginx -d "$DOMINIO" --redirect --agree-tos --register-unsafely-without-email -n
fi

echo "[8/8] Firewall"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status | head -3

echo
curl -s -o /dev/null -w "Site: HTTPS %{http_code}\n" "https://$DOMINIO/"
echo "PRONTO. Falta so (manual):"
echo "1) Cadastrar sua conta em https://$DOMINIO"
echo "2) Promover a admin:"
echo "   cd $DIR && node -e \"const D=require('better-sqlite3');const d=new D('data.db');console.log(d.prepare(\\\"update users set role='admin' where email='EMAIL'\\\").run().changes)\""
echo "3) Opcional: copiar o data.db do Codespaces (scp) e agendar backup diario"

# Guia de Deployment

## 🚀 Overview

Este guia cobre o deployment do WhatsApp Bot em diferentes ambientes, desde desenvolvimento até produção.

## 📋 Pré-requisitos

### Sistema Operacional
- Linux (Ubuntu 20.04+ recomendado)
- macOS 10.15+
- Windows 10+ (com WSL2)

### Software Necessário
- Node.js 18+ 
- MongoDB 4.4+
- Nginx/Apache (produção)
- Docker & Docker Compose (opcional)

## 🛠️ Ambiente de Desenvolvimento

### Setup Local
```bash
# 1. Clone o repositório
git clone <repository-url>
cd botbaileys

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# 4. Inicie MongoDB
mongod --dbpath /data/db

# 5. Inicie em desenvolvimento
npm run dev
```

### Variáveis de Ambiente (.env)
```env
NODE_ENV=development
PORT=3002
JWT_SECRET=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot
GOOGLE_AI_API_KEY=sua_api_key_aqui
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3002

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/whatsapp-bot
      - JWT_SECRET=${JWT_SECRET}
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:4.4
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

### Comandos Docker
```bash
# Build e iniciar
docker-compose up -d --build

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down

# Backup MongoDB
docker-compose exec mongo mongodump --out /backup
```

## 🌐 Produção

### 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2
```

### 2. Configuração do Aplicativo

```bash
# Clonar repositório
cd /var/www
git clone <repository-url> botbaileys
cd botbaileys

# Instalar dependências
npm ci --production

# Build do TypeScript
npm run build

# Configurar variáveis de ambiente
sudo nano .env
```

### 3. Configuração Nginx

```nginx
# /etc/nginx/sites-available/botbaileys
server {
    listen 80;
    server_name seu-dominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3002;
        # ... outras configurações proxy
    }

    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3002;
        # ... outras configurações proxy
    }
}
```

### 4. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-bot',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 5. Iniciar Serviços

```bash
# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Iniciar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Iniciar aplicativo com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 SSL/TLS Configuration

### Let's Encrypt (Gratis)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com

# Auto-renovação
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Certificado Comercial
1. Adquirir certificado SSL
2. Configurar paths no Nginx
3. Testar configuração: `sudo nginx -t`
4. Recarregar: `sudo systemctl reload nginx`

## 📊 Monitoramento

### PM2 Monitoring
```bash
# Status dos processos
pm2 status

# Logs em tempo real
pm2 logs

# Monitoramento web
pm2 monit

# Restart
pm2 restart whatsapp-bot
```

### MongoDB Monitoring
```bash
# Status do MongoDB
sudo systemctl status mongod

# Logs
sudo tail -f /var/log/mongodb/mongod.log

# Conectar ao shell
mongo
```

### Logs do Aplicativo
```bash
# Logs PM2
pm2 logs whatsapp-bot

# Logs do sistema
sudo journalctl -u nginx -f
```

## 🔒 Backup e Recovery

### MongoDB Backup
```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR

mongodump --db whatsapp-bot --out $BACKUP_DIR/$DATE

# Comprimir
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/$DATE
rm -rf $BACKUP_DIR/$DATE

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

### Backup Automático (Crontab)
```bash
# Editar crontab
sudo crontab -e

# Backup diário às 2AM
0 2 * * * /path/to/backup-script.sh

# Backup semanal completo
0 3 * * 0 /path/to/full-backup-script.sh
```

## 🚨 Troubleshooting

### Problemas Comuns

#### Aplicativo não inicia
```bash
# Verificar logs
pm2 logs whatsapp-bot --err

# Verificar variáveis de ambiente
pm2 env whatsapp-bot

# Verificar portas
sudo netstat -tlnp | grep :3002
```

#### Conexão MongoDB falha
```bash
# Testar conexão
mongo mongodb://localhost:27017/whatsapp-bot

# Verificar status
sudo systemctl status mongod

# Verificar configuração
sudo nano /etc/mongod.conf
```

#### Nginx não funciona
```bash
# Testar configuração
sudo nginx -t

# Verificar logs
sudo journalctl -u nginx -f

# Recarregar configuração
sudo systemctl reload nginx
```

### Performance Issues

#### High Memory Usage
```bash
# Monitorar PM2
pm2 monit

# Ajustar instâncias
pm2 delete whatsapp-bot
pm2 start ecosystem.config.js

# Configurar limite de memória
pm2 start whatsapp-bot --max-memory-restart 1G
```

#### High CPU Usage
```bash
# Identificar processos
sudo top
sudo htop

# Profile Node.js
node --inspect dist/index.js
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Deploy
      run: |
        # Script de deploy aqui
        echo "Deploying to production..."
```

## 📱 Mobile Considerations

### PWA Configuration
```json
// public/manifest.json
{
  "name": "WhatsApp Bot",
  "short_name": "Bot",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0e1618",
  "theme_color": "#3cd1ad",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
```javascript
// public/sw.js
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/app.js'
      ]);
    })
  );
});
```

---

## 📞 Suporte

- **Documentação**: [Wiki](https://github.com/username/botbaileys/wiki)
- **Issues**: [GitHub Issues](https://github.com/username/botbaileys/issues)
- **Email**: suporte@usinadev.com.br

⚠️ **Importante**: Mantenha este guia atualizado com as últimas práticas de segurança e performance.

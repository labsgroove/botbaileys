# WhatsApp Bot com Sistema de Login

## 🚀 Novas Funcionalidades

### ✅ Sistema de Autenticação Completo
- **Login e Registro**: Interface moderna para criação de contas e autenticação
- **JWT Tokens**: Sistema seguro com access token e refresh token
- **MongoDB Integration**: Armazenamento persistente de usuários e credenciais
- **Middleware de Proteção**: Todas as rotas de API protegidas por autenticação

### ✅ Substituição de Identificador de Sessão
- **Antes**: Identificador de sessão manual (session-id)
- **Depois**: Sistema de login com credenciais de usuário
- **Sessão Automática**: Usa o username do usuário como ID de sessão WhatsApp

### ✅ Fluxo de QR Code Otimizado
- **Passo 1**: Login/Criação de conta
- **Passo 2**: QR Code para conexão WhatsApp
- **Passo 3**: Painel completo com funcionalidades

## 📋 Pré-requisitos

- Node.js 18+
- MongoDB 5.0+
- NPM ou Yarn

## 🛠️ Instalação

1. **Clonar o projeto**
```bash
git clone <repository-url>
cd botbaileys
```

2. **Instalar dependências**
```bash
npm install
```

3. **Configurar variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# Porta do servidor
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot

# JWT Secret (IMPORTANTE: mude em produção!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google AI Studio (opcional)
GOOGLE_AI_API_KEY=your-google-ai-api-key

# LM Studio (opcional)
LM_STUDIO_URL=http://127.0.0.1:1234/v1/chat/completions
MODEL=local-model
```

4. **Iniciar o MongoDB**
```bash
# Windows (se instalado localmente)
net start MongoDB

# Ou via Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Iniciar o servidor**
```bash
npm run dev
```

## 🌐 Acesso

- **Login/Register**: `http://localhost:3001/auth`
- **Painel Principal**: `http://localhost:3001/`

## 📱 Fluxo de Uso

1. **Acessar**: Abra `http://localhost:3001/auth`
2. **Criar Conta**: Preencha username, email e senha
3. **Login**: Use suas credenciais
4. **QR Code**: Escaneie com WhatsApp Web
5. **Pronto!**: Use todas as funcionalidades do bot

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar nova conta
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/refresh` - Renovar tokens
- `GET /api/auth/me` - Obter dados do usuário

### WhatsApp (Protegidas)
- `GET /sessions` - Listar sessões
- `POST /session/:id` - Iniciar sessão
- `GET /session/:id/status` - Status da sessão
- `GET /session/:id/chats` - Listar conversas

## 🏗️ Estrutura do Projeto

```
├── config/
│   ├── database.ts      # Configuração MongoDB
│   └── env.ts          # Variáveis de ambiente
├── middleware/
│   └── auth.middleware.ts  # Middleware JWT
├── models/
│   └── user.model.ts   # Modelo de usuário MongoDB
├── modules/
│   └── auth/
│       └── auth.service.ts  # Serviço de autenticação
├── routes/
│   ├── auth.routes.ts  # Rotas de autenticação
│   ├── session.routes.ts  # Rotas WhatsApp (protegidas)
│   └── chat.routes.ts  # Rotas de chat (protegidas)
├── public/
│   ├── auth.html       # Tela de login/registro
│   ├── auth.js         # JavaScript da autenticação
│   ├── index.html      # Painel principal
│   ├── app.js          # JavaScript principal
│   └── styles.css      # Estilos
└── .env.example        # Exemplo de configuração
```

## 🔒 Segurança

- **Senhas**: Hash com bcrypt (12 rounds)
- **Tokens**: JWT com expiração (15min access, 7d refresh)
- **Validação**: Sanitização de inputs e validação robusta
- **Middleware**: Proteção automática de rotas

## 🚀 Em Produção

1. **Mudar JWT Secret**: Use uma chave forte e aleatória
2. **HTTPS**: Configure SSL/TLS
3. **MongoDB Seguro**: Use autenticação do MongoDB
4. **Rate Limiting**: Implemente limitação de requisições
5. **Logs**: Configure logging adequado

## 🐛 Troubleshooting

### MongoDB não conecta
```bash
# Verifique se o MongoDB está rodando
mongosh --eval "db.adminCommand('listCollections')"
```

### Porta em uso
```bash
# Mude a PORT no .env
PORT=3002
```

### Token expirado
O sistema automaticamente renova o refresh token. Se falhar, faça login novamente.

## 📝 Próximos Passos

- [ ] Implementar recuperação de senha
- [ ] Adicionar autenticação de dois fatores
- [ ] Criar painel de administração
- [ ] Implementar rate limiting
- [ ] Adicionar logs de auditoria

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add new feature'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

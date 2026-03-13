# WhatsApp Bot - Usina Dev

Um bot WhatsApp completo com integração de IA, interface web moderna e suporte a todos os tipos de mensagens.

## 🚀 Funcionalidades

### ✅ WhatsApp Integration
- **Conexão QR Code**: Conecte facilmente com WhatsApp Web
- **Todos os tipos de mensagens**: Texto, imagem, vídeo, áudio, sticker, documento
- **Mensagens interativas**: Botões, listas, templates
- **Reações**: Suporte completo a reações com emoji
- **Status e Newsletters**: Tratamento dedicado para status

### ✅ Inteligência Artificial
- **Google AI Integration**: Suporte a modelos Gemini 2.5/3.x
- **Configuração Flexível**: Temperature, max tokens, system prompt
- **Grupos**: Responde a menções e comandos em grupos
- **Contexto Inteligente**: Mantém histórico de conversas

### ✅ Interface Web
- **Design Moderno**: Interface similar ao WhatsApp Web
- **Totalmente Responsiva**: Mobile, tablet e desktop
- **Tempo Real**: Atualizações instantâneas com Server-Sent Events
- **Indicadores de Presença**: Online, digitando, gravando

### ✅ Segurança
- **Autenticação JWT**: Login seguro com refresh tokens
- **Rate Limiting**: Proteção contra abuso
- **Helmet**: Headers de segurança
- **Validação**: Sanitização completa de inputs

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+
- MongoDB
- NPM ou Yarn

### Setup
```bash
# Clone o repositório
git clone <repository-url>
cd botbaileys

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie em desenvolvimento
npm run dev

# Ou build para produção
npm run build
npm start
```

### Variáveis de Ambiente
```env
# Porta do servidor
PORT=3002

# Google AI API Key (opcional)
GOOGLE_AI_API_KEY=sua_google_ai_api_key

# Chave secreta JWT (obrigatório em produção)
JWT_SECRET=sua_chave_secreta_jwt_aqui

# URI do MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp-bot
```

## 📱 Uso

### 1. Conectando ao WhatsApp
1. Acesse `http://localhost:3002`
2. Clique em "Iniciar Conexão"
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a conexão

### 2. Configurando IA
1. Clique no botão de configurações de IA
2. Configure sua Google AI API Key
3. Escolha o modelo desejado
4. Ajuste system prompt e parâmetros
5. Teste a conexão

### 3. Enviando Mensagens
- **Texto**: Digite e pressione Enter
- **Mídia**: Clique no clip para enviar arquivos
- **Emoji**: Use o seletor de emojis
- **Áudio**: Mantenha pressionado o botão de microfone
- **Interativas**: Use o menu de opções de negócio

## 🏗️ Arquitetura

### Backend (TypeScript)
- **Express**: Servidor web com middleware de segurança
- **Baileys**: Biblioteca oficial WhatsApp Web
- **MongoDB**: Persistência de dados
- **JWT**: Autenticação e autorização
- **Pino**: Logging estruturado

### Frontend (Vanilla JS)
- **ES6+**: JavaScript moderno sem frameworks
- **CSS3**: Animações e design responsivo
- **SSE**: Server-Sent Events para tempo real
- **Web APIs**: MediaRecorder, FileReader, etc.

### Estrutura de Pastas
```
├── config/          # Configurações de ambiente e banco
├── middleware/       # Middleware de autenticação e validação
├── models/          # Modelos MongoDB
├── modules/         # Lógica de negócio
│   ├── ai/         # Serviços de IA
│   ├── auth/       # Autenticação
│   ├── chat/       # Gestão de chats
│   └── whatsapp/   # Integração WhatsApp
├── routes/          # Endpoints da API
├── types/           # Tipos TypeScript
├── utils/           # Utilitários
└── public/          # Frontend estático
```

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Inicia em desenvolvimento com hot reload
npm run build        # Compila TypeScript
npm start           # Inicia servidor de produção
npm run lint        # Verifica tipos TypeScript
npm audit           # Verifica vulnerabilidades
npm audit:fix       # Corrige vulnerabilidades automaticamente
```

## 🚀 Deploy

### Docker
```bash
# Build da imagem
docker build -t whatsapp-bot .

# Execute o container
docker run -p 3002:3002 --env-file .env whatsapp-bot
```

### Produção
1. Configure todas as variáveis de ambiente
2. Build com `npm run build`
3. Inicie com `npm start`
4. Use proxy reverso (nginx/traefik) para HTTPS

## 🛡️ Segurança

### Implementado
- ✅ Rate limiting em todos os endpoints
- ✅ Helmet para headers de segurança
- ✅ Validação e sanitização de inputs
- ✅ JWT com refresh tokens
- ✅ Logs estruturados sem dados sensíveis
- ✅ CORS configurado

### Recomendações
- Use HTTPS em produção
- Configure firewall adequado
- Rode com usuário não-root
- Backup regular do MongoDB
- Monitore logs de erro

## 📊 Performance

### Otimizações
- **Throttling**: Renderização otimizada de UI
- **Debounce**: Buscas e atualizações
- **Lazy Loading**: Carregamento de mídia sob demanda
- **Memory Management**: Maps eficientes para estado
- **Connection Pooling**: MongoDB com pool de conexões

### Monitoramento
- Logs estruturados com Pino
- Métricas de performance
- Health checks automáticos
- Rate limiting ativo

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch para sua feature (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para o branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo LICENSE para detalhes.

## 👨‍💻 Autor

Desenvolvido por Rodrigo Marafon - [Usina Dev](https://usinadev.com.br)

## 🆘️ Suporte

- 📧 Email: contato@usinadev.com.br
- 🐛 Issues: [GitHub Issues](https://github.com/username/botbaileys/issues)
- 📖 Documentação: [Wiki](https://github.com/username/botbaileys/wiki)

---

⭐ Se este projeto foi útil, deixe uma estrela!

# Política de Segurança

## 🛡️ Visão Geral

Este documento descreve as medidas de segurança implementadas no WhatsApp Bot e as melhores práticas para deployment em produção.

## ✅ Segurança Implementada

### 🔐 Autenticação
- **JWT Tokens**: Access tokens de 15min + refresh tokens de 7 dias
- **Secret Management**: JWT_SECRET obrigatório em produção
- **Password Hashing**: bcrypt com salt de 12 rounds
- **Session Management**: Sessões únicas por usuário com cleanup automático

### 🚦 API Security
- **Helmet.js**: Headers de segurança HTTP
- **Rate Limiting**: 100 requisições por IP a cada 15 minutos
- **Input Validation**: Validação e sanitização de todos os inputs
- **CORS**: Configuração restrita de cross-origin
- **Body Parser**: Limites de tamanho (10mb) para prevenir DoS

### 📊 Logging & Monitoring
- **Structured Logging**: Pino com redação de dados sensíveis
- **Error Handling**: Tratamento seguro sem expor detalhes internos
- **Audit Trail**: Logs de ações críticas (login, logout, configurações)
- **Performance Monitoring**: Métricas de resposta e erros

### 🗄️ Data Protection
- **MongoDB Security**: Connection pooling e timeouts configurados
- **Environment Variables**: Segredos nunca expostos no código
- **Memory Management**: Cleanup automático de dados sensíveis
- **File Upload**: Validação de tipos e tamanhos de arquivo

## 🔧 Configuração de Produção

### Variáveis de Ambiente Obrigatórias
```env
# Segurança
NODE_ENV=production
JWT_SECRET=sua_chave_forte_e_unic_aqui
MONGODB_URI=mongodb://usuario:senha@host:porta/db?ssl=true

# API Keys (se aplicável)
GOOGLE_AI_API_KEY=sua_chave_api_aqui
```

### Headers de Segurança (Helmet.js)
```javascript
// Headers configurados automaticamente:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// Content-Security-Policy: default-src 'self'
```

### Rate Limiting
```javascript
// Configuração atual:
windowMs: 15 * 60 * 1000, // 15 minutos
max: 100, // máximo 100 requisições por IP
message: 'Too many requests from this IP'
```

## 🚨 Vulnerabilidades Mitigadas

### ❌ Prevenido
- **SQL Injection**: Usando MongoDB com Mongoose (parametrizado)
- **XSS**: Sanitização de inputs e CSP headers
- **CSRF**: Tokens JWT e validação de origem
- **DoS**: Rate limiting e limites de upload
- **Path Traversal**: Validação de paths de arquivo
- **Insecure Direct Object References**: Validação de IDs e permissões

### 🔍 Monitoramento Ativo
- Tentativas de login falhas
- Requisições suspeitas (rate limit exceeded)
- Erros de autenticação JWT
- Uploads de arquivo maliciosos
- Acesso não autorizado a endpoints

## 🛠️ Recomendações de Deployment

### 🌐 Infraestrutura
1. **HTTPS Obrigatório**: Certificado SSL/TLS válido
2. **Firewall**: Portas restritas (apenas 80/443)
3. **Reverse Proxy**: Nginx/Apache com headers de segurança
4. **CDN**: Para assets estáticos e mitigação de DDoS
5. **Backup**: Diário do MongoDB e configurações

### 🐳 Docker Security
```dockerfile
# Usar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Multi-stage build
FROM node:18-alpine AS builder
# ... build stages
FROM node:18-alpine AS runner
# Copiar apenas arquivos necessários
```

### 🔒 Environment Variables
```bash
# Nunca expor segredos no código
# Usar serviços de secrets (AWS Secrets Manager, etc.)
# Rotacionar chaves regularmente
# Princípio do menor privilégio
```

## 🚨 Incident Response

### 📋 Plano de Resposta
1. **Detecção**: Monitoramento 24/7
2. **Análise**: Investigar logs e métricas
3. **Contenção**: Isolar sistemas afetados
4. **Erradicação**: Aplicar patches/correções
5. **Recuperação**: Restaurar serviços
6. **Post-mortem**: Documentar lições aprendidas

### 📞 Contato de Segurança
- **Email**: security@usinadev.com.br
- **PGP**: [Chave Pública]
- **Bug Bounty**: Programa de recompensas

## 🧪 Testes de Segurança

### 📋 Checklist
- [ ] Varredura de vulnerabilidades (npm audit)
- [ ] Testes de penetração
- [ ] Análise estática de código
- [ ] Testes de carga e estresse
- [ ] Validação de headers de segurança
- [ ] Verificação de dependências

### 🛠️ Ferramentas Recomendadas
- **OWASP ZAP**: Varredura automática
- **Burp Suite**: Testes manuais
- **Snyk**: Análise de dependências
- **Semgrep**: Análise estática SAST

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Security](https://jwt.io/introduction/)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)

---

⚠️ **AVISO**: Esta política é atualizada regularmente. Mantenha-se informado sobre as últimas medidas de segurança.

# Fluxo de Conversação com IA

Este documento explica como funciona a integração automática da IA com as mensagens do WhatsApp Bot.

## 🔄 **Fluxo Completo**

### 1. **Configuração da IA**
- Configure a API Key do Google AI Studio no painel (⚙️)
- Teste a conexão para garantir que está funcionando
- Salve a configuração

### 2. **Ativação da IA**
- Clique no botão de lâmpada (💡) na sidebar
- O botão ficará verde quando a IA estiver ativa
- Mensagem: "🤖 IA habilitada com sucesso!"

### 3. **Processamento Automático**
Quando a IA está ativa, o fluxo é:

```
Usuário envia mensagem → WhatsApp → Bot → IA → Resposta → WhatsApp → Usuário
```

#### **Detalhes do Fluxo:**

1. **Recebimento** (`onIncomingMessage`):
   - Mensagem chega do WhatsApp
   - Sistema armazena no ChatStore
   - Verifica se IA está habilitada

2. **Processamento IA** (`AIConversationService`):
   - Adiciona mensagem ao histórico da conversa
   - Envia para Google AI Studio com contexto
   - Recebe resposta processada

3. **Resposta**:
   - Adiciona resposta ao histórico
   - Envia automaticamente de volta ao WhatsApp
   - Log: `🤖 AI responded to [contato]: [resposta]`

## 🎛️ **Controle da IA**

### **Botão Ligar/Desligar** (💡)
- **Cinza**: IA desativada (não responde)
- **Verde**: IA ativada (responde automaticamente)

### **API Endpoints**
- `GET /api/ai/status/:sessionId` - Verificar status
- `POST /api/ai/toggle/:sessionId` - Ligar/Desligar
- `POST /api/ai/enable/:sessionId` - Ligar
- `POST /api/ai/disable/:sessionId` - Desligar

## 🧠 **Contexto e Memória**

### **Histórico de Conversa**
- Cada contato tem sua própria conversa independente
- Mantém até 20 mensagens no contexto
- Inclui mensagens do usuário e respostas da IA

### **Prompt de Sistema**
```
Você é um atendente profissional.
Responda de forma objetiva.
Nunca invente informações.
```

### **Gerenciamento de Memória**
- Mensagens antigas são removidas automaticamente
- Sempre mantém o prompt de sistema
- Preserva as últimas 18 mensagens + prompt

## ⚙️ **Configurações da IA**

### **Modelos Disponíveis**
- `gemini-2.5-flash` (padrão) - Rápido e eficiente
- `gemini-2.5-pro` - Mais completo e preciso
- `gemini-3-pro-preview` - Mais recente (experimental)
- `gemini-3-flash-preview` - Preview rápido

### **Parâmetros**
- **Temperatura**: 0.7 (equilíbrio criatividade/precisão)
- **Tokens Máximos**: 2048 (respostas detalhadas)
- **Timeout**: 30 segundos

## 🚨 **Tratamento de Erros**

### **Falhas Comuns**
1. **API Key inválida**: Teste antes de salvar
2. **Sem internet**: Verifique conexão
3. **Cota excedida**: Limite do Google AI Studio
4. **Timeout**: Mensagem muito complexa

### **Comportamento em Erro**
- Log detalhado no console
- Mensagem de erro para o usuário:
  ```
  "Desculpe, tive um problema ao processar sua mensagem. Tente novamente."
  ```

## 📝 **Exemplos de Uso**

### **Conversa Simples**
```
Usuário: Olá, tudo bem?
IA: Olá! Tudo ótimo por aqui, obrigado por perguntar. Como posso ajudar você hoje?
```

### **Com Contexto**
```
Usuário: Qual é o seu nome?
IA: Sou um assistente de IA criado para ajudar com suas dúvidas.

Usuário: E você foi criado por quem?
IA: Fui desenvolvido pela equipe deste sistema de WhatsApp Bot.
```

## 🔒 **Segurança e Privacidade**

### **Dados das Conversas**
- Armazenados localmente na memória do servidor
- Não compartilhados com terceiros
- Resetados quando o servidor reinicia

### **API Key**
- Armazenada em arquivo JSON local
- Criptografada no trânsito (HTTPS)
- Não exibida na interface após salvar

## 🎯 **Dicas de Uso**

### **Para Melhores Respostas**
1. **Seja específico**: "Qual o preço do produto X?" vs "Preços"
2. **Contexto**: Forneça informações relevantes
3. **Uma pergunta por vez**: Evite múltiplas perguntas

### **Quando Desativar**
- Em conversas sensíveis/confidenciais
- Para testar manualmente o bot
- Durante manutenções

## 🚀 **Próximos Recursos**

- [ ] Respostas personalizadas por contato
- [ ] Integração com banco de dados
- [ ] Suporte a múltiplos idiomas
- [ ] Análise de sentimentos
- [ ] Respostas programadas

---

**Nota**: A IA só responde quando estiver explicitamente ativada pelo botão 💡. O usuário tem controle total sobre quando o bot deve ou não responder automaticamente.

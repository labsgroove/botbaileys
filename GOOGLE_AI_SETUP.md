# Configuração do Google AI Studio

Este documento explica como configurar a integração com Google AI Studio no WhatsApp Bot.

## 🚀 Configuração Rápida

### 1. Obter uma API Key

1. Acesse [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a API Key gerada

### 2. Configurar no Bot

1. Abra o painel do WhatsApp Bot
2. Clique no ícone de configuração de IA (⚙️) na sidebar
3. Selecione "Google AI Studio" como provedor
4. Cole sua API Key no campo correspondente
5. Clique em "Testar" para validar a conexão
6. Se成功, clique em "Salvar Configuração"

## ⚙️ Opções de Configuração

### API Key
- **Obrigatória**: Sua chave de API do Google AI Studio
- **Segurança**: A chave é armazenada criptografada em arquivo JSON local
- **Onde obter**: [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### Modelos Disponíveis
- **Gemini Pro**: Modelo principal para conversas
- **Gemini Pro Vision**: Modelo com suporte a imagens

### Parâmetros Avançados

#### Temperatura
- **Range**: 0.0 a 2.0
- **0.0**: Respostas mais conservadoras e focadas
- **1.0**: Equilíbrio entre criatividade e precisão (recomendado)
- **2.0**: Respostas mais criativas e diversificadas

#### Tokens Máximos
- **Range**: 1 a 8192
- **Recomendado**: 2048 para conversas normais
- **Máximo**: 8192 para respostas longas

## 🔧 Solução de Problemas

### "Falha na conexão com Google AI"

**Causas comuns:**
1. **API Key inválida**: Verifique se copiou corretamente
2. **API Key expirada**: Gere uma nova chave
3. **Sem cota**: Verifique seu limite de uso no Google AI Studio
4. **Problemas de rede**: Teste sua conexão com a internet

**Solução:**
1. Verifique a API Key em [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Use o botão "Testar" para validar antes de salvar
3. Se persistir, tente gerar uma nova API Key

### "Erro ao salvar configuração"

**Causas comuns:**
1. **Permissões**: Verifique se o bot tem permissão para escrever arquivos
2. **Disco cheio**: Verifique o espaço disponível
3. **Arquivo corrompido**: Delete o arquivo `./config/ai-config.json`

### Modelo não responde como esperado

**Soluções:**
1. **Ajuste a temperatura**: Diminua para respostas mais focadas
2. **Verifique o prompt**: Seja mais específico nas suas perguntas
3. **Troque o modelo**: Experimente Gemini Pro Vision para tarefas complexas

## 📁 Arquivos de Configuração

A configuração é salva em:
```
./config/ai-config.json
```

**Exemplo de configuração:**
```json
{
  "provider": "google-ai",
  "googleAI": {
    "apiKey": "sua-api-key-aqui",
    "model": "gemini-pro",
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

## 🔒 Segurança

- A API Key é armazenada localmente no formato JSON
- O arquivo não é compartilhado ou enviado para servidores externos
- Mantenha sua API Key em sigilo, não compartilhe em repositórios
- Em caso de vazamento, revogue a chave no Google AI Studio e gere uma nova

## 📊 Limites de Uso

O Google AI Studio tem limites gratuitos:
- **Tokens por minuto**: Varia conforme região
- **Requests por dia**: Limitado para uso gratuito
- **Tokens por mês**: Cota mensal específica

Verifique seus limites em [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🆘 Suporte

Se precisar de ajuda:
1. Verifique os logs do servidor para erros detalhados
2. Consulte a [documentação oficial do Google AI](https://ai.google.dev/docs)
3. Teste com uma API Key recém-gerada
4. Verifique se o modelo selecionado está disponível

---

**Nota**: Esta integração usa a API REST do Google AI Studio e requer conexão ativa com a internet para funcionar.

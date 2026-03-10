import { Router } from "express";
import { WhatsAppService } from "../modules/whatsapp/whatsapp.service";
import { ChatStore } from "../modules/chat/chat.store";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// LISTAR CHATS
router.get("/session/:id/chats", authenticateToken, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: "ID de sessão inválido" });
  }

  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  return res.json({ chats: ChatStore.listChats(id) });
});

// INFORMACOES DO CONTATO
router.get("/session/:id/contacts/:jid", authenticateToken, (req: AuthenticatedRequest, res) => {
  const { id, jid } = req.params;

  if (typeof id !== 'string' || typeof jid !== 'string') {
    return res.status(400).json({ error: "Parâmetros inválidos" });
  }

  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  const resolvedJid = ChatStore.resolveChatJid(id, jid) || jid;
  const chats = ChatStore.listChats(id);
  const contact = chats.find((c) => c.jid === resolvedJid);

  if (!contact) {
    return res.status(404).json({ error: "Contato nao encontrado" });
  }

  return res.json({
    jid: resolvedJid,
    name: contact.name,
    pushName: contact.name,
    lastSeen: contact.lastTimestamp,
  });
});

// EVENTOS DA SESSÃO
router.get("/session/:id/events", (req, res) => {
  const { id } = req.params;
  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  const limit = Number(req.query.limit || 80);

  return res.json({ events: ChatStore.listEvents(id, limit) });
});

// HISTÓRICO DE MENSAGENS DO CHAT
router.get("/session/:id/messages/:jid", (req, res) => {
  const { id, jid } = req.params;
  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  const resolvedJid = ChatStore.resolveChatJid(id, jid) || jid;
  const messages = ChatStore.getMessages(id, resolvedJid);

  ChatStore.markAsRead(id, resolvedJid);

  return res.json({
    jid: resolvedJid,
    messages,
  });
});

// BAIXAR MIDIA
router.get("/session/:id/media/:jid/:messageId", async (req, res) => {
  const { id, jid, messageId } = req.params;
  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  try {
    const media = await WhatsAppService.getMediaContent(id, jid, messageId);
    return res.json(media);
  } catch (error: any) {
    return res.status(404).json({
      error: error?.message || "Midia nao encontrada",
    });
  }
});

// ENVIAR MENSAGEM
router.post("/session/:id/messages", async (req, res) => {
  const { id } = req.params;
  const session = WhatsAppService.getSession(id);

  if (!session) {
    return res.status(404).json({ error: "Sessao nao encontrada" });
  }

  try {
    const response = await WhatsAppService.sendMessage(id, req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(400).json({
      error: error?.message || "Erro ao enviar mensagem",
    });
  }
});

// HISTÓRICO COM LIMITE
router.get("/session/:id/history/:jid", (req, res) => {
  const { id, jid } = req.params;
  const limit = Number(req.query.limit || 50);

  const sock = WhatsAppService.getSession(id);

  if (!sock) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  try {
    const messages = ChatStore.getMessages(id, jid);
    const result = messages.slice(-limit);

    res.json(result);
  } catch {
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

export default router;

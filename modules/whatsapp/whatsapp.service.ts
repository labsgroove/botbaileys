import {
  downloadMediaMessage,
  jidNormalizedUser,
  WASocket,
} from "@whiskeysockets/baileys";
import { existsSync, readdirSync } from "fs";
import path from "path";
import pino from "pino";
import { ChatStore } from "../chat/chat.store";
import { createSession } from "./session.manager";
import type {
  SessionConnectionStatus,
  SessionState,
  SendMessagePayload
} from "../../types/message.types";
import { normalizeJid } from "../../utils/message.utils";
import { MessageSender } from "../../utils/message.sender";
import { AIConversationService } from "../ai/ai.conversation.service";

const sessions: Map<string, WASocket> = new Map();
const reconnecting: Set<string> = new Set();
const rawMessages: Map<string, Map<string, any>> = new Map();
const sessionStates: Map<string, SessionState> = new Map();

function setState(sessionId: string, next: Partial<SessionState>) {
  const current = sessionStates.get(sessionId);
  sessionStates.set(sessionId, {
    status: current?.status || "idle",
    ...current,
    ...next,
    updatedAt: Date.now(),
  });
}

function parseDataUrl(dataUrl?: string): {
  buffer?: Buffer;
  mimetype?: string;
} {
  if (!dataUrl) {
    return {};
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return {};
  }

  return {
    mimetype: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function buildMediaSource(payload: SendMessagePayload): {
  source: Buffer | { url: string };
  mimetype?: string;
} {
  const parsedDataUrl = parseDataUrl(payload.mediaDataUrl);

  if (parsedDataUrl.buffer) {
    return {
      source: parsedDataUrl.buffer,
      mimetype: payload.mimetype || parsedDataUrl.mimetype,
    };
  }

  const mediaUrl = payload.mediaUrl?.trim();

  if (!mediaUrl) {
    throw new Error(
      "Midia nao informada. Envie mediaDataUrl (base64) ou mediaUrl",
    );
  }

  return {
    source: { url: mediaUrl },
    mimetype: payload.mimetype,
  };
}

function inferMediaType(
  payload: SendMessagePayload,
): "image" | "video" | "audio" | "document" | "sticker" {
  if (payload.type === "sticker") {
    return "sticker";
  }

  const mime = (payload.mimetype || "").toLowerCase();

  if (mime.includes("image")) return "image";
  if (mime.includes("video")) return "video";
  if (mime.includes("audio")) return "audio";
  if (mime.includes("webp")) return "sticker";

  if (payload.fileName?.toLowerCase().endsWith(".webp")) {
    return "sticker";
  }

  return "document";
}

function cacheRawMessage(
  sessionId: string,
  jid?: string,
  id?: string,
  raw?: any,
) {
  if (!jid || !id || !raw) {
    return;
  }

  if (!rawMessages.has(sessionId)) {
    rawMessages.set(sessionId, new Map());
  }

  const cache = rawMessages.get(sessionId);
  cache?.set(`${jid}::${id}`, raw);

  if (cache && cache.size > 2500) {
    const firstKey = cache.keys().next().value;
    if (firstKey) {
      cache.delete(firstKey);
    }
  }
}

function findRawMessage(sessionId: string, jid: string, messageId: string) {
  const cache = rawMessages.get(sessionId);

  if (!cache) {
    return undefined;
  }

  const direct = cache.get(`${jid}::${messageId}`);
  if (direct) {
    return direct;
  }

  for (const [key, value] of cache.entries()) {
    if (key.endsWith(`::${messageId}`)) {
      return value;
    }
  }

  return undefined;
}

export class WhatsAppService {
  static async initSession(sessionId: string, force = false) {
    if (!force && sessions.has(sessionId)) {
      return sessions.get(sessionId);
    }

    setState(sessionId, {
      status: "connecting",
      qr: undefined,
      lastStatusCode: undefined,
    });

    const sock = await createSession(sessionId, {
      onIncomingMessage: (message) => {
        cacheRawMessage(sessionId, message.jid, message.id, message.raw);

        if (message.fromMe) {
          ChatStore.addOutgoing(sessionId, {
            id: message.id,
            jid: message.jid,
            text: message.text,
            timestamp: message.timestamp,
            name: message.name,
            participant: message.participant,
            type: message.type,
            status: message.status,
            rawType: message.rawType,
            media: message.media,
            reaction: message.reaction,
            interactive: message.interactive,
            quoted: message.quoted,
            isEdited: message.isEdited,
            isDeleted: message.isDeleted,
          });
          return;
        }

        ChatStore.addIncoming(sessionId, {
          id: message.id,
          jid: message.jid,
          text: message.text,
          timestamp: message.timestamp,
          name: message.name,
          participant: message.participant,
          type: message.type,
          status: message.status,
          rawType: message.rawType,
          media: message.media,
          reaction: message.reaction,
          interactive: message.interactive,
          quoted: message.quoted,
          isEdited: message.isEdited,
          isDeleted: message.isDeleted,
        });

        // Processa mensagem com IA se estiver habilitado
        if (message.text && message.text.trim().length > 0) {
          AIConversationService.processIncomingMessage(sessionId, message.jid, message.text)
            .catch(error => console.error('Error in AI processing:', error));
        }
      },
      onHistoryMessage: (message) => {
        cacheRawMessage(sessionId, message.jid, message.id, message.raw);

        ChatStore.addHistory(sessionId, {
          id: message.id,
          jid: message.jid,
          text: message.text,
          fromMe: message.fromMe,
          timestamp: message.timestamp,
          name: message.name,
          participant: message.participant,
          type: message.type,
          status: message.status,
          rawType: message.rawType,
          media: message.media,
          reaction: message.reaction,
          interactive: message.interactive,
          quoted: message.quoted,
          isEdited: message.isEdited,
          isDeleted: message.isDeleted,
        });
      },
      onHistoryChat: (chat) => {
        ChatStore.upsertHistoryChat(sessionId, chat);
      },
      onContactUpdate: (contact) => {
        ChatStore.upsertContact(sessionId, contact);
      },
      onMessageUpdate: (update) => {
        ChatStore.updateMessage(sessionId, update);
      },
      onMessageDelete: ({ jid, messageId, timestamp }) => {
        ChatStore.markMessageDeleted(sessionId, jid, messageId, timestamp);
      },
      onReaction: ({ jid, messageId, emoji, actor, fromMe, timestamp }) => {
        ChatStore.applyReaction(sessionId, {
          jid,
          messageId,
          emoji,
          actor,
          fromMe,
          timestamp,
        });
      },
      onMessageReceipt: ({ jid, messageId, status, timestamp }) => {
        ChatStore.updateMessage(sessionId, {
          id: messageId,
          jid,
          status,
          timestamp,
        });
      },
      onPresenceUpdate: ({ jid, participant, lastKnownPresence }) => {
        ChatStore.addEvent(
          sessionId,
          "presence.update",
          `${participant} em ${jid}: ${lastKnownPresence || "desconhecido"}`,
        );
      },
      onEvent: ({ name, summary }) => {
        ChatStore.addEvent(sessionId, name, summary);
      },
      onConnectionUpdate: ({ connection, qr, statusCode, isLoggedOut }) => {
        if (qr) {
          setState(sessionId, { status: "qr", qr });
        }

        if (connection === "open") {
          setState(sessionId, { status: "connected", qr: undefined });
        }

        if (connection === "close") {
          sessions.delete(sessionId);

          if (isLoggedOut) {
            rawMessages.delete(sessionId);
            setState(sessionId, {
              status: "closed",
              qr: undefined,
              lastStatusCode: statusCode,
            });
            return;
          }

          setState(sessionId, {
            status: "connecting",
            qr: undefined,
            lastStatusCode: statusCode,
          });
          this.reconnectSession(sessionId);
        }
      },
    });

    sessions.set(sessionId, sock);
    return sock;
  }

  static getSession(sessionId: string) {
    return sessions.get(sessionId);
  }

  static async sendMessage(sessionId: string, payload: SendMessagePayload) {
    const sock = sessions.get(sessionId);

    if (!sock) {
      throw new Error("Sessao nao encontrada");
    }

    const normalizedJid = jidNormalizedUser(payload.jid);

    if (!normalizedJid) {
      throw new Error("jid invalido");
    }

    const sender = new MessageSender(sock, sessionId);
    return await sender.sendMessage({ ...payload, jid: normalizedJid });
  }

  static async getMediaContent(
    sessionId: string,
    jid: string,
    messageId: string,
  ) {
    const sock = sessions.get(sessionId);

    if (!sock) {
      throw new Error("Sessao nao encontrada");
    }

    const normalizedJid = jidNormalizedUser(jid);

    if (!normalizedJid) {
      throw new Error("jid invalido");
    }

    const rawMessage = findRawMessage(sessionId, normalizedJid, messageId);

    if (!rawMessage) {
      throw new Error("Mensagem de midia nao encontrada no cache");
    }

    const buffer = await downloadMediaMessage(rawMessage, "buffer", {}, {
      logger: pino({ level: "silent" }),
      reuploadRequest: sock.updateMediaMessage,
    } as any);

    const storedMessage = ChatStore.getMessage(
      sessionId,
      normalizedJid,
      messageId,
    );
    const mimeType =
      storedMessage?.media?.mimetype || "application/octet-stream";

    return {
      mimeType,
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    };
  }

  static async closeSession(sessionId: string) {
    const sock = sessions.get(sessionId);

    if (sock) {
      await sock.logout();
      sessions.delete(sessionId);
    }

    rawMessages.delete(sessionId);
    setState(sessionId, { status: "closed", qr: undefined });
  }

  static listSessions() {
    return Array.from(sessions.keys());
  }

  static listStoredSessions() {
    const authDir = path.resolve("auth");

    if (!existsSync(authDir)) {
      return [];
    }

    return readdirSync(authDir, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);
  }

  static getSessionState(sessionId: string): SessionState {
    const existing = sessionStates.get(sessionId);

    if (existing) {
      return existing;
    }

    const initialState: SessionState = {
      status: sessions.has(sessionId) ? "connected" : "idle",
      updatedAt: Date.now(),
    };

    sessionStates.set(sessionId, initialState);
    return initialState;
  }

  private static async reconnectSession(sessionId: string) {
    if (reconnecting.has(sessionId)) {
      return;
    }

    reconnecting.add(sessionId);
    try {
      await this.initSession(sessionId, true);
    } catch {
      setState(sessionId, { status: "connecting" });
    } finally {
      reconnecting.delete(sessionId);
    }
  }
}

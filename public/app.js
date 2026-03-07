const state = {
  sessionId: null,
  chats: [],
  activeJid: null,
  activeMessages: [],
  activeMessagesSignature: "",
  selectedMessageId: "",
  historyRefreshInterval: null,
  connectionInterval: null,
  mediaCache: new Map(),
  pendingMedia: new Set(),
};

const elements = {
  connectScreen: document.getElementById("connect-screen"),
  appShell: document.getElementById("app-shell"),
  sessionInput: document.getElementById("session-input"),
  connectBtn: document.getElementById("connect-btn"),
  connectionDot: document.getElementById("connection-dot"),
  connectionStatus: document.getElementById("connection-status"),
  qrWrapper: document.getElementById("qr-wrapper"),
  qrImage: document.getElementById("qr-image"),
  sessionLabel: document.getElementById("session-label"),
  connectionPill: document.getElementById("connection-pill"),
  chatSearchInput: document.getElementById("chat-search-input"),
  chatList: document.getElementById("chat-list"),
  chatHeaderTitle: document.getElementById("chat-header-title"),
  chatHeaderSubtitle: document.getElementById("chat-header-subtitle"),
  messageList: document.getElementById("message-list"),
  messageForm: document.getElementById("message-form"),
  jidInput: document.getElementById("jid-input"),
  messageType: document.getElementById("message-type"),
  messageInput: document.getElementById("message-input"),
  mediaUrlInput: document.getElementById("media-url-input"),
  mediaFileInput: document.getElementById("media-file-input"),
  mimeInput: document.getElementById("mime-input"),
  fileNameInput: document.getElementById("file-name-input"),
  reactionMessageId: document.getElementById("reaction-message-id"),
  reactionEmoji: document.getElementById("reaction-emoji"),
  interactiveJson: document.getElementById("interactive-json"),
  refreshChatsBtn: document.getElementById("refresh-chats-btn"),
};

const connectionLabels = {
  idle: "Aguardando",
  qr: "QR pronto",
  connecting: "Conectando",
  connected: "Conectado",
  closed: "Encerrada",
};

function formatTime(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastSeen(timestamp) {
  if (!timestamp) return "";

  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "visto agora";
  if (minutes < 60) return `visto há ${minutes}min`;
  if (hours < 24) return `visto há ${hours}h`;
  if (days < 7) return `visto há ${days}d`;

  return formatTime(timestamp);
}

function formatPhoneNumber(jid) {
  const phone = jid?.split("@")[0]?.split(":")[0]?.split("_")[0] || "";
  if (!phone || phone.length < 10) return phone;

  // Formata número brasileiro: +55 (11) 99999-9999
  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.slice(2, 4);
    const num = phone.slice(4);
    if (num.length === 9) {
      return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }

  return `+${phone}`;
}

function displayName(chat, usePhone = true) {
  // Prioriza nome salvo do chat
  const name = chat?.name?.trim();
  if (name && name.length > 0 && !name.match(/^\d+$/)) {
    return name;
  }

  // Fallback para o JID formatado
  if (usePhone && chat?.jid) {
    return formatPhoneNumber(chat.jid);
  }

  const jidUser = chat?.jid?.split("@")[0] || "";
  const normalizedUser = jidUser.split(":")[0]?.split("_")[0];
  return normalizedUser || "Sem nome";
}

function escapeHtml(value = "") {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value).replace(/[&<>"']/g, (char) => entities[char] || char);
}

function messagesSignature(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    return "0";
  }

  const lastMessage = messages[messages.length - 1];
  return `${messages.length}:${lastMessage?.id || ""}:${lastMessage?.timestamp || ""}:${lastMessage?.status || ""}`;
}

function normalizeConnectionStatus(status) {
  if (
    status === "qr" ||
    status === "connecting" ||
    status === "connected" ||
    status === "closed"
  ) {
    return status;
  }

  return "idle";
}

function setConnectionVisual(status) {
  const normalizedStatus = normalizeConnectionStatus(status);

  if (elements.connectionDot) {
    elements.connectionDot.className = `connection-dot connection-dot-${normalizedStatus}`;
  }

  if (elements.connectionPill) {
    elements.connectionPill.className = `connection-pill connection-pill-${normalizedStatus}`;
    elements.connectionPill.textContent = connectionLabels[normalizedStatus];
  }
}

function qrImageUrl(text) {
  return `https://quickchart.io/qr?size=280&margin=1&text=${encodeURIComponent(text)}`;
}

function showConnectedUI() {
  elements.connectScreen.classList.add("hidden");
  elements.appShell.classList.remove("hidden");
}

function showConnectUI() {
  elements.connectScreen.classList.remove("hidden");
  elements.appShell.classList.add("hidden");
}

function setConnectionStatus(text) {
  elements.connectionStatus.textContent = text;
}

function renderConnectionState(connectionState) {
  const status = normalizeConnectionStatus(connectionState?.status);
  setConnectionVisual(status);

  if (status === "qr" && connectionState.qr) {
    setConnectionStatus("Escaneie o QR code no WhatsApp do celular.");
    elements.qrImage.src = qrImageUrl(connectionState.qr);
    elements.qrWrapper.classList.remove("hidden");
    return;
  }

  elements.qrWrapper.classList.add("hidden");
  elements.qrImage.removeAttribute("src");

  if (status === "connecting") {
    setConnectionStatus("Conectando ao WhatsApp...");
    return;
  }

  if (status === "connected") {
    setConnectionStatus("Conectado com sucesso.");
    return;
  }

  if (status === "closed") {
    setConnectionStatus(
      "Sessao encerrada. Gere um novo QR code para reconectar.",
    );
    return;
  }

  setConnectionStatus("Aguardando conexao...");
}

function getVisibleChats() {
  const query = (elements.chatSearchInput?.value || "").trim().toLowerCase();

  if (!query) {
    return state.chats;
  }

  return state.chats.filter((chat) => {
    const chatName = displayName(chat).toLowerCase();
    const chatJid = (chat.jid || "").toLowerCase();
    return chatName.includes(query) || chatJid.includes(query);
  });
}

function renderChats() {
  const visibleChats = getVisibleChats();

  if (!state.chats.length) {
    elements.chatList.innerHTML =
      '<p class="empty-state">Sem conversas ainda.</p>';
    return;
  }

  if (!visibleChats.length) {
    elements.chatList.innerHTML =
      '<p class="empty-state">Nenhuma conversa encontrada para esse filtro.</p>';
    return;
  }

  elements.chatList.innerHTML = visibleChats
    .map((chat) => {
      const activeClass = chat.jid === state.activeJid ? "active" : "";
      const unread =
        chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : "";
      const chatTitle = escapeHtml(displayName(chat));
      const chatPreview = escapeHtml(
        chat.lastMessage || "Sem mensagens recentes",
      );
      const timeLabel = chat.lastTimestamp
        ? formatTime(chat.lastTimestamp)
        : "";
      return `
      <button class="chat-item ${activeClass}" data-jid="${encodeURIComponent(chat.jid)}">
        <div class="chat-header-row">
          <div class="chat-title">${chatTitle}</div>
          <span class="chat-time">${timeLabel}</span>
        </div>
        <div class="chat-subline">
          <span class="chat-preview">${chatPreview}</span>
          ${unread}
        </div>
      </button>
    `;
    })
    .join("");

  elements.chatList.querySelectorAll(".chat-item").forEach((node) => {
    node.addEventListener("click", () => {
      const jid = node.dataset.jid ? decodeURIComponent(node.dataset.jid) : "";
      selectChat(jid);
    });
  });
}

function mediaCacheKey(message) {
  return `${state.sessionId || ""}|${message?.jid || ""}|${message?.id || ""}`;
}

function isPreviewableMedia(message) {
  return (
    !!message?.media?.hasMedia &&
    ["image", "video", "audio", "sticker", "document"].includes(message?.type)
  );
}

async function ensureMediaLoaded(message) {
  if (!state.sessionId || !isPreviewableMedia(message)) {
    return null;
  }

  const cacheKey = mediaCacheKey(message);

  if (state.mediaCache.has(cacheKey)) {
    return state.mediaCache.get(cacheKey);
  }

  if (state.pendingMedia.has(cacheKey)) {
    return null;
  }

  state.pendingMedia.add(cacheKey);

  try {
    const data = await callApi(
      `/session/${encodeURIComponent(state.sessionId)}/media/${encodeURIComponent(message.jid)}/${encodeURIComponent(message.id)}`,
    );

    const payload = {
      mimeType: data?.mimeType,
      dataUrl: data?.dataUrl,
    };

    state.mediaCache.set(cacheKey, payload);
    return payload;
  } catch (error) {
    console.error(error);
    return null;
  } finally {
    state.pendingMedia.delete(cacheKey);
  }
}

async function hydrateMediaForActiveMessages() {
  const targets = state.activeMessages.filter(
    (message) =>
      isPreviewableMedia(message) &&
      !state.mediaCache.has(mediaCacheKey(message)),
  );

  if (!targets.length) {
    return;
  }

  const newestFirst = [...targets]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  await Promise.all(newestFirst.map((message) => ensureMediaLoaded(message)));
  renderMessages();
}

function messageStatusLabel(message) {
  if (!message?.fromMe) {
    return "";
  }

  const statusIcons = {
    played: "✓✓",
    read: "✓✓",
    delivery_ack: "✓✓",
    server_ack: "✓",
    pending: "…",
  };

  return statusIcons[message.status] || "";
}

function renderMessageBody(message) {
  const safeText = escapeHtml(message.text || "").replace(/\n/g, "<br />");
  const cache = state.mediaCache.get(mediaCacheKey(message));

  if (message.type === "image" || message.type === "sticker") {
    if (cache?.dataUrl) {
      return `
        <div class="media-wrap">
          <img class="message-media-img" src="${cache.dataUrl}" alt="midia" />
        </div>
        ${safeText ? `<div class="message-text">${safeText}</div>` : ""}
      `;
    }

    return `<button class="load-media-btn" data-message-id="${escapeHtml(message.id)}">Carregar midia</button>${
      safeText ? `<div class="message-text">${safeText}</div>` : ""
    }`;
  }

  if (message.type === "video") {
    if (cache?.dataUrl) {
      return `
        <div class="media-wrap">
          <video class="message-media-video" controls src="${cache.dataUrl}"></video>
        </div>
        ${safeText ? `<div class="message-text">${safeText}</div>` : ""}
      `;
    }

    return `<button class="load-media-btn" data-message-id="${escapeHtml(message.id)}">Carregar video</button>${
      safeText ? `<div class="message-text">${safeText}</div>` : ""
    }`;
  }

  if (message.type === "audio") {
    if (cache?.dataUrl) {
      return `
        <div class="media-wrap">
          <audio controls src="${cache.dataUrl}"></audio>
        </div>
      `;
    }

    return (
      '<button class="load-media-btn" data-message-id="' +
      escapeHtml(message.id) +
      '">Carregar audio</button>'
    );
  }

  if (message.type === "document") {
    if (cache?.dataUrl) {
      const fileName = escapeHtml(message.media?.fileName || "arquivo");
      return `<a class="doc-link" href="${cache.dataUrl}" download="${fileName}">Baixar ${fileName}</a>${
        safeText ? `<div class="message-text">${safeText}</div>` : ""
      }`;
    }

    return `<button class="load-media-btn" data-message-id="${escapeHtml(message.id)}">Carregar documento</button>${
      safeText ? `<div class="message-text">${safeText}</div>` : ""
    }`;
  }

  if (message.type === "interactive") {
    const interactive = message.interactive || {};
    const options = (interactive.options || [])
      .map(
        (option) =>
          `<li>${escapeHtml(option.title || option.id || "Opcao")}</li>`,
      )
      .join("");

    return `
      <div class="message-text">${safeText || "[Mensagem interativa]"}</div>
      ${options ? `<ul class="interactive-options">${options}</ul>` : ""}
    `;
  }

  if (message.type === "reaction") {
    return `<div class="message-text">${safeText || "[Reacao]"}</div>`;
  }

  if (message.isDeleted) {
    return '<div class="message-text">[Mensagem apagada]</div>';
  }

  return `<div class="message-text">${safeText || "(mensagem vazia)"}</div>`;
}

function renderMessages() {
  if (!state.activeJid) {
    elements.chatHeaderTitle.textContent = "Selecione uma conversa";
    elements.chatHeaderSubtitle.textContent =
      "Escolha um contato para abrir o historico.";
    elements.messageList.innerHTML =
      '<div class="message-empty">As mensagens aparecerao aqui.</div>';
    return;
  }

  const chat = state.chats.find((item) => item.jid === state.activeJid);
  const fallbackTitle =
    state.activeJid.split("@")[0]?.split(":")[0]?.split("_")[0] ||
    state.activeJid;
  const lastSeenText = chat?.lastTimestamp
    ? formatLastSeen(chat.lastTimestamp)
    : "";
  const contactName = chat ? displayName(chat) : fallbackTitle;

  elements.chatHeaderTitle.textContent = chat
    ? displayName(chat)
    : fallbackTitle;
  elements.chatHeaderSubtitle.textContent = lastSeenText || state.activeJid;
  elements.jidInput.value = state.activeJid;

  if (!state.activeMessages.length) {
    elements.messageList.innerHTML =
      '<div class="message-empty">Nenhuma mensagem neste chat ainda.</div>';
    return;
  }

  elements.messageList.innerHTML = state.activeMessages
    .map((message) => {
      const direction =
        message.direction === "outbound" ? "outbound" : "inbound";
      const editedTag = message.isEdited
        ? '<span class="message-flag">editada</span>'
        : "";
      const status = messageStatusLabel(message);
      const statusTag = status
        ? `<span class="message-status">${status}</span>`
        : "";
      const fromGroupParticipant =
        !message.fromMe &&
        message.participant &&
        message.participant !== message.jid
          ? `<div class="message-participant">${escapeHtml(message.name || message.participant)}</div>`
          : "";
      const senderName = !message.fromMe
        ? `<div class="message-sender">${escapeHtml(contactName)}</div>`
        : `<div class="message-sender message-sender-me">Você</div>`;
      const quoted = message.quoted?.text
        ? `<blockquote class="message-quote">${escapeHtml(message.quoted.text)}</blockquote>`
        : "";
      const reactions =
        Array.isArray(message.reactions) && message.reactions.length
          ? `<div class="message-reactions">${message.reactions
              .map(
                (reaction) =>
                  `<span>${escapeHtml(reaction.emoji || "")}</span>`,
              )
              .join("")}</div>`
          : "";

      return `
        <article class="message ${direction}" data-message-id="${escapeHtml(message.id)}">
          ${fromGroupParticipant}
          ${!message.fromMe || message.participant ? senderName : ""}
          ${quoted}
          ${renderMessageBody(message)}
          ${reactions}
          <div class="message-meta">
            ${editedTag}
            <span class="message-time">${formatTime(message.timestamp)}</span>
            ${statusTag}
          </div>
        </article>
      `;
    })
    .join("");

  elements.messageList.querySelectorAll(".load-media-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const messageId = button.dataset.messageId;
      const message = state.activeMessages.find(
        (item) => item.id === messageId,
      );

      if (!message) {
        return;
      }

      await ensureMediaLoaded(message);
      renderMessages();
    });
  });

  elements.messageList.querySelectorAll(".message").forEach((node) => {
    node.addEventListener("click", () => {
      const messageId = node.dataset.messageId || "";
      state.selectedMessageId = messageId;
      elements.reactionMessageId.value = messageId;
      elements.jidInput.value = state.activeJid || elements.jidInput.value;
    });
  });

  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function scrollToBottom(smooth = true) {
  elements.messageList.scrollTo({
    top: elements.messageList.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

async function callApi(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Falha na API");
  }

  return response.json();
}

async function loadChats() {
  if (!state.sessionId) return;

  const data = await callApi(
    `/session/${encodeURIComponent(state.sessionId)}/chats`,
  );
  state.chats = Array.isArray(data.chats) ? data.chats : [];
  let shouldRenderMessages = !state.activeJid;

  if (state.activeJid) {
    const hasActiveChat = state.chats.some(
      (chat) => chat.jid === state.activeJid,
    );
    if (!hasActiveChat) {
      state.activeJid = null;
      state.activeMessages = [];
      state.activeMessagesSignature = "0";
      shouldRenderMessages = true;
    }
  }

  renderChats();

  if (shouldRenderMessages) {
    renderMessages();
  }
}

async function selectChat(jid) {
  if (!state.sessionId || !jid) return;

  const data = await callApi(
    `/session/${encodeURIComponent(state.sessionId)}/messages/${encodeURIComponent(jid)}`,
  );
  const resolvedJid = data?.jid || jid;
  const nextMessages = Array.isArray(data.messages) ? data.messages : [];
  const nextSignature = messagesSignature(nextMessages);
  const isSameChat = state.activeJid === resolvedJid;
  const hasChanged =
    !isSameChat || state.activeMessagesSignature !== nextSignature;

  state.activeJid = resolvedJid;

  if (hasChanged) {
    state.activeMessages = nextMessages;
    state.activeMessagesSignature = nextSignature;
  }

  renderChats();

  if (hasChanged) {
    renderMessages();
    hydrateMediaForActiveMessages().catch((error) => console.error(error));
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function applyComposerType() {
  const type = elements.messageType.value;

  const showMedia = type === "media" || type === "sticker";
  const showReaction = type === "reaction";
  const showInteractive = type === "interactive";

  elements.mediaUrlInput.classList.toggle("hidden", !showMedia);
  elements.mediaFileInput.classList.toggle("hidden", !showMedia);
  elements.mimeInput.classList.toggle("hidden", !showMedia);
  elements.fileNameInput.classList.toggle("hidden", !showMedia);

  elements.reactionMessageId.classList.toggle("hidden", !showReaction);
  elements.reactionEmoji.classList.toggle("hidden", !showReaction);

  elements.interactiveJson.classList.toggle("hidden", !showInteractive);

  if (type === "text") {
    elements.messageInput.placeholder = "Digite uma mensagem";
  } else if (type === "media") {
    elements.messageInput.placeholder = "Legenda opcional da midia";
    elements.mediaFileInput.accept = "*/*";
  } else if (type === "sticker") {
    elements.messageInput.placeholder = "Legenda opcional";
    elements.mediaFileInput.accept = "image/webp,image/*";
  } else if (type === "reaction") {
    elements.messageInput.placeholder = "Nao usado para reaction";
  } else {
    elements.messageInput.placeholder =
      "Texto principal da mensagem interativa";
  }
}

async function sendMessage(event) {
  event.preventDefault();

  if (!state.sessionId) {
    alert("Conecte uma sessao primeiro");
    return;
  }

  const jid = elements.jidInput.value.trim();
  const type = elements.messageType.value;
  const text = elements.messageInput.value.trim();

  if (!jid) {
    alert("JID obrigatorio");
    return;
  }

  const payload = {
    jid,
    type,
  };

  if (type === "text") {
    if (!text) {
      return;
    }

    payload.text = text;
  }

  if (type === "media" || type === "sticker") {
    payload.text = text;

    const file = elements.mediaFileInput.files?.[0];
    const mediaUrl = elements.mediaUrlInput.value.trim();
    const mimeFromInput = elements.mimeInput.value.trim();
    const fileNameFromInput = elements.fileNameInput.value.trim();

    if (!file && !mediaUrl) {
      alert("Selecione um arquivo ou informe uma URL de midia");
      return;
    }

    if (mediaUrl) {
      payload.mediaUrl = mediaUrl;
    }

    if (file) {
      payload.mediaDataUrl = await fileToDataUrl(file);
      payload.fileName = fileNameFromInput || file.name;
      payload.mimetype = mimeFromInput || file.type || undefined;
    } else {
      payload.fileName = fileNameFromInput || undefined;
      payload.mimetype = mimeFromInput || undefined;
    }
  }

  if (type === "reaction") {
    const messageId =
      elements.reactionMessageId.value.trim() || state.selectedMessageId;
    const emoji = elements.reactionEmoji.value.trim();

    if (!messageId) {
      alert("Selecione uma mensagem no chat para reagir");
      return;
    }

    payload.reaction = {
      messageId,
      emoji,
    };
  }

  if (type === "interactive") {
    payload.text = text;

    const raw = elements.interactiveJson.value.trim();
    let interactivePayload = {};

    if (raw) {
      try {
        interactivePayload = JSON.parse(raw);
      } catch {
        alert("JSON interativo invalido");
        return;
      }
    }

    payload.interactive = interactivePayload;
  }

  await callApi(`/session/${encodeURIComponent(state.sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  elements.messageInput.value = "";
  if (type === "media" || type === "sticker") {
    elements.mediaUrlInput.value = "";
    elements.mediaFileInput.value = "";
  }

  await loadChats();
  await selectChat(jid);
}

async function getConnectionState(sessionId) {
  const data = await callApi(
    `/session/${encodeURIComponent(sessionId)}/status`,
  );
  return data.state;
}

function startHistoryRefresh() {
  if (state.historyRefreshInterval) {
    clearInterval(state.historyRefreshInterval);
  }

  state.historyRefreshInterval = setInterval(async () => {
    try {
      await loadChats();
      if (state.activeJid) {
        await selectChat(state.activeJid);
      }
    } catch (error) {
      console.error(error);
    }
  }, 3000);
}

function stopHistoryRefresh() {
  if (state.historyRefreshInterval) {
    clearInterval(state.historyRefreshInterval);
    state.historyRefreshInterval = null;
  }
}

function stopConnectionPolling() {
  if (state.connectionInterval) {
    clearInterval(state.connectionInterval);
    state.connectionInterval = null;
  }
}

function startConnectionPolling(sessionId) {
  stopConnectionPolling();

  state.connectionInterval = setInterval(async () => {
    try {
      const connectionState = await getConnectionState(sessionId);
      renderConnectionState(connectionState);

      if (connectionState.status === "connected") {
        stopConnectionPolling();
        showConnectedUI();
        await loadChats();
        if (state.activeJid) {
          await selectChat(state.activeJid);
        }
        startHistoryRefresh();
      }
    } catch (error) {
      console.error(error);
    }
  }, 2000);
}

async function startSessionConnection(sessionId) {
  if (!sessionId) return;

  stopConnectionPolling();
  stopHistoryRefresh();

  state.sessionId = sessionId;
  state.chats = [];
  state.activeJid = null;
  state.activeMessages = [];
  state.activeMessagesSignature = "0";
  state.selectedMessageId = "";
  state.mediaCache = new Map();
  state.pendingMedia = new Set();

  elements.sessionLabel.textContent = `Sessao: ${sessionId}`;
  showConnectUI();
  setConnectionVisual("connecting");
  setConnectionStatus("Iniciando sessao...");

  await callApi(`/session/${encodeURIComponent(sessionId)}`, {
    method: "POST",
  });
  const connectionState = await getConnectionState(sessionId);
  renderConnectionState(connectionState);

  if (connectionState.status === "connected") {
    showConnectedUI();
    await loadChats();
    startHistoryRefresh();
    return;
  }

  startConnectionPolling(sessionId);
}

async function boot() {
  renderMessages();
  setConnectionVisual("idle");
  applyComposerType();

  elements.connectBtn.addEventListener("click", async () => {
    const sessionId = elements.sessionInput.value.trim();
    if (!sessionId) return;

    try {
      await startSessionConnection(sessionId);
    } catch (error) {
      alert(error.message);
    }
  });

  elements.messageType.addEventListener("change", () => {
    applyComposerType();
  });

  elements.messageForm.addEventListener("submit", async (event) => {
    try {
      await sendMessage(event);
    } catch (error) {
      alert(error.message);
    }
  });

  elements.chatSearchInput.addEventListener("input", () => {
    renderChats();
  });

  elements.refreshChatsBtn?.addEventListener("click", async () => {
    try {
      await loadChats();
      if (state.activeJid) {
        await selectChat(state.activeJid);
      }
      scrollToBottom(false);
    } catch (error) {
      console.error(error);
    }
  });

  try {
    const sessions = await callApi("/sessions");
    const preferredSessionId =
      sessions.active?.[0] ||
      sessions.stored?.[0] ||
      elements.sessionInput.value.trim() ||
      "default";
    elements.sessionInput.value = preferredSessionId;
    await startSessionConnection(preferredSessionId);
  } catch (error) {
    console.error(error);
  }
}

boot();

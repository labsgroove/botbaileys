const state = {
  sessionId: null,
  chats: [],
  activeJid: null,
  activeMessages: [],
  activeMessagesSignature: '',
  historyRefreshInterval: null,
  connectionInterval: null
}

const elements = {
  connectScreen: document.getElementById('connect-screen'),
  appShell: document.getElementById('app-shell'),
  sessionInput: document.getElementById('session-input'),
  connectBtn: document.getElementById('connect-btn'),
  connectionDot: document.getElementById('connection-dot'),
  connectionStatus: document.getElementById('connection-status'),
  qrWrapper: document.getElementById('qr-wrapper'),
  qrImage: document.getElementById('qr-image'),
  sessionLabel: document.getElementById('session-label'),
  connectionPill: document.getElementById('connection-pill'),
  chatSearchInput: document.getElementById('chat-search-input'),
  chatList: document.getElementById('chat-list'),
  chatHeaderTitle: document.getElementById('chat-header-title'),
  chatHeaderSubtitle: document.getElementById('chat-header-subtitle'),
  messageList: document.getElementById('message-list'),
  messageForm: document.getElementById('message-form'),
  jidInput: document.getElementById('jid-input'),
  messageInput: document.getElementById('message-input')
}

const connectionLabels = {
  idle: 'Aguardando',
  qr: 'QR pronto',
  connecting: 'Conectando',
  connected: 'Conectado',
  closed: 'Encerrada'
}

function formatTime(ts) {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function displayName(chat) {
  const name = chat?.name?.trim()
  if (name) {
    return name
  }

  const jidUser = chat?.jid?.split('@')[0] || ''
  const normalizedUser = jidUser.split(':')[0]?.split('_')[0]
  return normalizedUser || 'Sem nome'
}

function escapeHtml(value = '') {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }

  return String(value).replace(/[&<>"']/g, (char) => entities[char] || char)
}

function messagesSignature(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    return '0'
  }

  const lastMessage = messages[messages.length - 1]
  return `${messages.length}:${lastMessage?.id || ''}:${lastMessage?.timestamp || ''}`
}

function normalizeConnectionStatus(status) {
  if (
    status === 'qr' ||
    status === 'connecting' ||
    status === 'connected' ||
    status === 'closed'
  ) {
    return status
  }

  return 'idle'
}

function setConnectionVisual(status) {
  const normalizedStatus = normalizeConnectionStatus(status)

  if (elements.connectionDot) {
    elements.connectionDot.className = `connection-dot connection-dot-${normalizedStatus}`
  }

  if (elements.connectionPill) {
    elements.connectionPill.className = `connection-pill connection-pill-${normalizedStatus}`
    elements.connectionPill.textContent = connectionLabels[normalizedStatus]
  }
}

function qrImageUrl(text) {
  return `https://quickchart.io/qr?size=280&margin=1&text=${encodeURIComponent(text)}`
}

function showConnectedUI() {
  elements.connectScreen.classList.add('hidden')
  elements.appShell.classList.remove('hidden')
}

function showConnectUI() {
  elements.connectScreen.classList.remove('hidden')
  elements.appShell.classList.add('hidden')
}

function setConnectionStatus(text) {
  elements.connectionStatus.textContent = text
}

function renderConnectionState(connectionState) {
  const status = normalizeConnectionStatus(connectionState?.status)
  setConnectionVisual(status)

  if (status === 'qr' && connectionState.qr) {
    setConnectionStatus('Escaneie o QR code no WhatsApp do celular.')
    elements.qrImage.src = qrImageUrl(connectionState.qr)
    elements.qrWrapper.classList.remove('hidden')
    return
  }

  elements.qrWrapper.classList.add('hidden')
  elements.qrImage.removeAttribute('src')

  if (status === 'connecting') {
    setConnectionStatus('Conectando ao WhatsApp...')
    return
  }

  if (status === 'connected') {
    setConnectionStatus('Conectado com sucesso.')
    return
  }

  if (status === 'closed') {
    setConnectionStatus('Sessao encerrada. Gere um novo QR code para reconectar.')
    return
  }

  setConnectionStatus('Aguardando conexão...')
}

function getVisibleChats() {
  const query = (elements.chatSearchInput?.value || '').trim().toLowerCase()

  if (!query) {
    return state.chats
  }

  return state.chats.filter((chat) => {
    const chatName = displayName(chat).toLowerCase()
    const chatJid = (chat.jid || '').toLowerCase()
    return chatName.includes(query) || chatJid.includes(query)
  })
}

function renderChats() {
  const visibleChats = getVisibleChats()

  if (!state.chats.length) {
    elements.chatList.innerHTML = '<p class="empty-state">Sem conversas ainda.</p>'
    return
  }

  if (!visibleChats.length) {
    elements.chatList.innerHTML = '<p class="empty-state">Nenhuma conversa encontrada para esse filtro.</p>'
    return
  }

  elements.chatList.innerHTML = visibleChats
    .map((chat) => {
      const activeClass = chat.jid === state.activeJid ? 'active' : ''
      const unread = chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''
      const chatTitle = escapeHtml(displayName(chat))
      const chatPreview = escapeHtml(chat.lastMessage || 'Sem mensagens recentes')
      return `
      <button class="chat-item ${activeClass}" data-jid="${encodeURIComponent(chat.jid)}">
        <div class="chat-title">${chatTitle}</div>
        <div class="chat-subline">
          <span class="chat-preview">${chatPreview}</span>
          ${unread}
        </div>
      </button>
    `
    })
    .join('')

  elements.chatList.querySelectorAll('.chat-item').forEach((node) => {
    node.addEventListener('click', () => {
      const jid = node.dataset.jid ? decodeURIComponent(node.dataset.jid) : ''
      selectChat(jid)
    })
  })
}

function renderMessages() {
  if (!state.activeJid) {
    elements.chatHeaderTitle.textContent = 'Selecione uma conversa'
    elements.chatHeaderSubtitle.textContent = 'Escolha um contato para abrir o histórico.'
    elements.messageList.innerHTML = '<div class="message-empty">As mensagens aparecerão aqui.</div>'
    return
  }

  const chat = state.chats.find((item) => item.jid === state.activeJid)
  const fallbackTitle = state.activeJid.split('@')[0]?.split(':')[0]?.split('_')[0] || state.activeJid
  elements.chatHeaderTitle.textContent = chat ? displayName(chat) : fallbackTitle
  elements.chatHeaderSubtitle.textContent = state.activeJid
  elements.jidInput.value = state.activeJid

  if (!state.activeMessages.length) {
    elements.messageList.innerHTML = '<div class="message-empty">Nenhuma mensagem neste chat ainda.</div>'
    return
  }

  elements.messageList.innerHTML = state.activeMessages
    .map((message) => {
      const direction = message.direction === 'outbound' ? 'outbound' : 'inbound'
      const safeText = escapeHtml(message.text || '(mensagem vazia)').replace(/\n/g, '<br />')
      return `
    <article class="message ${direction}">
      <div>${safeText}</div>
      <div class="message-time">${formatTime(message.timestamp)}</div>
    </article>
  `
    })
    .join('')

  elements.messageList.scrollTop = elements.messageList.scrollHeight
}

async function callApi(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'Falha na API')
  }

  return response.json()
}

async function loadChats() {
  if (!state.sessionId) return
  const data = await callApi(`/session/${encodeURIComponent(state.sessionId)}/chats`)
  state.chats = Array.isArray(data.chats) ? data.chats : []

  if (state.activeJid && !state.chats.length) {
    state.activeJid = null
    state.activeMessages = []
    state.activeMessagesSignature = '0'
  }

  renderChats()

  if (!state.activeJid) {
    renderMessages()
  }
}

async function selectChat(jid) {
  if (!state.sessionId || !jid) return
  const data = await callApi(`/session/${encodeURIComponent(state.sessionId)}/messages/${encodeURIComponent(jid)}`)
  const resolvedJid = data?.jid || jid
  const nextMessages = Array.isArray(data.messages) ? data.messages : []
  const nextSignature = messagesSignature(nextMessages)
  const isSameChat = state.activeJid === resolvedJid
  const hasChanged = !isSameChat || state.activeMessagesSignature !== nextSignature

  state.activeJid = resolvedJid

  if (hasChanged) {
    state.activeMessages = nextMessages
    state.activeMessagesSignature = nextSignature
  }

  renderChats()

  if (hasChanged) {
    renderMessages()
  }
}

async function sendMessage(event) {
  event.preventDefault()

  if (!state.sessionId) {
    alert('Conecte uma sessao primeiro')
    return
  }

  const jid = elements.jidInput.value.trim()
  const text = elements.messageInput.value.trim()

  if (!jid || !text) {
    return
  }

  await callApi(`/session/${encodeURIComponent(state.sessionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ jid, text })
  })

  elements.messageInput.value = ''
  await loadChats()
  await selectChat(jid)
}

async function getConnectionState(sessionId) {
  const data = await callApi(`/session/${encodeURIComponent(sessionId)}/status`)
  return data.state
}

function startHistoryRefresh() {
  if (state.historyRefreshInterval) {
    clearInterval(state.historyRefreshInterval)
  }

  state.historyRefreshInterval = setInterval(async () => {
    try {
      await loadChats()
      if (state.activeJid) {
        await selectChat(state.activeJid)
      }
    } catch (error) {
      console.error(error)
    }
  }, 3000)
}

function stopHistoryRefresh() {
  if (state.historyRefreshInterval) {
    clearInterval(state.historyRefreshInterval)
    state.historyRefreshInterval = null
  }
}

function stopConnectionPolling() {
  if (state.connectionInterval) {
    clearInterval(state.connectionInterval)
    state.connectionInterval = null
  }
}

function startConnectionPolling(sessionId) {
  stopConnectionPolling()

  state.connectionInterval = setInterval(async () => {
    try {
      const connectionState = await getConnectionState(sessionId)
      renderConnectionState(connectionState)

      if (connectionState.status === 'connected') {
        stopConnectionPolling()
        showConnectedUI()
        await loadChats()
        if (state.activeJid) {
          await selectChat(state.activeJid)
        }
        startHistoryRefresh()
      }
    } catch (error) {
      console.error(error)
    }
  }, 2000)
}

async function startSessionConnection(sessionId) {
  if (!sessionId) return

  stopConnectionPolling()
  stopHistoryRefresh()
  state.sessionId = sessionId
  elements.sessionLabel.textContent = `Sessao: ${sessionId}`
  showConnectUI()
  setConnectionVisual('connecting')
  setConnectionStatus('Iniciando sessao...')

  await callApi(`/session/${encodeURIComponent(sessionId)}`, { method: 'POST' })
  const connectionState = await getConnectionState(sessionId)
  renderConnectionState(connectionState)

  if (connectionState.status === 'connected') {
    showConnectedUI()
    await loadChats()
    startHistoryRefresh()
    return
  }

  startConnectionPolling(sessionId)
}

async function boot() {
  renderMessages()
  setConnectionVisual('idle')

  elements.connectBtn.addEventListener('click', async () => {
    const sessionId = elements.sessionInput.value.trim()
    if (!sessionId) return

    try {
      await startSessionConnection(sessionId)
    } catch (error) {
      alert(error.message)
    }
  })

  elements.messageForm.addEventListener('submit', async (event) => {
    try {
      await sendMessage(event)
    } catch (error) {
      alert(error.message)
    }
  })

  elements.chatSearchInput.addEventListener('input', () => {
    renderChats()
  })

  try {
    const sessions = await callApi('/sessions')
    const preferredSessionId =
      sessions.active?.[0] || sessions.stored?.[0] || elements.sessionInput.value.trim() || 'default'
    elements.sessionInput.value = preferredSessionId
    await startSessionConnection(preferredSessionId)
  } catch (error) {
    console.error(error)
  }
}

boot()

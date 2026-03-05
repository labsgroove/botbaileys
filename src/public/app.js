const state = {
  sessionId: null,
  chats: [],
  activeJid: null,
  activeMessages: [],
  historyRefreshInterval: null,
  connectionInterval: null
}

const elements = {
  connectScreen: document.getElementById('connect-screen'),
  appShell: document.getElementById('app-shell'),
  sessionInput: document.getElementById('session-input'),
  connectBtn: document.getElementById('connect-btn'),
  connectionStatus: document.getElementById('connection-status'),
  qrWrapper: document.getElementById('qr-wrapper'),
  qrImage: document.getElementById('qr-image'),
  sessionLabel: document.getElementById('session-label'),
  chatList: document.getElementById('chat-list'),
  chatHeader: document.getElementById('chat-header'),
  messageList: document.getElementById('message-list'),
  messageForm: document.getElementById('message-form'),
  jidInput: document.getElementById('jid-input'),
  messageInput: document.getElementById('message-input')
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function displayName(chat) {
  return chat.name || chat.jid.split('@')[0]
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
  const status = connectionState?.status || 'idle'

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

function renderChats() {
  if (!state.chats.length) {
    elements.chatList.innerHTML = '<p style="padding:16px;color:#9ba3a7">Sem conversas ainda.</p>'
    return
  }

  elements.chatList.innerHTML = state.chats
    .map((chat) => {
      const activeClass = chat.jid === state.activeJid ? 'active' : ''
      const unread = chat.unread > 0 ? `<span class="badge">${chat.unread}</span>` : ''
      return `
      <button class="chat-item ${activeClass}" data-jid="${chat.jid}">
        <div class="chat-title">${displayName(chat)}</div>
        <div class="chat-subline">
          <span>${chat.lastMessage || ''}</span>
          ${unread}
        </div>
      </button>
    `
    })
    .join('')

  elements.chatList.querySelectorAll('.chat-item').forEach((node) => {
    node.addEventListener('click', () => {
      selectChat(node.dataset.jid)
    })
  })
}

function renderMessages() {
  if (!state.activeJid) {
    elements.chatHeader.textContent = 'Selecione uma conversa'
    elements.messageList.innerHTML = ''
    return
  }

  const chat = state.chats.find((item) => item.jid === state.activeJid)
  elements.chatHeader.textContent = chat ? displayName(chat) : state.activeJid
  elements.jidInput.value = state.activeJid

  elements.messageList.innerHTML = state.activeMessages
    .map(
      (message) => `
    <article class="message ${message.direction}">
      <div>${message.text}</div>
      <div class="message-time">${formatTime(message.timestamp)}</div>
    </article>
  `
    )
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
  state.chats = data.chats
  renderChats()
}

async function selectChat(jid) {
  if (!state.sessionId || !jid) return
  const data = await callApi(`/session/${encodeURIComponent(state.sessionId)}/messages/${encodeURIComponent(jid)}`)
  state.activeJid = jid
  state.activeMessages = data.messages
  renderChats()
  renderMessages()
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

  state.sessionId = sessionId
  elements.sessionLabel.textContent = `Sessao: ${sessionId}`
  showConnectUI()
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

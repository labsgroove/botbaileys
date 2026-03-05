const state = {
  sessionId: null,
  chats: [],
  activeJid: null,
  activeMessages: []
}

const elements = {
  sessionInput: document.getElementById('session-input'),
  connectBtn: document.getElementById('connect-btn'),
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

function renderChats() {
  if (!state.chats.length) {
    elements.chatList.innerHTML = '<p style="padding:16px;color:#9ba3a7">Sem conversas ainda.</p>'
    return
  }

  elements.chatList.innerHTML = state.chats.map((chat) => {
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
  }).join('')

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

  elements.messageList.innerHTML = state.activeMessages.map((message) => `
    <article class="message ${message.direction}">
      <div>${message.text}</div>
      <div class="message-time">${formatTime(message.timestamp)}</div>
    </article>
  `).join('')

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

async function ensureSession(sessionId) {
  await callApi(`/session/${encodeURIComponent(sessionId)}`, { method: 'POST' })
  state.sessionId = sessionId
  elements.sessionLabel.textContent = `Sessao: ${sessionId}`
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

async function boot() {
  elements.connectBtn.addEventListener('click', async () => {
    const sessionId = elements.sessionInput.value.trim()
    if (!sessionId) return

    try {
      await ensureSession(sessionId)
      await loadChats()
      if (state.activeJid) {
        await selectChat(state.activeJid)
      }
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
    const first = sessions.active?.[0] || elements.sessionInput.value.trim() || 'default'
    await ensureSession(first)
    await loadChats()
  } catch (error) {
    console.error(error)
  }

  setInterval(async () => {
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

boot()

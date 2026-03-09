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
  messageComposer: document.getElementById("message-composer"),
  messageInput: document.getElementById("message-input"),
  emojiBtn: document.getElementById("emoji-btn"),
  attachBtn: document.getElementById("attach-btn"),
  voiceBtn: document.getElementById("voice-btn"),
  sendBtn: document.getElementById("send-btn"),
  businessToggleBtn: document.getElementById("business-toggle-btn"),
  aiConfigBtn: document.getElementById("ai-config-btn"),
  aiToggleBtn: document.getElementById("ai-toggle-btn"),
  // Hidden inputs
  jidInput: document.getElementById("jid-input"),
  messageType: document.getElementById("message-type"),
  mediaUrlInput: document.getElementById("media-url-input"),
  mimeInput: document.getElementById("mime-input"),
  fileNameInput: document.getElementById("file-name-input"),
  reactionMessageId: document.getElementById("reaction-message-id"),
  reactionEmoji: document.getElementById("reaction-emoji"),
  interactiveJson: document.getElementById("interactive-json"),
  refreshChatsBtn: document.getElementById("refresh-chats-btn"),
  // Menus
  attachMenu: document.getElementById("attach-menu"),
  emojiPicker: document.getElementById("emoji-picker"),
  voiceRecorder: document.getElementById("voice-recorder"),
  businessOptions: document.getElementById("business-options"),
  // AI Config Modal
  aiConfigModal: document.getElementById("ai-config-modal"),
  closeAiConfigBtn: document.getElementById("close-ai-config-btn"),
  saveAiConfigBtn: document.getElementById("save-ai-config-btn"),
  cancelAiConfigBtn: document.getElementById("cancel-ai-config-btn"),
  testGoogleAiBtn: document.getElementById("test-google-ai-btn"),
  configStatus: document.getElementById("config-status"),
  // AI Config inputs
  aiProviderRadios: document.querySelectorAll('input[name="ai-provider"]'),
  lmStudioConfig: document.getElementById("lm-studio-config"),
  googleAiConfig: document.getElementById("google-ai-config"),
  lmStudioUrl: document.getElementById("lm-studio-url"),
  lmStudioModel: document.getElementById("lm-studio-model"),
  lmStudioTemperature: document.getElementById("lm-studio-temperature"),
  googleAiApiKey: document.getElementById("google-ai-api-key"),
  googleAiModel: document.getElementById("google-ai-model"),
  googleAiTemperature: document.getElementById("google-ai-temperature"),
  googleAiMaxTokens: document.getElementById("google-ai-max-tokens"),
  // Bot Context inputs
  systemPrompt: document.getElementById("system-prompt"),
  maxHistoryLength: document.getElementById("max-history-length"),
  // Test Chat elements
  testChatMessages: document.getElementById("test-chat-messages"),
  testChatInput: document.getElementById("test-chat-input"),
  testChatSendBtn: document.getElementById("test-chat-send-btn"),
  // Attach options
  closeAttachBtn: document.getElementById("close-attach-btn"),
  attachImageBtn: document.getElementById("attach-image-btn"),
  attachVideoBtn: document.getElementById("attach-video-btn"),
  attachDocumentBtn: document.getElementById("attach-document-btn"),
  attachAudioBtn: document.getElementById("attach-audio-btn"),
  imageFileInput: document.getElementById("image-file-input"),
  videoFileInput: document.getElementById("video-file-input"),
  documentFileInput: document.getElementById("document-file-input"),
  audioFileInput: document.getElementById("audio-file-input"),
  // Emoji picker
  closeEmojiBtn: document.getElementById("close-emoji-btn"),
  emojiGrid: document.getElementById("emoji-grid"),
  // Voice recorder
  cancelVoiceBtn: document.getElementById("cancel-voice-btn"),
  sendVoiceBtn: document.getElementById("send-voice-btn"),
  voiceTimer: document.querySelector(".voice-timer"),
  // Business options
  closeBusinessBtn: document.getElementById("close-business-btn"),
  interactiveBtn: document.getElementById("interactive-btn"),
  listBtn: document.getElementById("list-btn"),
  locationBtn: document.getElementById("location-btn"),
  productBtn: document.getElementById("product-btn"),
};

const connectionLabels = {
  idle: "Aguardando",
  qr: "QR pronto",
  connecting: "Conectando",
  connected: "Conectado",
  closed: "Encerrada",
};

// Emoji data
const emojiCategories = {
  recent: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭"],
  smile: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😜", "🤪", "😝", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐"],
  people: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🙏", "🤝", "🧱", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁", "👅", "👄"],
  animals: ["🐵", "🙈", "🙉", "🙊", "🐒", "🐕", "🐕‍🦺", "🐩", "🐈", "🐈‍⬛", "🐈‍⬛", "🦫", "🐅", "🐆", "🐴", "🐎", "🦄", "🦓", "🦌", "🦬", "🐮", "🐂", "🐃", "🐄", "🐷", "🐖", "🐗", "🐽", "🐏", "🐑", "🐐", "🐪", "🐫", "🦙", "🦒", "🐘", "🦣", "🦏", "🦛", "🐭", "🐁", "🐀", "🐹", "🐰", "🐇", "🦫", "🦔", "🦇", "🐻", "🐻‍❄️", "🐨", "🐼", "🦥", "🦦", "🦨", "🦘", "🦡", "🐾", "🦃", "🐔", "🐓", "🐣", "🐤", "🐥", "🐦", "🐧", "🕊", "🦅", "🦆", "🦢", "🦉", "🤪", "🦚", "🦜"],
  food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🍯", "🥞", "🧇", "🥚", "🍳", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧋", "🧃", "🧉", "🧊", "🥢", "🍽", "🍴", "🥄"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸", "🥌", "🎿", "⛷", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚴", "🚵", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🪈", "🎲", "♟", "🎯", "🎳", "🎮", "🎰", "🧩"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍", "🛵", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈", "🛩", "🪂", "🚀", "🛰", "🚡", "🚠", "🚟", "🚋", "🚊", "🚉", "🚈", "🚇", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚃", "🚋", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎", "🏍", "🛵", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈", "🛩", "🪂", "🚀", "🛰", "🚡", "🚠", "🚟", "🚋", "🚊", "🚉", "🚈", "🚇", "🚝", "🚞", "🚋", "🚌", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎", "🏍", "🛵", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚁", "🛸", "✈", "🛩", "🪂", "🚀", "🛰", "🚡", "🚠", "🚟", "🚋", "🚊", "🚉", "🚈", "🚇", "🚝", "🚞", "🚟", "🚋", "🚌", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎", "🏍", "🛵", "🦽", "🦼", "🛺", "⚓", "⛵", "🛶", "🚤", "🛳", "⛴", "🛥", "🚢", "✈", "🛩", "🛫", "🛬", "🪂", "🚀", "🛰", "🚡", "🚠", "🚟", "🚋", "🚊", "🚉", "🚈", "🚇", "🚝", "🚞", "🚟", "🚋", "🚌", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎", "🏍", "🛵", "🦽", "🦼", "🛺", "⚓", "⛵", "🛶", "🚤", "🛳", "⛴", "🛥", "🚢"],
  objects: ["⌚", "📱", "📲", "💻", "⌨", "🖥", "🖨", "🖱", "🖲", "🕹", "🗜", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽", "🎞", "📞", "☎", "📟", "📠", "📺", "📻", "🎙", "🎚", "🎛", "🧭", "⏱", "⏲", "⏰", "🕰", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯", "🪔", "🧯", "🛢", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "⚖", "🧰", "🔧", "🔨", "⚒", "🛠", "⛏", "🔩", "⚙", "🧱", "⛓", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡", "⚔", "🛡", "🚬", "⚰", "⚱", "🏺", "🔎", "🕳", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🧯", "🔬", "🔭", "📡", "🛰", "🚀", "🛸", "✈", "🛩", "🪂", "🚁", "🛶", "⛵", "🚤", "🛳", "⛴", "🛥", "🚢", "⚓", "🪝", "🎣", "🛒", "🎁", "🎈", "🎏", "🎀", "🎊", "🎉", "🎎", "🎐", "🎌", "🏮", "🎃", "🎄", "🎆", "🎇", "🧨", "✨", "🪄", "🎈", "🎁", "🎀", "🎗", "🎟", "🎫", "🎖", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸", "🥌", "🎿", "⛷", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚴", "🚵", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🪈", "🎲", "♟", "🎯", "🎳", "🎮", "🎰", "🧩"],
  symbols: ["❤", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮", "✝", "☪", "🕉", "☸", "✡", "🔯", "🕎", "☯", "☦", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛", "🉑", "☢", "☣", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷", "✴", "🆚", "💮", "🉐", "㊙", "㊗", "🈴", "🈵", "🈹", "🈲", "🅰", "🅱", "🆎", "🆑", "🅾", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼", "⁉", "🔅", "🔆", "〽", "⚠", "🚸", "🔱", "⚜", "🔰", "♻", "✅", "🈯", "💹", "❇", "✳", "❎", "🌐", "💠", "Ⓜ", "🌀", "💤", "🏧", "🚾", "♿", "🅿", "🈳", "🈂", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ", "🔤", "🔡", "🔠", "🆖", "🆑", "🅾", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼", "⁉", "🔅", "🔆", "〽", "⚠", "🚸", "🔱", "⚜", "🔰", "♻", "✅", "🈯", "💹", "❇", "✳", "❎", "🌐", "💠", "Ⓜ", "🌀", "💤", "🏧", "🚾", "♿", "🅿", "🈳", "🈂", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ", "🔤", "🔡", "🔠", "🆖", "🆑", "🅾", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼", "⁉", "🔅", "🔆", "〽", "⚠", "🚸", "🔱", "⚜", "🔰", "♻", "✅", "🈯", "💹", "❇", "✳", "❎", "🌐", "💠", "Ⓜ", "🌀", "💤", "🏧", "🚾", "♿", "🅿", "🈳", "🈂", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁"]
};

// Voice recording state
let voiceRecorder = {
  mediaRecorder: null,
  audioChunks: [],
  startTime: null,
  timerInterval: null,
  isRecording: false,
};

// State for UI
let currentEmojiCategory = 'recent';
let recentEmojis = JSON.parse(localStorage.getItem('recentEmojis') || '[]');

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

function formatVoiceTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function addToRecentEmojis(emoji) {
  // Remove emoji if it already exists
  recentEmojis = recentEmojis.filter(e => e !== emoji);
  // Add to beginning
  recentEmojis.unshift(emoji);
  // Keep only last 24
  recentEmojis = recentEmojis.slice(0, 24);
  // Save to localStorage
  localStorage.setItem('recentEmojis', JSON.stringify(recentEmojis));
  // Update recent category
  emojiCategories.recent = recentEmojis;
}

function hideAllMenus() {
  elements.attachMenu.classList.add('hidden');
  elements.emojiPicker.classList.add('hidden');
  elements.voiceRecorder.classList.add('hidden');
  elements.businessOptions.classList.add('hidden');
}

function showAttachMenu() {
  hideAllMenus();
  elements.attachMenu.classList.remove('hidden');
}

function showEmojiPicker() {
  hideAllMenus();
  elements.emojiPicker.classList.remove('hidden');
  renderEmojiGrid(currentEmojiCategory);
}

function showVoiceRecorder() {
  hideAllMenus();
  elements.voiceRecorder.classList.remove('hidden');
}

function showBusinessOptions() {
  hideAllMenus();
  elements.businessOptions.classList.remove('hidden');
}

function renderEmojiGrid(category) {
  const emojis = emojiCategories[category] || [];
  elements.emojiGrid.innerHTML = '';
  
  emojis.forEach(emoji => {
    const button = document.createElement('button');
    button.className = 'emoji-item';
    button.textContent = emoji;
    button.onclick = () => insertEmoji(emoji);
    elements.emojiGrid.appendChild(button);
  });
}

function insertEmoji(emoji) {
  const cursorPos = elements.messageInput.selectionStart;
  const textBefore = elements.messageInput.value.substring(0, cursorPos);
  const textAfter = elements.messageInput.value.substring(cursorPos);
  
  elements.messageInput.value = textBefore + emoji + textAfter;
  elements.messageInput.focus();
  
  // Set cursor position after emoji
  const newCursorPos = cursorPos + emoji.length;
  elements.messageInput.setSelectionRange(newCursorPos, newCursorPos);
  
  addToRecentEmojis(emoji);
  hideAllMenus();
}

function startVoiceRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      voiceRecorder.mediaRecorder = new MediaRecorder(stream);
      voiceRecorder.audioChunks = [];
      voiceRecorder.startTime = Date.now();
      
      voiceRecorder.mediaRecorder.ondataavailable = event => {
        voiceRecorder.audioChunks.push(event.data);
      };
      
      voiceRecorder.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(voiceRecorder.audioChunks, { type: 'audio/webm' });
        sendVoiceMessage(audioBlob);
      };
      
      voiceRecorder.mediaRecorder.start();
      voiceRecorder.isRecording = true;
      
      // Update UI
      elements.voiceBtn.classList.add('recording');
      elements.sendVoiceBtn.classList.remove('hidden');
      
      // Start timer
      updateVoiceTimer();
      voiceRecorder.timerInterval = setInterval(updateVoiceTimer, 100);
    })
    .catch(error => {
      console.error('Error accessing microphone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    });
}

function stopVoiceRecording() {
  if (voiceRecorder.mediaRecorder && voiceRecorder.isRecording) {
    voiceRecorder.mediaRecorder.stop();
    voiceRecorder.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    voiceRecorder.isRecording = false;
    
    // Stop timer
    if (voiceRecorder.timerInterval) {
      clearInterval(voiceRecorder.timerInterval);
      voiceRecorder.timerInterval = null;
    }
    
    // Update UI
    elements.voiceBtn.classList.remove('recording');
    elements.sendVoiceBtn.classList.add('hidden');
  }
}

function updateVoiceTimer() {
  if (voiceRecorder.startTime) {
    const elapsed = (Date.now() - voiceRecorder.startTime) / 1000;
    elements.voiceTimer.textContent = formatVoiceTime(elapsed);
  }
}

function cancelVoiceRecording() {
  stopVoiceRecording();
  hideAllMenus();
  elements.voiceTimer.textContent = '00:00';
}

async function sendVoiceMessage(audioBlob) {
  if (!state.activeJid) return;
  
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    
    const response = await fetch(`/session/${encodeURIComponent(state.sessionId)}/send-voice/${encodeURIComponent(state.activeJid)}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to send voice message');
    }
    
    // Reset timer
    elements.voiceTimer.textContent = '00:00';
    hideAllMenus();
    
    // Refresh messages
    await loadMessages(state.activeJid);
  } catch (error) {
    console.error('Error sending voice message:', error);
    alert('Erro ao enviar mensagem de voz');
  }
}

async function handleFileUpload(file, type) {
  if (!state.activeJid) return;
  
  try {
    const formData = new FormData();
    formData.append('media', file);
    
    let endpoint = `/session/${encodeURIComponent(state.sessionId)}/send-media/${encodeURIComponent(state.activeJid)}`;
    
    switch (type) {
      case 'image':
        endpoint += '?type=image';
        break;
      case 'video':
        endpoint += '?type=video';
        break;
      case 'document':
        endpoint += '?type=document';
        break;
      case 'audio':
        endpoint += '?type=audio';
        break;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to send media');
    }
    
    hideAllMenus();
    await loadMessages(state.activeJid);
  } catch (error) {
    console.error('Error sending media:', error);
    alert('Erro ao enviar mídia');
  }
}

function setupBusinessMessage(type) {
  elements.messageType.value = 'interactive';
  
  switch (type) {
    case 'interactive':
      elements.interactiveJson.value = JSON.stringify({
        mode: "buttons",
        buttons: [
          { id: "opt_1", text: "Opção 1" },
          { id: "opt_2", text: "Opção 2" }
        ]
      }, null, 2);
      break;
    case 'list':
      elements.interactiveJson.value = JSON.stringify({
        mode: "list",
        buttonText: "Ver opções",
        sections: [
          {
            title: "Categoria 1",
            rows: [
              { id: "item_1", title: "Item 1", description: "Descrição 1" },
              { id: "item_2", title: "Item 2", description: "Descrição 2" }
            ]
          }
        ]
      }, null, 2);
      break;
    case 'location':
      elements.interactiveJson.value = JSON.stringify({
        type: "location",
        location: {
          latitude: -23.5505,
          longitude: -46.6333,
          name: "São Paulo",
          address: "São Paulo, SP, Brasil"
        }
      }, null, 2);
      break;
    case 'product':
      elements.interactiveJson.value = JSON.stringify({
        type: "product",
        catalogId: "catalog_123",
        productIds: ["product_1", "product_2"]
      }, null, 2);
      break;
  }
  
  hideAllMenus();
  elements.messageInput.focus();
}

function autoResizeTextarea() {
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';
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

  const jid = state.activeJid || elements.jidInput.value.trim();
  const type = elements.messageType.value;
  const text = elements.messageInput.value.trim();

  if (!jid) {
    alert("Selecione um contato ou informe um JID");
    return;
  }

  if (!text && type !== 'interactive') {
    alert("Digite uma mensagem");
    return;
  }

  const payload = {
    jid,
    type,
  };

  if (type === "text") {
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
  elements.messageInput.style.height = 'auto';
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
    await loadAIStatus(); // Carrega status da IA
    return;
  }

  startConnectionPolling(sessionId);
}

// AI Configuration Modal Functions
function showAiConfigModal() {
  loadAiConfig();
  elements.aiConfigModal.classList.remove('hidden');
}

function hideAiConfigModal() {
  elements.aiConfigModal.classList.add('hidden');
  hideConfigStatus();
}

function showConfigStatus(message, type = 'success') {
  elements.configStatus.textContent = message;
  elements.configStatus.className = `config-status ${type}`;
}

function hideConfigStatus() {
  elements.configStatus.className = 'config-status';
}

function switchAiProvider(provider) {
  if (provider === 'google-ai') {
    elements.lmStudioConfig.classList.add('hidden');
    elements.googleAiConfig.classList.remove('hidden');
  } else {
    elements.lmStudioConfig.classList.remove('hidden');
    elements.googleAiConfig.classList.add('hidden');
  }
}

async function loadAiConfig() {
  try {
    const response = await fetch('/api/ai/config');
    const config = await response.json();
    
    // Set provider
    const providerRadio = document.querySelector(`input[name="ai-provider"][value="${config.provider}"]`);
    if (providerRadio) {
      providerRadio.checked = true;
      switchAiProvider(config.provider);
    }
    
    // Load LM Studio config
    if (config.lmStudio) {
      elements.lmStudioUrl.value = config.lmStudio.url || '';
      elements.lmStudioModel.value = config.lmStudio.model || '';
      elements.lmStudioTemperature.value = config.lmStudio.temperature || 0.7;
    }
    
    // Load Google AI config
    if (config.googleAI) {
      elements.googleAiApiKey.value = config.googleAI.apiKey && config.googleAI.apiKey !== '***' ? config.googleAI.apiKey : '';
      elements.googleAiModel.value = config.googleAI.model || 'gemini-2.5-flash';
      elements.googleAiTemperature.value = config.googleAI.temperature || 0.7;
      elements.googleAiMaxTokens.value = config.googleAI.maxTokens || 2048;
    }
    
    // Load Bot Context config
    if (config.botContext) {
      elements.systemPrompt.value = config.botContext.systemPrompt || 'Você é um atendente profissional.\nResponda de forma objetiva.\nNunca invente informações.';
      elements.maxHistoryLength.value = config.botContext.maxHistoryLength || 20;
    }
  } catch (error) {
    console.error('Error loading AI config:', error);
    showConfigStatus('Erro ao carregar configuração', 'error');
  }
}

async function saveAiConfig() {
  try {
    const provider = document.querySelector('input[name="ai-provider"]:checked').value;
    
    const config = {
      provider,
      lmStudio: provider === 'lm-studio' ? {
        url: elements.lmStudioUrl.value.trim(),
        model: elements.lmStudioModel.value.trim(),
        temperature: parseFloat(elements.lmStudioTemperature.value)
      } : undefined,
      googleAI: provider === 'google-ai' ? {
        apiKey: elements.googleAiApiKey.value.trim(),
        model: elements.googleAiModel.value,
        temperature: parseFloat(elements.googleAiTemperature.value),
        maxTokens: parseInt(elements.googleAiMaxTokens.value)
      } : undefined,
      botContext: {
        systemPrompt: elements.systemPrompt.value.trim(),
        maxHistoryLength: parseInt(elements.maxHistoryLength.value)
      }
    };
    
    const response = await fetch('/api/ai/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      showConfigStatus('Configuração salva com sucesso!', 'success');
      setTimeout(hideAiConfigModal, 2000);
    } else {
      const error = await response.json();
      showConfigStatus(error.error || 'Erro ao salvar configuração', 'error');
    }
  } catch (error) {
    console.error('Error saving AI config:', error);
    showConfigStatus('Erro ao salvar configuração', 'error');
  }
}

async function sendTestMessage() {
  const message = elements.testChatInput.value.trim();
  if (!message) return;

  // Adiciona mensagem do usuário
  addTestMessage(message, 'user');
  elements.testChatInput.value = '';

  try {
    // Pega configuração atual do bot
    const config = await getCurrentBotConfig();
    
    // Envia mensagem para teste
    const response = await fetch('/api/ai/test-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        config
      })
    });

    if (response.ok) {
      const data = await response.json();
      addTestMessage(data.response, 'bot');
    } else {
      const error = await response.json();
      addTestMessage(`Erro: ${error.error || 'Falha ao processar mensagem'}`, 'bot', true);
    }
  } catch (error) {
    console.error('Error testing chat:', error);
    addTestMessage('Erro de conexão com o servidor', 'bot', true);
  }
}

function addTestMessage(content, sender, isError = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `test-message ${sender}-message ${isError ? 'error' : ''}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(contentDiv);
  elements.testChatMessages.appendChild(messageDiv);
  
  // Scroll para baixo
  elements.testChatMessages.scrollTop = elements.testChatMessages.scrollHeight;
}

async function getCurrentBotConfig() {
  const provider = document.querySelector('input[name="ai-provider"]:checked').value;
  
  const config = {
    provider,
    systemPrompt: elements.systemPrompt.value.trim(),
    maxHistoryLength: parseInt(elements.maxHistoryLength.value)
  };

  if (provider === 'lm-studio') {
    config.lmStudio = {
      url: elements.lmStudioUrl.value.trim(),
      model: elements.lmStudioModel.value.trim(),
      temperature: parseFloat(elements.lmStudioTemperature.value)
    };
  } else if (provider === 'google-ai') {
    config.googleAI = {
      apiKey: elements.googleAiApiKey.value.trim(),
      model: elements.googleAiModel.value,
      temperature: parseFloat(elements.googleAiTemperature.value),
      maxTokens: parseInt(elements.googleAiMaxTokens.value)
    };
  }

  return config;
}

async function testGoogleAiConnection() {
  const apiKey = elements.googleAiApiKey.value.trim();
  const model = elements.googleAiModel.value;
  
  if (!apiKey) {
    showConfigStatus('API Key é obrigatória', 'error');
    return;
  }
  
  try {
    elements.testGoogleAiBtn.disabled = true;
    elements.testGoogleAiBtn.textContent = 'Testando...';
    hideConfigStatus();
    
    const response = await fetch('/api/ai/test-google-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey, model })
    });
    
    const result = await response.json();
    
    if (result.valid) {
      showConfigStatus('✅ Conexão com Google AI bem-sucedida!', 'success');
      // Load available models after successful connection
      await loadGoogleAIModels();
    } else {
      showConfigStatus('❌ Falha na conexão. Verifique se a API Key está correta.', 'error');
    }
  } catch (error) {
    console.error('Error testing Google AI:', error);
    showConfigStatus('❌ Erro ao testar conexão. Tente novamente.', 'error');
  } finally {
    elements.testGoogleAiBtn.disabled = false;
    elements.testGoogleAiBtn.textContent = 'Testar';
  }
}

// Load available Google AI models
async function loadGoogleAIModels() {
  const apiKey = elements.googleAiApiKey.value.trim();
  
  if (!apiKey) {
    return;
  }
  
  try {
    const response = await fetch('/api/ai/google-ai-models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey })
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      
      // Save current selection
      const currentModel = elements.googleAiModel.value;
      
      // Clear existing options
      elements.googleAiModel.innerHTML = '';
      
      // Add available models with friendly names
      const modelNames = {
        'gemini-2.5-flash': 'Gemini 2.5 Flash (Rápido)',
        'gemini-2.5-pro': 'Gemini 2.5 Pro (Completo)',
        'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
        'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
        'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite'
      };
      
      models.forEach((model) => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = modelNames[model] || model;
        elements.googleAiModel.appendChild(option);
      });
      
      // Restore previous selection if it still exists
      if (models.includes(currentModel)) {
        elements.googleAiModel.value = currentModel;
      }
    }
  } catch (error) {
    console.error('Error loading Google AI models:', error);
  }
}

// AI Conversation Functions
async function loadAIStatus() {
  if (!state.sessionId) return;
  
  try {
    const response = await fetch(`/api/ai/status/${encodeURIComponent(state.sessionId)}`);
    const status = await response.json();
    updateAIToggleButton(status.enabled);
  } catch (error) {
    console.error('Error loading AI status:', error);
  }
}

async function toggleAI() {
  if (!state.sessionId) {
    alert('Conecte-se ao WhatsApp primeiro');
    return;
  }
  
  try {
    elements.aiToggleBtn.disabled = true;
    
    const response = await fetch(`/api/ai/toggle/${encodeURIComponent(state.sessionId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      updateAIToggleButton(result.enabled);
      showNotification(result.message, result.enabled ? 'success' : 'info');
    } else {
      showNotification('Erro ao alterar status da IA', 'error');
    }
  } catch (error) {
    console.error('Error toggling AI:', error);
    showNotification('Erro ao alterar status da IA', 'error');
  } finally {
    elements.aiToggleBtn.disabled = false;
  }
}

function updateAIToggleButton(enabled) {
  if (enabled) {
    elements.aiToggleBtn.classList.add('ai-active');
    elements.aiToggleBtn.title = 'Desligar IA';
  } else {
    elements.aiToggleBtn.classList.remove('ai-active');
    elements.aiToggleBtn.title = 'Ligar IA';
  }
}

function showNotification(message, type = 'info') {
  // Implementar notificação visual
  console.log(`[${type.toUpperCase()}] ${message}`);
}

async function boot() {
  renderMessages();
  setConnectionVisual("idle");

  // Connection
  elements.connectBtn.addEventListener("click", async () => {
    const sessionId = elements.sessionInput.value.trim();
    if (!sessionId) return;

    try {
      await startSessionConnection(sessionId);
    } catch (error) {
      alert(error.message);
    }
  });

  // Message input auto-resize
  elements.messageInput.addEventListener("input", () => {
    autoResizeTextarea();
  });

  // Send message
  elements.sendBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await sendMessage(event);
    } catch (error) {
      alert(error.message);
    }
  });

  // Enter to send (Shift+Enter for new line)
  elements.messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.sendBtn.click();
    }
  });

  // Emoji picker
  elements.emojiBtn.addEventListener("click", showEmojiPicker);
  elements.closeEmojiBtn.addEventListener("click", hideAllMenus);

  // Emoji categories
  document.querySelectorAll('.emoji-category').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-category').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentEmojiCategory = btn.dataset.category;
      renderEmojiGrid(currentEmojiCategory);
    });
  });

  // Attach menu
  elements.attachBtn.addEventListener("click", showAttachMenu);
  elements.closeAttachBtn.addEventListener("click", hideAllMenus);

  // File uploads
  elements.attachImageBtn.addEventListener("click", () => {
    elements.imageFileInput.click();
  });

  elements.attachVideoBtn.addEventListener("click", () => {
    elements.videoFileInput.click();
  });

  elements.attachDocumentBtn.addEventListener("click", () => {
    elements.documentFileInput.click();
  });

  elements.attachAudioBtn.addEventListener("click", () => {
    elements.audioFileInput.click();
  });

  elements.imageFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file, 'image');
  });

  elements.videoFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file, 'video');
  });

  elements.documentFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file, 'document');
  });

  elements.audioFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file, 'audio');
  });

  // Voice recording
  elements.voiceBtn.addEventListener("mousedown", startVoiceRecording);
  elements.voiceBtn.addEventListener("mouseup", stopVoiceRecording);
  elements.voiceBtn.addEventListener("mouseleave", stopVoiceRecording);
  elements.voiceBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startVoiceRecording();
  });
  elements.voiceBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    stopVoiceRecording();
  });

  elements.cancelVoiceBtn.addEventListener("click", cancelVoiceRecording);
  elements.sendVoiceBtn.addEventListener("click", () => {
    stopVoiceRecording();
  });

  // Business options
  elements.businessToggleBtn.addEventListener("click", showBusinessOptions);
  elements.closeBusinessBtn.addEventListener("click", hideAllMenus);

  elements.interactiveBtn.addEventListener("click", () => {
    setupBusinessMessage('interactive');
  });

  elements.listBtn.addEventListener("click", () => {
    setupBusinessMessage('list');
  });

  elements.locationBtn.addEventListener("click", () => {
    setupBusinessMessage('location');
  });

  elements.productBtn.addEventListener("click", () => {
    setupBusinessMessage('product');
  });

  // Chat search
  elements.chatSearchInput.addEventListener("input", () => {
    renderChats();
  });

  // Google AI API Key debounce for loading models
  let googleAiKeyTimeout;
  elements.googleAiApiKey.addEventListener("input", () => {
    clearTimeout(googleAiKeyTimeout);
    const apiKey = elements.googleAiApiKey.value.trim();
    
    if (apiKey.length > 10) { // Only trigger if API key seems complete
      googleAiKeyTimeout = setTimeout(() => {
        loadGoogleAIModels();
      }, 1500); // Wait 1.5 seconds after user stops typing
    }
  });

  // Refresh chats
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

  // AI Configuration Modal
  elements.aiConfigBtn.addEventListener("click", showAiConfigModal);
  elements.closeAiConfigBtn.addEventListener("click", hideAiConfigModal);
  elements.cancelAiConfigBtn.addEventListener("click", hideAiConfigModal);
  elements.saveAiConfigBtn.addEventListener("click", saveAiConfig);
  elements.testChatSendBtn.addEventListener("click", sendTestMessage);
  elements.testChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendTestMessage();
    }
  });
  elements.testGoogleAiBtn.addEventListener("click", testGoogleAiConnection);

  // AI Toggle
  elements.aiToggleBtn.addEventListener("click", toggleAI);

  // AI Provider switch
  elements.aiProviderRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      switchAiProvider(e.target.value);
    });
  });

  // Close menus when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest('.message-composer') && !event.target.closest('.modal')) {
      hideAllMenus();
    }
  });

  // Auto-start session
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

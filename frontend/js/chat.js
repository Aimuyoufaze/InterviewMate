/**
 * chat.js — Main Agent 对话视图
 */
import { API_BASE as API, getApiKeyHeaders } from './shared/config.js';
import { state } from './shared/state.js';
import { getStorage, setStorage } from './shared/storage.js';
import { getLanguage, applyLanguage, t } from './shared/i18n.js';
import { showToast } from './shared/toast.js';

let isFirstVisit = false;

// ══════════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════════

async function initChat() {
  applyLanguage();

  // 检查是否首次对话
  const hasChatted = getStorage('hasChatted', false);
  isFirstVisit = !hasChatted;

  // 从 localStorage 加载历史
  state.chatMessages = getStorage('chatMessages', []);

  renderMessages();
  setupChatListeners();

  // 首次对话 → 触发引导消息
  if (state.chatMessages.length === 0 && !getStorage('hasChatted', false)) {
    isFirstVisit = true;
    sendFirstMessage();
  }

  window.addEventListener('languagechanged', () => {
    const input = document.getElementById('chatMessageInput');
    if (input) input.placeholder = t('chat.placeholder');
  });
}

function setupChatListeners() {
  document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);
  document.getElementById('chatMessageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  document.getElementById('clearChatBtn').addEventListener('click', clearChat);
}

// ══════════════════════════════════════════════════
// 消息发送
// ══════════════════════════════════════════════════

async function sendFirstMessage() {
  // 构造空消息触发 Agent 的首次引导
  try {
    const reply = await callAgent([]);
    state.chatMessages.push({ role: 'assistant', content: reply });
    setStorage('chatMessages', state.chatMessages);
    setStorage('hasChatted', true);
    isFirstVisit = false;
    renderMessages();
  } catch (e) {
    // 降级：显示预设欢迎消息
    const welcome = t('chat.welcome');
    state.chatMessages.push({ role: 'assistant', content: welcome });
    setStorage('chatMessages', state.chatMessages);
    setStorage('hasChatted', true);
    isFirstVisit = false;
    renderMessages();
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chatMessageInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  state.chatMessages.push({ role: 'user', content: text });
  renderMessages();

  const btn = document.getElementById('chatSendBtn');
  btn.disabled = true;
  input.disabled = true;

  // 构建发往后端的消息列表（只发 role + content）
  const payload = state.chatMessages.map(m => ({ role: m.role, content: m.content }));

  try {
    const reply = await callAgent(payload);
    state.chatMessages.push({ role: 'assistant', content: reply });
    setStorage('chatMessages', state.chatMessages);
    if (!getStorage('hasChatted', false)) {
      setStorage('hasChatted', true);
      isFirstVisit = false;
    }
    renderMessages();
  } catch (e) {
    state.chatMessages.push({ role: 'assistant', content: `[${t('msg.error_prefix')}${e.message}]` });
    renderMessages();
  } finally {
    btn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

async function callAgent(messages) {
  // 加载简历和背景文件内容
  let resumeContent = '';
  let backgroundContent = '';
  try {
    const [resumeRes, bgRes] = await Promise.all([
      fetch(`${API}/api/resume`),
      fetch(`${API}/api/background`)
    ]);
    const resumeData = await resumeRes.json();
    const bgData = await bgRes.json();
    if (resumeData.has_resume) resumeContent = resumeData.preview || '';
    if (bgData.has_background) backgroundContent = bgData.preview || '';
  } catch (e) {
    // 静默忽略
  }

  // 构建 agent_profile
  const agentProfile = state.userProfile.agentCustomPrompt
    ? { prompt: state.userProfile.agentCustomPrompt }
    : null;

  const res = await fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      getApiKeyHeaders()
    ),
    body: JSON.stringify({
      messages,
      language: getLanguage(),
      agent_profile: agentProfile,
      resume_content: resumeContent,
      background_content: backgroundContent,
      user_name: state.userProfile.name || '',
      is_first_visit: isFirstVisit
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || '请求失败');
  }

  const data = await res.json();
  return data.reply;
}

function clearChat() {
  if (!confirm(t('chat.clear_confirm'))) return;
  state.chatMessages = [];
  setStorage('chatMessages', []);
  setStorage('hasChatted', false);
  isFirstVisit = true;
  renderMessages();

  // 重新触发首次引导
  setTimeout(() => sendFirstMessage(), 300);
  showToast(t('chat.cleared'), 'success');
}

// ══════════════════════════════════════════════════
// 渲染
// ══════════════════════════════════════════════════

function renderMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  if (state.chatMessages.length === 0) {
    container.innerHTML = `
      <div class="welcome-hero">
        <span class="eyebrow">Interview Mate</span>
        <h2 data-i18n="chat.title">Interview Mate</h2>
        <p>${t('chat.subtitle')}</p>
      </div>`;
    return;
  }

  container.innerHTML = state.chatMessages.map(m => {
    const isUser = m.role === 'user';
    return `
      <div class="message ${isUser ? 'candidate' : 'interviewer'}">
        <div class="bubble">
          <div class="label">${isUser ? (state.userProfile.name || t('msg.you')) : 'Interview Mate'}</div>
          ${escapeHtml(m.content)}
        </div>
      </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

document.addEventListener('DOMContentLoaded', initChat);

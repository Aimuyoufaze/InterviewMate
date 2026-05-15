/**
 * interview.js — 模拟面试 Active 子视图
 */
import { API_BASE as API, getApiKeyHeaders } from './shared/config.js';
import { state } from './shared/state.js';
import { getLanguage, applyLanguage, t } from './shared/i18n.js';
import { showToast } from './shared/toast.js';
import { showFeedback } from './sidebar.js';

let mediaRecorder = null;
let recordingStream = null;
let isRecording = false;

// ══════════════════════════════════════════════════
// 初始化（由 setup.js 调用）
// ══════════════════════════════════════════════════

export async function initInterview(config) {
  applyLanguage();

  state.personaId = config.personaId;
  state.personaName = config.personaName;
  state.field = config.field;

  setupInterviewListeners();
  setupSpeechInput();
  await startInterview(config);
}

// ══════════════════════════════════════════════════
// 事件绑定
// ══════════════════════════════════════════════════

function setupInterviewListeners() {
  // 结束面试
  document.getElementById('endBtn').addEventListener('click', endInterview);

  // 发送消息
  document.getElementById('sendBtn').addEventListener('click', sendMessage);

  // 语音
  document.getElementById('micBtn').addEventListener('click', toggleMic);

  // 回车发送
  const input = document.getElementById('messageInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ══════════════════════════════════════════════════
// 面试流程
// ══════════════════════════════════════════════════

async function startInterview(config) {
  const btn = document.getElementById('endBtn');
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/api/interview/start`, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        getApiKeyHeaders()
      ),
      body: JSON.stringify({
        persona_id: config.personaId,
        persona_name: config.personaName,
        field: config.field,
        language: config.language || getLanguage()
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    state.sessionId = data.session_id;
    state.isInterviewing = true;

    document.getElementById('chatStatus').style.display = 'flex';
    document.getElementById('interviewInputArea').style.display = 'flex';

    updateStatus(t('status.interviewing'), 'dot');
    setInputEnabled(true);
    document.getElementById('messageInput').focus();

    addMessage('interviewer', data.question);
  } catch (e) {
    alert((getLanguage() === 'en' ? 'Failed to start interview: ' : '启动面试失败：') + e.message);
  } finally {
    btn.disabled = false;
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || !state.sessionId) return;

  input.value = '';
  addMessage('candidate', text);

  setInputEnabled(false);
  updateStatus(t('status.thinking'), 'pending');

  try {
    const res = await fetch(`${API}/api/interview/respond`, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        getApiKeyHeaders()
      ),
      body: JSON.stringify({ session_id: state.sessionId, message: text })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    addMessage('interviewer', data.question);
    updateStatus(t('status.interviewing'), 'dot');
  } catch (e) {
    addMessage('interviewer', `${t('msg.error_prefix')}${e.message}${t('msg.error_retry')}`);
  } finally {
    setInputEnabled(true);
    input.focus();
  }
}

async function endInterview() {
  if (!state.sessionId) return;
  if (!confirm(t('confirm.end_interview'))) return;

  setInputEnabled(false);
  updateStatus(t('status.generating'), 'pending');

  document.getElementById('loadingModal').classList.add('show');

  try {
    const res = await fetch(`${API}/api/interview/end`, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        getApiKeyHeaders()
      ),
      body: JSON.stringify({ session_id: state.sessionId })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('loadingModal').classList.remove('show');
    showFeedback(data.feedback);
  } catch (e) {
    document.getElementById('loadingModal').classList.remove('show');
    alert((getLanguage() === 'en' ? 'Failed to generate report: ' : '生成报告失败：') + e.message);
    returnToSetup();
  }

  state.isInterviewing = false;
  state.sessionId = null;
  document.getElementById('interviewInputArea').style.display = 'none';
  document.getElementById('chatStatus').style.display = 'none';
}

function returnToSetup() {
  state.isInterviewing = false;
  state.sessionId = null;
  import('./setup.js').then(mod => mod.returnToSetup());
}

// ══════════════════════════════════════════════════
// UI 辅助
// ══════════════════════════════════════════════════

function addMessage(role, text) {
  const container = document.getElementById('interviewMessages');
  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const base = role === 'interviewer'
    ? (state.personaName ? t('msg.interviewer_with') + state.personaName : t('msg.interviewer'))
    : t('msg.you');

  msg.innerHTML = `
    <div class="bubble">
      <div class="label">${base}</div>
      ${escapeHtml(text)}
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function setInputEnabled(enabled) {
  document.getElementById('messageInput').disabled = !enabled;
  document.getElementById('sendBtn').disabled = !enabled;
  document.getElementById('micBtn').disabled = !enabled;
}

function updateStatus(text, dotClass) {
  document.getElementById('statusText').textContent = text;
  const dot = document.getElementById('statusDot');
  dot.className = 'dot' + (dotClass ? ' ' + dotClass : '');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ══════════════════════════════════════════════════
// 语音输入（STT）
// ══════════════════════════════════════════════════

function setupSpeechInput() {
  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.title = getLanguage() === 'en' ? 'Record audio' : '录制语音';
}

function toggleMic() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  const micBtn = document.getElementById('micBtn');

  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''));
    mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : {});
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      recordingStream.getTracks().forEach(t => t.stop());
      recordingStream = null;

      if (chunks.length === 0) {
        micBtn.classList.remove('recording');
        isRecording = false;
        return;
      }

      micBtn.classList.remove('recording');
      micBtn.classList.add('processing');
      micBtn.textContent = '⏳';
      updateStatus(t('status.transcribing'), 'pending');

      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      try {
        const res = await fetch(`${API}/api/stt/transcribe`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || '转写失败');
        }
        const data = await res.json();
        const input = document.getElementById('messageInput');
        input.value = (input.value + data.text).trim();
        isRecording = false;
        if (input.value && state.isInterviewing && !document.getElementById('sendBtn').disabled) {
          sendMessage();
        }
      } catch (e) {
        showToast(t('toast.stt_fail') + e.message, 'error');
      } finally {
        micBtn.classList.remove('processing');
        micBtn.textContent = '🎤';
        micBtn.title = getLanguage() === 'en' ? 'Voice input' : '语音输入';
        updateStatus(t('status.interviewing'), 'dot');
      }
    };

    isRecording = true;
    micBtn.textContent = '⏹️';
    micBtn.classList.add('recording');
    micBtn.title = getLanguage() === 'en' ? 'Click to stop recording' : '点击停止录音';
    updateStatus(t('status.backend_recording'), 'pending');
    mediaRecorder.start();
  } catch (e) {
    showToast(t('toast.mic_unavail') + e.message, 'error');
  }
}

function stopRecording() {
  isRecording = false;
  const micBtn = document.getElementById('micBtn');
  const input = document.getElementById('messageInput');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    return;
  }

  micBtn.textContent = '🎤';
  micBtn.classList.remove('recording');
  micBtn.classList.remove('processing');
  micBtn.title = getLanguage() === 'en' ? 'Voice input' : '语音输入';
  input.placeholder = t('input.placeholder');

  if (input.value.trim() && state.isInterviewing && !document.getElementById('sendBtn').disabled) {
    sendMessage();
  }

  updateStatus(t('status.interviewing'), 'dot');
}

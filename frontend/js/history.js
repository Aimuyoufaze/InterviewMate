/**
 * history.js — 面试历史视图
 */
import { API_BASE as API } from './shared/config.js';
import { state } from './shared/state.js';
import { getLanguage, t } from './shared/i18n.js';
import { showToast } from './shared/toast.js';

// ══════════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════════

function initHistory() {
  loadHistoryList();
}

// ══════════════════════════════════════════════════
// 历史列表
// ══════════════════════════════════════════════════

async function loadHistoryList() {
  const container = document.getElementById('historyList');
  const detail = document.getElementById('historyDetail');
  container.style.display = '';
  detail.style.display = 'none';

  try {
    const res = await fetch(`${API}/api/history`);
    const data = await res.json();
    const sessions = data.sessions || [];
    state.historyList = sessions;

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="welcome-hero">
          <h2 data-i18n="history.title">${t('history.title')}</h2>
          <p style="white-space:pre-line">${t('history.empty')}</p>
        </div>`;
      return;
    }

    container.innerHTML = sessions.map(s => {
      const date = formatDate(s.ended_at || s.started_at || '');
      return `
        <div class="history-card" data-id="${s.id}">
          <div class="history-card-main">
            <div class="history-card-header">
              <span class="history-card-persona">🎓 ${escapeHtml(s.persona_name || s.persona_id)}</span>
              <span class="history-card-date">${date}</span>
            </div>
            <div class="history-card-field">${escapeHtml(s.field)} · ${s.total_rounds} ${t('history.rounds')}</div>
            <div class="history-card-preview">${escapeHtml(s.feedback_preview || '')}</div>
          </div>
          <div class="history-card-actions">
            <button class="btn btn-sm btn-outline history-view-btn" data-id="${s.id}">${t('history.view_detail')}</button>
            <button class="btn btn-sm btn-outline history-delete-btn" data-id="${s.id}" style="color:var(--red);border-color:#fecaca">${t('history.delete')}</button>
          </div>
        </div>`;
    }).join('');

    // 绑定事件
    container.querySelectorAll('.history-view-btn').forEach(btn => {
      btn.addEventListener('click', () => loadHistoryDetail(btn.dataset.id));
    });
    container.querySelectorAll('.history-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistory(btn.dataset.id);
      });
    });
    // 卡片点击也进入详情
    container.querySelectorAll('.history-card').forEach(card => {
      card.addEventListener('click', () => loadHistoryDetail(card.dataset.id));
    });
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-3)">❌ ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════════
// 历史详情
// ══════════════════════════════════════════════════

async function loadHistoryDetail(sessionId) {
  const container = document.getElementById('historyList');
  const detail = document.getElementById('historyDetail');
  container.style.display = 'none';
  detail.style.display = '';
  detail.innerHTML = `<div style="text-align:center;padding:40px;color:var(--ink-3)">⏳ ${t('detail.loading')}</div>`;

  try {
    const res = await fetch(`${API}/api/history/${sessionId}`);
    const data = await res.json();
    const session = data.session;
    if (!session) throw new Error('Not found');

    const lang = getLanguage();
    const date = formatDate(session.ended_at || '');

    detail.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:0 40px">
        <div style="margin-bottom:16px">
          <button class="btn btn-outline btn-sm" id="historyBackBtn">${t('history.back')}</button>
        </div>
        <div class="welcome-hero" style="margin-bottom:20px">
          <h2>🎓 ${escapeHtml(session.persona_name || session.persona_id)}</h2>
          <p>${escapeHtml(session.field)} · ${session.total_rounds} ${t('history.rounds')} · ${date}</p>
        </div>

        <div class="setup-section">
          <div class="num">💬</div>
          <div class="body">
            <h3>对话记录</h3>
            <div id="historyTranscript"></div>
          </div>
        </div>

        <div class="setup-section">
          <div class="num">📊</div>
          <div class="body">
            <h3 data-i18n="feedback.title">面试评估报告</h3>
            <pre style="white-space:pre-wrap;word-break:break-word;background:var(--paper);padding:16px;border-radius:8px;font-size:13px;line-height:1.7;color:var(--ink-2);border:1px solid var(--line)">${escapeHtml(session.feedback || '')}</pre>
          </div>
        </div>

        <div style="text-align:center;padding:16px">
          <button class="btn btn-outline" id="historyDownloadBtn">${t('feedback.download')}</button>
        </div>
      </div>
    `;

    // 渲染对话
    const transcript = document.getElementById('historyTranscript');
    (session.messages || []).forEach(msg => {
      const isInterviewer = msg.role === 'assistant';
      transcript.innerHTML += `
        <div class="message ${isInterviewer ? 'interviewer' : 'candidate'}">
          <div class="bubble">
            <div class="label">${isInterviewer ? t('msg.interviewer') : t('msg.you')}</div>
            ${escapeHtml(msg.content || '')}
          </div>
        </div>`;
    });

    document.getElementById('historyBackBtn').addEventListener('click', loadHistoryList);
    document.getElementById('historyDownloadBtn').addEventListener('click', () => {
      downloadHistoryReport(session);
    });

  } catch (e) {
    detail.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">❌ ${e.message}</div>`;
  }
}

function downloadHistoryReport(session) {
  const date = formatDate(session.ended_at || '');
  const content = `${t('download.header')}\n\n` +
    `${t('download.date')}${date}\n` +
    `${t('download.interviewer')}${session.persona_name || t('download.unknown')}\n` +
    `${t('download.field')}${session.field || t('download.unknown')}\n` +
    `${'='.repeat(40)}\n\n` +
    `${session.feedback || ''}`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-report-${(session.ended_at || '').slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('toast.downloaded'), 'success');
}

// ══════════════════════════════════════════════════
// 删除
// ══════════════════════════════════════════════════

async function deleteHistory(sessionId) {
  if (!confirm(t('history.delete_confirm'))) return;
  try {
    const res = await fetch(`${API}/api/history/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    showToast(t('history.deleted'), 'success');
    loadHistoryList();
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════
// 工具
// ══════════════════════════════════════════════════

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const lang = getLanguage();
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML.replace(/\n/g, '<br>');
}

// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initHistory);

/**
 * sidebar.js — 侧边栏导航 + 用户资料 + Agent 配置 + 全局初始化
 */
import { API_BASE as API } from './shared/config.js';
import { state } from './shared/state.js';
import { getStorage, setStorage } from './shared/storage.js';
import { getLanguage, setLanguage, toggleLanguage, applyLanguage, t } from './shared/i18n.js';
import { showToast } from './shared/toast.js';

// ══════════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════════

async function init() {
  applyLanguage();
  loadUserProfile();
  loadResumeStatus();
  setupEventListeners();

  window.addEventListener('languagechanged', () => {
    loadResumeStatus();
    updateSidebarUI();
  });

  // 首次访问 → 显示语言选择（仅 chat 页有此弹窗，其他页跳过）
  const langModal = document.getElementById('langModal');
  if (langModal) {
    const langChosen = getStorage('langChosen', false);
    if (!langChosen) {
      setTimeout(() => {
        langModal.classList.add('show');
      }, 300);
    }
  }
}

// ══════════════════════════════════════════════════
// 事件绑定
// ══════════════════════════════════════════════════

function setupEventListeners() {
  // 侧边栏导航 — MPA 整页跳转
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `/${btn.dataset.view}`;
    });
  });

  // 语言切换
  document.getElementById('langToggle')?.addEventListener('click', toggleLanguage);
  document.getElementById('langZhBtn')?.addEventListener('click', () => setLanguage('zh'));
  document.getElementById('langEnBtn')?.addEventListener('click', () => setLanguage('en'));

  // 侧边栏底部 — 编辑资料（所有页面共享）
  document.getElementById('sidebarProfileBtn')?.addEventListener('click', openProfileModal);
  document.getElementById('profileSaveBtn')?.addEventListener('click', saveProfile);
  document.getElementById('profileCloseBtn')?.addEventListener('click', () => {
    document.getElementById('profileModal')?.classList.remove('show');
  });
  document.getElementById('profileResumeUploadBtn')?.addEventListener('click', () => {
    document.getElementById('profileResumeInput')?.click();
  });
  document.getElementById('profileResumeInput')?.addEventListener('change', handleProfileResume);

  // 侧边栏底部 — 配置 Agent（所有页面共享）
  document.getElementById('sidebarAgentBtn')?.addEventListener('click', openAgentModal);
  document.getElementById('agentSaveBtn')?.addEventListener('click', saveAgentConfig);
  document.getElementById('agentCloseBtn')?.addEventListener('click', () => {
    document.getElementById('agentModal')?.classList.remove('show');
  });
  document.querySelectorAll('.agent-preset').forEach(btn => {
    btn.addEventListener('click', () => selectAgentPreset(btn.dataset.profile));
  });

  // 设置弹窗 — 仅 interview 页
  document.getElementById('settingsCloseBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('show');
  });
  document.getElementById('settingsBgUploadBtn')?.addEventListener('click', () => {
    document.getElementById('settingsFileInput')?.click();
  });
  document.getElementById('settingsFileInput')?.addEventListener('change', handleSettingsFile);
  document.getElementById('settingsDeleteBg')?.addEventListener('click', deleteBackgroundFile);
  document.getElementById('settingsResumeUploadBtn')?.addEventListener('click', () => {
    document.getElementById('settingsResumeInput')?.click();
  });
  document.getElementById('settingsResumeInput')?.addEventListener('change', handleSettingsResume);
  document.getElementById('settingsDeleteResume')?.addEventListener('click', deleteSettingsResume);

  // 导师详情弹窗 — 仅 interview 页
  document.getElementById('personaDetailCloseBtn')?.addEventListener('click', () => {
    document.getElementById('personaDetailModal')?.classList.remove('show');
  });

  // 反馈弹窗 — 仅 interview 页
  document.getElementById('downloadSummaryBtn')?.addEventListener('click', downloadSummary);
  const feedbackCloseBtn = document.querySelector('#feedbackModal .feedback-close-btn');
  if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', closeFeedback);
}

// ══════════════════════════════════════════════════
// 用户资料
// ══════════════════════════════════════════════════

function loadUserProfile() {
  const profile = getStorage('userProfile', { name: '', agentProfileId: 'friendly', agentCustomPrompt: '' });
  state.userProfile = profile;
  updateSidebarUI();
}

function updateSidebarUI() {
  // 名字
  const name = state.userProfile.name || 'User';
  document.getElementById('sidebarUserName').textContent = name;
  document.getElementById('sidebarAvatar').textContent = name === 'User' ? '👤' : name.charAt(0);
}

async function loadResumeStatus() {
  try {
    const res = await fetch(`${API}/api/resume`);
    const data = await res.json();
    const el = document.getElementById('sidebarResumeStatus');
    if (data.has_resume) {
      el.textContent = t('sidebar.resume_ok');
      el.style.color = '#16A34A';
    } else {
      el.textContent = t('sidebar.resume_status');
      el.style.color = '';
    }
    // 同步更新 profile 弹窗
    const profileStatus = document.getElementById('profileResumeStatus');
    if (profileStatus) {
      profileStatus.textContent = data.has_resume ? `✅ ${data.filename}` : t('settings.resume_none');
    }
  } catch (e) {
    // 忽略
  }
}

function openProfileModal() {
  document.getElementById('profileNameInput').value = state.userProfile.name || '';
  document.getElementById('profileModal').classList.add('show');
  loadResumeStatus();
}

function saveProfile() {
  state.userProfile.name = document.getElementById('profileNameInput').value.trim();
  setStorage('userProfile', state.userProfile);
  updateSidebarUI();
  document.getElementById('profileModal').classList.remove('show');
  showToast(t('profile.saved'), 'success');
}

async function handleProfileResume(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/api/resume/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || '上传失败');
    }
    showToast(t('toast.resume_success'), 'success');
    loadResumeStatus();
  } catch (e) {
    showToast(t('toast.upload_fail') + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════
// Agent 配置
// ══════════════════════════════════════════════════

const AGENT_PRESET_PROMPTS = {
  friendly: '你是一位友善、温暖的面试备考陪伴助手。你的角色是：\n- 用鼓励和支持的语气与用户交流\n- 耐心解答面试准备相关的问题\n- 在用户紧张或焦虑时给予安慰和建议\n- 分享面试技巧和经验，但保持轻松的氛围\n- 像一位有经验的朋友一样陪伴用户的备考旅程',
  strict: '你是一位严格、专业的面试备考导师。你的角色是：\n- 用高标准要求用户，不轻易给出"不错"的评价\n- 锐利地指出用户思路中的问题和逻辑漏洞\n- 给出具体、可操作的改进建议\n- 推动用户走出舒适区，挑战更高难度\n- 像一位严厉但真正关心学生成长的导师',
  wise: '你是一位睿智、博学的学术导师。你的角色是：\n- 引经据典、深入浅出地解答问题\n- 启发用户从多角度思考问题\n- 分享学术界的思维方式和文化\n- 在回答中融入学科前沿动态和方法论\n- 像一位德高望重的教授一样循循善诱',
};

async function openAgentModal() {
  const profile = state.userProfile;

  // 高亮当前预设
  document.querySelectorAll('.agent-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.profile === profile.agentProfileId);
  });

  // 填充自定义 prompt
  const prompt = profile.agentCustomPrompt || AGENT_PRESET_PROMPTS[profile.agentProfileId] || '';
  document.getElementById('agentCustomPrompt').value = prompt;

  // 查询服务器 Key 状态
  let hasServerKey = false;
  try {
    const res = await fetch(`${API}/api/config/status`);
    const data = await res.json();
    hasServerKey = data.has_server_key;
  } catch (e) { /* ignore */ }

  // 填充 API Key
  const apiKeyInput = document.getElementById('agentApiKey');
  const clearKeyBtn = document.getElementById('agentClearKeyBtn');
  const keyLabel = document.querySelector('label[data-i18n="agent.api_key_label"]');
  const keyHint = document.getElementById('agentKeyHint');

  if (profile.deepseekApiKey) {
    // 用户配置了个人 Key → 优先使用
    apiKeyInput.value = profile.deepseekApiKey;
    clearKeyBtn.style.display = 'inline-block';
    if (keyLabel) {
      keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#16A34A;font-weight:400">' + t('agent.key_source_user') + '</span>';
    }
    if (keyHint) {
      keyHint.textContent = t('agent.key_user_active');
      keyHint.style.color = '#16A34A';
    }
  } else if (hasServerKey) {
    // 用户未配置，服务器有默认 Key
    apiKeyInput.value = '';
    clearKeyBtn.style.display = 'none';
    if (keyLabel) {
      keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#B45309;font-weight:400">' + t('agent.key_source_server') + '</span>';
    }
    if (keyHint) {
      keyHint.textContent = t('agent.key_server_hint');
      keyHint.style.color = '#B45309';
    }
  } else {
    // 没有任何 Key 可用
    apiKeyInput.value = '';
    clearKeyBtn.style.display = 'none';
    if (keyLabel) {
      keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#DC2626;font-weight:400">' + t('agent.key_source_none') + '</span>';
    }
    if (keyHint) {
      keyHint.textContent = t('agent.key_none_hint');
      keyHint.style.color = '#DC2626';
    }
  }

  document.getElementById('agentBaseUrl').value = profile.deepseekBaseUrl || '';

  // 清除按钮 → 回退到服务器默认
  clearKeyBtn.onclick = (e) => {
    e.preventDefault();
    apiKeyInput.value = '';
    profile.deepseekApiKey = '';
    clearKeyBtn.style.display = 'none';
    if (keyLabel) {
      if (hasServerKey) {
        keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#B45309;font-weight:400">' + t('agent.key_source_server') + '</span>';
      } else {
        keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#DC2626;font-weight:400">' + t('agent.key_source_none') + '</span>';
      }
    }
    if (keyHint) {
      if (hasServerKey) {
        keyHint.textContent = t('agent.key_server_hint');
        keyHint.style.color = '#B45309';
      } else {
        keyHint.textContent = t('agent.key_none_hint');
        keyHint.style.color = '#DC2626';
      }
    }
  };

  // 输入时更新状态
  apiKeyInput.oninput = () => {
    if (apiKeyInput.value) {
      clearKeyBtn.style.display = 'inline-block';
      if (keyLabel) {
        keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#16A34A;font-weight:400">' + t('agent.key_source_user') + '</span>';
      }
      if (keyHint) {
        keyHint.textContent = t('agent.key_user_active');
        keyHint.style.color = '#16A34A';
      }
    } else {
      clearKeyBtn.style.display = 'none';
      if (keyLabel) {
        if (hasServerKey) {
          keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#B45309;font-weight:400">' + t('agent.key_source_server') + '</span>';
        } else {
          keyLabel.innerHTML = t('agent.api_key_label') + ' <span style="color:#DC2626;font-weight:400">' + t('agent.key_source_none') + '</span>';
        }
      }
      if (keyHint) {
        if (hasServerKey) {
          keyHint.textContent = t('agent.key_server_hint');
          keyHint.style.color = '#B45309';
        } else {
          keyHint.textContent = t('agent.key_none_hint');
          keyHint.style.color = '#DC2626';
        }
      }
    }
  };

  document.getElementById('agentModal').classList.add('show');
}

function selectAgentPreset(profileId) {
  document.querySelectorAll('.agent-preset').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.profile === profileId);
  });
  state.userProfile.agentProfileId = profileId;
  document.getElementById('agentCustomPrompt').value = AGENT_PRESET_PROMPTS[profileId] || '';
}

function saveAgentConfig() {
  state.userProfile.agentProfileId = document.querySelector('.agent-preset.active')?.dataset?.profile || 'friendly';
  state.userProfile.agentCustomPrompt = document.getElementById('agentCustomPrompt').value.trim();
  // HTTP headers only allow ASCII, strip non-ASCII characters
  state.userProfile.deepseekApiKey = document.getElementById('agentApiKey').value.trim().replace(/[^\x00-\x7F]/g, '');
  state.userProfile.deepseekBaseUrl = document.getElementById('agentBaseUrl').value.trim().replace(/[^\x00-\x7F]/g, '');
  setStorage('userProfile', state.userProfile);
  document.getElementById('agentModal').classList.remove('show');
  showToast(t('agent.saved'), 'success');
}

// ══════════════════════════════════════════════════
// 设置弹窗 — 背景文件 / 简历
// ══════════════════════════════════════════════════

export function openSettings() {
  updateSettingsUI();
  document.getElementById('settingsModal').classList.add('show');
}

async function updateSettingsUI() {
  try {
    const res = await fetch(`${API}/api/background`);
    const data = await res.json();
    const bgInfo = document.getElementById('settingsBgInfo');
    const deleteBtn = document.getElementById('settingsDeleteBg');

    if (data.has_background) {
      bgInfo.innerHTML = `<div class="file-info"><span>📄 ${data.filename}</span><span style="color:var(--ink-4);font-size:12px">(${data.text_length} 字符)</span></div>`;
      deleteBtn.style.display = 'inline-block';
    } else {
      bgInfo.innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:10px 0">' + t('settings.bg_none') + '</div>';
      deleteBtn.style.display = 'none';
    }
  } catch (e) {
    document.getElementById('settingsBgInfo').innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:10px 0">' + t('settings.query_fail') + '</div>';
  }

  const personaInfo = document.getElementById('settingsPersonaInfo');
  if (state.personaName) {
    personaInfo.innerHTML = `<span class="bg-badge">${state.personaName}</span>`;
  } else {
    personaInfo.innerHTML = '<span style="font-size:13px;color:var(--ink-4)">' + t('settings.persona_none') + '</span>';
  }

  try {
    const res = await fetch(`${API}/api/resume`);
    const data = await res.json();
    const resumeInfo = document.getElementById('settingsResumeInfo');
    const deleteBtn = document.getElementById('settingsDeleteResume');

    if (data.has_resume) {
      resumeInfo.innerHTML = `<div class="file-info"><span>📄 ${data.filename}</span><span style="color:var(--ink-4);font-size:12px">(${data.text_length} ${getLanguage() === 'en' ? 'chars' : '字符'})</span></div>`;
      deleteBtn.style.display = 'inline-block';
    } else {
      resumeInfo.innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:10px 0">' + t('settings.resume_none') + '</div>';
      deleteBtn.style.display = 'none';
    }
  } catch (e) {
    document.getElementById('settingsResumeInfo').innerHTML = '<div style="font-size:13px;color:var(--ink-4);padding:10px 0">' + t('settings.query_fail') + '</div>';
  }
}

async function handleSettingsFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/api/background/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || '上传失败');
    }
    const data = await res.json();
    state.backgroundFileName = data.filename;
    showToast(t('settings.bg_success') + data.filename, 'success');
    updateSettingsUI();
  } catch (e) {
    showToast(t('toast.upload_fail') + e.message, 'error');
  }
  event.target.value = '';
}

async function deleteBackgroundFile() {
  if (!confirm(t('settings.bg_confirm_delete'))) return;
  try {
    const res = await fetch(`${API}/api/background`, { method: 'DELETE' });
    if (!res.ok) throw new Error(t('toast.delete_fail'));
    state.backgroundFileName = null;
    showToast(t('settings.bg_deleted'), 'success');
    updateSettingsUI();
  } catch (e) {
    showToast(t('toast.delete_fail') + e.message, 'error');
  }
}

async function handleSettingsResume(event) {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/api/resume/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || t('toast.upload_fail'));
    }
    showToast(t('settings.resume_success'), 'success');
    updateSettingsUI();
    loadResumeStatus();
  } catch (e) {
    showToast(t('toast.upload_fail') + e.message, 'error');
  }
}

async function deleteSettingsResume() {
  if (!confirm(t('settings.resume_confirm_delete'))) return;
  try {
    const res = await fetch(`${API}/api/resume`, { method: 'DELETE' });
    if (!res.ok) throw new Error(t('toast.resume_delete_fail'));
    showToast(t('settings.resume_deleted'), 'success');
    updateSettingsUI();
    loadResumeStatus();
  } catch (e) {
    showToast(t('toast.delete_fail') + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════
// 反馈弹窗（全局）
// ══════════════════════════════════════════════════

let _lastFeedback = '';

export function showFeedback(feedback) {
  _lastFeedback = feedback;
  document.getElementById('feedbackContent').textContent = feedback;
  document.getElementById('feedbackModal').classList.add('show');
}

function closeFeedback() {
  document.getElementById('feedbackModal').classList.remove('show');
}

function downloadSummary() {
  if (!_lastFeedback) {
    showToast(t('feedback.no_data'), 'error');
    return;
  }

  const now = new Date();
  const lang = getLanguage();
  const timestamp = now.toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', { timeZone: 'Asia/Shanghai' });
  const content = `${t('download.header')}\n\n` +
    `${t('download.date')}${timestamp}\n` +
    `${t('download.interviewer')}${state.personaName || t('download.unknown')}\n` +
    `${t('download.field')}${state.field || t('download.unknown')}\n` +
    `${'='.repeat(40)}\n\n` +
    `${_lastFeedback}`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-report-${now.toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('toast.downloaded'), 'success');
}

// ══════════════════════════════════════════════════
// 启动
// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', init);

/**
 * setup.js — 模拟面试 Setup 子视图
 */
import { API_BASE as API, getApiKeyHeaders } from './shared/config.js';
import { state } from './shared/state.js';
import { getStorage, setStorage } from './shared/storage.js';
import { getLanguage, applyLanguage, t } from './shared/i18n.js';
import { showToast } from './shared/toast.js';

// ══════════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════════

export function initSetup() {
  applyLanguage();
  loadPersonas();
  setupSetupListeners();
  loadResumeStatusInSetup();

  window.addEventListener('languagechanged', () => loadPersonas());

  // 当切换到 interview 视图且子状态为 setup 时,刷新列表
  window.addEventListener('viewchanged', (e) => {
    if (e.detail.view === 'interview' && state.interviewSubState === 'setup') {
      refreshSetupUI();
    }
  });
}

function refreshSetupUI() {
  loadPersonas();
  loadResumeStatusInSetup();
  restoreLastSelection();
}

async function restoreLastSelection() {
  const lastPersonaId = getStorage('lastPersonaId', null);
  const lastField = getStorage('lastField', null);

  if (lastPersonaId) {
    state.personaId = null;
    setTimeout(() => {
      const cards = document.querySelectorAll('#personaList .persona-card');
      let found = false;
      cards.forEach(c => {
        if (c.dataset.id === lastPersonaId) {
          selectPersona(lastPersonaId, c);
          found = true;
        }
      });
      if (!found) {
        const first = cards[0];
        if (first) selectPersona(first.dataset.id, first);
      }

      if (lastField) {
        const fieldSelect = document.getElementById('fieldSelect');
        for (let i = 0; i < fieldSelect.options.length; i++) {
          if (fieldSelect.options[i].value === lastField) {
            fieldSelect.selectedIndex = i;
            fieldSelect.dispatchEvent(new Event('change'));
            return;
          }
        }
        if (lastField) {
          fieldSelect.value = '其他（请自定义）';
          document.getElementById('customField').value = lastField;
          fieldSelect.dispatchEvent(new Event('change'));
        }
      }
    }, 200);
  }
}

// ══════════════════════════════════════════════════
// 事件绑定（仅 setup 相关）
// ══════════════════════════════════════════════════

function setupSetupListeners() {
  // 开始面试
  document.getElementById('startBtn').addEventListener('click', goToInterview);

  // 导师蒸馏
  document.getElementById('extractBtn').addEventListener('click', extractPersona);

  // 面试方向
  const fieldSelect = document.getElementById('fieldSelect');
  const customField = document.getElementById('customField');
  fieldSelect.addEventListener('change', () => {
    customField.style.display = fieldSelect.value === '其他（请自定义）' ? 'block' : 'none';
    if (fieldSelect.value === '__professor_field__') {
      customField.style.display = 'none';
    }
  });

  // 简历上传
  document.getElementById('resumeFileInput').addEventListener('change', handleResumeFile);
  const resumeInfo = document.getElementById('resumeInfo');
  if (resumeInfo) {
    const delBtn = resumeInfo.querySelector('button');
    if (delBtn) delBtn.addEventListener('click', deleteResume);
  }
}

// ══════════════════════════════════════════════════
// 面试官加载与渲染
// ══════════════════════════════════════════════════

async function loadPersonas() {
  try {
    const res = await fetch(`${API}/api/personas?language=${getLanguage()}`);
    const data = await res.json();
    renderPersonas(data.personas);
  } catch (e) {
    console.error('加载面试官列表失败', e);
    const lang = getLanguage();
    const defaults = {
      strict: { id:'strict', name: lang === 'en' ? 'Strict' : '严厉型', description: lang === 'en' ? 'Demanding and detail-oriented' : '要求严格喜欢追问细节', type:'general', avatar_emoji:'😤' },
      gentle: { id:'gentle', name: lang === 'en' ? 'Gentle' : '温和型', description: lang === 'en' ? 'Encouraging and supportive' : '鼓励式引导', type:'general', avatar_emoji:'😊' },
      probing: { id:'probing', name: lang === 'en' ? 'Probing' : '追问型', description: lang === 'en' ? 'Follow-up questions drill deep' : '层层深入测试知识深度', type:'general', avatar_emoji:'🔍' },
      socratic: { id:'socratic', name: lang === 'en' ? 'Socratic' : '苏格拉底型', description: lang === 'en' ? 'Uses counter-questions' : '通过反问引导思考', type:'general', avatar_emoji:'🧠' }
    };
    renderPersonas(defaults);
  }
}

function renderPersonas(personas) {
  const container = document.getElementById('personaList');
  if (!container) return;
  container.innerHTML = '';

  const general = [];
  const extracted = [];
  Object.values(personas).forEach(p => {
    if (p.type === 'extracted') extracted.push(p);
    else general.push(p);
  });

  if (general.length) {
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.textContent = t('persona.general');
    container.appendChild(divider);
    general.forEach(p => container.appendChild(createPersonaCard(p, false)));
  }

  if (extracted.length) {
    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.textContent = t('persona.extracted');
    container.appendChild(divider);
    extracted.forEach(p => container.appendChild(createPersonaCard(p, true)));
  }

  const first = container.querySelector('.persona-card');
  if (first && !state.personaId) selectPersona(first.dataset.id, first);
}

function createPersonaCard(p, isExtracted) {
  const card = document.createElement('div');
  card.className = 'persona-card';
  card.dataset.id = p.id;
  card.dataset.type = isExtracted ? 'extracted' : 'general';
  card.dataset.researchAreas = isExtracted ? JSON.stringify(p.research_areas || []) : '[]';
  card.innerHTML = `
    <div class="emoji">${p.avatar_emoji || '🎭'}</div>
    <div class="info">
      <div class="name">${p.name}</div>
      <div class="desc">${p.description || ''}</div>
      ${isExtracted
        ? `<div class="tag">🎓 ${(p.research_areas || []).join(' · ')}</div>`
        : `<span class="tag">${t('persona.general_tag')}</span>`
      }
    </div>
    ${isExtracted ? `
      <div class="card-actions">
        <button class="btn btn-sm btn-outline detail-btn">📋</button>
        <button class="btn btn-sm btn-outline delete-btn" style="color:var(--strict);border-color:#fecaca">🗑️</button>
      </div>
    ` : ''}
  `;
  card.onclick = () => selectPersona(p.id, card);

  if (isExtracted) {
    card.querySelector('.detail-btn').onclick = (e) => { e.stopPropagation(); viewPersonaDetail(p.id); };
    card.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deletePersona(p.id, p.name); };
  }

  return card;
}

function selectPersona(id, el) {
  document.querySelectorAll('#personaList .persona-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  state.personaId = id;
  state.personaName = el ? el.querySelector('.name').textContent : id;

  const fieldSelect = document.getElementById('fieldSelect');
  const profOption = fieldSelect.querySelector('option[value="__professor_field__"]');
  const isExtracted = el && el.dataset.type === 'extracted';

  if (isExtracted && profOption) {
    profOption.style.display = 'block';
    try {
      state.currentResearchAreas = JSON.parse(el.dataset.researchAreas || '[]');
    } catch (e) {
      state.currentResearchAreas = [];
    }
    fieldSelect.value = '__professor_field__';
  } else if (profOption) {
    profOption.style.display = 'none';
    state.currentResearchAreas = [];
    if (fieldSelect.value === '__professor_field__') {
      fieldSelect.selectedIndex = 1;
    }
  }

  fieldSelect.dispatchEvent(new Event('change'));
}

// ══════════════════════════════════════════════════
// 转到面试
// ══════════════════════════════════════════════════

function goToInterview() {
  if (!state.personaId) { alert(t('error.select_persona')); return; }

  const fieldSelect = document.getElementById('fieldSelect');
  const customField = document.getElementById('customField');

  if (fieldSelect.value === '__professor_field__') {
    state.field = state.currentResearchAreas.length > 0
      ? state.currentResearchAreas.join(' / ')
      : '人工智能';
  } else {
    state.field = fieldSelect.value === '其他（请自定义）' ? customField.value.trim() : fieldSelect.value;
  }
  if (!state.field) { alert(t('error.select_field')); return; }

  setStorage('lastPersonaId', state.personaId);
  setStorage('lastField', state.field);

  // 切换到面试进行中
  state.interviewSubState = 'active';
  document.getElementById('interviewSetup').style.display = 'none';
  document.getElementById('interviewActive').style.display = '';

  // 动态导入 interview.js 并启动
  import('./interview.js').then(mod => {
    mod.initInterview({
      personaId: state.personaId,
      personaName: state.personaName,
      field: state.field,
      language: getLanguage()
    });
  });
}

// ══════════════════════════════════════════════════
// Persona 蒸馏
// ══════════════════════════════════════════════════

async function extractPersona() {
  const name = document.getElementById('extractName').value.trim();
  const affiliation = document.getElementById('extractAffil').value.trim();
  if (!name) { showToast(t('extract.no_name'), 'error'); return; }

  const btn = document.getElementById('extractBtn');
  btn.disabled = true;
  btn.textContent = t('extract.loading');

  try {
    const res = await fetch(`${API}/api/personas/extract`, {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        getApiKeyHeaders()
      ),
      body: JSON.stringify({ name, affiliation, language: getLanguage() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || t('extract.fail'));
    const p = data.persona;

    showToast(t('extract.success', { name: p.name }), 'success');
    await loadPersonas();
    state.extractedPersonas[p.id] = p;

    setTimeout(() => {
      const cards = document.querySelectorAll('#personaList .persona-card');
      cards.forEach(c => {
        if (c.dataset.id === p.id) selectPersona(p.id, c);
      });
    }, 100);
  } catch (e) {
    showToast(t('extract.fail') + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = t('step.extract.btn');
  }
}

// ══════════════════════════════════════════════════
// Persona 详情
// ══════════════════════════════════════════════════

async function viewPersonaDetail(id) {
  const modal = document.getElementById('personaDetailModal');
  const content = document.getElementById('personaDetailContent');
  content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-3)">⏳ ' + t('detail.loading') + '</div>';
  modal.classList.add('show');

  try {
    let p = state.extractedPersonas[id];
    if (!p) {
      const res = await fetch(`${API}/api/personas/${id}?language=${getLanguage()}`);
      const data = await res.json();
      p = data.persona;
    }

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--line)">
        <div style="font-size:48px">🎓</div>
        <div>
          <div style="font-size:20px;font-weight:700">${p.name}</div>
          <div style="color:var(--ink-3);font-size:14px">${p.title || t('detail.professor')} ${t('detail.at')} ${p.affiliation}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 12px;font-weight:600;width:100px;vertical-align:top;color:var(--ink-3)">${t('detail.research_areas')}</td>
          <td style="padding:10px 12px">${(p.research_areas || []).map(r => `<span style="display:inline-block;background:var(--paper);border:1px solid var(--line);padding:3px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:13px;color:var(--ink-2)">${r}</span>`).join('')}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom:1px solid var(--line)"></td></tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;vertical-align:top;color:var(--ink-3)">${t('detail.research_style')}</td>
          <td style="padding:10px 12px;color:var(--ink-2)">${p.research_style || t('detail.analyzing')}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom:1px solid var(--line)"></td></tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;vertical-align:top;color:var(--ink-3)">${t('detail.teaching_style')}</td>
          <td style="padding:10px 12px;color:var(--ink-2)">${p.teaching_style || t('detail.analyzing')}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom:1px solid var(--line)"></td></tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;vertical-align:top;color:var(--ink-3)">${t('detail.traits')}</td>
          <td style="padding:10px 12px">${(p.personality_traits || []).map(tr => `<span style="display:inline-block;background:#FEF3C7;border:1px solid #FDE68A;padding:3px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:13px;color:#92400E">${tr}</span>`).join('')}</td>
        </tr>
        <tr><td colspan="2" style="border-bottom:1px solid var(--line)"></td></tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;vertical-align:top;color:var(--ink-3)">${t('detail.questions')}</td>
          <td style="padding:10px 12px">
            <ol style="margin:0;padding-left:20px;font-size:13px">
              ${(p.typical_questions || []).map(q => `<li style="margin-bottom:4px;color:var(--ink-2)">${q}</li>`).join('')}
            </ol>
          </td>
        </tr>
      </table>

      <details style="margin-top:20px">
        <summary style="cursor:pointer;font-size:13px;color:var(--ink-4)">${t('detail.llm_prompt')}</summary>
        <pre style="background:var(--paper);padding:12px;border-radius:8px;font-size:12px;margin-top:8px;white-space:pre-wrap;word-break:break-word;color:var(--ink-2)">${(p.style_prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </details>
    `;
  } catch (e) {
    content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red)">${t('detail.load_fail')}${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════════
// 简历（Setup 内）
// ══════════════════════════════════════════════════

function handleResumeFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  uploadResumeInSetup(file);
}

async function uploadResumeInSetup(file) {
  const status = document.getElementById('resumeStatus');
  status.textContent = '⏳ 上传中...';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API}/api/resume/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || '上传失败');
    }
    const data = await res.json();

    document.getElementById('resumeStatus').textContent = getLanguage() === 'en' ? '✅ Uploaded' : '✅ 已上传';
    document.getElementById('resumeName').textContent = data.filename;
    document.getElementById('resumeInfo').style.display = '';
    showToast(t('toast.resume_success'), 'success');
  } catch (e) {
    document.getElementById('resumeStatus').textContent = '❌ ' + (getLanguage() === 'en' ? 'Upload failed' : '上传失败');
    showToast(t('toast.upload_fail') + e.message, 'error');
  }
}

async function deleteResume() {
  try {
    const res = await fetch(`${API}/api/resume`, { method: 'DELETE' });
    if (!res.ok) throw new Error(t('toast.resume_delete_fail'));
    document.getElementById('resumeStatus').textContent = t('step.resume.not_uploaded');
    document.getElementById('resumeInfo').style.display = 'none';
    document.getElementById('resumeFileInput').value = '';
    showToast(t('settings.resume_deleted'), 'success');
  } catch (e) {
    showToast(t('toast.delete_fail') + e.message, 'error');
  }
}

async function loadResumeStatusInSetup() {
  try {
    const res = await fetch(`${API}/api/resume`);
    const data = await res.json();
    if (data.has_resume) {
      const status = document.getElementById('resumeStatus');
      if (status) status.textContent = '✅ 已上传';
      const name = document.getElementById('resumeName');
      if (name) name.textContent = data.filename;
      const info = document.getElementById('resumeInfo');
      if (info) info.style.display = '';
    }
  } catch (e) {
    // 忽略
  }
}

// ══════════════════════════════════════════════════
// 删除导师
// ══════════════════════════════════════════════════

async function deletePersona(id, name) {
  if (!confirm(t('confirm.delete_persona', { name }))) return;
  try {
    const res = await fetch(`${API}/api/personas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || t('toast.delete_fail'));
    }
    showToast(t('confirm.delete_persona_done', { name }), 'success');
    await loadPersonas();
    if (state.personaId === id) {
      state.personaId = null;
      const firstCard = document.querySelector('#personaList .persona-card');
      if (firstCard) selectPersona(firstCard.dataset.id, firstCard);
    }
  } catch (e) {
    showToast('❌ 删除失败: ' + e.message, 'error');
  }
}

// ══════════════════════════════════════════════════
// 返回 Setup（从 interview.js 调用）
// ══════════════════════════════════════════════════

export function returnToSetup() {
  state.interviewSubState = 'setup';
  state.isInterviewing = false;
  state.sessionId = null;
  document.getElementById('interviewActive').style.display = 'none';
  document.getElementById('interviewSetup').style.display = '';
  refreshSetupUI();
}

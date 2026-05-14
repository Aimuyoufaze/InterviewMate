// API 地址：本地开发时连 8000 端口，生产环境下后端也托管前端（同域）
const API_BASE = (window.location.origin.includes('localhost') || window.location.hostname === '127.0.0.1')
  && !window.location.port.includes('8000')
  ? 'http://localhost:8000'
  : '';

function getApiKeyHeaders() {
  const headers = {};
  let profile;
  try {
    const raw = localStorage.getItem('interviewmate_userProfile');
    if (raw) profile = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  let key = (profile && profile.deepseekApiKey) || '';
  let url = (profile && profile.deepseekBaseUrl) || '';
  // HTTP headers only allow ASCII; strip non-ASCII chars
  key = key.replace(/[^\x00-\x7F]/g, '');
  url = url.replace(/[^\x00-\x7F]/g, '');
  if (key) headers['X-DeepSeek-API-Key'] = key;
  if (url) headers['X-DeepSeek-Base-URL'] = url;
  return headers;
}

export { API_BASE, getApiKeyHeaders };

// API 地址：本地开发时连 8000 端口，生产环境下后端也托管前端（同域）
const API_BASE = (window.location.origin.includes('localhost') || window.location.hostname === '127.0.0.1')
  && !window.location.port.includes('8000')
  ? 'http://localhost:8000'
  : '';

export { API_BASE };

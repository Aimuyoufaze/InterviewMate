function getStorage(key, defaultVal) {
  try {
    const val = localStorage.getItem('interviewmate_' + key);
    return val !== null ? JSON.parse(val) : defaultVal;
  } catch(e) {
    return defaultVal;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem('interviewmate_' + key, JSON.stringify(val));
  } catch(e) {}
}

function removeStorage(key) {
  try {
    localStorage.removeItem('interviewmate_' + key);
  } catch(e) {}
}

export { getStorage, setStorage, removeStorage };
window.getStorage = getStorage;
window.setStorage = setStorage;
window.removeStorage = removeStorage;

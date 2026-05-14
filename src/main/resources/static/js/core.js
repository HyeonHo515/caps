const pages = ['home', 'ai', 'code', 'board'];

function showPage(name) {
  pages.forEach(page => {
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.toggle('active', page === name);
  });

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const navEl = document.getElementById(`nav-${name}`);
  if (navEl) navEl.classList.add('active');

  if (name === 'ai' && typeof injectQuizUI === 'function') {
    setTimeout(injectQuizUI, 50);
  }
  if (name === 'board' && typeof renderBoard === 'function') {
    renderBoard();
  }

  window.scrollTo(0, 0);
}

function showToast(message, icon = 'OK') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  document.getElementById('toastMsg').textContent = message;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

let memoryStorage = {};

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return memoryStorage[key] || null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    memoryStorage[key] = value;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    delete memoryStorage[key];
  }
}

function getCurrentUserId() {
  return safeGetItem('codemind_user_id') || 'guest';
}

function openLogin() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('open');
}

function doLogin() {
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput?.value?.trim() || 'guest@codemind.local';
  safeSetItem('codemind_user_id', email);

  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('open');

  updateLoginButton();
  showToast(`${email} 계정으로 로그인되었습니다.`);

  if (typeof window.loadNotesFromApi === 'function') {
    window.loadNotesFromApi();
  }
  if (typeof loadStudyMemos === 'function') {
    loadStudyMemos();
  }
}

function logout() {
  safeRemoveItem('codemind_user_id');
  updateLoginButton();
  showToast('로그아웃되었습니다.');

  if (typeof window.loadNotesFromApi === 'function') {
    window.loadNotesFromApi();
  }
  if (typeof loadStudyMemos === 'function') {
    loadStudyMemos();
  }
}

function updateLoginButton() {
  const button = document.querySelector('.btn-login');
  if (!button) return;

  const userId = getCurrentUserId();
  if (userId === 'guest') {
    button.textContent = '로그인';
    button.onclick = openLogin;
    button.title = '';
  } else {
    button.textContent = userId.split('@')[0];
    button.onclick = logout;
    button.title = '클릭하면 로그아웃합니다';
  }
}

window.getCurrentUserId = getCurrentUserId;

document.addEventListener('DOMContentLoaded', () => {
  updateLoginButton();

  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.addEventListener('click', event => {
      if (event.target === loginModal) {
        loginModal.classList.remove('open');
      }
    });
  }
});

/* ═══════════════════════════════════════
   NEXAHOST — MAIN JS
   ═══════════════════════════════════════ */

// ── TOAST NOTIFICATIONS ──
let toastTimer;
function showToast(icon, msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent  = msg;
  clearTimeout(toastTimer);
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}
window.showToast = showToast;

// ── HAMBURGER MENU ──
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('open');
    }
  });
}

// ── NAVBAR SCROLL EFFECT ──
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.style.background = window.scrollY > 20
      ? 'rgba(5,5,10,.95)'
      : 'rgba(5,5,10,.85)';
  });
}

// ── AUTH HELPERS ──
function getToken()  { return localStorage.getItem('nh_token'); }
function getUser()   { return JSON.parse(localStorage.getItem('nh_user') || 'null'); }
function clearAuth() { localStorage.removeItem('nh_token'); localStorage.removeItem('nh_user'); }

function requireAuth(role) {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) {
    window.location.href = '/pages/login.html';
    return false;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === 'admin'
      ? '/pages/admin-dashboard.html'
      : '/pages/customer-dashboard.html';
    return false;
  }
  return true;
}
window.requireAuth = requireAuth;
window.getToken    = getToken;
window.getUser     = getUser;
window.clearAuth   = clearAuth;

// ── API HELPER ──
async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const BASE = window.API_BASE || 'http://localhost:5000/api';
  const res  = await fetch(`${BASE}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
window.apiCall = apiCall;

// ── LOGOUT ──
function logout() {
  clearAuth();
  window.location.href = '/';
}
window.logout = logout;

// ── TOAST HTML INJECTION ──
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('toast')) {
    const t = document.createElement('div');
    t.id = 'toast';
    t.innerHTML = '<span id="toast-icon"></span><span id="toast-msg"></span>';
    document.body.appendChild(t);
  }
});

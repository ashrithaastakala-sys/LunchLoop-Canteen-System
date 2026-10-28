/**
 * LunchLoop API Client & UI Utilities
 */

const API_BASE = '/api';

// Safe HTML Escaping to prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Toast Notifications
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="flex: 1; word-break: break-word;">${escapeHTML(message)}</div>
    <button style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.1rem; line-height:1;" aria-label="Close">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => toast.remove());

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// Token Storage
function getAuthToken() {
  const explicit = localStorage.getItem('lunchloop_token') || sessionStorage.getItem('lunchloop_token');
  if (explicit) return explicit;
  const activeRole = localStorage.getItem('lunchloop_active_role') || 'student';
  return activeRole === 'staff' ? 'staff-token' : 'student-token';
}

function setAuthToken(token, persist = true) {
  if (persist) {
    localStorage.setItem('lunchloop_token', token);
  } else {
    sessionStorage.setItem('lunchloop_token', token);
  }
}

function clearAuthToken() {
  localStorage.removeItem('lunchloop_token');
  sessionStorage.removeItem('lunchloop_token');
  localStorage.removeItem('lunchloop_user');
}

// Core Fetch Client
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || `Request failed with status ${response.status}`;
      const errorCode = data?.error?.code || 'REQUEST_FAILED';

      // If unauthorized on protected operation, notify
      if (response.status === 401 && !endpoint.includes('/me')) {
        showToast('Session error: please refresh the page', 'warning');
      }

      const err = new Error(errorMsg);
      err.status = response.status;
      err.code = errorCode;
      err.details = data?.error?.details || [];
      throw err;
    }

    return data;
  } catch (err) {
    if (!options.silent) {
      console.warn(`[API Error] ${endpoint}:`, err.message);
    }
    throw err;
  }
}

const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
};

window.escapeHTML = escapeHTML;
window.showToast = showToast;
window.getAuthToken = getAuthToken;
window.setAuthToken = setAuthToken;
window.clearAuthToken = clearAuthToken;
window.api = api;

/**
 * LunchLoop Client Session Manager (Zero-Barrier College Demo)
 * Users can immediately browse, order, manage kitchen, and view analytics.
 */

let currentUser = {
  id: '591d3bfb-86a3-41e0-a664-138811ffd8ca',
  display_name: 'Campus Student',
  role: 'student',
};

// Check stored role preference or default to student
try {
  const saved = localStorage.getItem('lunchloop_active_role');
  if (saved === 'staff') {
    currentUser = {
      id: '0eedc8a6-959b-4a11-a109-9b5793d9e3c6',
      display_name: 'Kitchen Staff',
      role: 'staff',
    };
  }
} catch (e) {}

function checkAuth() {
  updateNavAuthUI();
  return currentUser;
}

function updateNavAuthUI() {
  const authContainer = document.getElementById('navAuthContainer');
  if (!authContainer) return;

  const isStaff = currentUser.role === 'staff';

  authContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="badge ${isStaff ? 'badge-ready' : 'badge-veg'}" style="text-transform: capitalize; font-size:0.8rem; padding: 5px 10px;">
        ${isStaff ? '👨‍🍳 Staff View' : '🎓 Student View'}
      </span>
      <button class="btn btn-outline btn-sm" id="btnToggleRole" style="font-size:0.78rem; padding: 4px 8px;" title="Switch Role">
        Switch to ${isStaff ? 'Student' : 'Staff'}
      </button>
    </div>
  `;

  document.getElementById('btnToggleRole')?.addEventListener('click', () => {
    if (currentUser.role === 'staff') {
      currentUser = {
        id: '591d3bfb-86a3-41e0-a664-138811ffd8ca',
        display_name: 'Campus Student',
        role: 'student',
      };
      localStorage.setItem('lunchloop_active_role', 'student');
      showToast('Switched to Student Mode', 'info');
    } else {
      currentUser = {
        id: '0eedc8a6-959b-4a11-a109-9b5793d9e3c6',
        display_name: 'Kitchen Staff',
        role: 'staff',
      };
      localStorage.setItem('lunchloop_active_role', 'staff');
      showToast('Switched to Staff Mode', 'success');
    }
    updateNavAuthUI();
    window.location.reload();
  });

  // Keep all navigation links permanently accessible
  document.querySelectorAll('.staff-only-link').forEach(link => {
    link.style.display = 'inline-block';
  });
}

window.currentUser = currentUser;
window.checkAuth = checkAuth;

document.addEventListener('DOMContentLoaded', checkAuth);

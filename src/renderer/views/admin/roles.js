import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';
import { showToast, showModal, closeModal } from '../../app.js';

const ROLE_META = {
  admin: {
    icon: '👑', color: 'text-red-400',
    bg: 'bg-red-400/10', border: 'border-red-400/20',
    gradient: 'from-red-600/20 to-red-900/10',
  },
  manager: {
    icon: '🎯', color: 'text-cyan-400',
    bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    gradient: 'from-cyan-600/20 to-cyan-900/10',
  },
  employee: {
    icon: '🎨', color: 'text-purple-400',
    bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    gradient: 'from-purple-600/20 to-purple-900/10',
  },
};

export async function render(container) {
  setPageTitle('Manajemen Role');
  container.innerHTML = `
    <div class="space-y-5 max-w-3xl">
      <div>
        <h2 class="text-xl font-bold text-white">Manajemen Role</h2>
        <p class="text-studio-muted text-sm">
          Lihat deskripsi setiap role dan distribusi karyawan per role
        </p>
      </div>

      <div class="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <span class="text-yellow-400 text-lg flex-shrink-0">⚠️</span>
        <p class="text-sm text-studio-muted">
          Role sistem (<strong class="text-studio-text">admin, manager, employee</strong>)
          tidak dapat ditambah atau dihapus karena sudah terdefinisi di database.
          Yang bisa diubah adalah deskripsi label setiap role, dan assignment
          role ke karyawan dilakukan di menu <strong class="text-studio-text">Karyawan</strong>.
        </p>
      </div>

      <div id="roles-grid" class="space-y-4">
        ${[1,2,3].map(() => `<div class="skeleton h-36 rounded-xl"></div>`).join('')}
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-5">
        <h3 class="font-semibold text-white mb-4">Distribusi Karyawan per Role</h3>
        <div id="role-distribution" class="space-y-3">
          <div class="skeleton h-8 rounded-lg"></div>
          <div class="skeleton h-8 rounded-lg"></div>
          <div class="skeleton h-8 rounded-lg"></div>
        </div>
      </div>
    </div>`;

  await loadRoles();
}

async function loadRoles() {
  const { data: roleDescs } = await supabase.from('role_descriptions').select('*').order('id');
  const { data: profiles } = await supabase.from('profiles').select('role');

  const countByRole = (role) => profiles?.filter(p => p.role === role).length || 0;
  const totalUsers = profiles?.length || 0;

  const grid = document.getElementById('roles-grid');
  if (grid && roleDescs?.length) {
    grid.innerHTML = roleDescs.map(rd => {
      const meta  = ROLE_META[rd.role] || {};
      const count = countByRole(rd.role);

      return `
        <div class="bg-gradient-to-r ${meta.gradient} border ${meta.border} rounded-xl p-5">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 ${meta.bg} rounded-xl flex items-center justify-center text-2xl border ${meta.border}">
                ${meta.icon}
              </div>
              <div>
                <h3 class="font-bold text-white text-base">${rd.label}</h3>
                <span class="text-xs px-2.5 py-0.5 rounded-full font-mono ${meta.color} ${meta.bg} border ${meta.border}">
                  ${rd.role}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <p class="text-2xl font-bold ${meta.color}">${count}</p>
                <p class="text-xs text-studio-muted">pengguna</p>
              </div>
              <button data-action="edit-role" data-role="${rd.role}" data-label="${rd.label}" data-desc="${rd.description || ''}"
                class="p-2 ${meta.bg} hover:opacity-80 ${meta.color} border ${meta.border} rounded-lg transition-colors text-sm">
                ✏️
              </button>
            </div>
          </div>
          <p class="text-sm text-studio-muted">${rd.description || '—'}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            ${getRolePermissions(rd.role).map(p => `
              <span class="text-xs px-2 py-0.5 bg-black/20 rounded ${meta.color} border ${meta.border}">
                ${p}
              </span>`).join('')}
          </div>
        </div>`;
    }).join('');
  }

  const distEl = document.getElementById('role-distribution');
  if (distEl) {
    const roles = ['admin', 'manager', 'employee'];
    distEl.innerHTML = roles.map(role => {
      const meta  = ROLE_META[role] || {};
      const rd    = roleDescs?.find(r => r.role === role);
      const count = countByRole(role);
      const pct   = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;

      return `
        <div>
          <div class="flex items-center justify-between text-sm mb-1.5">
            <span class="flex items-center gap-2">
              <span>${meta.icon}</span>
              <span class="text-studio-text font-medium">${rd?.label || role}</span>
            </span>
            <span class="${meta.color} font-semibold">${count} orang (${pct}%)</span>
          </div>
          <div class="h-2.5 bg-studio-dark rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700 bg-gradient-to-r ${meta.gradient.replace('/20','/80').replace('/10','/60')} role-chart-bar"
                 data-percent="${pct}"></div>
          </div>
        </div>`;
    }).join('');

    distEl.querySelectorAll('.role-chart-bar').forEach(el => {
      const pct = Number(el.dataset.percent || 0);
      el.style.width = `${pct}%`;
    });
  }

  grid.querySelectorAll('button[data-action="edit-role"]').forEach(btn => {
    btn.addEventListener('click', () => {
      showEditRoleModal(btn.dataset.role, btn.dataset.label, btn.dataset.desc);
    });
  });
}

function getRolePermissions(role) {
  const perms = {
    admin: ['Lihat semua data', 'CRUD Karyawan', 'Monitor semua project', 'Audit Log', 'Kelola Divisi', 'Kelola Role'],
    manager: ['CRUD Project divisi', 'CRUD Task & Assign', 'Quality Control', 'Lihat tim divisi', 'Review & Revision'],
    employee: ['Lihat tugas sendiri', 'Kanban Board', 'Submit hasil kerja', 'Update status task', 'Edit profil'],
  };
  return perms[role] || [];
}

function showEditRoleModal(role, currentLabel, currentDesc) {
  const meta = ROLE_META[role] || {};
  showModal(`
    <div class="bg-studio-card border ${meta.border} rounded-2xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${meta.icon}</span>
          <div>
            <h3 class="text-lg font-bold text-white">Edit Deskripsi Role</h3>
            <span class="text-xs font-mono ${meta.color}">${role}</span>
          </div>
        </div>
        <button type="button" id="role-modal-close" class="text-studio-muted hover:text-white text-xl">✕</button>
      </div>

      <form id="role-form" class="space-y-4">
        <input type="hidden" id="role-key" value="${role}" />
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Label Tampilan</label>
          <input type="text" id="role-label" value="${currentLabel}"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Deskripsi</label>
          <textarea id="role-desc" rows="3"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors resize-none"
            placeholder="Deskripsi singkat tentang role ini...">${currentDesc}</textarea>
        </div>
        <p id="role-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3 pt-2">
          <button type="button" id="role-cancel-btn" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
          <button type="submit" id="role-submit-btn" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Simpan</button>
        </div>
      </form>
    </div>`);

  document.getElementById('role-modal-close')?.addEventListener('click', closeModal);
  document.getElementById('role-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('role-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('role-submit-btn');
    const errEl = document.getElementById('role-error');
    const key   = document.getElementById('role-key').value;
    const label = document.getElementById('role-label').value.trim();
    const desc  = document.getElementById('role-desc').value.trim();

    if (!label) return;
    btn.disabled = true; btn.textContent = 'Menyimpan...';

    const { error } = await supabase.from('role_descriptions').update({ label, description: desc }).eq('role', key);

    if (!error) {
      closeModal();
      showToast('Deskripsi role berhasil diperbarui!', 'success');
      await loadRoles();
    } else {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  });
}
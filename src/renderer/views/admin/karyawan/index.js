import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { AppState } from '../../../app.js';
import { showAddEmployeeModal } from './create.js';
import { showEditModal, showResetPwModal, confirmDeleteEmployee } from './edit.js';

// State internal khusus modul karyawan
let _divisions = [];

// Getter buat dilempar ke create.js & edit.js
export const getDivisions = () => _divisions;
export const setDivisions = (divs) => _divisions = divs;

export async function render(container) {
  setPageTitle('Manajemen Karyawan');
  container.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-bold text-white">Manajemen Karyawan</h2>
          <p class="text-studio-muted text-sm">Kelola seluruh akun pengguna studio</p>
        </div>
        <button id="btn-add-employee" 
          class="flex items-center gap-2 px-4 py-2 bg-studio-accent hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors">
          ＋ Tambah Pengguna
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-3 flex-wrap">
        <input type="text" id="search-karyawan" placeholder="Cari nama..."
          class="flex-1 min-w-48 px-4 py-2 bg-studio-card border border-studio-border rounded-lg text-studio-text text-sm placeholder-studio-muted/50 focus:border-studio-accent transition-colors" />
        <select id="filter-role" class="px-3 py-2 bg-studio-card border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
          <option value="">Semua Role</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
        <select id="filter-division" class="px-3 py-2 bg-studio-card border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
          <option value="">Semua Divisi</option>
        </select>
      </div>

      <!-- Table Container -->
      <div class="bg-studio-card border border-studio-border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-studio-border bg-studio-dark/50">
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Pengguna</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Role</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Divisi</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Status</th>
                <th class="text-right px-5 py-3 text-studio-muted font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody id="karyawan-tbody">
              ${[1, 2, 3, 4, 5].map(() => `
                <tr class="border-b border-studio-border/50">
                  <td colspan="5" class="px-5 py-4"><div class="skeleton h-8 rounded-lg"></div></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="px-5 py-3 border-t border-studio-border flex items-center justify-between">
          <span id="row-count" class="text-xs text-studio-muted">Memuat...</span>
        </div>
      </div>
    </div>`;

  // 1. Ambil data awal
  _divisions = await fetchDivisions();
  populateDivisionFilter(_divisions);
  await loadKaryawan();

  // 2. Pasang Event Listeners Statik (Cukup panggil 1x)
  document.getElementById('btn-add-employee').addEventListener('click', () => showAddEmployeeModal(_divisions));
  document.getElementById('search-karyawan').addEventListener('input', () => loadKaryawan());
  document.getElementById('filter-role').addEventListener('change', () => loadKaryawan());
  document.getElementById('filter-division').addEventListener('change', () => loadKaryawan());

  // 3. Event Delegation Table (Lebih rapi, ga perlu pake cloneNode)
  document.getElementById('karyawan-tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    const name   = btn.dataset.name;

    if (action === 'edit')       showEditModal(id, _divisions);
    if (action === 'reset-pw')   showResetPwModal(id, name);
    if (action === 'delete-emp') confirmDeleteEmployee(id, name);
  });
}

export async function fetchDivisions() {
  const { data } = await supabase.from('divisions').select('*').order('name');
  return data || [];
}

function populateDivisionFilter(divisions) {
  const sel = document.getElementById('filter-division');
  if (!sel) return;
  divisions.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

export async function loadKaryawan() {
  const search   = document.getElementById('search-karyawan')?.value?.toLowerCase() || '';
  const role     = document.getElementById('filter-role')?.value || '';
  const division = document.getElementById('filter-division')?.value || '';

  let query = supabase.from('profiles').select('*, divisions(name)').order('full_name');
  if (role)     query = query.eq('role', role);
  if (division) query = query.eq('division_id', division);

  const { data: employees, error } = await query;
  const tbody = document.getElementById('karyawan-tbody');
  if (!tbody) return;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-400">Gagal memuat data: ${error.message}</td></tr>`;
    return;
  }

  const filtered = search ? employees.filter(e => e.full_name?.toLowerCase().includes(search)) : employees;
  const countEl = document.getElementById('row-count');
  if (countEl) countEl.textContent = `${filtered.length} pengguna ditemukan`;

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-10 text-studio-muted">
          <span class="text-3xl block mb-2">👥</span>Tidak ada pengguna ditemukan.
        </td>
      </tr>`;
    return;
  }

  const ROLE_BADGE = {
    admin:    'bg-red-400/10 text-red-400 border border-red-400/20',
    manager:  'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20',
    employee: 'bg-purple-400/10 text-purple-400 border border-purple-400/20',
  };
  
  const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', employee: 'Artist' };

  tbody.innerHTML = filtered.map(emp => `
    <tr class="border-b border-studio-border/40 hover:bg-studio-border/20 transition-colors">
      <td class="px-5 py-3">
        <div class="flex items-center gap-3">
          ${emp.avatar_url
            ? `<img src="${emp.avatar_url}" class="w-9 h-9 rounded-full object-cover flex-shrink-0" />`
            : `<div class="w-9 h-9 rounded-full bg-studio-accent/30 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                 ${emp.full_name?.charAt(0)?.toUpperCase() || '?'}
               </div>`}
          <div>
            <p class="font-medium text-studio-text">${emp.full_name}</p>
            <p class="text-xs text-studio-muted flex items-center gap-1">
              ${emp.is_first_login ? '<span class="text-yellow-400">⚠️ Belum ganti password</span>' : '<span class="text-green-400">✓ Aktif</span>'}
            </p>
          </div>
        </div>
      </td>
      <td class="px-5 py-3">
        <span class="text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_BADGE[emp.role] || ROLE_BADGE.employee}">
          ${ROLE_LABEL[emp.role] || emp.role}
        </span>
      </td>
      <td class="px-5 py-3 text-studio-muted text-sm">${emp.divisions?.name || '—'}</td>
      <td class="px-5 py-3">
        <span class="flex items-center gap-1.5 text-xs w-fit px-2 py-1 rounded-full ${emp.is_online ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-studio-border text-studio-muted'}">
          <span class="w-1.5 h-1.5 rounded-full ${emp.is_online ? 'bg-green-400 animate-pulse' : 'bg-studio-muted'}"></span>
          ${emp.is_online ? 'Online' : 'Offline'}
        </span>
      </td>
      <td class="px-5 py-3">
        <div class="flex items-center justify-end gap-2">
          <button data-action="edit" data-id="${emp.id}" 
            class="px-3 py-1.5 text-xs bg-studio-border hover:bg-studio-accent/20 text-studio-text hover:text-studio-accent rounded-lg transition-colors">
            ✏️ Edit
          </button>
          ${emp.id !== AppState.user?.id ? `
            <button data-action="reset-pw" data-id="${emp.id}" data-name="${emp.full_name}" 
              class="px-3 py-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/20 transition-colors">
              🔑
            </button>
            <button data-action="delete-emp" data-id="${emp.id}" data-name="${emp.full_name}" 
              class="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors">
              🗑️
            </button>
          ` : `<span class="text-xs text-studio-muted px-2">(Akun Anda)</span>`}
        </div>
      </td>
    </tr>`).join('');
}
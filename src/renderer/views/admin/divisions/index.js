import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { showCreateDivisionModal } from './create.js';
import { showEditDivisionModal, confirmDeleteDivision } from './edit.js';

export async function render(container) {
  setPageTitle('Manajemen Divisi');
  container.innerHTML = `
    <div class="space-y-5 max-w-3xl">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white">Manajemen Divisi</h2>
          <p class="text-studio-muted text-sm">Kelola divisi/departemen yang ada di studio</p>
        </div>
        <button id="btn-add-division"
          class="flex items-center gap-2 px-4 py-2 bg-studio-accent
                 hover:bg-purple-700 text-white text-sm font-semibold
                 rounded-lg transition-colors">
          ＋ Tambah Divisi
        </button>
      </div>

      <div class="bg-studio-cyan/5 border border-studio-cyan/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <span class="text-studio-cyan text-lg flex-shrink-0">ℹ️</span>
        <p class="text-sm text-studio-muted">
          Divisi digunakan untuk mengelompokkan karyawan dan project.
          Menghapus divisi akan melepas relasi karyawan & project dari divisi tersebut.
        </p>
      </div>

      <div id="divisions-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[1,2,3,4].map(() => `<div class="skeleton h-28 rounded-xl"></div>`).join('')}
      </div>
    </div>`;

  document.getElementById('btn-add-division').addEventListener('click', () => showCreateDivisionModal());
  await loadDivisions();
}

export async function loadDivisions() {
  const { data: divisions, error } = await supabase.from('divisions').select('*').order('name');
  const { data: profiles } = await supabase.from('profiles').select('division_id').neq('role', 'admin');
  const { data: projects } = await supabase.from('projects').select('division_id');

  const countMembers  = (divId) => profiles?.filter(p => p.division_id === divId).length || 0;
  const countProjects = (divId) => projects?.filter(p => p.division_id === divId).length || 0;

  const grid = document.getElementById('divisions-grid');
  if (!grid) return;

  if (error || !divisions?.length) {
    grid.innerHTML = `
      <div class="col-span-2 text-center py-16 text-studio-muted bg-studio-card border border-studio-border rounded-xl">
        <span class="text-4xl block mb-3">🏢</span>Belum ada divisi. Tambahkan divisi pertama.
      </div>`;
    return;
  }

  grid.innerHTML = divisions.map(div => `
    <div class="bg-studio-card border border-studio-border rounded-xl p-5 studio-card-hover group">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-studio-accent/20 rounded-xl flex items-center justify-center text-xl">🏢</div>
          <div>
            <h3 class="font-semibold text-white">${div.name}</h3>
            <p class="text-xs text-studio-muted">Dibuat ${new Date(div.created_at).toLocaleDateString('id-ID')}</p>
          </div>
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button data-action="edit-division" data-id="${div.id}" data-name="${div.name}"
            class="p-1.5 bg-studio-border hover:bg-studio-accent/20 text-studio-muted hover:text-studio-accent rounded-lg transition-colors text-xs">✏️</button>
          <button data-action="delete-division" data-id="${div.id}" data-name="${div.name}"
            class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-xs border border-red-500/20">🗑️</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-studio-dark/60 rounded-lg p-3 text-center">
          <p class="text-xl font-bold text-studio-accent">${countMembers(div.id)}</p>
          <p class="text-xs text-studio-muted mt-0.5">Karyawan</p>
        </div>
        <div class="bg-studio-dark/60 rounded-lg p-3 text-center">
          <p class="text-xl font-bold text-studio-cyan">${countProjects(div.id)}</p>
          <p class="text-xs text-studio-muted mt-0.5">Project</p>
        </div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('button[data-action="edit-division"]').forEach(btn => {
    btn.addEventListener('click', () => showEditDivisionModal(btn.dataset.id, btn.dataset.name));
  });

  grid.querySelectorAll('button[data-action="delete-division"]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteDivision(btn.dataset.id, btn.dataset.name));
  });
}
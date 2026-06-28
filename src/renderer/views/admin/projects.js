// ============================================
// src/renderer/views/admin/projects.js
// Monitor semua project & task — Admin (Read-Only)
// ============================================
import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';
import { showModal, closeModal, navigateTo } from '../../app.js';

export async function render(container) {
  setPageTitle('Monitor Project');
  container.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-bold text-white">Monitor Project Studio</h2>
          <p class="text-studio-muted text-sm">
            Pantau seluruh project & task lintas divisi (read-only)
          </p>
        </div>
        <select id="filter-division"
          class="px-3 py-2 bg-studio-card border border-studio-border rounded-lg
                 text-studio-text text-sm focus:border-studio-accent transition-colors">
          <option value="">Semua Divisi</option>
        </select>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="summary-cards">
        ${[1,2,3,4].map(() =>
          `<div class="skeleton h-20 rounded-xl"></div>`).join('')}
      </div>

      <div id="projects-list" class="space-y-4">
        ${[1,2,3].map(() =>
          `<div class="skeleton h-52 rounded-xl"></div>`).join('')}
      </div>
    </div>`;

  await populateDivisionFilter();
  await loadProjects();

  document.getElementById('filter-division')
    .addEventListener('change', loadProjects);
}

async function populateDivisionFilter() {
  const { data: divisions } = await supabase
    .from('divisions').select('*').order('name');
  const sel = document.getElementById('filter-division');
  if (!sel) return;
  divisions?.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    sel.appendChild(opt);
  });
}

async function loadProjects() {
  const divFilter = document.getElementById('filter-division')?.value || '';

  let query = supabase
    .from('projects')
    .select(`
      *,
      divisions(name),
      profiles!created_by(full_name),
      tasks(
        id, title, status, priority, deadline,
        profiles!assigned_to(full_name)
      )
    `)
    .order('created_at', { ascending: false });

  if (divFilter) query = query.eq('division_id', divFilter);

  const { data: projects, error } = await query;

  // Summary
  const allTasks = projects?.flatMap(p => p.tasks || []) || [];
  const summaryData = [
    { label: 'Total Project',  value: projects?.length || 0,
      icon: '📁', color: 'text-studio-accent' },
    { label: 'Tugas Aktif',
      value: allTasks.filter(t => ['todo','inprogress'].includes(t.status)).length,
      icon: '⚡', color: 'text-blue-400' },
    { label: 'Dalam Review',
      value: allTasks.filter(t => ['review','revision'].includes(t.status)).length,
      icon: '🔍', color: 'text-purple-400' },
    { label: 'Selesai',
      value: allTasks.filter(t => t.status === 'done').length,
      icon: '✅', color: 'text-green-400' },
  ];

  const summaryEl = document.getElementById('summary-cards');
  if (summaryEl) {
    summaryEl.innerHTML = summaryData.map(s => `
      <div class="bg-studio-card border border-studio-border rounded-xl p-4 text-center">
        <div class="text-2xl mb-1">${s.icon}</div>
        <div class="text-2xl font-bold ${s.color}">${s.value}</div>
        <div class="text-xs text-studio-muted">${s.label}</div>
      </div>`).join('');
  }

  const listEl = document.getElementById('projects-list');
  if (!listEl) return;

  if (error || !projects?.length) {
    listEl.innerHTML = `
      <div class="text-center py-16 text-studio-muted bg-studio-card
                  border border-studio-border rounded-xl">
        <span class="text-4xl block mb-3">📁</span>
        Belum ada project${divFilter ? ' di divisi ini' : ''}.
      </div>`;
    return;
  }

  listEl.innerHTML = projects.map(p => {
    const tasks    = p.tasks || [];
    const total    = tasks.length;
    const done     = tasks.filter(t => t.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const isOverdue = p.deadline && new Date(p.deadline) < new Date();

    return `
      <div class="bg-studio-card border border-studio-border rounded-xl overflow-hidden">

        <div class="p-5 border-b border-studio-border">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="font-bold text-white">${p.name}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full bg-studio-accent/10
                             text-studio-accent border border-studio-accent/20">
                  ${p.divisions?.name || 'Tanpa Divisi'}
                </span>
              </div>
              ${p.description
                ? `<p class="text-sm text-studio-muted line-clamp-1">${p.description}</p>`
                : ''}
              <div class="flex items-center gap-4 mt-2 text-xs text-studio-muted">
                <span>👤 ${p.profiles?.full_name || '—'}</span>
                <span class="${isOverdue ? 'text-red-400' : ''}">
                  📅 ${p.deadline
                    ? new Date(p.deadline).toLocaleDateString('id-ID',
                        { day:'numeric', month:'short', year:'numeric' })
                    : 'No deadline'}
                  ${isOverdue ? ' ⚠️' : ''}
                </span>
                <span>📌 ${total} task</span>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-2xl font-bold text-white">${progress}%</span>
              <p class="text-xs text-studio-muted">${done}/${total} selesai</p>
            </div>
          </div>

          <div class="mt-3 h-2 bg-studio-dark rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-studio-accent to-studio-cyan
                        progress-fill"
                 data-progress="${progress}"></div>
          </div>
        </div>

        ${total > 0 ? `
          <div class="divide-y divide-studio-border/30">
            ${tasks.slice(0, 5).map(t => `
              <div class="flex items-center gap-3 px-5 py-3
                          hover:bg-studio-border/10 transition-colors">
                <span class="badge-${t.status} text-xs px-2.5 py-1 rounded-full
                             flex-shrink-0">${t.status}</span>
                <span class="badge-${t.priority} text-xs px-2 py-0.5 rounded
                             flex-shrink-0">${t.priority}</span>
                <span class="text-sm text-studio-text flex-1 truncate">${t.title}</span>
                <span class="text-xs text-studio-muted flex-shrink-0">
                  ${t.profiles?.full_name || '—'}
                </span>
                ${t.deadline ? `
                  <span class="text-xs text-studio-muted flex-shrink-0">
                    📅 ${new Date(t.deadline).toLocaleDateString('id-ID',
                      { day:'numeric', month:'short' })}
                  </span>` : ''}
              </div>`).join('')}
            ${total > 5 ? `
              <div class="px-5 py-3 text-center">
                <button type="button" data-action="show-all-tasks"
                  data-id="${p.id}"
                  data-name="${p.name}"
                  class="text-xs text-studio-accent hover:underline">
                  Lihat semua ${total} task →
                </button>
              </div>` : ''}
          </div>` : `
          <div class="px-5 py-4 text-sm text-studio-muted italic">
            Belum ada task di project ini.
          </div>`}
      </div>`;
  }).join('');

  listEl.addEventListener('click', (e) => {
    const btn    = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    const name   = btn.dataset.name;

    // Admin ga bisa edit/delete project dari sini, cuma bisa liat task detail
    if (action === 'show-all-tasks') showAllTasksModal(id, name, projects);
  });

  // Supaya bar progress ke-load width-nya
  setTimeout(() => {
    listEl.querySelectorAll('.progress-fill').forEach(el => {
      const pct = Number(el.dataset.progress || 0);
      el.style.width = `${pct}%`;
    });
  }, 50);
}

function showAllTasksModal(projId, projName, projects) {
  const project = projects.find(p => p.id === projId);
  const tasks   = project?.tasks || [];

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6
                w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h3 class="text-lg font-bold text-white">${projName}</h3>
          <p class="text-sm text-studio-muted">${tasks.length} task total</p>
        </div>
        <button type="button" id="alltasks-close"
          class="text-studio-muted hover:text-white text-xl">✕</button>
      </div>
      <div class="overflow-y-auto space-y-2 flex-1">
        ${tasks.map(t => `
          <div class="flex items-center gap-3 p-3 rounded-lg
                      bg-studio-dark/60 hover:bg-studio-dark transition-colors">
            <span class="badge-${t.status} text-xs px-2.5 py-1 rounded-full
                         flex-shrink-0">${t.status}</span>
            <span class="badge-${t.priority} text-xs px-2 py-0.5 rounded
                         flex-shrink-0">${t.priority}</span>
            <span class="text-sm text-studio-text flex-1">${t.title}</span>
            <span class="text-xs text-studio-muted flex-shrink-0">
              ${t.profiles?.full_name || 'Belum ditugaskan'}
            </span>
          </div>`).join('')}
      </div>
    </div>`);

  document.getElementById('alltasks-close')
    .addEventListener('click', closeModal);
}
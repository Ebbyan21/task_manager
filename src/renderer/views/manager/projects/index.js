import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { AppState, navigateTo } from '../../../app.js';
import { showCreateProjectModal } from './create.js';
import { showEditProjectModal, confirmDelete } from './edit.js';

let _divId = null;

export function getDivId() {
  return _divId;
}

export async function render(container) {
  setPageTitle('Project');
  _divId = AppState.profile.division_id;

  if (!_divId) {
    container.innerHTML = `
      <div class="text-center py-16 text-studio-muted">
        <span class="text-4xl block mb-3">⚠️</span>
        <p class="font-medium text-white">Anda belum terdaftar di divisi manapun.</p>
        <p class="text-sm mt-1">Hubungi Admin untuk diassign ke divisi.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-bold text-white">Project</h2>
          <p class="text-studio-muted text-sm">
            Kelola project divisi
            <strong class="text-white">
              ${AppState.profile.divisions?.name || ''}
            </strong>
          </p>
        </div>
        <button id="btn-add-project"
          class="flex items-center gap-2 px-4 py-2 bg-studio-accent
                 hover:bg-purple-700 text-white text-sm font-semibold
                 rounded-lg transition-colors">
          ＋ Project Baru
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="proj-summary">
        ${[1,2,3,4].map(() =>
          `<div class="skeleton h-20 rounded-xl"></div>`).join('')}
      </div>

      <div id="projects-grid"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${[1,2,3].map(() =>
          `<div class="skeleton h-52 rounded-xl"></div>`).join('')}
      </div>
    </div>`;

  document.getElementById('btn-add-project')
    .addEventListener('click', () => showCreateProjectModal());

  await loadProjects();
}

export async function loadProjects() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, description, deadline, created_at, division_id')
    .eq('division_id', _divId)
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('projects-grid').innerHTML = `
      <div class="col-span-3 text-center py-8 text-red-400
                  bg-studio-card border border-red-500/20 rounded-xl">
        Gagal memuat project: ${error.message}
      </div>`;
    return;
  }

  let taskStats = [];
  if (projects?.length) {
    const projIds = projects.map(p => p.id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, project_id, status')
      .in('project_id', projIds);
    taskStats = tasks || [];
  }

  const allDone    = taskStats.filter(t => t.status === 'done').length;
  const allActive  = taskStats.filter(t => ['todo','inprogress'].includes(t.status)).length;
  const allReview  = taskStats.filter(t => ['review','revision'].includes(t.status)).length;

  document.getElementById('proj-summary').innerHTML = [
    { label: 'Total Project', value: projects?.length || 0, icon: '📁', color: 'text-studio-accent' },
    { label: 'Task Aktif',    value: allActive, icon: '⚡', color: 'text-blue-400' },
    { label: 'Perlu Review',  value: allReview, icon: '🔍', color: 'text-yellow-400' },
    { label: 'Selesai',       value: allDone, icon: '✅', color: 'text-green-400' },
  ].map(s => `
    <div class="bg-studio-card border border-studio-border rounded-xl p-4 text-center">
      <div class="text-2xl mb-1">${s.icon}</div>
      <div class="text-2xl font-bold ${s.color}">${s.value}</div>
      <div class="text-xs text-studio-muted">${s.label}</div>
    </div>`).join('');

  const grid = document.getElementById('projects-grid');

  if (!projects?.length) {
    grid.innerHTML = `
      <div class="col-span-3 text-center py-16 text-studio-muted
                  bg-studio-card border border-studio-border rounded-xl">
        <span class="text-4xl block mb-3">📁</span>
        Belum ada project di divisi ini.<br/>
        Klik "+ Project Baru" untuk memulai.
      </div>`;
    return;
  }

  grid.innerHTML = projects.map(p => {
    const myTasks   = taskStats.filter(t => t.project_id === p.id);
    const total     = myTasks.length;
    const done      = myTasks.filter(t => t.status === 'done').length;
    const review    = myTasks.filter(t => ['review','revision'].includes(t.status)).length;
    const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
    const isOverdue = p.deadline && new Date(p.deadline) < new Date();
    const daysLeft  = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / (1000*60*60*24)) : null;

    return `
      <div class="bg-studio-card border border-studio-border rounded-xl p-5
                  flex flex-col gap-4 studio-card-hover">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-white truncate">${p.name}</h3>
            ${p.description ? `<p class="text-xs text-studio-muted mt-1 line-clamp-2">${p.description}</p>` : ''}
          </div>
          <div class="flex gap-1.5 flex-shrink-0">
            <button data-action="edit" data-id="${p.id}"
              class="p-1.5 bg-studio-border hover:bg-studio-accent/20
                     text-studio-muted hover:text-studio-accent rounded-lg
                     transition-colors text-xs">✏️</button>
            <button data-action="delete" data-id="${p.id}" data-name="${p.name}"
              class="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400
                     rounded-lg border border-red-500/20 transition-colors text-xs">🗑️</button>
          </div>
        </div>

        <div>
          <div class="flex justify-between text-xs text-studio-muted mb-1.5">
            <span>${done}/${total} task selesai</span>
            <span class="font-semibold text-white">${progress}%</span>
          </div>
          <div class="h-2 bg-studio-dark rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-studio-accent to-studio-cyan progress-fill"
                 data-progress="${progress}"></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-studio-dark/60 rounded-lg py-2">
            <p class="text-sm font-bold text-blue-400">${total}</p>
            <p class="text-xs text-studio-muted">Total Task</p>
          </div>
          <div class="bg-studio-dark/60 rounded-lg py-2">
            <p class="text-sm font-bold text-yellow-400">${review}</p>
            <p class="text-xs text-studio-muted">Review</p>
          </div>
          <div class="bg-studio-dark/60 rounded-lg py-2">
            <p class="text-sm font-bold text-green-400">${done}</p>
            <p class="text-xs text-studio-muted">Done</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-studio-border/50">
          <span class="text-xs ${isOverdue ? 'text-red-400 font-medium' : daysLeft !== null && daysLeft <= 3 ? 'text-yellow-400' : 'text-studio-muted'}">
            ${p.deadline
              ? `📅 ${new Date(p.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
                 ${isOverdue ? '⚠️' : daysLeft === 0 ? '(Hari ini)' : daysLeft === 1 ? '(Besok)' : ''}`
              : '📅 No deadline'}
          </span>
          <button data-action="open-tasks" data-id="${p.id}" data-name="${p.name}"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-studio-accent/10
                   hover:bg-studio-accent/30 text-studio-accent border
                   border-studio-accent/20 rounded-lg text-xs font-medium transition-colors">
            📌 Kelola Task →
          </button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.progress-fill').forEach(el => {
    const pct = Number(el.dataset.progress || 0);
    el.style.width = `${pct}%`;
  });

  document.getElementById('projects-grid').addEventListener('click', (e) => {
    const btn    = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    const name   = btn.dataset.name;

    if (action === 'edit')       showEditProjectModal(id);
    if (action === 'delete')     confirmDelete(id, name);
    if (action === 'open-tasks') openTaskPage(id, name);
  });
}

function openTaskPage(projectId, projectName) {
  sessionStorage.setItem('selected_project_id',   projectId);
  sessionStorage.setItem('selected_project_name', projectName);
  navigateTo('tasks');
}
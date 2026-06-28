import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { AppState, navigateTo } from '../../../app.js';
import { showCreateTaskModal } from './create.js';
import { showEditTaskModal, confirmDeleteTask } from './edit.js';

let _divId          = null;
let _members        = [];
let _projects       = [];
let _activeProjId   = null;
let _activeProjName = '';

export const getTaskState = () => ({
  divId: _divId,
  members: _members,
  projects: _projects,
  activeProjId: _activeProjId,
  activeProjName: _activeProjName
});

export async function render(container) {
  setPageTitle('Task');
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
          <h2 class="text-xl font-bold text-white">Task</h2>
          <p class="text-studio-muted text-sm" id="task-subtitle">
            Pilih project untuk melihat dan mengelola task
          </p>
        </div>
        <button id="btn-add-task" disabled
          class="flex items-center gap-2 px-4 py-2 bg-studio-accent/30
                 text-white/50 text-sm font-semibold rounded-lg
                 cursor-not-allowed transition-colors">
          ＋ Task Baru
        </button>
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-4">
        <p class="text-xs text-studio-muted mb-3 font-medium uppercase tracking-wider">Pilih Project</p>
        <div id="project-tabs" class="flex gap-2 flex-wrap">
          ${[1,2,3].map(() => `<div class="skeleton h-9 w-32 rounded-lg"></div>`).join('')}
        </div>
      </div>

      <div id="task-content">
        <div class="text-center py-16 text-studio-muted bg-studio-card border border-studio-border rounded-xl">
          <span class="text-4xl block mb-3">👆</span>
          Pilih project di atas untuk melihat task-nya.
        </div>
      </div>
    </div>`;

  await init();
}

async function init() {
  const { data: members } = await supabase
    .from('profiles').select('id, full_name')
    .eq('division_id', _divId).eq('role', 'employee').order('full_name');
  _members = members || [];

  const { data: projects } = await supabase
    .from('projects').select('id, name, deadline')
    .eq('division_id', _divId).order('created_at', { ascending: false });
  _projects = projects || [];

  const tabsEl = document.getElementById('project-tabs');
  if (!_projects.length) {
    tabsEl.innerHTML = `
      <div class="flex items-center gap-2 text-studio-muted text-sm">
        <span>📁</span><span>Belum ada project.</span>
        <button id="btn-create-project" class="text-studio-accent hover:underline text-sm">Buat project dulu →</button>
      </div>`;
    document.getElementById('btn-create-project')?.addEventListener('click', () => navigateTo('projects'));
    return;
  }

  tabsEl.innerHTML = _projects.map(p => `
    <button data-proj-id="${p.id}" data-proj-name="${p.name}"
      class="proj-tab px-3 py-2 rounded-lg text-sm font-medium border border-studio-border text-studio-muted
             hover:border-studio-accent hover:text-white transition-all whitespace-nowrap">
      📁 ${p.name}
    </button>`).join('');

  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.proj-tab');
    if (!tab) return;
    selectProject(tab.dataset.projId, tab.dataset.projName);
  });

  const savedId   = sessionStorage.getItem('selected_project_id');
  const savedName = sessionStorage.getItem('selected_project_name');
  sessionStorage.removeItem('selected_project_id');
  sessionStorage.removeItem('selected_project_name');

  if (savedId && _projects.find(p => p.id === savedId)) {
    selectProject(savedId, savedName);
  }
}

function selectProject(projId, projName) {
  _activeProjId   = projId;
  _activeProjName = projName;

  document.querySelectorAll('.proj-tab').forEach(tab => {
    const isActive = tab.dataset.projId === projId;
    tab.classList.toggle('bg-studio-accent', isActive);
    tab.classList.toggle('border-studio-accent', isActive);
    tab.classList.toggle('text-white', isActive);
    tab.classList.toggle('bg-studio-dark/50', !isActive);
    tab.classList.toggle('text-studio-muted', !isActive);
    tab.classList.toggle('border-studio-border', !isActive);
  });

  document.getElementById('task-subtitle').textContent = `Menampilkan task project: ${projName}`;

  const addBtn = document.getElementById('btn-add-task');
  addBtn.disabled = false;
  addBtn.className = `flex items-center gap-2 px-4 py-2 bg-studio-accent hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer`;
  
  // Clean old event listeners by cloning
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);
  newAddBtn.addEventListener('click', () => showCreateTaskModal(projId));

  loadTasks(projId);
}

export async function loadTasks(projId) {
  const content = document.getElementById('task-content');
  content.innerHTML = `<div class="space-y-2">${[1,2,3].map(() => `<div class="skeleton h-16 rounded-xl"></div>`).join('')}</div>`;

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, deadline, assigned_to, gdrive_link, revision_note, profiles!assigned_to(full_name)')
    .eq('project_id', projId)
    .order('created_at', { ascending: false });

  if (error) {
    content.innerHTML = `<div class="text-center py-8 text-red-400 bg-studio-card border border-red-500/20 rounded-xl">Gagal memuat task: ${error.message}</div>`;
    return;
  }

  const total = tasks?.length || 0;
  const statusMeta = [
    { id:'todo',       label:'To Do',      color:'text-gray-400' },
    { id:'inprogress', label:'Progress',   color:'text-blue-400' },
    { id:'review',     label:'Review',     color:'text-purple-400' },
    { id:'revision',   label:'Revision',   color:'text-yellow-400' },
    { id:'done',       label:'Done',       color:'text-green-400' },
  ];

  const summaryHtml = `
    <div class="flex gap-3 flex-wrap mb-4">
      ${statusMeta.map(s => {
        const cnt = tasks?.filter(t => t.status === s.id).length || 0;
        return `
          <div class="flex items-center gap-1.5 bg-studio-card border border-studio-border rounded-lg px-3 py-1.5">
            <span class="text-xs font-bold ${s.color}">${cnt}</span>
            <span class="text-xs text-studio-muted">${s.label}</span>
          </div>`;
      }).join('')}
      <div class="flex items-center gap-1.5 bg-studio-card border border-studio-border rounded-lg px-3 py-1.5 ml-auto">
        <span class="text-xs text-studio-muted">Total:</span><span class="text-xs font-bold text-white">${total} task</span>
      </div>
    </div>`;

  if (!tasks?.length) {
    content.innerHTML = summaryHtml + `
      <div class="text-center py-12 text-studio-muted bg-studio-card border border-studio-border rounded-xl">
        <span class="text-4xl block mb-3">📌</span>Belum ada task di project ini.<br/>
        <span class="text-sm">Klik "+ Task Baru" untuk menambahkan.</span>
      </div>`;
    return;
  }

  content.innerHTML = summaryHtml + `
    <div class="bg-studio-card border border-studio-border rounded-xl overflow-hidden">
      <div class="divide-y divide-studio-border/40" id="task-list">
        ${tasks.map(t => taskCard(t)).join('')}
      </div>
    </div>`;

  document.getElementById('task-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit')   showEditTaskModal(btn.dataset.id, projId);
    if (btn.dataset.action === 'delete') confirmDeleteTask(btn.dataset.id, btn.dataset.title);
  });
}

function taskCard(t) {
  const assigned = t.profiles?.full_name || 'Belum ditugaskan';
  const deadline = t.deadline ? new Date(t.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '—';
  const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done';

  return `
    <div class="flex items-start gap-4 px-5 py-4 hover:bg-studio-border/10 transition-colors">
      <div class="flex flex-col gap-1.5 flex-shrink-0 pt-0.5">
        <span class="badge-${t.status} text-xs px-2.5 py-1 rounded-full text-center min-w-20">${t.status}</span>
        <span class="badge-${t.priority} text-xs px-2 py-0.5 rounded text-center">${t.priority}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-studio-text">${t.title}</p>
        ${t.description ? `<p class="text-xs text-studio-muted mt-0.5 line-clamp-1">${t.description}</p>` : ''}
        <div class="flex items-center gap-4 mt-2 flex-wrap">
          <span class="text-xs text-studio-muted flex items-center gap-1">👤 ${assigned}</span>
          <span class="text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400 font-medium' : 'text-studio-muted'}">
            📅 ${deadline}${isOverdue ? ' ⚠️' : ''}
          </span>
          ${t.gdrive_link ? `<span class="text-xs text-studio-cyan flex items-center gap-1">🔗 File terlampir</span>` : ''}
          ${t.revision_note ? `<span class="text-xs text-yellow-400 flex items-center gap-1">📝 Ada catatan revisi</span>` : ''}
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button data-action="edit" data-id="${t.id}" class="px-3 py-1.5 text-xs bg-studio-border hover:bg-studio-accent/20 text-studio-muted hover:text-studio-accent rounded-lg transition-colors">✏️ Edit</button>
        <button data-action="delete" data-id="${t.id}" data-title="${t.title}" class="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors">🗑️</button>
      </div>
    </div>`;
}
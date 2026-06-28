import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { AppState } from '../../../app.js';
import { initDragDrop, handleBoardClick, showTaskDetail, handleMoveTask } from './edit.js';

export const COLUMNS = [
  { id: 'todo',       label: 'To Do',       icon: '📋', color: 'border-t-gray-500',   bg: 'bg-gray-500/5'   },
  { id: 'inprogress', label: 'In Progress', icon: '⚡', color: 'border-t-blue-500',   bg: 'bg-blue-500/5'   },
  { id: 'review',     label: 'Review',      icon: '🔍', color: 'border-t-purple-500', bg: 'bg-purple-500/5' },
  { id: 'revision',   label: 'Revision',    icon: '📝', color: 'border-t-yellow-500', bg: 'bg-yellow-500/5' },
  { id: 'done',       label: 'Done',        icon: '✅', color: 'border-t-green-500',  bg: 'bg-green-500/5'  },
];

export const ALLOWED_TRANSITIONS = {
  todo:       ['inprogress'],
  inprogress: ['review'],
  review:     [],
  revision:   ['review'],
  done:       [],
};

export const STATUS_COLOR = {
  todo:       'bg-gray-500/20 text-gray-300 border-gray-500/30',
  inprogress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  review:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
  revision:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  done:       'bg-green-500/20 text-green-300 border-green-500/30',
};

export const PRIORITY_COLOR = {
  low:    'bg-gray-500/20 text-gray-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high:   'bg-red-500/20 text-red-400',
};

export const PRIORITY_ICON = { low: '🟢', medium: '🟡', high: '🔴' };

let _allTasks = [];
let _viewMode = 'kanban';

export const getTasks = () => _allTasks;

export async function render(container) {
  setPageTitle('Tugas Saya');
  container.innerHTML = `
    <div class="space-y-5 h-full">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-xl font-bold text-white">Tugas Saya</h2>
          <p class="text-studio-muted text-sm" id="task-summary-text">Memuat...</p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex bg-studio-card border border-studio-border rounded-lg p-1">
            <button id="view-kanban" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-studio-accent text-white">
              📌 Kanban
            </button>
            <button id="view-list" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all text-studio-muted hover:text-white">
              📋 List
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap items-center">
        <span class="text-xs text-studio-muted">Filter:</span>
        ${['Semua','To Do','In Progress','Review','Revision','Done'].map((l,i) => {
          const vals = ['','todo','inprogress','review','revision','done'];
          return `
            <button data-filter="${vals[i]}"
              class="filter-btn px-3 py-1 rounded-lg text-xs font-medium border transition-all
                     ${i===0 ? 'active-filter bg-studio-accent/20 text-studio-accent border-studio-accent/40' : 'bg-studio-card text-studio-muted border-studio-border hover:border-studio-accent/40 hover:text-white'}">
              ${l}
            </button>`;
        }).join('')}

        <div class="ml-auto">
          <select id="sort-tasks" class="px-3 py-1 bg-studio-card border border-studio-border rounded-lg text-studio-text text-xs focus:border-studio-accent transition-colors">
            <option value="deadline">Sort: Deadline</option>
            <option value="priority">Sort: Prioritas</option>
            <option value="status">Sort: Status</option>
            <option value="newest">Sort: Terbaru</option>
          </select>
        </div>
      </div>

      <div id="board-area" class="min-h-96">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          ${COLUMNS.map(() => `<div class="skeleton h-64 rounded-xl"></div>`).join('')}
        </div>
      </div>
    </div>`;

  await loadTasks();
  initViewToggle();
  initFilterSort();
}

export async function loadTasks() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, projects(name, description)')
    .eq('assigned_to', AppState.user.id)
    .order('deadline', { ascending: true, nullsLast: true });

  if (error) {
    document.getElementById('board-area').innerHTML = `
      <div class="text-center py-16 text-red-400">Gagal memuat tugas: ${error.message}</div>`;
    return;
  }

  _allTasks = tasks || [];
  updateSummaryText();
  renderBoard();
}

function updateSummaryText() {
  const total  = _allTasks.length;
  const active = _allTasks.filter(t => ['todo','inprogress'].includes(t.status)).length;
  const review = _allTasks.filter(t => ['review','revision'].includes(t.status)).length;
  const done   = _allTasks.filter(t => t.status === 'done').length;

  const el = document.getElementById('task-summary-text');
  if (el) {
    el.innerHTML = `
      <span class="text-white font-medium">${total}</span> total •
      <span class="text-blue-400">${active}</span> aktif •
      <span class="text-purple-400">${review}</span> review •
      <span class="text-green-400">${done}</span> selesai`;
  }
}

function getFilteredSortedTasks() {
  const activeBtn = document.querySelector('.filter-btn.active-filter');
  const filterVal = activeBtn ? activeBtn.dataset.filter : '';
  const sortVal   = document.getElementById('sort-tasks')?.value || 'deadline';

  let tasks = filterVal ? _allTasks.filter(t => t.status === filterVal) : [..._allTasks];

  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const STATUS_ORDER   = { todo: 0, inprogress: 1, review: 2, revision: 3, done: 4 };

  tasks.sort((a, b) => {
    if (sortVal === 'deadline') {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (sortVal === 'priority') {
      return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    }
    if (sortVal === 'status') {
      return (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return tasks;
}

function renderBoard() {
  const area  = document.getElementById('board-area');
  const tasks = getFilteredSortedTasks();

  if (_viewMode === 'list') {
    renderListView(area, tasks);
  } else {
    renderKanbanView(area, tasks);
  }
}

function renderKanbanView(area, tasks) {
  const activeBtn  = document.querySelector('.filter-btn.active-filter');
  const filterVal  = activeBtn ? activeBtn.dataset.filter : '';
  const isFiltered = filterVal !== '';

  const visibleColumns = isFiltered ? COLUMNS.filter(col => col.id === filterVal) : COLUMNS;

  area.innerHTML = `
    <div class="flex gap-3 overflow-x-auto pb-4 kanban-board" id="kanban-board">
      ${visibleColumns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return `
          <div class="kanban-col ${isFiltered ? 'flex-1 max-w-xl' : 'flex-shrink-0 w-64'} flex flex-col rounded-xl
                      border-t-4 ${col.color} border border-studio-border ${col.bg} overflow-hidden"
               data-status="${col.id}" id="col-${col.id}">
            <div class="flex items-center justify-between px-3 py-3 border-b border-studio-border/50">
              <div class="flex items-center gap-2">
                <span class="text-base">${col.icon}</span>
                <span class="text-sm font-semibold text-white">${col.label}</span>
              </div>
              <span class="text-xs font-bold bg-studio-dark/60 text-studio-muted px-2 py-0.5 rounded-full min-w-6 text-center">
                ${colTasks.length}
              </span>
            </div>
            <div class="flex-1 p-2 space-y-2 overflow-y-auto kanban-col-cards" id="cards-${col.id}">
              ${colTasks.length === 0
                ? `<div class="border-2 border-dashed border-studio-border/30 rounded-xl p-5 text-center text-xs text-studio-muted/40 mt-2">Tidak ada tugas di sini</div>`
                : colTasks.map(t => buildKanbanCard(t)).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  if (!isFiltered) initDragDrop();
}

function buildKanbanCard(task) {
  const deadline   = task.deadline ? new Date(task.deadline) : null;
  const now        = new Date();
  const daysLeft   = deadline ? Math.ceil((deadline - now) / (1000*60*60*24)) : null;
  const isOverdue  = daysLeft !== null && daysLeft < 0 && task.status !== 'done';
  const isDueToday = daysLeft === 0;
  const isDueSoon  = daysLeft !== null && daysLeft > 0 && daysLeft <= 2;

  const deadlineColor = isOverdue ? 'text-red-400' : isDueToday ? 'text-orange-400' : isDueSoon ? 'text-yellow-400' : 'text-studio-muted';
  const allowedMoves = ALLOWED_TRANSITIONS[task.status] || [];

  return `
    <div class="kanban-card group bg-studio-card rounded-xl p-3 shadow-sm border border-studio-border/50
                hover:border-studio-accent/40 hover:shadow-md hover:shadow-studio-accent/10 transition-all cursor-grab active:cursor-grabbing"
         draggable="true" data-task-id="${task.id}" data-status="${task.status}">
      <div class="flex items-center justify-between mb-2.5">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority] || ''}">
          ${PRIORITY_ICON[task.priority]} ${task.priority}
        </span>
        <button data-open-task="${task.id}"
          class="text-studio-muted hover:text-white text-sm opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-studio-border">
          ⋯
        </button>
      </div>
      <p class="text-sm font-semibold text-studio-text mb-1 leading-snug line-clamp-2">${task.title}</p>
      <p class="text-xs text-studio-muted mb-3 truncate">📁 ${task.projects?.name || '—'}</p>
      ${deadline ? `
        <div class="flex items-center gap-1.5 text-xs ${deadlineColor} mb-2.5 ${isOverdue ? 'font-semibold' : ''}">
          ${isOverdue  ? '🔥' : isDueToday ? '⏰' : isDueSoon ? '⚡' : '📅'}
          <span>
            ${isOverdue  ? `Terlambat ${Math.abs(daysLeft)} hari` :
              isDueToday ? 'Deadline hari ini!' :
              isDueSoon  ? `${daysLeft} hari lagi` : deadline.toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
          </span>
        </div>` : ''}
      <div class="flex flex-wrap gap-1 mb-3">
        ${task.revision_note ? `<span class="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 rounded-md px-2 py-0.5">⚠️ Ada revisi</span>` : ''}
        ${task.gdrive_link ? `<span class="text-xs bg-cyan-500/15 text-studio-cyan border border-cyan-500/25 rounded-md px-2 py-0.5">🔗 File terlampir</span>` : ''}
      </div>
      ${allowedMoves.length > 0 ? `
        <div class="flex gap-1.5 pt-2 border-t border-studio-border/40">
          ${allowedMoves.map(nextStatus => `
            <button data-move="${task.id}" data-from="${task.status}" data-to="${nextStatus}"
              class="flex-1 text-xs py-1.5 rounded-lg font-medium bg-studio-accent/15 hover:bg-studio-accent/30
                     text-studio-accent border border-studio-accent/25 transition-all">
              ${nextStatus === 'inprogress' ? '⚡ Mulai' : nextStatus === 'review' ? '📤 Submit' : nextStatus}
            </button>`).join('')}
        </div>` : `
        <div class="pt-2 border-t border-studio-border/40">
          <span class="text-xs text-studio-muted italic">${task.status === 'done' ? '✅ Selesai' : '⏳ Menunggu review manager'}</span>
        </div>`}
    </div>`;
}

function renderListView(area, tasks) {
  if (!tasks.length) {
    area.innerHTML = `
      <div class="text-center py-16 text-studio-muted bg-studio-card border border-studio-border rounded-xl">
        <span class="text-4xl block mb-3">📋</span>Tidak ada tugas yang sesuai filter.
      </div>`;
    return;
  }

  area.innerHTML = `
    <div class="bg-studio-card border border-studio-border rounded-xl overflow-hidden">
      <div class="grid grid-cols-12 gap-3 px-5 py-3 border-b border-studio-border bg-studio-dark/50 text-xs font-medium text-studio-muted">
        <div class="col-span-4">Tugas</div>
        <div class="col-span-2">Status</div>
        <div class="col-span-2">Prioritas</div>
        <div class="col-span-2">Deadline</div>
        <div class="col-span-2 text-right">Aksi</div>
      </div>
      <div class="divide-y divide-studio-border/40" id="list-rows">
        ${tasks.map(t => buildListRow(t)).join('')}
      </div>
    </div>`;

  document.getElementById('list-rows').addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-task]');
    const moveBtn = e.target.closest('[data-list-move]');
    if (openBtn) showTaskDetail(openBtn.dataset.openTask);
    if (moveBtn) handleMoveTask(moveBtn.dataset.id, moveBtn.dataset.from, moveBtn.dataset.to);
  });
}

function buildListRow(t) {
  const deadline  = t.deadline ? new Date(t.deadline) : null;
  const daysLeft  = deadline ? Math.ceil((deadline - new Date()) / (1000*60*60*24)) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && t.status !== 'done';
  const allowedMoves = ALLOWED_TRANSITIONS[t.status] || [];

  return `
    <div class="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-studio-border/10 transition-colors group">
      <div class="col-span-4">
        <p class="text-sm font-medium text-studio-text line-clamp-1">${t.title}</p>
        <p class="text-xs text-studio-muted mt-0.5 truncate">📁 ${t.projects?.name || '—'}</p>
        ${t.revision_note ? `<span class="inline-flex items-center gap-1 text-xs text-yellow-400 mt-1">⚠️ Ada catatan revisi</span>` : ''}
      </div>
      <div class="col-span-2">
        <span class="text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[t.status] || ''}">${t.status}</span>
      </div>
      <div class="col-span-2">
        <span class="text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLOR[t.priority] || ''}">${PRIORITY_ICON[t.priority]} ${t.priority}</span>
      </div>
      <div class="col-span-2">
        ${deadline ? `<span class="text-xs font-medium ${isOverdue ? 'text-red-400' : daysLeft <= 2 ? 'text-yellow-400' : 'text-studio-muted'}">
            ${isOverdue ? `🔥 Terlambat ${Math.abs(daysLeft)}h` : daysLeft === 0 ? '⏰ Hari ini' : deadline.toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
          </span>` : `<span class="text-xs text-studio-muted">—</span>`}
      </div>
      <div class="col-span-2 flex items-center justify-end gap-2">
        <button data-open-task="${t.id}" class="text-xs px-2.5 py-1.5 bg-studio-border hover:bg-studio-accent/20 text-studio-muted hover:text-studio-accent rounded-lg transition-colors">Detail</button>
        ${allowedMoves.map(next => `
          <button data-list-move="1" data-id="${t.id}" data-from="${t.status}" data-to="${next}"
            class="text-xs px-2.5 py-1.5 bg-studio-accent/10 hover:bg-studio-accent/30 text-studio-accent border border-studio-accent/20 rounded-lg transition-colors whitespace-nowrap">
            ${next === 'inprogress' ? '⚡ Mulai' : next === 'review' ? '📤 Submit' : next}
          </button>`).join('')}
      </div>
    </div>`;
}

function initViewToggle() {
  document.getElementById('view-kanban')?.addEventListener('click', () => {
    _viewMode = 'kanban';
    document.getElementById('view-kanban').className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-studio-accent text-white';
    document.getElementById('view-list').className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all text-studio-muted hover:text-white';
    renderBoard();
  });

  document.getElementById('view-list')?.addEventListener('click', () => {
    _viewMode = 'list';
    document.getElementById('view-list').className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-studio-accent text-white';
    document.getElementById('view-kanban').className = 'px-3 py-1.5 rounded-md text-xs font-medium transition-all text-studio-muted hover:text-white';
    renderBoard();
  });
}

function initFilterSort() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active-filter', 'bg-studio-accent/20', 'text-studio-accent', 'border-studio-accent/40');
        b.classList.add('bg-studio-card', 'text-studio-muted', 'border-studio-border');
      });
      btn.classList.add('active-filter', 'bg-studio-accent/20', 'text-studio-accent', 'border-studio-accent/40');
      btn.classList.remove('bg-studio-card', 'text-studio-muted', 'border-studio-border');
      renderBoard();
    });
  });

  document.getElementById('sort-tasks')?.addEventListener('change', () => renderBoard());
  
  // Clean event listener global (cegah duplicate trigger)
  document.removeEventListener('click', handleBoardClick);
  document.addEventListener('click', handleBoardClick);
}
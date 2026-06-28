import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showToast, showModal, closeModal } from '../../../app.js';
import { ALLOWED_TRANSITIONS, STATUS_COLOR, PRIORITY_COLOR, PRIORITY_ICON, getTasks, loadTasks } from './index.js';

export function initDragDrop() {
  let dragId     = null;
  let dragStatus = null;

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dragId     = card.dataset.taskId;
      dragStatus = card.dataset.status;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
  });

  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target  = col.dataset.status;
      const allowed = ALLOWED_TRANSITIONS[dragStatus] || [];
      if (allowed.includes(target) || target === dragStatus) {
        col.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const target = col.dataset.status;
      if (!dragId || target === dragStatus) return;
      const allowed = ALLOWED_TRANSITIONS[dragStatus] || [];
      if (!allowed.includes(target)) {
        showToast(`Tidak bisa pindah dari "${dragStatus}" ke "${target}".`, 'warning');
        return;
      }
      handleMoveTask(dragId, dragStatus, target);
    });
  });
}

export function handleBoardClick(e) {
  const moveBtn = e.target.closest('[data-move]');
  const openBtn = e.target.closest('[data-open-task]');
  if (moveBtn) {
    e.stopPropagation();
    handleMoveTask(moveBtn.dataset.move, moveBtn.dataset.from, moveBtn.dataset.to);
  }
  if (openBtn) {
    e.stopPropagation();
    showTaskDetail(openBtn.dataset.openTask);
  }
}

export function handleMoveTask(taskId, fromStatus, toStatus) {
  if (toStatus === 'review') {
    showGDriveModal(taskId, fromStatus);
  } else {
    updateStatus(taskId, toStatus);
  }
}

async function updateStatus(taskId, newStatus) {
  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);

  if (!error) {
    await logActivity('UPDATE_TASK_STATUS', `Karyawan mengubah status task → ${newStatus}`);
    showToast(
      newStatus === 'inprogress' ? '⚡ Tugas dimulai!' : `Status diperbarui ke "${newStatus}"`,
      'success'
    );
    await loadTasks();
  } else {
    showToast('Gagal memperbarui status: ' + error.message, 'error');
  }
}

function showGDriveModal(taskId, fromStatus) {
  const tasks = getTasks();
  const task  = tasks.find(t => t.id === taskId);

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-12 h-12 bg-studio-accent/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📤</div>
        <div>
          <h3 class="text-lg font-bold text-white">Submit Hasil Kerja</h3>
          <p class="text-sm text-studio-muted truncate max-w-xs">${task?.title || 'Task'}</p>
        </div>
      </div>

      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-5">
        <p class="text-sm text-blue-400 font-medium mb-1">📋 Sebelum submit:</p>
        <ul class="text-xs text-studio-muted space-y-1">
          <li>✓ Pastikan file sudah di-upload ke Google Drive / Dropbox</li>
          <li>✓ Sharing sudah diatur ke "Anyone with the link"</li>
          <li>✓ File dalam format yang diminta Manager</li>
        </ul>
      </div>

      <form id="gdrive-form" class="space-y-4">
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Link File * <span class="text-studio-cyan">(Google Drive / Dropbox)</span></label>
          <input type="url" id="gdrive-link" required value="${task?.gdrive_link || ''}" placeholder="https://drive.google.com/file/..."
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
          <p class="text-xs text-studio-muted mt-1">
            Link lama: ${task?.gdrive_link ? `<button type="button" data-external-link="${task.gdrive_link}" class="text-studio-cyan hover:underline">Lihat file sebelumnya</button>` : 'Belum ada'}
          </p>
        </div>
        <div id="gdrive-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></div>
        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
          <button type="submit" id="gdrive-submit" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">📤 Submit ke Review</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-cancel').addEventListener('click', closeModal);
  document.querySelectorAll('button[data-external-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.externalLink;
      if (link && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(link);
      }
    });
  });

  document.getElementById('gdrive-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('gdrive-submit');
    const errEl = document.getElementById('gdrive-error');
    const link  = document.getElementById('gdrive-link').value.trim();

    if (!link.startsWith('http')) {
      errEl.textContent = 'Masukkan URL yang valid (dimulai http/https).';
      errEl.classList.remove('hidden'); return;
    }

    btn.disabled = true; btn.textContent = 'Mengirim...';

    const { error } = await supabase.from('tasks').update({ status: 'review', gdrive_link: link }).eq('id', taskId);

    if (!error) {
      await logActivity('SUBMIT_REVIEW', `Karyawan submit task ke review: ${task?.title}`);
      closeModal();
      showToast('✅ Tugas berhasil dikirim ke Review!', 'success');
      await loadTasks();
    } else {
      errEl.textContent = error.message; errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = '📤 Submit ke Review';
    }
  });
}

export function showTaskDetail(taskId) {
  const tasks = getTasks();
  const task  = tasks.find(t => t.id === taskId);
  if (!task) return;

  const deadline  = task.deadline ? new Date(task.deadline) : null;
  const daysLeft  = deadline ? Math.ceil((deadline - new Date()) / (1000*60*60*24)) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && task.status !== 'done';
  const allowedMoves = ALLOWED_TRANSITIONS[task.status] || [];

  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
      <div class="flex items-start justify-between mb-5 gap-3">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <span class="text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[task.status] || ''}">${task.status}</span>
            <span class="text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLOR[task.priority] || ''}">${PRIORITY_ICON[task.priority]} ${task.priority}</span>
          </div>
          <h3 class="text-lg font-bold text-white leading-snug">${task.title}</h3>
          <p class="text-sm text-studio-muted mt-1">📁 ${task.projects?.name || '—'}</p>
        </div>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl flex-shrink-0 p-1 rounded-lg hover:bg-studio-border transition-colors">✕</button>
      </div>

      <div class="space-y-4">
        ${task.description ? `<div class="bg-studio-dark/60 rounded-xl p-4"><p class="text-xs text-studio-muted font-medium mb-2">📄 Deskripsi</p><p class="text-sm text-studio-text">${task.description}</p></div>` : ''}

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-studio-dark/60 rounded-xl p-4">
            <p class="text-xs text-studio-muted mb-1">📅 Deadline</p>
            ${deadline
              ? `<p class="text-sm font-medium ${isOverdue ? 'text-red-400' : daysLeft === 0 ? 'text-orange-400' : daysLeft <= 2 ? 'text-yellow-400' : 'text-studio-text'}">
                   ${isOverdue ? `🔥 Terlambat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? '⏰ Hari ini!' : deadline.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                 </p>
                 ${!isOverdue && daysLeft > 0 ? `<p class="text-xs text-studio-muted mt-0.5">${daysLeft} hari lagi</p>` : ''}`
              : `<p class="text-sm text-studio-muted">Tidak ada deadline</p>`}
          </div>
          <div class="bg-studio-dark/60 rounded-xl p-4">
            <p class="text-xs text-studio-muted mb-1">📌 Dibuat</p>
            <p class="text-sm text-studio-text">${new Date(task.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</p>
          </div>
        </div>

        ${task.revision_note ? `
          <div class="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4">
            <p class="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-2"><span class="text-base">📝</span> Catatan Revisi dari Manager:</p>
            <p class="text-sm text-yellow-300 leading-relaxed">${task.revision_note}</p>
          </div>` : ''}

        ${task.gdrive_link ? `
          <div class="bg-studio-dark/60 rounded-xl p-4">
            <p class="text-xs text-studio-muted font-medium mb-2">🔗 File yang Dikirim</p>
            <button type="button" data-external-link="${task.gdrive_link}" class="text-sm text-studio-cyan hover:underline break-all text-left flex items-center gap-2">
              <span class="text-base">📂</span><span class="truncate">${task.gdrive_link}</span>
            </button>
          </div>` : ''}

        <div class="bg-studio-dark/40 rounded-xl p-4">
          <p class="text-xs text-studio-muted font-medium mb-3">🔄 Alur Tugas</p>
          <div class="flex items-center gap-1 flex-wrap">
            ${['todo','inprogress','review','revision','done'].map((s, i, arr) => `
              <span class="text-xs px-2.5 py-1 rounded-full border ${task.status === s ? STATUS_COLOR[s] : 'border-studio-border/30 text-studio-muted/40'} font-medium">${s}</span>
              ${i < arr.length - 1 ? `<span class="text-studio-border text-xs">→</span>` : ''}`
            ).join('')}
          </div>
        </div>

        ${allowedMoves.length > 0 ? `
          <div class="flex gap-2 pt-2 border-t border-studio-border">
            ${allowedMoves.map(next => `
              <button data-modal-move="${task.id}" data-from="${task.status}" data-to="${next}"
                class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors">
                ${next === 'inprogress' ? '⚡ Mulai Kerjakan' : next === 'review' ? '📤 Submit ke Review' : next}
              </button>`).join('')}
          </div>` : `
          <div class="pt-2 border-t border-studio-border text-center">
            <p class="text-xs text-studio-muted">${task.status === 'done' ? '🎉 Tugas selesai!' : '⏳ Menunggu keputusan Manager'}</p>
          </div>`}
      </div>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.querySelectorAll('[data-modal-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      handleMoveTask(btn.dataset.modalMove, btn.dataset.from, btn.dataset.to);
    });
  });
}
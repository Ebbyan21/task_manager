import { supabase } from '../../../utils/supabaseClient.js';
import { setPageTitle } from '../../../components/Navbar.js';
import { AppState } from '../../../app.js';
import { handleApprove, showRevisionModal } from './edit.js';

export async function render(container) {
  setPageTitle('Quality Control');
  container.innerHTML = `
    <div class="space-y-5">
      <div>
        <h2 class="text-xl font-bold text-white">Quality Control</h2>
        <p class="text-studio-muted text-sm">Periksa hasil kerja artist yang menunggu review</p>
      </div>
      <div id="review-list" class="space-y-3">
        ${[1,2,3].map(() => `<div class="skeleton h-28 rounded-xl"></div>`).join('')}
      </div>
    </div>`;

  await loadReviewTasks();
}

export async function loadReviewTasks() {
  const divId = AppState.profile.division_id;
  const { data: tasks } = await supabase.from('tasks')
    .select('*, profiles!assigned_to(full_name, avatar_url), projects!inner(name, division_id)')
    .eq('projects.division_id', divId)
    .in('status', ['review', 'revision'])
    .order('created_at', { ascending: false });

  const container = document.getElementById('review-list');

  if (!tasks?.length) {
    container.innerHTML = `
      <div class="text-center py-16 bg-studio-card border border-studio-border rounded-xl text-studio-muted">
        <span class="text-4xl block mb-3">✅</span>Tidak ada tugas yang menunggu review saat ini.
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(t => {
    const isRevision = t.status === 'revision';
    return `
      <div class="bg-studio-card border ${isRevision ? 'border-yellow-500/30' : 'border-studio-border'} rounded-xl p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="badge-${t.status} text-xs px-2.5 py-1 rounded-full">${t.status === 'review' ? '🔍 Review' : '📝 Revisi'}</span>
              <span class="badge-${t.priority} text-xs px-2 py-0.5 rounded">${t.priority}</span>
            </div>
            <h3 class="font-semibold text-white">${t.title}</h3>
            <p class="text-xs text-studio-muted mt-1">${t.projects?.name} • Artist: ${t.profiles?.full_name || '—'}</p>
            ${t.description ? `<p class="text-sm text-studio-muted mt-2 line-clamp-2">${t.description}</p>` : ''}
            
            ${t.gdrive_link ? `
              <div class="mt-3 flex items-center gap-2">
                <span class="text-xs text-studio-muted">📎 File:</span>
                <button data-external-link="${t.gdrive_link}" class="text-xs text-studio-cyan hover:text-cyan-300 underline truncate max-w-xs">${t.gdrive_link}</button>
              </div>` : `
              <div class="mt-3"><span class="text-xs text-studio-muted italic">Belum ada file yang dikirim.</span></div>`}

            ${t.revision_note ? `
              <div class="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p class="text-xs font-medium text-yellow-400 mb-1">📝 Catatan Revisi:</p>
                <p class="text-sm text-yellow-300">${t.revision_note}</p>
              </div>` : ''}
          </div>

          ${t.status === 'review' ? `
            <div class="flex flex-col gap-2 flex-shrink-0">
              <button data-action="approve" data-task-id="${t.id}" data-task-title="${t.title}"
                class="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">✅ Approve / Done</button>
              <button data-action="revise" data-task-id="${t.id}" data-task-title="${t.title}"
                class="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">📝 Perlu Revisi</button>
            </div>` : `
            <div class="flex-shrink-0">
              <span class="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">Menunggu perbaikan</span>
            </div>`}
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('button[data-action="approve"]').forEach(btn => {
    btn.addEventListener('click', () => handleApprove(btn.dataset.taskId, btn.dataset.taskTitle));
  });

  container.querySelectorAll('button[data-action="revise"]').forEach(btn => {
    btn.addEventListener('click', () => showRevisionModal(btn.dataset.taskId, btn.dataset.taskTitle));
  });

  container.querySelectorAll('button[data-external-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.externalLink;
      if (link && window.electronAPI?.openExternal) window.electronAPI.openExternal(link);
    });
  });
}
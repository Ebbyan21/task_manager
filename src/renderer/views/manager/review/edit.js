import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { loadReviewTasks } from './index.js';

export async function handleApprove(taskId, title) {
  const { error } = await supabase.from('tasks')
    .update({ status: 'done', revision_note: null })
    .eq('id', taskId);

  if (!error) {
    await logActivity('APPROVE_TASK', `Manager menyetujui task: ${title}`);
    showToast(`Task "${title}" disetujui dan ditandai Done!`, 'success');
    await loadReviewTasks();
  }
}

export function showRevisionModal(taskId, title) {
  showModal(`
    <div class="bg-studio-card border border-yellow-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-xl">📝</div>
        <div>
          <h3 class="text-lg font-bold text-white">Minta Revisi</h3>
          <p class="text-sm text-studio-muted truncate max-w-xs">${title}</p>
        </div>
      </div>

      <form id="revision-form" class="space-y-4">
        <input type="hidden" id="rev-task-id" value="${taskId}" />
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">
            Catatan Revisi * <span class="text-yellow-400">(wajib diisi)</span>
          </label>
          <textarea id="revision-note" required rows="4"
            class="w-full px-4 py-2.5 bg-studio-dark border border-yellow-500/30 rounded-lg text-studio-text text-sm focus:border-yellow-500 transition-colors resize-none"
            placeholder="Jelaskan apa yang perlu diperbaiki..."></textarea>
        </div>
        <p id="rev-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <div class="flex gap-3">
          <button type="button" id="rev-cancel-btn" class="flex-1 py-2.5 bg-studio-border text-studio-text rounded-lg text-sm">Batal</button>
          <button type="submit" id="rev-submit-btn" class="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-semibold transition-colors">Kirim Catatan Revisi</button>
        </div>
      </form>
    </div>`);

  document.getElementById('rev-cancel-btn')?.addEventListener('click', closeModal);

  document.getElementById('revision-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn   = document.getElementById('rev-submit-btn');
    const errEl = document.getElementById('rev-error');
    const id    = document.getElementById('rev-task-id').value;
    const note  = document.getElementById('revision-note').value.trim();

    if (!note) {
      errEl.textContent = 'Catatan revisi wajib diisi.';
      errEl.classList.remove('hidden'); return;
    }

    btn.disabled = true; btn.textContent = 'Mengirim...';

    const { error } = await supabase.from('tasks')
      .update({ status: 'revision', revision_note: note })
      .eq('id', id);

    if (!error) {
      await logActivity('REQUEST_REVISION', `Manager meminta revisi task: ${title}`);
      closeModal();
      showToast('Catatan revisi berhasil dikirim ke artist.', 'warning');
      await loadReviewTasks();
    } else {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
      btn.disabled = false; btn.textContent = 'Kirim Catatan Revisi';
    }
  });
}
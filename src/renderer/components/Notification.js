import { supabase } from '../utils/supabaseClient.js';
import { AppState, showToast } from '../app.js';

export function initNotification() {
  const channel = supabase
    .channel(`tasks-realtime-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => handleTaskChange(payload)
    )
    .subscribe();

  // Return channel agar bisa di-cleanup saat logout
  return channel;
}

function handleTaskChange(payload) {
  const role    = AppState.role;
  const userId  = AppState.user?.id;
  const newData = payload.new;
  const oldData = payload.old;

  if (!role || !userId) return;

  let shouldNotify = false;
  let title = '';
  let body  = '';

  if (payload.eventType === 'UPDATE') {
    if (role === 'employee' && newData.assigned_to === userId) {
      if (newData.status === 'revision' && oldData.status !== 'revision') {
        shouldNotify = true;
        title = '📝 Tugas Perlu Revisi';
        body  = `"${newData.title}" memerlukan perbaikan. Cek catatan revisi.`;
      }
      if (newData.status === 'done' && oldData.status !== 'done') {
        shouldNotify = true;
        title = '✅ Tugas Disetujui!';
        body  = `"${newData.title}" telah disetujui oleh Manager.`;
      }
    }
    if (role === 'manager' &&
        newData.status === 'review' &&
        oldData.status !== 'review') {
      shouldNotify = true;
      title = '🔍 Tugas Siap Direview';
      body  = `"${newData.title}" telah dikirim untuk Quality Control.`;
    }
  }

  if (payload.eventType === 'INSERT' && role === 'employee') {
    if (newData.assigned_to === userId) {
      shouldNotify = true;
      title = '📌 Tugas Baru Ditugaskan';
      body  = `Anda mendapat tugas baru: "${newData.title}"`;
    }
  }

  if (shouldNotify) {
    showToast(body, 'info');
    if (window.electronAPI?.notify) {
      window.electronAPI.notify({ title, body, urgency: 'normal' });
    }
  }
}
import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';
import { AppState } from '../../app.js';

export async function render(container) {
  setPageTitle('Dashboard Saya');
  const userId = AppState.user.id;

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">
          Halo, ${AppState.profile.full_name?.split(' ')[0]} 👋
        </h2>
        <p class="text-studio-muted text-sm">Berikut ringkasan tugas Anda hari ini</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="emp-metrics">
        ${[1,2,3,4].map(() => `<div class="skeleton h-24 rounded-xl"></div>`).join('')}
      </div>
      <div class="bg-studio-card border border-studio-border rounded-xl p-5">
        <h3 class="font-semibold text-white mb-4">⚡ Tugas Paling Urgent</h3>
        <div id="urgent-list" class="space-y-2">
          ${[1,2,3].map(() => `<div class="skeleton h-16 rounded-lg"></div>`).join('')}
        </div>
      </div>
    </div>`;

  // Metrics
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('assigned_to', userId);

  const countByStatus = (s) => tasks?.filter(t => t.status === s).length || 0;
  const metrics = [
    { label: 'To Do',      value: countByStatus('todo'),       icon: '📋', color: 'text-gray-400' },
    { label: 'On Progress',value: countByStatus('inprogress'), icon: '⚡', color: 'text-blue-400' },
    { label: 'In Review',  value: countByStatus('review') + countByStatus('revision'),
      icon: '🔍', color: 'text-purple-400' },
    { label: 'Done',       value: countByStatus('done'),       icon: '✅', color: 'text-green-400' },
  ];

  document.getElementById('emp-metrics').innerHTML = metrics.map(m => `
    <div class="bg-studio-card border border-studio-border rounded-xl p-4 text-center">
      <div class="text-2xl mb-2">${m.icon}</div>
      <div class="text-2xl font-bold ${m.color}">${m.value}</div>
      <div class="text-xs text-studio-muted mt-1">${m.label}</div>
    </div>`).join('');

  // Urgent tasks
  const { data: urgentTasks } = await supabase
    .from('tasks')
    .select('*, projects(name)')
    .eq('assigned_to', userId)
    .neq('status', 'done')
    .not('deadline', 'is', null)
    .order('deadline', { ascending: true })
    .limit(5);

  const urgentEl = document.getElementById('urgent-list');
  if (!urgentTasks?.length) {
    urgentEl.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">
      Tidak ada tugas dengan deadline. 🎉</p>`;
    return;
  }

  urgentEl.innerHTML = urgentTasks.map(t => {
    const deadline = new Date(t.deadline);
    const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    const color = isOverdue ? 'border-red-500/40 bg-red-500/5' :
                  daysLeft <= 1 ? 'border-yellow-500/40 bg-yellow-500/5' :
                  'border-studio-border';

    return `
      <div class="flex items-center justify-between p-4 rounded-xl border ${color}">
        <div class="flex-1 min-w-0 pr-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="badge-${t.status} text-xs px-2 py-0.5 rounded-full">${t.status}</span>
            <span class="badge-${t.priority} text-xs px-2 py-0.5 rounded">${t.priority}</span>
          </div>
          <p class="font-medium text-studio-text text-sm truncate">${t.title}</p>
          <p class="text-xs text-studio-muted">${t.projects?.name}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-sm font-semibold ${isOverdue ? 'text-red-400' :
            daysLeft <= 1 ? 'text-yellow-400' : 'text-studio-muted'}">
            ${isOverdue ? 'Terlambat!' :
              daysLeft === 0 ? 'Hari ini' :
              daysLeft === 1 ? 'Besok' : `${daysLeft} hari lagi`}
          </p>
          <p class="text-xs text-studio-muted">
            ${deadline.toLocaleDateString('id-ID', {day:'numeric',month:'short'})}
          </p>
        </div>
      </div>`;
  }).join('');
}
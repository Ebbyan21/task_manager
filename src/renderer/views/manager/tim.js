import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';
import { AppState } from '../../app.js';

export async function render(container) {
  setPageTitle('Tim Saya');
  const divId   = AppState.profile.division_id;
  const divName = AppState.profile.divisions?.name || 'Divisi Anda';

  if (!divId) {
    container.innerHTML = `
      <div class="text-center py-16 text-studio-muted">
        <span class="text-4xl block mb-3">⚠️</span>
        <p>Anda belum terdaftar di divisi manapun.</p>
        <p class="text-sm mt-1">Hubungi Admin untuk diassign ke divisi.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="space-y-5">
      <div>
        <h2 class="text-xl font-bold text-white">Tim — ${divName}</h2>
        <p class="text-studio-muted text-sm">Daftar artist di divisi Anda beserta beban kerja mereka</p>
      </div>
      <div id="team-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${[1,2,3].map(() => `<div class="skeleton h-48 rounded-xl"></div>`).join('')}
      </div>
    </div>`;

  const { data: members } = await supabase.from('profiles').select('id, full_name, avatar_url, is_online, is_first_login').eq('division_id', divId).eq('role', 'employee').order('full_name');
  const grid = document.getElementById('team-grid');
  if (!members?.length) {
    grid.innerHTML = `<div class="col-span-3 text-center py-16 text-studio-muted bg-studio-card border border-studio-border rounded-xl"><span class="text-4xl block mb-3">👥</span>Belum ada artist di divisi ${divName}.</div>`;
    return;
  }

  const { data: divProjects } = await supabase.from('projects').select('id').eq('division_id', divId);
  const projIds = divProjects?.map(p => p.id) || [];
  const { data: tasks } = projIds.length ? await supabase.from('tasks').select('assigned_to, status, title, deadline, priority').in('project_id', projIds) : { data: [] };

  grid.innerHTML = members.map(m => {
    const myTasks   = tasks?.filter(t => t.assigned_to === m.id) || [];
    const statusMap = {};
    myTasks.forEach(t => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
    const urgentTask  = myTasks.filter(t => t.deadline && ['todo','inprogress'].includes(t.status)).sort((a,b) => new Date(a.deadline) - new Date(b.deadline))[0];
    const workload = myTasks.filter(t => t.status !== 'done').length;

    return `
      <div class="bg-studio-card border border-studio-border rounded-xl p-5 studio-card-hover">
        <div class="flex items-center gap-4 mb-4">
          <div class="relative flex-shrink-0">
            ${m.avatar_url ? `<img src="${m.avatar_url}" class="w-14 h-14 rounded-full object-cover" />` : `<div class="w-14 h-14 rounded-full bg-gradient-to-br from-studio-accent to-studio-cyan flex items-center justify-center text-white text-xl font-bold">${m.full_name?.charAt(0)}</div>`}
            <span class="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-studio-card ${m.is_online ? 'bg-green-400' : 'bg-studio-muted'}"></span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-white truncate">${m.full_name}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs ${m.is_online ? 'text-green-400' : 'text-studio-muted'}">${m.is_online ? '● Online' : '○ Offline'}</span>
              ${m.is_first_login ? `<span class="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">⚠️ Belum ganti PW</span>` : ''}
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center mb-3">
          ${[
            { label: 'Aktif',  statuses: ['todo','inprogress'], color: 'text-blue-400' },
            { label: 'Review',  statuses: ['review','revision'], color: 'text-purple-400' },
            { label: 'Selesai', statuses: ['done'],              color: 'text-green-400' },
          ].map(g => {
            const cnt = g.statuses.reduce((a,s)=> a+(statusMap[s]||0), 0)
            return `<div class="bg-studio-dark/60 rounded-lg py-2"><p class="text-lg font-bold ${g.color}">${cnt}</p><p class="text-xs text-studio-muted">${g.label}</p></div>`;
          }).join('')}
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-studio-muted">Beban Kerja</span>
          <span class="text-xs font-semibold ${workload === 0 ? 'text-green-400' : workload <= 2 ? 'text-yellow-400' : 'text-red-400'}">
            ${workload === 0 ? '🟢 Tersedia' : workload <= 2 ? '🟡 Sedang Sibuk' : '🔴 Sangat Sibuk'}
          </span>
        </div>
        ${urgentTask ? `
          <div class="mt-3 p-2.5 bg-studio-dark/60 rounded-lg border border-studio-border/50">
            <p class="text-xs text-studio-muted mb-0.5">Task paling dekat:</p>
            <p class="text-xs text-studio-text font-medium truncate">${urgentTask.title}</p>
            <p class="text-xs text-yellow-400">📅 ${new Date(urgentTask.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}</p>
          </div>
        ` : ''}
      </div>`;
  }).join('');
}
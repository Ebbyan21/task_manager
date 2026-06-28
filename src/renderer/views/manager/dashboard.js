import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';
import { AppState } from '../../app.js';

export async function render(container) {
  setPageTitle('Dashboard Divisi');

  const divId   = AppState.profile.division_id;
  const divName = AppState.profile.divisions?.name || 'Divisi Anda';

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">Dashboard — ${divName}</h2>
        <p class="text-studio-muted text-sm">Statistik dan ringkasan divisi Anda</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="div-metrics">
        ${[1,2,3].map(() => `<div class="skeleton h-28 rounded-xl"></div>`).join('')}
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-5">
        <div class="flex items-center gap-3 mb-5">
          <span class="text-2xl">🏆</span>
          <div>
            <h3 class="font-semibold text-white">Karyawan Terbaik — ${divName}</h3>
            <p class="text-studio-muted text-xs">Metode SAW · C1 Tugas Selesai 40% · C2 Revisi 10% · C3 Prioritas Task 20% · C4 Keaktifan 30%</p>
          </div>
        </div>
        <div id="top-employees-division" class="space-y-3">
          ${[1,2,3].map(() => `<div class="skeleton h-16 rounded-xl"></div>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-studio-card border border-studio-border rounded-xl p-5">
          <h3 class="font-semibold text-white mb-4">Tugas Mendekati Deadline</h3>
          <div id="urgent-tasks" class="space-y-2"></div>
        </div>
        <div class="bg-studio-card border border-studio-border rounded-xl p-5">
          <h3 class="font-semibold text-white mb-4">Status Tim</h3>
          <div id="team-status" class="space-y-2"></div>
        </div>
      </div>
    </div>`;

  await loadDivisionMetrics(divId);
  await loadTopEmployeesDivision(divId);
  await loadUrgentTasks(divId);
  await loadTeamStatus(divId);
}

async function loadDivisionMetrics(divId) {
  const [
    { count: totalArtists },
    { count: totalProjects },
    { count: activeTasks },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('division_id', divId).eq('role', 'employee'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('division_id', divId),
    supabase.from('tasks').select('*, projects!inner(*)', { count: 'exact', head: true }).eq('projects.division_id', divId).in('status', ['todo','inprogress','review']),
  ]);

  const metrics = [
    { label: 'Artist di Divisi', value: totalArtists ?? 0, icon: '🎨', color: 'from-purple-600/20 to-purple-800/10', border: 'border-purple-500/30' },
    { label: 'Project Divisi', value: totalProjects ?? 0, icon: '📁', color: 'from-cyan-600/20 to-cyan-800/10', border: 'border-cyan-500/30' },
    { label: 'Tugas On Progress', value: activeTasks ?? 0, icon: '⚡', color: 'from-green-600/20 to-green-800/10', border: 'border-green-500/30' },
  ];

  document.getElementById('div-metrics').innerHTML = metrics.map(m => `
    <div class="bg-gradient-to-br ${m.color} border ${m.border} rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-3xl">${m.icon}</span>
        <span class="text-3xl font-bold text-white">${m.value}</span>
      </div>
      <p class="text-studio-muted text-sm font-medium">${m.label}</p>
    </div>`).join('');
}

function hitungSAW(candidates) {
  const W = { c1: 0.40, c2: 0.10, c3: 0.20, c4: 0.30 };
  const aktif    = candidates.filter(c => c.totalDone > 0);
  const nonAktif = candidates.filter(c => c.totalDone === 0);

  if (!aktif.length) return candidates.map(c => ({ ...c, sawScore: 0 }));

  const maxC1 = Math.max(...aktif.map(c => c.totalDone), 1);
  const minC2 = Math.min(...aktif.map(c => c.totalRevisions));
  const maxC3 = Math.max(...aktif.map(c => c.priorityScore), 1);
  const maxC4 = Math.max(...aktif.map(c => c.uniqueProjects), 1);

  const normalisasi = (c) => {
    const n1 = c.totalDone / maxC1;
    const n2 = c.totalRevisions === 0 ? 1 : minC2 === 0 ? 1 / (1 + c.totalRevisions) : minC2 / c.totalRevisions;
    const n3 = c.priorityScore / maxC3;
    const n4 = c.uniqueProjects / maxC4;
    return { ...c, sawScore: W.c1 * n1 + W.c2 * n2 + W.c3 * n3 + W.c4 * n4 };
  };

  const hasilAktif = aktif.map(normalisasi);
  const hasilNonAktif = nonAktif.map(c => ({ ...c, sawScore: 0 }));

  return candidates.map(c => hasilAktif.find(a => a.id === c.id) ?? hasilNonAktif.find(n => n.id === c.id));
}

async function loadTopEmployeesDivision(divId) {
  const el = document.getElementById('top-employees-division');
  const { data: members, error: memErr } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('division_id', divId).eq('role', 'employee');
  if (memErr || !members?.length) {
    el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Belum ada artist di divisi ini.</p>`;
    return;
  }
  const memberIds = members.map(m => m.id);
  const [{ data: doneTasks }, { data: allTasks }] = await Promise.all([
    supabase.from('tasks').select('assigned_to, priority, revision_count').in('assigned_to', memberIds).eq('status', 'done'),
    supabase.from('tasks').select('assigned_to, project_id').in('assigned_to', memberIds),
  ]);

  const candidates = members.map(m => {
    const myDone = (doneTasks || []).filter(t => t.assigned_to === m.id);
    const uniqueProjects = new Set((allTasks || []).filter(t => t.assigned_to === m.id).map(t => t.project_id)).size;
    return {
      ...m,
      totalDone: myDone.length,
      totalRevisions: myDone.reduce((s, t) => s + (t.revision_count || 0), 0),
      priorityScore: myDone.reduce((s, t) => s + (t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1), 0),
      uniqueProjects
    };
  });

  const scored = hitungSAW(candidates);
  scored.sort((a, b) => b.sawScore - a.sawScore);
  const top3 = scored.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = ['border-yellow-500/40 bg-yellow-500/5', 'border-slate-400/40 bg-slate-400/5', 'border-orange-500/40 bg-orange-500/5'];

  el.innerHTML = top3.map((m, i) => `
    <div class="flex items-center gap-4 p-3 rounded-xl border ${medalColors[i]} transition-colors">
      <span class="text-2xl w-8 text-center flex-shrink-0">${medals[i]}</span>
      <div class="w-10 h-10 rounded-full bg-studio-accent/30 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
        ${m.avatar_url ? `<img src="${m.avatar_url}" class="w-full h-full object-cover" />` : m.full_name?.charAt(0) || '?'}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white truncate">${m.full_name}</p>
        <div class="flex gap-3 mt-1 flex-wrap">
          <span class="text-xs text-green-400">✅ ${m.totalDone} selesai</span>
          <span class="text-xs text-red-400">🔁 ${m.totalRevisions} revisi</span>
          <span class="text-xs text-orange-400">⭐ skor ${m.priorityScore}</span>
          <span class="text-xs text-cyan-400">📁 ${m.uniqueProjects} project</span>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-bold text-studio-accent">${(m.sawScore * 100).toFixed(1)}</p>
        <p class="text-xs text-studio-muted">skor SAW</p>
      </div>
    </div>`).join('');
}

async function loadUrgentTasks(divId) {
  const { data: tasks } = await supabase.from('tasks').select('*, projects!inner(name, division_id), profiles!assigned_to(full_name)').eq('projects.division_id', divId).neq('status', 'done').not('deadline', 'is', null).order('deadline', { ascending: true }).limit(5);
  const el = document.getElementById('urgent-tasks');
  if (!tasks?.length) { el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Tidak ada tugas mendekati deadline.</p>`; return; }

  el.innerHTML = tasks.map(t => {
    const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    return `
      <div class="flex items-center justify-between p-3 rounded-lg bg-studio-dark/50 hover:bg-studio-dark transition-colors">
        <div class="flex-1 min-w-0 pr-3">
          <p class="text-sm font-medium text-studio-text truncate">${t.title}</p>
          <p class="text-xs text-studio-muted">${t.profiles?.full_name || 'Belum ditugaskan'} • ${t.projects?.name}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="text-xs font-semibold ${isOverdue ? 'text-red-400' : daysLeft <= 2 ? 'text-yellow-400' : 'text-green-400'}">
            ${isOverdue ? 'Terlambat' : daysLeft === 0 ? 'Hari ini' : daysLeft === 1 ? 'Besok' : `${daysLeft} hari`}
          </span>
          <p class="text-xs text-studio-muted">${new Date(t.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}</p>
        </div>
      </div>`;
  }).join('');
}

async function loadTeamStatus(divId) {
  const { data: members } = await supabase.from('profiles').select('id, full_name, is_online, avatar_url').eq('division_id', divId).eq('role', 'employee');
  const el = document.getElementById('team-status');
  if (!members?.length) { el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Belum ada artist di divisi ini.</p>`; return; }

  const { data: taskCounts } = await supabase.from('tasks').select('assigned_to').in('assigned_to', members.map(m => m.id)).in('status', ['todo','inprogress','review']);
  const countMap = {};
  taskCounts?.forEach(t => { countMap[t.assigned_to] = (countMap[t.assigned_to] || 0) + 1; });

  el.innerHTML = members.map(m => `
    <div class="flex items-center justify-between p-2.5 rounded-lg hover:bg-studio-border/30 transition-colors">
      <div class="flex items-center gap-3">
        <div class="relative">
          ${m.avatar_url ? `<img src="${m.avatar_url}" class="w-8 h-8 rounded-full object-cover" />` : `<div class="w-8 h-8 rounded-full bg-studio-accent/30 flex items-center justify-center text-white text-xs font-bold">${m.full_name?.charAt(0)}</div>`}
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-studio-card ${m.is_online ? 'bg-green-400' : 'bg-studio-muted'}"></span>
        </div>
        <div>
          <p class="text-sm font-medium text-studio-text ${m.is_online ? 'text-white' : ''}">${m.full_name}</p>
          <p class="text-xs text-studio-muted">${countMap[m.id] || 0} tugas aktif</p>
        </div>
      </div>
      <span class="text-xs ${m.is_online ? 'text-green-400' : 'text-studio-muted'}">${m.is_online ? '● Online' : '○ Offline'}</span>
    </div>`).join('');
}
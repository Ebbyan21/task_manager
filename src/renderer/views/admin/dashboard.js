import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';

export async function render(container) {
  setPageTitle('Dashboard Global');

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">Dashboard Studio</h2>
        <p class="text-studio-muted text-sm mt-1">Ringkasan metrik seluruh operasional studio</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="metrics-grid">
        ${[1,2,3].map(() => `<div class="skeleton h-28 rounded-xl"></div>`).join('')}
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl p-5">
        <div class="flex items-center gap-3 mb-5">
          <span class="text-2xl">🏆</span>
          <div>
            <h3 class="font-semibold text-white">Karyawan Terbaik Studio</h3>
            <p class="text-studio-muted text-xs">Metode SAW · C1 Tugas Selesai 40% · C2 Revisi 10% · C3 Prioritas Task 20% · C4 Keaktifan 30%</p>
          </div>
        </div>
        <div id="top-employees-global" class="space-y-3">
          ${[1,2,3].map(() => `<div class="skeleton h-16 rounded-xl"></div>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-studio-card border border-studio-border rounded-xl p-5">
          <h3 class="font-semibold text-white mb-4">Aktivitas Terbaru</h3>
          <div id="recent-activity" class="space-y-2">
            ${[1,2,3,4].map(() => `<div class="skeleton h-10 rounded-lg"></div>`).join('')}
          </div>
        </div>
        <div class="bg-studio-card border border-studio-border rounded-xl p-5">
          <h3 class="font-semibold text-white mb-4">Status Karyawan</h3>
          <div id="employee-status" class="space-y-2">
            ${[1,2,3,4].map(() => `<div class="skeleton h-10 rounded-lg"></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  await loadMetrics();
  await loadTopEmployeesGlobal();
  await loadRecentActivity();
  await loadEmployeeStatus();
}

async function loadMetrics() {
  const [
    { count: totalEmployees },
    { count: totalProjects },
    { count: totalTasks },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done'),
  ]);

  const metrics = [
    { label: 'Total Karyawan', value: totalEmployees ?? 0, icon: '👥', color: 'from-purple-600/20 to-purple-800/10', border: 'border-purple-500/30' },
    { label: 'Project Berjalan', value: totalProjects ?? 0, icon: '📁', color: 'from-cyan-600/20 to-cyan-800/10', border: 'border-cyan-500/30' },
    { label: 'Tugas Aktif', value: totalTasks ?? 0, icon: '📌', color: 'from-green-600/20 to-green-800/10', border: 'border-green-500/30' },
  ];

  document.getElementById('metrics-grid').innerHTML = metrics.map(m => `
    <div class="bg-gradient-to-br ${m.color} border ${m.border} rounded-xl p-5 studio-card-hover">
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
    const sawScore = W.c1 * n1 + W.c2 * n2 + W.c3 * n3 + W.c4 * n4;
    return { ...c, sawScore };
  };

  const hasilAktif    = aktif.map(normalisasi);
  const hasilNonAktif = nonAktif.map(c => ({ ...c, sawScore: 0 }));

  return candidates.map(c => hasilAktif.find(a => a.id === c.id) ?? hasilNonAktif.find(n => n.id === c.id));
}

async function loadTopEmployeesGlobal() {
  const el = document.getElementById('top-employees-global');
  const { data: employees, error: empErr } = await supabase.from('profiles').select('id, full_name, avatar_url, divisions(name)').eq('role', 'employee');

  if (empErr || !employees?.length) {
    el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Belum ada data karyawan.</p>`; return;
  }

  const empIds = employees.map(e => e.id);
  const [{ data: doneTasks }, { data: allTasks }] = await Promise.all([
    supabase.from('tasks').select('assigned_to, priority, revision_count').in('assigned_to', empIds).eq('status', 'done'),
    supabase.from('tasks').select('assigned_to, project_id').in('assigned_to', empIds),
  ]);

  const candidates = employees.map(emp => {
    const myDone = (doneTasks || []).filter(t => t.assigned_to === emp.id);
    const totalDone = myDone.length;
    const totalRevisions = myDone.reduce((s, t) => s + (t.revision_count || 0), 0);
    const priorityScore = myDone.reduce((s, t) => {
      if (t.priority === 'high') return s + 3;
      if (t.priority === 'medium') return s + 2;
      return s + 1;
    }, 0);
    const uniqueProjects = new Set((allTasks || []).filter(t => t.assigned_to === emp.id).map(t => t.project_id)).size;
    return { ...emp, totalDone, totalRevisions, priorityScore, uniqueProjects };
  });

  const scored = hitungSAW(candidates);
  scored.sort((a, b) => b.sawScore - a.sawScore);
  const top5 = scored.slice(0, 5);

  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const medalColors = ['border-yellow-500/40 bg-yellow-500/5', 'border-slate-400/40 bg-slate-400/5', 'border-orange-500/40 bg-orange-500/5', 'border-studio-border bg-studio-dark/30', 'border-studio-border bg-studio-dark/30'];

  el.innerHTML = top5.map((emp, i) => `
    <div class="flex items-center gap-4 p-3 rounded-xl border ${medalColors[i]} transition-colors">
      <span class="text-2xl w-8 text-center flex-shrink-0">${medals[i]}</span>
      <div class="w-10 h-10 rounded-full bg-studio-accent/30 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
        ${emp.avatar_url ? `<img src="${emp.avatar_url}" class="w-full h-full object-cover" />` : emp.full_name?.charAt(0) || '?'}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white truncate">${emp.full_name}</p>
        <p class="text-xs text-studio-muted">${emp.divisions?.name || '—'}</p>
        <div class="flex gap-3 mt-1 flex-wrap">
          <span class="text-xs text-green-400" title="C1">✅ ${emp.totalDone} selesai</span>
          <span class="text-xs text-red-400" title="C2">🔁 ${emp.totalRevisions} revisi</span>
          <span class="text-xs text-orange-400" title="C3">⭐ skor ${emp.priorityScore}</span>
          <span class="text-xs text-cyan-400" title="C4">📁 ${emp.uniqueProjects} project</span>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <p class="text-sm font-bold text-studio-accent">${(emp.sawScore * 100).toFixed(1)}</p>
        <p class="text-xs text-studio-muted">skor SAW</p>
      </div>
    </div>`).join('');
}

async function loadRecentActivity() {
  const { data: logs } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(6);
  const el = document.getElementById('recent-activity');
  
  if (!logs?.length) {
    el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Belum ada aktivitas.</p>`; return;
  }

  el.innerHTML = logs.map(log => `
    <div class="flex items-start gap-3 p-2.5 rounded-lg hover:bg-studio-border/30 transition-colors">
      <div class="w-7 h-7 rounded-full bg-studio-accent/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
        ${log.profiles?.full_name?.charAt(0) || '?'}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-studio-text truncate"><span class="font-medium">${log.profiles?.full_name || 'Unknown'}</span> — ${log.action}</p>
        <p class="text-xs text-studio-muted">${new Date(log.created_at).toLocaleString('id-ID')}</p>
      </div>
    </div>`).join('');
}

async function loadEmployeeStatus() {
  const { data: employees } = await supabase.from('profiles').select('full_name, is_online, role, divisions(name)').neq('role', 'admin').order('is_online', { ascending: false }).limit(8);
  const el = document.getElementById('employee-status');
  
  if (!employees?.length) {
    el.innerHTML = `<p class="text-studio-muted text-sm text-center py-4">Belum ada karyawan.</p>`; return;
  }

  el.innerHTML = employees.map(emp => `
    <div class="flex items-center justify-between p-2.5 rounded-lg hover:bg-studio-border/30 transition-colors">
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-8 h-8 rounded-full bg-studio-accent/30 flex items-center justify-center text-sm font-semibold text-white">
            ${emp.full_name?.charAt(0) || '?'}
          </div>
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-studio-card ${emp.is_online ? 'bg-green-400' : 'bg-studio-muted'}"></span>
        </div>
        <div>
          <p class="text-sm text-studio-text font-medium">${emp.full_name}</p>
          <p class="text-xs text-studio-muted">${emp.divisions?.name || '—'}</p>
        </div>
      </div>
      <span class="text-xs px-2 py-0.5 rounded-full font-medium ${emp.is_online ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-studio-border text-studio-muted'}">
        ${emp.is_online ? 'Online' : 'Offline'}
      </span>
    </div>`).join('');
}
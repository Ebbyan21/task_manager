import { supabase } from '../../utils/supabaseClient.js';
import { setPageTitle } from '../../components/Navbar.js';

export async function render(container) {
  setPageTitle('Audit Log');
  container.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white">Audit Log Explorer</h2>
          <p class="text-studio-muted text-sm">Riwayat seluruh aktivitas sistem</p>
        </div>
        <button id="btn-refresh" class="px-4 py-2 bg-studio-border hover:bg-studio-border/70 text-studio-text text-sm rounded-lg transition-colors">
          🔄 Refresh
        </button>
      </div>

      <div class="flex gap-3">
        <input type="text" id="search-log" placeholder="Cari aksi atau nama..." class="flex-1 px-4 py-2 bg-studio-card border border-studio-border rounded-lg text-studio-text text-sm placeholder-studio-muted/50 focus:border-studio-accent transition-colors" />
        <input type="date" id="filter-date" class="px-3 py-2 bg-studio-card border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
      </div>

      <div class="bg-studio-card border border-studio-border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-studio-border bg-studio-dark/50">
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Waktu</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">User</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Aksi</th>
                <th class="text-left px-5 py-3 text-studio-muted font-medium">Detail</th>
              </tr>
            </thead>
            <tbody id="log-tbody">
              ${[1,2,3,4,5].map(() => `<tr class="border-b border-studio-border/50"><td colspan="4" class="px-5 py-3"><div class="skeleton h-6 rounded"></div></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between px-5 py-3 border-t border-studio-border">
          <span id="log-count" class="text-xs text-studio-muted">Memuat...</span>
          <div class="flex gap-2">
            <button id="btn-prev" class="px-3 py-1.5 bg-studio-border text-studio-text text-xs rounded-lg disabled:opacity-40 transition-colors">← Prev</button>
            <button id="btn-next" class="px-3 py-1.5 bg-studio-border text-studio-text text-xs rounded-lg disabled:opacity-40 transition-colors">Next →</button>
          </div>
        </div>
      </div>
    </div>`;

  let currentPage = 0;
  const PAGE_SIZE = 20;

  async function loadLogs() {
    const search = document.getElementById('search-log')?.value?.toLowerCase() || '';
    const date   = document.getElementById('filter-date')?.value || '';

    let query = supabase.from('audit_logs')
      .select('*, profiles(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (date) query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);

    const { data: logs, count } = await query;
    const tbody = document.getElementById('log-tbody');
    if (!tbody) return;

    const filtered = search
      ? logs?.filter(l => l.action?.toLowerCase().includes(search) || l.profiles?.full_name?.toLowerCase().includes(search) || l.details?.toLowerCase().includes(search))
      : logs;

    if (!filtered?.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-studio-muted">Tidak ada log ditemukan.</td></tr>`;
    } else {
      const ACTION_ICON = {
        CREATE_USER: '👤', UPDATE_USER: '✏️', DEACTIVATE_USER: '🚫',
        CREATE_PROJECT: '📁', UPDATE_PROJECT: '📝', DELETE_PROJECT: '🗑️',
        CREATE_TASK: '📌', UPDATE_TASK: '🔄', DELETE_TASK: '❌',
        LOGIN: '🔐', LOGOUT: '🚪', CHANGE_PASSWORD: '🔑',
        UPLOAD_AVATAR: '🖼️', UPDATE_PROFILE: '👤',
      };

      tbody.innerHTML = filtered.map(log => `
        <tr class="border-b border-studio-border/40 hover:bg-studio-border/20 transition-colors">
          <td class="px-5 py-3 text-xs text-studio-muted whitespace-nowrap">${new Date(log.created_at).toLocaleString('id-ID')}</td>
          <td class="px-5 py-3"><span class="text-sm font-medium text-studio-text">${log.profiles?.full_name || 'System'}</span></td>
          <td class="px-5 py-3">
            <span class="flex items-center gap-2 text-sm">
              <span>${ACTION_ICON[log.action] || '🔹'}</span><span class="font-mono text-xs text-cyan-400">${log.action}</span>
            </span>
          </td>
          <td class="px-5 py-3 text-sm text-studio-muted max-w-xs truncate">${log.details || '—'}</td>
        </tr>`).join('');
    }

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);
    document.getElementById('log-count').textContent = `${count || 0} log total • Halaman ${currentPage + 1} dari ${totalPages || 1}`;
    document.getElementById('btn-prev').disabled = currentPage === 0;
    document.getElementById('btn-next').disabled = currentPage >= totalPages - 1 || totalPages === 0;
  }

  document.getElementById('btn-refresh').addEventListener('click', () => loadLogs());
  document.getElementById('btn-prev').addEventListener('click', () => { if (currentPage > 0) { currentPage--; loadLogs(); } });
  document.getElementById('btn-next').addEventListener('click', () => { currentPage++; loadLogs(); });
  document.getElementById('search-log').addEventListener('input', () => { currentPage = 0; loadLogs(); });
  document.getElementById('filter-date').addEventListener('change', () => { currentPage = 0; loadLogs(); });

  await loadLogs();
}
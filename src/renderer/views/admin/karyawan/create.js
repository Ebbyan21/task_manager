import { supabase, logActivity } from '../../../utils/supabaseClient.js';
import { showModal, closeModal, showToast } from '../../../app.js';
import { loadKaryawan, fetchDivisions, setDivisions } from './index.js';

export function showAddEmployeeModal(divisions) {
  showModal(`
    <div class="bg-studio-card border border-studio-border rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-lg font-bold text-white">Tambah Pengguna Baru</h3>
          <p class="text-xs text-studio-muted mt-0.5">Akun langsung aktif tanpa verifikasi email</p>
        </div>
        <button id="m-close" class="text-studio-muted hover:text-white text-xl leading-none flex-shrink-0">✕</button>
      </div>

      <form id="add-emp-form" class="space-y-4">
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Nama Lengkap *</label>
          <input type="text" id="emp-name" required placeholder="Nama lengkap pengguna"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Email *</label>
          <input type="email" id="emp-email" required placeholder="email@studio.com"
            class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors" />
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Password Default *</label>
          <div class="relative">
            <input type="text" id="emp-password" required minlength="8" value="Studio123!"
              class="w-full px-4 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors pr-24" />
            <button type="button" id="gen-pw" class="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-studio-border hover:bg-studio-accent/20 text-studio-muted hover:text-studio-accent px-2 py-1 rounded transition-colors">Generate</button>
          </div>
          <p class="text-xs text-studio-muted mt-1">Karyawan wajib mengganti password ini saat login pertama.</p>
        </div>
        <div>
          <label class="block text-sm text-studio-muted mb-1.5">Role *</label>
          <select id="emp-role" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
            <option value="employee">🎨 Artist / Employee</option>
            <option value="manager">🎯 Manager / Lead</option>
            <option value="admin">👑 Admin / HR</option>
          </select>
          <div id="admin-warning" class="hidden mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            ⚠️ Admin memiliki akses penuh ke seluruh sistem termasuk data karyawan dan audit log. Pastikan Anda yakin memberikan role ini.
          </div>
        </div>
        <div id="division-field">
          <label class="block text-sm text-studio-muted mb-1.5">Divisi</label>
          <select id="emp-division" class="w-full px-3 py-2.5 bg-studio-dark border border-studio-border rounded-lg text-studio-text text-sm focus:border-studio-accent transition-colors">
            <option value="">— Pilih Divisi —</option>
            ${divisions.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div id="add-emp-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></div>
        <div class="flex gap-3 pt-2">
          <button type="button" id="m-cancel" class="flex-1 py-2.5 bg-studio-border hover:bg-studio-border/70 text-studio-text rounded-lg text-sm transition-colors">Batal</button>
          <button type="submit" id="add-emp-btn" class="flex-1 py-2.5 bg-studio-accent hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors">Buat Akun</button>
        </div>
      </form>
    </div>`);

  document.getElementById('m-close').addEventListener('click', closeModal);
  document.getElementById('m-cancel').addEventListener('click', closeModal);

  document.getElementById('emp-role').addEventListener('change', (e) => {
    const isAdmin = e.target.value === 'admin';
    document.getElementById('admin-warning').classList.toggle('hidden', !isAdmin);
    document.getElementById('division-field').classList.toggle('hidden', isAdmin);
  });

  document.getElementById('gen-pw').addEventListener('click', () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    const pw = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    document.getElementById('emp-password').value = pw;
  });

  document.getElementById('add-emp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn      = document.getElementById('add-emp-btn');
    const errEl    = document.getElementById('add-emp-error');
    const name     = document.getElementById('emp-name').value.trim();
    const email    = document.getElementById('emp-email').value.trim();
    const password = document.getElementById('emp-password').value;
    const role     = document.getElementById('emp-role').value;
    const isAdmin  = role === 'admin';
    const divisionId = isAdmin ? null : document.getElementById('emp-division').value || null;

    btn.disabled    = true;
    btn.textContent = 'Membuat akun...';
    errEl.classList.add('hidden');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role: role, division_id: divisionId },
        },
      });

      if (error) throw error;
      await logActivity('CREATE_USER', `Admin membuat akun: ${name} (${email}) sebagai ${role}`);

      closeModal();
      showToast(`Akun ${name} berhasil dibuat sebagai ${role}!`, 'success');
      
      const updatedDivs = await fetchDivisions();
      setDivisions(updatedDivs);
      await loadKaryawan();
    } catch (err) {
      errEl.textContent = err.message.includes('already registered') ? 'Email ini sudah terdaftar. Gunakan email lain.' : err.message;
      errEl.classList.remove('hidden');
      btn.disabled    = false;
      btn.textContent = 'Buat Akun';
    }
  });
}
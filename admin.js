// Point this at your running ASP.NET Core API (see /backend/README.md).
const API_BASE_URL = window.MAISON_API_BASE_URL || 'http://localhost:5231';

const state = {
  token: localStorage.getItem('maison_admin_token') || null,
  username: localStorage.getItem('maison_admin_username') || null,
};

// ---------- helpers ----------
function authHeaders(extra = {}) {
  return state.token
    ? { ...extra, Authorization: `Bearer ${state.token}` }
    : extra;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusColor(status) {
  return {
    Pending: 'bg-yellow-500/20 text-yellow-300',
    Confirmed: 'bg-blue-500/20 text-blue-300',
    Completed: 'bg-green-500/20 text-green-300',
    Cancelled: 'bg-red-500/20 text-red-300',
  }[status] || 'bg-white/10 text-white';
}

// ---------- auth ----------
function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}
function showApp() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('whoami').textContent = `Signed in as ${state.username}`;
  loadOverview();
}
function logout() {
  state.token = null;
  state.username = null;
  localStorage.removeItem('maison_admin_token');
  localStorage.removeItem('maison_admin_username');
  showLogin();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errBox = document.getElementById('login-error');
  errBox.classList.add('hidden');
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid username or password.');
    const data = await res.json();
    state.token = data.token;
    state.username = data.username;
    localStorage.setItem('maison_admin_token', data.token);
    localStorage.setItem('maison_admin_username', data.username);
    showApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

// ---------- tabs ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'overview') loadOverview();
    if (btn.dataset.tab === 'bookings') loadBookings();
    if (btn.dataset.tab === 'clients') loadClients();
    if (btn.dataset.tab === 'stylists') loadStylists();
    if (btn.dataset.tab === 'services') loadServices();
  });
});

// ---------- overview ----------
async function loadOverview() {
  try {
    const s = await api('/api/dashboard/summary');
    document.getElementById('stat-cards').innerHTML = [
      ['Total Bookings', s.totalBookings],
      ['Pending', s.pendingBookings],
      ['Confirmed', s.confirmedBookings],
      ['Completed', s.completedBookings],
      ['Cancelled', s.cancelledBookings],
      ['Total Clients', s.totalClients],
      ['Active Stylists', s.activeStylists],
      ['Active Services', s.activeServices],
    ].map(([label, val]) => `
      <div class="card p-4">
        <p class="text-2xl font-semibold gold">${val}</p>
        <p class="text-[10px] uppercase tracking-widest text-[#A0A0A0] mt-1">${label}</p>
      </div>`).join('');

    document.querySelector('#recent-bookings-table tbody').innerHTML = s.recentBookings.map(b => `
      <tr>
        <td>${b.clientName}</td>
        <td>${b.serviceName}</td>
        <td>${b.stylistName || '—'}</td>
        <td>${fmtDate(b.requestedDate)}</td>
        <td><span class="status-pill ${statusColor(b.status)}">${b.status}</span></td>
      </tr>`).join('') || '<tr><td colspan="5" class="text-[#A0A0A0]">No bookings yet.</td></tr>';
  } catch (err) { console.error(err); }
}

// ---------- bookings ----------
async function loadBookings() {
  const status = document.getElementById('booking-filter-status').value;
  const qs = status ? `?status=${status}` : '';
  try {
    const bookings = await api(`/api/bookings${qs}`);
    document.getElementById('bookings-table-body').innerHTML = bookings.map(b => `
      <tr>
        <td>${b.clientName}</td>
        <td>${b.clientEmail}<br><span class="text-[#A0A0A0]">${b.clientPhone || ''}</span></td>
        <td>${b.serviceName}</td>
        <td>${b.stylistName || '—'}</td>
        <td>${fmtDate(b.requestedDate)} ${b.requestedTime || ''}</td>
        <td><span class="status-pill ${statusColor(b.status)}">${b.status}</span></td>
        <td>
          <select data-id="${b.id}" class="booking-status-select px-2 py-1 text-xs">
            ${['Pending','Confirmed','Completed','Cancelled'].map(st => `<option value="${st}" ${st===b.status?'selected':''}>${st}</option>`).join('')}
          </select>
          <button data-id="${b.id}" class="booking-delete-btn text-red-400 text-xs ml-2">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="text-[#A0A0A0]">No bookings found.</td></tr>';

    document.querySelectorAll('.booking-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await api(`/api/bookings/${sel.dataset.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: sel.value }),
          });
          loadBookings();
        } catch (err) { alert(err.message); }
      });
    });
    document.querySelectorAll('.booking-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this booking?')) return;
        try { await api(`/api/bookings/${btn.dataset.id}`, { method: 'DELETE' }); loadBookings(); }
        catch (err) { alert(err.message); }
      });
    });
  } catch (err) { console.error(err); }
}
document.getElementById('booking-filter-apply').addEventListener('click', loadBookings);

// ---------- clients ----------
async function loadClients() {
  const search = document.getElementById('client-search').value;
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  try {
    const clients = await api(`/api/clients${qs}`);
    document.getElementById('clients-table-body').innerHTML = clients.map(c => `
      <tr>
        <td>${c.fullName}</td>
        <td>${c.email}</td>
        <td>${c.phone || '—'}</td>
        <td>${c.totalBookings}</td>
        <td>${fmtDate(c.createdAt)}</td>
        <td><button data-id="${c.id}" class="client-delete-btn text-red-400 text-xs">Delete</button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="text-[#A0A0A0]">No clients yet.</td></tr>';

    document.querySelectorAll('.client-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this client and their bookings?')) return;
        try { await api(`/api/clients/${btn.dataset.id}`, { method: 'DELETE' }); loadClients(); }
        catch (err) { alert(err.message); }
      });
    });
  } catch (err) { console.error(err); }
}
document.getElementById('client-search').addEventListener('input', debounce(loadClients, 400));

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- stylists ----------
async function loadStylists() {
  try {
    const stylists = await api('/api/stylists?activeOnly=false');
    document.getElementById('stylists-table-body').innerHTML = stylists.map(s => `
      <tr>
        <td>${s.fullName}</td>
        <td>${s.title || '—'}</td>
        <td>${s.location || '—'}</td>
        <td>${s.isActive ? 'Yes' : 'No'}</td>
        <td>
          <button data-id="${s.id}" class="stylist-edit-btn text-[#D4AF37] text-xs">Edit</button>
          <button data-id="${s.id}" class="stylist-delete-btn text-red-400 text-xs ml-2">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="text-[#A0A0A0]">No stylists yet.</td></tr>';

    document.querySelectorAll('.stylist-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openStylistModal(stylists.find(s => s.id == btn.dataset.id))));
    document.querySelectorAll('.stylist-delete-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this stylist?')) return;
        try { await api(`/api/stylists/${btn.dataset.id}`, { method: 'DELETE' }); loadStylists(); }
        catch (err) { alert(err.message); }
      }));
  } catch (err) { console.error(err); }
}
document.getElementById('stylist-new-btn').addEventListener('click', () => openStylistModal(null));

function openStylistModal(stylist) {
  openModal(stylist ? 'Edit Stylist' : 'New Stylist', [
    { name: 'fullName', label: 'Full Name', value: stylist?.fullName || '', required: true },
    { name: 'title', label: 'Title', value: stylist?.title || '' },
    { name: 'location', label: 'Location', value: stylist?.location || '' },
    { name: 'bio', label: 'Bio', value: stylist?.bio || '', textarea: true },
    { name: 'imageUrl', label: 'Image URL', value: stylist?.imageUrl || '' },
    { name: 'instagramUrl', label: 'Instagram URL', value: stylist?.instagramUrl || '' },
    { name: 'isActive', label: 'Active', checkbox: true, value: stylist ? stylist.isActive : true },
  ], async (data) => {
    data.isActive = !!data.isActive;
    if (stylist) await api(`/api/stylists/${stylist.id}`, { method: 'PUT', body: JSON.stringify(data) });
    else await api('/api/stylists', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    loadStylists();
  });
}

// ---------- services ----------
async function loadServices() {
  try {
    const services = await api('/api/services?activeOnly=false');
    document.getElementById('services-table-body').innerHTML = services.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.category || '—'}</td>
        <td>${s.durationMinutes} min</td>
        <td>${s.isActive ? 'Yes' : 'No'}</td>
        <td>
          <button data-id="${s.id}" class="service-edit-btn text-[#D4AF37] text-xs">Edit</button>
          <button data-id="${s.id}" class="service-delete-btn text-red-400 text-xs ml-2">Delete</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="text-[#A0A0A0]">No services yet.</td></tr>';

    document.querySelectorAll('.service-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openServiceModal(services.find(s => s.id == btn.dataset.id))));
    document.querySelectorAll('.service-delete-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this service?')) return;
        try { await api(`/api/services/${btn.dataset.id}`, { method: 'DELETE' }); loadServices(); }
        catch (err) { alert(err.message); }
      }));
  } catch (err) { console.error(err); }
}
document.getElementById('service-new-btn').addEventListener('click', () => openServiceModal(null));

function openServiceModal(service) {
  openModal(service ? 'Edit Service' : 'New Service', [
    { name: 'name', label: 'Name', value: service?.name || '', required: true },
    { name: 'category', label: 'Category', value: service?.category || '' },
    { name: 'description', label: 'Description', value: service?.description || '', textarea: true },
    { name: 'durationMinutes', label: 'Duration (minutes)', value: service?.durationMinutes ?? 60, number: true, required: true },
    { name: 'isActive', label: 'Active', checkbox: true, value: service ? service.isActive : true },
  ], async (data) => {
    data.durationMinutes = parseInt(data.durationMinutes, 10);
    data.isActive = !!data.isActive;
    if (service) await api(`/api/services/${service.id}`, { method: 'PUT', body: JSON.stringify(data) });
    else await api('/api/services', { method: 'POST', body: JSON.stringify(data) });
    closeModal();
    loadServices();
  });
}

// ---------- generic modal ----------
function openModal(title, fields, onSubmit) {
  document.getElementById('modal-title').textContent = title;
  const form = document.getElementById('modal-form');
  form.innerHTML = fields.map(f => {
    if (f.checkbox) {
      return `<label class="flex items-center space-x-2 text-sm"><input type="checkbox" name="${f.name}" ${f.value ? 'checked' : ''}><span>${f.label}</span></label>`;
    }
    if (f.textarea) {
      return `<div><label class="block text-xs text-[#A0A0A0] mb-1">${f.label}</label><textarea name="${f.name}" rows="3" class="w-full px-3 py-2 text-sm">${f.value}</textarea></div>`;
    }
    return `<div><label class="block text-xs text-[#A0A0A0] mb-1">${f.label}</label><input name="${f.name}" type="${f.number ? 'number' : 'text'}" value="${f.value}" ${f.required ? 'required' : ''} class="w-full px-3 py-2 text-sm"></div>`;
  }).join('') + `
    <div class="flex justify-end space-x-3 pt-2">
      <button type="button" id="modal-cancel" class="btn-outline px-4 py-2 text-xs uppercase tracking-widest">Cancel</button>
      <button type="submit" class="btn px-4 py-2 text-xs uppercase tracking-widest">Save</button>
    </div>`;

  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    fields.forEach(f => {
      data[f.name] = f.checkbox ? fd.get(f.name) === 'on' : (fd.get(f.name) || '');
    });
    try { await onSubmit(data); }
    catch (err) { alert(err.message); }
  };
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

// ---------- boot ----------
if (state.token) showApp(); else showLogin();

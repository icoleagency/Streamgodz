/* ============ STREAMGODZ · ADMIN DASHBOARD JS ============ */

/* !!! REPLACE THESE TWO VALUES WITH YOUR SUPABASE PROJECT INFO !!! */
const SUPABASE_URL = 'https://xirnruzhbhqjydvrackw.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';

// Load Supabase client from CDN in the HTML file. This assumes `supabase` is global.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentAdmin = null;
let allOrders = [];
let currentFilter = 'new';
let selectedOrderId = null;

/* ============ AUTH ============ */
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); return; }
  currentUser = session.user;
  const { data: adminRow, error } = await sb
    .from('admins')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  if (error || !adminRow) {
    // User exists in auth but not in admins table — deny access
    await sb.auth.signOut();
    showLogin('Not authorized as an admin.');
    return;
  }
  currentAdmin = adminRow;
  showDashboard();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errBox = document.querySelector('.login-error');
  const loading = document.querySelector('.login-loading');
  errBox.classList.remove('show');
  loading.classList.add('show');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  loading.classList.remove('show');
  if (error) {
    errBox.textContent = '// ' + error.message.toUpperCase();
    errBox.classList.add('show');
    return;
  }
  await checkAuth();
}

async function handleLogout() {
  await sb.auth.signOut();
  window.location.reload();
}

/* ============ VIEWS ============ */
function showLogin(errorMsg) {
  document.getElementById('login-view').style.display = 'grid';
  document.getElementById('dash-view').style.display = 'none';
  if (errorMsg) {
    const errBox = document.querySelector('.login-error');
    errBox.textContent = '// ' + errorMsg.toUpperCase();
    errBox.classList.add('show');
  }
}
function showDashboard() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dash-view').style.display = 'flex';
  document.querySelector('.who strong').textContent = currentAdmin.email;
  loadOrders();
}

/* ============ DATA LOAD ============ */
async function loadOrders() {
  const { data, error } = await sb
    .from('orders')
    .select('*, plans(name, duration_days), credentials(id, server_url, username, password, m3u_url)')
    .order('created_at', { ascending: false });
  if (error) { showToast('LOAD FAILED: ' + error.message, true); return; }
  allOrders = data || [];
  renderOverview();
  renderOrdersTable();
}

function renderOverview() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7 = new Date(now.getTime() + 7*24*60*60*1000);

  const newCount = allOrders.filter(o => o.fulfillment_status === 'new').length;
  const activeCount = allOrders.filter(o => o.fulfillment_status === 'active' || o.fulfillment_status === 'credentials_sent').length;
  const monthRev = allOrders
    .filter(o => o.payment_status === 'confirmed' && new Date(o.created_at) >= startOfMonth)
    .reduce((s, o) => s + Number(o.amount_usd), 0);
  const expiring = allOrders.filter(o => {
    if (!o.expires_at) return false;
    const exp = new Date(o.expires_at);
    return exp > now && exp <= in7 && (o.fulfillment_status === 'active' || o.fulfillment_status === 'credentials_sent');
  }).length;

  document.getElementById('stat-new').textContent = newCount;
  document.getElementById('stat-active').textContent = activeCount;
  document.getElementById('stat-revenue').textContent = '$' + monthRev.toFixed(2);
  document.getElementById('stat-expiring').textContent = expiring;

  // Update filter tab counts
  const counts = {
    new: allOrders.filter(o => o.fulfillment_status === 'new').length,
    credentials_sent: allOrders.filter(o => o.fulfillment_status === 'credentials_sent').length,
    active: allOrders.filter(o => o.fulfillment_status === 'active').length,
    all: allOrders.length,
  };
  document.querySelectorAll('.filter-tab').forEach(t => {
    const f = t.dataset.filter;
    const c = t.querySelector('.count');
    if (c) c.textContent = counts[f] ?? 0;
  });
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  const filtered = currentFilter === 'all'
    ? allOrders
    : allOrders.filter(o => o.fulfillment_status === currentFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="orders-empty">
          <div>// NO ORDERS IN THIS QUEUE</div>
          <div class="big">All clear.</div>
          <div>New orders will appear here in real time.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const created = new Date(o.created_at);
    const dateStr = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      + ' · ' + created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const planName = o.plans?.name || o.plan_id || '—';
    return `
      <tr onclick="openDrawer('${o.id}')">
        <td><span class="order-num">${escapeHtml(o.order_number)}</span></td>
        <td>
          <div class="order-email">${escapeHtml(o.customer_email)}</div>
          ${o.customer_name ? `<div class="order-name">${escapeHtml(o.customer_name)}</div>` : ''}
        </td>
        <td><span class="plan-tag">${escapeHtml(planName)}</span></td>
        <td><span class="pay-method">${escapeHtml(o.payment_method || '—')}</span></td>
        <td><span class="badge ${o.payment_status}">${o.payment_status}</span></td>
        <td><span class="badge ${o.fulfillment_status}">${(o.fulfillment_status || '').replace('_', ' ')}</span></td>
        <td><span class="order-amount">$${Number(o.amount_usd).toFixed(2)}</span></td>
      </tr>`;
  }).join('');
}

/* ============ DRAWER ============ */
function openDrawer(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;
  selectedOrderId = orderId;
  const cred = order.credentials?.[0];

  const created = new Date(order.created_at).toLocaleString();
  const expires = order.expires_at ? new Date(order.expires_at).toLocaleString() : '—';
  const planName = order.plans?.name || order.plan_id || '—';

  document.querySelector('.drawer-order-num').textContent = order.order_number;
  document.querySelector('.drawer-body').innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">CUSTOMER</div>
      <div class="info-row"><span class="k">Email</span><span class="v">${escapeHtml(order.customer_email)}</span></div>
      <div class="info-row"><span class="k">Name</span><span class="v">${escapeHtml(order.customer_name || '—')}</span></div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">ORDER</div>
      <div class="info-row"><span class="k">Plan</span><span class="v tally">${escapeHtml(planName)}</span></div>
      <div class="info-row"><span class="k">Amount</span><span class="v tally">$${Number(order.amount_usd).toFixed(2)}</span></div>
      <div class="info-row"><span class="k">Payment</span><span class="v">${escapeHtml(order.payment_method)} · <span class="badge ${order.payment_status}">${order.payment_status}</span></span></div>
      <div class="info-row"><span class="k">Fulfillment</span><span class="v"><span class="badge ${order.fulfillment_status}">${order.fulfillment_status.replace('_',' ')}</span></span></div>
      <div class="info-row"><span class="k">Created</span><span class="v">${created}</span></div>
      <div class="info-row"><span class="k">Expires</span><span class="v">${expires}</span></div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">CREDENTIALS</div>
      <form class="drawer-form" id="cred-form" onsubmit="return false;">
        <label>Server URL *</label>
        <input type="text" id="cred-server" placeholder="http://server.iptv.com:8080" value="${escapeHtml(cred?.server_url || '')}" required />
        <label>Username *</label>
        <input type="text" id="cred-username" placeholder="username123" value="${escapeHtml(cred?.username || '')}" required />
        <label>Password *</label>
        <input type="text" id="cred-password" placeholder="password123" value="${escapeHtml(cred?.password || '')}" required />
        <label>M3U URL (optional)</label>
        <input type="text" id="cred-m3u" placeholder="http://server.iptv.com/get.php?username=..." value="${escapeHtml(cred?.m3u_url || '')}" />
      </form>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">NOTES</div>
      <form class="drawer-form" onsubmit="return false;">
        <textarea id="order-notes" placeholder="Internal notes...">${escapeHtml(order.notes || '')}</textarea>
      </form>
    </div>

    <div class="drawer-section">
      <div class="drawer-btn-row">
        <button class="drawer-btn primary" onclick="saveAndFulfill()">SAVE + MARK FULFILLED</button>
        <button class="drawer-btn" onclick="saveOnly()">SAVE ONLY</button>
      </div>
      <div class="drawer-btn-row" style="margin-top:8px;">
        <button class="drawer-btn danger" onclick="markCancelled()">MARK CANCELLED</button>
      </div>
    </div>
  `;
  document.querySelector('.drawer-overlay').classList.add('open');
  document.querySelector('.drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.querySelector('.drawer-overlay').classList.remove('open');
  document.querySelector('.drawer').classList.remove('open');
  document.body.style.overflow = '';
  selectedOrderId = null;
}

/* ============ SAVE ACTIONS ============ */
async function saveCredentials() {
  const order = allOrders.find(o => o.id === selectedOrderId);
  if (!order) return false;
  const serverUrl = document.getElementById('cred-server').value.trim();
  const username = document.getElementById('cred-username').value.trim();
  const password = document.getElementById('cred-password').value.trim();
  const m3u = document.getElementById('cred-m3u').value.trim();
  const existing = order.credentials?.[0];
  if (existing) {
    const { error } = await sb.from('credentials').update({
      server_url: serverUrl, username, password, m3u_url: m3u || null
    }).eq('id', existing.id);
    if (error) { showToast('SAVE FAILED', true); return false; }
  } else {
    const { error } = await sb.from('credentials').insert({
      order_id: order.id, customer_id: order.customer_id,
      server_url: serverUrl, username, password, m3u_url: m3u || null,
      activated_at: new Date().toISOString(),
      expires_at: order.expires_at
    });
    if (error) { showToast('SAVE FAILED', true); return false; }
  }
  return true;
}

async function saveNotes() {
  const notes = document.getElementById('order-notes').value;
  const { error } = await sb.from('orders').update({ notes }).eq('id', selectedOrderId);
  if (error) { showToast('NOTES SAVE FAILED', true); return false; }
  return true;
}

async function saveOnly() {
  if (!(await saveCredentials())) return;
  if (!(await saveNotes())) return;
  showToast('SAVED');
  await loadOrders();
  closeDrawer();
}

async function saveAndFulfill() {
  const order = allOrders.find(o => o.id === selectedOrderId);
  if (!order) return;
  if (!(await saveCredentials())) return;
  if (!(await saveNotes())) return;

  const plan = order.plans;
  const durationDays = plan?.duration_days || 30;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { error } = await sb.from('orders').update({
    fulfillment_status: 'credentials_sent',
    fulfilled_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  }).eq('id', selectedOrderId);

  if (error) { showToast('FULFILL FAILED', true); return; }
  showToast('MARKED FULFILLED');
  await loadOrders();
  closeDrawer();
}

async function markCancelled() {
  if (!confirm('Mark this order as CANCELLED? This cannot be undone from the dashboard.')) return;
  const { error } = await sb.from('orders').update({
    fulfillment_status: 'cancelled',
    payment_status: 'cancelled'
  }).eq('id', selectedOrderId);
  if (error) { showToast('CANCEL FAILED', true); return; }
  showToast('ORDER CANCELLED');
  await loadOrders();
  closeDrawer();
}

/* ============ FILTERS ============ */
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.filter === f));
  renderOrdersTable();
}

/* ============ UTILS ============ */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function showToast(msg, isError) {
  let toast = document.querySelector('.dash-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'dash-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '◉ ' + msg;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* CLOCK */
function tickClock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  const d = new Date();
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  el.textContent = `UTC ${h}:${m}:${s}`;
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.querySelector('.logout-btn').addEventListener('click', handleLogout);
  document.querySelector('.drawer-close').addEventListener('click', closeDrawer);
  document.querySelector('.drawer-overlay').addEventListener('click', closeDrawer);
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.addEventListener('click', () => setFilter(t.dataset.filter));
  });
  tickClock(); setInterval(tickClock, 1000);
  checkAuth();
});

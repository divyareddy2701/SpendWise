/* ═══════════════════════════════════════════════════════════════
   SpendWise — script.js   (Complete, production-quality)
   API base: http://localhost:8081/api
═══════════════════════════════════════════════════════════════ */

// ── Config ───────────────────────────────────────────────────────
const API        = 'http://localhost:8081/api';
const USER_KEY   = 'sw_user';
const BUDGET_KEY = 'sw_budget';
const THEME_KEY  = 'sw_theme';

// ── State ────────────────────────────────────────────────────────
let currentUser = null;
let allExpenses = [];
let charts      = {};

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  loadUser();
  routePage();
  initSidebar();
  createToastContainer();
});

// ════════════════════════════════════════════════════════════════
// THEME
// ════════════════════════════════════════════════════════════════
function applyTheme() {
  const t = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  updateThemeIcon(t);
}
function toggleTheme() {
  const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
  // Re-render charts with new theme colours
  if (typeof initDashboard === 'function' && getPage() === 'dashboard.html') initDashboard();
  if (typeof initAnalytics === 'function' && getPage() === 'analytics.html') initAnalytics();
}
function updateThemeIcon(t) {
  document.querySelectorAll('#theme-icon').forEach(el => {
    el.textContent = t === 'dark' ? '☀️' : '🌙';
  });
}

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
function loadUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    if (s) currentUser = JSON.parse(s);
  } catch { currentUser = null; }

  const page = getPage();
  const open = ['login.html', ''];

  if (!open.includes(page) && !currentUser) { location.href = 'login.html'; return; }
  if (page === 'login.html' && currentUser)  { location.href = 'dashboard.html'; return; }

  if (currentUser) {
    setText('sb-username', currentUser.username || 'User');
    setText('sb-avatar',   (currentUser.username || 'U')[0].toUpperCase());
  }
}

async function doLogin(username, password) {
  try {
    const res  = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (res.ok && json.data?.id) {
      currentUser = json.data;
      localStorage.setItem(USER_KEY, JSON.stringify(json.data));
      toast('Welcome back, ' + username + '! 👋', 'success');
      setTimeout(() => location.href = 'dashboard.html', 900);
    } else {
      toast(json.message || 'Invalid username or password', 'error');
    }
  } catch {
    toast('Cannot reach server. Is Spring Boot running on port 8081?', 'error');
  }
}

async function doRegister(username, password) {
  try {
    const res  = await fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (res.ok) {
      toast('Account created! Please sign in. 🎉', 'success');
      switchTab('login');
    } else {
      const msg = json.message || (json.data ? Object.values(json.data).join(', ') : 'Registration failed');
      toast(msg, 'error');
    }
  } catch {
    toast('Cannot reach server. Is Spring Boot running on port 8081?', 'error');
  }
}

function logout() {
  localStorage.removeItem(USER_KEY);
  currentUser = null;
  location.href = 'login.html';
}

// ════════════════════════════════════════════════════════════════
// EXPENSE API CALLS
// ════════════════════════════════════════════════════════════════
async function fetchExpenses() {
  if (!currentUser) return [];
  try {
    const res  = await fetch(`${API}/expenses/user/${currentUser.id}`);
    const json = await res.json();
    if (res.ok) { allExpenses = json.data || []; return allExpenses; }
    toast('Failed to load expenses', 'error'); return [];
  } catch {
    toast('Network error loading expenses', 'error'); return [];
  }
}

async function addExpense(exp) {
  const payload = {
    title:     exp.title,
    amount:    parseFloat(exp.amount),
    category:  exp.category,
    date:      exp.date,
    recurring: exp.recurring,
    userId:    currentUser.id
  };
  try {
    const res  = await fetch(`${API}/expenses`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await res.json();
    if (res.ok) { toast('Expense added! ✅', 'success'); return json.data; }
    const msg = json.message || (json.data ? Object.values(json.data).join(', ') : 'Failed to add expense');
    toast(msg, 'error'); return null;
  } catch {
    toast('Network error. Is Spring Boot running?', 'error'); return null;
  }
}

async function updateExpense(id, exp) {
  const payload = {
    title:     exp.title,
    amount:    parseFloat(exp.amount),
    category:  exp.category,
    date:      exp.date,
    recurring: exp.recurring,
    userId:    currentUser.id
  };
  try {
    const res  = await fetch(`${API}/expenses/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const json = await res.json();
    if (res.ok) { toast('Expense updated! ✅', 'success'); return json.data; }
    toast(json.message || 'Update failed', 'error'); return null;
  } catch {
    toast('Network error', 'error'); return null;
  }
}

async function deleteExpense(id) {
  try {
    const res = await fetch(`${API}/expenses/${id}?userId=${currentUser.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Expense deleted 🗑️', 'success'); return true; }
    toast('Delete failed', 'error'); return false;
  } catch {
    toast('Network error', 'error'); return false;
  }
}

async function uploadCSV(file) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res  = await fetch(`${API}/expenses/upload/${currentUser.id}`, { method: 'POST', body: fd });
    const json = await res.json();
    if (res.ok) { toast(json.message || 'CSV uploaded! ✅', 'success'); return json.data; }
    toast(json.message || 'Upload failed', 'error'); return null;
  } catch {
    toast('Upload error', 'error'); return null;
  }
}

// ════════════════════════════════════════════════════════════════
// PAGE ROUTER
// ════════════════════════════════════════════════════════════════
function routePage() {
  const p = getPage();
  if      (p === 'login.html'       || p === '') initLogin();
  else if (p === 'dashboard.html')               initDashboard();
  else if (p === 'expenses.html')                initExpenses();
  else if (p === 'add-expense.html')             initAddExpense();
  else if (p === 'analytics.html')               initAnalytics();
  else if (p === 'upload.html')                  initUpload();
}

// ════════════════════════════════════════════════════════════════
// PAGE: LOGIN
// ════════════════════════════════════════════════════════════════
function initLogin() {
  document.getElementById('form-login')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btnLoading(btn, true);
    await doLogin(val('login-user'), val('login-pass'));
    btnLoading(btn, false, 'Sign In');
  });

  document.getElementById('form-register')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (val('reg-pass') !== val('reg-pass2')) { toast('Passwords do not match', 'error'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btnLoading(btn, true);
    await doRegister(val('reg-user'), val('reg-pass'));
    btnLoading(btn, false, 'Create Account');
  });
}

function switchTab(tab) {
  document.querySelectorAll('.ltab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab));
}

// ════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ════════════════════════════════════════════════════════════════
async function initDashboard() {
  const expenses = await fetchExpenses();
  renderStats(expenses);
  renderBudget(expenses);
  renderTopCats(expenses);
  renderInsights(expenses);
  renderMiniChart(expenses);
  renderRecent(expenses);
  prefillBudget();
}

function renderStats(ex) {
  const now   = new Date();
  const thisM = ex.filter(e => sameMonth(e, now));
  setText('st-total',      '₹' + fmt(sum(ex)));
  setText('st-month',      '₹' + fmt(sum(thisM)));
  setText('st-tx',         ex.length);
  setText('st-rec',        ex.filter(e => e.recurring).length);
  setText('st-month-hint', now.toLocaleString('default', { month: 'long', year: 'numeric' }));
}

function renderBudget(ex) {
  const el = document.getElementById('budget-section');
  if (!el) return;
  const budget = parseInt(localStorage.getItem(BUDGET_KEY) || 15000);
  const spent  = sum(ex.filter(e => sameMonth(e, new Date())));
  const pct    = Math.min((spent / budget) * 100, 100).toFixed(1);
  const cls    = pct >= 90 ? 'danger' : pct >= 65 ? 'warning' : 'safe';
  let alert = '';
  if (pct >= 100)
    alert = `<div class="alert alert-danger mt-4"><span style="font-size:18px">🚨</span><div><div class="alert-title">Budget Exceeded!</div><div class="alert-text">Over by ₹${fmt(spent - budget)} this month.</div></div></div>`;
  else if (pct >= 65)
    alert = `<div class="alert alert-warning mt-4"><span style="font-size:18px">⚠️</span><div><div class="alert-title">Budget Warning</div><div class="alert-text">Used ${pct}% of your ₹${fmt(budget)} budget.</div></div></div>`;
  el.innerHTML = `
    <div class="budget-card">
      <div class="d-flex justify-between align-center" style="margin-bottom:4px">
        <span style="font-weight:700;font-size:14px">Monthly Budget</span>
        <span class="text-sm text-muted"><strong style="color:var(--text)">₹${fmt(spent)}</strong> / ₹${fmt(budget)}</span>
      </div>
      <div class="budget-bar-track"><div class="budget-bar-fill bfill-${cls}" style="width:${pct}%"></div></div>
      <div class="d-flex justify-between text-xs text-muted"><span>${pct}% used</span><span>₹${fmt(Math.max(budget - spent, 0))} remaining</span></div>
    </div>${alert}`;
}

function renderTopCats(ex) {
  const el = document.getElementById('top-cats');
  if (!el) return;
  if (!ex.length) { el.innerHTML = '<p class="text-muted text-sm">No data yet.</p>'; return; }
  const map    = catMap(ex);
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max    = sorted[0]?.[1] || 1;
  const ranks  = ['gold', 'silver', 'bronze'];
  el.innerHTML = sorted.map(([cat, amt], i) => `
    <div class="cat-row">
      <div class="cat-rank ${ranks[i] || ''}">${i + 1}</div>
      <div class="cat-info">
        <div class="cat-name">${cat}</div>
        <div class="cat-track"><div class="cat-fill" style="width:${(amt / max * 100).toFixed(1)}%"></div></div>
      </div>
      <div class="cat-amt">₹${fmt(amt)}</div>
    </div>`).join('');
}

function renderInsights(ex) {
  const el = document.getElementById('insights-list');
  if (!el) return;
  const insights = buildInsights(ex);
  if (!insights.length) { el.innerHTML = '<p class="text-muted text-sm">Add some expenses to see insights.</p>'; return; }
  el.innerHTML = insights.map(i => `
    <div class="insight-item"><span class="insight-icon">${i.icon}</span><span>${i.text}</span></div>`).join('');
}

function buildInsights(ex) {
  const out = [];
  if (!ex.length) return out;
  const map = catMap(ex);
  const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push({ icon: '🏆', text: `Spent most on <strong>${top[0]}</strong> — ₹${fmt(top[1])} total` });
  const recs = ex.filter(e => e.recurring);
  if (recs.length) out.push({ icon: '🔁', text: `${recs.length} recurring expense${recs.length > 1 ? 's' : ''} totalling ₹${fmt(sum(recs))}` });
  const now   = new Date();
  const thisM = sum(ex.filter(e => sameMonth(e, now)));
  const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastM = sum(ex.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === lastD.getMonth() && d.getFullYear() === lastD.getFullYear();
  }));
  if (lastM > 0) {
    const diff = ((thisM - lastM) / lastM * 100).toFixed(0);
    out.push(diff > 0
      ? { icon: '📈', text: `Spending up <strong>${diff}%</strong> vs last month` }
      : { icon: '📉', text: `Spending down <strong>${Math.abs(diff)}%</strong> vs last month 🎉` });
  }
  const budget = parseInt(localStorage.getItem(BUDGET_KEY) || 15000);
  const pct    = (thisM / budget * 100).toFixed(0);
  if (pct >= 80) out.push({ icon: '⚠️', text: `You've used <strong>${pct}%</strong> of this month's budget` });
  const avg = ex.length ? sum(ex) / ex.length : 0;
  out.push({ icon: '📊', text: `Average expense: <strong>₹${fmt(avg)}</strong>` });
  if (ex.length > 0) {
    const maxE = ex.reduce((a, b) => parseFloat(a.amount) > parseFloat(b.amount) ? a : b);
    out.push({ icon: '💸', text: `Biggest single expense: <strong>${maxE.title}</strong> — ₹${fmt(maxE.amount)}` });
  }
  return out;
}

function renderMiniChart(ex) {
  const canvas = document.getElementById('mini-chart');
  if (!canvas) return;
  killChart('mini');
  const now = new Date();
  const labels = [], data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short' }));
    data.push(sum(ex.filter(e => sameMonthD(e, d))));
  }
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  charts.mini = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => i === 5 ? 'rgba(212,168,83,0.85)' : 'rgba(212,168,83,0.25)'),
        borderColor: '#d4a853',
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₹' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: isDark ? '#5c5650' : '#a8a09a' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark ? '#5c5650' : '#a8a09a', callback: v => '₹' + v } }
      }
    }
  });
}

function renderRecent(ex) {
  const el = document.getElementById('recent-tbody');
  if (!el) return;
  const recent = [...ex].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (!recent.length) {
    el.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">💸</div><p class="empty-title">No expenses yet</p><p class="empty-sub">Add your first expense to get started</p></div></td></tr>`;
    return;
  }
  el.innerHTML = recent.map(e => `
    <tr class="${e.recurring ? 'recurring' : ''}">
      <td><span class="fw-bold">${e.title || '—'}</span>${e.recurring ? '<span class="tag-rec" style="margin-left:7px">🔁 Rec</span>' : ''}</td>
      <td><span class="badge badge-${(e.category || 'Other').replace(/\s/g, '-')}">${e.category || 'Other'}</span></td>
      <td style="font-weight:700;color:var(--gold)">₹${fmt(e.amount)}</td>
      <td class="text-muted">${fmtDate(e.date)}</td>
    </tr>`).join('');
}

function prefillBudget() {
  const inp = document.getElementById('budget-input');
  if (inp) inp.value = localStorage.getItem(BUDGET_KEY) || 15000;
}

function saveBudget() {
  const v = parseInt(document.getElementById('budget-input')?.value);
  if (v > 0) {
    localStorage.setItem(BUDGET_KEY, v);
    toast('Budget saved: ₹' + fmt(v), 'success');
    initDashboard();
  } else {
    toast('Enter a valid amount', 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// PAGE: EXPENSES
// ════════════════════════════════════════════════════════════════
async function initExpenses() {
  await fetchExpenses();
  applyFilters();
  document.getElementById('inp-search')  ?.addEventListener('input',  applyFilters);
  document.getElementById('sel-category')?.addEventListener('change', applyFilters);
  document.getElementById('sel-sort')    ?.addEventListener('change', applyFilters);
  document.getElementById('chk-rec')     ?.addEventListener('change', applyFilters);
  document.getElementById('btn-export')  ?.addEventListener('click',  () => exportCSV(allExpenses));
}

function applyFilters() {
  const q   = (val('inp-search')   || '').toLowerCase();
  const cat =  val('sel-category') || '';
  const srt =  val('sel-sort')     || 'date-desc';
  const rec =  document.getElementById('chk-rec')?.checked || false;
  let list  = [...allExpenses].filter(e => {
    const mq = !q   || (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q);
    const mc = !cat || e.category === cat;
    const mr = !rec || e.recurring;
    return mq && mc && mr;
  });
  list.sort((a, b) => {
    if (srt === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (srt === 'date-asc')  return new Date(a.date) - new Date(b.date);
    if (srt === 'amt-desc')  return parseFloat(b.amount) - parseFloat(a.amount);
    if (srt === 'amt-asc')   return parseFloat(a.amount) - parseFloat(b.amount);
    return 0;
  });
  renderExpTable(list);
}

function renderExpTable(list) {
  setText('exp-count', list.length + ' expense' + (list.length !== 1 ? 's' : ''));
  setText('exp-total', '₹' + fmt(sum(list)));
  const el = document.getElementById('exp-tbody');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<tr><td colspan="6"><div class="empty"><div class="empty-icon">🔍</div><p class="empty-title">Nothing found</p><p class="empty-sub">Try different filters</p></div></td></tr>`;
    return;
  }
  el.innerHTML = list.map(e => `
    <tr class="${e.recurring ? 'recurring' : ''}">
      <td class="fw-bold">${e.title || '—'}</td>
      <td><span class="badge badge-${(e.category || 'Other').replace(/\s/g, '-')}">${e.category || 'Other'}</span></td>
      <td style="font-weight:700;color:var(--gold)">₹${fmt(e.amount)}</td>
      <td class="text-muted">${fmtDate(e.date)}</td>
      <td>${e.recurring ? '<span class="tag-rec">🔁 Recurring</span>' : '<span class="text-muted text-xs">One-time</span>'}</td>
      <td style="text-align:right">
        <div class="d-flex gap-2" style="justify-content:flex-end">
          <button class="btn-icon edit" onclick="openEditModal(${e.id})" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon del" onclick="handleDelete(${e.id})" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

async function handleDelete(id) {
  if (!confirm('Delete this expense? This cannot be undone.')) return;
  const ok = await deleteExpense(id);
  if (ok) { allExpenses = allExpenses.filter(e => e.id !== id); applyFilters(); }
}

function openEditModal(id) {
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('edit-id').value        = e.id;
  document.getElementById('edit-title').value     = e.title || '';
  document.getElementById('edit-amount').value    = e.amount || '';
  document.getElementById('edit-date').value      = e.date || '';
  document.getElementById('edit-category').value  = e.category || 'Other';
  document.getElementById('edit-recurring').checked = !!e.recurring;
  document.getElementById('edit-modal').classList.add('show');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('show');
}

async function submitEdit() {
  const id  = document.getElementById('edit-id').value;
  const exp = {
    title:     document.getElementById('edit-title').value,
    amount:    document.getElementById('edit-amount').value,
    date:      document.getElementById('edit-date').value,
    category:  document.getElementById('edit-category').value,
    recurring: document.getElementById('edit-recurring').checked
  };
  if (!exp.title || !exp.amount || !exp.date) { toast('Please fill all fields', 'error'); return; }
  const updated = await updateExpense(id, exp);
  if (updated) {
    const idx = allExpenses.findIndex(e => e.id === parseInt(id));
    if (idx !== -1) allExpenses[idx] = updated;
    closeEditModal();
    applyFilters();
  }
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.id === 'edit-modal') closeEditModal();
});

// ════════════════════════════════════════════════════════════════
// PAGE: ADD EXPENSE
// ════════════════════════════════════════════════════════════════
function initAddExpense() {
  // Set today's date as default
  const dateInput = document.getElementById('exp-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  document.getElementById('form-expense')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btnLoading(btn, true);
    const result = await addExpense({
      title:     val('exp-title'),
      amount:    val('exp-amount'),
      category:  val('exp-category'),
      date:      val('exp-date'),
      recurring: document.getElementById('exp-recurring')?.checked || false
    });
    btnLoading(btn, false, 'Add Expense');
    if (result) {
      e.target.reset();
      dateInput.value = new Date().toISOString().split('T')[0];
      setTimeout(() => location.href = 'expenses.html', 1000);
    }
  });
}

// ════════════════════════════════════════════════════════════════
// PAGE: ANALYTICS
// ════════════════════════════════════════════════════════════════
async function initAnalytics() {
  const expenses = await fetchExpenses();
  renderAnalyticsStats(expenses);
  renderDonut(expenses);
  renderBar(expenses);
  renderLine(expenses);
}

function renderAnalyticsStats(ex) {
  const now   = new Date();
  const thisM = ex.filter(e => sameMonth(e, now));
  const total = sum(ex);
  const avg   = ex.length ? total / ex.length : 0;
  const max   = ex.length ? Math.max(...ex.map(e => parseFloat(e.amount))) : 0;
  setText('an-total', '₹' + fmt(total));
  setText('an-avg',   '₹' + fmt(avg));
  setText('an-max',   '₹' + fmt(max));
  setText('an-month', '₹' + fmt(sum(thisM)));
}

function renderDonut(ex) {
  const canvas = document.getElementById('donut-chart');
  if (!canvas) return;
  killChart('donut');
  const map     = catMap(ex);
  const labels  = Object.keys(map);
  const data    = Object.values(map);
  const colors  = ['#d4a853','#5b8dee','#4caf82','#e05252','#a07af0','#e6a020','#7aafee','#9e9589'];
  const isDark  = document.documentElement.getAttribute('data-theme') !== 'light';
  charts.donut  = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: isDark ? '#161311' : '#ffffff', borderWidth: 3 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: isDark ? '#9e9589' : '#6b6358', padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ₹${fmt(c.parsed)}` } }
      },
      cutout: '65%'
    }
  });
}

function renderBar(ex) {
  const canvas = document.getElementById('bar-chart');
  if (!canvas) return;
  killChart('bar');
  const now    = new Date();
  const labels = [], data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    data.push(sum(ex.filter(e => sameMonthD(e, d))));
  }
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  charts.bar   = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Spent',
        data,
        backgroundColor: 'rgba(212,168,83,0.7)',
        borderColor: '#d4a853',
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₹' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: isDark ? '#5c5650' : '#a8a09a' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark ? '#5c5650' : '#a8a09a', callback: v => '₹' + v } }
      }
    }
  });
}

function renderLine(ex) {
  const canvas = document.getElementById('line-chart');
  if (!canvas) return;
  killChart('line');
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const days  = new Date(year, month + 1, 0).getDate();
  const labels = [], data = [];
  let cumulative = 0;
  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const daySum  = sum(ex.filter(e => e.date === dateStr));
    cumulative   += daySum;
    labels.push(d);
    data.push(cumulative);
  }
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  charts.line  = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative',
        data,
        borderColor: '#d4a853',
        backgroundColor: 'rgba(212,168,83,0.08)',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#d4a853',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₹' + fmt(c.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: isDark ? '#5c5650' : '#a8a09a' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }, ticks: { color: isDark ? '#5c5650' : '#a8a09a', callback: v => '₹' + v } }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════
// PAGE: UPLOAD CSV
// ════════════════════════════════════════════════════════════════
function initUpload() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo  = document.getElementById('file-info');
  const btnUpload = document.getElementById('btn-upload');
  let selectedFile = null;

  if (!dropZone) return;

  // Drag and drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  fileInput?.addEventListener('change', e => {
    if (e.target.files[0]) handleFileSelect(e.target.files[0]);
  });

  function handleFileSelect(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) { toast('Only .csv files are accepted', 'error'); return; }
    selectedFile = file;
    setText('file-name', file.name);
    setText('file-size', (file.size / 1024).toFixed(1) + ' KB');
    fileInfo?.classList.remove('hidden');
  }

  btnUpload?.addEventListener('click', async () => {
    if (!selectedFile) { toast('Please select a file first', 'error'); return; }
    btnLoading(btnUpload, true);
    const result = await uploadCSV(selectedFile);
    btnLoading(btnUpload, false, '⬆ Upload & Import');
    if (result) {
      toast(`✅ Imported ${result.length} expenses successfully!`, 'success');
      setTimeout(() => location.href = 'expenses.html', 1500);
    }
  });
}

function downloadSample() {
  const csv = `title,amount,category,date,recurring
Grocery at DMart,850.00,Food,2025-06-01,false
Uber to office,120.50,Transport,2025-06-02,false
Netflix subscription,649.00,Entertainment,2025-06-01,true
Electricity bill,1200.00,Utilities,2025-06-05,true
Gym membership,1500.00,Health,2025-06-01,true
Books for exam,450.00,Education,2025-06-10,false
Dinner with friends,1200.00,Food,2025-06-12,false
New shirt,799.00,Shopping,2025-06-14,false`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'spendwise_sample.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Sample CSV downloaded!', 'success');
}

// ════════════════════════════════════════════════════════════════
// EXPORT CSV
// ════════════════════════════════════════════════════════════════
function exportCSV(expenses) {
  if (!expenses.length) { toast('No expenses to export', 'error'); return; }
  const header = 'title,amount,category,date,recurring';
  const rows   = expenses.map(e =>
    `"${(e.title || '').replace(/"/g, '""')}",${e.amount},"${e.category}",${e.date},${e.recurring}`
  );
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `spendwise_expenses_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${expenses.length} expenses ✅`, 'success');
}

// ════════════════════════════════════════════════════════════════
// SIDEBAR (mobile toggle)
// ════════════════════════════════════════════════════════════════
function initSidebar() {
  const btn     = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// ════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ════════════════════════════════════════════════════════════════
function createToastContainer() {
  if (document.getElementById('toast-container')) return;
  const el = document.createElement('div');
  el.id = 'toast-container';
  el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:340px;';
  document.body.appendChild(el);
}

function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: 'var(--green-bg)',
    error:   'var(--red-bg)',
    warning: 'var(--amber-bg)',
    info:    'var(--blue-bg)'
  };
  const borders = {
    success: 'var(--green)',
    error:   'var(--red)',
    warning: 'var(--amber)',
    info:    'var(--blue)'
  };
  const el = document.createElement('div');
  el.style.cssText = `
    background:${colors[type]};
    border:1px solid ${borders[type]};
    border-radius:10px;
    padding:12px 16px;
    display:flex;
    align-items:center;
    gap:10px;
    font-size:13px;
    font-weight:500;
    color:var(--text);
    box-shadow:var(--shadow-md);
    animation:slideIn .25s ease;
    cursor:pointer;
    backdrop-filter:blur(12px);
  `;
  el.innerHTML = `<span style="font-size:16px">${icons[type]}</span><span style="flex:1">${message}</span>`;
  el.addEventListener('click', () => el.remove());
  container.appendChild(el);

  // Add animation style once
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `@keyframes slideIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}`;
    document.head.appendChild(s);
  }
  setTimeout(() => el.style.animation = 'none', 250);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════
function getPage() {
  return location.pathname.split('/').pop() || '';
}

function val(id) {
  return document.getElementById(id)?.value || '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmt(n) {
  const num = parseFloat(n) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function sum(arr) {
  return arr.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
}

function catMap(expenses) {
  const map = {};
  expenses.forEach(e => {
    const c = e.category || 'Other';
    map[c]  = (map[c] || 0) + parseFloat(e.amount || 0);
  });
  return map;
}

function sameMonth(expense, date) {
  const d = new Date(expense.date);
  return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
}

function sameMonthD(expense, date) {
  const d = new Date(expense.date);
  return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function killChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function btnLoading(btn, loading, resetText = '') {
  if (!btn) return;
  if (loading) {
    btn.disabled    = true;
    btn.dataset.orig = btn.textContent;
    btn.innerHTML   = '<span style="opacity:.7">Processing…</span>';
  } else {
    btn.disabled  = false;
    btn.textContent = resetText || btn.dataset.orig || 'Submit';
  }
}
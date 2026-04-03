/**
 * RADIUS user management page
 *
 * Create, list, disable, delete WiFi membership accounts.
 * Shows connected devices per user.
 */

export function renderUsersPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>FIKA WiFi Users</title>
<style>
  :root {
    --bg: #0d1117; --card: #161b22; --border: #30363d;
    --text: #e6edf3; --dim: #8b949e; --accent: #58a6ff;
    --green: #3fb950; --orange: #d29922; --red: #f85149;
    --font: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 16px; min-height: 100vh; }
  .page { max-width: 700px; margin: 0 auto; }
  h1 { color: var(--accent); font-size: 1.2em; margin-bottom: 4px; }
  .sub { color: var(--dim); font-size: 0.8em; margin-bottom: 16px; }
  .back { color: var(--dim); font-size: 0.8em; text-decoration: none; display: inline-block; margin-bottom: 12px; }
  .back:hover { color: var(--accent); }

  .create-form {
    background: var(--card); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px; margin-bottom: 16px;
  }
  .create-form h2 { font-size: 0.75em; color: var(--dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
  .form-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
  .form-group { flex: 1; min-width: 100px; }
  .form-group label { display: block; font-size: 0.65em; color: var(--dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .form-group input, .form-group select {
    width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font); font-size: 0.85em; padding: 8px;
  }
  .form-group input:focus { outline: none; border-color: var(--accent); }
  .form-group input::placeholder { color: #484f58; }

  .btn {
    background: var(--card); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font); font-size: 0.8em;
    padding: 8px 14px; cursor: pointer; white-space: nowrap;
  }
  .btn:hover { border-color: var(--accent); }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.primary { background: var(--accent); color: #0d1117; border-color: var(--accent); font-weight: bold; }
  .btn.danger { color: var(--red); }
  .btn.danger:hover { border-color: var(--red); }
  .btn.sm { font-size: 0.7em; padding: 4px 8px; }

  .user-list { margin-top: 4px; }
  .user-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px; margin-bottom: 8px;
  }
  .user-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .user-name { font-weight: bold; color: var(--accent); font-size: 0.95em; }
  .user-pass { color: var(--dim); font-size: 0.8em; cursor: pointer; }
  .user-pass:hover { color: var(--text); }
  .user-meta { font-size: 0.7em; color: var(--dim); margin-bottom: 6px; }
  .user-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .user-devices { margin-top: 6px; font-size: 0.7em; color: var(--dim); }
  .device { padding: 3px 0; border-top: 1px solid var(--border); }
  .device:first-child { border-top: none; }

  .badge {
    display: inline-block; font-size: 0.65em; padding: 2px 6px; border-radius: 3px;
    font-weight: bold; text-transform: uppercase;
  }
  .badge.active { background: var(--green); color: #0d1117; }
  .badge.expired { background: var(--red); color: #0d1117; }
  .badge.online { background: var(--green); color: #0d1117; }

  .toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 20px; font-size: 0.8em; display: none; z-index: 100;
  }
  .toast.show { display: block; animation: fadeIn 0.2s; }
  .toast.ok { border-color: var(--green); color: var(--green); }
  .toast.err { border-color: var(--red); color: var(--red); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .empty { text-align: center; color: var(--dim); padding: 30px; font-size: 0.85em; }
  .loading { text-align: center; color: var(--dim); padding: 20px; }
</style>
</head>
<body>
<div class="page">
  <a href="/" class="back">&lt; Dashboard</a>
  <h1>WiFi Users</h1>
  <div class="sub">RADIUS accounts for long-term WiFi access</div>

  <div class="create-form">
    <h2>Create User</h2>
    <div class="form-row">
      <div class="form-group">
        <label>Username</label>
        <input type="text" id="newName" placeholder="jonas" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="text" id="newPass" placeholder="auto-generate" autocomplete="off">
      </div>
      <div class="form-group">
        <label>Expires</label>
        <select id="newExpiry">
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
          <option value="0">Never</option>
        </select>
      </div>
      <button class="btn primary" onclick="createUser()">Create</button>
    </div>
  </div>

  <div id="userList" class="user-list">
    <div class="loading">Loading...</div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let users = [];
let guests = [];

function toast(msg, ok) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (ok ? 'ok' : 'err');
  setTimeout(() => t.className = 'toast', 3000);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

async function loadUsers() {
  try {
    const resp = await fetch('/users/api/list');
    const data = await resp.json();
    users = data.accounts || [];
    renderUsers();
  } catch (err) {
    document.getElementById('userList').innerHTML = '<div class="empty">Failed to load: ' + esc(err.message) + '</div>';
  }
}

function isExpired(u) {
  if (!u.expires) return false;
  return new Date(u.expires) < new Date();
}

function renderUsers() {
  const list = document.getElementById('userList');
  if (users.length === 0) {
    list.innerHTML = '<div class="empty">No users yet. Create one above.</div>';
    return;
  }

  list.innerHTML = users.map(u => {
    const expired = isExpired(u);

    return '<div class="user-card">' +
      '<div class="user-header">' +
        '<span>' +
          '<span class="user-name">' + esc(u.name) + '</span> ' +
          (expired ? '<span class="badge expired">expired</span>' : '<span class="badge active">active</span>') +
        '</span>' +
      '</div>' +
      '<div class="user-meta">' +
        'Created: ' + u.created +
        (u.expires ? ' - Expires: ' + u.expires : ' - No expiration') +
      '</div>' +
      '<div class="user-actions">' +
        '<button class="btn sm" onclick="printCard(\'' + esc(u.name) + '\', \'' + (u.expires || '') + '\')">Print card</button>' +
        (expired
          ? '<button class="btn sm" onclick="renewUser(\'' + u.id + '\')">Renew 30d</button>'
          : '') +
        '<button class="btn sm danger" onclick="deleteUser(\'' + u.id + '\', \'' + esc(u.name) + '\')">Delete</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function createUser() {
  const name = document.getElementById('newName').value.trim();
  if (!name) { document.getElementById('newName').focus(); return; }
  const pass = document.getElementById('newPass').value.trim() || generatePassword();
  const days = parseInt(document.getElementById('newExpiry').value) || 0;

  try {
    const resp = await fetch('/users/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass, expiry_days: days }),
    });
    const data = await resp.json();
    if (data.ok) {
      toast('Created ' + name + ' / ' + pass, true);
      lastCreatedPass = pass;
      document.getElementById('newName').value = '';
      document.getElementById('newPass').value = '';
      loadUsers();
    } else {
      toast('Failed: ' + data.error, false);
    }
  } catch (err) { toast('Failed: ' + err.message, false); }
}

let lastCreatedPass = '';

async function deleteUser(id, name) {
  if (!confirm('Delete user ' + name + '?')) return;
  try {
    const resp = await fetch('/users/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await resp.json();
    if (data.ok) { toast('Deleted ' + name, true); loadUsers(); }
    else toast('Failed: ' + data.error, false);
  } catch (err) { toast('Failed: ' + err.message, false); }
}

async function renewUser(id) {
  try {
    const resp = await fetch('/users/api/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, days: 30 }),
    });
    const data = await resp.json();
    if (data.ok) { toast('Renewed for 30 days', true); loadUsers(); }
    else toast('Failed: ' + data.error, false);
  } catch (err) { toast('Failed: ' + err.message, false); }
}

async function printCard(name, expiry) {
  const pass = prompt('Enter password for ' + name + ' (not stored locally):');
  if (!pass) return;
  try {
    const resp = await fetch('/users/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: pass, expiry }),
    });
    const data = await resp.json();
    toast(data.ok ? 'Card printed' : 'Print failed: ' + data.error, data.ok);
  } catch (err) { toast('Print failed: ' + err.message, false); }
}

loadUsers();
setInterval(loadUsers, 30000);
</script>
</body>
</html>`;
}

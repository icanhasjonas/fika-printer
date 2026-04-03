/**
 * RADIUS user management page
 *
 * Create, list, edit, delete WiFi membership accounts.
 * Modal for user details with renew/delete.
 * Login card display for screenshots.
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
  .btn:hover { border-color: var(--accent); background: #1a2332; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.primary { background: var(--accent); color: #0d1117; border-color: var(--accent); font-weight: bold; }
  .btn.primary:hover { opacity: 0.9; background: var(--accent); }
  .btn.danger { color: var(--red); }
  .btn.danger:hover { border-color: var(--red); background: #2d1215; }
  .btn.sm { font-size: 0.7em; padding: 5px 10px; }

  .user-list { margin-top: 4px; }
  .user-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px; margin-bottom: 8px; cursor: pointer; transition: border-color 0.15s;
  }
  .user-card:hover { border-color: var(--accent); }
  .user-header { display: flex; justify-content: space-between; align-items: center; }
  .user-name { font-weight: bold; color: var(--accent); font-size: 0.95em; }
  .user-meta { font-size: 0.7em; color: var(--dim); margin-top: 4px; }

  .badge {
    display: inline-block; font-size: 0.6em; padding: 2px 6px; border-radius: 3px;
    font-weight: bold; text-transform: uppercase; margin-left: 6px;
  }
  .badge.active { background: var(--green); color: #0d1117; }
  .badge.expired { background: var(--red); color: #0d1117; }

  /* Modal */
  .modal-overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7); z-index: 200; justify-content: center; align-items: center;
  }
  .modal-overlay.open { display: flex; }
  .modal {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 20px; width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto;
  }
  .modal h2 { color: var(--accent); font-size: 1.1em; margin-bottom: 16px; }
  .modal-field { margin-bottom: 12px; }
  .modal-field label { display: block; font-size: 0.65em; color: var(--dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
  .modal-field input {
    width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font); font-size: 0.85em; padding: 8px;
  }
  .modal-field input:focus { outline: none; border-color: var(--accent); }
  .modal-field .value { font-size: 0.85em; color: var(--text); padding: 4px 0; }
  .modal-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
  .modal-actions .spacer { flex: 1; }
  .modal-close {
    position: absolute; top: 12px; right: 16px; background: none; border: none;
    color: var(--dim); font-size: 1.4em; cursor: pointer; font-family: var(--font);
  }
  .modal-close:hover { color: var(--text); }

  /* Login card overlay */
  .login-card-overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); z-index: 300; justify-content: center; align-items: center;
  }
  .login-card-overlay.open { display: flex; }
  .login-card {
    background: #fff; color: #111; border-radius: 12px; padding: 32px 40px;
    text-align: center; font-family: var(--font); min-width: 300px; position: relative;
  }
  .login-card .lc-title { font-size: 0.7em; color: #888; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; }
  .login-card .lc-label { font-size: 0.65em; color: #999; text-transform: uppercase; margin-top: 14px; }
  .login-card .lc-value { font-size: 1.6em; font-weight: bold; color: #111; margin: 4px 0; letter-spacing: 0.05em; }
  .login-card .lc-ssid { font-size: 1.2em; font-weight: bold; color: #333; }
  .login-card .lc-expiry { font-size: 0.75em; color: #888; margin-top: 16px; }
  .login-card .lc-divider { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
  .login-card .lc-close {
    position: absolute; top: 8px; right: 14px; background: none; border: none;
    color: #aaa; font-size: 1.2em; cursor: pointer; font-family: var(--font);
  }

  .toast {
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 10px 20px; font-size: 0.8em; display: none; z-index: 400;
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

<!-- User detail modal -->
<div class="modal-overlay" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal" style="position:relative">
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2 id="modalTitle">User</h2>
    <div class="modal-field">
      <label>Username</label>
      <div class="value" id="modalName"></div>
    </div>
    <div class="modal-field">
      <label>Created</label>
      <div class="value" id="modalCreated"></div>
    </div>
    <div class="modal-field">
      <label>Expires</label>
      <div class="value" id="modalExpires"></div>
    </div>
    <div class="modal-field">
      <label>Renew for</label>
      <div class="form-row">
        <select id="modalRenewDays" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--font);font-size:0.85em;padding:6px;flex:1">
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
        <button class="btn sm" onclick="renewFromModal()">Renew</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn sm" onclick="showLoginCard()">Show login card</button>
      <button class="btn sm" onclick="printFromModal()">Print card</button>
      <span class="spacer"></span>
      <button class="btn sm danger" onclick="deleteFromModal()">Delete user</button>
    </div>
  </div>
</div>

<!-- Login card display -->
<div class="login-card-overlay" id="loginCardOverlay" onclick="if(event.target===this)closeLoginCard()">
  <div class="login-card">
    <button class="lc-close" onclick="closeLoginCard()">&times;</button>
    <div class="lc-title">WiFi Login</div>
    <hr class="lc-divider">
    <div class="lc-label">Network</div>
    <div class="lc-ssid" id="lcSsid">Fika</div>
    <div class="lc-label">Username</div>
    <div class="lc-value" id="lcName"></div>
    <div class="lc-label">Password</div>
    <div class="lc-value" id="lcPass"></div>
    <hr class="lc-divider">
    <div class="lc-expiry" id="lcExpiry"></div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let users = [];
let currentUser = null;
let lastPasswords = {};

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
    return '<div class="user-card" data-id="' + esc(u.id) + '">' +
      '<div class="user-header">' +
        '<span class="user-name">' + esc(u.name) +
          '<span class="badge ' + (expired ? 'expired' : 'active') + '">' + (expired ? 'expired' : 'active') + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="user-meta">' +
        'Created: ' + esc(u.created) +
        (u.expires ? ' -- Expires: ' + esc(u.expires) : ' -- No expiration') +
      '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
  });
}

function openModal(id) {
  const u = users.find(x => x.id === id);
  if (!u) return;
  currentUser = u;
  document.getElementById('modalTitle').textContent = u.name;
  document.getElementById('modalName').textContent = u.name;
  document.getElementById('modalCreated').textContent = u.created;
  document.getElementById('modalExpires').textContent = u.expires || 'Never';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  currentUser = null;
}

function getPasswordForUser(name) {
  if (lastPasswords[name]) return lastPasswords[name];
  const pass = prompt('Enter password for ' + name + ' (not stored locally):');
  return pass || null;
}

function showLoginCard() {
  if (!currentUser) return;
  const pass = getPasswordForUser(currentUser.name);
  if (!pass) return;
  document.getElementById('lcName').textContent = currentUser.name;
  document.getElementById('lcPass').textContent = pass;
  document.getElementById('lcExpiry').textContent = currentUser.expires ? 'Valid until ' + currentUser.expires : 'No expiration';
  document.getElementById('loginCardOverlay').classList.add('open');
}

function closeLoginCard() {
  document.getElementById('loginCardOverlay').classList.remove('open');
}

async function printFromModal() {
  if (!currentUser) return;
  const pass = getPasswordForUser(currentUser.name);
  if (!pass) return;
  try {
    const resp = await fetch('/users/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: currentUser.name, password: pass, expiry: currentUser.expires || '' }),
    });
    const data = await resp.json();
    toast(data.ok ? 'Card printed' : 'Print failed: ' + data.error, data.ok);
  } catch (err) { toast('Print failed: ' + err.message, false); }
}

async function renewFromModal() {
  if (!currentUser) return;
  const days = parseInt(document.getElementById('modalRenewDays').value) || 30;
  try {
    const resp = await fetch('/users/api/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentUser.id, days }),
    });
    const data = await resp.json();
    if (data.ok) {
      toast('Renewed for ' + days + ' days', true);
      closeModal();
      loadUsers();
    } else toast('Failed: ' + data.error, false);
  } catch (err) { toast('Failed: ' + err.message, false); }
}

async function deleteFromModal() {
  if (!currentUser) return;
  if (!confirm('Delete user ' + currentUser.name + '? This cannot be undone.')) return;
  try {
    const resp = await fetch('/users/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentUser.id }),
    });
    const data = await resp.json();
    if (data.ok) {
      toast('Deleted ' + currentUser.name, true);
      closeModal();
      loadUsers();
    } else toast('Failed: ' + data.error, false);
  } catch (err) { toast('Failed: ' + err.message, false); }
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
      lastPasswords[name] = pass;
      document.getElementById('newName').value = '';
      document.getElementById('newPass').value = '';
      loadUsers();
    } else {
      toast('Failed: ' + data.error, false);
    }
  } catch (err) { toast('Failed: ' + err.message, false); }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLoginCard(); closeModal(); }
});

loadUsers();
setInterval(loadUsers, 30000);
</script>
</body>
</html>`;
}

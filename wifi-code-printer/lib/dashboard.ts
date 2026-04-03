/**
 * Web UI dashboard for WiFi code generation
 *
 * Simple, clean interface for generating WiFi vouchers.
 * Three presets + custom option + note field.
 * Designed for Lisa to use on demand from her phone/tablet.
 */

export function renderDashboard(ssid: string, closingTime?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>FIKA WiFi Codes</title>
<style>
  :root {
    --bg: #0d1117;
    --card: #161b22;
    --border: #30363d;
    --text: #e6edf3;
    --dim: #8b949e;
    --accent: #58a6ff;
    --green: #3fb950;
    --orange: #d29922;
    --red: #f85149;
    --font: 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 16px;
  }
  .header {
    text-align: center;
    padding: 24px 0 16px;
  }
  .header h1 {
    font-size: 1.4em;
    letter-spacing: 0.15em;
    color: var(--accent);
  }
  .header .sub {
    font-size: 0.8em;
    color: var(--dim);
    margin-top: 4px;
  }
  .presets {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin: 20px 0;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
  .preset-btn {
    background: var(--card);
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 18px 8px;
    color: var(--text);
    font-family: var(--font);
    font-size: 0.85em;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }
  .preset-btn:hover, .preset-btn:active {
    border-color: var(--accent);
    background: #1a2332;
  }
  .preset-btn:active {
    transform: scale(0.97);
  }
  .preset-btn .duration {
    font-size: 1.4em;
    font-weight: bold;
    color: var(--accent);
    display: block;
    margin-bottom: 6px;
  }
  .preset-btn .detail {
    font-size: 0.75em;
    color: var(--dim);
  }
  .section {
    max-width: 500px;
    margin: 0 auto;
  }
  .custom-toggle {
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--dim);
    font-family: var(--font);
    font-size: 0.8em;
    padding: 8px 16px;
    cursor: pointer;
    width: 100%;
    margin-bottom: 12px;
  }
  .custom-toggle:hover { color: var(--text); border-color: var(--accent); }
  .custom-form {
    display: none;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .custom-form.open { display: block; }
  .form-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }
  .form-group {
    flex: 1;
  }
  .form-group label {
    display: block;
    font-size: 0.7em;
    color: var(--dim);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .form-group input, .form-group select {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font);
    font-size: 0.9em;
    padding: 10px;
  }
  .form-group input:focus, .form-group select:focus {
    outline: none;
    border-color: var(--accent);
  }
  .note-input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font);
    font-size: 0.85em;
    padding: 10px;
    margin-bottom: 12px;
  }
  .note-input::placeholder { color: #484f58; }
  .note-input:focus { outline: none; border-color: var(--accent); }
  .custom-print-btn {
    background: var(--accent);
    border: none;
    border-radius: 8px;
    color: #0d1117;
    font-family: var(--font);
    font-size: 0.9em;
    font-weight: bold;
    padding: 12px;
    width: 100%;
    cursor: pointer;
  }
  .custom-print-btn:hover { opacity: 0.9; }
  .custom-print-btn:active { transform: scale(0.98); }
  .result {
    max-width: 500px;
    margin: 16px auto;
    padding: 16px;
    border-radius: 10px;
    text-align: center;
    display: none;
    animation: fadeIn 0.2s;
  }
  .result.success {
    display: block;
    background: #0d2818;
    border: 1px solid var(--green);
  }
  .result.error {
    display: block;
    background: #2d1215;
    border: 1px solid var(--red);
  }
  .result.loading {
    display: block;
    background: var(--card);
    border: 1px solid var(--border);
  }
  .result .code {
    font-size: 1.6em;
    font-weight: bold;
    color: var(--green);
    letter-spacing: 0.1em;
    margin: 8px 0;
  }
  .result .info {
    font-size: 0.8em;
    color: var(--dim);
  }
  .result .error-msg {
    color: var(--red);
  }
  .history {
    max-width: 500px;
    margin: 24px auto;
  }
  .history h3 {
    font-size: 0.75em;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-bottom: 8px;
  }
  .history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 4px;
    font-size: 0.8em;
  }
  .history-item .h-code { color: var(--green); font-weight: bold; }
  .history-item .h-meta { color: var(--dim); font-size: 0.85em; }
  .status-bar {
    max-width: 500px;
    margin: 20px auto 0;
    display: flex;
    justify-content: center;
    gap: 16px;
    font-size: 0.7em;
    color: var(--dim);
  }
  .status-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
  }
  .status-dot.ok { background: var(--green); }
  .status-dot.err { background: var(--red); }
  .status-dot.unknown { background: var(--orange); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .loading .code { animation: pulse 1s infinite; color: var(--accent); }
</style>
</head>
<body>

<div class="header">
  <h1>FIKA WIFI</h1>
  <div class="sub">Network: ${ssid}${closingTime ? ` - closes ${closingTime}` : ""} - tap to print</div>
</div>

<div class="presets">
  <button class="preset-btn" onclick="generate(30, 1)">
    <span class="duration">30m</span>
    <span class="detail">1 device</span>
  </button>
  <button class="preset-btn" onclick="generate(120, 1)">
    <span class="duration">2h</span>
    <span class="detail">1 device</span>
  </button>
  <button class="preset-btn" onclick="generate(720, 2)">
    <span class="duration">12h</span>
    <span class="detail">2 devices</span>
  </button>
</div>

<div class="section">
  <input class="note-input" id="note" type="text" placeholder="Name / note (optional)" autocomplete="off">

  <button class="custom-toggle" onclick="toggleCustom()">Custom duration...</button>

  <div class="custom-form" id="customForm">
    <div class="form-row">
      <div class="form-group">
        <label>Duration</label>
        <input type="number" id="customDuration" value="60" min="5" max="43200">
      </div>
      <div class="form-group">
        <label>Unit</label>
        <select id="customUnit">
          <option value="1">minutes</option>
          <option value="60" selected>hours</option>
          <option value="1440">days</option>
        </select>
      </div>
      <div class="form-group">
        <label>Devices</label>
        <input type="number" id="customDevices" value="1" min="1" max="10">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Quantity</label>
        <input type="number" id="customQty" value="1" min="1" max="20">
      </div>
      <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:0.85em;text-transform:none;letter-spacing:0">
          <input type="checkbox" id="doPrint" checked style="width:auto;accent-color:var(--accent)">
          Print receipt
        </label>
      </div>
    </div>
    <div style="font-size:0.65em;color:var(--dim);margin-bottom:10px">Custom = no auto-expire</div>
    <button class="custom-print-btn" onclick="generateCustom()">Generate WiFi Code(s)</button>
  </div>
</div>

<div class="result" id="result"></div>

<div class="history" id="historySection" style="display:none">
  <h3>Recent codes</h3>
  <div id="historyList"></div>
</div>

<div class="status-bar" id="statusBar">
  <span><span class="status-dot unknown" id="printerDot"></span>Printer</span>
  <span><span class="status-dot unknown" id="bridgeDot"></span>Bridge</span>
</div>

<script>
const history = [];

function toggleCustom() {
  document.getElementById('customForm').classList.toggle('open');
}

function generateCustom() {
  const dur = parseInt(document.getElementById('customDuration').value) || 60;
  const unit = parseInt(document.getElementById('customUnit').value) || 1;
  const devices = parseInt(document.getElementById('customDevices').value) || 1;
  const qty = parseInt(document.getElementById('customQty').value) || 1;
  const doPrint = document.getElementById('doPrint').checked;
  generateBatch(dur * unit, devices, qty, true, !doPrint);
}

async function generate(minutes, devices) {
  return generateBatch(minutes, devices, 1, false, false);
}

async function generateBatch(minutes, devices, qty, noExpire, skipPrint) {
  const note = document.getElementById('note').value.trim();
  const result = document.getElementById('result');
  const total = qty;
  let completed = 0;
  let lastCode = '';
  let errors = 0;

  result.className = 'result loading';
  result.innerHTML = '<div class="code">...</div><div class="info">' + (total > 1 ? (skipPrint ? 'Generating ' : 'Printing ') + total + ' vouchers...' : (skipPrint ? 'Generating voucher...' : 'Generating voucher + printing...')) + '</div>';

  document.querySelectorAll('.preset-btn, .custom-print-btn').forEach(b => b.disabled = true);

  for (let i = 0; i < total; i++) {
    try {
      if (total > 1) {
        result.innerHTML = '<div class="code">' + (i + 1) + ' / ' + total + '</div><div class="info">' + (skipPrint ? 'Generating...' : 'Printing...') + '</div>';
      }

      const resp = await fetch('/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: minutes, devices, note: note || undefined, no_expire: noExpire || undefined, skip_print: skipPrint || undefined }),
      });
      const data = await resp.json();

      if (data.ok) {
        completed++;
        lastCode = data.voucher_code;
        const validInfo = data.valid_until ? 'until ' + data.valid_until : formatDuration(minutes);
        addHistory(data.voucher_code, minutes, devices, note, data.valid_until);
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
    }
  }

  if (completed > 0) {
    result.className = 'result success';
    const validInfo = noExpire ? 'no expire' : '';
    if (total === 1) {
      result.innerHTML = '<div class="info">Printed!</div><div class="code">' + esc(lastCode) + '</div><div class="info">' + formatDuration(minutes) + ' - ' + devices + ' device' + (devices > 1 ? 's' : '') + (validInfo ? ' - ' + validInfo : '') + (note ? ' - ' + esc(note) : '') + '</div>';
    } else {
      result.innerHTML = '<div class="info">Batch complete</div><div class="code">' + completed + ' / ' + total + '</div><div class="info">' + formatDuration(minutes) + ' - ' + devices + ' device' + (devices > 1 ? 's' : '') + (errors > 0 ? ' (' + errors + ' failed)' : '') + '</div>';
    }
    document.getElementById('note').value = '';
  } else {
    result.className = 'result error';
    result.innerHTML = '<div class="error-msg">All ' + total + ' prints failed</div>';
  }

  document.querySelectorAll('.preset-btn, .custom-print-btn').forEach(b => b.disabled = false);
}

function addHistory(code, minutes, devices, note, validUntil) {
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  history.unshift({ code, minutes, devices, note, time, validUntil });
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (history.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  list.innerHTML = history.map(h =>
    '<div class="history-item">' +
      '<span class="h-code">' + esc(h.code) + '</span>' +
      '<span class="h-meta">' + (h.validUntil ? 'until ' + h.validUntil : formatDuration(h.minutes)) + ' - ' + h.time + (h.note ? ' - ' + esc(h.note) : '') + '</span>' +
    '</div>'
  ).join('');
}

function formatDuration(min) {
  if (min < 60) return min + 'min';
  if (min < 1440) { const h = Math.round(min / 60); return h === 1 ? '1 hour' : h + 'h'; }
  const d = Math.round(min / 1440); return d === 1 ? '1 day' : d + ' days';
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function checkStatus() {
  try {
    const resp = await fetch('/status');
    const data = await resp.json();
    document.getElementById('printerDot').className =
      'status-dot ' + (data.printer?.online ? 'ok' : 'err');
    document.getElementById('bridgeDot').className =
      'status-dot ' + (data.bridge?.configured ? (data.bridge.connected ? 'ok' : 'err') : 'unknown');
  } catch {}
}

checkStatus();
setInterval(checkStatus, 30000);
</script>
</body>
</html>`;
}

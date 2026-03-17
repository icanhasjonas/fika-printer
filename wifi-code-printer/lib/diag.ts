/**
 * Printer diagnostics page
 *
 * Controls for buzzer, print width, density, status, and test prints.
 * Only non-dangerous settings exposed. No factory reset, no baud changes.
 */

export function renderDiagPage(printerHost: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FIKA Printer Diagnostics</title>
<style>
  :root {
    --bg: #0d1117; --card: #161b22; --border: #30363d;
    --text: #e6edf3; --dim: #8b949e; --accent: #58a6ff;
    --green: #3fb950; --orange: #d29922; --red: #f85149;
    --font: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 16px; max-width: 600px; margin: 0 auto; }
  h1 { color: var(--accent); font-size: 1.2em; margin-bottom: 4px; }
  .sub { color: var(--dim); font-size: 0.8em; margin-bottom: 20px; }
  .section { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
  .section h2 { font-size: 0.8em; color: var(--dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
  .row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .btn {
    background: var(--card); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font); font-size: 0.8em;
    padding: 8px 14px; cursor: pointer; transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:hover { border-color: var(--accent); background: #1a2332; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.green { border-color: var(--green); color: var(--green); }
  .btn.red { border-color: var(--red); color: var(--red); }
  .btn.active { background: var(--accent); color: #0d1117; border-color: var(--accent); }
  .status-box {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 10px; font-size: 0.8em; margin-top: 8px; white-space: pre-wrap;
    color: var(--dim); min-height: 40px;
  }
  .log { max-height: 200px; overflow-y: auto; }
  .back { color: var(--dim); font-size: 0.8em; text-decoration: none; }
  .back:hover { color: var(--accent); }
  select {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--font); font-size: 0.8em; padding: 8px;
  }
  select:focus { outline: none; border-color: var(--accent); }
</style>
</head>
<body>

<a href="/" class="back">&lt; Back to dashboard</a>
<h1>Printer Diagnostics</h1>
<div class="sub">${esc(printerHost)}</div>

<div class="section">
  <h2>Status</h2>
  <div class="row">
    <button class="btn green" onclick="checkStatus()">Check Status</button>
    <button class="btn" onclick="testPrint()">Test Print</button>
  </div>
  <div class="status-box" id="statusBox">Tap "Check Status" to query printer</div>
</div>

<div class="section">
  <h2>Buzzer</h2>
  <div class="row">
    <button class="btn green" onclick="sendCmd('buzzer_off')">All Beeps OFF</button>
    <button class="btn red" onclick="sendCmd('buzzer_on')">Beeps ON</button>
  </div>
  <div class="row">
    <button class="btn" onclick="sendCmd('cutter_alarm_off')">Cutter Alarm OFF</button>
    <button class="btn" onclick="sendCmd('beep_print_off')">Print Beep OFF</button>
    <button class="btn" onclick="sendCmd('idle_alarm_off')">Idle Alarm OFF</button>
  </div>
  <div class="row">
    <button class="btn" onclick="sendCmd('epson_buzzer_off')">Epson Protocol OFF</button>
  </div>
</div>

<div class="section">
  <h2>Print Width</h2>
  <div class="row">
    <button class="btn" onclick="sendCmd('width_72')">72mm</button>
    <button class="btn active" onclick="sendCmd('width_80')">80mm</button>
  </div>
</div>

<div class="section">
  <h2>Print Density</h2>
  <div class="row">
    <select id="density" onchange="sendCmd('density_' + this.value)">
      <option value="" disabled selected>Select density...</option>
      <option value="1">1 - Lightest</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5 - Default</option>
      <option value="6">6</option>
      <option value="7">7</option>
      <option value="8">8 - Darkest</option>
    </select>
  </div>
</div>

<div class="section">
  <h2>Log</h2>
  <div class="status-box log" id="logBox"></div>
</div>

<script>
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function log(msg) {
  const box = document.getElementById('logBox');
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  box.textContent = time + ' ' + msg + '\\n' + box.textContent;
}

async function checkStatus() {
  const box = document.getElementById('statusBox');
  box.textContent = 'Querying...';
  try {
    const resp = await fetch('/status');
    const data = await resp.json();
    const p = data.printer;
    box.textContent = 'Online: ' + (p.online ? 'YES' : 'NO') + '\\n' +
      'Paper: ' + p.paper + '\\n' +
      'Errors: ' + (p.errors.length ? p.errors.join(', ') : 'none');
    log('Status: ' + (p.online ? 'online' : 'OFFLINE') + ', paper: ' + p.paper);
  } catch (err) {
    box.textContent = 'Error: ' + err.message;
    log('Status check failed: ' + err.message);
  }
}

async function testPrint() {
  log('Sending test print...');
  try {
    const resp = await fetch('/test', { method: 'POST' });
    const data = await resp.json();
    log(data.ok ? 'Test print sent via ' + data.method : 'Test print failed: ' + data.error);
  } catch (err) {
    log('Test print failed: ' + err.message);
  }
}

async function sendCmd(cmd) {
  log('Sending: ' + cmd + '...');
  try {
    const resp = await fetch('/diag/cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd }),
    });
    const data = await resp.json();
    log(data.ok ? cmd + ': sent ' + data.bytes + ' bytes' : cmd + ' failed: ' + data.error);
  } catch (err) {
    log(cmd + ' failed: ' + err.message);
  }
}

checkStatus();
</script>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

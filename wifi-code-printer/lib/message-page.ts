/**
 * Message printer page - general purpose receipt printing
 */

export function renderMessagePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>FIKA Message Printer</title>
<style>
  :root {
    --bg: #0d1117; --card: #161b22; --border: #30363d;
    --text: #e6edf3; --dim: #8b949e; --accent: #58a6ff;
    --green: #3fb950; --red: #f85149;
    --font: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font); background: var(--bg); color: var(--text); padding: 16px; min-height: 100vh; }
  .page { max-width: 500px; margin: 0 auto; }
  h1 { color: var(--accent); font-size: 1.2em; margin-bottom: 4px; }
  .sub { color: var(--dim); font-size: 0.8em; margin-bottom: 20px; }
  .back { color: var(--dim); font-size: 0.8em; text-decoration: none; display: inline-block; margin-bottom: 12px; }
  .back:hover { color: var(--accent); }
  .form { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .field { margin-bottom: 14px; }
  .field label {
    display: block; font-size: 0.7em; color: var(--dim);
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;
  }
  .field input[type="text"], .field textarea {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text); font-family: var(--font);
    font-size: 0.9em; padding: 10px;
  }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--accent); }
  .field textarea { resize: vertical; min-height: 80px; }
  .field input::placeholder, .field textarea::placeholder { color: #484f58; }
  .checkbox-row {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 14px; cursor: pointer;
  }
  .checkbox-row input { width: auto; accent-color: var(--accent); }
  .checkbox-row span { font-size: 0.85em; color: var(--text); }
  .row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 14px; }
  .row .field { flex: 1; margin-bottom: 0; }
  .print-btn {
    background: var(--accent); border: none; border-radius: 8px;
    color: #0d1117; font-family: var(--font); font-size: 0.95em;
    font-weight: bold; padding: 14px; width: 100%; cursor: pointer;
    margin-top: 4px;
  }
  .print-btn:hover { opacity: 0.9; }
  .print-btn:active { transform: scale(0.98); }
  .print-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .result {
    margin-top: 16px; padding: 12px; border-radius: 8px;
    text-align: center; font-size: 0.85em; display: none;
  }
  .result.success { display: block; background: #0d2818; border: 1px solid var(--green); color: var(--green); }
  .result.error { display: block; background: #2d1215; border: 1px solid var(--red); color: var(--red); }
  .result.loading { display: block; background: var(--card); border: 1px solid var(--border); color: var(--dim); }
  .presets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .preset {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--dim); font-family: var(--font); font-size: 0.7em;
    padding: 5px 10px; cursor: pointer;
  }
  .preset:hover { border-color: var(--accent); color: var(--text); }
</style>
</head>
<body>
<div class="page">
  <a href="/" class="back">&lt; Back to dashboard</a>
  <h1>Message Printer</h1>
  <div class="sub">Print custom messages, announcements, notices</div>

  <div class="presets">
    <button class="preset" onclick="loadPreset('ready')">Order Ready</button>
    <button class="preset" onclick="loadPreset('closed')">Closed</button>
    <button class="preset" onclick="loadPreset('special')">Daily Special</button>
    <button class="preset" onclick="loadPreset('wifi')">WiFi Notice</button>
  </div>

  <div class="form">
    <label class="checkbox-row">
      <input type="checkbox" id="includeLogo" checked>
      <span>Include FIKA logo</span>
    </label>

    <div class="field">
      <label>Subject (large text)</label>
      <input type="text" id="subject" placeholder="TABLE 4 - READY!" autocomplete="off">
    </div>

    <div class="field">
      <label>Message (smaller text, optional)</label>
      <textarea id="message" placeholder="Your order is ready for pickup.&#10;Please collect at the counter."></textarea>
    </div>

    <div class="field">
      <label>Footer (large text, optional)</label>
      <input type="text" id="footer" placeholder="ENJOY!" autocomplete="off">
    </div>

    <div class="row">
      <div class="field">
        <label>Copies</label>
        <input type="text" id="copies" value="1" inputmode="numeric" pattern="[0-9]*">
      </div>
    </div>

    <button class="print-btn" id="printBtn" onclick="printMessage()">PRINT</button>
  </div>

  <div class="result" id="result"></div>
</div>

<script>
const presets = {
  ready: { subject: 'ORDER READY!', message: 'Your order is ready for pickup.\\nPlease collect at the counter.', footer: 'ENJOY!', logo: true },
  closed: { subject: 'CLOSED', message: 'We are closed for today.\\nSee you tomorrow!', footer: 'FIKA', logo: true },
  special: { subject: "TODAY'S SPECIAL", message: '', footer: '', logo: true },
  wifi: { subject: 'WIFI INFO', message: 'Network: Fika\\nConnect and enter your code\\nin the captive portal.', footer: '', logo: true },
};

function loadPreset(name) {
  const p = presets[name];
  if (!p) return;
  document.getElementById('subject').value = p.subject;
  document.getElementById('message').value = p.message;
  document.getElementById('footer').value = p.footer;
  document.getElementById('includeLogo').checked = p.logo;
  document.getElementById('subject').focus();
}

async function printMessage() {
  const subject = document.getElementById('subject').value.trim();
  if (!subject) { document.getElementById('subject').focus(); return; }

  const message = document.getElementById('message').value.trim();
  const footer = document.getElementById('footer').value.trim();
  const includeLogo = document.getElementById('includeLogo').checked;
  const copies = Math.max(1, Math.min(20, parseInt(document.getElementById('copies').value) || 1));

  const btn = document.getElementById('printBtn');
  const result = document.getElementById('result');
  btn.disabled = true;
  result.className = 'result loading';
  result.textContent = copies > 1 ? 'Printing ' + copies + ' copies...' : 'Printing...';

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < copies; i++) {
    if (copies > 1) { result.textContent = 'Printing ' + (i + 1) + ' / ' + copies + '...'; }
    try {
      const resp = await fetch('/message/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message: message || undefined, footer: footer || undefined, include_logo: includeLogo }),
      });
      const data = await resp.json();
      data.ok ? ok++ : fail++;
    } catch { fail++; }
  }

  if (ok > 0) {
    result.className = 'result success';
    result.textContent = copies === 1 ? 'Printed!' : ok + ' / ' + copies + ' printed' + (fail > 0 ? ' (' + fail + ' failed)' : '');
  } else {
    result.className = 'result error';
    result.textContent = 'Print failed';
  }
  btn.disabled = false;
}
</script>
</body>
</html>`;
}

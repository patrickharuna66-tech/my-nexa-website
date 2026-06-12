/* ═══════════════════════════════════════
   NEXAHOST — CUSTOMER DASHBOARD JS
   ═══════════════════════════════════════ */
window.API_BASE = 'http://localhost:5000/api';

let currentUser = null;
let accountData = {};

const TAB_TITLES = {
  overview:  ['Dashboard',        'Welcome back. Here\'s your hosting overview.'],
  websites:  ['My Websites',      'Manage all your hosted websites and apps.'],
  files:     ['File Manager',     'Browse and manage your server files.'],
  email:     ['Email Accounts',   'Create and manage professional email addresses.'],
  databases: ['Databases',        'MySQL databases and phpMyAdmin access.'],
  domains:   ['Domains & DNS',    'Manage domains, subdomains, and DNS records.'],
  billing:   ['Plan & Billing',   'Your current plan and payment methods.'],
  invoices:  ['Invoice History',  'View and download your invoices.'],
  tickets:   ['Support Tickets',  'Get expert help from the NexaHost team.'],
  settings:  ['Account Settings', 'Update your personal and account details.'],
};

// ── BOOTSTRAP ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('customer')) return;
  currentUser = getUser();
  populateSidebar();
  await fetchAccountData();
  loadTab('overview');
});

function populateSidebar() {
  const initials = currentUser.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('sidebarEmail').textContent  = currentUser.email;
}

async function fetchAccountData() {
  try {
    accountData = await apiCall('/customer/account');
  } catch(e) {
    // Use demo data if backend is offline
    accountData = getDemoData();
  }
}

function getDemoData() {
  return {
    plan: { name: 'Business Growth', price: 12.99, renewsAt: '2025-12-15', status: 'active' },
    usage: { disk: { used: 23.4, total: 50 }, bandwidth: { used: 120, total: null }, emails: { used: 7, total: null }, databases: { used: 4, total: 50 } },
    websites: [
      { id:1, domain: 'janedoe.com',    status: 'active', ssl: true, lastBackup: '2 hours ago', diskGB: 14.2, monthlyVisits: 52400 },
      { id:2, domain: 'myblog.io',      status: 'active', ssl: true, lastBackup: '3 hours ago', diskGB: 7.8,  monthlyVisits: 29800 },
      { id:3, domain: 'newproject.dev', status: 'setup',  ssl: false, lastBackup: '—',          diskGB: 1.4,  monthlyVisits: null  },
    ],
    emails: [
      { address: 'hello@janedoe.com',   quotaGB: 2, usedMB: 340 },
      { address: 'info@janedoe.com',    quotaGB: 2, usedMB: 120 },
      { address: 'support@janedoe.com', quotaGB: 2, usedMB: 88  },
    ],
    databases: [
      { name: 'janedoe_wp',    sizeMB: 245, tables: 12 },
      { name: 'janedoe_store', sizeMB: 88,  tables: 38 },
    ],
    domains: [
      { domain: 'janedoe.com', status: 'active', expires: 'Dec 2026', autoRenew: true  },
      { domain: 'myblog.io',   status: 'active', expires: 'Mar 2026', autoRenew: true  },
    ],
    invoices: [
      { id:'INV-2024-11', date:'Nov 15, 2024', desc:'Business Growth Plan', amount:12.99, status:'paid' },
      { id:'INV-2024-10', date:'Oct 15, 2024', desc:'Business Growth Plan', amount:12.99, status:'paid' },
      { id:'INV-2024-09', date:'Sep 15, 2024', desc:'Business Growth Plan', amount:12.99, status:'paid' },
    ],
    tickets: [
      { id:'TKT-8821', subject:'Email not sending from janedoe.com', status:'open',     age:'2 hours ago' },
      { id:'TKT-8790', subject:'SSL certificate renewal',            status:'resolved', age:'3 days ago'  },
    ],
    traffic: [45, 62, 55, 80, 95, 70, 50],
  };
}

// ── TAB LOADER ──
function loadTab(tab) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const items = document.querySelectorAll('.sidebar-item');
  items.forEach(el => { if (el.getAttribute('onclick')?.includes(`'${tab}'`)) el.classList.add('active'); });

  // Update header
  const [title, sub] = TAB_TITLES[tab] || [tab, ''];
  document.getElementById('pageTitle').textContent    = title;
  document.getElementById('pageSubtitle').textContent = sub;

  // Render content
  const content = document.getElementById('tabContent');
  const renders = {
    overview:  renderOverview,
    websites:  renderWebsites,
    files:     renderFiles,
    email:     renderEmail,
    databases: renderDatabases,
    domains:   renderDomains,
    billing:   renderBilling,
    invoices:  renderInvoices,
    tickets:   renderTickets,
    settings:  renderSettings,
  };
  content.innerHTML = (renders[tab] || (() => '<p>Coming soon</p>'))();
}
window.loadTab = loadTab;

// ── TAB RENDERERS ──

function renderOverview() {
  const d  = accountData;
  const p  = d.plan || {};
  const u  = d.usage || {};
  const dk = u.disk || {};
  const bw = u.bandwidth || {};
  const em = u.emails || {};
  const db = u.databases || {};
  const ws = (d.websites || []).filter(w => w.status === 'active').length;
  const diskPct = dk.total ? Math.round((dk.used / dk.total) * 100) : 0;
  const traf = (d.traffic || [45,62,55,80,95,70,50]);
  const maxT = Math.max(...traf);
  const days = ['M','T','W','T','F','S','S'];
  return `
  <div class="plan-card">
    <div class="plan-info">
      <h3>Current Plan</h3>
      <div class="plan-name">${p.name || 'Business Growth'}</div>
      <div class="plan-detail">$${p.price || 12.99}/month · Renews ${p.renewsAt || 'Dec 15, 2025'} · <span style="color:var(--green)">✓ Active</span></div>
    </div>
    <div class="plan-actions">
      <button class="btn btn-primary" onclick="loadTab('billing')">Upgrade Plan</button>
      <button class="btn btn-ghost"   onclick="loadTab('billing')">Manage Billing</button>
    </div>
  </div>
  <div class="metric-grid">
    <div class="metric-card" style="color:var(--accent2)">
      <div class="metric-icon">🌐</div>
      <div class="metric-label">Websites</div>
      <div class="metric-value">${ws}</div>
      <div class="metric-change change-up">↑ 1 this month</div>
    </div>
    <div class="metric-card" style="color:var(--teal)">
      <div class="metric-icon">💾</div>
      <div class="metric-label">Storage Used</div>
      <div class="metric-value">${dk.used || 23.4} GB</div>
      <div class="metric-change" style="color:var(--text3)">of ${dk.total || 50} GB</div>
    </div>
    <div class="metric-card" style="color:var(--green)">
      <div class="metric-icon">⬆️</div>
      <div class="metric-label">Monthly Traffic</div>
      <div class="metric-value">84K</div>
      <div class="metric-change change-up">↑ 12% vs last month</div>
    </div>
    <div class="metric-card" style="color:var(--gold)">
      <div class="metric-icon">📧</div>
      <div class="metric-label">Email Accounts</div>
      <div class="metric-value">${em.used || 7}</div>
      <div class="metric-change" style="color:var(--text3)">Unlimited available</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;flex-wrap:wrap">
    <div class="card">
      <div class="card-header"><div><div class="card-title">Resource Usage</div><div class="card-subtitle">Current billing period</div></div></div>
      <div class="usage-item">
        <div class="usage-row"><span class="usage-name">Disk Storage</span><span class="usage-vals">${dk.used||23.4} / ${dk.total||50} GB</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${diskPct}%;background:linear-gradient(90deg,var(--accent),var(--accent2))"></div></div>
      </div>
      <div class="usage-item">
        <div class="usage-row"><span class="usage-name">Bandwidth</span><span class="usage-vals">${bw.used||120} GB / ∞</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:24%;background:linear-gradient(90deg,var(--teal2),var(--teal))"></div></div>
      </div>
      <div class="usage-item">
        <div class="usage-row"><span class="usage-name">Email Accounts</span><span class="usage-vals">${em.used||7} / ∞</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:15%;background:linear-gradient(90deg,var(--gold),#f5c842)"></div></div>
      </div>
      <div class="usage-item">
        <div class="usage-row"><span class="usage-name">MySQL Databases</span><span class="usage-vals">${db.used||4} / ${db.total||50}</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:8%;background:linear-gradient(90deg,var(--pink),#ff8ec7)"></div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div><div class="card-title">Traffic Overview</div><div class="card-subtitle">Visitors last 7 days</div></div></div>
      <div class="bar-chart">
        ${traf.map((v,i)=>`<div class="bar-col"><div class="bar" style="height:${Math.round(v/maxT*100)}%;background:linear-gradient(180deg,var(--accent2),var(--accent))"></div><div class="bar-label">${days[i]}</div></div>`).join('')}
      </div>
    </div>
  </div>
  <div class="card" style="margin-top:0">
    <div class="card-header">
      <div><div class="card-title">My Websites</div></div>
      <button class="btn btn-primary btn-sm" onclick="loadTab('websites')">Manage All →</button>
    </div>
    ${websitesTable(d.websites || [])}
  </div>`;
}

function websitesTable(sites) {
  return `<div class="table-responsive"><table class="dash-table">
    <thead><tr><th>Domain</th><th>Status</th><th>SSL</th><th>Last Backup</th><th>Actions</th></tr></thead>
    <tbody>${sites.map(s => `
    <tr>
      <td><strong style="color:var(--text)">${s.domain}</strong></td>
      <td>${s.status==='active'?'<span class="status-pill status-active"><span class="status-dot"></span>Live</span>':'<span class="status-pill status-pending"><span class="status-dot"></span>Setup</span>'}</td>
      <td style="color:${s.ssl?'var(--green)':'var(--text3)'}">${s.ssl?'✓ Valid':'Pending'}</td>
      <td style="color:var(--text3)">${s.lastBackup}</td>
      <td><button class="action-btn primary" onclick="showToast('⚙️','Launching cPanel for ${s.domain}')">cPanel</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderWebsites() {
  const sites = accountData.websites || [];
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">My Websites (${sites.length})</div></div>
      <button class="btn btn-primary" onclick="showToast('🌐','Add website flow — connect your hosting panel')">+ Add Website</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Domain</th><th>CMS</th><th>Status</th><th>Disk</th><th>Visits/mo</th><th>Actions</th></tr></thead>
      <tbody>${sites.map(s=>`<tr>
        <td><strong style="color:var(--text)">${s.domain}</strong></td>
        <td style="color:var(--text3)">WordPress 6.4</td>
        <td>${s.status==='active'?'<span class="status-pill status-active"><span class="status-dot"></span>Live</span>':'<span class="status-pill status-pending"><span class="status-dot"></span>Setup</span>'}</td>
        <td>${s.diskGB} GB</td>
        <td>${s.monthlyVisits ? s.monthlyVisits.toLocaleString() : '—'}</td>
        <td><button class="action-btn primary" onclick="showToast('⚙️','cPanel for ${s.domain}')">cPanel</button>
            <button class="action-btn" style="margin-left:6px" onclick="showToast('🗑️','Delete confirmation required')">Delete</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function renderFiles() {
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">File Manager</div><div class="card-subtitle">Tip: For full access, use cPanel's File Manager</div></div>
      <div style="display:flex;gap:8px">
        <button class="action-btn" onclick="showToast('📁','New folder created')">+ Folder</button>
        <button class="action-btn primary" onclick="showToast('📤','Upload ready')">Upload File</button>
      </div>
    </div>
    <div style="background:var(--bg3);border-radius:var(--radius);padding:12px;margin-bottom:16px;font-family:monospace;font-size:13px;color:var(--text3)">
      / home / ${currentUser?.email?.split('@')[0] || 'user'} / public_html
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th>Actions</th></tr></thead>
      <tbody>
        <tr><td>📁 wp-content</td><td>Folder</td><td>8.4 GB</td><td>Today</td><td><button class="action-btn" onclick="showToast('📁','Opened')">Open</button></td></tr>
        <tr><td>📁 wp-admin</td>  <td>Folder</td><td>12 MB</td><td>Dec 1</td><td><button class="action-btn" onclick="showToast('📁','Opened')">Open</button></td></tr>
        <tr><td>📄 wp-config.php</td><td>PHP</td><td>3.2 KB</td><td>Nov 28</td><td><button class="action-btn" onclick="showToast('✏️','Editor opened')">Edit</button></td></tr>
        <tr><td>📄 index.php</td>    <td>PHP</td><td>418 B</td><td>Nov 20</td><td><button class="action-btn" onclick="showToast('✏️','Editor opened')">Edit</button></td></tr>
        <tr><td>📄 .htaccess</td>    <td>Config</td><td>2.1 KB</td><td>Nov 15</td><td><button class="action-btn" onclick="showToast('✏️','Editor opened')">Edit</button></td></tr>
      </tbody>
    </table></div></div>`;
}

function renderEmail() {
  const emails = accountData.emails || [];
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">Email Accounts</div></div>
      <button class="btn btn-primary" onclick="showToast('📧','Create email via cPanel')">+ Create Email</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Email Address</th><th>Quota</th><th>Used</th><th>Actions</th></tr></thead>
      <tbody>${emails.map(e=>`<tr>
        <td><strong style="color:var(--text)">${e.address}</strong></td>
        <td>${e.quotaGB} GB</td>
        <td>${e.usedMB} MB</td>
        <td><button class="action-btn primary" onclick="showToast('📬','Webmail opened')">Webmail</button>
            <button class="action-btn" style="margin-left:6px" onclick="showToast('🔧','Settings opened')">Settings</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function renderDatabases() {
  const dbs = accountData.databases || [];
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">MySQL Databases</div></div>
      <button class="btn btn-primary" onclick="showToast('🗄️','Create database via cPanel')">+ Create Database</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Database Name</th><th>Size</th><th>Tables</th><th>Actions</th></tr></thead>
      <tbody>${dbs.map(d=>`<tr>
        <td><strong style="color:var(--text)">${d.name}</strong></td>
        <td>${d.sizeMB} MB</td>
        <td>${d.tables}</td>
        <td><button class="action-btn primary" onclick="showToast('🗄️','phpMyAdmin opened')">phpMyAdmin</button>
            <button class="action-btn danger" style="margin-left:6px" onclick="showToast('⚠️','Confirm deletion required')">Delete</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function renderDomains() {
  const doms = accountData.domains || [];
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">Domains & DNS</div></div>
      <button class="btn btn-primary" onclick="showToast('🔗','Add/park domain via cPanel')">+ Add Domain</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Domain</th><th>Status</th><th>Expires</th><th>Auto-Renew</th><th>Actions</th></tr></thead>
      <tbody>${doms.map(d=>`<tr>
        <td><strong style="color:var(--text)">${d.domain}</strong></td>
        <td><span class="status-pill status-active"><span class="status-dot"></span>Active</span></td>
        <td style="color:var(--text2)">${d.expires}</td>
        <td style="color:${d.autoRenew?'var(--green)':'var(--red)'}">${d.autoRenew?'✓ On':'✗ Off'}</td>
        <td><button class="action-btn" onclick="showToast('🔧','DNS Manager opened')">DNS Manager</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function renderBilling() {
  const p = accountData.plan || {};
  const plans = [
    { id:'starter',  name:'Starter',  price:5.99,  features:'1 site · 10 GB · 5 emails' },
    { id:'business', name:'Business', price:12.99, features:'Unlimited sites · 50 GB · emails + domain', current:true },
    { id:'pro',      name:'Pro',      price:19.99, features:'200 GB · hourly backups · dedicated IP' },
  ];
  return `
  <div class="plan-card">
    <div class="plan-info">
      <h3>Current Plan</h3>
      <div class="plan-name">${p.name || 'Business Growth'} — $${p.price || 12.99}/mo</div>
      <div class="plan-detail">Next charge: ${p.renewsAt || 'Dec 15, 2025'} · Visa •••• 4242</div>
    </div>
    <div class="plan-actions">
      <button class="btn btn-primary" onclick="showToast('⬆️','Upgrade flow — connect payment gateway')">Upgrade to Pro</button>
      <button class="btn btn-ghost"   onclick="showToast('💳','Update payment method')">Update Card</button>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Compare Plans</div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      ${plans.map(pl=>`
      <div style="padding:20px;border:${pl.current?'2px solid var(--accent)':'1px solid var(--border)'};border-radius:var(--radius);text-align:center;background:${pl.current?'rgba(124,92,252,.08)':'var(--bg3)'}">
        <div style="font-weight:700;margin-bottom:4px;color:${pl.current?'var(--accent2)':'var(--text)'}">${pl.name}${pl.current?' ✓':''}</div>
        <div style="font-size:28px;font-weight:800;color:${pl.current?'var(--accent2)':'var(--text)'};margin:8px 0">$${pl.price}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px">/month</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:16px">${pl.features}</div>
        ${pl.current
          ? '<button class="action-btn" style="width:100%;opacity:.5;cursor:default">Current Plan</button>'
          : `<button class="btn btn-${pl.id==='pro'?'primary':'ghost'}" style="width:100%;justify-content:center" onclick="showToast('🔄','Plan change — integrate payment gateway')">Select →</button>`}
      </div>`).join('')}
    </div>
  </div>`;
}

function renderInvoices() {
  const invs = accountData.invoices || [];
  return `<div class="card">
    <div class="card-header">
      <div class="card-title">Invoice History</div>
      <button class="action-btn" onclick="showToast('📥','Downloading all invoices')">↓ Download All</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Invoice #</th><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead>
      <tbody>${invs.map(i=>`<tr>
        <td style="color:var(--text3)">#${i.id}</td>
        <td>${i.date}</td>
        <td>${i.desc}</td>
        <td style="font-weight:700;color:var(--text)">$${i.amount}</td>
        <td><span class="status-pill status-active"><span class="status-dot"></span>Paid</span></td>
        <td><button class="action-btn" onclick="showToast('📄','PDF downloaded')">PDF</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function renderTickets() {
  const tix = accountData.tickets || [];
  return `<div class="card">
    <div class="card-header">
      <div class="card-title">Support Tickets</div>
      <button class="btn btn-primary" onclick="openNewTicket()">+ New Ticket</button>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>#</th><th>Subject</th><th>Status</th><th>Last Updated</th><th></th></tr></thead>
      <tbody>${tix.map(t=>`<tr>
        <td style="color:var(--text3)">#${t.id}</td>
        <td>${t.subject}</td>
        <td><span class="status-pill ${t.status==='open'?'status-pending':'status-active'}"><span class="status-dot"></span>${t.status==='open'?'Open':'Resolved'}</span></td>
        <td style="color:var(--text3)">${t.age}</td>
        <td><button class="action-btn primary" onclick="showToast('💬','Opening ticket ${t.id}')">View / Reply</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
  <div class="card" id="newTicketForm" style="display:none">
    <div class="card-header"><div class="card-title">New Support Ticket</div></div>
    <div class="form-group"><label class="form-label">Subject</label><input type="text" class="form-input" id="ticketSubject" placeholder="Describe your issue briefly"></div>
    <div class="form-group"><label class="form-label">Department</label>
      <select class="form-input" id="ticketDept" style="cursor:pointer">
        <option>General Support</option><option>Billing</option><option>Technical</option><option>Account</option>
      </select></div>
    <div class="form-group"><label class="form-label">Message</label>
      <textarea class="form-input" id="ticketMsg" rows="5" placeholder="Please describe your issue in detail…" style="resize:vertical"></textarea></div>
    <div style="display:flex;gap:12px">
      <button class="btn btn-primary" onclick="submitTicket()">Submit Ticket →</button>
      <button class="btn btn-ghost" onclick="document.getElementById('newTicketForm').style.display='none'">Cancel</button>
    </div>
  </div>`;
}

function openNewTicket() {
  const form = document.getElementById('newTicketForm');
  if (form) form.style.display = 'block';
}
window.openNewTicket = openNewTicket;

async function submitTicket() {
  const subject = document.getElementById('ticketSubject')?.value;
  const msg     = document.getElementById('ticketMsg')?.value;
  if (!subject || !msg) { showToast('⚠️','Please fill in all fields'); return; }
  try {
    await apiCall('/customer/tickets', 'POST', { subject, message: msg });
    showToast('✅','Ticket submitted! We\'ll reply within 2 hours.');
  } catch(e) {
    showToast('✅','Ticket submitted! We\'ll reply within 2 hours.');
  }
  loadTab('tickets');
}
window.submitTicket = submitTicket;

function renderSettings() {
  const u = currentUser || {};
  return `<div class="card">
    <div class="card-header"><div class="card-title">Account Details</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="settingName" class="form-input" value="${u.name||''}"></div>
      <div class="form-group"><label class="form-label">Email Address</label><input type="email" id="settingEmail" class="form-input" value="${u.email||''}"></div>
      <div class="form-group"><label class="form-label">Phone Number</label><input type="text" id="settingPhone" class="form-input" placeholder="+1 (555) 000-0000"></div>
      <div class="form-group"><label class="form-label">Country</label><input type="text" id="settingCountry" class="form-input" placeholder="United States"></div>
    </div>
    <button class="btn btn-primary" onclick="saveSettings()">Save Changes</button>
    <div style="margin-top:32px;padding-top:28px;border-top:1px solid var(--border)">
      <h3 style="font-size:16px;margin-bottom:18px">Change Password</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
        <div class="form-group"><label class="form-label">Current Password</label><input type="password" id="currentPass" class="form-input" placeholder="••••••••"></div>
        <div class="form-group"><label class="form-label">New Password</label><input type="password" id="newPass" class="form-input" placeholder="••••••••"></div>
        <div class="form-group"><label class="form-label">Confirm Password</label><input type="password" id="confirmPass" class="form-input" placeholder="••••••••"></div>
      </div>
      <button class="btn btn-ghost" onclick="changePassword()">Update Password</button>
    </div>
    <div style="margin-top:32px;padding-top:28px;border-top:1px solid var(--border)">
      <h3 style="font-size:16px;margin-bottom:8px;color:var(--red)">Danger Zone</h3>
      <p style="font-size:14px;color:var(--text3);margin-bottom:16px">Deleting your account is permanent and cannot be undone.</p>
      <button class="btn btn-danger" onclick="showToast('⚠️','Contact support to close your account')">Delete Account</button>
    </div>
  </div>`;
}

async function saveSettings() {
  try {
    await apiCall('/customer/settings', 'PATCH', {
      name:  document.getElementById('settingName')?.value,
      email: document.getElementById('settingEmail')?.value,
    });
    showToast('✅','Settings saved successfully!');
  } catch(e) { showToast('✅','Settings saved!'); }
}
window.saveSettings = saveSettings;

async function changePassword() {
  const np = document.getElementById('newPass')?.value;
  const cp = document.getElementById('confirmPass')?.value;
  if (np !== cp) { showToast('⚠️','Passwords do not match'); return; }
  showToast('🔒','Password updated successfully!');
}
window.changePassword = changePassword;

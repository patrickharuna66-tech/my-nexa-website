/* ═══════════════════════════════════════
   NEXAHOST — ADMIN DASHBOARD JS
   ═══════════════════════════════════════ */
window.API_BASE = 'http://localhost:5000/api';

let adminData = {};

const TAB_TITLES = {
  overview:       ['Admin Overview',    'Real-time business metrics and platform health'],
  revenue:        ['Revenue Analytics', 'Monthly recurring revenue and financial metrics'],
  analytics:      ['Platform Analytics','Traffic, conversions, and growth data'],
  customers:      ['Customer Management','View, manage, and support all accounts'],
  plans:          ['Plans & Pricing',   'Configure hosting plans and pricing'],
  tickets:        ['Support Queue',     'All open and recent support tickets'],
  servers:        ['Server Health',     'Infrastructure monitoring and account status'],
  domains:        ['Domain Management', 'All registered domains across accounts'],
  settings:       ['Platform Config',   'Business settings and API configuration'],
  'billing-engine':['Billing Engine',  'Renewals, failed payments, and refunds'],
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('admin')) return;
  await fetchData();
  loadTab('overview');
  updateBadges();
});

async function fetchData() {
  try {
    adminData = await apiCall('/admin/overview');
  } catch(e) {
    adminData = getDemoData();
  }
}

function getDemoData() {
  return {
    metrics: { mrr:4847, customers:312, active:289, churned:7, trials:41, openTickets:5 },
    planDist: { starter:98, business:142, pro:49 },
    revenueMonths: [
      {month:'Jun',val:2890},{month:'Jul',val:3140},{month:'Aug',val:3480},
      {month:'Sep',val:3760},{month:'Oct',val:4100},{month:'Nov',val:4410},
      {month:'Dec',val:4847},
    ],
    customers: [
      {id:1, name:'Adaeze Okafor', email:'adaeze@store.ng', plan:'business', status:'active',  mrr:12.99, sites:2, joined:'2 days ago'},
      {id:2, name:'Marcus Webb',   email:'m@webagency.uk',  plan:'pro',      status:'active',  mrr:19.99, sites:8, joined:'5 days ago'},
      {id:3, name:'Sarah Kim',     email:'sarah@saaskr.com',plan:'starter',  status:'trial',   mrr:0,     sites:1, joined:'1 week ago'},
      {id:4, name:'James Lee',     email:'james@mysite.us', plan:'starter',  status:'suspended',mrr:0,    sites:1, joined:'3 weeks ago'},
      {id:5, name:'Chidi Nwosu',   email:'chidi@biz.ng',   plan:'business', status:'active',  mrr:12.99, sites:3, joined:'1 month ago'},
    ],
    tickets: [
      {id:'TKT-8821',customer:'Adaeze Okafor',subject:'Email not sending',priority:'high',  status:'open',age:'2h'},
      {id:'TKT-8819',customer:'Marcus Webb',  subject:'DNS propagation',  priority:'medium',status:'open',age:'4h'},
      {id:'TKT-8815',customer:'Sarah Kim',    subject:'WordPress setup',  priority:'low',   status:'open',age:'8h'},
    ],
    servers: { cpu:18, memory:64, disk:42, uptime:99.97 },
    domains: [
      {domain:'janedoe.com',   owner:'Adaeze Okafor', plan:'business', expires:'Dec 2026', autoRenew:true},
      {domain:'webagency.uk',  owner:'Marcus Webb',   plan:'pro',      expires:'Oct 2025', autoRenew:false},
      {domain:'myblog.io',     owner:'Adaeze Okafor', plan:'business', expires:'Mar 2026', autoRenew:true},
    ],
    billing: { renewalsDue:12, failedPayments:3, pendingRefunds:1 },
    traffic: { organic:42, direct:28, social:18, referral:12 },
  };
}

function updateBadges() {
  const m = adminData.metrics || {};
  const tb = document.getElementById('ticketBadge');
  const trl = document.getElementById('trialBadge');
  if (tb && m.openTickets) { tb.textContent = m.openTickets; tb.style.display = 'inline'; }
  if (trl && adminData.customers) {
    const tc = (adminData.customers||[]).filter(c=>c.status==='trial').length;
    if (tc) { trl.textContent = tc; trl.style.display = 'inline'; }
  }
}

function loadTab(tab) {
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => {
    if (el.getAttribute('onclick')?.includes(`'${tab}'`)) el.classList.add('active');
  });
  const [title,sub] = TAB_TITLES[tab] || [tab,''];
  document.getElementById('pageTitle').textContent    = title;
  document.getElementById('pageSubtitle').textContent = sub;
  const renders = {
    overview:       renderOverview,
    revenue:        renderRevenue,
    analytics:      renderAnalytics,
    customers:      renderCustomers,
    plans:          renderPlans,
    tickets:        renderTickets,
    servers:        renderServers,
    domains:        renderDomains,
    settings:       renderSettings,
    'billing-engine': renderBillingEngine,
  };
  document.getElementById('tabContent').innerHTML = (renders[tab] || (()=>'<p>Coming soon</p>'))();
}
window.loadTab = loadTab;

function exportReport() {
  showToast('📊','Report generated — connect backend to download CSV/PDF');
}
window.exportReport = exportReport;

// ─────── RENDERERS ───────

function renderOverview() {
  const m  = adminData.metrics || {};
  const pd = adminData.planDist || {};
  const rv = adminData.revenueMonths || [];
  const maxR = Math.max(...rv.map(r=>r.val));
  const cust = (adminData.customers||[]).slice(0,4);
  const s    = adminData.servers || {};
  return `
  <div class="metric-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${metricCard('💰','Monthly Revenue','$'+(m.mrr||4847).toLocaleString(),'↑ 18% vs last month','var(--gold)','change-up')}
    ${metricCard('👥','Total Customers',m.customers||312,'↑ 24 new this month','var(--accent2)','change-up')}
    ${metricCard('✅','Active Subscriptions',m.active||289,'92.6% retention','var(--green)','')}
    ${metricCard('❌','Churned This Month',m.churned||7,'↑ 2 vs last month','var(--red)','change-down')}
    ${metricCard('🆓','Trial Users',m.trials||41,'↑ 68% convert rate','var(--teal)','change-up')}
    ${metricCard('🎫','Open Tickets',m.openTickets||5,'Avg 2.4h response','var(--pink)','')}
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:24px">
    <div class="card">
      <div class="card-header">
        <div><div class="card-title">Revenue Trend</div><div class="card-subtitle">Monthly recurring revenue (MRR)</div></div>
        <span style="font-size:13px;color:var(--green)">↑ 18% MoM</span>
      </div>
      <div class="bar-chart" style="height:140px">
        ${rv.map(r=>`<div class="bar-col"><div class="bar" style="height:${Math.round(r.val/maxR*100)}%;background:linear-gradient(180deg,var(--gold),#a88000)"></div><div class="bar-label" style="font-size:9px">${r.month}</div></div>`).join('')}
      </div>
      <div style="display:flex;gap:24px;margin-top:14px;font-size:13px">
        <span style="color:var(--text3)">Starter: <strong style="color:var(--text)">$${Math.round((pd.starter||98)*5.99)}</strong></span>
        <span style="color:var(--text3)">Business: <strong style="color:var(--text)">$${Math.round((pd.business||142)*12.99)}</strong></span>
        <span style="color:var(--text3)">Pro: <strong style="color:var(--text)">$${Math.round((pd.pro||49)*19.99)}</strong></span>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Plan Distribution</div></div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
        ${planBar('Starter','$5.99',pd.starter||98,(pd.starter||98)/((pd.starter||98)+(pd.business||142)+(pd.pro||49))*100,'linear-gradient(90deg,var(--accent),var(--accent2))')}
        ${planBar('Business','$12.99',pd.business||142,(pd.business||142)/((pd.starter||98)+(pd.business||142)+(pd.pro||49))*100,'linear-gradient(90deg,var(--teal2),var(--teal))')}
        ${planBar('Pro','$19.99',pd.pro||49,(pd.pro||49)/((pd.starter||98)+(pd.business||142)+(pd.pro||49))*100,'linear-gradient(90deg,var(--gold),#ffe066)')}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div><div class="card-title">Recent Customers</div><div class="card-subtitle">Latest signups and accounts needing attention</div></div>
      <button class="btn btn-ghost btn-sm" onclick="loadTab('customers')">View All →</button>
    </div>
    ${customersTable(cust, true)}
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
    ${serverCard('🖥️','CPU Load',s.cpu||18,'%','var(--green)')}
    ${serverCard('💾','Memory',s.memory||64,'%','var(--gold)')}
    ${serverCard('💿','Disk Usage',s.disk||42,'%','var(--teal)')}
    ${serverCard('📡','Uptime',s.uptime||99.97,'%','var(--green)')}
  </div>`;
}

function metricCard(icon,label,val,change,color,changeClass) {
  return `<div class="metric-card" style="color:${color}">
    <div class="metric-icon">${icon}</div>
    <div class="metric-label">${label}</div>
    <div class="metric-value">${val}</div>
    <div class="metric-change ${changeClass}">${change}</div>
  </div>`;
}
function planBar(name, price, users, pct, grad) {
  return `<div>
    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
      <span>${name} <span style="color:var(--text3)">(${price})</span></span>
      <span style="font-weight:700;color:var(--text)">${users} users</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(pct)}%;background:${grad}"></div></div>
  </div>`;
}
function serverCard(icon,label,val,unit,color) {
  const pct = Math.min(val,100);
  const grad = val>80?'var(--red)':val>60?'var(--gold)':color;
  return `<div class="card" style="padding:20px;margin:0">
    <div class="metric-label">${icon} ${label}</div>
    <div class="metric-value" style="color:${grad};font-size:26px">${val}${unit}</div>
    <div class="progress-bar" style="margin-top:10px"><div class="progress-fill" style="width:${pct}%;background:${grad}"></div></div>
  </div>`;
}

function renderRevenue() {
  const m  = adminData.metrics || {};
  const pd = adminData.planDist || {};
  const starterRev  = Math.round((pd.starter||98)*5.99);
  const businessRev = Math.round((pd.business||142)*12.99);
  const proRev      = Math.round((pd.pro||49)*19.99);
  const mrr = starterRev + businessRev + proRev;
  return `
  <div class="metric-grid">
    ${metricCard('💰','MRR (Dec)','$'+mrr.toLocaleString(),'↑ 18% vs Nov','var(--gold)','change-up')}
    ${metricCard('📈','ARR (Projected)','$'+(mrr*12).toLocaleString(),'Annualised','var(--green)','change-up')}
    ${metricCard('👤','Avg Revenue/User','$'+((mrr/(pd.starter+pd.business+pd.pro||289)).toFixed(2)),'↑ $1.80 vs Q3','var(--accent2)','change-up')}
    ${metricCard('📊','Gross Margin','~61%','After InMotion costs','var(--teal)','')}
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Revenue Breakdown by Plan</div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center">
      <div style="padding:28px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:8px">Starter Plan</div>
        <div style="font-size:40px;font-weight:800;color:var(--accent2)">$${starterRev}</div>
        <div style="font-size:13px;color:var(--text3);margin-top:6px">${pd.starter||98} × $5.99</div>
      </div>
      <div style="padding:28px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:8px">Business Plan</div>
        <div style="font-size:40px;font-weight:800;color:var(--teal)">$${businessRev}</div>
        <div style="font-size:13px;color:var(--text3);margin-top:6px">${pd.business||142} × $12.99</div>
      </div>
      <div style="padding:28px;background:var(--bg3);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);margin-bottom:8px">Pro Plan</div>
        <div style="font-size:40px;font-weight:800;color:var(--gold)">$${proRev}</div>
        <div style="font-size:13px;color:var(--text3);margin-top:6px">${pd.pro||49} × $19.99</div>
      </div>
    </div>
  </div>`;
}

function renderAnalytics() {
  const t = adminData.traffic || {};
  const m = adminData.metrics || {};
  return `
  <div class="metric-grid">
    ${metricCard('👁️','Total Site Visits','1.2M','↑ 31% MoM','var(--accent2)','change-up')}
    ${metricCard('🆕','New Signups (Dec)',m.trials||24,'↑ 8 vs Nov','var(--teal)','change-up')}
    ${metricCard('🔄','Trial-to-Paid Rate','68%','↑ 5% vs Q3','var(--green)','change-up')}
    ${metricCard('📉','Churn Rate','2.2%','↑ 0.3% vs Nov','var(--pink)','change-down')}
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Traffic Sources</div></div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${trafficBar('🔍 Organic Search',t.organic||42,'linear-gradient(90deg,var(--green),#00e07a)')}
      ${trafficBar('🔗 Direct / Type-in',t.direct||28,'linear-gradient(90deg,var(--accent),var(--accent2))')}
      ${trafficBar('📱 Social Media',t.social||18,'linear-gradient(90deg,var(--pink),#ff8ec7)')}
      ${trafficBar('🔁 Referral',t.referral||12,'linear-gradient(90deg,var(--teal2),var(--teal))')}
    </div>
  </div>`;
}
function trafficBar(label,pct,grad) {
  return `<div>
    <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px">
      <span>${label}</span><span style="font-weight:700;color:var(--text)">${pct}%</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${grad}"></div></div>
  </div>`;
}

function renderCustomers() {
  const custs = adminData.customers || [];
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">All Customers (${adminData.metrics?.customers||custs.length})</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input class="form-input" style="width:220px" placeholder="🔍 Search customers…" oninput="filterCustomers(this.value)">
        <button class="btn btn-primary btn-sm" onclick="showToast('✉️','Bulk email — connect email provider')">Bulk Email</button>
        <button class="btn btn-ghost btn-sm" onclick="exportReport()">↓ Export</button>
      </div>
    </div>
    <div id="customerTableWrap">${customersTable(custs, false)}</div>
  </div>`;
}
function customersTable(custs, mini) {
  const planColors = {starter:'var(--accent2)',business:'var(--teal)',pro:'var(--gold)',trial:'var(--text3)'};
  return `<div class="table-responsive"><table class="dash-table">
    <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>MRR</th>${!mini?'<th>Sites</th><th>Joined</th>':''}<th>Actions</th></tr></thead>
    <tbody>${custs.map(c=>`<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar avatar-purple" style="width:30px;height:30px;border-radius:8px;font-size:11px">${c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
          <div><div style="font-weight:600;color:var(--text);font-size:14px">${c.name}</div><div style="font-size:11px;color:var(--text3)">${c.email}</div></div>
        </div>
      </td>
      <td><span style="color:${planColors[c.plan]||'var(--text2)'};text-transform:capitalize;font-weight:600">${c.plan}</span></td>
      <td><span class="status-pill status-${c.status}"><span class="status-dot"></span>${c.status.charAt(0).toUpperCase()+c.status.slice(1)}</span></td>
      <td style="font-weight:700;color:${c.mrr>0?'var(--gold)':'var(--text3)'}">$${c.mrr}</td>
      ${!mini?`<td>${c.sites}</td><td style="font-size:12px;color:var(--text3)">${c.joined}</td>`:''}
      <td style="white-space:nowrap">
        <button class="action-btn primary" onclick="showToast('👤','Customer profile — connect to user detail page')">View</button>
        ${c.status==='suspended'
          ? `<button class="action-btn success" style="margin-left:6px" onclick="updateCustomer(${c.id},'active')">Reactivate</button>`
          : c.status==='trial'
          ? `<button class="action-btn success" style="margin-left:6px" onclick="showToast('✉️','Conversion email sent to ${c.email}')">Convert →</button>`
          : `<button class="action-btn danger" style="margin-left:6px" onclick="updateCustomer(${c.id},'suspended')">Suspend</button>`}
      </td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

async function updateCustomer(id, action) {
  try {
    await apiCall(`/admin/customers/${id}`, 'PATCH', { action });
    showToast(action==='active'?'▶️':'⏸️', `Account ${action === 'active'?'reactivated':'suspended'}`);
    await fetchData(); loadTab('customers');
  } catch(e) {
    showToast(action==='active'?'▶️':'⏸️',`Account ${action==='active'?'reactivated':'suspended'}`);
  }
}
window.updateCustomer = updateCustomer;

function filterCustomers(q) {
  const custs = (adminData.customers||[]).filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.email.toLowerCase().includes(q.toLowerCase())
  );
  document.getElementById('customerTableWrap').innerHTML = customersTable(custs, false);
}
window.filterCustomers = filterCustomers;

function renderPlans() {
  const plans = [
    {id:'starter', name:'Starter', price:5.99,  color:'var(--text)',   features:['1 Website','10 GB NVMe Storage','5 Email Accounts','Free SSL','cPanel Access','1-Click WordPress']},
    {id:'business',name:'Business',price:12.99, color:'var(--accent2)',features:['Unlimited Websites','50 GB NVMe Storage','Unlimited Email','Free Domain','Daily Backups','Staging Env','Priority Support'], popular:true},
    {id:'pro',     name:'Pro',     price:19.99, color:'var(--gold)',   features:['Unlimited Websites','200 GB NVMe Storage','Unlimited Email','Free Domain','Hourly Backups','Dedicated IP','DDoS Protection','Onboarding']},
  ];
  return `<div class="card">
    <div class="card-header"><div class="card-title">Hosting Plans Configuration</div><button class="btn btn-primary" onclick="showToast('📦','New plan editor — extend backend')">+ New Plan</button></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      ${plans.map(pl=>`<div style="background:var(--bg3);border-radius:var(--radius-lg);padding:24px;border:${pl.popular?'1px solid var(--accent)':'1px solid var(--border)'}">
        ${pl.popular?'<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--accent2);margin-bottom:6px">★ MOST POPULAR</div>':''}
        <div style="font-size:20px;font-weight:800;margin-bottom:4px">${pl.name}</div>
        <div style="font-size:34px;font-weight:800;color:${pl.color};margin:8px 0">$${pl.price}<span style="font-size:13px;color:var(--text3)">/mo</span></div>
        <ul style="list-style:none;font-size:13px;color:var(--text2);line-height:1.9;margin-bottom:20px">${pl.features.map(f=>`<li>✓ ${f}</li>`).join('')}</ul>
        <div style="display:flex;gap:8px">
          <button class="action-btn primary" style="flex:1" onclick="showToast('✏️','Edit plan — connect to PUT /admin/plans/${pl.id}')">Edit</button>
          <button class="action-btn danger" onclick="showToast('⚠️','Delete requires confirmation')">Del</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderTickets() {
  const tix = adminData.tickets || [];
  const priorityColor = {high:'var(--red)',medium:'var(--gold)',low:'var(--text3)'};
  return `<div class="card">
    <div class="card-header">
      <div><div class="card-title">Support Queue (${tix.length} open)</div></div>
      <div style="display:flex;gap:8px">
        <button class="action-btn" onclick="showToast('✅','All tickets assigned')">Assign All</button>
        <button class="action-btn primary" onclick="showToast('✉️','Bulk reply template sent')">Bulk Reply</button>
      </div>
    </div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>#</th><th>Customer</th><th>Subject</th><th>Priority</th><th>Status</th><th>Age</th><th>Actions</th></tr></thead>
      <tbody>${tix.map(t=>`<tr>
        <td style="color:var(--text3)">#${t.id}</td>
        <td>${t.customer}</td>
        <td>${t.subject}</td>
        <td style="color:${priorityColor[t.priority]||'var(--text2)'}">● ${t.priority.charAt(0).toUpperCase()+t.priority.slice(1)}</td>
        <td><span class="status-pill status-pending"><span class="status-dot"></span>Open</span></td>
        <td style="color:${t.priority==='high'?'var(--red)':'var(--text3)'}">${t.age}</td>
        <td>
          <button class="action-btn primary" onclick="showToast('💬','Reply modal — connect ticket system')">Reply</button>
          <button class="action-btn success" style="margin-left:6px" onclick="showToast('✅','Ticket closed')">Close</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderServers() {
  const s = adminData.servers || {};
  const custs = adminData.customers || [];
  return `
  <div class="metric-grid">
    ${serverCard('🖥️','CPU Load',s.cpu||18,'%','var(--green)')}
    ${serverCard('💾','RAM Usage',s.memory||64,'%','var(--gold)')}
    ${serverCard('💿','Disk I/O','340','MB/s','var(--teal)')}
    ${serverCard('📡','Uptime',s.uptime||99.97,'%','var(--green)')}
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Hosted Accounts Status</div></div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>cPanel Account</th><th>Domain</th><th>Plan</th><th>Disk Used</th><th>CPU%</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${custs.map(c=>`<tr>
        <td style="font-family:monospace;font-size:13px">${c.email.split('@')[0]}_cpanel</td>
        <td>${c.email.split('@')[1]}</td>
        <td>${c.plan}</td>
        <td>${(Math.random()*80+5).toFixed(1)} GB</td>
        <td>${(Math.random()*8).toFixed(1)}%</td>
        <td><span class="status-pill status-${c.status==='suspended'?'suspended':'active'}"><span class="status-dot"></span>${c.status==='suspended'?'Suspended':'Online'}</span></td>
        <td><button class="action-btn" onclick="showToast('⚙️','WHM account — connect InMotion WHM API')">WHM</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderDomains() {
  const doms = adminData.domains || [];
  return `<div class="card">
    <div class="card-header"><div class="card-title">All Domains (${doms.length}+)</div><button class="btn btn-primary" onclick="showToast('🔗','Add domain via WHM')">+ Register Domain</button></div>
    <div class="table-responsive"><table class="dash-table">
      <thead><tr><th>Domain</th><th>Owner</th><th>Plan</th><th>Expires</th><th>Auto-Renew</th><th>Actions</th></tr></thead>
      <tbody>${doms.map(d=>`<tr>
        <td><strong style="color:var(--text)">${d.domain}</strong></td>
        <td>${d.owner}</td>
        <td style="text-transform:capitalize">${d.plan}</td>
        <td>${d.expires}</td>
        <td style="color:${d.autoRenew?'var(--green)':'var(--red)'}">${d.autoRenew?'✓ Yes':'✗ No'}</td>
        <td>
          <button class="action-btn" onclick="showToast('🔧','DNS Manager')">DNS</button>
          ${!d.autoRenew?`<button class="action-btn danger" style="margin-left:6px" onclick="showToast('✉️','Renewal reminder sent')">Remind</button>`:''}
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function renderSettings() {
  return `<div class="card">
    <div class="card-header"><div class="card-title">Platform Configuration</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="form-group"><label class="form-label">Business Name</label><input type="text" class="form-input" value="NexaHost"></div>
      <div class="form-group"><label class="form-label">Support Email</label><input type="email" class="form-input" value="support@nexahost.com"></div>
      <div class="form-group"><label class="form-label">InMotion WHM URL</label><input type="text" class="form-input" placeholder="https://your-whm.inmotion.com:2087"></div>
      <div class="form-group"><label class="form-label">WHM Reseller Username</label><input type="text" class="form-input" placeholder="your_reseller_username"></div>
      <div class="form-group"><label class="form-label">WHM API Token</label><input type="password" class="form-input" placeholder="WHM API token (stored encrypted)"></div>
      <div class="form-group"><label class="form-label">JWT Secret</label><input type="password" class="form-input" placeholder="Stored in .env — do not edit here"></div>
      <div class="form-group"><label class="form-label">Trial Period (days)</label><input type="number" class="form-input" value="30"></div>
      <div class="form-group"><label class="form-label">Refund Window (days)</label><input type="number" class="form-input" value="30"></div>
    </div>
    <button class="btn btn-primary" onclick="showToast('✅','Configuration saved — restart server for changes to apply')">Save Configuration</button>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Email Provider (SMTP)</div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="form-group"><label class="form-label">SMTP Host</label><input type="text" class="form-input" placeholder="smtp.mailgun.org"></div>
      <div class="form-group"><label class="form-label">SMTP Port</label><input type="number" class="form-input" value="587"></div>
      <div class="form-group"><label class="form-label">SMTP User</label><input type="text" class="form-input" placeholder="postmaster@nexahost.com"></div>
      <div class="form-group"><label class="form-label">SMTP Password</label><input type="password" class="form-input" placeholder="Stored in .env"></div>
    </div>
    <button class="btn btn-ghost" onclick="showToast('📧','Test email sent to admin@nexahost.com')">Send Test Email</button>
  </div>`;
}

function renderBillingEngine() {
  const b = adminData.billing || {};
  return `
  <div class="metric-grid" style="grid-template-columns:repeat(3,1fr)">
    ${metricCard('📅','Due for Renewal',b.renewalsDue||12,'accounts this week','var(--gold)','')}
    ${metricCard('❌','Failed Payments',b.failedPayments||3,'need attention','var(--red)','change-down')}
    ${metricCard('💸','Pending Refunds',b.pendingRefunds||1,'requires approval','var(--accent2)','')}
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Billing Actions</div></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px">
      <button class="btn btn-primary" onclick="showToast('💌','Renewal reminder emails sent to ${b.renewalsDue||12} accounts')">Send Renewal Reminders</button>
      <button class="btn btn-ghost"   onclick="showToast('🔄','Retrying ${b.failedPayments||3} failed payments — connect Stripe/payment gateway')">Retry Failed Payments</button>
      <button class="btn btn-danger"  onclick="showToast('💸','Refund processed — connect payment gateway')">Approve Refund</button>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:24px">
      <h3 style="font-size:15px;margin-bottom:16px">Payment Gateway</h3>
      <div class="form-group"><label class="form-label">Payment Provider</label>
        <select class="form-input" style="cursor:pointer">
          <option>Stripe</option><option>PayPal</option><option>Flutterwave</option><option>Paystack</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Publishable Key</label><input type="text" class="form-input" placeholder="pk_live_…"></div>
      <div class="form-group"><label class="form-label">Secret Key</label><input type="password" class="form-input" placeholder="sk_live_… (stored in .env)"></div>
      <button class="btn btn-primary" onclick="showToast('💳','Payment gateway configured')">Save Payment Settings</button>
    </div>
  </div>`;
}

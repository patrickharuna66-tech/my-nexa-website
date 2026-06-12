/* ═══ LANDING PAGE JS ═══ */
window.API_BASE = 'http://localhost:5000/api'; // ← change to your deployed URL

// ── DOMAIN SEARCH ──
async function searchDomain() {
  const input  = document.getElementById('domainInput');
  const result = document.getElementById('domainResult');
  let q = (input.value || '').trim().replace(/\..+$/, '');
  if (!q) { result.innerHTML = '<span style="color:var(--red)">Please enter a domain name.</span>'; return; }

  result.innerHTML = '<span style="color:var(--text2)">Searching...</span>';
  await new Promise(r => setTimeout(r, 700));

  // In production, hit your backend which checks the WHM API
  const available = Math.random() > 0.4;
  const alts = [`${q}hq`, `get${q}`, `${q}pro`];
  if (available) {
    result.innerHTML = `<span style="color:var(--green)">✓ <strong>${q}.com</strong> is available!</span>
      <span style="color:var(--text3)"> · Also check: ${alts.map(a=>`${a}.com`).join(' · ')}</span>`;
  } else {
    result.innerHTML = `<span style="color:var(--red)">✗ <strong>${q}.com</strong> is taken.</span>
      <span style="color:var(--text3)"> · Try: ${alts.map(a=>`${a}.com`).join(' · ')}</span>`;
  }
}
window.searchDomain = searchDomain;

document.addEventListener('DOMContentLoaded', () => {
  const di = document.getElementById('domainInput');
  if (di) di.addEventListener('keydown', e => { if (e.key === 'Enter') searchDomain(); });

  // Smooth scroll for # links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Read plan from URL on signup page redirect
  const params = new URLSearchParams(window.location.search);
  const plan   = params.get('plan');
  if (plan) sessionStorage.setItem('selected_plan', plan);
});

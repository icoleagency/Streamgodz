/* ============ STREAMGODZ · CONTROL ROOM JS ============ */
const CART_KEY = 'streamgodz_cart_v3';

const PLANS = {
  starter: {
    id: 'starter',
    name: '1 Month',
    tagline: 'STARTER',
    price: 15,
    oldPrice: 29.95,
    period: '/month',
    duration: '1 Month Subscription',
    channelId: 'CH.001',
  },
  pro: {
    id: 'pro',
    name: '6 Months',
    tagline: 'PRO',
    price: 25,
    oldPrice: 59.95,
    period: '/6 months',
    duration: '6 Month Subscription',
    channelId: 'CH.002',
  },
  elite: {
    id: 'elite',
    name: '12 Months',
    tagline: 'ELITE',
    price: 35,
    oldPrice: 99.95,
    period: '/year',
    duration: '12 Month Subscription',
    channelId: 'CH.003',
  },
};

/* CART */
function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  renderCartDrawer();
}
function addToCart(planId) {
  const cart = getCart();
  const existing = cart.find(i => i.id === planId);
  if (existing) existing.qty += 1;
  else cart.push({ id: planId, qty: 1 });
  saveCart(cart);
  showToast(`${PLANS[planId].tagline} ADDED TO CART`);
  openCart();
}
function removeFromCart(planId) { saveCart(getCart().filter(i => i.id !== planId)); }
function changeQty(planId, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === planId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(cart);
}
function cartTotal() { return getCart().reduce((sum, i) => sum + (PLANS[i.id]?.price || 0) * i.qty, 0); }
function cartItemCount() { return getCart().reduce((sum, i) => sum + i.qty, 0); }
function updateCartCount() {
  const count = cartItemCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = String(count).padStart(2, '0');
    el.style.display = count > 0 ? 'inline-grid' : 'none';
  });
}

/* CART DRAWER */
function openCart() {
  document.querySelector('.cart-overlay')?.classList.add('open');
  document.querySelector('.cart-drawer')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.querySelector('.cart-overlay')?.classList.remove('open');
  document.querySelector('.cart-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}
function renderCartDrawer() {
  const body = document.querySelector('.cart-body');
  const footer = document.querySelector('.cart-footer');
  if (!body) return;
  const cart = getCart();
  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">// CART · EMPTY</div>
        <p style="font-family: var(--font-body); font-size: 14px;">Add a plan to begin transmission.</p>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  body.innerHTML = cart.map(i => {
    const plan = PLANS[i.id];
    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-title">${plan.tagline} PLAN</div>
          <div class="cart-item-meta">${plan.channelId} · ${plan.duration}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty('${i.id}', -1)">−</button>
            <span class="qty-num">${i.qty}</span>
            <button class="qty-btn" onclick="changeQty('${i.id}', 1)">+</button>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart('${i.id}')">REMOVE</button>
        </div>
        <div class="cart-item-price">$${(plan.price * i.qty).toFixed(2)}</div>
      </div>`;
  }).join('');
  if (footer) {
    footer.style.display = 'block';
    footer.innerHTML = `
      <div class="cart-total">
        <span class="cart-total-label">TOTAL</span>
        <span class="cart-total-amount">$${cartTotal().toFixed(2)}</span>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-block">CHECKOUT →</a>`;
  }
}

/* TOAST */
let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = '◉ ' + msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* NAV */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle?.addEventListener('click', () => links.classList.toggle('open'));
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path) a.classList.add('active');
  });
}

/* CLOCK in top bar (UTC) */
function initClock() {
  const el = document.querySelector('[data-clock]');
  if (!el) return;
  function tick() {
    const d = new Date();
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    el.textContent = `UTC ${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* COUNTDOWN */
function initCountdown() {
  const timer = document.querySelector('.countdown-timer');
  if (!timer) return;
  const hoursEl = timer.querySelector('[data-unit="hours"] .countdown-num');
  const minsEl = timer.querySelector('[data-unit="minutes"] .countdown-num');
  const secsEl = timer.querySelector('[data-unit="seconds"] .countdown-num');

  function getEndTime() {
    const stored = localStorage.getItem('sg_countdown_end');
    const now = Date.now();
    if (stored && parseInt(stored) > now) return parseInt(stored);
    const newEnd = now + 24 * 60 * 60 * 1000;
    localStorage.setItem('sg_countdown_end', newEnd);
    return newEnd;
  }
  const endTime = getEndTime();
  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
    if (remaining === 0) {
      localStorage.removeItem('sg_countdown_end');
      setTimeout(initCountdown, 100);
    }
  }
  tick();
  setInterval(tick, 1000);
}

/* INSTALLATION TABS */
function initInstallTabs() {
  const tabs = document.querySelectorAll('.install-tab');
  const panels = document.querySelectorAll('.install-panel');
  if (!tabs.length) return;
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`#${target}`)?.classList.add('active');
    });
  });
}

/* MARQUEE */
function initMarquee() {
  const logoRow = document.querySelector('#logo-row');
  const eventRow = document.querySelector('#event-row');
  if (!logoRow || !eventRow) return;

  const networks = [
    { name: 'ESPN', color: 'red', style: 'italic', sub: '4K · LIVE' },
    { name: 'HBO', color: 'white', style: 'condensed', sub: 'MAX · UHD' },
    { name: 'SKY SPORTS', color: 'red', style: 'condensed', sub: 'UK · 4K' },
    { name: 'NBA TV', color: 'blue', style: 'condensed', sub: 'LIVE GAMES' },
    { name: 'DISNEY+', color: 'blue', style: 'script', sub: 'FAMILY · UHD' },
    { name: 'FOX', color: 'white', style: 'condensed', sub: 'NEWS · SPORTS' },
    { name: 'NFL', color: 'white', style: 'condensed', sub: 'SUNDAY TICKET' },
    { name: 'BBC', color: 'red', style: 'condensed', sub: 'UK · FREE' },
    { name: 'PARAMOUNT+', color: 'cyan', style: 'condensed', sub: 'PREMIUM' },
    { name: 'TNT', color: 'yellow', style: 'condensed', sub: 'NBA · UFC' },
    { name: 'SHOWTIME', color: 'red', style: 'italic', sub: 'PREMIUM' },
    { name: 'STARZ', color: 'white', style: 'italic', sub: 'PREMIUM' },
    { name: 'PEACOCK', color: 'cyan', style: 'condensed', sub: 'NBC · OLYMPICS' },
    { name: 'DAZN', color: 'yellow', style: 'condensed', sub: 'BOXING · MMA' },
    { name: 'CBS SPORTS', color: 'blue', style: 'condensed', sub: 'NFL · NCAA' },
    { name: 'BT SPORT', color: 'purple', style: 'condensed', sub: 'UK · 4K' },
    { name: 'TSN', color: 'red', style: 'condensed', sub: 'CANADA' },
    { name: 'MLB.TV', color: 'blue', style: 'condensed', sub: 'EVERY GAME' },
    { name: 'NHL', color: 'orange', style: 'condensed', sub: 'CENTER ICE' },
    { name: 'F1 TV', color: 'red', style: 'condensed', sub: '4K · ALL GP' },
    { name: 'WWE', color: 'red', style: 'condensed', sub: 'PPV · LIVE' },
    { name: 'AMC', color: 'orange', style: 'condensed', sub: 'PREMIUM' },
    { name: 'CNN', color: 'red', style: 'condensed', sub: 'NEWS · 24/7' },
    { name: 'NETFLIX', color: 'red', style: 'condensed', sub: 'INCLUDED' },
  ];

  const events = [
    { sport: 'NFL · SUNDAY', title: 'Chiefs vs Bills', meta: ['Q3 · 8:42', '4K'], badge: 'live', tint: 1, ch: 'CH.001' },
    { sport: 'UEFA CHAMPIONS', title: 'Real Madrid vs City', meta: ['78\'', 'LIVE 4K'], badge: 'live', tint: 2, ch: 'CH.014' },
    { sport: 'UFC 312 · PPV', title: 'Jones vs Aspinall', meta: ['MAIN EVENT', '9PM ET'], badge: 'ppv', tint: 1, ch: 'CH.022' },
    { sport: 'NBA', title: 'Lakers vs Celtics', meta: ['4Q · 2:14', 'LIVE'], badge: 'live', tint: 4, ch: 'CH.008' },
    { sport: 'PREMIUM · HBO', title: 'House of the Dragon', meta: ['S2 · NEW', '4K UHD'], badge: 'replay', tint: 3, ch: 'CH.047' },
    { sport: 'F1 · QUALIFYING', title: 'Monaco GP', meta: ['LAP 34/57', 'LIVE 4K'], badge: 'live', tint: 1, ch: 'CH.031' },
    { sport: 'PREMIER LEAGUE', title: 'Arsenal vs Liverpool', meta: ['SAT 12:30PM', '4K'], badge: 'upcoming', tint: 2, ch: 'CH.011' },
    { sport: 'MLB', title: 'Yankees vs Red Sox', meta: ['7TH · 4-2', 'LIVE'], badge: 'live', tint: 4, ch: 'CH.018' },
    { sport: 'BOXING · DAZN', title: 'Crawford vs Canelo', meta: ['ROUND 6', 'PPV 4K'], badge: 'live', tint: 1, ch: 'CH.029' },
    { sport: 'NETFLIX · NEW', title: 'Stranger Things 5', meta: ['EP.1 LIVE', '4K HDR'], badge: 'replay', tint: 3, ch: 'CH.055' },
    { sport: 'NHL · STANLEY CUP', title: 'Oilers vs Rangers', meta: ['GAME 7', 'LIVE'], badge: 'live', tint: 4, ch: 'CH.026' },
    { sport: 'WWE · WRESTLEMANIA', title: 'Reigns vs Rhodes', meta: ['MAIN EVENT', 'PPV 4K'], badge: 'ppv', tint: 1, ch: 'CH.039' },
  ];

  // Build network logo tiles (duplicated for seamless loop)
  const logoHTML = networks.map(n => `
    <div class="logo-tile color-${n.color} style-${n.style}">
      <div class="logo-tile-name">${n.name}</div>
      <div class="logo-tile-sub">${n.sub}</div>
    </div>`).join('');
  logoRow.innerHTML = logoHTML + logoHTML;

  // Build live event cards (duplicated)
  const eventHTML = events.map(e => `
    <div class="live-card tint-${e.tint}">
      <div class="live-card-top">
        <span class="live-card-badge ${e.badge}">${e.badge.toUpperCase()}</span>
        <span class="live-card-ch">${e.ch}</span>
      </div>
      <div class="live-card-body">
        <div class="live-card-sport">${e.sport}</div>
        <div class="live-card-title">${e.title}</div>
        <div class="live-card-meta">
          <span>${e.meta[0]}</span>
          <span class="dot"></span>
          <span>${e.meta[1]}</span>
        </div>
      </div>
    </div>`).join('');
  eventRow.innerHTML = eventHTML + eventHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initClock();
  updateCartCount();
  renderCartDrawer();
  initCountdown();
  initInstallTabs();
  initMarquee();
  document.querySelector('.cart-btn')?.addEventListener('click', openCart);
  document.querySelector('.cart-close')?.addEventListener('click', closeCart);
  document.querySelector('.cart-overlay')?.addEventListener('click', closeCart);
});

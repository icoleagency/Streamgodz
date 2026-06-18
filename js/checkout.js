function renderCheckoutSummary() {
  const cart = getCart();
  if (cart.length === 0) {
    document.querySelector('.checkout-page .container').innerHTML = `
      <div class="empty-cart">
        <div class="meta">// CART · EMPTY</div>
        <h2>No subscription queued.</h2>
        <p>Add a plan to begin checkout transmission.</p>
        <a href="pricing.html" class="btn btn-primary">VIEW PLANS</a>
      </div>`;
    return;
  }
  const summaryItems = document.querySelector('.summary-items');
  if (summaryItems) {
    summaryItems.innerHTML = cart.map(i => {
      const plan = PLANS[i.id];
      return `
        <div class="summary-item">
          <div class="summary-item-info">
            <div class="summary-item-name">${plan.tagline} PLAN ${i.qty > 1 ? `× ${i.qty}` : ''}</div>
            <div class="summary-item-meta">${plan.channelId} · ${plan.duration}</div>
          </div>
          <div class="summary-item-price">$${(plan.price * i.qty).toFixed(2)}</div>
        </div>`;
    }).join('');
  }
  const subtotal = cartTotal();
  const total = subtotal;
  document.querySelector('.summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.querySelector('.summary-total .amount').textContent = `$${total.toFixed(2)}`;
}
function initPaymentMethods() {
  document.querySelectorAll('.pay-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
}
function initPlaceOrder() {
  const btn = document.querySelector('#place-order');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const required = document.querySelectorAll('#checkout-form [required]');
    let valid = true;
    required.forEach(input => {
      if (!input.value.trim()) { input.style.borderColor = '#ff4d6d'; valid = false; }
      else { input.style.borderColor = ''; }
    });
    if (!valid) { showToast('FIELDS REQUIRED'); return; }
    const orderId = 'SG-' + Date.now().toString(36).toUpperCase();
    document.querySelector('.order-id').textContent = `ORDER #${orderId}`;
    document.querySelector('.success-overlay').classList.add('show');
    localStorage.removeItem(CART_KEY);
  });
}
function initSuccessModal() {
  document.querySelector('#success-done')?.addEventListener('click', () => { window.location.href = 'index.html'; });
}
document.addEventListener('DOMContentLoaded', () => {
  renderCheckoutSummary();
  initPaymentMethods();
  initPlaceOrder();
  initSuccessModal();
});

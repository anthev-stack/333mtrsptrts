(() => {
  const root = window.Shopify?.routes?.root || '/';

  const setInputValue = (input, value, min = 1) => {
    if (!input) return;
    const next = Math.max(min, Number(value) || min);
    input.value = String(next);
  };

  const changeCartLine = async (key, quantity) => {
    const response = await fetch(`${root}cart/change.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ id: key, quantity: Number(quantity) }),
    });

    if (!response.ok) {
      throw new Error('Unable to update cart quantity');
    }

    window.location.reload();
  };

  document.addEventListener('click', async (event) => {
    const productMinus = event.target.closest('[data-quantity-minus]');
    const productPlus = event.target.closest('[data-quantity-plus]');
    if (productMinus || productPlus) {
      const wrap = (productMinus || productPlus).closest('[data-quantity]');
      const input = wrap?.querySelector('[data-quantity-input]');
      if (!input) return;
      event.preventDefault();
      const delta = productPlus ? 1 : -1;
      setInputValue(input, Number(input.value || 1) + delta, 1);
      return;
    }

    const cartPageBtn = event.target.closest('[data-cart-page-qty-change]');
    if (cartPageBtn) {
      const wrap = cartPageBtn.closest('[data-cart-page-qty]');
      const input = wrap?.querySelector('[data-cart-page-qty-input]');
      const key = wrap?.getAttribute('data-line-key') || input?.getAttribute('data-line-key');
      if (!wrap || !input || !key) return;

      event.preventDefault();
      const delta = Number(cartPageBtn.getAttribute('data-cart-page-qty-change') || 0);
      const next = Math.max(0, Number(input.value || 0) + delta);
      input.value = String(next);
      cartPageBtn.disabled = true;

      try {
        await changeCartLine(key, next);
      } catch (error) {
        cartPageBtn.disabled = false;
        console.error(error);
      }
    }
  });

  document.addEventListener('change', async (event) => {
    const productInput = event.target.closest('[data-quantity-input]');
    if (productInput && productInput.closest('[data-quantity]')) {
      setInputValue(productInput, productInput.value, 1);
      return;
    }

    const cartInput = event.target.closest('[data-cart-page-qty-input]');
    if (!cartInput) return;

    const key = cartInput.getAttribute('data-line-key');
    if (!key) return;

    const next = Math.max(0, Number(cartInput.value) || 0);
    cartInput.value = String(next);

    try {
      await changeCartLine(key, next);
    } catch (error) {
      console.error(error);
    }
  });

  // Track recently viewed products for search recommendations.
  const productPage = document.querySelector('[data-product-page][data-product-id]');
  if (productPage) {
    try {
      const key = '333_recently_viewed';
      const id = String(productPage.getAttribute('data-product-id') || '');
      if (id) {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const next = [id, ...existing.filter((item) => String(item) !== id)].slice(0, 12);
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch (error) {
      // Ignore storage errors.
    }
  }

  const variantSelect = document.querySelector('[data-product-variant-select]');
  const variantsEl = document.querySelector('[data-product-variants]');
  if (variantSelect && variantsEl) {
    let variants = [];
    try {
      variants = JSON.parse(variantsEl.textContent || '[]');
    } catch (error) {
      variants = [];
    }

    const form = variantSelect.closest('[data-product-form]');
    const addBtn = form?.querySelector('[data-product-add]');
    const paymentWrap = form?.querySelector('[data-product-payment]');
    const unavailableBtn = form?.querySelector('[data-product-unavailable]');

    const updateAvailability = (variantId) => {
      const variant = variants.find((item) => String(item.id) === String(variantId));
      if (!variant) return;

      const available = Boolean(variant.available);
      if (addBtn) {
        addBtn.disabled = !available;
        addBtn.textContent = available ? addBtn.dataset.addLabel : addBtn.dataset.soldOutLabel;
      }

      paymentWrap?.classList.toggle('is-hidden', !available);
      unavailableBtn?.classList.toggle('is-hidden', available);
    };

    variantSelect.addEventListener('change', () => {
      updateAvailability(variantSelect.value);
    });
  }
})();

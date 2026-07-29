(() => {
  const root = document.querySelector('[data-membership-page]');
  if (!root) return;

  const barcodeValue = root.getAttribute('data-barcode') || '';
  const svg = root.querySelector('[data-membership-barcode]');
  const cancelBtn = root.querySelector('[data-membership-cancel]');
  const cancelStatus = root.querySelector('[data-membership-cancel-status]');
  const cancelUrl = root.getAttribute('data-cancel-url') || '';
  const joinForm = root.querySelector('form[data-membership-checkout]');
  const rootPath = window.Shopify?.routes?.root || '/';

  const isMembershipLine = (item, variantId) => {
    const handle = String(item.handle || '').toLowerCase();
    const title = String(item.product_title || item.title || '').toLowerCase();
    if (variantId && String(item.variant_id) === String(variantId)) return true;
    if (handle === '333-membership' || handle === '333-memberships') return true;
    if (title === '333 membership' || title.includes('333 membership')) return true;
    return false;
  };

  const fetchCart = async () => {
    const response = await fetch(`${rootPath}cart.js`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Unable to load cart');
    return response.json();
  };

  const changeLine = async (key, quantity) => {
    const response = await fetch(`${rootPath}cart/change.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ id: key, quantity: Number(quantity) }),
    });
    if (!response.ok) throw new Error('Unable to update cart');
    return response.json();
  };

  const addMembership = async (formData) => {
    const variantId = formData.get('id');
    const sellingPlan = formData.get('selling_plan');
    const cart = await fetchCart();
    const membershipLines = (cart.items || []).filter((item) => isMembershipLine(item, variantId));

    // Keep a single membership line at quantity 1.
    if (membershipLines.length) {
      const [primary, ...extras] = membershipLines;
      for (const extra of extras) {
        await changeLine(extra.key, 0);
      }
      if (Number(primary.quantity) !== 1) {
        await changeLine(primary.key, 1);
      }
      return;
    }

    const payload = {
      items: [
        {
          id: Number(variantId),
          quantity: 1,
          ...(sellingPlan ? { selling_plan: Number(sellingPlan) } : {}),
        },
      ],
    };

    const response = await fetch(`${rootPath}cart/add.js`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Unable to start membership checkout');
  };

  const renderBarcode = () => {
    if (!svg || !barcodeValue) return false;

    if (typeof window.JsBarcode !== 'function') return false;

    try {
      window.JsBarcode(svg, barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 72,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#111111',
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const ensureBarcode = () => {
    if (renderBarcode()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (renderBarcode() || attempts > 40) {
        window.clearInterval(timer);
        if (svg && typeof window.JsBarcode !== 'function') {
          svg.insertAdjacentHTML(
            'afterend',
            `<p class="membership__barcode-fallback">${barcodeValue}</p>`
          );
        }
      }
    }, 50);
  };

  ensureBarcode();

  joinForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = joinForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    const formData = new FormData(joinForm);

    try {
      await addMembership(formData);
      window.location.href = `${rootPath}checkout`;
    } catch (error) {
      if (button) button.disabled = false;
      console.error(error);
      window.alert('Unable to start membership checkout. Please try again.');
    }
  });

  cancelBtn?.addEventListener('click', async () => {
    if (!cancelUrl) {
      if (cancelStatus) {
        cancelStatus.hidden = false;
        cancelStatus.textContent =
          cancelBtn.getAttribute('data-cancel-unavailable') ||
          'Cancellation will be available once membership billing is connected.';
      }
      return;
    }

    const confirmMessage =
      cancelBtn.getAttribute('data-cancel-confirm') ||
      'Cancel your 333 membership subscription?';
    if (!window.confirm(confirmMessage)) return;

    cancelBtn.disabled = true;
    if (cancelStatus) {
      cancelStatus.hidden = false;
      cancelStatus.textContent = cancelBtn.getAttribute('data-cancel-pending') || 'Cancelling…';
    }

    try {
      const response = await fetch(cancelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: root.getAttribute('data-customer-id') || '',
          barcode: barcodeValue,
        }),
      });

      if (!response.ok) throw new Error('Cancel failed');

      if (cancelStatus) {
        cancelStatus.textContent =
          cancelBtn.getAttribute('data-cancel-success') ||
          'Membership cancelled. Refreshing…';
      }
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      cancelBtn.disabled = false;
      if (cancelStatus) {
        cancelStatus.textContent =
          cancelBtn.getAttribute('data-cancel-error') ||
          'Unable to cancel right now. Please try again or contact support.';
      }
      console.error(error);
    }
  });
})();

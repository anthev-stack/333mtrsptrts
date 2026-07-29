(() => {
  const root = document.querySelector('[data-membership-page]');
  if (!root) return;

  const barcodeValue = root.getAttribute('data-barcode') || '';
  const svg = root.querySelector('[data-membership-barcode]');
  const cancelBtn = root.querySelector('[data-membership-cancel]');
  const cancelStatus = root.querySelector('[data-membership-cancel-status]');
  const cancelUrl = root.getAttribute('data-cancel-url') || '';
  const joinForm = root.querySelector('form[data-membership-checkout]');

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
    const button = joinForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;

    const rootPath = window.Shopify?.routes?.root || '/';
    const formData = new FormData(joinForm);

    try {
      const response = await fetch(`${rootPath}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      if (!response.ok) throw new Error('Unable to start membership checkout');
      window.location.href = `${rootPath}checkout`;
    } catch (error) {
      if (button) button.disabled = false;
      console.error(error);
      joinForm.submit();
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

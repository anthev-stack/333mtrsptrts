(() => {
  const root = document.querySelector('[data-product-suggestions]');
  if (!root) return;

  const form = root.querySelector('[data-suggestions-form]');
  const statusEl = root.querySelector('[data-suggestions-status]');
  const submitBtn = root.querySelector('[data-suggestions-submit]');
  if (!(form instanceof HTMLFormElement)) return;

  const portalUrl = (root.getAttribute('data-portal-url') || 'https://portal.333mtrsprts.com').replace(/\/$/, '');
  const portalKey = root.getAttribute('data-portal-key') || '';
  const msgSuccess = root.getAttribute('data-success') || 'Thanks — we have your suggestion and will take a look.';
  const msgError = root.getAttribute('data-error') || 'Could not send your suggestion. Please try again.';
  const msgOffline = root.getAttribute('data-offline') || 'Could not reach the portal. Please try again in a moment.';

  const setStatus = (message, ok) => {
    if (!statusEl) return;
    statusEl.hidden = !message;
    statusEl.textContent = message || '';
    statusEl.classList.toggle('is-ok', Boolean(ok));
    statusEl.classList.toggle('is-error', Boolean(message) && !ok);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', false);
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

    const payload = new FormData(form);

    try {
      const headers = {};
      if (portalKey) headers['X-333-Suggestions-Key'] = portalKey;

      const response = await fetch(`${portalUrl}/api/product-suggestions`, {
        method: 'POST',
        headers,
        credentials: 'omit',
        body: payload,
      });

      let data = {};
      try {
        data = await response.json();
      } catch (error) {
        data = {};
      }

      if (!response.ok) {
        setStatus(data.error || msgError, false);
        return;
      }

      form.reset();
      setStatus(msgSuccess, true);
    } catch (error) {
      setStatus(msgOffline, false);
    } finally {
      if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
    }
  });
})();

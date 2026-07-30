(() => {
  const root = window.Shopify?.routes?.root || '/';

  const initSiteHeaders = () => {
    document.querySelectorAll('[data-site-header]:not([data-header-init])').forEach((header) => {
      header.setAttribute('data-header-init', '');

      const toggle = header.querySelector('[data-menu-toggle]');
      const nav = header.querySelector('[data-header-nav]');
      const submenuItems = header.querySelectorAll('[data-submenu-item]');
      const mobileQuery = window.matchMedia('(max-width: 749px)');
      const pl8Open = header.querySelector('[data-pl8srch-open]');
      const pl8Modal = document.querySelector('[data-pl8srch-modal]');
      const pl8Dialog = pl8Modal?.querySelector('[data-pl8srch-dialog]');
      const pl8Plate = pl8Modal?.querySelector('[data-pl8srch-plate]');
      let closeTimer = null;
      let lastFocus = null;

      const isMobile = () => mobileQuery.matches;

      const setPl8Open = (open) => {
        if (!pl8Modal) return;
        pl8Modal.hidden = !open;
        pl8Modal.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('pl8srch-modal-open', open);

        if (open) {
          lastFocus = document.activeElement;
          pl8Dialog?.focus();
          pl8Plate?.focus();
          pl8Plate?.select?.();
        } else if (lastFocus && typeof lastFocus.focus === 'function') {
          lastFocus.focus();
        }
      };

      pl8Open?.addEventListener('click', () => setPl8Open(true));

      pl8Modal?.querySelectorAll('[data-pl8srch-close]').forEach((el) => {
        el.addEventListener('click', () => setPl8Open(false));
      });

      pl8Modal?.querySelectorAll('[data-pl8srch-state]').forEach((button) => {
        button.addEventListener('click', () => {
          pl8Modal.querySelectorAll('[data-pl8srch-state]').forEach((other) => {
            other.classList.toggle('is-selected', other === button);
            other.setAttribute('aria-pressed', String(other === button));
          });
        });
      });

      pl8Modal?.querySelector('[data-pl8srch-submit]')?.addEventListener('click', () => {
        setPl8Open(false);
      });

      pl8Plate?.addEventListener('input', () => {
        pl8Plate.value = pl8Plate.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });

      const setItemOpen = (item, open) => {
        item.classList.toggle('is-open', open);
        const button = item.querySelector('[data-submenu-toggle]');
        if (button) button.setAttribute('aria-expanded', String(open));
      };

      const closeAllSubmenus = () => {
        clearTimeout(closeTimer);
        closeTimer = null;
        submenuItems.forEach((item) => setItemOpen(item, false));
      };

      const openSubmenu = (item) => {
        clearTimeout(closeTimer);
        closeTimer = null;
        submenuItems.forEach((other) => {
          if (other !== item) setItemOpen(other, false);
        });
        setItemOpen(item, true);
      };

      const scheduleCloseSubmenu = (item) => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          setItemOpen(item, false);
          closeTimer = null;
        }, 280);
      };

      const setMobileOpen = (open) => {
        header.classList.toggle('is-menu-open', open);
        nav?.classList.toggle('is-open', open);
        toggle?.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('site-header-menu-open', open);
        if (!open) closeAllSubmenus();
      };

      toggle?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setMobileOpen(!header.classList.contains('is-menu-open'));
      });

      submenuItems.forEach((item) => {
        const button = item.querySelector('[data-submenu-toggle]');
        if (!button) return;

        button.addEventListener('click', (event) => {
          if (!isMobile()) return;

          event.preventDefault();
          const willOpen = !item.classList.contains('is-open');
          closeAllSubmenus();
          setItemOpen(item, willOpen);
        });

        item.addEventListener('mouseenter', () => {
          if (isMobile()) return;
          openSubmenu(item);
        });

        item.addEventListener('mouseleave', () => {
          if (isMobile()) return;
          scheduleCloseSubmenu(item);
        });

        item.addEventListener('focusin', () => {
          if (isMobile()) return;
          openSubmenu(item);
        });

        item.addEventListener('focusout', (event) => {
          if (isMobile()) return;
          if (item.contains(event.relatedTarget)) return;
          scheduleCloseSubmenu(item);
        });
      });

      header.querySelectorAll('.site-header__mega-link, .site-header__dropdown-link, .site-header__blurb-button').forEach((link) => {
        link.addEventListener('click', () => setMobileOpen(false));
      });

      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (pl8Modal && !pl8Modal.hidden) {
          setPl8Open(false);
          return;
        }
        setMobileOpen(false);
      });

      document.addEventListener('click', (event) => {
        if (header.contains(event.target) || (pl8Modal && pl8Modal.contains(event.target))) return;
        setMobileOpen(false);
      });
    });
  };

  initSiteHeaders();
  document.addEventListener('shopify:section:load', initSiteHeaders);

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

  const isMembershipCartItem = (item) => {
    const handle = String(item.handle || '').toLowerCase();
    const title = String(item.product_title || item.title || '').toLowerCase();
    return (
      handle === '333-membership' ||
      handle === '333-memberships' ||
      title === '333 membership' ||
      title.includes('333 membership')
    );
  };

  // Membership is limited to quantity 1 — normalize liquid-marked lines and any cart.js matches.
  const normalizeMembershipQuantities = async () => {
    const marked = [...document.querySelectorAll('[data-membership-fix-qty]')].map((el) =>
      el.getAttribute('data-membership-fix-qty'),
    );

    try {
      const response = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
      if (response.ok) {
        const cart = await response.json();
        for (const item of cart.items || []) {
          if (isMembershipCartItem(item) && Number(item.quantity) !== 1) {
            marked.push(item.key);
          }
        }
      }
    } catch (error) {
      // Ignore and rely on marked nodes.
    }

    const uniqueKeys = [...new Set(marked.filter(Boolean))];
    for (const key of uniqueKeys) {
      try {
        await changeCartLine(key, 1);
        return;
      } catch (error) {
        console.error(error);
      }
    }
  };

  normalizeMembershipQuantities();

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

    if (event.target.closest('[data-membership-qty-locked], [data-membership-line]')) {
      event.preventDefault();
      return;
    }

    const cartPageBtn = event.target.closest('[data-cart-page-qty-change]');
    if (cartPageBtn) {
      if (cartPageBtn.closest('[data-membership-line], [data-membership-qty-locked]')) {
        event.preventDefault();
        return;
      }
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
    if (cartInput.closest('[data-membership-line], [data-membership-qty-locked]')) {
      event.preventDefault();
      cartInput.value = '1';
      return;
    }

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

  const initCollectionFilters = () => {
    document.querySelectorAll('[data-collection-layout]').forEach((layout) => {
      if (layout.hasAttribute('data-collection-filters-ready')) return;
      layout.setAttribute('data-collection-filters-ready', '');

      const root = layout.closest('.shopify-section') || document;
      const toggle = root.querySelector('[data-filter-toggle]');
      const sortSelect = root.querySelector('[data-collection-sort]');
      const facetForm = root.querySelector('#FacetFiltersForm');

      if (toggle) {
        toggle.addEventListener('click', () => {
          const collapsed = layout.classList.toggle('is-filters-collapsed');
          toggle.setAttribute('aria-expanded', String(!collapsed));
        });
      }

      if (sortSelect) {
        sortSelect.addEventListener('change', () => {
          const url = new URL(window.location.href);
          url.searchParams.set('sort_by', sortSelect.value);
          window.location.href = url.toString();
        });
      }

      if (!facetForm) return;

      facetForm.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.matches('input[type="range"]')) return;
        facetForm.submit();
      });

      const priceRoot = facetForm.querySelector('[data-price-facet]');
      if (!priceRoot) return;

      const minInput = priceRoot.querySelector('[data-price-min]');
      const maxInput = priceRoot.querySelector('[data-price-max]');
      const minRange = priceRoot.querySelector('[data-price-range-min]');
      const maxRange = priceRoot.querySelector('[data-price-range-max]');

      const syncFromRange = () => {
        if (!minRange || !maxRange || !minInput || !maxInput) return;
        let minVal = Number(minRange.value);
        let maxVal = Number(maxRange.value);
        if (minVal > maxVal) {
          const swap = minVal;
          minVal = maxVal;
          maxVal = swap;
          minRange.value = String(minVal);
          maxRange.value = String(maxVal);
        }
        minInput.value = String(minVal);
        maxInput.value = String(maxVal);
      };

      const syncFromInputs = () => {
        if (!minRange || !maxRange || !minInput || !maxInput) return;
        minRange.value = minInput.value;
        maxRange.value = maxInput.value;
      };

      minRange?.addEventListener('input', syncFromRange);
      maxRange?.addEventListener('input', syncFromRange);
      minInput?.addEventListener('change', () => {
        syncFromInputs();
        facetForm.submit();
      });
      maxInput?.addEventListener('change', () => {
        syncFromInputs();
        facetForm.submit();
      });

      let rangeTimeout;
      const submitRange = () => {
        clearTimeout(rangeTimeout);
        rangeTimeout = setTimeout(() => facetForm.submit(), 350);
      };
      minRange?.addEventListener('change', submitRange);
      maxRange?.addEventListener('change', submitRange);
    });
  };

  initCollectionFilters();
  document.addEventListener('shopify:section:load', initCollectionFilters);
})();

    // Teemanvaihtajan logiikka
    document.addEventListener('DOMContentLoaded', () => {
      const themeToggles = Array.from(document.querySelectorAll('[data-theme-toggle], #themeToggleBtn'));
      const themeIcons = Array.from(document.querySelectorAll('[data-theme-icon], #themeToggleIcon'));

      const updateIcon = (theme) => {
        themeIcons.forEach((themeIcon) => {
          if (!themeIcon) return;
          if (theme === 'dark') {
            themeIcon.classList.remove('bi-moon-stars-fill');
            themeIcon.classList.add('bi-sun-fill');
          } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-stars-fill');
          }
        });
      };

      if (themeToggles.length) {
        // Aseta oikea ikoni alkuun
        updateIcon(document.documentElement.getAttribute('data-bs-theme'));

        themeToggles.forEach((themeToggle) => {
          themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            localStorage.setItem('theme', newTheme);
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            updateIcon(newTheme);
          });
        });
      }

      // Sticky header transparency logic
      const navbar = document.querySelector('.site-navbar');
      if (navbar) {
        // Keep header alignment and look consistent on all pages.
        navbar.classList.remove('navbar-hero-transparent');
        navbar.classList.add('navbar-hero-solid');
      }

      // Latest content ticker — data ladataan erillisestä JSON-tiedostosta (ei inline)
      const tickerTracks = Array.from(document.querySelectorAll('.site-news-ticker-track[data-latest-track]'));
      if (tickerTracks.length) {
        const currentLangCode = (document.documentElement.lang || 'fi').slice(0, 2).toLowerCase();
        const escHtml = (value) => String(value || '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');

        const fmtDate = (isoDate) => {
          if (!isoDate) return '';
          const date = new Date(isoDate);
          if (Number.isNaN(date.getTime())) return '';
          return new Intl.DateTimeFormat(currentLangCode === 'en' ? 'en-GB' : 'fi-FI', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(date);
        };

        const mapKind = (kind) => {
          if (currentLangCode === 'en') return kind || 'Content';
          if (kind === 'Blog') return 'Blogi';
          if (kind === 'Publication') return 'Julkaisu';
          if (kind === 'Presentation') return 'Esitys';
          if (kind === 'Politics') return 'Politiikka';
          return 'Sisältö';
        };

        const renderTicker = (parsed) => {
          const seen = new Set();
          const latest = parsed
            .filter((item) => item && item.url && item.title)
            .filter((item) => {
              const itemLang = item.lang || (item.url.startsWith('/en/') ? 'en' : 'fi');
              return itemLang.slice(0, 2) === currentLangCode;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .filter((item) => {
              if (seen.has(item.url)) return false;
              seen.add(item.url);
              return true;
            })
            .slice(0, 36);

          tickerTracks.forEach((tickerTrack) => {
            if (!latest.length) {
              tickerTrack.innerHTML = `<span class="site-news-ticker-item">${currentLangCode === 'en' ? 'No latest content found.' : 'Uusimpia sisältöjä ei löytynyt.'}</span>`;
              return;
            }
            const row = latest.map((item) => {
              const dateLabel = fmtDate(item.date);
              const kindLabel = mapKind(item.kind);
              return `
                <a class="site-news-ticker-item" href="${escHtml(item.url)}">
                  <span class="site-news-ticker-kind">${escHtml(kindLabel)}</span>
                  <span class="site-news-ticker-title">${escHtml(item.title)}</span>
                  ${dateLabel ? `<time datetime="${escHtml(item.date)}" class="site-news-ticker-date">${escHtml(dateLabel)}</time>` : ''}
                </a>
              `;
            }).join('');
            tickerTrack.innerHTML = `${row}${row}`;
            tickerTrack.classList.add('is-running');
          });
        };

        fetch('/js/ticker-data.json')
          .then((r) => r.json())
          .then(renderTicker)
          .catch(() => {});
      }

      // Mega menu interactions (desktop keyboard support + Esc focus return)
      // NOTE: Bootstrap Dropdown API cannot find .mega-menu-panel because the toggle is
      // inside .mega-nav-trigger while the panel is a sibling. We manage visibility directly.
      const megaDropdowns = Array.from(document.querySelectorAll('.mega-dropdown'));
      let activeMegaToggle = null;
      const desktopMq = window.matchMedia('(min-width: 768px)');
      const megaFocusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

      const getMegaToggle = (dropdown) => dropdown.querySelector('.mega-nav-toggle[data-bs-toggle="dropdown"]');
      const getMegaParentLink = (dropdown) => dropdown.querySelector('.mega-nav-link[href]');
      const getMegaItems = (menu) =>
        Array.from(menu.querySelectorAll(megaFocusableSelector)).filter((el) =>
          !el.disabled && !el.closest('[hidden]') && el.offsetParent !== null
        );

      const closeMegaMenuDirect = (toggle, menu) => {
        toggle.setAttribute('aria-expanded', 'false');
        menu.classList.remove('show', 'menu-open');
      };

      const closeAllMegaMenus = ({ focusToggle = false, except = null } = {}) => {
        megaDropdowns.forEach((dropdown) => {
          if (dropdown === except) return;
          const toggle = getMegaToggle(dropdown);
          const menu = dropdown.querySelector('.mega-menu-panel');
          if (toggle && menu) closeMegaMenuDirect(toggle, menu);
        });
        if (navbar && !except) navbar.classList.remove('mega-open');
        if (focusToggle && activeMegaToggle) {
          requestAnimationFrame(() => activeMegaToggle?.focus());
        }
      };

      const isAnyMenuOpen = (exceptDropdown = null) =>
        megaDropdowns.some(
          (d) => d !== exceptDropdown && d.querySelector('.mega-menu-panel')?.classList.contains('show')
        );

      megaDropdowns.forEach((dropdown) => {
        const toggle = getMegaToggle(dropdown);
        const parentLink = getMegaParentLink(dropdown);
        const menu = dropdown.querySelector('.mega-menu-panel');
        if (!toggle || !menu) return;
        const href = parentLink?.getAttribute('href');
        const navLabel = (parentLink?.textContent || toggle.getAttribute('aria-label') || '').trim();
        const jumpPrefix = (document.documentElement.lang || '').toLowerCase().startsWith('en')
          ? 'Go to page:'
          : 'Siirry sivulle:';

        // Mobile-only "go to top-level page" link inside each mega menu.
        if (href && href !== '#') {
          const wrap = menu.querySelector('.mega-wrap');
          if (wrap && !wrap.querySelector('.mega-mobile-jump')) {
            const mobileJump = document.createElement('a');
            mobileJump.className = 'mega-mobile-jump';
            mobileJump.href = href;
            mobileJump.setAttribute('aria-label', `${jumpPrefix} ${navLabel}`);
            mobileJump.innerHTML = `<i class="bi bi-arrow-up-right-circle me-2"></i>${jumpPrefix} ${navLabel}`;
            wrap.insertBefore(mobileJump, wrap.firstChild);
          }
        }

        const interactiveItems = getMegaItems(menu);
        interactiveItems.forEach((el, idx) => {
          el.classList.add('stagger-item');
          el.style.transitionDelay = `${Math.min(idx * 35, 300)}ms`;
        });

        const openMegaMenuDirect = (focusTarget = 'first') => {
          closeAllMegaMenus({ except: dropdown });
          activeMegaToggle = toggle;
          toggle.setAttribute('aria-expanded', 'true');
          menu.classList.add('show');
          if (navbar) navbar.classList.add('mega-open');
          menu.classList.remove('menu-open');
          requestAnimationFrame(() => {
            menu.classList.add('menu-open');
            const items = getMegaItems(menu);
            if (items.length) {
              if (focusTarget === 'last') items[items.length - 1].focus();
              else items[0].focus();
            }
          });
        };

        toggle.addEventListener('click', () => {
          if (!desktopMq.matches) return;
          if (menu.classList.contains('show')) {
            closeMegaMenuDirect(toggle, menu);
            if (!isAnyMenuOpen()) navbar?.classList.remove('mega-open');
          } else {
            closeAllMegaMenus({ except: dropdown });
          }
        });

        toggle.addEventListener('keydown', (e) => {
          if (!desktopMq.matches) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            openMegaMenuDirect('first');
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            openMegaMenuDirect('last');
          } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (menu.classList.contains('show')) {
              closeMegaMenuDirect(toggle, menu);
              if (!isAnyMenuOpen()) navbar?.classList.remove('mega-open');
            } else {
              openMegaMenuDirect('first');
            }
          } else if (e.key === 'Escape' && menu.classList.contains('show')) {
            e.preventDefault();
            closeAllMegaMenus({ focusToggle: true });
          }
        });

        // Bootstrap events fire when Bootstrap's click handler activates — keep animation in sync.
        dropdown.addEventListener('show.bs.dropdown', () => {
          activeMegaToggle = toggle;
          if (navbar) navbar.classList.add('mega-open');
          menu.classList.remove('menu-open');
          requestAnimationFrame(() => menu.classList.add('menu-open'));
        });

        dropdown.addEventListener('hide.bs.dropdown', () => {
          if (!isAnyMenuOpen(dropdown)) navbar?.classList.remove('mega-open');
          menu.classList.remove('menu-open', 'show');
        });

        dropdown.addEventListener('focusout', (e) => {
          if (!desktopMq.matches || !menu.classList.contains('show')) return;
          const nextTarget = e.relatedTarget;
          if (nextTarget instanceof Node && dropdown.contains(nextTarget)) return;
          requestAnimationFrame(() => {
            if (!dropdown.contains(document.activeElement)) {
              closeMegaMenuDirect(toggle, menu);
              if (!isAnyMenuOpen()) navbar?.classList.remove('mega-open');
            }
          });
        });

        menu.addEventListener('keydown', (e) => {
          if (!desktopMq.matches) return;
          const items = getMegaItems(menu);
          if (!items.length) return;
          const currentIndex = items.indexOf(document.activeElement);

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1 + items.length) % items.length;
            items[nextIndex].focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
            items[prevIndex].focus();
          } else if (e.key === 'Home') {
            e.preventDefault();
            items[0].focus();
          } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1].focus();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMegaMenuDirect(toggle, menu);
            if (!isAnyMenuOpen()) navbar?.classList.remove('mega-open');
            toggle.focus();
          }
        });

        menu.addEventListener('click', (e) => {
          if (!(e.target instanceof Element)) return;
          const clickedLink = e.target.closest('a[href]');
          if (!clickedLink) return;
          closeAllMegaMenus();
        });
      });

      // Hakutoiminnon logiikka
      const searchToggles = Array.from(document.querySelectorAll('[data-search-toggle], #searchToggleBtn'));
      const searchForms = Array.from(document.querySelectorAll('[data-search-form]'));
      const searchClose = document.getElementById('searchCloseBtn');
      const searchOverlay = document.getElementById('searchOverlay');
      let pagefindInitialized = false;
      let lastSearchTrigger = null;
      const focusableSelector = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

      const isVisibleElement = (el) => el instanceof HTMLElement && el.isConnected && el.offsetParent !== null;
      const getFocusableElements = (container) =>
        Array.from(container.querySelectorAll(focusableSelector)).filter((el) => !el.closest('[hidden]') && isVisibleElement(el));
      const getSearchReturnTarget = () => {
        if (isVisibleElement(lastSearchTrigger)) return lastSearchTrigger;
        return searchToggles.find((toggle) => isVisibleElement(toggle)) || null;
      };

      function closeContainingOffcanvas(node) {
        if (!node || !window.bootstrap) return;
        const offcanvasEl = node.closest('.offcanvas');
        if (!offcanvasEl) return;
        const instance = window.bootstrap.Offcanvas.getInstance(offcanvasEl) || new window.bootstrap.Offcanvas(offcanvasEl);
        instance.hide();
      }

      function openSearch(prefillQuery = '', triggerSource = null) {
        if (!searchOverlay) return;
        lastSearchTrigger = triggerSource instanceof HTMLElement
          ? triggerSource
          : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
        searchOverlay.hidden = false;
        searchOverlay.style.display = 'flex';
        searchOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        if (!pagefindInitialized) {
          const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');
          const pagefindTranslations = isEn
            ? {
                placeholder: 'Write a search term...',
                zero_results: 'No results for [SEARCH_TERM]',
                many_results: '[COUNT] results for [SEARCH_TERM]',
                one_result: '[COUNT] result for [SEARCH_TERM]',
                filters_label: 'Filter',
                load_more: 'Load more'
              }
            : {
                placeholder: 'Kirjoita hakusana...',
                zero_results: 'Ei tuloksia haulle [SEARCH_TERM]',
                many_results: '[COUNT] tulosta haulle [SEARCH_TERM]',
                one_result: '[COUNT] tulos haulle [SEARCH_TERM]',
                filters_label: 'Suodata',
                load_more: 'Näytä lisää'
              };
          new PagefindUI({
            element: '#pagefindSearch',
            showSubResults: true,
            showImages: false,
            translations: pagefindTranslations
          });
          pagefindInitialized = true;
        }
        
        setTimeout(() => {
          const input = searchOverlay.querySelector('.pagefind-ui__search-input');
          if (input) {
            input.focus();
            if (prefillQuery) {
              input.value = prefillQuery;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }, 100);
      }

      function closeSearch({ restoreFocus = true } = {}) {
        if (!searchOverlay) return;
        searchOverlay.style.display = 'none';
        searchOverlay.hidden = true;
        searchOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (restoreFocus) {
          const returnTarget = getSearchReturnTarget();
          if (returnTarget) returnTarget.focus();
        }
      }

      function trapSearchFocus(e) {
        if (!searchOverlay || searchOverlay.hidden || e.key !== 'Tab') return;
        const focusable = getFocusableElements(searchOverlay);
        if (!focusable.length) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }

      searchToggles.forEach((searchToggle) => {
        searchToggle.addEventListener('click', (e) => {
          closeContainingOffcanvas(e.currentTarget);
          openSearch('', e.currentTarget);
        });
      });
      searchForms.forEach((form) => {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const query = String(formData.get('q') || '').trim();
          const fallbackTrigger = searchToggles.find((toggle) => isVisibleElement(toggle)) || null;
          closeContainingOffcanvas(form);
          openSearch(query, fallbackTrigger);
        });
      });
      if (searchClose) searchClose.addEventListener('click', () => closeSearch());

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        if (searchOverlay && !searchOverlay.hidden) {
          closeSearch();
          return;
        }

        const openDropdown = megaDropdowns.find((dropdown) => dropdown.classList.contains('show'));
        if (openDropdown) {
          closeAllMegaMenus();
          if (activeMegaToggle) activeMegaToggle.focus();
        }
      });

      if (searchOverlay) {
        searchOverlay.addEventListener('keydown', trapSearchFocus);
        searchOverlay.addEventListener('click', (e) => {
          if (e.target === searchOverlay) closeSearch();
        });
      }
    });

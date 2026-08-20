(function () {
  const VIEW_ORDER = [
    'mobile-calendar-view',
    'mobile-courses-view',
    'mobile-my-schedule-view',
    'mobile-my-exams-view'
  ];

  const prefersReducedMotion = () => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  const origSetupEventListeners = QU_ScheduleApp._setupEventListeners;

  Object.assign(QU_ScheduleApp, {

    _setupEventListeners() {
      origSetupEventListeners.call(this);
      this._initMobileUX();
    },

    _initMobileUX() {
      if (this._mobileUXBound) return;
      this._mobileUXBound = true;
      this._mobileViewIndex = 0;

      this._initMobileNavPills();
      this._initMobileSearchField();
      this._initMobileHeaderScroll();
      this._initMobileViewSwipe();
      this._markActiveMobileView();
    },

    _initMobileSearchField() {
      const host = document.getElementById('mobile-search-container');
      if (!host || host.querySelector('.m-search-icon')) return;
      const icon = document.createElement('i');
      icon.className = 'ph ph-magnifying-glass m-search-icon';
      icon.setAttribute('aria-hidden', 'true');
      host.insertBefore(icon, host.firstChild);
    },

    _markActiveMobileView() {
      const wrapper = document.querySelector('.mobile-wrapper');
      const active = document.querySelector('.mobile-view-content.active');
      if (wrapper && active) wrapper.dataset.view = active.id;
    },

    _setMobileNavBadge(viewId, kind) {
      const btn = document.querySelector(`.mobile-nav-btn[data-view="${viewId}"]`);
      if (!btn) return;
      if (kind) btn.dataset.badge = kind;
      else delete btn.dataset.badge;
    },

    _initMobileNavPills() {
      const nav = document.querySelector('.mobile-nav');
      if (!nav) return;

      nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
        if (btn.querySelector('.mnav-pill')) return;

        const icon = btn.querySelector('i');
        const oldLabel = btn.querySelector('span');
        const text = oldLabel ? oldLabel.textContent.trim() : '';
        if (oldLabel) oldLabel.remove();

        const pill = document.createElement('div');
        pill.className = 'mnav-pill';
        if (icon) pill.appendChild(icon);
        if (text) {
          const label = document.createElement('div');
          label.className = 'mnav-label';
          label.textContent = text;
          pill.appendChild(label);
          btn.setAttribute('aria-label', text);
        }
        btn.appendChild(pill);
      });

      this._syncMobileNavIcons();
    },

    _syncMobileNavIcons() {
      document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return;
        const on = btn.classList.contains('active');
        icon.classList.toggle('ph', !on);
        icon.classList.toggle('ph-fill', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    },

    _handleMobileNav(button) {
      const view = button.dataset.view;
      const targetView = document.getElementById(view);
      if (!targetView) return;

      const nextIndex = VIEW_ORDER.indexOf(view);
      const prevIndex = typeof this._mobileViewIndex === 'number' ? this._mobileViewIndex : 0;
      const current = document.querySelector('.mobile-view-content.active');
      const isSame = current === targetView;

      if (isSame && button.classList.contains('active')) {
        this._scrollActiveMobileViewToTop();
        return;
      }
      const goingForward = nextIndex > prevIndex;

      const navButtons = this.dom.mobileNavButtons && this.dom.mobileNavButtons.length
        ? this.dom.mobileNavButtons
        : document.querySelectorAll('.mobile-nav-btn');
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      this._syncMobileNavIcons();

      if (!isSame) {
        this._animateMobileViewSwap(current, targetView, goingForward);
      }
      this._mobileViewIndex = nextIndex < 0 ? prevIndex : nextIndex;

      this._updateMobileHeader();
      this._syncMobileHeaderScroll();
      this._markActiveMobileView();

      if (view === 'mobile-calendar-view') {
        setTimeout(() => { this._refitCompactCalendar(); }, 60);
      }
    },

    _animateMobileViewSwap(outgoing, incoming, forward) {
      const motionOff = prefersReducedMotion() || document.body.classList.contains('high-performance');
      const enterClass = forward ? 'enter-fwd' : 'enter-back';
      const leaveClass = forward ? 'leave-fwd' : 'leave-back';
      const clean = el => el && el.classList.remove('enter-fwd', 'enter-back', 'leave-fwd', 'leave-back', 'is-leaving');

      document.querySelectorAll('.mobile-view-content').forEach(v => {
        if (v !== outgoing && v !== incoming) { clean(v); v.classList.remove('active'); v.style.display = ''; }
      });

      clean(incoming);
      incoming.style.display = '';
      incoming.classList.add('active');

      if (outgoing && outgoing !== incoming) {
        clean(outgoing);
        outgoing.classList.remove('active');
        outgoing.classList.add('is-leaving');
        if (motionOff) {
          outgoing.classList.remove('is-leaving');
        } else {
          outgoing.classList.add(leaveClass);
          this._onViewAnimationDone(outgoing, () => outgoing.classList.remove('is-leaving', leaveClass), 320);
        }
      }

      if (!motionOff) {
        incoming.classList.add(enterClass);
        this._onViewAnimationDone(incoming, () => incoming.classList.remove(enterClass), 420);
      }
    },

    _onViewAnimationDone(el, done, fallbackMs) {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener('animationend', onEnd);
        clearTimeout(timer);
        done();
      };
      const onEnd = e => { if (e.target === el) finish(); };
      el.addEventListener('animationend', onEnd);
      const timer = setTimeout(finish, fallbackMs);
    },

    _initMobileHeaderScroll() {
      const wrapper = document.querySelector('.mobile-wrapper');
      const header = document.querySelector('.mobile-header');
      if (!wrapper || !header || wrapper.dataset.mHeaderScrollBound === '1') return;
      wrapper.dataset.mHeaderScrollBound = '1';
      this._mobileHeaderEl = header;

      wrapper.addEventListener('scroll', e => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.mobile-calendar-scroll-wrapper')) return;
        if (target !== this._activeMobileScroller()) return;
        this._setMobileHeaderScrolled(target.scrollTop > 4);
      }, { capture: true, passive: true });

      this._syncMobileHeaderScroll();
    },

    _setMobileHeaderScrolled(scrolled) {
      if (scrolled === this._mobileHeaderScrolled) return;
      this._mobileHeaderScrolled = scrolled;
      const header = this._mobileHeaderEl || document.querySelector('.mobile-header');
      if (header) header.classList.toggle('is-scrolled', scrolled);
    },

    _activeMobileScroller() {
      const view = document.querySelector('.mobile-view-content.active');
      if (!view) return null;
      const inner = view.querySelector('#mobile-courses-list, #mobile-my-schedule-list');
      if (inner && inner.scrollHeight > inner.clientHeight + 2) return inner;
      return view;
    },

    _syncMobileHeaderScroll() {
      const scroller = this._activeMobileScroller();
      this._setMobileHeaderScrolled(!!scroller && scroller.scrollTop > 4);
    },

    _scrollActiveMobileViewToTop() {
      const scroller = this._activeMobileScroller();
      if (!scroller || scroller.scrollTop <= 0) return;
      const smooth = !prefersReducedMotion() && !document.body.classList.contains('high-performance');
      try { scroller.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }); }
      catch (e) { scroller.scrollTop = 0; }
      this._vibrate(8);
    },

    _initMobileViewSwipe() {
      const wrapper = document.querySelector('.mobile-wrapper');
      if (!wrapper || wrapper.dataset.mSwipeBound === '1') return;
      wrapper.dataset.mSwipeBound = '1';

      let startX = 0, startY = 0, tracking = false, decided = false, horizontal = false;

      const blocked = target => !!(target && target.closest(
        '.mobile-calendar-scroll-wrapper, .schedule-tabs-container, .details-panel, ' +
        '.my-schedule-table-wrapper, .swal2-container, input, textarea, select, .qs-filter-host'
      ));

      wrapper.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) { tracking = false; return; }
        if (document.querySelector('.mobile-section-details-overlay.open')) { tracking = false; return; }
        if (blocked(e.target)) { tracking = false; return; }
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true; decided = false; horizontal = false;
      }, { passive: true });

      wrapper.addEventListener('touchmove', e => {
        if (!tracking || decided) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy) * 1.6;
      }, { passive: true });

      wrapper.addEventListener('touchend', e => {
        if (!tracking) return;
        tracking = false;
        if (!decided || !horizontal) return;
        const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
        if (Math.abs(dx) < 60) return;
        this._stepMobileView(dx < 0 ? 1 : -1);
      }, { passive: true });
    },

    _stepMobileView(step) {
      const buttons = Array.from(document.querySelectorAll('.mobile-nav-btn'));
      if (!buttons.length) return;
      const currentIdx = buttons.findIndex(b => b.classList.contains('active'));
      const nextIdx = currentIdx + step;
      if (nextIdx < 0 || nextIdx >= buttons.length) return;
      this._vibrate(8);
      this._handleMobileNav(buttons[nextIdx]);
    },

    _initSheetSwipe() {
      const panel = this.dom.detailsPanel;
      const overlay = this.dom.mobileSectionDetailsOverlay;
      if (!panel || panel.dataset.mSheetBound === '1') return;
      panel.dataset.mSheetBound = '1';

      let startX = 0, startY = 0, curX = 0, curY = 0;
      let lastY = 0, lastT = 0, velocity = 0;
      let dragging = false, axis = null;

      const bodyEl = () => panel.querySelector('.details-body');
      const atTop = () => { const b = bodyEl(); return !b || b.scrollTop <= 0; };

      const reset = () => {
        panel.classList.remove('is-dragging');
        panel.style.transform = '';
        if (overlay) overlay.style.opacity = '';
      };

      panel.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        if (e.target.closest('button, a, input, textarea')) return;
        startX = curX = e.touches[0].clientX;
        startY = curY = lastY = e.touches[0].clientY;
        lastT = performance.now();
        velocity = 0;
        dragging = true;
        axis = null;
      }, { passive: true });

      panel.addEventListener('touchmove', e => {
        if (!dragging) return;
        curX = e.touches[0].clientX;
        curY = e.touches[0].clientY;
        const dx = curX - startX;
        const dy = curY - startY;

        if (!axis) {
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
          axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
          if (axis === 'y') panel.classList.add('is-dragging');
        }
        if (axis !== 'y') return;

        const now = performance.now();
        const dt = now - lastT;
        if (dt > 0) velocity = (curY - lastY) / dt; // px/ms
        lastY = curY; lastT = now;

        if (dy > 0 && atTop()) {
          panel.style.transform = `translate3d(0, ${dy}px, 0)`;
          if (overlay) overlay.style.opacity = String(Math.max(0.25, 1 - dy / 420));
        } else if (dy < 0) {
          panel.style.transform = `translate3d(0, ${-Math.pow(-dy, 0.62)}px, 0)`;
        }
      }, { passive: true });

      const finish = () => {
        if (!dragging) return;
        dragging = false;
        const dy = curY - startY;
        const dx = curX - startX;
        reset();
        if (axis === 'y' && atTop() && (dy > 110 || (dy > 40 && velocity > 0.55))) {
          this._hideMobileSectionDetails();
          return;
        }
        if (axis === 'x' && Math.abs(dx) > 70) {
          this._vibrate(8);
          this._sheetNavigate(dx > 0 ? -1 : 1);
        }
      };

      panel.addEventListener('touchend', finish);
      panel.addEventListener('touchcancel', () => { dragging = false; reset(); });
    },

    _hideMobileSectionDetails() {
      const overlay = this.dom.mobileSectionDetailsOverlay;
      const panel = this.dom.detailsPanel;
      if (panel) { panel.classList.remove('is-dragging'); panel.style.transform = ''; }
      if (overlay) { overlay.style.opacity = ''; overlay.classList.remove('open'); }
    }
  });
})();

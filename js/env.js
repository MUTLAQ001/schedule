let isMobile = false;
let currentViewMode = 'desktop';
let Toast = null;

const QU_TOAST_OPTIONS = () => ({
  toast: true,
  position: isMobile ? 'top' : 'bottom-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

let viewModeSwitching = false;
let viewModeTimer = null;

function scheduleViewModeUpdate() {
  clearTimeout(viewModeTimer);
  viewModeTimer = setTimeout(updateViewMode, 200);
}

function updateViewMode() {
  const isCurrentlyMobile = window.innerWidth < 1024;
  if (isCurrentlyMobile !== isMobile && !viewModeSwitching) {
    viewModeSwitching = true;
    isMobile = isCurrentlyMobile;
    currentViewMode = isMobile ? 'mobile' : 'desktop';
    document.body.classList.remove('mobile-view', 'desktop-view');
    document.body.classList.add(`${currentViewMode}-view`);

    Toast = Swal.mixin(QU_TOAST_OPTIONS());

    try {
      if (typeof QU_ScheduleApp !== 'undefined' && QU_ScheduleApp.state) {
        if (QU_ScheduleApp.state.calendar) {
          QU_ScheduleApp.state.calendar.destroy();
          QU_ScheduleApp.state.calendar = null;
        }
        QU_ScheduleApp._populateDOMElements();
        QU_ScheduleApp._initializeCalendar();
        QU_ScheduleApp.updateFullUI();
        QU_bindHeaderScroll();
        const activeNav = document.querySelector('.mobile-nav-btn.active');
        if (isMobile && activeNav) QU_ScheduleApp._handleMobileNav(activeNav);
        requestAnimationFrame(() => { try { QU_ScheduleApp.state.calendar?.updateSize(); } catch (e) { } });
        setTimeout(() => { try { QU_ScheduleApp.state.calendar?.updateSize(); } catch (e) { } }, 150);
      }
    } catch (e) {
      setTimeout(() => { try { QU_ScheduleApp._initializeCalendar(); QU_ScheduleApp.updateFullUI(); } catch (err) { } }, 100);
    } finally {
      viewModeSwitching = false;
    }
  }
}

function QU_bindHeaderScroll() {
  document.querySelectorAll('.main-content').forEach((el) => {
    if (el.dataset.scrollBound === '1') return;
    el.dataset.scrollBound = '1';
    let ticking = false;
    const sync = () => {
      ticking = false;
      el.classList.toggle('is-scrolled', el.scrollTop > 0);
    };
    el.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  });
}

function QU_initEnv() {
  isMobile = window.innerWidth < 1024;
  currentViewMode = isMobile ? 'mobile' : 'desktop';
  Toast = Swal.mixin(QU_TOAST_OPTIONS());
  window.addEventListener('resize', scheduleViewModeUpdate);
  window.addEventListener('orientationchange', scheduleViewModeUpdate);
  initStarfield();
  QU_bindHeaderScroll();
}

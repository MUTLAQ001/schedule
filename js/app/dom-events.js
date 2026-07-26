Object.assign(QU_ScheduleApp, {
        _bindEmptyStateActions(container) {
          if (!container) return;
          container.querySelectorAll('[data-empty-action]').forEach(btn => {
            btn.addEventListener('click', () => {
              const action = btn.dataset.emptyAction;
              if (action === 'browse') {
                if (isMobile) {
                  const navBtn = document.querySelector('.mobile-nav-btn[data-view="mobile-courses-view"]');
                  if (navBtn) this._handleMobileNav(navBtn);
                } else {
                  const coursesTabBtn = document.querySelector('.page-wrapper .sidebar .tab-btn[data-tab="courses-tab"]');
                  if (coursesTabBtn) this._handleTabClick(coursesTabBtn);
                  this.dom.desktopSearchInput?.focus();
                }
              } else if (action === 'auto') {
                this._handleAutoGenerate();
              } else if (action === 'tour') {
                this._startTour();
              }
            });
          });
        },
        _updateAvailableSectionsUI(selectedCourses) {
          const activeSections = this.state.schedules[this.state.activeScheduleIndex]?.sections || new Set();
          this.state.allCoursesData.forEach(section => {
            const btns = document.querySelectorAll(`.section-btn[data-unique-id='${section.uniqueId}']`);
            btns.forEach(btn => {
              if (btn) { btn.classList.remove('conflicted'); if (!activeSections.has(section.uniqueId)) { btn.classList.toggle('conflicted', this._isSectionConflicted(section, selectedCourses)); } }
            });
          });
        },
        _populateDOMElements() {
          const ids = ['my-schedule-container', 'calendar', 'clear-calendar-btn', 'settings-btn', 'settings-modal', 'modal-overlay', 'install-section-container', 'install-overlay', 'no-data-message', 'schedule-tabs-container', 'desktop-courses-list', 'desktop-exams-list', 'main-header-title-wrapper', 'mobile-schedule-tabs-container', 'mobile-my-schedule-container', 'mobile-header-title', 'mobile-settings-btn', 'mobile-courses-list', 'mobile-my-exams-list', 'mobile-calendar', 'mobile-section-details-overlay', 'details-panel', 'download-img-btn', 'desktop-search-input', 'mobile-search-input', 'desktop-date-toggle', 'mobile-my-exams-date-toggle', 'mobile-my-exams-period-toggle', 'mobile-dynamic-action-btn', 'mobile-search-container', 'mobile-close-search', 'desktop-search-toggle', 'desktop-search-container', 'exam-schedule-toggle-btn', 'quick-visibility-wrapper', 'quick-visibility-toggle-btn', 'quick-visibility-content', 'quick-visibility-swap-btn', 'expand-collapse-btn', 'share-schedule-btn', 'export-exams-ics-btn', 'mobile-export-exams-ics-btn'];
          ids.forEach(id => { this.dom[id.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = document.getElementById(id); });
          this.dom.mobileDownloadImgBtn = null;
          if (isMobile) { this.dom.tabButtons = document.querySelectorAll('#mobile-courses-view .tab-btn'); this.dom.tabContents = document.querySelectorAll('#mobile-courses-view .tab-content'); this.dom.mobileNavButtons = document.querySelectorAll('.mobile-nav-btn'); this.dom.mobileViewContents = document.querySelectorAll('.mobile-view-content'); }
          else { this.dom.tabButtons = document.querySelectorAll('.page-wrapper .sidebar .tab-btn'); this.dom.tabContents = document.querySelectorAll('.page-wrapper .sidebar .tab-content'); }
        },
        _calculateConflicts(selectedCourses) {
          const conflictMap = new Map();
          for (let i = 0; i < selectedCourses.length; i++) {
            for (let j = i + 1; j < selectedCourses.length; j++) {
              const cA = selectedCourses[i], cB = selectedCourses[j]; const msgA = conflictMap.get(cA.uniqueId) || [], msgB = conflictMap.get(cB.uniqueId) || [];
              if (cA.timeSlots.some(sA => cB.timeSlots.some(sB => sA.day === sB.day && sA.start < sB.end && sA.end > sB.start))) { msgA.push(`تعارض وقت محاضرة مع ${cB.name} (${cB.code})`); msgB.push(`تعارض وقت محاضرة مع ${cA.name} (${cA.code})`); }
              if (cA.code !== cB.code && cA.examPeriodId && cB.examPeriodId && cA.examPeriodId === cB.examPeriodId) { msgA.push(`تعارض اختبار نهائي مع ${cB.name} (${cB.code})`); msgB.push(`تعارض اختبار نهائي مع ${cA.name} (${cA.code})`); }
              if (msgA.length > 0) conflictMap.set(cA.uniqueId, msgA); if (msgB.length > 0) conflictMap.set(cB.uniqueId, msgB);
            }
          }
          return conflictMap;
        },
        _isSectionConflicted(section, selectedCourses) {
          return selectedCourses.some(sel => { if (sel.uniqueId === section.uniqueId) return false; const lectureConflict = section.timeSlots.some(sA => sel.timeSlots.some(sB => sA.day === sB.day && sA.start < sB.end && sA.end > sB.start)); const examConflict = section.code !== sel.code && section.examPeriodId && sel.examPeriodId && section.examPeriodId === sel.examPeriodId; return lectureConflict || examConflict; });
        },
        _getConflictDetails(section, selectedCourses) {
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const out = [];
          selectedCourses.forEach(sel => {
            if (sel.uniqueId === section.uniqueId) return;
            (section.timeSlots || []).forEach(sA => (sel.timeSlots || []).forEach(sB => {
              if (sA.day !== sB.day || sA.start >= sB.end || sA.end <= sB.start) return;
              const from = Math.max(this._toMin(sA.start), this._toMin(sB.start));
              const to = Math.min(this._toMin(sA.end), this._toMin(sB.end));
              out.push({ type: 'time', other: sel, day: dayNames[sA.day] || '', from, to, mins: to - from });
            }));
            if (section.code !== sel.code && section.examPeriodId && sel.examPeriodId && section.examPeriodId === sel.examPeriodId) {
              out.push({ type: 'exam', other: sel, period: section.examPeriodId });
            }
          });
          return out;
        },
        _createLectureEventsForSection(section, isPreview, color) {
          const sourceId = isPreview ? 'preview-source' : undefined;
          return { id: sourceId, events: section.timeSlots.map(slot => ({ title: `${section.name}`, daysOfWeek: [slot.day], startTime: slot.start, endTime: slot.end, backgroundColor: isPreview ? 'transparent' : color, borderColor: isPreview ? color : this._adjustColorBrightness(color, -20), textColor: isPreview ? undefined : this._readableOn(color), classNames: isPreview ? ['preview-event'] : [], extendedProps: { ...section }, display: 'block' })) };
        },
        _parseTimeEntries(timeString) {
          if (!timeString || typeof timeString !== 'string' || timeString === 'غير محدد') return [];
          return timeString.split('<br>').map(entry => {
            const parts = entry.match(/([\u0621-\u064A\s]+):\s*(\d{1,2}:\d{2})\s*(ص|م)\s*-\s*(\d{1,2}:\d{2})\s*(ص|م)/); if (!parts) return null;
            const days = parts[1].trim().split(/\s+/); const start = this._convertTo24Hour(parts[2], parts[3]); const end = this._convertTo24Hour(parts[4], parts[5]);
            return days.map(day => this.constants.DAY_MAPPING[day] !== undefined ? { day: this.constants.DAY_MAPPING[day], start, end } : null);
          }).flat().filter(Boolean);
        },
        _convertTo24Hour(time, period) { let [h, m] = time.split(':'); h = parseInt(h, 10); if (period.includes('م') && h !== 12) h += 12; if (period.includes('ص') && h === 12) h = 0; return `${String(h).padStart(2, '0')}:${m}:00`; },
        _setupEventListeners() {
          this.dom.shareScheduleBtn?.addEventListener('click', () => this._handleShare());
          this.dom.exportExamsIcsBtn?.addEventListener('click', () => this._handleExportExamsICS());
          this.dom.mobileExportExamsIcsBtn?.addEventListener('click', () => this._handleExportExamsICS());
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              if (this.dom.settingsModal?.classList.contains('open')) this._toggleSettingsModal(false);
              if (this.dom.mobileSectionDetailsOverlay?.classList.contains('open')) this._hideMobileSectionDetails();
              return;
            }
            const active = document.activeElement;
            const typing = !!(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable));
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); this._undoLast(); return; }
            if (isMobile || typing) return;
            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
              e.preventDefault();
              const container = this.dom.desktopSearchContainer;
              if (container && !container.classList.contains('active')) { this.dom.desktopSearchToggle?.click(); }
              else { this.dom.desktopSearchInput?.focus(); }
              return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (document.querySelector('.swal2-container')) return;
            if (e.key === '?') { e.preventDefault(); this._showShortcutsModal(); return; }
            if (/^[1-9]$/.test(e.key)) { const i = parseInt(e.key, 10) - 1; if (i < this.state.schedules.length) { e.preventDefault(); this._switchSchedule(i); } return; }
            const k = e.key.toLowerCase();
            if (k === 'g') { e.preventDefault(); this._handleAutoGenerate(); }
            else if (k === 's') { e.preventDefault(); this._toggleSettingsModal(true); }
            else if (k === 'c') { e.preventDefault(); this._handleCompareSchedules(); }
            else if (k === 'n') { e.preventDefault(); this._addSchedule(); }
            else if (k === 'f') { e.preventDefault(); this._toggleFilterPanel(); }
            else if (k === 'r') { e.preventDefault(); this._handleViewAllConflictsShortcut(); }
          });
          this.dom.clearCalendarBtn?.addEventListener('click', () => this._handleClearCalendar());
          this.dom.settingsBtn?.addEventListener('click', () => this._toggleSettingsModal(true));
          this.dom.mobileSettingsBtn?.addEventListener('click', () => this._toggleSettingsModal(true));
          this.dom.downloadImgBtn?.addEventListener('click', () => this._handleDownloadImage(false));

          this.dom.modalOverlay.addEventListener('click', () => this._toggleSettingsModal(false));
          document.querySelectorAll('.tab-btn').forEach(button => button.addEventListener('click', () => this._handleTabClick(button)));

          [this.dom.desktopCoursesList, this.dom.mobileCoursesList].forEach(list => { if (list) { list.addEventListener('click', e => this._handleCourseListClick(e)); list.addEventListener('mouseover', e => this._handleSectionHover(e, true)); list.addEventListener('mouseout', e => this._handleSectionHover(e, false)); } });
          if (this.dom.mobileNavButtons) { this.dom.mobileNavButtons.forEach(btn => btn.addEventListener('click', () => this._handleMobileNav(btn))); }
          if (this.dom.mobileSectionDetailsOverlay) { this.dom.mobileSectionDetailsOverlay.addEventListener('click', (e) => { if (e.target === this.dom.mobileSectionDetailsOverlay) { this._hideMobileSectionDetails(); } }); }
          this._initSheetSwipe();
          this._initLongPressQuickAdd();

          [this.dom.desktopSearchInput, this.dom.mobileSearchInput].forEach(input => { if (input) { input.addEventListener('input', (e) => { this.state.searchTerm = e.target.value; this._renderCoursesList(); }); } });
          if (this.dom.mobileCloseSearch) { this.dom.mobileCloseSearch.addEventListener('click', () => { this.dom.mobileSearchContainer.style.display = 'none'; this.dom.mobileHeaderTitle.style.display = 'block'; this.dom.mobileSearchInput.value = ''; this.state.searchTerm = ''; this._renderCoursesList(); }); }

          if (this.dom.desktopSearchToggle) {
            this.dom.desktopSearchToggle.addEventListener('click', () => {
              const container = this.dom.desktopSearchContainer;
              container.classList.toggle('active');
              this.dom.desktopSearchToggle.classList.toggle('active');
              if (container.classList.contains('active')) {
                setTimeout(() => this.dom.desktopSearchInput.focus(), 100);
              } else {
                this.dom.desktopSearchInput.value = '';
                this.state.searchTerm = '';
                this._renderCoursesList();
              }
            });
          }

          const updateExamMode = (mode) => {
            this.state.userSettings.examScheduleMode = mode;
            const textSpan = this.dom.examScheduleToggleBtn?.querySelector('span');
            if (textSpan) textSpan.textContent = mode === '3' ? '3 فترات' : 'فترتين';

            const mobileTextSpan = this.dom.mobileMyExamsPeriodToggle?.querySelector('span');
            if (mobileTextSpan) mobileTextSpan.textContent = mode === '3' ? '3 فترات' : 'فترتين';

            this._saveSettings();
            const selectedSections = this.state.schedules[this.state.activeScheduleIndex]?.sections || new Set();
            const selectedCourseDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
            this._renderFinalExams(selectedCourseDetails);
          };

          if (this.dom.examScheduleToggleBtn) {
            this.dom.examScheduleToggleBtn.addEventListener('click', () => {
              const currentMode = this.state.userSettings.examScheduleMode;
              const newMode = currentMode === '3' ? '2' : '3';
              updateExamMode(newMode);
            });
          }
          if (this.dom.mobileMyExamsPeriodToggle) {
            this.dom.mobileMyExamsPeriodToggle.addEventListener('click', () => {
              const currentMode = this.state.userSettings.examScheduleMode;
              const newMode = currentMode === '3' ? '2' : '3';
              updateExamMode(newMode);
            });
          }

          const toggleDates = () => {
            this.state.showExamDates = !this.state.showExamDates;
            const selectedSections = this.state.schedules[this.state.activeScheduleIndex]?.sections || new Set();
            const selectedCourseDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
            this._renderFinalExams(selectedCourseDetails);
          };

          [this.dom.desktopDateToggle, this.dom.mobileMyExamsDateToggle].forEach(btn => {
            if (btn) btn.addEventListener('click', toggleDates);
          });

          if (this.dom.quickVisibilityToggleBtn) {
            this.dom.quickVisibilityToggleBtn.addEventListener('click', () => {
              const content = this.dom.quickVisibilityContent;
              content.style.display = content.style.display === 'none' ? 'grid' : 'none';
            });
          }
          if (this.dom.quickVisibilitySwapBtn) {
            this.dom.quickVisibilitySwapBtn.addEventListener('click', () => {
              this.state.isVisibilityNamesMode = !this.state.isVisibilityNamesMode;
              this._updateVisibilityLabels();
            });
          }
          if (this.dom.quickVisibilityContent) {
            this.dom.quickVisibilityContent.addEventListener('click', e => this._handleVisibilityToggle(e));
          }

          if (this.dom.expandCollapseBtn) {
            this.dom.expandCollapseBtn.addEventListener('click', () => {
              this.state.areAllExpanded = !this.state.areAllExpanded;
              const courseItems = document.querySelectorAll('.course-item');
              const btnIcon = this.dom.expandCollapseBtn.querySelector('i');
              courseItems.forEach(item => {
                item.classList.remove('qs-auto-open');
                const header = item.querySelector('.course-item-header');
                if (this.state.areAllExpanded) {
                  item.classList.add('open');
                  const sections = item.querySelectorAll('.section-btn');
                  sections.forEach(s => s.style.animationDelay = '0ms');
                } else {
                  item.classList.remove('open');
                  item.querySelectorAll('.section-btn.sec-settled').forEach(s => s.classList.remove('sec-settled'));
                }
                if (header) header.setAttribute('aria-expanded', String(this.state.areAllExpanded));
              });
              if (this.state.areAllExpanded) {
                btnIcon.className = 'ph-fill ph-stack';
              } else {
                btnIcon.className = 'ph ph-stack';
              }
            });
          }
        },
        _ensureTextSegmenter() {
          if (typeof Intl === 'undefined' || Intl.Segmenter) return;
          Intl.Segmenter = function (locale, opts) {
            const granularity = (opts && opts.granularity) || 'grapheme';
            this.segment = function (input) {
              const str = String(input);
              const parts = granularity === 'word' ? (str.match(/\s+|[^\s]+/g) || []) : Array.from(str);
              let idx = 0;
              const list = parts.map(seg => { const o = { segment: seg, index: idx, input: str, isWordLike: /\S/.test(seg) }; idx += seg.length; return o; });
              return { [Symbol.iterator]() { return list[Symbol.iterator](); } };
            };
          };
        },
        _loadHtml2Canvas() {
          if (typeof window.html2canvas !== 'undefined') return Promise.resolve();
          if (this._h2cPromise) return this._h2cPromise;
          this._h2cPromise = new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            el.async = true;
            el.onload = () => resolve();
            el.onerror = () => { this._h2cPromise = null; reject(new Error('html2canvas load failed')); };
            document.head.appendChild(el);
          });
          return this._h2cPromise;
        },
        _prefetchHtml2Canvas() {
          const conn = navigator.connection;
          if (conn && (conn.saveData === true || /(^|-)(2g|slow-2g)$/.test(conn.effectiveType || ''))) return;
          const run = () => this._loadHtml2Canvas().catch(() => { });
          if ('requestIdleCallback' in window) { requestIdleCallback(run, { timeout: 8000 }); } else { setTimeout(run, 4000); }
        },
        async _handleDownloadImage(isMobileContext) {
          const btn = isMobileContext ? this.dom.mobileDynamicActionBtn : this.dom.downloadImgBtn;
          if (!btn) return;
          if (btn.dataset.busy === '1') return;
          const originalHTML = btn.innerHTML;
          btn.dataset.busy = '1';
          btn.innerHTML = '<i class="ph ph-circle-notch icon-spin"></i>';
          try {
            await this._loadHtml2Canvas();
          } catch (err) {
            btn.innerHTML = originalHTML; delete btn.dataset.busy;
            this._showToast('error', 'تعذّر تحميل أدوات التصوير. تحقق من اتصالك بالإنترنت.');
            return;
          }
          delete btn.dataset.busy;
          this._ensureTextSegmenter();
          btn.innerHTML = '<i class="ph ph-circle-notch icon-spin"></i>';
          const mobileCalView = isMobileContext ? document.getElementById('mobile-calendar-view') : null;
          let mobileCalViewPrevDisplay = null;
          if (mobileCalView && mobileCalView.style.display === 'none') {
            mobileCalViewPrevDisplay = 'none';
            mobileCalView.style.display = 'flex';
          }
          const targetEl = isMobileContext
            ? document.querySelector('#mobile-calendar-view .calendar-wrapper.card')
            : document.querySelector('.page-wrapper .calendar-wrapper.card');
          if (!targetEl) { this._showToast('error', 'لم يتم العثور على عنصر الجدول.'); btn.innerHTML = originalHTML; if (mobileCalViewPrevDisplay !== null && mobileCalView) mobileCalView.style.display = mobileCalViewPrevDisplay; return; }

          const expandedEls = [];
          const applyExpand = (el, styles) => {
            const saved = {};
            Object.keys(styles).forEach(k => { saved[k] = el.style[k]; el.style[k] = styles[k]; });
            expandedEls.push({ el, saved });
          };
          const restoreAll = () => { expandedEls.forEach(({ el, saved }) => { Object.keys(saved).forEach(k => { el.style[k] = saved[k]; }); }); expandedEls.length = 0; };

          applyExpand(targetEl, { height: 'auto', maxHeight: 'none', minWidth: '1100px', width: '1100px', backdropFilter: 'none', WebkitBackdropFilter: 'none' });
          targetEl.querySelectorAll('.fc, .fc-view-harness, .fc-scroller, .fc-timegrid, .mobile-calendar-scroll-wrapper').forEach(el => applyExpand(el, { overflow: 'visible', height: 'auto', maxHeight: 'none', width: '100%' }));

          const mobileWrapper = document.querySelector('.mobile-wrapper');
          if (isMobileContext && mobileWrapper) {
            applyExpand(mobileWrapper, { overflow: 'visible', width: 'auto', height: 'auto', position: 'static' });
            const mobileView = document.getElementById('mobile-calendar-view');
            if (mobileView) applyExpand(mobileView, { overflow: 'visible', height: 'auto' });
            const mainContent = mobileView ? mobileView.querySelector('.main-content') : null;
            if (mainContent) applyExpand(mainContent, { overflow: 'visible', height: 'auto' });
          }

          if (this.state.calendar) { this.state.calendar.setOption('height', 'auto'); this.state.calendar.updateSize(); }
          const isLight = document.body.classList.contains('light');
          const solidBg = isLight ? '#ffffff' : '#141417';
          document.body.classList.add('exporting-image');

          setTimeout(() => {
            const captureW = Math.ceil(Math.max(targetEl.scrollWidth, targetEl.offsetWidth, targetEl.getBoundingClientRect().width));
            const captureH = Math.ceil(Math.max(targetEl.scrollHeight, targetEl.offsetHeight, targetEl.getBoundingClientRect().height));

            html2canvas(targetEl, {
              backgroundColor: solidBg,
              scale: 2,
              useCORS: true,
              width: captureW,
              height: captureH,
              windowWidth: isMobileContext ? 980 : captureW + 200,
              windowHeight: captureH + 200,
              scrollX: -window.scrollX,
              scrollY: -window.scrollY,
              ignoreElements: (el) => el.classList && (el.classList.contains('cosmic-bg-container') || el.classList.contains('sidebar') || el.classList.contains('main-header') || el.classList.contains('schedule-tabs-container'))
            }).then((calCanvas) => {
              document.body.classList.remove('exporting-image');
              restoreAll();
              if (this.state.calendar && !isMobileContext) { this.state.calendar.setOption('height', '100%'); this.state.calendar.updateSize(); }

              const accent = this.state.userSettings.accentColor || '#8b5cf6';
              const sc = 2;
              const wmH = 70 * sc;
              const pad = 60 * sc;

              const fc = document.createElement('canvas');
              fc.width = calCanvas.width + pad * 2;
              fc.height = calCanvas.height + pad * 2 + wmH;
              const ctx = fc.getContext('2d');

              const hexRgb = (h) => { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(h); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [139, 92, 246]; };
              const rgbHsl = (r, g, b) => {
                r /= 255; g /= 255; b /= 255;
                const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
                let h = 0;
                if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; }
                h = (h * 60 + 360) % 360;
                const l = (mx + mn) / 2;
                const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
                return [h, sat, l];
              };
              const hslRgb = (h, sat, l) => {
                h = ((h % 360) + 360) % 360;
                const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
                let rp = 0, gp = 0, bp = 0;
                if (h < 60) { rp = c; gp = x; } else if (h < 120) { rp = x; gp = c; }
                else if (h < 180) { gp = c; bp = x; } else if (h < 240) { gp = x; bp = c; }
                else if (h < 300) { rp = x; bp = c; } else { rp = c; bp = x; }
                return [Math.round((rp + m) * 255), Math.round((gp + m) * 255), Math.round((bp + m) * 255)];
              };
              const [ar, ag, ab] = hexRgb(accent);
              const [aH, aS] = rgbHsl(ar, ag, ab);
              const [sr, sg, sb] = hslRgb(aH + 45, Math.max(0.45, aS), isLight ? 0.62 : 0.58);
              const [tr, tg, tb] = hslRgb(aH - 35, Math.max(0.4, aS * 0.85), isLight ? 0.66 : 0.55);
              const W = fc.width, H = fc.height;

              const baseTop = isLight ? hslRgb(aH, 0.30, 0.965) : hslRgb(aH, 0.34, 0.075);
              const baseBot = isLight ? hslRgb(aH + 45, 0.26, 0.905) : hslRgb(aH + 45, 0.30, 0.045);
              const baseGrad = ctx.createLinearGradient(0, 0, W * 0.35, H);
              baseGrad.addColorStop(0, `rgb(${baseTop[0]}, ${baseTop[1]}, ${baseTop[2]})`);
              baseGrad.addColorStop(1, `rgb(${baseBot[0]}, ${baseBot[1]}, ${baseBot[2]})`);
              ctx.fillStyle = baseGrad; ctx.fillRect(0, 0, W, H);

              const glow = (gx, gy, gr, col, alpha) => {
                const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
                rg.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`);
                rg.addColorStop(0.5, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 0.35})`);
                rg.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
                ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
              };
              glow(W * 0.86, H * -0.05, W * 0.72, [ar, ag, ab], isLight ? 0.16 : 0.30);
              glow(W * 0.06, H * 1.02, W * 0.66, [sr, sg, sb], isLight ? 0.14 : 0.24);
              glow(W * 0.5, H * 0.42, W * 0.85, [tr, tg, tb], isLight ? 0.05 : 0.09);

              ctx.save();
              ctx.translate(W / 2, H / 2);
              ctx.rotate(-Math.PI / 7);
              const diag = Math.sqrt(W * W + H * H);
              const bandDefs = [
                { off: -diag * 0.30, w: diag * 0.085, col: [ar, ag, ab], a: isLight ? 0.055 : 0.085 },
                { off: -diag * 0.185, w: diag * 0.030, col: [sr, sg, sb], a: isLight ? 0.075 : 0.11 },
                { off: diag * 0.16, w: diag * 0.065, col: [tr, tg, tb], a: isLight ? 0.05 : 0.075 },
                { off: diag * 0.255, w: diag * 0.022, col: [ar, ag, ab], a: isLight ? 0.07 : 0.10 }
              ];
              bandDefs.forEach(bd => {
                const bg = ctx.createLinearGradient(-diag / 2, 0, diag / 2, 0);
                bg.addColorStop(0, `rgba(${bd.col[0]}, ${bd.col[1]}, ${bd.col[2]}, 0)`);
                bg.addColorStop(0.5, `rgba(${bd.col[0]}, ${bd.col[1]}, ${bd.col[2]}, ${bd.a})`);
                bg.addColorStop(1, `rgba(${bd.col[0]}, ${bd.col[1]}, ${bd.col[2]}, 0)`);
                ctx.fillStyle = bg;
                ctx.fillRect(-diag / 2, bd.off - bd.w / 2, diag, bd.w);
              });
              ctx.restore();

              const rings = (cxr, cyr, radii, col, alpha) => {
                ctx.save();
                ctx.strokeStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`;
                ctx.lineWidth = 1.2 * sc;
                radii.forEach(rr => { ctx.beginPath(); ctx.arc(cxr, cyr, rr, 0, Math.PI * 2); ctx.stroke(); });
                ctx.restore();
              };
              rings(W * 0.94, H * 0.06, [W * 0.055, W * 0.095, W * 0.135], [ar, ag, ab], isLight ? 0.20 : 0.24);
              rings(W * 0.05, H * 0.96, [W * 0.045, W * 0.08, W * 0.115], [sr, sg, sb], isLight ? 0.16 : 0.20);

              ctx.save();
              ctx.fillStyle = isLight ? 'rgba(0,0,0,0.055)' : 'rgba(255,255,255,0.05)';
              const step = 22 * sc, dot = 1.15 * sc;
              for (let gy = step; gy < H; gy += step) {
                for (let gx = step; gx < W; gx += step) {
                  ctx.beginPath(); ctx.arc(gx, gy, dot, 0, Math.PI * 2); ctx.fill();
                }
              }
              ctx.restore();

              ctx.save();
              const sheen = ctx.createLinearGradient(0, H, W, 0);
              sheen.addColorStop(0, 'rgba(255,255,255,0)');
              sheen.addColorStop(0.45, `rgba(255,255,255,${isLight ? 0.30 : 0.045})`);
              sheen.addColorStop(0.62, 'rgba(255,255,255,0)');
              ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H);
              ctx.restore();

              const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
              vig.addColorStop(0, 'rgba(0,0,0,0)');
              vig.addColorStop(1, isLight ? 'rgba(20,18,40,0.10)' : 'rgba(0,0,0,0.42)');
              ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

              try {
                const gTile = 160;
                const nCanvas = document.createElement('canvas');
                nCanvas.width = gTile; nCanvas.height = gTile;
                const nCtx = nCanvas.getContext('2d');
                const imgData = nCtx.createImageData(gTile, gTile);
                for (let i = 0; i < imgData.data.length; i += 4) {
                  const v = 128 + (Math.random() - 0.5) * 255;
                  imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
                  imgData.data[i + 3] = isLight ? 8 : 12;
                }
                nCtx.putImageData(imgData, 0, 0);
                const pat = ctx.createPattern(nCanvas, 'repeat');
                if (pat) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); ctx.restore(); }
              } catch (e) {}

              const inset = 22 * sc;
              const frameCol = isLight ? `rgba(${ar}, ${ag}, ${ab}, 0.30)` : `rgba(${ar}, ${ag}, ${ab}, 0.34)`;
              ctx.save();
              ctx.strokeStyle = isLight ? 'rgba(20,18,40,0.10)' : 'rgba(255,255,255,0.10)';
              ctx.lineWidth = 1 * sc;
              ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
              ctx.strokeStyle = frameCol;
              ctx.lineWidth = 2.5 * sc;
              const tick = 26 * sc;
              [[inset, inset, 1, 1], [W - inset, inset, -1, 1], [inset, H - inset, 1, -1], [W - inset, H - inset, -1, -1]].forEach(([px, py, dx, dy]) => {
                ctx.beginPath();
                ctx.moveTo(px + dx * tick, py);
                ctx.lineTo(px, py);
                ctx.lineTo(px, py + dy * tick);
                ctx.stroke();
              });
              ctx.restore();

              const strip = ctx.createLinearGradient(0, 0, W, 0);
              strip.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0)`);
              strip.addColorStop(0.25, `rgba(${sr}, ${sg}, ${sb}, 0.85)`);
              strip.addColorStop(0.5, `rgba(${ar}, ${ag}, ${ab}, 0.95)`);
              strip.addColorStop(0.75, `rgba(${tr}, ${tg}, ${tb}, 0.85)`);
              strip.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`);
              ctx.fillStyle = strip;
              ctx.fillRect(0, 0, W, 3.5 * sc);

              const roundedPath = (x, y, w, h, r) => {
                const { tl = 0, tr = 0, br = 0, bl = 0 } = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
                ctx.beginPath();
                ctx.moveTo(x + tl, y);
                ctx.lineTo(x + w - tr, y);
                ctx.arcTo(x + w, y, x + w, y + tr, tr);
                ctx.lineTo(x + w, y + h - br);
                ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
                ctx.lineTo(x + bl, y + h);
                ctx.arcTo(x, y + h, x, y + h - bl, bl);
                ctx.lineTo(x, y + tl);
                ctx.arcTo(x, y, x + tl, y, tl);
                ctx.closePath();
              };
              const cardRadius = 16 * sc;

              ctx.shadowColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)';
              ctx.shadowBlur = 50 * sc; ctx.shadowOffsetY = 12 * sc;
              ctx.fillStyle = isLight ? '#ffffff' : '#141417';
              roundedPath(pad, pad, calCanvas.width, calCanvas.height + wmH, cardRadius);
              ctx.fill();
              ctx.shadowColor = 'transparent';

              ctx.save();
              roundedPath(pad, pad, calCanvas.width, calCanvas.height, { tl: cardRadius, tr: cardRadius, br: 0, bl: 0 });
              ctx.clip();
              ctx.drawImage(calCanvas, pad, pad);
              ctx.restore();

              ctx.save();
              roundedPath(pad, pad, calCanvas.width, calCanvas.height + wmH, cardRadius);
              ctx.lineWidth = 1.5 * sc;
              ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${isLight ? 0.22 : 0.3})`;
              ctx.stroke();
              ctx.restore();

              const sepY = pad + calCanvas.height;
              const cx = pad + calCanvas.width / 2;
              const cy = sepY + wmH / 2;
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillStyle = accent;
              ctx.font = `700 ${16 * sc}px "Segoe UI", system-ui, sans-serif`;
              ctx.fillText('QU Schedule', cx, cy - 10 * sc);
              ctx.fillStyle = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)';
              ctx.font = `${10 * sc}px "Segoe UI", system-ui, sans-serif`;
              ctx.fillText('\u0623\u0646\u0634\u0626 \u062c\u062f\u0648\u0644\u0643 \u0628\u0630\u0643\u0627\u0621', cx, cy + 12 * sc);

              const link = document.createElement('a');
              link.download = `QU_Schedule_${this.state.schedules[this.state.activeScheduleIndex].name}.png`;
              link.href = fc.toDataURL('image/png', 1.0);
              link.click();
              if (mobileCalViewPrevDisplay !== null && mobileCalView) mobileCalView.style.display = mobileCalViewPrevDisplay;
              btn.innerHTML = originalHTML;
              this._showToast('success', '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u0627\u062d\u062a\u0631\u0627\u0641\u064a\u0629!');
            }).catch((e) => {
              document.body.classList.remove('exporting-image');
              restoreAll();
              if (this.state.calendar) { this.state.calendar.setOption('height', isMobileContext ? 'auto' : '100%'); this.state.calendar.updateSize(); }
              if (mobileCalViewPrevDisplay !== null && mobileCalView) mobileCalView.style.display = mobileCalViewPrevDisplay;
              console.error('html2canvas error:', e);
              btn.innerHTML = originalHTML;
              this._showToast('error', '\u0641\u0634\u0644 \u062d\u0641\u0638 \u0627\u0644\u0635\u0648\u0631\u0629.');
            });
          }, 400);
        },
      });

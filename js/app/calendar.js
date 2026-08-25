Object.assign(QU_ScheduleApp, {
        _calendarFillsHeight() {
          if (!isMobile) return true;
          if (this._isCompactCalendar()) return false;
          return window.innerWidth >= 768 && window.innerHeight >= 600;
        },
        _isCompactCalendar() { return isMobile && !!this.state.userSettings.mobileCompactCalendar; },
        _shortInstructor(name) {
          const raw = String(name || '').trim();
          if (!raw || raw === 'غير محدد') return '';
          const parts = raw.replace(/^(أ\.?\s*د\.?|الدكتورة|الدكتور|الأستاذة|الأستاذ|د\.?|أ\.?|م\.?)\s+/, '').trim().split(/\s+/);
          return parts[0] || '';
        },
        _shortRoom(location) {
          const loc = String(location || '').trim();
          if (!loc) return '';
          const tail = loc.split('-').pop().trim() || loc;
          return tail.length > 9 ? tail.split(/\s+/).pop() : tail;
        },
        _clockLabel(date) {
          if (!date) return '';
          const h = date.getHours() % 12 || 12;
          return h + ':' + String(date.getMinutes()).padStart(2, '0');
        },
        _toggleCompactCalendar() {
          this.state.userSettings.mobileCompactCalendar = !this._isCompactCalendar();
          this._saveSettings();
          this._applyCompactCalendar();
          this._showToast('info', this._isCompactCalendar() ? 'الجدول مصغّر — كل المقررات تظهر بلا تمرير.' : 'تم تكبير الجدول.');
        },
        _applyCompactCalendar() {
          if (!isMobile) return;
          const on = this._isCompactCalendar();
          document.body.classList.toggle('cal-compact', on);
          this._updateCompactCalendarBtn();
          if (on) { const wrap = document.querySelector('.mobile-calendar-scroll-wrapper'); if (wrap) wrap.scrollLeft = 0; }
          this._fitCompactCalendar();
          this._syncCalendarSizing();
          this._forceCalendarRelayout();
        },
        _updateCompactCalendarBtn() {
          const btn = this.dom.mobileCalendarZoomBtn;
          if (!btn) return;
          const on = this._isCompactCalendar();
          btn.innerHTML = on ? '<i class="ph ph-arrows-out-simple"></i>' : '<i class="ph ph-arrows-in-simple"></i>';
          btn.classList.toggle('is-on', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          btn.setAttribute('aria-label', on ? 'تكبير الجدول' : 'تصغير الجدول ليظهر كاملاً');
          btn.title = on ? 'تكبير الجدول' : 'تصغير الجدول ليظهر كاملاً';
          btn.onclick = () => this._toggleCompactCalendar();
        },
        _fitCompactCalendar(laneCount) {
          const root = this.dom.mobileCalendar;
          if (!root) return;
          const shell = root.closest('.calendar-wrapper');
          if (!this._isCompactCalendar()) {
            root.style.removeProperty('--m-cal-slot-h');
            if (shell) shell.style.removeProperty('--m-cal-pad-b');
            return;
          }
          const host = shell ? shell.parentElement : null;
          if (!shell || !host) return;
          const lanes = laneCount || root.querySelectorAll('.fc-timegrid-slot-lane').length;
          if (!lanes) return;
          const head = root.querySelector('.fc-scrollgrid-section-header');
          const headH = head ? head.getBoundingClientRect().height : 40;
          const avail = host.getBoundingClientRect().bottom - shell.getBoundingClientRect().top;
          if (avail <= 0) return;
          const slotH = Math.max(15, Math.floor((avail - headH - 14) / lanes));
          const gridH = headH + slotH * lanes;
          root.style.setProperty('--m-cal-slot-h', slotH + 'px');
          shell.style.setProperty('--m-cal-pad-b', Math.max(12, Math.floor(avail - gridH - 2)) + 'px');
        },
        _forceCalendarRelayout() {
          const cal = this.state.calendar;
          if (!cal) return;
          const fills = !!this._calFills;
          try { cal.setOption('expandRows', !fills); cal.setOption('expandRows', fills); cal.updateSize(); } catch (e) { }
        },
        _refitCompactCalendar() {
          if (!isMobile) return;
          const root = this.dom.mobileCalendar;
          const before = root ? root.style.getPropertyValue('--m-cal-slot-h') : '';
          this._fitCompactCalendar();
          const after = root ? root.style.getPropertyValue('--m-cal-slot-h') : '';
          if (after !== before) { this._forceCalendarRelayout(); return; }
          try { this.state.calendar?.updateSize(); } catch (e) { }
        },
        _syncCalendarSizing() {
          const cal = this.state.calendar;
          if (!cal) return;
          const fills = this._calendarFillsHeight();
          if (this._calFills === fills) return;
          this._calFills = fills;
          document.body.classList.toggle('cal-fills-height', fills);
          cal.setOption('expandRows', fills);
          cal.setOption('height', fills ? '100%' : 'auto');
          requestAnimationFrame(() => { try { cal.updateSize(); } catch (e) { } });
        },
        _initializeCalendar() {
          if (this.state.calendar) this.state.calendar.destroy();
          this._calFills = this._calendarFillsHeight();
          document.body.classList.toggle('cal-fills-height', this._calFills);
          document.body.classList.toggle('cal-compact', this._isCompactCalendar());
          const calendarEl = document.getElementById(isMobile ? 'mobile-calendar' : 'calendar');
          const calendarOptions = { initialView: 'timeGridWeek', locale: 'ar', direction: this.state.userSettings.timeAxisPosition === 'right' ? 'rtl' : 'ltr', headerToolbar: false, allDaySlot: false, events: [], dayHeaderFormat: { weekday: isMobile ? 'short' : 'long' }, slotMinTime: '08:00:00', slotMaxTime: '14:00:00', hiddenDays: this.state.userSettings.showWeekends ? [] : [5, 6], nowIndicator: false, height: this._calFills ? '100%' : 'auto', expandRows: this._calFills, dayCellDidMount: (arg) => { if (arg.isToday) arg.el.style.backgroundColor = 'transparent'; }, eventContent: (arg) => { const props = arg.event.extendedProps; const durMin = (arg.event.start && arg.event.end) ? Math.round((arg.event.end - arg.event.start) / 60000) : 999; const isShort = durMin <= 60; const wrapper = document.createElement('div'); wrapper.style.cssText = 'display: flex; flex-direction: column; height: 100%; overflow: hidden; font-size: ' + (isShort ? '0.66rem' : '0.8rem') + ';'; if (isShort) wrapper.classList.add('evt-1h'); const startTxt = this._clockLabel(arg.event.start); const endTxt = this._clockLabel(arg.event.end); wrapper.innerHTML = `<span class="evt-time evt-time-start">${startTxt}</span><span class="evt-time evt-time-end">${endTxt}</span><b style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-title); font-weight: 400;">${arg.event.title.split('(')[0].trim()}</b><small>${props.section} - ${props.instructor}</small><small class="evt-foot" style="margin-top: auto;"><span class="evt-loc"><i class="ph ph-map-pin"></i> ${props.location}</span><span class="evt-room">${this._shortRoom(props.location)}</span><span class="evt-teacher">${this._shortInstructor(props.instructor)}</span><span class="evt-code">${props.code}</span></small>`; return { domNodes: [wrapper] }; }, windowResize: () => { if (this.state.calendar) { this._fitCompactCalendar(); this._syncCalendarSizing(); this._forceCalendarRelayout(); } }, eventClick: (info) => { const p = info.event.extendedProps || {}; const sec = this.state.allCoursesData.find(c => c.uniqueId === p.uniqueId); if (!sec) return; const grp = this.state.groupedCourses[sec.code]; if (!grp) return; if (isMobile) { this._showMobileSectionDetails(sec, grp); } else { this._showSectionQuickView(sec, grp); } } };
          this.state.calendar = new FullCalendar.Calendar(calendarEl, calendarOptions);
          this.state.calendar.render();
          this._setupCalendarSizeGuard(calendarEl);
          if (isMobile) {
            this._updateCompactCalendarBtn();
            this._refitCompactCalendar();
            clearTimeout(this._compactSettleTimer);
            this._compactSettleTimer = setTimeout(() => this._refitCompactCalendar(), 350);
          }
        },
        _setupCalendarSizeGuard(calendarEl) {
          const sync = () => {
            if (this._calSizeRaf) cancelAnimationFrame(this._calSizeRaf);
            this._calSizeRaf = requestAnimationFrame(() => {
              if (document.body.classList.contains('exporting-image')) return;
              if (this._isCompactCalendar()) { this._refitCompactCalendar(); return; }
              try { this.state.calendar?.updateSize(); } catch (e) { }
            });
          };
          if (this._calSizeObserver) { try { this._calSizeObserver.disconnect(); } catch (e) { } this._calSizeObserver = null; }
          if (typeof ResizeObserver !== 'undefined') {
            this._calSizeObserver = new ResizeObserver(() => sync());
            if (calendarEl.parentElement) this._calSizeObserver.observe(calendarEl.parentElement);
            const card = calendarEl.closest('.calendar-wrapper');
            if (card && card !== calendarEl.parentElement) this._calSizeObserver.observe(card);
          }
          if (!this._calSizeGuardsBound) {
            this._calSizeGuardsBound = true;
            if (document.fonts && document.fonts.ready) { document.fonts.ready.then(sync).catch(() => { }); }
            document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
            window.addEventListener('pageshow', sync);
            window.addEventListener('focus', sync);
            if (window.visualViewport) { window.visualViewport.addEventListener('resize', sync); }
          }
        },
        _addSchedule(name, isDefault = false) {
          let scheduleName = name;
          if (!name) { const scheduleNumber = this.state.schedules.length + 1; scheduleName = `جدول ${scheduleNumber}`; }
          this.state.schedules.push({ name: scheduleName, sections: new Set(), linkedSections: new Map() });
          if (!isDefault) { this.state.activeScheduleIndex = this.state.schedules.length - 1; this.updateFullUI(); }
        },
        _switchSchedule(index) {
          if (index !== this.state.activeScheduleIndex && index >= 0 && index < this.state.schedules.length) { this.state.activeScheduleIndex = index; this.updateFullUI(); }
        },
        _deleteSchedule(index) {
          if (this.state.schedules.length <= 1) { this._showToast('error', 'لا يمكن حذف الجدول الوحيد.'); return; }
          const scheduleName = this.state.schedules[index].name;
          Swal.fire({ title: `حذف "${scheduleName}"؟`, text: "لا يمكن التراجع عن هذا الإجراء.", icon: 'warning', showCancelButton: true, customClass: { confirmButton: 'swal-danger' }, confirmButtonText: '<i class="ph ph-trash"></i> نعم، احذفه!', cancelButtonText: 'إلغاء' }).then((result) => { if (result.isConfirmed) { this.state.schedules.splice(index, 1); if (this.state.activeScheduleIndex >= index) { this.state.activeScheduleIndex = Math.max(0, this.state.activeScheduleIndex - 1); } this.updateFullUI(); this._showToast('success', 'تم حذف الجدول'); } });
        },
        _renameSchedule(index, newName) {
          const trimmedName = newName.trim();
          if (trimmedName && this.state.schedules[index]) { this.state.schedules[index].name = trimmedName; this._saveSchedules(); if (isMobile) this._updateMobileHeader(); } else { this._renderScheduleTabs(); }
        },
        _updateMobileHeader() {
          const activeNavBtn = document.querySelector('.mobile-nav-btn.active'); if (!activeNavBtn) return;
          const currentView = activeNavBtn.dataset.view;
          const titleEl = this.dom.mobileHeaderTitle;
          const subtitleEl = this.dom.mobileHeaderSubtitle;
          const actionBtn = this.dom.mobileDynamicActionBtn;
          const header = document.querySelector('.mobile-header');

          this._setMobileSearchOpen(false);
          const setSubtitle = text => { if (subtitleEl) subtitleEl.textContent = text || ''; };

          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const selectedSections = activeSchedule ? activeSchedule.sections : new Set();
          const selectedCourseDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const uniqueCodes = new Set(selectedCourseDetails.map(c => c.code));
          const totalCredits = this._totalCreditsOf(selectedCourseDetails);

          if (currentView === 'mobile-calendar-view') {
            titleEl.textContent = activeSchedule?.name || 'الجدول';
            setSubtitle(uniqueCodes.size ? `${uniqueCodes.size} ${this._coursesWord(uniqueCodes.size)} · ${this._hoursText(totalCredits)}` : 'لم تُضِف أي مقرر بعد');
            actionBtn.innerHTML = '<i class="ph ph-camera"></i>';
            actionBtn.style.display = 'flex';
            actionBtn.setAttribute('aria-label', 'حفظ الجدول كصورة');
            actionBtn.onclick = () => this._handleDownloadImage(true);
          } else if (currentView === 'mobile-courses-view') {
            titleEl.textContent = 'المقررات';
            const available = Object.keys(this.state.groupedCourses || {}).filter(code => !this.state.hiddenCourseCodes.has(code)).length;
            setSubtitle(available ? this._availableCoursesText(available) : 'في انتظار البيانات');
            actionBtn.innerHTML = '<i class="ph ph-magnifying-glass"></i>';
            actionBtn.style.display = 'flex';
            actionBtn.setAttribute('aria-label', 'بحث في المقررات');
            actionBtn.onclick = () => this._setMobileSearchOpen(true);
          } else if (currentView === 'mobile-my-schedule-view') {
            titleEl.textContent = activeSchedule?.name || 'جدولي';
            setSubtitle(uniqueCodes.size ? `${uniqueCodes.size} ${this._coursesWord(uniqueCodes.size)} · ${this._hoursText(totalCredits)}` : 'جدولك فارغ');
            actionBtn.innerHTML = '<i class="ph ph-copy"></i>';
            actionBtn.style.display = 'flex';
            actionBtn.setAttribute('aria-label', 'نسخ أرقام الشعب');
            actionBtn.onclick = () => this._handleCopyCRNs(selectedCourseDetails);
          } else if (currentView === 'mobile-my-exams-view') {
            titleEl.textContent = 'اختباراتي';
            const examCount = selectedCourseDetails.filter(c => c.examPeriodId).reduce((set, c) => set.add(c.code), new Set()).size;
            setSubtitle(examCount ? `${examCount} ${examCount === 1 ? 'اختبار' : examCount === 2 ? 'اختباران' : examCount <= 10 ? 'اختبارات' : 'اختباراً'}` : 'لا توجد اختبارات بعد');
            actionBtn.style.display = 'none';
          }

          if (header) header.classList.toggle('has-action', actionBtn.style.display !== 'none');
        },
        _coursesWord(n) { return n === 1 ? 'مقرر' : n === 2 ? 'مقرران' : n <= 10 ? 'مقررات' : 'مقرراً'; },
        _availableCoursesText(n) {
          if (n === 1) return 'مقرر واحد متاح';
          if (n === 2) return 'مقرران متاحان';
          if (n <= 10) return `${n} مقررات متاحة`;
          return `${n} مقرراً متاحاً`;
        },
        _setMobileSearchOpen(open) {
          const header = document.querySelector('.mobile-header');
          if (header) header.classList.toggle('searching', !!open);
          if (open) { setTimeout(() => this.dom.mobileSearchInput?.focus(), 60); }
        },
        _typeLabel(t) { const s = String(t || '').trim(); if (!s) return ''; return /محاضرة|نظري/.test(s) ? s.replace('محاضرة', 'نظري') : s; },
        _escapeHTML(str) { return String(str ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); },
        _adjustColorBrightness(hex, p) { if (!hex || hex.length < 7) return '#7f7f7f'; let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); p /= 100; r = Math.round(Math.min(255, Math.max(0, r * (1 + p)))); g = Math.round(Math.min(255, Math.max(0, g * (1 + p)))); b = Math.round(Math.min(255, Math.max(0, b * (1 + p)))); return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`; },
        _hexToRgb(hex) { let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '139, 92, 246'; },
        _hslToHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0'); return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`; },
        _pickCourseColor(usedColors, seedIndex) {
          const palette = this.constants.COLOR_PALETTE;
          for (let i = 0; i < palette.length; i++) {
            const candidate = palette[(seedIndex + i) % palette.length];
            if (!usedColors.has(candidate)) return candidate;
          }
          let hue = (seedIndex * 137.508) % 360;
          let candidate = this._hslToHex(hue, 65, 58);
          while (usedColors.has(candidate)) { hue = (hue + 137.508) % 360; candidate = this._hslToHex(hue, 65, 58); }
          return candidate;
        },
        _relLum(hex) { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || ''); if (!m) return 0; const c = [1, 2, 3].map(i => { let v = parseInt(m[i], 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; },
        _readableOn(hex) { return this._relLum(hex) > 0.45 ? '#101014' : '#ffffff'; },
        _hexToHue(H) { if (!H) return 257; let r = 0, g = 0, b = 0; if (H.length == 7) { r = parseInt("0x" + H.substring(1, 3)); g = parseInt("0x" + H.substring(3, 5)); b = parseInt("0x" + H.substring(5, 7)); } r /= 255; g /= 255; b /= 255; let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0; if (delta == 0) h = 0; else if (cmax == r) h = ((g - b) / delta) % 6; else if (cmax == g) h = (b - r) / delta + 2; else h = (r - g) / delta + 4; h = Math.round(h * 60); if (h < 0) h += 360; return h; },
        _showMobileSectionDetails(section, group, shouldUpdatePanel = true) {
          const panel = this.dom.detailsPanel; const activeSchedule = this.state.schedules[this.state.activeScheduleIndex]; const isSelected = activeSchedule.sections.has(section.uniqueId);
          const tempSelectedDetails = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const conflictDetails = isSelected ? [] : this._getConflictDetails(section, tempSelectedDetails);
          const isConflicted = conflictDetails.length > 0;
          const conflictBanner = this._buildConflictBanner(conflictDetails);
          const examDayBanner = isSelected ? '' : this._buildExamDayNotice(section, tempSelectedDetails);
          const courseSections = this._visibleSectionsOf(group);
          const currentIndex = courseSections.findIndex(s => s.uniqueId === section.uniqueId);
          const visibleGroups = Object.values(this.state.groupedCourses).filter(g => !this.state.hiddenCourseCodes.has(g.code) && this._visibleSectionsOf(g).length > 0).sort((a, b) => a.code.localeCompare(b.code));
          const courseIdx = visibleGroups.findIndex(g => g.code === group.code);
          const courseSwitcher = visibleGroups.length > 1 && courseIdx !== -1 ? `<div class="details-course-switcher"><button class="details-nav-btn" id="course-prev-btn" ${courseIdx <= 0 ? 'disabled' : ''} aria-label="المقرر السابق"><i class="ph ph-caret-right"></i></button><div class="cs-label"><span class="cs-title">التنقل بين المقررات</span><span class="cs-count">مقرر ${courseIdx + 1} من ${visibleGroups.length}</span></div><button class="details-nav-btn" id="course-next-btn" ${courseIdx >= visibleGroups.length - 1 ? 'disabled' : ''} aria-label="المقرر التالي"><i class="ph ph-caret-left"></i></button></div>` : '';
          this._sheetState = { section, group, courseSections, visibleGroups };
          const actionBtnText = isSelected ? "إزالة من الجدول" : "إضافة للجدول";
          const actionBtnClass = isSelected ? "remove" : "add";
          const actionBtnIcon = isSelected ? "ph ph-trash" : "ph ph-plus";
          const isOpen = section.status.includes('مفتوحة');
          const typeStr = this._typeLabel(section.type);
          const typeIcon = /عمل|معمل|مختبر/.test(typeStr) ? 'ph-flask' : /تمرين/.test(typeStr) ? 'ph-pencil-simple' : 'ph-chalkboard-simple';
          const typeChip = typeStr ? `<span class="details-type-chip"><i class="ph ${typeIcon}"></i> ${typeStr}</span>` : '';
          const timeStr = (section.time || '').replace(/<br>/g, ' / ') || 'غير محدد';
          const detailRow = (icon, label, value) => `<div class="details-row"><span class="details-row-icon"><i class="ph ${icon}"></i></span><div class="details-row-text"><span>${label}</span><strong>${value}</strong></div></div>`;
          const isFav = this._isFavInstructor(section.instructor);
          const instructorRow = `<div class="details-row"><span class="details-row-icon"><i class="ph ph-user"></i></span><div class="details-row-text"><span>المحاضر</span><strong>${this._escapeHTML(section.instructor || 'غير محدد')}</strong></div><button class="qv-btn qv-fav-btn ${isFav ? 'on' : ''}" id="sheet-fav-btn" style="flex:0 0 auto;padding:0.35rem 0.6rem;font-size:0.72rem;" aria-label="تفضيل المحاضر"><i class="${isFav ? 'ph-fill' : 'ph'} ph-star"></i></button></div>`;
          const noteText = (this.state.userSettings.courseNotes || {})[section.code] || '';
          const noteChip = `<button class="details-note-chip ${noteText ? 'has-note' : ''}" id="sheet-note-btn" aria-label="${noteText ? 'عرض وتعديل ملاحظتي على المقرر' : 'إضافة ملاحظة على المقرر'}"><i class="${noteText ? 'ph-fill ph-note' : 'ph ph-note-pencil'}"></i> ${noteText ? 'ملاحظتي' : 'ملاحظة'}</button>`;
          const previewChip = `<button class="details-note-chip sheet-preview-chip" id="sheet-preview-btn" aria-label="معاينة الجدول مع هذه الشعبة"><i class="ph ph-squares-four"></i> معاينة</button>`;
          panel.innerHTML = `<div class="details-grabber"></div><div class="details-body"><div class="details-header"><div class="details-title-wrap"><span class="color-dot" style="background-color: ${group.color};"></span><div class="details-title-text"><h4>${this._escapeHTML(section.name)} (${this._escapeHTML(section.code)})</h4><span class="details-eyebrow">شعبة ${this._escapeHTML(section.section)}</span></div></div><button class="details-close-btn" aria-label="إغلاق"><i class="ph ph-x"></i></button></div>${courseSwitcher}${conflictBanner}${examDayBanner}<div class="details-status-row"><span class="status-badge status-${isOpen ? 'open' : 'closed'}">${this._escapeHTML(section.status)}</span>${this._watchChipHTML(section)}${typeChip}${noteChip}${previewChip}</div><div class="details-list">${instructorRow}${detailRow('ph-clock', 'المواعيد', timeStr)}${detailRow('ph-map-pin', 'المكان', this._escapeHTML(section.location || 'غير محدد'))}${detailRow('ph-file-text', 'الاختبار النهائي', this._escapeHTML(section.examPeriodId || 'لا يوجد'))}</div><div class="details-footer"><div class="details-stepper"><button class="details-nav-btn" id="details-prev-btn" ${currentIndex <= 0 ? 'disabled' : ''} aria-label="الشعبة السابقة"><i class="ph ph-caret-right"></i></button><span class="details-counter">${currentIndex + 1} من ${courseSections.length}</span><button class="details-nav-btn" id="details-next-btn" ${currentIndex >= courseSections.length - 1 ? 'disabled' : ''} aria-label="الشعبة التالية"><i class="ph ph-caret-left"></i></button></div><button class="details-action-btn ${actionBtnClass}" id="details-action-btn"><i class="${actionBtnIcon}"></i> ${actionBtnText}</button></div></div>`;
          panel.querySelector('.details-close-btn').onclick = () => this._hideMobileSectionDetails();
          panel.querySelector('#details-action-btn').onclick = () => {
            if (activeSchedule.sections.has(section.uniqueId)) {
              this._removeWithUndo(section.uniqueId, activeSchedule);
              this._showMobileSectionDetails(section, group, false);
            } else if (this._addSectionAndLink(section.uniqueId, activeSchedule)) {
              this._vibrate(12); this.updateCalendarAndConflicts(); this._showMobileSectionDetails(section, group, false);
            }
          };
          const prevBtn = panel.querySelector('#details-prev-btn'); if (prevBtn) { prevBtn.onclick = () => { if (currentIndex > 0) this._showMobileSectionDetails(courseSections[currentIndex - 1], group, true) }; }
          const nextBtn = panel.querySelector('#details-next-btn'); if (nextBtn) { nextBtn.onclick = () => { if (currentIndex < courseSections.length - 1) this._showMobileSectionDetails(courseSections[currentIndex + 1], group, true) }; }
          const favBtn = panel.querySelector('#sheet-fav-btn'); if (favBtn) { favBtn.onclick = () => { this._toggleFavInstructor(section.instructor); this._showMobileSectionDetails(section, group, false); }; }
          const noteBtn = panel.querySelector('#sheet-note-btn'); if (noteBtn) { noteBtn.onclick = () => this._editCourseNote(section.code, () => this._showMobileSectionDetails(section, group, false)); }
          const previewBtn = panel.querySelector('#sheet-preview-btn'); if (previewBtn) { previewBtn.onclick = () => this._showSectionSchedulePreview(section); }
          const cPrevBtn = panel.querySelector('#course-prev-btn'); if (cPrevBtn) { cPrevBtn.onclick = () => this._courseNavigate(-1); }
          const cNextBtn = panel.querySelector('#course-next-btn'); if (cNextBtn) { cNextBtn.onclick = () => this._courseNavigate(1); }
          const bodyEl = panel.querySelector('.details-body'); if (bodyEl && shouldUpdatePanel) bodyEl.scrollTop = 0;
          this.dom.mobileSectionDetailsOverlay.classList.add('open');
        },
        _qaPreviewCompanions(section, selectedIds) {
          if (!this.state.userSettings.quickAddMode) return [];
          const ordered = this.state.groupedCourses[section.code]?.sections || [];
          const idx = ordered.findIndex(s => s.uniqueId === section.uniqueId);
          if (idx === -1 || !ordered.some(s => this._qaCompanion(s)) || !ordered.some(s => !this._qaCompanion(s))) return [];
          const skip = s => selectedIds.has(s.uniqueId) || (this.state.userSettings.hideClosedCourses && String(s.status || '').includes('مغلقة'));
          if (this._qaCompanion(section)) {
            let p = idx - 1;
            while (p >= 0 && this._qaCompanion(ordered[p])) p--;
            if (p < 0 || skip(ordered[p])) return [];
            return [ordered[p]];
          }
          const companions = [];
          for (let i = idx + 1; i < ordered.length; i++) { if (!this._qaCompanion(ordered[i])) break; companions.push(ordered[i]); }
          const typeGroups = new Map();
          companions.filter(c => !skip(c)).forEach(c => { const k = this._typeLabel(c.type) || 'مرافقة'; if (!typeGroups.has(k)) typeGroups.set(k, []); typeGroups.get(k).push(c); });
          const picked = [];
          typeGroups.forEach(arr => { if (arr.length === 1) picked.push(arr[0]); });
          return picked;
        },
        _sectionPreviewList(section) {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const selected = activeSchedule
            ? Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean)
            : [];
          if (selected.some(s => s.uniqueId === section.uniqueId)) return { list: selected, replaced: false, already: true, extras: [], dropped: [] };
          const extras = this._qaPreviewCompanions(section, new Set(selected.map(s => s.uniqueId)));
          const added = [section].concat(extras);
          const keys = new Set(added.map(s => s.code + '|' + this._canonType(s.type)));
          const kept = selected.filter(s => !keys.has(s.code + '|' + this._canonType(s.type)));
          const dropped = selected.filter(s => keys.has(s.code + '|' + this._canonType(s.type)));
          return { list: kept.concat(added), replaced: dropped.length > 0, already: false, extras, dropped };
        },
        _showSectionSchedulePreview(section) {
          const { list, replaced, already, extras, dropped } = this._sectionPreviewList(section);
          const conflictMap = this._calculateConflicts(list);
          const added = [section].concat(extras);
          const secLabel = s => `شعبة ${this._escapeHTML(String(s.section))}${this._typeLabel(s.type) ? ` (${this._escapeHTML(this._typeLabel(s.type))})` : ''}`;
          const clashing = added.filter(s => conflictMap.has(s.uniqueId));
          const clashTxt = clashing.some(s => s.uniqueId === section.uniqueId)
            ? (clashing.length > 1 ? 'هذه الشعبة والمرافقة لها تتعارضان مع جدولك.' : 'هذه الشعبة تتعارض مع جدولك.')
            : `الشعبة المرافقة ${clashing.map(secLabel).join(' و')} تتعارض مع جدولك.`;
          const droppedTxt = dropped.map(s => `${this._typeLabel(s.type) || ''} ${s.code}`.trim()).join(' و');
          const note = already
            ? 'هذه الشعبة مضافة في جدولك حالياً.'
            : replaced
              ? `المعاينة تستبدل ${this._escapeHTML(droppedTxt)} المضاف في جدولك ${dropped.length > 1 ? 'بهذه الشعب.' : 'بهذه الشعبة.'}`
              : 'المعاينة تُظهر جدولك بعد إضافة هذه الشعبة.';
          const banner = clashing.length
            ? `<div class="sp-note warn"><i class="ph-fill ph-warning"></i> ${clashTxt}</div>`
            : `<div class="sp-note"><i class="ph ph-info"></i> ${note}</div>`;
          const qaBanner = extras.length ? `<div class="sp-note"><i class="ph ph-lightning"></i> الإضافة السريعة تضيف معها ${extras.map(secLabel).join(' و')}، والمعاينة تُظهر الجدول بعد الإضافة.</div>` : '';
          Swal.fire({
            title: `${this._escapeHTML(section.name)} — شعبة ${this._escapeHTML(section.section)}`,
            html: `<div class="gen-summary custom-scrollbar">${banner}${qaBanner}${this._previewGridHTML(list)}</div>`,
            showConfirmButton: false,
            showCloseButton: true,
            width: 'auto',
            customClass: { popup: 'swal2-popup gen-preview-swal sheet-preview-swal' }
          });
        },
        _hideMobileSectionDetails() { this.dom.mobileSectionDetailsOverlay.classList.remove('open'); },
        _initSheetSwipe() {
          const panel = this.dom.detailsPanel; if (!panel) return;
          let startX = 0, startY = 0, curX = 0, curY = 0, dragging = false;
          panel.addEventListener('touchstart', (e) => { if (e.target.closest('button')) return; startX = curX = e.touches[0].clientX; startY = curY = e.touches[0].clientY; dragging = true; panel.style.transition = 'none'; }, { passive: true });
          const atTop = () => { const body = panel.querySelector('.details-body'); return !body || body.scrollTop <= 0; };
          panel.addEventListener('touchmove', (e) => { if (!dragging) return; curX = e.touches[0].clientX; curY = e.touches[0].clientY; const dy = curY - startY; if (dy > 0 && atTop() && Math.abs(dy) > Math.abs(curX - startX)) panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
          panel.addEventListener('touchend', () => {
            if (!dragging) return; dragging = false;
            const dy = curY - startY, dx = curX - startX;
            panel.style.transition = ''; panel.style.transform = '';
            if (dy > 90 && atTop() && Math.abs(dy) > Math.abs(dx)) { this._hideMobileSectionDetails(); return; }
            if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) { this._sheetNavigate(dx > 0 ? -1 : 1); }
          });
        },
        _initLongPressQuickAdd() {
          const list = this.dom.mobileCoursesList; if (!list) return;
          let timer = null, sx = 0, sy = 0;
          const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
          list.addEventListener('touchstart', (e) => {
            this._suppressSectionClick = false;
            const btn = e.target.closest('.section-btn'); if (!btn) return;
            sx = e.touches[0].clientX; sy = e.touches[0].clientY;
            timer = setTimeout(() => { timer = null; this._suppressSectionClick = true; this._quickToggleSection(btn); }, 450);
          }, { passive: true });
          list.addEventListener('touchmove', (e) => { if (!timer) return; const t = e.touches[0]; if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) clear(); }, { passive: true });
          list.addEventListener('touchend', clear);
          list.addEventListener('touchcancel', clear);
        },
        _quickToggleSection(btn) {
          const uniqueId = btn.dataset.uniqueId;
          const section = this.state.allCoursesData.find(c => c.uniqueId === uniqueId); if (!section) return;
          const schedule = this.state.schedules[this.state.activeScheduleIndex]; if (!schedule) return;
          if (schedule.sections.has(uniqueId)) { this._removeWithUndo(uniqueId, schedule); }
          else {
            this._addSectionAndLink(uniqueId, schedule); this.updateCalendarAndConflicts(); this._vibrate(20);
            btn.classList.remove('quick-added'); void btn.offsetWidth; btn.classList.add('quick-added');
            this._showToast('success', 'تمت الإضافة للجدول');
          }
        },
        _getPluralizedSectionString(count) { if (count === 1) return "شعبة واحدة"; if (count === 2) return "شعبتين"; if (count >= 3 && count <= 10) return `${count} شعب`; return `${count} شعبة`; },
        _conflictWithHTML(rels) {
          if (!rels.length) return '';
          const rows = rels.map(rel => {
            const secLabel = s => `${this._typeLabel(s.type) ? this._typeLabel(s.type) + ' · ' : ''}شعبة ${s.section}`;
            const secChips = rel.sections.map(s => `<span class="cx-row-sec">${this._escapeHTML(secLabel(s))}</span>`).join('');
            const tags = `${rel.time.length ? '<span class="cx-tag time"><i class="ph-fill ph-clock"></i>وقت</span>' : ''}${rel.exam ? '<span class="cx-tag exam"><i class="ph-fill ph-file-text"></i>اختبار</span>' : ''}`;
            const multi = rel.sections.length > 1;
            const why = rel.time.map(t => `<div class="cx-why-line"><i class="ph-fill ph-clock cx-i-time"></i>${multi ? `${this._escapeHTML(secLabel(t.other))}<i class="cx-dot"></i>` : ''}${this._escapeHTML(t.day)}<i class="cx-dot"></i>${this._formatClock(t.from)} – ${this._formatClock(t.to)}<i class="cx-dot"></i>${this._formatDuration(t.mins)}</div>`);
            if (rel.exam) {
              const samePeriod = String(rel.exam.period) === String(rel.exam.otherPeriod);
              const txt = samePeriod
                ? `نفس فترة الاختبار النهائي<i class="cx-dot"></i>الفترة ${this._escapeHTML(String(rel.exam.period))}`
                : `تداخل وقت الاختبار النهائي<i class="cx-dot"></i>الفترة ${this._escapeHTML(String(rel.exam.period))} مع ${this._escapeHTML(String(rel.exam.otherPeriod))}${rel.exam.overlapMins ? `<i class="cx-dot"></i>${this._formatDuration(rel.exam.overlapMins)}` : ''}`;
              why.push(`<div class="cx-why-line"><i class="ph-fill ph-file-text cx-i-exam"></i>${txt}${multi ? `<i class="cx-dot"></i>اختبار واحد لكل شعب المقرر` : ''}</div>`);
            }
            return `<div class="cx-row"><div class="cx-row-top"><span class="cx-row-name">${this._escapeHTML(rel.other.name)}</span>${secChips}<span class="cx-row-tags">${tags}</span></div><div class="cx-why">${why.join('')}</div></div>`;
          }).join('');
          const n = rels.length;
          const count = n === 1 ? 'يتعارض مع مقرر واحد' : n === 2 ? 'يتعارض مع مقررين' : `يتعارض مع ${n} مقررات`;
          const hasTime = rels.some(r => r.time.length), hasExam = rels.some(r => r.exam);
          const kind = hasTime && hasExam ? ' بالاختبار والوقت' : hasExam ? ' بالاختبار' : ' بالوقت';
          return `<div class="cx-with"><div class="cx-with-head">${count}${kind}</div>${rows}</div>`;
        },
        _conflictEdges(group) {
          const edges = [];
          for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) if (this._isSectionConflicted(group[i], [group[j]])) edges.push([i, j]);
          return edges;
        },
        _minRemovalSet(group) {
          const n = group.length;
          const edges = this._conflictEdges(group);
          if (!edges.length) return [];
          const deg = new Array(n).fill(0);
          edges.forEach(e => { deg[e[0]]++; deg[e[1]]++; });
          const order = group.map((_, i) => i).sort((a, b) => deg[b] - deg[a] || a - b);
          const covers = mask => edges.every(e => ((mask >> e[0]) & 1) || ((mask >> e[1]) & 1));
          if (n <= 16) {
            for (let k = 1; k <= n; k++) {
              const idx = Array.from({ length: k }, (_, i) => i);
              for (;;) {
                let mask = 0;
                for (let i = 0; i < k; i++) mask |= 1 << order[idx[i]];
                if (covers(mask)) return idx.map(i => group[order[i]]);
                let p = k - 1;
                while (p >= 0 && idx[p] === n - k + p) p--;
                if (p < 0) break;
                idx[p]++;
                for (let q = p + 1; q < k; q++) idx[q] = idx[q - 1] + 1;
              }
            }
          }
          const rest = edges.slice(), chosen = [];
          while (rest.length) {
            const d = new Array(n).fill(0);
            rest.forEach(e => { d[e[0]]++; d[e[1]]++; });
            let best = 0;
            for (let i = 1; i < n; i++) if (d[i] > d[best]) best = i;
            chosen.push(best);
            for (let i = rest.length - 1; i >= 0; i--) if (rest[i][0] === best || rest[i][1] === best) rest.splice(i, 1);
          }
          return chosen.map(i => group[i]);
        },
        _updateConflictModalState(popup, groups) {
          let total = 0;
          groups.forEach((group, gi) => {
            const checked = new Set(Array.from(popup.querySelectorAll(`.conflict-remove-check[data-group="${gi}"]:checked`)).map(i => i.value));
            total += checked.size;
            const status = popup.querySelector(`.cx-status[data-group="${gi}"]`);
            if (!status) return;
            if (!checked.size) { status.className = 'cx-status warn'; status.innerHTML = '<i class="ph-fill ph-warning-circle"></i><span>لم تحدد أي شعبة — سيبقى التعارض كما هو</span>'; return; }
            const remaining = group.filter(s => !checked.has(s.uniqueId));
            const left = this._calculateConflicts(remaining);
            if (!left.size) { status.className = 'cx-status ok'; status.innerHTML = `<i class="ph-fill ph-check-circle"></i><span>${checked.size === 1 ? 'بحذف شعبة واحدة فقط' : `بحذف ${this._getPluralizedSectionString(checked.size)}`} ينتهي تعارض هذه المجموعة</span>`; return; }
            const names = Array.from(new Set(Array.from(left.keys()).map(id => (remaining.find(r => r.uniqueId === id) || {}).name).filter(Boolean)));
            status.className = 'cx-status warn';
            status.innerHTML = `<i class="ph-fill ph-warning-circle"></i><span>سيبقى تعارض بين ${this._escapeHTML(names.join(' و '))}</span>`;
          });
          const btn = Swal.getConfirmButton();
          if (btn) btn.textContent = total ? `حذف ${this._getPluralizedSectionString(total)}` : 'بدون تغيير';
        },
        _handleViewAllConflicts(conflictMap) {
          const allConflictingIds = new Set(conflictMap.keys());
          const conflictingSections = Array.from(allConflictingIds).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const visited = new Set(); const conflictGroups = [];
          conflictingSections.forEach(section => {
            if (!visited.has(section.uniqueId)) {
              const group = new Set([section]); visited.add(section.uniqueId); const queue = [section];
              while (queue.length > 0) {
                const current = queue.shift();
                conflictingSections.forEach(other => { if (!visited.has(other.uniqueId)) { if (this._isSectionConflicted(current, [other])) { visited.add(other.uniqueId); group.add(other); queue.push(other); } } });
              }
              if (group.size > 1) conflictGroups.push(Array.from(group));
            }
          });
          const modalHTML = conflictGroups.map((group, groupIndex) => {
            const relsById = new Map(group.map(s => [s.uniqueId, this._conflictRelations(s, group)]));
            const isTime = group.some(s => relsById.get(s.uniqueId).some(r => r.time.length));
            const isExam = group.some(s => relsById.get(s.uniqueId).some(r => r.exam));
            const kindsHTML = `<span class="cx-kinds">${isTime ? '<span class="cx-tag time"><i class="ph-fill ph-clock"></i>وقت</span>' : ''}${isExam ? '<span class="cx-tag exam"><i class="ph-fill ph-file-text"></i>اختبار</span>' : ''}</span>`;
            const soloFix = new Set(group.filter(s => this._calculateConflicts(group.filter(o => o.uniqueId !== s.uniqueId)).size === 0).map(s => s.uniqueId));
            const minSet = this._minRemovalSet(group);
            const suggested = new Set(minSet.map(s => s.uniqueId));
            const single = minSet.length === 1;
            const allSolo = soloFix.size === group.length;
            const ordered = group.slice().sort((a, b) => (soloFix.has(b.uniqueId) ? 1 : 0) - (soloFix.has(a.uniqueId) ? 1 : 0) || relsById.get(b.uniqueId).length - relsById.get(a.uniqueId).length || a.code.localeCompare(b.code));
            const groupItemsHTML = ordered.map(section => {
              const rels = relsById.get(section.uniqueId) || [];
              const typeStr = this._typeLabel(section.type);
              const metaTxt = `${section.code}${typeStr ? ' · ' + typeStr : ''} · شعبة ${section.section}`;
              const examRow = section.examPeriodId ? `<div><strong>الاختبار النهائي:</strong> ${this._examSummaryText(section.examPeriodId)}</div>` : '';
              const soloHint = (!allSolo && soloFix.has(section.uniqueId)) ? '<div class="cx-solo"><i class="ph-fill ph-lightbulb"></i>حذف هذه الشعبة وحدها يكفي لحل المجموعة</div>' : '';
              return `<div class="cx-card${single ? ' single' : ''}"><label class="cx-pick"><input type="${single ? 'radio' : 'checkbox'}"${single ? ` name="cx-group-${groupIndex}"` : ''} class="conflict-remove-check" data-group="${groupIndex}" value="${this._escapeHTML(section.uniqueId)}" ${suggested.has(section.uniqueId) ? 'checked' : ''}><span class="cx-box"><svg class="cx-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"></path></svg></span><span class="cx-info"><span class="cx-title">${this._escapeHTML(section.name)}</span><span class="cx-meta">${this._escapeHTML(metaTxt)}</span></span><span class="cx-flag">سيُحذف</span></label>${this._conflictWithHTML(rels)}${soloHint}<div class="cx-own">${examRow}<div><strong>المواعيد:</strong> ${this._escapeHTML(String(section.time || '').replace(/<br>/g, ' / ') || 'غير محدد')}</div></div><button type="button" class="cx-more"><span class="cx-more-show">عرض تفاصيل التعارض</span><span class="cx-more-hide">إخفاء التفاصيل</span><i class="ph-fill ph-caret-down"></i></button></div>`;
            }).join('');
            const noteHTML = single ? `<p class="cx-note">${allSolo ? 'يكفي حذف شعبة واحدة — اختر أي واحدة منها' : 'يكفي حذف شعبة واحدة — اختر واحدة'}</p>` : '';
            return `<section class="cx-group"><div class="cx-group-head"><span class="cx-group-name">مجموعة التعارض ${groupIndex + 1}</span>${kindsHTML}</div>${noteHTML}<div class="cx-cards">${groupItemsHTML}</div><div class="cx-status" data-group="${groupIndex}"></div></section>`;
          }).join('');
          const hintHTML = '<p class="cx-hint">حدد الشعب التي تريد <strong>حذفها</strong> — الاختيار المقترح هو أقل عدد يحل التعارض، وتقدر تغيّره.</p>';
          Swal.fire({
            title: 'حل جميع التعارضات', html: `<div id="conflict-modal-content" class="custom-scrollbar">${modalHTML ? hintHTML + modalHTML : '<p>لا توجد مجموعات تعارض واضحة.</p>'}</div>`, icon: 'warning', confirmButtonText: 'حذف المحدد', showCancelButton: true, cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-popup wide-swal conflict-swal' },
            didOpen: (popup) => {
              popup.querySelectorAll('.cx-more').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); btn.closest('.cx-card').classList.toggle('is-open'); }); });
              popup.querySelectorAll('.conflict-remove-check').forEach(inp => inp.addEventListener('change', () => this._updateConflictModalState(popup, conflictGroups)));
              popup.querySelectorAll('.cx-card.single .cx-pick').forEach(lab => {
                const inp = lab.querySelector('input');
                lab.addEventListener('pointerdown', () => { lab.dataset.pre = inp.checked ? '1' : '0'; });
                lab.addEventListener('click', (e) => { if (lab.dataset.pre === '1') { e.preventDefault(); inp.checked = false; this._updateConflictModalState(popup, conflictGroups); } lab.dataset.pre = '0'; });
              });
              this._updateConflictModalState(popup, conflictGroups);
            },
            preConfirm: () => Array.from(Swal.getPopup().querySelectorAll('.conflict-remove-check:checked')).map(i => i.value)
          }).then((result) => {
            if (result.isConfirmed && Array.isArray(result.value)) {
              const sectionsToRemove = result.value;
              if (sectionsToRemove.length > 0) {
                const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
                sectionsToRemove.forEach(id => this._removeSectionAndUnlink(id, activeSchedule));
                this.updateFullUI();
                const pluralizedString = this._getPluralizedSectionString(sectionsToRemove.length);
                const left = this._calculateConflicts(Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean));
                if (left.size) this._showToast('warning', `تمت إزالة ${pluralizedString} — وما زال في جدولك تعارض.`);
                else this._showToast('success', `تم حل جميع التعارضات وإزالة ${pluralizedString}.`);
              } else { this._showToast('info', 'لم يتم إجراء أي تغييرات.'); }
            }
          });
        },
      });

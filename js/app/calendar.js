Object.assign(QU_ScheduleApp, {
        _initializeCalendar() {
          if (this.state.calendar) this.state.calendar.destroy();
          const calendarEl = document.getElementById(isMobile ? 'mobile-calendar' : 'calendar');
          const calendarOptions = { initialView: 'timeGridWeek', locale: 'ar', direction: this.state.userSettings.timeAxisPosition === 'right' ? 'rtl' : 'ltr', headerToolbar: false, allDaySlot: false, events: [], dayHeaderFormat: { weekday: isMobile ? 'short' : 'long' }, slotMinTime: '08:00:00', slotMaxTime: '14:00:00', hiddenDays: this.state.userSettings.showWeekends ? [] : [5, 6], nowIndicator: false, height: isMobile ? 'auto' : '100%', expandRows: !isMobile, dayCellDidMount: (arg) => { if (arg.isToday) arg.el.style.backgroundColor = 'transparent'; }, eventContent: (arg) => { const props = arg.event.extendedProps; const durMin = (arg.event.start && arg.event.end) ? Math.round((arg.event.end - arg.event.start) / 60000) : 999; const isShort = durMin <= 60; const wrapper = document.createElement('div'); wrapper.style.cssText = 'display: flex; flex-direction: column; height: 100%; overflow: hidden; font-size: ' + (isShort ? '0.66rem' : '0.8rem') + '; line-height: ' + (isShort ? '1.2' : '1.4') + ';'; if (isShort) wrapper.classList.add('evt-1h'); wrapper.innerHTML = `<b style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-title); font-weight: 400;">${arg.event.title.split('(')[0].trim()}</b><small>${props.section} - ${props.instructor}</small><small class="evt-foot" style="margin-top: auto;"><span class="evt-loc"><i class="ph ph-map-pin"></i> ${props.location}</span><span class="evt-code">${props.code}</span></small>`; return { domNodes: [wrapper] }; }, windowResize: () => { if (this.state.calendar) this.state.calendar.updateSize(); }, eventClick: (info) => { const p = info.event.extendedProps || {}; const sec = this.state.allCoursesData.find(c => c.uniqueId === p.uniqueId); if (!sec) return; const grp = this.state.groupedCourses[sec.code]; if (!grp) return; if (isMobile) { this._showMobileSectionDetails(sec, grp); } else { this._showSectionQuickView(sec, grp); } } };
          this.state.calendar = new FullCalendar.Calendar(calendarEl, calendarOptions);
          this.state.calendar.render();
          this._setupCalendarSizeGuard(calendarEl);
        },
        _setupCalendarSizeGuard(calendarEl) {
          const sync = () => {
            if (this._calSizeRaf) cancelAnimationFrame(this._calSizeRaf);
            this._calSizeRaf = requestAnimationFrame(() => {
              if (document.body.classList.contains('exporting-image')) return;
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
          panel.innerHTML = `<div class="details-grabber"></div><div class="details-body"><div class="details-header"><div class="details-title-wrap"><span class="color-dot" style="background-color: ${group.color};"></span><div class="details-title-text"><h4>${this._escapeHTML(section.name)} (${this._escapeHTML(section.code)})</h4><span class="details-eyebrow">شعبة ${this._escapeHTML(section.section)}</span></div></div><button class="details-close-btn" aria-label="إغلاق"><i class="ph ph-x"></i></button></div>${courseSwitcher}${conflictBanner}${examDayBanner}<div class="details-status-row"><span class="status-badge status-${isOpen ? 'open' : 'closed'}">${this._escapeHTML(section.status)}</span>${typeChip}${noteChip}${previewChip}</div><div class="details-list">${instructorRow}${detailRow('ph-clock', 'المواعيد', timeStr)}${detailRow('ph-map-pin', 'المكان', this._escapeHTML(section.location || 'غير محدد'))}${detailRow('ph-file-text', 'الاختبار النهائي', this._escapeHTML(section.examPeriodId || 'لا يوجد'))}</div><div class="details-footer"><div class="details-stepper"><button class="details-nav-btn" id="details-prev-btn" ${currentIndex <= 0 ? 'disabled' : ''} aria-label="الشعبة السابقة"><i class="ph ph-caret-right"></i></button><span class="details-counter">${currentIndex + 1} من ${courseSections.length}</span><button class="details-nav-btn" id="details-next-btn" ${currentIndex >= courseSections.length - 1 ? 'disabled' : ''} aria-label="الشعبة التالية"><i class="ph ph-caret-left"></i></button></div><button class="details-action-btn ${actionBtnClass}" id="details-action-btn"><i class="${actionBtnIcon}"></i> ${actionBtnText}</button></div></div>`;
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
        _sectionPreviewList(section) {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const selected = activeSchedule
            ? Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean)
            : [];
          if (selected.some(s => s.uniqueId === section.uniqueId)) return { list: selected, replaced: false, already: true };
          const type = this._canonType(section.type);
          const kept = selected.filter(s => !(s.code === section.code && this._canonType(s.type) === type));
          return { list: kept.concat([section]), replaced: kept.length !== selected.length, already: false };
        },
        _showSectionSchedulePreview(section) {
          const { list, replaced, already } = this._sectionPreviewList(section);
          const conflictMap = this._calculateConflicts(list);
          const clash = conflictMap.has(section.uniqueId);
          const typeStr = this._typeLabel(section.type) || '';
          const note = already
            ? 'هذه الشعبة مضافة في جدولك حالياً.'
            : replaced
              ? `المعاينة تستبدل ${this._escapeHTML(typeStr)} ${this._escapeHTML(section.code)} المضاف في جدولك بهذه الشعبة.`
              : 'المعاينة تُظهر جدولك بعد إضافة هذه الشعبة.';
          const banner = clash
            ? `<div class="sp-note warn"><i class="ph-fill ph-warning"></i> هذه الشعبة تتعارض مع جدولك.</div>`
            : `<div class="sp-note"><i class="ph ph-info"></i> ${note}</div>`;
          Swal.fire({
            title: `${this._escapeHTML(section.name)} — شعبة ${this._escapeHTML(section.section)}`,
            html: `<div class="gen-summary custom-scrollbar">${banner}${this._previewGridHTML(list)}</div>`,
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
        _conflictRelChipsHTML(rels) {
          if (!rels.length) return '';
          const chips = rels.map(rel => {
            const kind = rel.time.length && rel.exam ? 'both' : rel.exam ? 'exam' : 'time';
            const icons = `${rel.time.length ? '<i class="ph-fill ph-clock"></i>' : ''}${rel.exam ? '<i class="ph-fill ph-file-text"></i>' : ''}`;
            const why = kind === 'both' ? 'تعارض وقت واختبار' : kind === 'exam' ? 'تعارض اختبار نهائي' : 'تعارض وقت محاضرة';
            return `<span class="ci-rel-chip ${kind}" title="${this._escapeHTML(`${why} مع ${rel.other.name} — شعبة ${rel.other.section}`)}">${icons}<span class="ci-rel-name">${this._escapeHTML(rel.other.name)}</span></span>`;
          }).join('');
          const n = rels.length;
          const label = n === 1 ? 'يتعارض مع' : n === 2 ? 'يتعارض مع مقررين' : `يتعارض مع ${n} مقررات`;
          return `<div class="ci-rels"><span class="ci-rels-label">${label}</span>${chips}</div>`;
        },
        _conflictRelRowsHTML(rels) {
          if (!rels.length) return '';
          const rows = rels.map(rel => {
            const lines = rel.time.map(t => `<div class="cr-line"><span class="cr-kind time"><i class="ph-fill ph-clock"></i>وقت</span><span class="cr-text">${this._escapeHTML(t.day)}<i class="cr-dot"></i>${this._formatClock(t.from)} – ${this._formatClock(t.to)}<i class="cr-dot"></i>${this._formatDuration(t.mins)}</span></div>`);
            if (rel.exam) {
              const samePeriod = String(rel.exam.period) === String(rel.exam.otherPeriod);
              const txt = samePeriod
                ? `نفس فترة الاختبار النهائي<i class="cr-dot"></i>الفترة ${this._escapeHTML(String(rel.exam.period))}`
                : `تداخل وقت الاختبار النهائي<i class="cr-dot"></i>الفترة ${this._escapeHTML(String(rel.exam.period))} مع ${this._escapeHTML(String(rel.exam.otherPeriod))}${rel.exam.overlapMins ? `<i class="cr-dot"></i>${this._formatDuration(rel.exam.overlapMins)}` : ''}`;
              lines.push(`<div class="cr-line"><span class="cr-kind exam"><i class="ph-fill ph-file-text"></i>اختبار</span><span class="cr-text">${txt}</span></div>`);
            }
            return `<div class="cr-row"><div class="cr-title">${this._escapeHTML(rel.other.name)}<span class="cr-sec">شعبة ${this._escapeHTML(rel.other.section)}</span></div>${lines.join('')}</div>`;
          }).join('');
          return `<div class="cr-head">أسباب التعارض</div><div class="cr-list">${rows}</div>`;
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
            const kindsHTML = `<span class="cg-kinds">${isTime ? '<span class="cg-kind time"><i class="ph-fill ph-clock"></i>وقت</span>' : ''}${isExam ? '<span class="cg-kind exam"><i class="ph-fill ph-file-text"></i>اختبار</span>' : ''}</span>`;
            const groupItemsHTML = group.sort((a, b) => a.code.localeCompare(b.code)).map((section, itemIndex) => {
              const detailsId = `details-${groupIndex}-${itemIndex}`;
              const rels = relsById.get(section.uniqueId) || [];
              const examRow = section.examPeriodId ? `<div><strong>الاختبار النهائي:</strong> ${this._examSummaryText(section.examPeriodId)}</div>` : '';
              return `<div class="conflict-item"><div class="conflict-item-flex"><label class="conflict-item-main-label"><input type="radio" name="conflict-group-${groupIndex}" value="${this._escapeHTML(section.uniqueId)}" ${itemIndex === 0 ? 'checked' : ''}><div class="custom-radio"></div><div class="conflict-item-info"><h4>${this._escapeHTML(section.name)}</h4><span>${this._escapeHTML(section.code)} - شعبة ${this._escapeHTML(section.section)}</span>${this._conflictRelChipsHTML(rels)}</div></label><button type="button" class="conflict-details-btn" data-details-id="${detailsId}">تفاصيل</button></div><div class="conflict-extra-details" id="${detailsId}">${this._conflictRelRowsHTML(rels)}<div class="cr-own">${examRow}<div><strong>المواعيد:</strong> ${this._escapeHTML(String(section.time || '').replace(/<br>/g, ' / ') || 'غير محدد')}</div></div></div></div>`;
            }).join('');
            return `<div class="conflict-group-container">
<div class="conflict-group-title">
<span>مجموعة التعارض ${groupIndex + 1}</span>
${kindsHTML}
</div>${groupItemsHTML}</div>`;
          }).join('');
          Swal.fire({
            title: 'حل جميع التعارضات', html: `<div id="conflict-modal-content" class="custom-scrollbar">${modalHTML || '<p>لا توجد مجموعات تعارض واضحة.</p>'}</div>`, icon: 'warning', confirmButtonText: 'حفظ التغييرات', showCancelButton: true, cancelButtonText: 'إلغاء', customClass: { popup: 'swal2-popup wide-swal conflict-swal' },
            didOpen: (popup) => { popup.querySelectorAll('.conflict-details-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); const detailsEl = document.getElementById(btn.dataset.detailsId); if (detailsEl) detailsEl.classList.toggle('visible'); }); }); },
            preConfirm: () => {
              const sectionsToRemove = new Set();
              conflictGroups.forEach((group, groupIndex) => { const selectedRadio = Swal.getPopup().querySelector(`input[name="conflict-group-${groupIndex}"]:checked`); if (selectedRadio) { const selectedId = selectedRadio.value; group.forEach(section => { if (section.uniqueId !== selectedId) { sectionsToRemove.add(section.uniqueId); } }); } });
              return Array.from(sectionsToRemove);
            }
          }).then((result) => {
            if (result.isConfirmed && Array.isArray(result.value)) {
              const sectionsToRemove = result.value;
              if (sectionsToRemove.length > 0) {
                const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
                sectionsToRemove.forEach(id => this._removeSectionAndUnlink(id, activeSchedule));
                this.updateFullUI();
                const pluralizedString = this._getPluralizedSectionString(sectionsToRemove.length);
                this._showToast('success', `تم حل التعارضات وإزالة ${pluralizedString}.`);
              } else { this._showToast('info', 'لم يتم إجراء أي تغييرات.'); }
            }
          });
        },
      });

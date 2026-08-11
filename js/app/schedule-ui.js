Object.assign(QU_ScheduleApp, {
        updateFullUI() { this._renderScheduleTabs(); this.updateCalendarAndConflicts(); this._renderStaleDataBanner(); if (isMobile) { this._updateMobileHeader(); } },
        updateCalendarAndConflicts() {
          if (!this.state.calendar) return;
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const selectedSections = activeSchedule ? activeSchedule.sections : new Set();
          this.state.calendar.removeAllEvents();
          document.querySelectorAll('.section-btn').forEach(btn => { btn.classList.toggle('selected', selectedSections.has(btn.dataset.uniqueId)); });
          const selectedCourseDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const conflictMap = this._calculateConflicts(selectedCourseDetails);

          let earliest = 24, latest = 0, hasEvents = false;
          selectedCourseDetails.forEach(c => c.timeSlots.forEach(s => {
            const startH = parseInt(s.start.split(':')[0], 10);
            const endH = parseInt(s.end.split(':')[0], 10) + (parseInt(s.end.split(':')[1], 10) > 0 ? 1 : 0);
            if (startH < earliest) earliest = startH;
            if (endH > latest) latest = endH;
            hasEvents = true;
          }));
          if (hasEvents) {
            let minHour = Math.min(8, earliest);
            let maxHour = Math.max(14, latest);
            this.state.calendar.setOption('slotMinTime', `${String(minHour).padStart(2, '0')}:00:00`);
            this.state.calendar.setOption('slotMaxTime', `${String(maxHour).padStart(2, '0')}:00:00`);
          } else {
            this.state.calendar.setOption('slotMinTime', '08:00:00');
            this.state.calendar.setOption('slotMaxTime', '14:00:00');
          }

          selectedCourseDetails.forEach(section => {
            const group = this.state.groupedCourses[section.code];
            if (group && !this.state.hiddenCourseCodes.has(section.code)) { this.state.calendar.addEventSource(this._createLectureEventsForSection(section, false, group.color)); }
          });
          this._renderFinalExams(selectedCourseDetails);
          this._renderMyScheduleSummary(selectedCourseDetails, conflictMap);
          this._updateAvailableSectionsUI(selectedCourseDetails);
          this._trackHistory();
          this._saveSchedules();
        },
        _renderScheduleTabs() {
          [this.dom.scheduleTabsContainer, this.dom.mobileScheduleTabsContainer].filter(Boolean).forEach(container => {
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();
            this.state.schedules.forEach((schedule, index) => {
              const tab = document.createElement('button');
              tab.className = `schedule-tab ${index === this.state.activeScheduleIndex ? 'active' : ''}`;
              tab.dataset.index = index;
              tab.innerHTML = `<span class="schedule-tab-name" contenteditable="false">${this._escapeHTML(schedule.name)}</span><i class="ph ph-x delete-schedule-btn"></i>`;
              const nameSpan = tab.querySelector('.schedule-tab-name');
              tab.addEventListener('click', (e) => { if (e.target.classList.contains('delete-schedule-btn')) return; this._switchSchedule(index); });
              tab.addEventListener('dblclick', () => { if (tab.classList.contains('active')) { nameSpan.contentEditable = true; nameSpan.focus(); const range = document.createRange(); range.selectNodeContents(nameSpan); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); } });
              nameSpan.addEventListener('blur', () => { nameSpan.contentEditable = false; this._renameSchedule(index, nameSpan.textContent); });
              nameSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nameSpan.blur(); } });
              tab.querySelector('.delete-schedule-btn').addEventListener('click', (e) => { e.stopPropagation(); this._deleteSchedule(index); });
              fragment.appendChild(tab);
            });
            if (this.state.isDemoMode) { const demoBadge = document.createElement('div'); demoBadge.className = 'demo-badge'; demoBadge.textContent = 'وضع المعاينة'; fragment.appendChild(demoBadge); }
            const addButton = document.createElement('button'); addButton.id = 'add-schedule-btn'; addButton.innerHTML = '<i class="ph ph-plus"></i>'; addButton.title = 'إضافة جدول جديد'; addButton.setAttribute('aria-label', 'إضافة جدول جديد'); addButton.addEventListener('click', () => this._addSchedule());
            fragment.appendChild(addButton);
            const dupButton = document.createElement('button'); dupButton.className = 'tab-icon-btn'; dupButton.innerHTML = '<i class="ph ph-copy"></i>'; dupButton.title = 'نسخ الجدول الحالي كسيناريو جديد'; dupButton.setAttribute('aria-label', 'نسخ الجدول'); dupButton.addEventListener('click', () => this._duplicateSchedule(this.state.activeScheduleIndex));
            fragment.appendChild(dupButton);
            const cmpButton = document.createElement('button'); cmpButton.className = 'tab-icon-btn'; cmpButton.innerHTML = '<i class="ph ph-scales"></i>'; cmpButton.title = 'مقارنة الجداول'; cmpButton.setAttribute('aria-label', 'مقارنة الجداول'); cmpButton.addEventListener('click', () => this._handleCompareSchedules());
            fragment.appendChild(cmpButton);
            container.appendChild(fragment);
          });
        },
        _createCoursesListHTML() {
          const selectedSections = this.state.schedules[this.state.activeScheduleIndex]?.sections || new Set();
          let visibleCourses = Object.values(this.state.groupedCourses).filter(g => !this.state.hiddenCourseCodes.has(g.code));
          const term = this._normalizeArabic(this.state.searchTerm);
          const sectionMatchIds = new Map();
          if (term) {
            const searchTerms = term.split(/[\s,]+/).filter(Boolean);
            visibleCourses = visibleCourses.filter(group => {
              const nameNorm = this._normalizeArabic(group.name);
              const codeNorm = this._normalizeArabic(group.code);
              let nameOrCodeMatch = false;
              const matchedIds = new Set();
              searchTerms.forEach(searchTerm => {
                if (nameNorm.includes(searchTerm) || codeNorm.includes(searchTerm) || codeNorm.replace(/\s+/g, '').includes(searchTerm.replace(/\s+/g, ''))) nameOrCodeMatch = true;
                group.sections.forEach(s => { if (this._normalizeArabic(s.section).includes(searchTerm) || this._normalizeArabic(s.instructor).includes(searchTerm)) matchedIds.add(s.uniqueId); });
              });
              if (nameOrCodeMatch) return true;
              if (matchedIds.size > 0) { sectionMatchIds.set(group.code, matchedIds); return true; }
              return false;
            });
          }
          const hasFilters = this._activeFilterCount() > 0;
          const selectedDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          if (Object.keys(this.state.groupedCourses).length > 0 && visibleCourses.length === 0) return term ? `<div class="no-data"><i class="ph ph-magnifying-glass"></i><h4>لا توجد نتائج</h4><p>جرب كلمات بحث مختلفة.</p></div>` : `<div class="no-data"><i class="ph ph-eye-slash"></i><h4>لا توجد مقررات ظاهرة</h4><p>يمكنك إظهار المقررات من الإعدادات.</p></div>`;
          if (visibleCourses.length === 0) return '';
          const hideClosed = this.state.userSettings.hideClosedCourses;
          return visibleCourses.sort((a, b) => a.code.localeCompare(b.code)).map((group, i) => {
            const allClosed = group.sections.length > 0 && group.sections.every(section => this._isClosedStatus(section.status));
            const showClosedOnly = hideClosed && allClosed;
            let sectionsToDisplay = (hideClosed && !allClosed) ? group.sections.filter(section => !this._isClosedStatus(section.status)) : group.sections;
            const matchedIds = term ? sectionMatchIds.get(group.code) : null;
            if (matchedIds) sectionsToDisplay = sectionsToDisplay.filter(section => matchedIds.has(section.uniqueId));
            if (hasFilters) sectionsToDisplay = sectionsToDisplay.filter(section => this._sectionPassesFilters(section, selectedDetails, selectedSections));
            if (sectionsToDisplay.length === 0) return '';
            const sectionsHTML = sectionsToDisplay.map(section => {
              const isNoTime = section.time === 'غير محدد';
              const isOpen = section.status.includes('مفتوحة');
              const statusIndicatorHTML = (!hideClosed || showClosedOnly) ? `<span class="section-status-dot ${isOpen ? 'open' : 'closed'}"></span>` : ``;
              const isFav = this._isFavInstructor(section.instructor);
              const favHTML = isFav ? '<span class="sec-fav" title="محاضر مفضل" aria-hidden="true"><i class="ph-fill ph-star"></i></span>' : '';
              const aria = `شعبة ${section.section} ${this._typeLabel(section.type)} ${section.instructor || ''}${isFav ? ' — محاضر مفضل' : ''}`;
              return `<div class="section-btn ${selectedSections.has(section.uniqueId) ? 'selected' : ''} ${isNoTime ? 'no-time' : ''} ${isFav ? 'is-fav' : ''}" role="button" tabindex="0" aria-pressed="${selectedSections.has(section.uniqueId)}" aria-label="${this._escapeHTML(aria)}" data-unique-id="${this._escapeHTML(section.uniqueId)}" style="${isNoTime ? '--item-color:' + group.color + ';--item-color-rgb:' + this._hexToRgb(group.color) : ''}">
${statusIndicatorHTML}${favHTML}<div class="section-btn-number">${this._escapeHTML(section.section)}</div><div class="section-type">${isNoTime ? '<i class="ph ph-laptop"></i>' : ''}${this._escapeHTML(this._typeLabel(section.type))}</div></div>`;
            }).join('');
            const note = (this.state.userSettings.courseNotes || {})[group.code];
            const noteFlag = note ? `<span class="course-note-flag" title="${this._escapeHTML(note)}"><i class="ph-fill ph-note"></i>ملاحظة</span>` : '';
            const countText = matchedIds ? sectionsToDisplay.length + ' نتيجة مطابقة' : (hasFilters ? sectionsToDisplay.length + ' شعبة بعد الترشيح' : (showClosedOnly ? this._sectionsWord(sectionsToDisplay.length) + ' · كلها مغلقة' : sectionsToDisplay.length + ' شعب متاحة'));
            const autoOpen = !!(term || hasFilters);
            return `<div class="course-item ${autoOpen ? 'open qs-auto-open' : ''}" data-course-code="${this._escapeHTML(group.code)}" style="animation-delay: ${i * 30}ms"><div class="course-item-header" role="button" tabindex="0" aria-expanded="${autoOpen}"><span class="color-dot" style="background-color: ${group.color};"></span><div class="course-info"><h3>${this._escapeHTML(group.name)} (${this._escapeHTML(group.code)})${noteFlag}</h3><p>${countText}</p></div><i class="ph ph-caret-down toggle-icon"></i></div><div class="sections-wrapper"><div class="sections-grid">${sectionsHTML}</div></div></div>`;
          }).join('');
        },
        _renderCoursesList() {
          const html = this._createCoursesListHTML();
          if (this.dom.desktopCoursesList) this._syncCoursesList(this.dom.desktopCoursesList, html || '');
          if (this.dom.mobileCoursesList) this._syncCoursesList(this.dom.mobileCoursesList, html || `<div class="no-data"><i class="ph ph-clock"></i><h4>في انتظار البيانات...</h4><p>استخدم الأداة لتحميل بيانات المواد.</p></div>`);
        },
        _listMotionDisabled() {
          if (document.body.classList.contains('high-performance')) return true;
          try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
        },
        _nextNonLeaving(node, cls) {
          while (node && (node.nodeType !== 1 || node.classList.contains(cls))) node = node.nextSibling;
          return node;
        },
        _syncCoursesList(host, html) {
          const staging = document.createElement('div');
          staging.innerHTML = html;
          const nextItems = Array.from(staging.children).filter(el => el.classList && el.classList.contains('course-item'));
          const prevItems = Array.from(host.children).filter(el => el.classList && el.classList.contains('course-item') && !el.classList.contains('qs-leaving'));
          if (!prevItems.length || !nextItems.length) {
            host.classList.remove('qs-live');
            host.innerHTML = html;
            return;
          }
          const reduce = this._listMotionDisabled();
          host.classList.add('qs-live');
          const nextCodes = new Set(nextItems.map(el => el.dataset.courseCode));
          const prevMap = new Map(prevItems.map(el => [el.dataset.courseCode, el]));
          prevItems.forEach(el => { if (!nextCodes.has(el.dataset.courseCode)) this._collapseAndRemove(el, reduce); });
          let cursor = host.firstChild;
          nextItems.forEach(nextEl => {
            const existing = prevMap.get(nextEl.dataset.courseCode);
            let node = nextEl;
            if (existing) { this._patchCourseItem(existing, nextEl, reduce); node = existing; }
            cursor = this._nextNonLeaving(cursor, 'qs-leaving');
            if (node === cursor) cursor = cursor.nextSibling;
            else host.insertBefore(node, cursor);
            if (!existing) this._revealCourseItem(node, reduce);
          });
        },
        _collapseAndRemove(el, reduce) {
          if (reduce) { el.remove(); return; }
          const h = el.offsetHeight;
          el.classList.add('qs-leaving');
          el.style.height = h + 'px';
          void el.offsetHeight;
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.marginBottom = '0px';
          setTimeout(() => el.remove(), 320);
        },
        _revealCourseItem(el, reduce) {
          if (reduce) return;
          const h = el.offsetHeight;
          el.classList.add('qs-entering');
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.marginBottom = '0px';
          void el.offsetHeight;
          el.style.height = h + 'px';
          el.style.opacity = '';
          el.style.marginBottom = '';
          setTimeout(() => { el.classList.remove('qs-entering'); el.style.height = ''; }, 320);
        },
        _patchCourseItem(oldEl, newEl, reduce) {
          const oldHead = oldEl.querySelector('.course-item-header');
          const newHead = newEl.querySelector('.course-item-header');
          if (oldHead && newHead) {
            const oldTitle = oldHead.querySelector('.course-info h3'), newTitle = newHead.querySelector('.course-info h3');
            if (oldTitle && newTitle && oldTitle.innerHTML !== newTitle.innerHTML) oldTitle.innerHTML = newTitle.innerHTML;
            const oldCount = oldHead.querySelector('.course-info p'), newCount = newHead.querySelector('.course-info p');
            if (oldCount && newCount && oldCount.textContent !== newCount.textContent) oldCount.textContent = newCount.textContent;
            const oldDot = oldHead.querySelector('.color-dot'), newDot = newHead.querySelector('.color-dot');
            if (oldDot && newDot && oldDot.getAttribute('style') !== newDot.getAttribute('style')) oldDot.setAttribute('style', newDot.getAttribute('style'));
          }
          const autoOpen = newEl.classList.contains('qs-auto-open');
          if (autoOpen) { oldEl.classList.add('open', 'qs-auto-open'); }
          else if (oldEl.classList.contains('qs-auto-open')) {
            oldEl.classList.remove('open', 'qs-auto-open');
            oldEl.querySelectorAll('.section-btn.sec-settled').forEach(s => s.classList.remove('sec-settled'));
          }
          if (oldHead) oldHead.setAttribute('aria-expanded', String(oldEl.classList.contains('open')));
          const oldGrid = oldEl.querySelector('.sections-grid'), newGrid = newEl.querySelector('.sections-grid');
          if (oldGrid && newGrid) this._patchSectionsGrid(oldGrid, newGrid, reduce);
        },
        _patchSectionsGrid(oldGrid, newGrid, reduce) {
          const prevBtns = Array.from(oldGrid.children).filter(b => b.classList && b.classList.contains('section-btn') && !b.classList.contains('sec-leaving'));
          const nextBtns = Array.from(newGrid.children).filter(b => b.classList && b.classList.contains('section-btn'));
          const gridRect = oldGrid.getBoundingClientRect();
          const animate = !reduce && gridRect.height > 0 && gridRect.width > 0;
          const nextIds = new Set(nextBtns.map(b => b.dataset.uniqueId));
          const prevMap = new Map(prevBtns.map(b => [b.dataset.uniqueId, b]));
          const firstRects = new Map();
          if (animate) {
            prevBtns.forEach(b => {
              b.classList.add('sec-settled');
              if (nextIds.has(b.dataset.uniqueId)) firstRects.set(b.dataset.uniqueId, b.getBoundingClientRect());
            });
          }
          prevBtns.forEach(b => {
            if (nextIds.has(b.dataset.uniqueId)) return;
            if (!animate) { b.remove(); return; }
            const r = b.getBoundingClientRect();
            b.style.position = 'absolute';
            b.style.margin = '0';
            b.style.insetInlineStart = 'auto';
            b.style.left = (r.left - gridRect.left) + 'px';
            b.style.top = (r.top - gridRect.top) + 'px';
            b.style.width = r.width + 'px';
            b.style.height = r.height + 'px';
            b.classList.add('sec-leaving');
            requestAnimationFrame(() => { b.style.opacity = '0'; b.style.transform = 'scale(0.82)'; });
            setTimeout(() => b.remove(), 260);
          });
          let cursor = oldGrid.firstChild;
          nextBtns.forEach(nextBtn => {
            const existing = prevMap.get(nextBtn.dataset.uniqueId);
            let node = nextBtn;
            if (existing) { this._patchSectionBtn(existing, nextBtn); node = existing; }
            else node.style.animationDelay = '0ms';
            cursor = this._nextNonLeaving(cursor, 'sec-leaving');
            if (node === cursor) cursor = cursor.nextSibling;
            else oldGrid.insertBefore(node, cursor);
          });
          if (!animate) return;
          const endHeight = oldGrid.getBoundingClientRect().height;
          if (Math.abs(endHeight - gridRect.height) > 1) {
            oldGrid.style.transition = 'none';
            oldGrid.style.height = gridRect.height + 'px';
            void oldGrid.offsetHeight;
            oldGrid.style.transition = 'height 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), padding 0.3s';
            oldGrid.style.height = endHeight + 'px';
            clearTimeout(oldGrid._qsHeightTimer);
            oldGrid._qsHeightTimer = setTimeout(() => { oldGrid.style.height = ''; oldGrid.style.transition = ''; }, 340);
          }
          if (!firstRects.size) return;
          requestAnimationFrame(() => {
            firstRects.forEach((first, id) => {
              const el = prevMap.get(id);
              if (!el || !el.isConnected) return;
              const last = el.getBoundingClientRect();
              const dx = first.left - last.left, dy = first.top - last.top;
              if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
              el.style.transition = 'none';
              el.style.transform = `translate(${dx}px, ${dy}px)`;
              requestAnimationFrame(() => {
                el.style.transition = 'transform 0.34s cubic-bezier(0.2, 0.8, 0.2, 1)';
                el.style.transform = '';
                setTimeout(() => { el.style.transition = ''; }, 360);
              });
            });
          });
        },
        _patchSectionBtn(oldBtn, newBtn) {
          const keep = [];
          ['conflicted', 'sec-settled', 'quick-added'].forEach(c => { if (oldBtn.classList.contains(c)) keep.push(c); });
          const nextClass = (newBtn.getAttribute('class') || '').trim() + (keep.length ? ' ' + keep.join(' ') : '');
          if (oldBtn.getAttribute('class') !== nextClass) oldBtn.setAttribute('class', nextClass);
          const newStyle = newBtn.getAttribute('style');
          if (newStyle) newStyle.split(';').forEach(rule => { const i = rule.indexOf(':'); if (i > 0) oldBtn.style.setProperty(rule.slice(0, i).trim(), rule.slice(i + 1).trim()); });
          ['aria-pressed', 'aria-label'].forEach(attr => {
            const v = newBtn.getAttribute(attr);
            if (v !== null && oldBtn.getAttribute(attr) !== v) oldBtn.setAttribute(attr, v);
          });
          if (oldBtn.innerHTML !== newBtn.innerHTML) oldBtn.innerHTML = newBtn.innerHTML;
        },
        _renderQuickVisibilityList() {
          if (!this.dom.quickVisibilityContent) return;
          let courseVisibilityHTML = Object.values(this.state.groupedCourses).sort((a, b) => a.code.localeCompare(b.code)).map(g => { const isHidden = this.state.hiddenCourseCodes.has(g.code); const label = this.state.isVisibilityNamesMode ? g.name : g.code; return `<button class="course-visibility-btn ${isHidden ? 'hidden' : 'visible'}" data-course-code="${this._escapeHTML(g.code)}" style="--item-color:${g.color};--item-color-rgb:${this._hexToRgb(g.color)};"><span class="color-dot"></span>${this._escapeHTML(label)}</button>`; }).join('');
          if (!courseVisibilityHTML) courseVisibilityHTML = '<p style="color:var(--color-text-muted);font-size:0.9rem;">لم يتم تحميل بيانات المقررات بعد.</p>';
          this.dom.quickVisibilityContent.innerHTML = courseVisibilityHTML;
        },
        _renderMyScheduleSummary(selectedCourses, conflictMap) {
          const desktopContainer = this.dom.myScheduleContainer;
          const mobileContainer = this.dom.mobileMyScheduleContainer;
          const emptyScheduleHTML = `<div class="empty-state" style="width:100%"><div class="es-icon"><i class="ph ph-calendar-plus"></i></div><h4>جدولك فارغ</h4><p>اختر شعب المقررات من القائمة، أو دع الجدول الذكي يبني لك جدولاً بلا تعارضات.</p><div class="es-actions"><button class="es-btn primary" data-empty-action="browse"><i class="ph ph-stack"></i> تصفح المقررات</button><button class="es-btn" data-empty-action="auto"><i class="ph ph-magic-wand"></i> الجدول الذكي</button><button class="es-btn" data-empty-action="free"><i class="ph ph-books"></i> المقررات الحرة</button></div></div>`;
          if (desktopContainer) {
            desktopContainer.style.display = 'flex';
            if (selectedCourses.length === 0) { desktopContainer.innerHTML = emptyScheduleHTML; this._bindEmptyStateActions(desktopContainer); }
            else {
              desktopContainer.innerHTML = this._createMyScheduleHTML(selectedCourses, conflictMap);
              const desktopConflictBtn = desktopContainer.querySelector('#desktop-view-conflicts-btn');
              if (desktopConflictBtn) desktopConflictBtn.addEventListener('click', () => this._handleViewAllConflicts(conflictMap));
              const copyBtn = desktopContainer.querySelector('#desktop-copy-crn-btn');
              if (copyBtn) copyBtn.addEventListener('click', () => this._handleCopyCRNs(selectedCourses));
              const crnGenBtn = desktopContainer.querySelector('#generate-crn-tool-btn');
              if (crnGenBtn) crnGenBtn.addEventListener('click', () => this._handleCRNGenerator());
              const desktopExamClashBtn = desktopContainer.querySelector('#desktop-exam-clash-btn');
              if (desktopExamClashBtn) desktopExamClashBtn.addEventListener('click', () => this._handleViewExamClashes(this._examClashGroups(selectedCourses)));
              const desktopCreditBtn = desktopContainer.querySelector('#desktop-credit-btn');
              if (desktopCreditBtn) desktopCreditBtn.addEventListener('click', () => this._showCreditLimitsModal(this._totalCreditsOf(selectedCourses)));
              const desktopFreeBtn = desktopContainer.querySelector('#desktop-free-courses-btn');
              if (desktopFreeBtn) desktopFreeBtn.addEventListener('click', () => this._showFreeCoursesModal());
            }
          }
          if (mobileContainer) {
            mobileContainer.classList.toggle('empty', selectedCourses.length === 0);
            if (selectedCourses.length === 0) { mobileContainer.innerHTML = emptyScheduleHTML; this._bindEmptyStateActions(mobileContainer); }
            else {
              mobileContainer.innerHTML = this._createMobileScheduleHTML(selectedCourses, conflictMap);
              const mobileConflictBtn = mobileContainer.querySelector('#mobile-view-conflicts-btn');
              if (mobileConflictBtn) mobileConflictBtn.addEventListener('click', () => this._handleViewAllConflicts(conflictMap));
              const mobileCrnGenBtn = mobileContainer.querySelector('#mobile-generate-crn-tool-btn');
              if (mobileCrnGenBtn) mobileCrnGenBtn.addEventListener('click', () => this._handleCRNGenerator());
              const mobileShareBtn = mobileContainer.querySelector('#mobile-share-schedule-btn');
              if (mobileShareBtn) mobileShareBtn.addEventListener('click', () => this._handleShare());
              const mobileCreditBtn = mobileContainer.querySelector('#mobile-credit-btn');
              if (mobileCreditBtn) mobileCreditBtn.addEventListener('click', () => this._showCreditLimitsModal(this._totalCreditsOf(selectedCourses)));
              const mobileFreeBtn = mobileContainer.querySelector('#mobile-free-courses-btn');
              if (mobileFreeBtn) mobileFreeBtn.addEventListener('click', () => this._showFreeCoursesModal());
            }
          }
        },
        _handleCopyCRNs(selectedCourses) {
          if (selectedCourses.length === 0) return;
          const crns = selectedCourses.map(c => c.section).join('\n');
          navigator.clipboard.writeText(crns).then(() => this._showToast('success', 'تم نسخ أرقام الشعب!')).catch(() => this._showToast('error', 'فشل النسخ'));
        },
        _handleCRNGenerator() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const selectedSections = activeSchedule ? activeSchedule.sections : new Set();
          if (selectedSections.size === 0) { this._showToast('error', 'الجدول فارغ!'); return; }
          const selectedCourseDetails = Array.from(selectedSections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const freeKeys = this._freeSecKeySet();
          const planCourses = selectedCourseDetails.filter(c => !freeKeys.has(this._secKey(c)));
          const freeCourses = selectedCourseDetails.filter(c => freeKeys.has(this._secKey(c)));
          const autoFreeCRNs = freeCourses.map(c => String(c.section));
          const one = freeCourses.length === 1;
          const freeRow = freeCourses.length
            ? `<div class="info-row is-free">
<i class="ph ph-books"></i>
<span><b>${this._escapeHTML(freeCourses.map(c => c.name).join('، '))}</b> ${one ? 'مقرر حر لا يظهر في جدول خطتك، فوُضع رقم شعبته' : 'مقررات حرة لا تظهر في جدول خطتك، فوُضعت أرقام شعبها'} في خانة «الشعب الحرة» تلقائياً — والأداة تعبّئها في حقول المقررات الحرة بصفحة الحذف والإضافة.</span>
</div>`
            : '';
          Swal.fire({
            title: 'مُعِدّ أداة التعبئة',
            html: `
<div class="crn-generator-content">
<div class="info-row">
<i class="ph ph-check-circle"></i>
<span>تم استخراج أرقام الشعب من جدولك الحالي${planCourses.length ? ` (${this._sectionsWord(planCourses.length)} من خطتك)` : ''}.</span>
</div>
${freeRow}
<div class="input-group">
<label>أرقام الشعب الحرة (اختياري)</label>
<textarea id="swal-free-crns" class="custom-textarea" placeholder="أدخل أرقام الشعب الحرة هنا (مثلاً: 12345, 67890)...">${this._escapeHTML(autoFreeCRNs.join(', '))}</textarea>
</div>
</div>
`,
            showCancelButton: true,
            confirmButtonText: 'إنشاء الأداة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
              return document.getElementById('swal-free-crns').value;
            }
          }).then((result) => {
            if (result.isConfirmed) {
              const freeCRNs = [...new Set(result.value.split(/[\n\s,]+/).map(s => s.trim()).filter(Boolean))];
              const code = this._generateFillerCode(planCourses, freeCRNs);
              this._showFillerTool(code);
            }
          });
        },
        _generateFillerCode(selectedCourseDetails, freeCRNs) {
          const payload = {
            c: selectedCourseDetails.map(c => `${c.name} | ${c.section}`).join('\n'),
            f: freeCRNs || [],
            a: this.state.userSettings.accentColor || '#8b5cf6',
            l: this.state.userSettings.theme === 'light'
          };
          const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
          const loader = `javascript:(function(){window.QU_FILL='${b64}';var s=document.createElement('script');s.src='https://mutlaq001.github.io/schedule/filler.js?v='+Date.now();document.head.appendChild(s)})();`;
          return loader;
        },
        _showFillerTool(code) {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && window.innerWidth < 1024;
          if (isMobile) {
            Swal.fire({
              title: 'تم إنشاء الأداة',
              html: `<div id="swal-custom-close" style="position: absolute; top: 12px; left: 15px; cursor: pointer; color: var(--color-text-muted); font-size: 1.5rem; z-index: 50;"><i class="ph ph-x"></i></div><p style="text-align:right; margin-bottom:1.5rem; padding: 0 .5rem;">انسخ الكود التالي، ثم اذهب لصفحة الحذف والإضافة، وألصقه في شريط العنوان.</p><button id="swal-copy-tool-btn" class="details-action-btn add" style="width:calc(100% - 1rem); margin: 0 .5rem; justify-content: center;"><i class="ph ph-copy"></i> نسخ الكود</button>`,
              showConfirmButton: false, allowOutsideClick: true,
              didOpen: () => {
                document.getElementById('swal-custom-close').addEventListener('click', () => Swal.close());
                document.getElementById('swal-copy-tool-btn').addEventListener('click', () => { navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم النسخ!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); });
              }
            });
          } else {
            Swal.fire({
              title: 'اسحب الزر للشريط', icon: 'info', allowOutsideClick: true, showConfirmButton: false,
              html: `<div id="swal-custom-close" style="position: absolute; top: 12px; left: 15px; cursor: pointer; color: var(--color-text-muted); font-size: 1.5rem; z-index: 50;"><i class="ph ph-x"></i></div><div style="text-align: right;"><p style="margin-bottom: 1.5rem; color: var(--color-text-muted); line-height: 1.6;">اسحب الزر التالي وأفلته في شريط الإشارات المرجعية (Bookmarks Bar) أعلى المتصفح.</p><div style="text-align: center; margin-bottom: 1.5rem;"><a href="${code}" class="bookmarklet-button" style="text-decoration:none; display:inline-flex;" onclick="return false;"><i class="ph ph-magic-wand"></i> مُعِدّ</a></div><p style="font-size: 0.85rem; opacity: 0.7; text-align: center; margin-bottom: 1.25rem;">عند فتح صفحة الحذف والإضافة، اضغط على هذا الزر لتعبئة الشعب.</p><div class="or-divider" style="text-align:center;">أو</div><div style="text-align: center; margin-top: 1rem;"><button class="data-btn" id="swal-tablet-copy-tool-btn"><i class="ph ph-device-tablet"></i> للوحيات</button></div></div>`,
              didOpen: () => {
                document.getElementById('swal-custom-close').addEventListener('click', () => Swal.close());
                document.getElementById('swal-tablet-copy-tool-btn').addEventListener('click', () => { navigator.clipboard.writeText(code).then(() => { this._showToast('success', 'تم نسخ الكود بنجاح!'); }).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.')); });
              }
            });
          }
        },
        _createMyScheduleHTML(selectedCourses, conflictMap) {
          let totalCredits = 0; const uniqueCourseCodes = new Set();
          selectedCourses.forEach(c => { if (!uniqueCourseCodes.has(c.code)) { totalCredits += parseInt(c.hours, 10) || 0; uniqueCourseCodes.add(c.code); } });
          let statsHTML = this._createScheduleStatsHTML(selectedCourses, uniqueCourseCodes.size);
          const creditHTML = this._buildCreditAlert(totalCredits, 'desktop');
          const creditIsChip = this._creditStatus(totalCredits).state === 'ok';
          let creditAlertHTML = '';
          if (creditIsChip) {
            statsHTML = statsHTML ? statsHTML.replace('</div>', `${creditHTML}</div>`) : `<div class="schedule-stats">${creditHTML}</div>`;
          } else {
            creditAlertHTML = `<div class="credit-slot">${creditHTML}</div>`;
          }
          const conflictBtnHTML = conflictMap.size > 0 ? `<button class="view-conflicts-btn" id="desktop-view-conflicts-btn"><i class="ph-fill ph-wrench"></i> حل التعارض</button>` : '';
          if (conflictBtnHTML) {
            statsHTML = statsHTML ? statsHTML.replace('</div>', `${conflictBtnHTML}</div>`) : `<div class="schedule-stats">${conflictBtnHTML}</div>`;
          }
          const examAlertHTML = this._buildExamClashAlert(this._examClashGroups(selectedCourses), 'desktop');
          const typeRank = t => { t = t || ''; if (t.includes('نظري') || t.includes('محاضرة')) return 0; if (t.includes('عملي')) return 1; if (t.includes('تمارين')) return 2; if (t.includes('تدريب')) return 3; return 4; };
          const sortedForTable = selectedCourses.slice().sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name) || typeRank(a.type) - typeRank(b.type) || String(a.section).localeCompare(String(b.section), undefined, { numeric: true }));
          const courseGroups = [];
          sortedForTable.forEach(c => {
            const last = courseGroups[courseGroups.length - 1];
            if (last && last.code === c.code && last.name === c.name) last.items.push(c);
            else courseGroups.push({ code: c.code, name: c.name, items: [c] });
          });
          const tableRowsHTML = courseGroups.map(g => {
            const hoursVals = [...new Set(g.items.map(c => String(parseInt(c.hours, 10) || 0)))];
            const sharedHours = hoursVals.length === 1;
            const typeChips = [...new Set(g.items.map(c => this._typeLabel(c.type)).filter(Boolean))].join(' + ');
            return g.items.map((course, idx) => {
              const isConflicted = conflictMap.has(course.uniqueId);
              const isClosed = !!(course.status && course.status.includes('مغلقة'));
              const closedBadge = isClosed ? '<span class="closed-badge"><i class="ph-fill ph-lock-simple"></i>مغلقة</span>' : '';
              const rowClasses = ['schedule-row', isConflicted ? 'has-conflict' : '', isClosed ? 'is-closed' : '', idx === 0 ? 'group-start' : 'group-inner', idx < g.items.length - 1 ? 'group-mid' : 'group-end'].filter(Boolean).join(' ');
              const courseCell = idx === 0 ? `<td class="course-cell" rowspan="${g.items.length}"><div class="course-code">${this._escapeHTML(g.code)}</div><div class="course-name">${this._escapeHTML(g.name)}</div>${g.items.length > 1 ? `<span class="course-parts-chip"><i class="ph ph-link-simple"></i> ${this._escapeHTML(typeChips)}</span>` : ''}</td>` : '';
              const hoursCell = sharedHours
                ? (idx === 0 ? `<td class="hours-cell" rowspan="${g.items.length}"><div class="hours-value">${hoursVals[0]}</div></td>` : '')
                : `<td class="hours-cell"><div class="hours-value">${parseInt(course.hours, 10) || 0}</div></td>`;
              const conflictChip = isConflicted ? '<span class="conflict-chip"><i class="ph-fill ph-warning"></i>تعارض</span>' : '';
              return `<tr class="${rowClasses}">${courseCell}<td class="sec-cell"><div class="section-number">${this._escapeHTML(course.section)}${closedBadge}${conflictChip}</div><div class="type-label">${this._escapeHTML(this._typeLabel(course.type))}</div></td><td>${this._escapeHTML(course.instructor)}</td><td>${this._escapeHTML(course.time.replace(/<br>/g, ' '))}</td><td>${this._escapeHTML(course.examPeriodId || "لا يوجد")}</td><td>${this._escapeHTML(course.location)}</td>${hoursCell}</tr>`;
            }).join('');
          }).join('');
          const gridItemsHTML = selectedCourses.sort((a, b) => a.code.localeCompare(b.code)).map((course, i) => { const isClosed = !!(course.status && course.status.includes('مغلقة')); return `<div class="mobile-schedule-item" style="animation-delay:${i * 30}ms;"><div class="mobile-schedule-header"><div class="mobile-schedule-title"><h3>${this._escapeHTML(course.name)}</h3><span>${this._escapeHTML(course.code)} - شعبة ${this._escapeHTML(course.section)}${isClosed ? '<span class="closed-badge"><i class="ph-fill ph-lock-simple"></i>مغلقة</span>' : ''}</span></div>${conflictMap.has(course.uniqueId) ? '<i class="ph-fill ph-warning mobile-conflict-icon"></i>' : ''}</div><div class="mobile-schedule-details"><div class="mobile-detail-row"><i class="ph ph-clock"></i> <strong>المواعيد:</strong> ${this._escapeHTML(course.time.replace(/<br>/g, ' / ') || 'غير محدد')}</div><div class="mobile-detail-row"><i class="ph ph-user"></i> <strong>المحاضر:</strong> ${this._escapeHTML(course.instructor || 'غير محدد')}</div></div></div>`; }).join('');
          return `<div class="card my-schedule-card"><div class="my-schedule-section"><div class="card-header-inline"><div class="card-header-actions"><h3><i class="ph ph-calendar-check"></i> جدولـي</h3><button class="copy-crn-btn" id="desktop-copy-crn-btn" title="نسخ أرقام الشعب"><i class="ph ph-copy"></i> نسخ الشعب</button></div><div style="display:flex;align-items:center;gap:0.75rem;"><button class="moad-btn" id="generate-crn-tool-btn"><i class="ph ph-magic-wand"></i> مُعِدّ</button><button class="free-courses-btn" id="desktop-free-courses-btn" title="شعب المقررات الحرة المقترحة"><i class="ph ph-books"></i> المقررات الحرة</button><div class="total-credits-pill">إجمالي الساعات: <span>${totalCredits}</span></div></div></div>${statsHTML}${creditAlertHTML}${examAlertHTML}<div class="my-schedule-table-wrapper"><table class="my-schedule-table"><thead><tr><th>المقرر</th><th>الشعبة</th><th>المحاضر</th><th>المواعيد</th><th>فترة الاختبار</th><th>المكان</th><th>الساعات</th></tr></thead><tbody>${tableRowsHTML}</tbody></table></div><div class="my-schedule-grid-wrapper hidden">${gridItemsHTML}</div></div></div>`;
        },
        _createScheduleStatsHTML(selectedCourses, coursesCount) {
          const daySet = new Set(); let weeklyMin = 0;
          selectedCourses.forEach(c => c.timeSlots.forEach(s => { daySet.add(s.day); weeklyMin += this._toMin(s.end) - this._toMin(s.start); }));
          if (weeklyMin === 0) return '';
          const weeklyHours = Math.round((weeklyMin / 60) * 10) / 10;
          return `<div class="schedule-stats"><span class="stat-chip"><i class="ph ph-books"></i>${coursesCount} ${coursesCount === 1 ? 'مقرر' : coursesCount === 2 ? 'مقرران' : coursesCount <= 10 ? 'مقررات' : 'مقرراً'}</span><span class="stat-chip"><i class="ph ph-calendar-blank"></i>${daySet.size} ${daySet.size === 1 ? 'يوم دوام' : daySet.size === 2 ? 'يوما دوام' : 'أيام دوام'}</span><span class="stat-chip"><i class="ph ph-timer"></i>${weeklyHours} ساعة حضور أسبوعياً</span></div>`;
        },
        _createMobileScheduleHTML(selectedCourses, conflictMap) {
          let totalCredits = 0; const uniqueCourseCodes = new Set();
          selectedCourses.forEach(c => { if (!uniqueCourseCodes.has(c.code)) { totalCredits += parseInt(c.hours, 10) || 0; uniqueCourseCodes.add(c.code); } });
          const itemsHTML = selectedCourses.sort((a, b) => a.code.localeCompare(b.code)).map((course, i) => {
            const isConflicted = conflictMap.has(course.uniqueId);
            return `<div class="mobile-schedule-item" style="animation-delay:${i * 30}ms;"><div class="mobile-schedule-header"><div class="mobile-schedule-title"><h3>${this._escapeHTML(course.name)}</h3><span>${this._escapeHTML(course.code)} - شعبة ${this._escapeHTML(course.section)}</span></div>${isConflicted ? `<i class="ph-fill ph-warning mobile-conflict-icon"></i>` : ''}</div><div class="mobile-schedule-details"><div class="mobile-detail-row"><i class="ph ph-clock"></i> <strong>المواعيد:</strong> ${this._escapeHTML(course.time.replace(/<br>/g, ' / ') || 'غير محدد')}</div><div class="mobile-detail-row"><i class="ph ph-user"></i> <strong>المحاضر:</strong> ${this._escapeHTML(course.instructor || 'غير محدد')}</div></div></div>`;
          }).join('');

          const hasConflict = conflictMap.size > 0;
          const conflictButtonHTML = hasConflict ? `<button class="view-conflicts-btn" id="mobile-view-conflicts-btn"><i class="ph-fill ph-wrench"></i> حل التعارض</button>` : '';
          const moadButtonHTML = `<button class="moad-btn" id="mobile-generate-crn-tool-btn"><i class="ph ph-magic-wand"></i> مُعِدّ</button>`;
          const freeButtonHTML = `<button class="footer-icon-btn" id="mobile-free-courses-btn" aria-label="المقررات الحرة" title="المقررات الحرة"><i class="ph ph-books"></i></button>`;
          const shareButtonHTML = `<button class="footer-icon-btn" id="mobile-share-schedule-btn" aria-label="مشاركة الجدول" title="مشاركة الجدول"><i class="ph ph-share-network"></i></button>`;
          const daySet = new Set(); let weeklyMin = 0;
          selectedCourses.forEach(c => c.timeSlots.forEach(s => { daySet.add(s.day); weeklyMin += this._toMin(s.end) - this._toMin(s.start); }));
          const weeklyHours = Math.round((weeklyMin / 60) * 10) / 10;
          const cs = this._creditStatus(totalCredits);
          const creditCellHTML = `<button type="button" class="summary-cell credit-cell ${cs.state}" id="mobile-credit-btn" aria-label="حدود الساعات المسموحة"><span class="summary-value">${cs.total}<small>/${cs.max}</small></span><span class="summary-label">${cs.state === 'ok' ? 'ساعة معتمدة' : cs.state === 'over' ? 'تجاوزت الحد' : 'أقل من الأدنى'} <i class="ph ph-caret-left cc-caret"></i></span></button>`;
          const summaryHTML = `<div class="schedule-summary"><div class="summary-cell"><span class="summary-value">${uniqueCourseCodes.size}</span><span class="summary-label">مقررات</span></div>${creditCellHTML}<div class="summary-cell"><span class="summary-value">${daySet.size}</span><span class="summary-label">أيام دوام</span></div><div class="summary-cell"><span class="summary-value">${weeklyHours}</span><span class="summary-label">ساعة أسبوعياً</span></div></div>`;
          return `<div id="mobile-my-schedule-list">${itemsHTML}</div>
<div class="mobile-schedule-footer">
${summaryHTML}
<div class="footer-actions-row">
${moadButtonHTML}
${conflictButtonHTML}
${freeButtonHTML}
${shareButtonHTML}
</div>
</div>`;
        },
      });

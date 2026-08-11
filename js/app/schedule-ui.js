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
          return visibleCourses.sort((a, b) => a.code.localeCompare(b.code)).map((group, i) => {
            let sectionsToDisplay = this.state.userSettings.hideClosedCourses ? group.sections.filter(section => !section.status.includes('مغلقة')) : group.sections;
            const matchedIds = term ? sectionMatchIds.get(group.code) : null;
            if (matchedIds) sectionsToDisplay = sectionsToDisplay.filter(section => matchedIds.has(section.uniqueId));
            if (hasFilters) sectionsToDisplay = sectionsToDisplay.filter(section => this._sectionPassesFilters(section, selectedDetails, selectedSections));
            if (sectionsToDisplay.length === 0) return '';
            const sectionsHTML = sectionsToDisplay.map(section => {
              const isNoTime = section.time === 'غير محدد';
              const isOpen = section.status.includes('مفتوحة');

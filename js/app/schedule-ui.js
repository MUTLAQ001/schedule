Object.assign(QU_ScheduleApp, {
        updateFullUI() { this._renderScheduleTabs(); this.updateCalendarAndConflicts(); if (isMobile) { this._updateMobileHeader(); } },
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
              const statusIndicatorHTML = !this.state.userSettings.hideClosedCourses ? `<span class="section-status-dot ${isOpen ? 'open' : 'closed'}"></span>` : ``;
              const favHTML = this._isFavInstructor(section.instructor) ? '<i class="ph-fill ph-star sec-fav"></i>' : '';
              const aria = `شعبة ${section.section} ${this._typeLabel(section.type)} ${section.instructor || ''}`;
              return `<div class="section-btn ${selectedSections.has(section.uniqueId) ? 'selected' : ''} ${isNoTime ? 'no-time' : ''}" role="button" tabindex="0" aria-pressed="${selectedSections.has(section.uniqueId)}" aria-label="${this._escapeHTML(aria)}" data-unique-id="${this._escapeHTML(section.uniqueId)}" style="${isNoTime ? '--item-color:' + group.color + ';--item-color-rgb:' + this._hexToRgb(group.color) : ''}">
${statusIndicatorHTML}${favHTML}<div class="section-btn-number">${this._escapeHTML(section.section)}</div><div class="section-type">${isNoTime ? '<i class="ph ph-laptop"></i>' : ''}${this._escapeHTML(this._typeLabel(section.type))}</div></div>`;
            }).join('');
            const note = (this.state.userSettings.courseNotes || {})[group.code];
            const noteFlag = note ? `<span class="course-note-flag" title="${this._escapeHTML(note)}"><i class="ph-fill ph-note"></i>ملاحظة</span>` : '';
            const countText = matchedIds ? sectionsToDisplay.length + ' نتيجة مطابقة' : (hasFilters ? sectionsToDisplay.length + ' شعبة بعد الترشيح' : sectionsToDisplay.length + ' شعب متاحة');
            return `<div class="course-item ${term || hasFilters ? 'open' : ''}" style="animation-delay: ${i * 30}ms"><div class="course-item-header" role="button" tabindex="0" aria-expanded="${!!(term || hasFilters)}"><span class="color-dot" style="background-color: ${group.color};"></span><div class="course-info"><h3>${this._escapeHTML(group.name)} (${this._escapeHTML(group.code)})${noteFlag}</h3><p>${countText}</p></div><i class="ph ph-caret-down toggle-icon"></i></div><div class="sections-wrapper"><div class="sections-grid">${sectionsHTML}</div></div></div>`;
          }).join('');
        },
        _renderCoursesList() {
          const html = this._createCoursesListHTML();
          if (this.dom.desktopCoursesList) this.dom.desktopCoursesList.innerHTML = html || '';
          if (this.dom.mobileCoursesList) this.dom.mobileCoursesList.innerHTML = html || `<div class="no-data"><i class="ph ph-clock"></i><h4>في انتظار البيانات...</h4><p>استخدم الأداة لتحميل بيانات المواد.</p></div>`;
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
          const emptyScheduleHTML = `<div class="empty-state" style="width:100%"><div class="es-icon"><i class="ph ph-calendar-plus"></i></div><h4>جدولك فارغ</h4><p>اختر شعب المقررات من القائمة، أو دع الجدول الذكي يبني لك جدولاً بلا تعارضات.</p><div class="es-actions"><button class="es-btn primary" data-empty-action="browse"><i class="ph ph-stack"></i> تصفح المقررات</button><button class="es-btn" data-empty-action="auto"><i class="ph ph-magic-wand"></i> الجدول الذكي</button></div></div>`;
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
          Swal.fire({
            title: 'مُعِدّ أداة التعبئة',
            html: `
<div class="crn-generator-content">
<div class="info-row">
<i class="ph ph-check-circle"></i>
<span>تم استخراج أرقام الشعب من جدولك الحالي.</span>
</div>
<div class="input-group">
<label>أرقام الشعب الحرة (اختياري)</label>
<textarea id="swal-free-crns" class="custom-textarea" placeholder="أدخل أرقام الشعب الحرة هنا (مثلاً: 12345, 67890)..."></textarea>
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
              const freeCRNs = result.value.split(/[\n\s,]+/).map(s => s.trim()).filter(Boolean);
              const code = this._generateFillerCode(selectedCourseDetails, freeCRNs);
              this._showFillerTool(code);
            }
          });
        },
        _generateFillerCode(selectedCourseDetails, freeCRNs) {
          const courseLines = selectedCourseDetails.map(c => `${c.name} | ${c.section}`).join('\\n');
          const freeStr = JSON.stringify(freeCRNs || []);
          const isLightT = this.state.userSettings.theme === 'light';
          const AC = this.state.userSettings.accentColor || '#8b5cf6';
          const T = {
            a: AC,
            d: this._adjustColorBrightness(AC, -12),
            d2: this._adjustColorBrightness(AC, -24),
            l: this._adjustColorBrightness(AC, 12),
            tx: isLightT ? this._adjustColorBrightness(AC, -20) : this._adjustColorBrightness(AC, 30),
            rgb: this._hexToRgb(AC),
            bg: isLightT ? 'rgba(255,255,255,.97)' : 'rgba(17,17,20,.93)',
            bd: isLightT ? 'rgba(20,20,45,.12)' : 'rgba(255,255,255,.09)',
            hd: isLightT ? '#16161f' : '#fff',
            text: isLightT ? '#26263a' : '#e4e4e7',
            text2: isLightT ? '#2b2b40' : '#e5e7eb',
            text3: isLightT ? '#4b5563' : '#d1d5db',
            mut: isLightT ? '#6b7280' : '#9ca3af',
            srf: isLightT ? 'rgba(20,20,45,.04)' : 'rgba(255,255,255,.03)',
            srf2: isLightT ? 'rgba(20,20,45,.05)' : 'rgba(255,255,255,.05)',
            srf3: isLightT ? 'rgba(20,20,45,.06)' : 'rgba(255,255,255,.06)',
            srfBd: isLightT ? 'rgba(20,20,45,.09)' : 'rgba(255,255,255,.07)',
            chipBd: isLightT ? 'rgba(20,20,45,.13)' : 'rgba(255,255,255,.12)',
            bar: isLightT ? 'rgba(20,20,45,.08)' : 'rgba(255,255,255,.08)',
            shadow: isLightT ? 'rgba(30,30,60,.18)' : 'rgba(0,0,0,.5)',
            ok: isLightT ? '#059669' : '#34d399',
            er: isLightT ? '#dc2626' : '#f87171',
            er2: isLightT ? '#b91c1c' : '#fca5a5'
          };
          const script = `(function(){'use strict';const form=document.querySelector('form[name="allData"]');if(!form){const msg=document.createElement('div');msg.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#ef4444;color:white;padding:10px 20px;border-radius:10px;z-index:9999;font-family:'Segoe UI',sans-serif;box-shadow:0 5px 15px rgba(0,0,0,0.2);direction:rtl;font-weight:600;";msg.innerText="الرجاء الذهاب إلى صفحة الحذف والإضافة أولاً لاستخدام الأداة.";document.body.appendChild(msg);setTimeout(()=>msg.remove(),4000);return;}
const SW='fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const IC={spark:'<svg viewBox="0 0 24 24" '+SW+' stroke-width="1.8"><path d="M21.64 3.64l-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72z"/><path d="M14 7l3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>',bolt:'<svg viewBox="0 0 24 24" '+SW+' stroke-width="2"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/></svg>',check:'<svg viewBox="0 0 24 24" '+SW+' stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>',x:'<svg viewBox="0 0 24 24" '+SW+' stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>',clock:'<svg viewBox="0 0 24 24" '+SW+' stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.8l3 1.8"/></svg>'};
let inited=false;
function el(id){return document.getElementById(id)}
function showUI(){if(inited||document.getElementById('qu-auto-add-box'))return;inited=true;const container=document.createElement('div');container.id='qu-auto-add-box';container.innerHTML=\`<style>#qu-auto-add-box *{box-sizing:border-box;margin:0}@keyframes quFadeInDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}@keyframes quPulse{0%{box-shadow:0 0 0 0 rgba(${T.rgb},.35)}70%{box-shadow:0 0 0 14px rgba(${T.rgb},0)}100%{box-shadow:0 0 0 0 rgba(${T.rgb},0)}}@keyframes quSpin{to{transform:rotate(360deg)}}@keyframes quRowIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes quPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}#qu-auto-add-box .qu-box{background:${T.bg};backdrop-filter:blur(18px);padding:1.75rem 1.5rem;border-radius:22px;margin:20px auto;max-width:520px;width:92%;box-shadow:0 18px 45px -14px ${T.shadow};border:1px solid ${T.bd};font-family:'Segoe UI',Tahoma,sans-serif;color:${T.text};direction:rtl;text-align:right;animation:quFadeInDown .5s cubic-bezier(.2,.8,.2,1) both;transition:border-color .3s}.qu-box.qu-running{animation:quPulse 2s infinite;border-color:rgba(${T.rgb},.45)}#qu-auto-add-box .qu-header{display:flex;align-items:center;gap:14px;padding-bottom:1.15rem;margin-bottom:1.25rem;border-bottom:1px solid ${T.bar}}.qu-logo{width:42px;height:42px;flex:none;border-radius:13px;background:linear-gradient(135deg,${T.a},${T.d2});display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 6px 16px rgba(${T.rgb},.35)}.qu-logo svg{width:22px;height:22px}.qu-title{display:block;color:${T.hd};font-weight:800;font-size:1.15rem;line-height:1.2}#qu-auto-add-box .qu-sub{display:block;color:${T.mut};font-size:.78rem;margin-top:2px}.qu-btn{width:100%;padding:1rem;background:linear-gradient(135deg,${T.a},${T.d});color:#fff;border:none;border-radius:999px;font-weight:700;font-size:1rem;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:.5rem;font-family:inherit}.qu-btn svg{width:17px;height:17px}.qu-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 18px rgba(${T.rgb},.35)}.qu-btn:disabled{cursor:not-allowed;transform:none}.qu-btn.qu-fin{background:linear-gradient(135deg,#10b981,#059669)}.qu-spinner{width:17px;height:17px;flex:none;border:2.5px solid rgba(255,255,255,.25);border-radius:50%;border-top-color:#fff;animation:quSpin .7s linear infinite}#qu-auto-add-box .qu-progress{display:none;margin-top:1.5rem}#qu-auto-add-box .qu-prog-top{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:.85rem;margin-bottom:.8rem}.qu-prog-label{color:${T.tx};font-weight:600;display:flex;align-items:center;gap:7px;min-width:0}.qu-prog-label span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qu-prog-count{color:${T.hd};font-weight:800;background:rgba(${T.rgb},.15);border:1px solid rgba(${T.rgb},.3);padding:2px 11px;border-radius:999px;font-size:.78rem;flex:none}.qu-bar{height:9px;border-radius:999px;background:${T.bar};overflow:hidden}.qu-bar-fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,${T.l},${T.d});transition:width .45s cubic-bezier(.2,.8,.2,1)}#qu-auto-add-box .qu-chips{display:flex;gap:10px;margin-top:1.4rem}.qu-chip{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;font-size:.74rem;font-weight:700;padding:9px 6px;border-radius:12px;border:1px solid}.qu-chip svg{width:12px;height:12px}.qu-chip b{font-size:.85rem}.qu-chip.ok{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25);color:${T.ok}}.qu-chip.wt{background:${T.srf2};border-color:${T.chipBd};color:${T.text3}}.qu-chip.fl{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.22);color:${T.er}}#qu-auto-add-box .qu-duo{display:none;margin-top:2rem;flex-direction:column;gap:16px}.qu-slot{padding:16px 18px;border-radius:16px;background:${T.srf};border:1px solid ${T.srfBd};transition:background .35s,border-color .35s,box-shadow .35s,opacity .35s}#qu-auto-add-box .qu-slot-tag{display:inline-flex;align-items:center;gap:5px;font-size:.66rem;font-weight:800;color:${T.mut};background:${T.srf3};border:1px solid ${T.chipBd};padding:4px 11px;border-radius:999px;margin-bottom:12px}.qu-slot-tag svg{width:11px;height:11px}.qu-slot-row{display:flex;align-items:center;gap:12px}.qu-slot-row.qu-swap{animation:quRowIn .35s cubic-bezier(.2,.8,.2,1) both}.qu-ic{width:26px;height:26px;flex:none;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${T.srf3};color:${T.mut};transition:all .3s}.qu-ic svg{width:13px;height:13px}.qu-row-body{min-width:0;flex:1}.qu-row-name{display:block;font-size:.85rem;font-weight:600;color:${T.text2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#qu-auto-add-box .qu-row-note{display:none;font-size:.7rem;color:${T.er};margin-top:1px}.qu-sec{flex:none;font-size:.72rem;font-weight:700;color:${T.tx};background:rgba(${T.rgb},.12);border:1px solid rgba(${T.rgb},.25);padding:2px 9px;border-radius:999px}.qu-slot-now{background:linear-gradient(135deg,rgba(${T.rgb},.16),rgba(${T.rgb},.06));border-color:rgba(${T.rgb},.45);box-shadow:0 10px 26px -12px rgba(${T.rgb},.5)}.qu-slot-now .qu-slot-tag{color:${T.tx};background:rgba(${T.rgb},.16);border-color:rgba(${T.rgb},.35)}.qu-slot-now .qu-ic{width:32px;height:32px;border-radius:11px;background:rgba(${T.rgb},.2);color:${T.tx}}.qu-slot-now .qu-ic svg{width:15px;height:15px}.qu-slot-now .qu-row-name{font-size:.95rem;font-weight:700;color:${T.hd}}.qu-slot-next{opacity:.7}.qu-slot-next .qu-row-name{color:${T.text3}}.qu-slot-now.is-ok{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.4);box-shadow:0 10px 26px -12px rgba(16,185,129,.4)}.qu-slot-now.is-ok .qu-slot-tag{color:${T.ok};background:rgba(16,185,129,.12);border-color:rgba(16,185,129,.3)}.qu-slot-now.is-ok .qu-ic{background:rgba(16,185,129,.16);color:${T.ok}}.qu-slot-now.is-ok .qu-ic svg{animation:quPop .35s ease both}.qu-slot-now.is-fail{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.4);box-shadow:0 10px 26px -12px rgba(239,68,68,.35)}.qu-slot-now.is-fail .qu-slot-tag{color:${T.er};background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.28)}.qu-slot-now.is-fail .qu-ic{background:rgba(239,68,68,.14);color:${T.er}}.qu-slot-now.is-fail .qu-sec{color:${T.er2};background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25)}.qu-slot-now.is-fail .qu-row-note{display:block}#qu-auto-add-box .qu-status{margin-top:2rem;padding:1.4rem;border-radius:16px;font-size:.9rem;line-height:1.6;display:none}.qu-status.success{background:rgba(16,185,129,.12);color:${T.ok};border:1px solid rgba(16,185,129,.22)}.qu-status.error{background:rgba(239,68,68,.1);color:${T.er};border:1px solid rgba(239,68,68,.2)}</style><div class="qu-box" id="quContainerBox"><div class="qu-header"><div class="qu-logo">\${IC.spark}</div><div style="min-width:0"><span class="qu-title">مُعِدّ</span><span class="qu-sub">إضافة مقرراتك إلى جدولك بشكل تلقائي</span></div></div><button type="button" class="qu-btn" id="quStartAdd">\${IC.bolt}<span>تفعيل الإضافة التلقائية</span></button><div class="qu-progress" id="quProgress"><div class="qu-prog-top"><div class="qu-prog-label"><div class="qu-spinner" id="quProgSpin" style="width:14px;height:14px;border-width:2px"></div><span id="quProgTxt">جاري التجهيز...</span></div><span class="qu-prog-count" id="quProgCount">0 / 0</span></div><div class="qu-bar"><div class="qu-bar-fill" id="quBarFill"></div></div><div class="qu-chips"><span class="qu-chip ok">\${IC.check} تم <b id="quN1">0</b></span><span class="qu-chip wt">\${IC.clock} متبقي <b id="quN2">0</b></span><span class="qu-chip fl">\${IC.x} تعذر <b id="quN3">0</b></span></div></div><div class="qu-duo" id="quList"><div class="qu-slot qu-slot-now" id="quNowSlot"><span class="qu-slot-tag" id="quNowTag">\${IC.bolt}<span>جاري العمل عليه</span></span><div class="qu-slot-row" id="quNowRow"><span class="qu-ic" id="quNowIc">\${IC.clock}</span><div class="qu-row-body"><span class="qu-row-name" id="quNowName">بانتظار البدء...</span><span class="qu-row-note" id="quNowNote"></span></div><span class="qu-sec" id="quNowSec"></span></div></div><div class="qu-slot qu-slot-next" id="quNextSlot"><span class="qu-slot-tag">\${IC.clock}<span>التالي في الدور</span></span><div class="qu-slot-row" id="quNextRow"><span class="qu-ic">\${IC.clock}</span><div class="qu-row-body"><span class="qu-row-name" id="quNextName">—</span></div><span class="qu-sec" id="quNextSec"></span></div></div></div><div class="qu-status" id="quStatus"></div></div>\`;const table=form.querySelector('table');if(table){form.insertBefore(container,table)}else{form.prepend(container)}el('quStartAdd').addEventListener('click',startProcess)}
function parse(text){const lines=text.trim().split('\\n').filter(l=>l.trim());const courses=[];for(const line of lines){const match=line.match(/\\|\\s*(\\d+)\\s*$/);if(match){let name=line.split('|')[0].trim();if(name.includes(' - د.')) name=name.split(' - د.')[0].trim();courses.push({name:name,section:match[1]})}}return courses}
let COURSES=[],FAILS=[];
function swap(id){const r=el(id);if(!r)return;r.classList.remove('qu-swap');void r.offsetWidth;r.classList.add('qu-swap')}
function buildList(courses){COURSES=courses;FAILS=[];el('quList').style.display='flex'}
function setRow(i,state,note){const slot=el('quNowSlot');const c=COURSES[i];if(!slot||!c)return;if(state==='active'){slot.classList.remove('is-ok','is-fail');el('quNowTag').innerHTML=IC.bolt+'<span>جاري العمل عليه</span>';el('quNowIc').innerHTML='<div class="qu-spinner" style="width:13px;height:13px;border-width:2px"></div>';el('quNowName').textContent=c.name;el('quNowSec').textContent='شعبة '+c.section;el('quNowNote').textContent='';swap('quNowRow');const n=COURSES[i+1];const nx=el('quNextSlot');if(n){nx.style.display='';el('quNextName').textContent=n.name;el('quNextSec').textContent='شعبة '+n.section;swap('quNextRow')}else{nx.style.display='none'}}else if(state==='ok'){slot.classList.remove('is-fail');slot.classList.add('is-ok');el('quNowTag').innerHTML=IC.check+'<span>تمت إضافته</span>';el('quNowIc').innerHTML=IC.check}else if(state==='fail'){slot.classList.remove('is-ok');slot.classList.add('is-fail');el('quNowTag').innerHTML=IC.x+'<span>تعذرت إضافته</span>';el('quNowIc').innerHTML=IC.x;if(note){el('quNowNote').textContent=note;FAILS.push({name:c.name,note:note})}}}
function setCounts(done,fail,total,label){el('quN1').textContent=done;el('quN2').textContent=total-done-fail;el('quN3').textContent=fail;el('quProgCount').textContent=(done+fail)+' / '+total;el('quBarFill').style.width=(total?Math.round((done+fail)/total*100):0)+'%';if(label)el('quProgTxt').textContent=label}
function status(msg,type){const s=el('quStatus');s.style.display='block';s.className='qu-status '+type;s.innerHTML=msg}
async function startProcess(){const btn=el('quStartAdd');const box=el('quContainerBox');if(btn.disabled)return;btn.disabled=true;btn.innerHTML='<div class="qu-spinner"></div><span>جاري الإضافة...</span>';box.classList.add('qu-running');const txt=\`${courseLines}\`;const courses=parse(txt);const free=${freeStr};el('quProgress').style.display='block';buildList(courses);setCounts(0,0,courses.length,'جاري التجهيز...');await new Promise(r=>setTimeout(r,400));let added=0,failed=0;for(let i=0;i<courses.length;i++){const c=courses[i];setRow(i,'active');setCounts(added,failed,courses.length,'جاري إضافة: '+c.name);const row=findRow(c.name);if(!row){failed++;setRow(i,'fail','لم يتم العثور على المقرر في الصفحة');continue}const chk=row.querySelector('input[type="CHECKBOX"]');const link=row.querySelector('a[onclick*="showToolTip"]');if(!chk||!link){failed++;setRow(i,'fail','تعذر تحديد المقرر');continue}if(!chk.checked){chk.click();await new Promise(r=>setTimeout(r,300))}link.click();await new Promise(r=>setTimeout(r,800));const popup=document.getElementById('tableContainer');if(popup){const links=popup.querySelectorAll('a[onclick*="changeSction"]');let found=false;for(const l of links){if(l.textContent.trim()===c.section){l.click();found=true;await new Promise(r=>setTimeout(r,500));break}}if(!found){try{hideDilaogPrimeUI('divsData')}catch(e){}failed++;setRow(i,'fail','الشعبة غير موجودة');continue}}await new Promise(r=>setTimeout(r,500));added++;setRow(i,'ok');setCounts(added,failed,courses.length)}let freeNote='';if(free&&free.length>0){let freeFilled=0;for(let i=0;i<free.length;i++){const fEl=document.getElementById('addSection'+i)||document.getElementById('freeSection'+i);if(fEl){fEl.value=free[i];fEl.dispatchEvent(new Event('blur',{bubbles:true}));fEl.dispatchEvent(new Event('keyup',{bubbles:true}));freeFilled++;}}if(freeFilled>0)freeNote='<div style="margin-bottom:12px;font-size:.85rem;color:${T.tx}">✦ تمت تعبئة '+freeFilled+' شعبة حرة.</div>'}el('quProgSpin').style.display='none';setCounts(added,failed,courses.length,'اكتملت العملية');const lastStep='<div style="background:${T.srf2};border:1px dashed rgba(255,255,255,.2);padding:12px;border-radius:12px;color:#e0e0e0;line-height:1.6">👇 خطوتك الأخيرة:<br>انزل لأسفل الصفحة واضغط على زر <strong style="color:${T.l}">"إضافة"</strong> لحفظ جدولك.</div>';let msg='';if(failed===0){msg='<div style="text-align:center;padding:4px 0"><div style="font-size:2.4rem;margin-bottom:8px;animation:quPop .5s ease-out">🎉</div><div style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:4px">اكتملت العملية بنجاح!</div><div style="color:${T.ok};margin-bottom:14px">تم تحديد '+added+' مقرر جاهز للإضافة</div>'+freeNote+lastStep+'</div>'}else{msg='<div style="text-align:center;padding:4px 0"><div style="font-size:2.4rem;margin-bottom:8px;animation:quPop .5s ease-out">⚠️</div><div style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:4px">اكتملت العملية بملاحظات</div><div style="color:${T.er};margin-bottom:6px">تم تحديد '+added+' مقرر، وتعذر '+failed+'</div><div style="margin-bottom:14px">'+FAILS.map(function(f){return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:11px;padding:7px 12px;margin-bottom:6px;font-size:.8rem;text-align:right"><span style="color:${T.er2};font-weight:700">'+f.name+'</span><span style="color:${T.er};font-size:.7rem;flex:none">'+f.note+'</span></div>'}).join('')+'</div>'+freeNote+lastStep+'</div>'}status(msg,added>0?'success':'error');btn.innerHTML=(failed===0?IC.check:IC.x)+'<span>اكتمل التفعيل</span>';if(failed===0)btn.classList.add('qu-fin');box.classList.remove('qu-running')}
function findRow(name){const cells=document.querySelectorAll('td[id^="courseName"]');for(const cell of cells){const txt=cell.textContent.trim().replace(/\\s+/g,' ');if(txt.includes(name)||name.includes(txt.replace('&nbsp;','').trim())) return cell.closest('tr')}return null}
showUI();})();`;
          return "javascript:" + encodeURIComponent(script);
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
              html: `<div id="swal-custom-close" style="position: absolute; top: 12px; left: 15px; cursor: pointer; color: var(--color-text-muted); font-size: 1.5rem; z-index: 50;"><i class="ph ph-x"></i></div><div style="text-align: right;"><p style="margin-bottom: 1.5rem; color: var(--color-text-muted); line-height: 1.6;">اسحب الزر التالي وأفلته في شريط الإشارات المرجعية (Bookmarks Bar) أعلى المتصفح.</p><div style="text-align: center; margin-bottom: 1.5rem;"><a href="${code}" class="bookmarklet-button" style="text-decoration:none; display:inline-flex;" onclick="return false;"><i class="ph ph-magic-wand"></i> مُعِدّ</a></div><p style="font-size: 0.85rem; opacity: 0.7; text-align: center;">عند فتح صفحة الحذف والإضافة، اضغط على هذا الزر لتعبئة الشعب.</p></div>`,
              didOpen: () => { document.getElementById('swal-custom-close').addEventListener('click', () => Swal.close()); }
            });
          }
        },
        _createMyScheduleHTML(selectedCourses, conflictMap) {
          let totalCredits = 0; const uniqueCourseCodes = new Set();
          selectedCourses.forEach(c => { if (!uniqueCourseCodes.has(c.code)) { totalCredits += parseInt(c.hours, 10) || 0; uniqueCourseCodes.add(c.code); } });
          let statsHTML = this._createScheduleStatsHTML(selectedCourses, uniqueCourseCodes.size);
          const conflictBtnHTML = conflictMap.size > 0 ? `<button class="view-conflicts-btn" id="desktop-view-conflicts-btn"><i class="ph-fill ph-wrench"></i> حل التعارض</button>` : '';
          if (conflictBtnHTML) {
            statsHTML = statsHTML ? statsHTML.replace('</div>', `${conflictBtnHTML}</div>`) : `<div class="schedule-stats">${conflictBtnHTML}</div>`;
          }
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
          return `<div class="card my-schedule-card"><div class="my-schedule-section"><div class="card-header-inline"><div class="card-header-actions"><h3><i class="ph ph-calendar-check"></i> جدولـي</h3><button class="copy-crn-btn" id="desktop-copy-crn-btn" title="نسخ أرقام الشعب"><i class="ph ph-copy"></i> نسخ الشعب</button></div><div style="display:flex;align-items:center;gap:0.75rem;"><button class="moad-btn" id="generate-crn-tool-btn"><i class="ph ph-magic-wand"></i> مُعِدّ</button><div class="total-credits-pill">إجمالي الساعات: <span>${totalCredits}</span></div></div></div>${statsHTML}<div class="my-schedule-table-wrapper"><table class="my-schedule-table"><thead><tr><th>المقرر</th><th>الشعبة</th><th>المحاضر</th><th>المواعيد</th><th>فترة الاختبار</th><th>المكان</th><th>الساعات</th></tr></thead><tbody>${tableRowsHTML}</tbody></table></div><div class="my-schedule-grid-wrapper hidden">${gridItemsHTML}</div></div></div>`;
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
          const shareButtonHTML = `<button class="footer-icon-btn" id="mobile-share-schedule-btn" aria-label="مشاركة الجدول" title="مشاركة الجدول"><i class="ph ph-share-network"></i></button>`;
          const daySet = new Set(); let weeklyMin = 0;
          selectedCourses.forEach(c => c.timeSlots.forEach(s => { daySet.add(s.day); weeklyMin += this._toMin(s.end) - this._toMin(s.start); }));
          const weeklyHours = Math.round((weeklyMin / 60) * 10) / 10;
          const summaryHTML = `<div class="schedule-summary"><div class="summary-cell"><span class="summary-value">${uniqueCourseCodes.size}</span><span class="summary-label">مقررات</span></div><div class="summary-cell accent"><span class="summary-value">${totalCredits}</span><span class="summary-label">ساعة معتمدة</span></div><div class="summary-cell"><span class="summary-value">${daySet.size}</span><span class="summary-label">أيام دوام</span></div><div class="summary-cell"><span class="summary-value">${weeklyHours}</span><span class="summary-label">ساعة أسبوعياً</span></div></div>`;
          return `<div id="mobile-my-schedule-list">${itemsHTML}</div>
<div class="mobile-schedule-footer">
${summaryHTML}
<div class="footer-actions-row">
${moadButtonHTML}
${conflictButtonHTML}
${shareButtonHTML}
</div>
</div>`;
        },
      });

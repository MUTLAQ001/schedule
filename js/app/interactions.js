Object.assign(QU_ScheduleApp, {
        _handleSectionHover(event, isHovering) {
          if (isMobile) return;
          const sectionBtn = event.target.closest('.section-btn');
          if (!sectionBtn) return;
          if (isHovering) { const section = this.state.allCoursesData.find(c => c.uniqueId === sectionBtn.dataset.uniqueId); if (section) this._showPreviewEvent(section); }
          else { this._removePreviewEvent(); }
        },
        _showPreviewEvent(section) {
          this._removePreviewEvent();
          const group = this.state.groupedCourses[section.code]; if (!group) return;
          this.state.calendar.addEventSource(this._createLectureEventsForSection(section, true, group.color));
        },
        _removePreviewEvent() { const existingSource = this.state.calendar.getEventSourceById('preview-source'); if (existingSource) existingSource.remove(); },
        _handleCourseListClick(e) {
          const sectionBtn = e.target.closest('.section-btn'); const header = e.target.closest('.course-item-header');
          if (sectionBtn) {
            if (this._suppressSectionClick) { this._suppressSectionClick = false; return; }
            const uniqueId = sectionBtn.dataset.uniqueId;
            const section = this.state.allCoursesData.find(c => c.uniqueId === uniqueId);
            if (!section) return;
            const group = this.state.groupedCourses[section.code]; const activeSchedule = this.state.schedules[this.state.activeScheduleIndex]; if (!activeSchedule) return;
            if (isMobile) { this._showMobileSectionDetails(section, group); } else { if (activeSchedule.sections.has(uniqueId)) { this._removeWithUndo(uniqueId, activeSchedule); } else { this._addSectionAndLink(uniqueId, activeSchedule); this._vibrate(12); this.updateCalendarAndConflicts(); } }
          } else if (header) {
            const courseItem = header.parentElement; const isOpening = !courseItem.classList.contains('open'); courseItem.classList.toggle('open'); courseItem.classList.remove('qs-auto-open'); header.setAttribute('aria-expanded', String(isOpening));
            if (isOpening) { const sections = courseItem.querySelectorAll('.section-btn'); sections.forEach((section, index) => { section.style.animationDelay = `${index * 25}ms`; }); }
            else { courseItem.querySelectorAll('.section-btn.sec-settled').forEach(s => s.classList.remove('sec-settled')); }
          }
        },
        _addSectionAndLink(sectionId, schedule) {
          const section = this.state.allCoursesData.find(s => s.uniqueId === sectionId);
          if (!section) return false;
          const tempSelectedDetails = Array.from(schedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          if (this._isSectionConflicted(section, tempSelectedDetails)) { if (isMobile) { this._showToast('warning', 'تنبيه: الشعبة المضافة متعارضة.'); } }
          schedule.sections.add(sectionId);
          const linkedGroup = this.state.linkedCourseGroups[section.name];
          if (linkedGroup) {
            const otherCourseCodes = linkedGroup.filter(code => code !== section.code);
            for (const otherCode of otherCourseCodes) {
              const correspondingSection = this.state.groupedCourses[otherCode]?.sections.find(s => s.section === section.section);
              if (!correspondingSection || schedule.sections.has(correspondingSection.uniqueId)) continue;
              if (this.state.userSettings.hideClosedCourses && correspondingSection.status.includes('مغلقة')) { this._showToast('info', `الشعبة المرتبطة ${correspondingSection.code}-${correspondingSection.section} مغلقة.`); continue; }
              schedule.sections.add(correspondingSection.uniqueId);
              if (!schedule.linkedSections.has(sectionId)) schedule.linkedSections.set(sectionId, new Set());
              schedule.linkedSections.get(sectionId).add(correspondingSection.uniqueId);
              this._showToast('success', `تمت إضافة شعبة مرتبطة: ${correspondingSection.code}-${correspondingSection.section}`);
            }
          }
          const _qaCompanion = s => this._qaCompanion(s);
          if (this.state.userSettings.quickAddMode) {
            const ownGroup = this.state.groupedCourses[section.code];
            const ordered = ownGroup ? ownGroup.sections : [];
            const idx = ordered.findIndex(s => s.uniqueId === section.uniqueId);
            if (idx !== -1 && ordered.some(r => _qaCompanion(r)) && ordered.some(r => !_qaCompanion(r))) {
              let anchor = idx;
              if (_qaCompanion(section)) { let p = idx - 1; while (p >= 0 && _qaCompanion(ordered[p])) p--; anchor = p; }
              if (anchor !== -1) {
                const companions = [];
                for (let i = anchor + 1; i < ordered.length; i++) { if (!_qaCompanion(ordered[i])) break; companions.push(ordered[i]); }
                const linkPair = (cand) => {
                  schedule.sections.add(cand.uniqueId);
                  if (!schedule.linkedSections.has(sectionId)) schedule.linkedSections.set(sectionId, new Set());
                  schedule.linkedSections.get(sectionId).add(cand.uniqueId);
                  const typeTxt = this._typeLabel(cand.type); this._showToast('success', `إضافة سريعة: أُضيفت شعبة ${cand.section}${typeTxt ? ' (' + typeTxt + ')' : ''}`);
                };
                if (_qaCompanion(section)) {
                  const anch = ordered[anchor];
                  if (!schedule.sections.has(anch.uniqueId)) {
                    if (this.state.userSettings.hideClosedCourses && anch.status.includes('مغلقة')) { this._showToast('info', `إضافة سريعة: الشعبة ${anch.section} مغلقة، لم تُضف.`); }
                    else linkPair(anch);
                  }
                } else {
                  const cands = companions.filter(c => !schedule.sections.has(c.uniqueId));
                  const openCands = cands.filter(c => !(this.state.userSettings.hideClosedCourses && c.status.includes('مغلقة')));
                  if (openCands.length === 0) { if (cands.length > 0) this._showToast('info', 'الشعب المرافقة مغلقة، لم تُضف.'); }
                  else {
                    const typeGroups = new Map();
                    openCands.forEach(c => { const k = this._typeLabel(c.type) || 'مرافقة'; if (!typeGroups.has(k)) typeGroups.set(k, []); typeGroups.get(k).push(c); });
                    const needsChoice = [];
                    typeGroups.forEach((arr, typeName) => { if (arr.length === 1) linkPair(arr[0]); else needsChoice.push([typeName, arr]); });
                    if (needsChoice.length) {
                      const showPicker = (mi) => {
                        if (mi >= needsChoice.length) { this.updateCalendarAndConflicts(); return; }
                        const [typeName, arr] = needsChoice[mi];
                        const cardsHTML = arr.map((c, i) => { const tt = this._typeLabel(c.type); const timeTxt = String(c.time || '').replace(/<br>/g, ' / '); return `<div class="qa-pick-option ${i === 0 ? 'selected' : ''}" data-uid="${this._escapeHTML(c.uniqueId)}"><span class="qa-pick-radio"></span><div class="qa-pick-info"><div class="qa-pick-top"><span class="qa-pick-num">شعبة ${this._escapeHTML(c.section)}</span>${tt ? `<span class="qa-pick-type">${this._escapeHTML(tt)}</span>` : ''}</div>${c.instructor ? `<span class="qa-pick-sub"><i class="ph ph-user"></i> ${this._escapeHTML(c.instructor)}</span>` : ''}${timeTxt ? `<span class="qa-pick-sub"><i class="ph ph-clock"></i> ${this._escapeHTML(timeTxt)}</span>` : ''}</div></div>`; }).join('');
                        Swal.fire({
                          title: `اختر شعبة ${typeName}`,
                          html: `<div style="font-size:0.9rem;">هذا المقرر له أكثر من شعبة ${typeName}، اختر واحدة منها:</div><div class="qa-pick-list">${cardsHTML}</div>`,
                          showCancelButton: true, confirmButtonText: 'إضافة', cancelButtonText: 'تخطي',
                          didOpen: (popup) => { popup.querySelectorAll('.qa-pick-option').forEach(el => { el.addEventListener('click', () => { popup.querySelectorAll('.qa-pick-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); }); }); },
                          preConfirm: () => { const sel = Swal.getPopup().querySelector('.qa-pick-option.selected'); return sel ? sel.dataset.uid : null; }
                        }).then(res => { if (res.isConfirmed && res.value) { const chosen = arr.find(c => c.uniqueId === res.value); if (chosen) linkPair(chosen); } showPicker(mi + 1); });
                      };
                      showPicker(0);
                    }
                  }
                }
              }
            }
          }
          return true;
        },
        _removeSectionAndUnlink(sectionId, schedule) {
          schedule.sections.delete(sectionId);
          if (schedule.linkedSections.has(sectionId)) { const linkedIds = schedule.linkedSections.get(sectionId); linkedIds.forEach(id => schedule.sections.delete(id)); schedule.linkedSections.delete(sectionId); if (linkedIds.size > 0) this._showToast('info', 'تمت إزالة الشعب المرتبطة.'); }
          for (const [triggerId, linkedIds] of schedule.linkedSections.entries()) { if (linkedIds.has(sectionId)) { schedule.sections.delete(triggerId); linkedIds.forEach(id => schedule.sections.delete(id)); schedule.linkedSections.delete(triggerId); this._showToast('info', 'تمت إزالة المجموعة المرتبطة.'); break; } }
          return true;
        },
        _handleClearCalendar() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('info', 'الجدول الحالي فارغ بالفعل'); return; }
          Swal.fire({ title: 'هل أنت متأكد؟', text: `سيتم مسح جميع المواد المختارة من "${activeSchedule.name}".`, icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، امسح الجدول!', cancelButtonText: 'إلغاء', }).then((result) => { if (result.isConfirmed) { activeSchedule.sections.clear(); activeSchedule.linkedSections.clear(); this.updateCalendarAndConflicts(); this._showToast('success', 'تم مسح الجدول بنجاح'); } });
        },
        _buildConflictBanner(conflictDetails) {
          if (!conflictDetails || !conflictDetails.length) return '';
          const rows = conflictDetails.map(c => {
            if (c.type === 'exam') {
              return `<div class="cb-row"><span class="cb-badge exam"><i class="ph-fill ph-file-text"></i></span><div class="cb-main"><div class="cb-title">${this._escapeHTML(c.other.name)}<span class="cb-sec">شعبة ${this._escapeHTML(c.other.section)}</span></div><div class="cb-sub">نفس فترة الاختبار النهائي<i class="cb-dot"></i>الفترة ${this._escapeHTML(String(c.period))}</div></div></div>`;
            }
            return `<div class="cb-row"><span class="cb-badge time"><i class="ph-fill ph-clock"></i></span><div class="cb-main"><div class="cb-title">${this._escapeHTML(c.other.name)}<span class="cb-sec">شعبة ${this._escapeHTML(c.other.section)}</span></div><div class="cb-sub">${c.day}<i class="cb-dot"></i><span class="cb-time">${this._formatClock(c.from)} – ${this._formatClock(c.to)}</span><i class="cb-dot"></i>${this._formatDuration(c.mins)}</div></div></div>`;
          }).join('');
          const n = conflictDetails.length;
          const sub = n === 1 ? 'تعارض واحد' : n === 2 ? 'تعارضان' : `${n} تعارضات`;
          return `<div class="conflict-banner"><div class="cb-head"><span class="cb-head-icon"><i class="ph-fill ph-warning"></i></span><div class="cb-head-text"><span class="cb-head-title">هذه الشعبة تتعارض مع جدولك</span><span class="cb-head-sub">${sub} — يمكنك اختيار شعبة أخرى بالأسفل</span></div></div><div class="cb-list">${rows}</div></div>`;
        },
        _cloneLinked(map) { return new Map(Array.from(map.entries()).map(([k, v]) => [k, new Set(v)])); },
        _trackHistory() {
          const idx = this.state.activeScheduleIndex;
          const sch = this.state.schedules[idx];
          if (!sch) { this._lastSnap = null; return; }
          const ids = Array.from(sch.sections).sort().join('|');
          const prev = this._lastSnap;
          if (prev && prev.idx === idx && prev.ids !== ids && !this._restoringHistory) {
            this.state.history.push({ idx, sections: prev.sections, linked: prev.linked });
            if (this.state.history.length > 30) this.state.history.shift();
          }
          this._lastSnap = { idx, ids, sections: new Set(sch.sections), linked: this._cloneLinked(sch.linkedSections) };
        },
        _undoLast() {
          const h = this.state.history.pop();
          if (!h) { this._showToast('info', 'لا يوجد تغيير يمكن التراجع عنه'); return; }
          const sch = this.state.schedules[h.idx];
          if (!sch) return;
          this._restoringHistory = true;
          sch.sections = new Set(h.sections);
          sch.linkedSections = this._cloneLinked(h.linked);
          this.state.activeScheduleIndex = h.idx;
          this.updateFullUI();
          this._restoringHistory = false;
          this._vibrate(15);
          this._showToast('success', 'تم التراجع عن آخر تغيير');
        },
        _handleViewAllConflictsShortcut() {
          const sch = this.state.schedules[this.state.activeScheduleIndex];
          if (!sch) return;
          const details = Array.from(sch.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const map = this._calculateConflicts(details);
          if (map.size === 0) { this._showToast('success', 'لا توجد تعارضات في جدولك'); return; }
          this._handleViewAllConflicts(map);
        },
        _isFavInstructor(name) {
          if (!name) return false;
          const n = this._normalizeArabic(name).trim();
          if (!n || n === 'غير محدد') return false;
          return (this.state.userSettings.favInstructors || []).includes(n);
        },
        _toggleFavInstructor(name) {
          if (!name || name === 'غير محدد') { this._showToast('info', 'لا يوجد اسم محاضر لهذه الشعبة'); return; }
          const n = this._normalizeArabic(name).trim();
          if (!Array.isArray(this.state.userSettings.favInstructors)) this.state.userSettings.favInstructors = [];
          const list = this.state.userSettings.favInstructors;
          const i = list.indexOf(n);
          if (i >= 0) { list.splice(i, 1); this._showToast('info', 'أُزيل من المفضلين'); }
          else { list.push(n); this._showToast('success', 'أُضيف إلى المفضلين'); }
          this._saveSettings();
          this._renderCoursesList();
          this.updateCalendarAndConflicts();
          this._renderFilterUI();
        },
        _editCourseNote(code, after) {
          if (!this.state.userSettings.courseNotes || typeof this.state.userSettings.courseNotes !== 'object') this.state.userSettings.courseNotes = {};
          const notes = this.state.userSettings.courseNotes;
          const group = this.state.groupedCourses[code];
          const existing = notes[code] || '';
          Swal.fire({
            title: `ملاحظة على ${group ? group.name : code}`,
            input: 'textarea',
            inputValue: existing,
            inputPlaceholder: 'رابط قروب المقرر، تغيير القاعة، متطلبات الدكتور...',
            inputAttributes: { maxlength: 400 },
            showCancelButton: true,
            showDenyButton: !!existing,
            confirmButtonText: 'حفظ',
            denyButtonText: 'حذف',
            cancelButtonText: 'إلغاء'
          }).then(r => {
            if (r.isConfirmed) {
              const v = String(r.value || '').trim();
              if (v) notes[code] = v; else delete notes[code];
              this._saveSettings();
              this._showToast('success', v ? 'تم حفظ الملاحظة' : 'تم حذف الملاحظة');
            } else if (r.isDenied) {
              delete notes[code];
              this._saveSettings();
              this._showToast('success', 'تم حذف الملاحظة');
            } else return;
            this._renderCoursesList();
            this.updateCalendarAndConflicts();
            if (typeof after === 'function') after();
          });
        },
        _swapSection(oldId, newId) {
          const schedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!schedule) return false;
          const prevSections = new Set(schedule.sections);
          const prevLinked = this._cloneLinked(schedule.linkedSections);
          this._removeSectionAndUnlink(oldId, schedule);
          const ok = this._addSectionAndLink(newId, schedule);
          if (!ok) {
            schedule.sections = prevSections;
            schedule.linkedSections = prevLinked;
            this.updateCalendarAndConflicts();
            this._showToast('error', 'تعذر تبديل الشعبة');
            return false;
          }
          this.updateCalendarAndConflicts();
          this._vibrate(12);
          this._showToast('success', 'تم تبديل الشعبة');
          return true;
        },
        _showSectionQuickView(section, group) {
          const schedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!schedule) return;
          const isSelected = schedule.sections.has(section.uniqueId);
          const selectedDetails = Array.from(schedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const isOpen = String(section.status || '').includes('مفتوحة');
          const typeStr = this._typeLabel(section.type);
          const typeIcon = /عمل|معمل|مختبر/.test(typeStr) ? 'ph-flask' : /تمرين/.test(typeStr) ? 'ph-pencil-simple' : 'ph-chalkboard-simple';
          const timeStr = String(section.time || '').replace(/<br>/g, ' / ') || 'غير محدد';
          const isFav = this._isFavInstructor(section.instructor);
          const note = (this.state.userSettings.courseNotes || {})[section.code] || '';
          const row = (icon, label, value) => `<div class="details-row"><span class="details-row-icon"><i class="ph ${icon}"></i></span><div class="details-row-text"><span>${label}</span><strong>${value}</strong></div></div>`;
          const conflictBanner = isSelected ? '' : this._buildConflictBanner(this._getConflictDetails(section, selectedDetails));
          const examDayBanner = isSelected ? '' : this._buildExamDayNotice(section, selectedDetails);
          const alts = this._visibleSectionsOf(group).filter(sec => sec.uniqueId !== section.uniqueId);
          const altsHTML = alts.map(sec => {
            const conflicted = this._isSectionConflicted(sec, selectedDetails.filter(d => d.uniqueId !== section.uniqueId));
            return `<button class="qv-alt ${conflicted ? 'is-conflict' : ''}" data-swap="${sec.uniqueId}" title="${this._escapeHTML((sec.instructor || '') + ' — ' + String(sec.time || '').replace(/<br>/g, ' / '))}"><span class="qv-alt-num">${this._escapeHTML(sec.section)}</span><span class="qv-alt-sub">${this._escapeHTML(this._typeLabel(sec.type) || '')}</span>${conflicted ? '<span class="qv-alt-sub" style="color:var(--color-danger)">تعارض</span>' : ''}</button>`;
          }).join('');
          const altsBlock = alts.length ? `<div class="qv-section-title"><i class="ph ph-swap"></i> ${isSelected ? 'تبديل إلى شعبة أخرى' : 'شعب أخرى لنفس المقرر'}</div><div class="qv-alts">${altsHTML}</div>` : '';
          const noteBox = `<div class="qv-note-box"><div class="qv-note-head"><span><i class="ph-fill ph-note"></i> ملاحظتي على المقرر</span><button class="qv-note-edit" data-qv="note"><i class="ph ph-pencil-simple"></i>${note ? 'تعديل' : 'إضافة'}</button></div><div class="qv-note-text">${note ? this._escapeHTML(note) : 'لا توجد ملاحظة بعد.'}</div></div>`;
          Swal.fire({
            title: `${this._escapeHTML(section.name)} (${this._escapeHTML(section.code)})`,
            html: `${conflictBanner}${examDayBanner}<div class="details-status-row" style="justify-content:center;"><span class="status-badge status-${isOpen ? 'open' : 'closed'}">${this._escapeHTML(section.status || '')}</span><span class="details-type-chip"><i class="ph ${typeIcon}"></i> ${this._escapeHTML(typeStr || '')}</span><span class="details-type-chip"><i class="ph ph-hash"></i> شعبة ${this._escapeHTML(section.section)}</span></div>
<div class="details-list" style="margin-top:0.8rem;">${row('ph-user', 'المحاضر', this._escapeHTML(section.instructor || 'غير محدد'))}${row('ph-clock', 'المواعيد', this._escapeHTML(timeStr))}${row('ph-map-pin', 'المكان', this._escapeHTML(section.location || 'غير محدد'))}${row('ph-file-text', 'فترة الاختبار', this._escapeHTML(section.examPeriodId || 'لا يوجد'))}</div>
${noteBox}${altsBlock}
<div class="qv-actions"><button class="qv-btn" data-qv="crn"><i class="ph ph-copy"></i> نسخ رقم الشعبة</button><button class="qv-btn qv-fav-btn ${isFav ? 'on' : ''}" data-qv="fav"><i class="${isFav ? 'ph-fill' : 'ph'} ph-star"></i> ${isFav ? 'محاضر مفضل' : 'أضف للمفضلين'}</button><button class="qv-btn ${isSelected ? 'danger' : 'primary'}" data-qv="toggle"><i class="ph ${isSelected ? 'ph-trash' : 'ph-plus'}"></i> ${isSelected ? 'إزالة من الجدول' : 'إضافة للجدول'}</button></div>`,
            showConfirmButton: false,
            showCloseButton: true,
            allowOutsideClick: true,
            allowEscapeKey: true,
            customClass: { popup: 'swal2-popup wide-swal' },
            didOpen: (popup) => {
              popup.querySelectorAll('[data-swap]').forEach(btn => btn.addEventListener('click', () => {
                const newId = btn.dataset.swap;
                Swal.close();
                if (isSelected) this._swapSection(section.uniqueId, newId);
                else { this._addSectionAndLink(newId, schedule); this.updateCalendarAndConflicts(); }
              }));
              popup.querySelector('[data-qv="crn"]')?.addEventListener('click', () => {
                navigator.clipboard?.writeText(String(section.section)).then(() => this._showToast('success', 'تم نسخ رقم الشعبة')).catch(() => this._showToast('error', 'تعذر النسخ'));
              });
              popup.querySelector('[data-qv="fav"]')?.addEventListener('click', () => { Swal.close(); this._toggleFavInstructor(section.instructor); });
              popup.querySelector('[data-qv="note"]')?.addEventListener('click', () => { Swal.close(); this._editCourseNote(section.code); });
              popup.querySelector('[data-qv="toggle"]')?.addEventListener('click', () => {
                Swal.close();
                if (isSelected) this._removeWithUndo(section.uniqueId, schedule);
                else { this._addSectionAndLink(section.uniqueId, schedule); this.updateCalendarAndConflicts(); this._vibrate(12); }
              });
            }
          });
        },
        _activeFilterCount() {
          const f = this.state.filters;
          return (f.days.length ? 1 : 0) + (f.period !== 'any' ? 1 : 0) + (f.noConflict ? 1 : 0) + (f.favOnly ? 1 : 0);
        },
        _sectionPassesFilters(section, selectedDetails, selectedIds) {
          const f = this.state.filters;
          if (selectedIds && selectedIds.has(section.uniqueId)) return true;
          const slots = section.timeSlots || [];
          if (f.days.length && slots.length && !slots.every(sl => f.days.includes(sl.day))) return false;
          if (f.period !== 'any' && slots.length) {
            const ok = slots.every(sl => { const m = this._toMin(sl.start); return f.period === 'am' ? m < 720 : m >= 720; });
            if (!ok) return false;
          }
          if (f.favOnly && !this._isFavInstructor(section.instructor)) return false;
          if (f.noConflict && this._isSectionConflicted(section, selectedDetails)) return false;
          return true;
        },
        _toggleFilterPanel(force) {
          this._filterPanelOpen = typeof force === 'boolean' ? force : !this._filterPanelOpen;
          document.querySelectorAll('.qs-filter-panel').forEach(p => p.classList.toggle('open', !!this._filterPanelOpen));
          document.querySelectorAll('.qs-filter-toggle').forEach(t => t.setAttribute('aria-expanded', String(!!this._filterPanelOpen)));
        },
        _clearFilters() {
          this.state.filters = { days: [], period: 'any', noConflict: false, favOnly: false };
          this._renderFilterUI();
          this._renderCoursesList();
          this.updateCalendarAndConflicts();
        },
        _renderFilterUI() {
          const hosts = [document.getElementById('qs-filter-desktop'), document.getElementById('qs-filter-mobile')].filter(Boolean);
          if (!hosts.length) return;
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const days = this.state.userSettings.showWeekends ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
          const signature = days.join('-');
          const dayChips = days.map(d => `<button class="qs-chip" data-filter="day" data-value="${d}">${dayNames[d]}</button>`).join('');
          const periodChips = [['any', 'الكل'], ['am', 'قبل ١٢'], ['pm', 'بعد ١٢']].map(p => `<button class="qs-chip wide" data-filter="period" data-value="${p[0]}">${p[1]}</button>`).join('');
          const html = `<button class="qs-filter-toggle" data-filter="toggle" aria-label="ترشيح الشعب" aria-expanded="false"><i class="ph ph-funnel"></i><span>ترشيح الشعب</span><span class="qs-count">0</span></button>
<div class="qs-filter-panel"><div class="qs-filter-panel-clip"><div class="qs-filter-panel-inner">
<div class="qs-filter-row"><span class="qs-row-label">الأيام — تُعرض الشعب التي تقع مواعيدها كلها داخلها</span><div class="qs-chips">${dayChips}</div></div>
<div class="qs-filter-row"><span class="qs-row-label">الفترة</span><div class="qs-chips">${periodChips}</div></div>
<div class="qs-filter-row"><div class="qs-chips"><button class="qs-chip wide" data-filter="noConflict"><i class="ph ph-check-circle"></i> بدون تعارض مع جدولي</button><button class="qs-chip wide" data-filter="favOnly"><i class="ph ph-star"></i> دكاترتي المفضلون</button></div></div>
<div class="qs-filter-foot"><span class="qs-foot-label">لا يوجد ترشيح</span><button class="qs-clear-btn" data-filter="clear"><i class="ph ph-x-circle"></i> مسح الكل</button></div>
</div></div></div>`;
          hosts.forEach(h => {
            if (h.dataset.qsSignature !== signature || !h.querySelector('.qs-filter-panel')) {
              h.innerHTML = html;
              h.dataset.qsSignature = signature;
            }
            this._paintFilterUI(h);
          });
          if (this._filterBound) return;
          this._filterBound = true;
          document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-filter]');
            if (!el) return;
            const kind = el.dataset.filter;
            const f2 = this.state.filters;
            if (kind === 'toggle') { this._toggleFilterPanel(); return; }
            if (kind === 'clear') { this._clearFilters(); return; }
            if (kind === 'day') {
              const d = parseInt(el.dataset.value, 10);
              const i = f2.days.indexOf(d);
              if (i >= 0) f2.days.splice(i, 1); else f2.days.push(d);
            } else if (kind === 'period') { f2.period = el.dataset.value; }
            else if (kind === 'noConflict') { f2.noConflict = !f2.noConflict; }
            else if (kind === 'favOnly') { f2.favOnly = !f2.favOnly; }
            else return;
            this._renderFilterUI();
            this._renderCoursesList();
            this.updateCalendarAndConflicts();
          });
        },
        _paintFilterUI(host) {
          const f = this.state.filters;
          const count = this._activeFilterCount();
          const toggle = host.querySelector('.qs-filter-toggle');
          if (toggle) {
            toggle.classList.toggle('has-active', count > 0);
            toggle.setAttribute('aria-expanded', String(!!this._filterPanelOpen));
            const badge = toggle.querySelector('.qs-count');
            if (badge) { if (count) badge.textContent = count; badge.classList.toggle('show', count > 0); }
          }
          host.querySelectorAll('.qs-chip[data-filter="day"]').forEach(c => c.classList.toggle('active', f.days.includes(parseInt(c.dataset.value, 10))));
          host.querySelectorAll('.qs-chip[data-filter="period"]').forEach(c => c.classList.toggle('active', f.period === c.dataset.value));
          const noConflictChip = host.querySelector('.qs-chip[data-filter="noConflict"]');
          if (noConflictChip) noConflictChip.classList.toggle('active', !!f.noConflict);
          const favChip = host.querySelector('.qs-chip[data-filter="favOnly"]');
          if (favChip) favChip.classList.toggle('active', !!f.favOnly);
          const foot = host.querySelector('.qs-foot-label');
          if (foot) foot.textContent = count ? count + ' مرشِّح مفعّل' : 'لا يوجد ترشيح';
          const clearBtn = host.querySelector('.qs-clear-btn');
          if (clearBtn) clearBtn.classList.toggle('is-idle', count === 0);
          const panel = host.querySelector('.qs-filter-panel');
          if (panel) panel.classList.toggle('open', !!this._filterPanelOpen);
        },
        _examDataIsEmpty() {
          const d = this.constants.EXAM_DATA || {};
          return Object.keys(d['3'] || {}).length === 0 && Object.keys(d['2'] || {}).length === 0;
        },
        _showShortcutsModal() {
          const rows = [
            ['فتح البحث', '/ أو Ctrl + K'],
            ['تراجع عن آخر تغيير', 'Ctrl + Z'],
            ['لوحة ترشيح الشعب', 'F'],
            ['الجدول الذكي', 'G'],
            ['الإعدادات', 'S'],
            ['مقارنة الجداول', 'C'],
            ['جدول جديد', 'N'],
            ['حل التعارضات', 'R'],
            ['التنقل بين الجداول', '1 … 9'],
            ['إغلاق النوافذ', 'Esc'],
            ['عرض هذه القائمة', '؟']
          ];
          Swal.fire({
            title: 'اختصارات لوحة المفاتيح',
            html: `<div class="kbd-list">${rows.map(r => `<div class="kbd-row"><span>${r[0]}</span><span class="kbd">${r[1]}</span></div>`).join('')}</div>`,
            confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal' }
          });
        },
        _initListKeyboardNav() {
          [this.dom.desktopCoursesList, this.dom.mobileCoursesList].filter(Boolean).forEach(list => {
            list.addEventListener('keydown', (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              const t = e.target.closest('.section-btn, .course-item-header');
              if (!t) return;
              e.preventDefault();
              t.click();
            });
          });
        },
      });

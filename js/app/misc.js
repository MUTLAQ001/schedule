Object.assign(QU_ScheduleApp, {
        _duplicateSchedule(index) {
          const src = this.state.schedules[index];
          if (!src) return;
          const baseName = `نسخة من ${src.name}`;
          let name = baseName, n = 2;
          while (this.state.schedules.some(s => s.name === name)) { name = `${baseName} ${n++}`; }
          this.state.schedules.push({ name, sections: new Set(src.sections), linkedSections: new Map(Array.from(src.linkedSections.entries()).map(([k, v]) => [k, new Set(v)])) });
          this.state.activeScheduleIndex = this.state.schedules.length - 1;
          this._saveSchedules();
          this.updateFullUI();
          this._showToast('success', `تم إنشاء "${name}" — عدّلها بحرية.`);
        },
        _scheduleMetrics(schedule) {
          const secs = Array.from(schedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const codes = new Set(secs.map(s => s.code));
          let credits = 0; const countedCodes = new Set();
          secs.forEach(s => { if (countedCodes.has(s.code)) return; countedCodes.add(s.code); const h = parseInt(s.hours, 10); if (!isNaN(h)) credits += h; });
          const byDay = {}; let totalMin = 0;
          secs.forEach(s => (s.timeSlots || []).forEach(t => { (byDay[t.day] = byDay[t.day] || []).push(t); totalMin += this._toMin(t.end) - this._toMin(t.start); }));
          const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
          let gapMin = 0, earliest = null, latest = null;
          days.forEach(d => {
            const slots = byDay[d].slice().sort((a, b) => this._toMin(a.start) - this._toMin(b.start));
            for (let i = 1; i < slots.length; i++) { const g = this._toMin(slots[i].start) - this._toMin(slots[i - 1].end); if (g > 0) gapMin += g; }
            const first = this._toMin(slots[0].start), last = this._toMin(slots[slots.length - 1].end);
            if (earliest === null || first < earliest) earliest = first;
            if (latest === null || last > latest) latest = last;
          });
          const conflicts = this._calculateConflicts(secs).size;
          return { secs, codes, credits, days: days.length, hours: Math.round(totalMin / 6) / 10, gaps: Math.round(gapMin / 6) / 10, earliest, latest, conflicts };
        },
        _fmtMin(m) { if (m === null || m === undefined) return '—'; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; },
        _handleCompareSchedules() {
          if (this.state.schedules.length < 2) { this._showToast('info', 'أضف جدولاً آخر أولاً لتتمكن من المقارنة.'); return; }
          const data = this.state.schedules.map(s => ({ name: s.name, m: this._scheduleMetrics(s) }));
          const rows = [
            { label: 'المقررات', get: d => d.m.codes.size, best: 'none' },
            { label: 'الساعات المعتمدة', get: d => d.m.credits, best: 'none' },
            { label: 'أيام الدوام', get: d => d.m.days, best: 'min' },
            { label: 'ساعات الحضور', get: d => d.m.hours, best: 'none' },
            { label: 'ساعات الفراغات', get: d => d.m.gaps, best: 'min' },
            { label: 'أبكر محاضرة', get: d => this._fmtMin(d.m.earliest), best: 'none' },
            { label: 'آخر محاضرة', get: d => this._fmtMin(d.m.latest), best: 'none' },
            { label: 'التعارضات', get: d => d.m.conflicts, best: 'min' }
          ];
          const body = rows.map(r => {
            const vals = data.map(d => r.get(d));
            let bestIdx = -1, worstIdx = -1;
            if (r.best === 'min') {
              const nums = vals.map(Number);
              const mn = Math.min(...nums), mx = Math.max(...nums);
              if (mn !== mx) { bestIdx = nums.indexOf(mn); worstIdx = nums.indexOf(mx); }
            }
            const cells = vals.map((v, i) => `<td class="${i === bestIdx ? 'best' : (i === worstIdx ? 'bad' : '')}">${v}</td>`).join('');
            return `<tr><th>${this._escapeHTML(r.label)}</th>${cells}</tr>`;
          }).join('');
          const head = `<tr><th></th>${data.map(d => `<th>${this._escapeHTML(d.name)}</th>`).join('')}</tr>`;
          const shared = data.reduce((acc, d) => acc.filter(c => d.m.codes.has(c)), Array.from(data[0].m.codes));
          const diffCards = data.map(d => {
            const unique = Array.from(d.m.codes).filter(c => !shared.includes(c));
            const tags = unique.length ? unique.map(c => `<span class="cmp-tag">${this._escapeHTML(c)}</span>`).join('') : '<span class="free-none">لا يوجد مقرر ينفرد به</span>';
            return `<div class="cmp-diff-card"><h5>${this._escapeHTML(d.name)} — ينفرد بـ ${unique.length}</h5><div class="cmp-tags">${tags}</div></div>`;
          }).join('');
          const sharedCard = `<div class="cmp-diff-card"><h5>مشترك بين الجميع — ${shared.length}</h5><div class="cmp-tags">${shared.length ? shared.map(c => `<span class="cmp-tag same">${this._escapeHTML(c)}</span>`).join('') : '<span class="free-none">لا توجد مقررات مشتركة</span>'}</div></div>`;
          const html = `<div id="cmp-modal-content" class="custom-scrollbar"><div class="cmp-table-wrap"><table class="cmp-table"><thead>${head}</thead><tbody>${body}</tbody></table></div><div class="cmp-diff">${sharedCard}${diffCards}</div></div>`;
          Swal.fire({ title: 'مقارنة الجداول', html, confirmButtonText: 'تم', customClass: { popup: 'swal2-popup wide-swal' } });
        },
        _parseCRNsFromText(text) {
          let t = String(text || '');
          const idx = t.indexOf('crns=');
          if (idx !== -1) { t = t.slice(idx + 5).split('&')[0]; try { t = decodeURIComponent(t); } catch (e) { } }
          return t.split(/[^0-9]+/).filter(Boolean);
        },
        _busyByDay(sections) {
          const byDay = {};
          sections.forEach(s => (s.timeSlots || []).forEach(t => { (byDay[t.day] = byDay[t.day] || []).push([this._toMin(t.start), this._toMin(t.end)]); }));
          return byDay;
        },
        _mergeIntervals(list) {
          const sorted = list.slice().sort((a, b) => a[0] - b[0]);
          const out = [];
          sorted.forEach(iv => {
            const last = out[out.length - 1];
            if (last && iv[0] <= last[1]) { last[1] = Math.max(last[1], iv[1]); }
            else out.push([iv[0], iv[1]]);
          });
          return out;
        },
        _handleFriendCompare() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('error', 'جدولك فارغ — أضف مقرراتك أولاً.'); return; }
          if (this.state.allCoursesData.length === 0) { this._showToast('error', 'حمّل بيانات المقررات أولاً.'); return; }
          Swal.fire({
            title: 'مقارنة مع صديق',
            html: `<p style="text-align:center;color:var(--color-text-muted);font-size:0.85rem;margin-bottom:0.6rem;">الصق رابط جدول صديقك (أو أرقام شعبه). كل سطر = شخص واحد، ويمكن إضافة أكثر من صديق.</p><textarea id="friend-import-area" class="custom-textarea" placeholder="https://...?crns=12345,12346&#10;أو: 12345 12346 12347" style="min-height:120px;"></textarea>`,
            showCancelButton: true, confirmButtonText: 'اعرض الفراغات المشتركة', cancelButtonText: 'إلغاء',
            preConfirm: () => {
              const v = (document.getElementById('friend-import-area').value || '').trim();
              if (!v) { Swal.showValidationMessage('الحقل فارغ'); return false; }
              const people = v.split('\n').map(l => this._parseCRNsFromText(l)).filter(a => a.length > 0);
              if (people.length === 0) { Swal.showValidationMessage('لم يتم العثور على أرقام شعب'); return false; }
              return people;
            }
          }).then(res => {
            if (!res.isConfirmed || !res.value) return;
            this._showFreeSlots(res.value);
          });
        },
        _showFreeSlots(peopleCRNs) {
          const mySecs = Array.from(this.state.schedules[this.state.activeScheduleIndex].sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const groups = [this._busyByDay(mySecs)];
          let unmatched = 0, matchedPeople = 0;
          peopleCRNs.forEach(crns => {
            const secs = [];
            crns.forEach(crn => {
              const found = this.state.allCoursesData.find(c => String(c.section) === String(crn));
              if (found) secs.push(found); else unmatched++;
            });
            if (secs.length > 0) { groups.push(this._busyByDay(secs)); matchedPeople++; }
          });
          if (matchedPeople === 0) { this._showToast('error', 'لم يتم التعرف على أي شعبة من بيانات المقررات لديك.'); return; }
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const days = this.state.userSettings.showWeekends ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];
          let totalFree = 0;
          const cards = days.map(d => {
            const all = [];
            groups.forEach(g => (g[d] || []).forEach(iv => all.push(iv)));
            if (all.length === 0) {
              return `<div class="free-day-card all-free"><div class="fd-head"><span class="fd-name">${dayNames[d]}</span><span class="fd-total">يوم فارغ للجميع</span></div><div class="free-slots"><span class="free-slot">اليوم كامل</span></div></div>`;
            }
            const busy = this._mergeIntervals(all);
            const winStart = busy[0][0], winEnd = busy[busy.length - 1][1];
            const gaps = [];
            for (let i = 1; i < busy.length; i++) {
              const g = busy[i][0] - busy[i - 1][1];
              if (g >= 30) gaps.push([busy[i - 1][1], busy[i][0], g]);
            }
            const dayFree = gaps.reduce((a, g) => a + g[2], 0);
            totalFree += dayFree;
            const slots = gaps.length
              ? gaps.map(g => `<span class="free-slot ${g[2] < 60 ? 'short' : ''}">${this._fmtMin(g[0])} - ${this._fmtMin(g[1])} (${Math.round(g[2] / 6) / 10}س)</span>`).join('')
              : '<span class="free-none">لا يوجد فراغ مشترك ≥ ٣٠ دقيقة</span>';
            return `<div class="free-day-card"><div class="fd-head"><span class="fd-name">${dayNames[d]}</span><span class="fd-total">${this._fmtMin(winStart)} - ${this._fmtMin(winEnd)} · فراغ ${Math.round(dayFree / 6) / 10}س</span></div><div class="free-slots">${slots}</div></div>`;
          }).join('');
          const note = unmatched > 0 ? `<p style="font-size:0.78rem;color:var(--color-warning);margin:0 0 0.6rem;">تعذّر التعرف على ${unmatched} شعبة (قد تكون خارج بيانات المقررات لديك).</p>` : '';
          const summary = `<div class="analysis-grid" style="margin-bottom:0.8rem;"><div class="analysis-card"><div class="a-value">${matchedPeople + 1}</div><div class="a-label">أشخاص</div></div><div class="analysis-card"><div class="a-value">${Math.round(totalFree / 6) / 10}</div><div class="a-label">ساعات فراغ مشترك</div></div></div>`;
          Swal.fire({ title: 'الفراغات المشتركة', html: `<div id="friend-modal-content" class="custom-scrollbar">${summary}${note}${cards}</div>`, confirmButtonText: 'تم', customClass: { popup: 'swal2-popup wide-swal' } });
        },
        _tourSteps() {
          const steps = isMobile ? [
            { sel: '#mobile-schedule-tabs-container', title: 'جداولك وسيناريوهاتك', text: 'أنشئ أكثر من جدول: خطة أ، وخطة ب لو قُفلت شعبة. انسخ جدولاً بزر النسخ، وقارن بينها بزر المقارنة.' },
            { sel: '.mobile-nav-btn[data-view="mobile-courses-view"]', title: 'اختيار المقررات', text: 'اضغط المقرر لعرض شعبه، ثم اضغط الشعبة لإضافتها. الشعب المتعارضة تظهر بلون مختلف.' },
            { sel: '.mobile-nav-btn[data-view="mobile-my-schedule-view"]', title: 'جدولي', text: 'ملخص مقرراتك وساعاتك، مع نسخ أرقام الشعب وأداة "مُعِدّ" التي تعبئها تلقائياً في موقع الجامعة.' },
            { sel: '.mobile-nav-btn[data-view="mobile-my-exams-view"]', title: 'اختباراتي', text: 'مواعيد اختباراتك النهائية مع عدّاد تنازلي لكل اختبار، وتصديرها إلى تقويم جوالك.' },
            { sel: '#mobile-settings-btn', title: 'الأدوات والإعدادات', text: 'من هنا: الجدول الذكي، التصدير، المقارنة مع صديق، والألوان والوضع الليلي.' }
          ] : [
            { sel: '#install-overlay .bookmarklet-button, .schedule-tabs-container', title: 'جداولك وسيناريوهاتك', text: 'أنشئ أكثر من جدول: خطة أ، وخطة ب لو قُفلت شعبة. انسخ جدولاً بزر النسخ، وقارن بينها بزر المقارنة.' },
            { sel: '.sidebar', title: 'المقررات والشعب', text: 'اضغط المقرر لعرض شعبه، ثم اضغط الشعبة لإضافتها. الشعب المتعارضة مع جدولك تظهر بلون مختلف تلقائياً.' },
            { sel: '.calendar-wrapper', title: 'التقويم الأسبوعي', text: 'محاضراتك تظهر هنا مباشرة، وأي تعارض في الوقت يُكتشف فوراً مع أداة لحله.' },
            { sel: '#share-schedule-btn', title: 'المشاركة والحفظ', text: 'شارك جدولك برابط أو QR، أو احفظه كصورة جاهزة.' },
            { sel: '#settings-btn', title: 'الأدوات والإعدادات', text: 'من هنا: الجدول الذكي، تصدير التقويم، مقارنة الجداول، والمقارنة مع صديق.' }
          ];
          const found = steps.map(s => ({ ...s, el: document.querySelector(s.sel) })).filter(s => s.el);
          const visible = found.filter(s => s.el.offsetParent !== null || s.el.getClientRects().length > 0);
          return visible.length > 0 ? visible : found;
        },
        _startTour() {
          if (document.querySelector('.tour-overlay')) return;
          const steps = this._tourSteps();
          if (steps.length === 0) { this._showToast('info', 'الجولة غير متاحة حالياً.'); return; }
          this._toggleSettingsModal(false);
          const overlay = document.createElement('div');
          overlay.className = 'tour-overlay';
          overlay.innerHTML = `<div class="tour-spot"></div><div class="tour-pop"><div class="tp-step"></div><h4></h4><p></p><div class="tour-actions"><button class="tour-skip">تخطي</button><button class="tour-prev" style="display:none;">السابق</button><button class="tour-next"></button></div></div>`;
          document.body.appendChild(overlay);
          const spot = overlay.querySelector('.tour-spot');
          const pop = overlay.querySelector('.tour-pop');
          const stepEl = overlay.querySelector('.tp-step');
          const titleEl = overlay.querySelector('h4');
          const textEl = overlay.querySelector('p');
          const nextBtn = overlay.querySelector('.tour-next');
          const prevBtn = overlay.querySelector('.tour-prev');
          const skipBtn = overlay.querySelector('.tour-skip');
          let i = 0;
          const finish = () => {
            try { localStorage.setItem('quScheduleTourDone_v1', '1'); } catch (e) { }
            window.removeEventListener('resize', place);
            overlay.remove();
          };
          const place = () => {
            const s = steps[i];
            const r = s.el.getBoundingClientRect();
            const padX = 8, padY = 8;
            const top = Math.max(6, r.top - padY), left = Math.max(6, r.left - padX);
            const w = Math.min(window.innerWidth - 12, r.width + padX * 2);
            const h = Math.min(window.innerHeight - 12, r.height + padY * 2);
            spot.style.top = `${top}px`; spot.style.left = `${left}px`; spot.style.width = `${w}px`; spot.style.height = `${h}px`;
            const popW = Math.min(320, window.innerWidth - 32);
            const popH = pop.offsetHeight || 190;
            let pTop = top + h + 14;
            if (pTop + popH > window.innerHeight - 10) pTop = Math.max(10, top - popH - 14);
            let pLeft = left + w / 2 - popW / 2;
            pLeft = Math.max(12, Math.min(pLeft, window.innerWidth - popW - 12));
            pop.style.top = `${pTop}px`; pop.style.left = `${pLeft}px`; pop.style.width = `${popW}px`;
          };
          const render = () => {
            const s = steps[i];
            try { s.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
            stepEl.textContent = `الخطوة ${i + 1} من ${steps.length}`;
            titleEl.textContent = s.title;
            textEl.textContent = s.text;
            nextBtn.innerHTML = i === steps.length - 1 ? 'ابدأ <i class="ph ph-check"></i>' : 'التالي <i class="ph ph-arrow-left"></i>';
            prevBtn.style.display = i === 0 ? 'none' : 'inline-flex';
            setTimeout(place, 220);
          };
          nextBtn.addEventListener('click', () => { if (i === steps.length - 1) { finish(); this._showToast('success', 'جاهز! ابدأ ببناء جدولك.'); } else { i++; render(); } });
          prevBtn.addEventListener('click', () => { if (i > 0) { i--; render(); } });
          skipBtn.addEventListener('click', finish);
          overlay.addEventListener('click', (e) => { if (e.target === overlay) { } });
          window.addEventListener('resize', place);
          render();
        },
        _maybeStartTour() {
          let done = null;
          try { done = localStorage.getItem('quScheduleTourDone_v1'); } catch (e) { done = '1'; }
          if (done) return;
          if (this.state.allCoursesData.length === 0) return;
          setTimeout(() => this._startTour(), 900);
        },
        _startDemoMode() {
          this.state.isDemoMode = true;
          const demoCourses = [
            { "code": "ACCT 221", "name": "مبادئ المحاسبة المتوسطة", "hours": "3", "section": "200", "type": "محاضرة", "status": "مفتوحة", "instructor": "سارة عبدالله", "time": "الأحد: 09:30 ص - 10:45 ص<br>الثلاثاء: 09:30 ص - 10:45 ص", "location": "مبنى A - قاعة 101", "examPeriodId": "5" },
            { "code": "CS 101", "name": "مقدمة في علوم الحاسب", "hours": "3", "section": "201", "type": "محاضرة", "status": "مفتوحة", "instructor": "أحمد خالد", "time": "الأحد: 08:00 ص - 09:15 ص<br>الثلاثاء: 08:00 ص - 09:15 ص", "location": "مبنى C - قاعة 204", "examPeriodId": "3" },
            { "code": "CS 101", "name": "مقدمة في علوم الحاسب", "hours": "0", "section": "202", "type": "عملي", "status": "مفتوحة", "instructor": "علي محمد", "time": "الأربعاء: 10:00 ص - 11:50 ص", "location": "مبنى C - معمل 1", "examPeriodId": null },
            { "code": "MKT 201", "name": "مبادئ التسويق", "hours": "3", "section": "205", "type": "محاضرة", "status": "مفتوحة", "instructor": "فاطمة الزهراء", "time": "الاثنين: 11:00 ص - 12:15 م<br>الأربعاء: 11:00 ص - 12:15 م", "location": "مبنى B - قاعة 302", "examPeriodId": "8" },
            { "code": "ENG 110", "name": "كتابة إنجليزية", "hours": "3", "section": "210", "type": "محاضرة", "status": "مفتوحة", "instructor": "John Smith", "time": "الاثنين: 02:00 م - 03:15 م<br>الخميس: 02:00 م - 03:15 م", "location": "مبنى اللغات - L20", "examPeriodId": "9" },
            { "code": "FIN 220", "name": "مبادئ التمويل", "hours": "3", "section": "215", "type": "محاضرة", "status": "مغلقة", "instructor": "عبدالرحمن عمر", "time": "الأحد: 01:00 م - 02:15 م<br>الثلاثاء: 01:00 م - 02:15 م", "location": "مبنى B - قاعة 303", "examPeriodId": "7" },
            { "code": "ISLM 101", "name": "الثقافة الإسلامية", "hours": "2", "section": "220", "type": "إلكتروني", "status": "مفتوحة", "instructor": "غير محدد", "time": "غير محدد", "location": "عن بُعد", "examPeriodId": null }
          ];
          this.state.schedules = []; this.state.customColors = {};
          this._addSchedule("الجدول التجريبي", true); this._processAndDisplayData(demoCourses); this.updateFullUI(); this._showToast('info', 'مرحباً بك في وضع المعاينة!');
        },
        _toggleDemoBadge() {
          if (isMobile) { this._renderScheduleTabs(); } else {
            const wrapper = this.dom.mainHeaderTitleWrapper; if (!wrapper) return;
            let badge = wrapper.querySelector('.demo-badge');
            if (this.state.isDemoMode) { if (!badge) { badge = document.createElement('div'); badge.className = 'demo-badge'; badge.textContent = 'وضع المعاينة'; wrapper.appendChild(badge); } }
            else { if (badge) badge.remove(); }
          }
        }
      });

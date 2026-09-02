Object.assign(QU_ScheduleApp, {
        _SE_FIELDS: ['instructor', 'section', 'location', 'time'],
        _SE_DAY_NAMES: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        _SE_DAY_SHORT: ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],

        _sectionOverrides() {
          const s = this.state.userSettings;
          if (!s.sectionOverrides || typeof s.sectionOverrides !== 'object' || Array.isArray(s.sectionOverrides)) s.sectionOverrides = {};
          return s.sectionOverrides;
        },
        _seClean(v, max) {
          const s = String(v ?? '').replace(/[<>"'`]/g, '');
          let out = '';
          for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out += (c < 32 || c === 127) ? ' ' : s[i]; }
          return out.replace(/\s+/g, ' ').trim().slice(0, max || 200);
        },
        _seOriginal(c, field) {
          const o = c && c.origFields;
          return o && o[field] != null ? o[field] : (c ? c[field] : '');
        },
        _seKeyOf(c) { return `${c.code}|${this._seOriginal(c, 'section')}`; },
        _seIsEdited(c) { return !!(c && c.origFields); },
        _applySectionOverride(row) {
          const ov = this._sectionOverrides()[`${row.code}|${row.section}`];
          if (!ov || typeof ov !== 'object') return row;
          const origFields = {};
          const out = { ...row };
          this._SE_FIELDS.forEach(f => {
            const v = ov[f];
            if (typeof v !== 'string') return;
            const current = String(row[f] ?? '');
            if (v === current) return;
            origFields[f] = row[f];
            out[f] = v;
          });
          if (!Object.keys(origFields).length) return row;
          out.origFields = origFields;
          return out;
        },
        _seEditedCount() {
          const keys = Object.keys(this._sectionOverrides());
          if (!keys.length) return 0;
          const live = new Set((this.state.allCoursesData || []).filter(c => this._seIsEdited(c)).map(c => this._seKeyOf(c)));
          return live.size;
        },
        _seRefresh() {
          const raw = (this.state.allCoursesData || []).map(c => this._plainCourse(c));
          if (!raw.length) return;
          this._processAndDisplayData(raw);
          this.updateFullUI();
        },

        _seTimeRows(timeString) {
          const out = [];
          String(timeString || '').split(/<br\s*\/?>/i).forEach(entry => {
            const m = entry.match(/([ء-ي\s]+):\s*(\d{1,2}:\d{2})\s*(ص|م)\s*-\s*(\d{1,2}:\d{2})\s*(ص|م)/);
            if (!m) return;
            const days = m[1].trim().split(/\s+/).map(d => this.constants.DAY_MAPPING[d]).filter(d => d !== undefined);
            if (!days.length) return;
            out.push({ days: [...new Set(days)].sort((a, b) => a - b), start: this._convertTo24Hour(m[2], m[3]).slice(0, 5), end: this._convertTo24Hour(m[4], m[5]).slice(0, 5) });
          });
          return out;
        },
        _seTimeString(rows) {
          return (rows || [])
            .filter(r => r.days.length && r.start && r.end)
            .map(r => `${r.days.slice().sort((a, b) => a - b).map(d => this._SE_DAY_NAMES[d]).join(' ')}: ${this._formatClock(this._toMin(r.start))} - ${this._formatClock(this._toMin(r.end))}`)
            .join('<br>');
        },
        _seRowError(r) {
          if (!r.days.length) return 'اختر يوماً واحداً على الأقل.';
          if (!r.start || !r.end) return 'حدّد وقت البداية والنهاية.';
          if (this._toMin(r.end) <= this._toMin(r.start)) return 'وقت النهاية يجب أن يكون بعد البداية.';
          return '';
        },

        _seFlash(host, kind, message) {
          const box = host && host.querySelector('.secedit');
          if (!box) return;
          let el = box.querySelector('.secedit-flash');
          if (!el) { el = document.createElement('div'); box.insertBefore(el, box.firstChild); }
          const icon = kind === 'error' ? 'ph-warning-circle' : kind === 'info' ? 'ph-info' : 'ph-check-circle';
          el.className = `secedit-flash ${kind}`;
          el.innerHTML = `<i class="ph ${icon}"></i><span>${this._escapeHTML(message)}</span>`;
          clearTimeout(this._seFlashTimer);
          this._seFlashTimer = setTimeout(() => { el.remove(); }, 4500);
        },
        _seSectionById(id) { return (this.state.allCoursesData || []).find(c => c.uniqueId === id) || null; },
        _seMatches(c, q) {
          if (!q) return true;
          const hay = this._normalizeArabic(`${c.name} ${c.code} ${c.section} ${c.instructor} ${c.location}`);
          return q.split(/\s+/).every(part => hay.includes(part));
        },
        _seCandidates() {
          const st = this._secEdit;
          const all = this.state.allCoursesData || [];
          let list = all;
          if (st.scope === 'mine') {
            const schedule = this.state.schedules[this.state.activeScheduleIndex];
            const ids = schedule ? schedule.sections : new Set();
            list = all.filter(c => ids.has(c.uniqueId));
          } else if (st.scope === 'edited') {
            list = all.filter(c => this._seIsEdited(c));
          }
          const q = this._normalizeArabic(st.q || '').trim();
          if (q) list = list.filter(c => this._seMatches(c, q));
          return list.slice().sort((a, b) => a.code.localeCompare(b.code) || String(a.section).localeCompare(String(b.section), undefined, { numeric: true }));
        },

        _showSectionEditor(preselectId) {
          if (!(this.state.allCoursesData || []).length) return this._showToast('warning', 'حمّل بيانات المقررات أولاً.');
          const schedule = this.state.schedules[this.state.activeScheduleIndex];
          const hasMine = !!(schedule && schedule.sections.size);
          this._secEdit = { scope: hasMine ? 'mine' : 'all', q: '', id: null, draft: null };
          Swal.fire({
            title: 'تعديل بيانات الشعب',
            html: '<div id="secedit-host"></div>',
            showConfirmButton: false,
            showCloseButton: true,
            allowOutsideClick: true,
            customClass: { popup: 'swal2-popup wide-swal secedit-swal' },
            didOpen: () => {
              const host = document.getElementById('secedit-host');
              if (!host) return;
              if (preselectId && this._seSectionById(preselectId)) this._seRenderForm(host, preselectId);
              else this._seRenderList(host);
              if (this._sePendingFlash) { this._seFlash(host, this._sePendingFlash.kind, this._sePendingFlash.message); this._sePendingFlash = null; }
            }
          });
        },

        _seRenderList(host) {
          const st = this._secEdit;
          st.id = null;
          st.draft = null;
          const edited = this._seEditedCount();
          const rows = this._seCandidates();
          const listHTML = rows.length ? rows.map(c => {
            const group = this.state.groupedCourses[c.code];
            const color = group ? group.color : 'var(--color-primary)';
            const time = String(c.time || '').replace(/<br\s*\/?>/gi, ' · ') || 'بدون موعد';
            return `<button type="button" class="secedit-row ${this._seIsEdited(c) ? 'is-edited' : ''}" data-id="${this._escapeHTML(c.uniqueId)}" style="--item-color:${color};--item-color-rgb:${this._hexToRgb(group ? group.color : '#8b5cf6')};">
<span class="secedit-row-num">${this._escapeHTML(String(c.section))}</span>
<span class="secedit-row-main">
<span class="secedit-row-title"><b>${this._escapeHTML(c.name)}</b><em>${this._escapeHTML(c.code)}</em>${this._seIsEdited(c) ? '<span class="secedit-tag">معدّلة</span>' : ''}</span>
<span class="secedit-row-meta">
<span class="secedit-row-sub"><i class="ph ph-user"></i><span>${this._escapeHTML(c.instructor || 'غير محدد')}</span></span>
<span class="secedit-row-sub"><i class="ph ph-clock"></i><span>${this._escapeHTML(time)}</span></span>
</span>
</span>
<i class="ph ph-caret-left secedit-row-go"></i>
</button>`;
          }).join('') : `<p class="secedit-empty"><i class="ph ph-magnifying-glass"></i>${st.q ? 'لا توجد شعبة مطابقة لبحثك.' : st.scope === 'mine' ? 'جدولك فارغ — أضف شعباً أو اختر «كل الشعب».' : 'لا توجد شعب معدّلة بعد.'}</p>`;

          host.innerHTML = `<div class="secedit">
<p class="secedit-hint">${this.state.isDemoMode ? 'جرّب التعديل على الجدول التجريبي — تظهر تغييراتك فوراً، لكنها لا تُحفظ في وضع المعاينة.' : 'عدّل اسم المحاضر أو رقم الشعبة أو مواعيدها كما تناسبك، وتبقى تعديلاتك محفوظة حتى بعد تحديث بيانات المقررات.'}</p>
<div class="secedit-top">
<div class="secedit-seg">
<button type="button" class="secedit-seg-btn ${st.scope === 'mine' ? 'active' : ''}" data-scope="mine">شعب جدولي</button>
<button type="button" class="secedit-seg-btn ${st.scope === 'all' ? 'active' : ''}" data-scope="all">كل الشعب</button>
<button type="button" class="secedit-seg-btn ${st.scope === 'edited' ? 'active' : ''}" data-scope="edited">المعدّلة${edited ? `<b>${edited}</b>` : ''}</button>
</div>
<div class="secedit-search"><i class="ph ph-magnifying-glass"></i><input type="search" id="secedit-search" placeholder="ابحث باسم المقرر أو رمزه أو رقم الشعبة" value="${this._escapeHTML(st.q || '')}"></div>
</div>
<div class="secedit-list custom-scrollbar">${listHTML}</div>
${edited ? `<div class="secedit-foot"><span><i class="ph ph-pencil-simple-line"></i> ${this._escapeHTML(this._sectionsWord(edited))} معدّلة</span><button type="button" class="secedit-reset-all"><i class="ph ph-arrow-counter-clockwise"></i> إرجاع الكل</button></div>` : ''}
</div>`;

          host.querySelectorAll('.secedit-seg-btn').forEach(btn => btn.addEventListener('click', () => {
            st.scope = btn.dataset.scope;
            this._seRenderList(host);
          }));
          const search = host.querySelector('#secedit-search');
          if (search) {
            search.addEventListener('input', () => {
              st.q = search.value;
              clearTimeout(this._seSearchTimer);
              this._seSearchTimer = setTimeout(() => {
                this._seRenderList(host);
                const next = host.querySelector('#secedit-search');
                if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
              }, 180);
            });
          }
          host.querySelectorAll('.secedit-row').forEach(row => row.addEventListener('click', () => this._seRenderForm(host, row.dataset.id)));
          host.querySelector('.secedit-reset-all')?.addEventListener('click', () => this._seResetAll(host));
        },

        _seResetAll(host) {
          Swal.fire({
            title: 'إرجاع كل التعديلات؟',
            text: 'ستعود بيانات كل الشعب المعدّلة إلى ما وصل من الجامعة.',
            icon: 'warning',
            showCancelButton: true,
            customClass: { confirmButton: 'swal-danger' },
            confirmButtonText: '<i class="ph ph-arrow-counter-clockwise"></i> نعم، أرجع الكل',
            cancelButtonText: 'إلغاء'
          }).then(r => {
            if (r.isConfirmed) {
              this.state.userSettings.sectionOverrides = {};
              this._saveSettings();
              this._seRefresh();
              this._sePendingFlash = { kind: 'success', message: 'رجعت كل الشعب إلى بياناتها الأصلية.' };
            }
            this._showSectionEditor();
          });
        },

        _seRenderForm(host, id) {
          const section = this._seSectionById(id);
          if (!section) return this._seRenderList(host);
          const st = this._secEdit;
          st.id = id;
          if (!st.draft || st.draft.id !== id) {
            st.draft = {
              id,
              instructor: String(section.instructor || ''),
              section: String(section.section || ''),
              location: String(section.location || ''),
              rows: this._seTimeRows(section.time)
            };
          }
          const group = this.state.groupedCourses[section.code];
          const color = group ? group.color : '#8b5cf6';
          const typeStr = this._typeLabel(section.type);
          const edited = this._seIsEdited(section);

          host.innerHTML = `<div class="secedit secedit-form custom-scrollbar" style="--item-color:${color};--item-color-rgb:${this._hexToRgb(color)};">
<div class="secedit-form-head">
<button type="button" class="secedit-back" aria-label="رجوع"><i class="ph ph-arrow-right"></i></button>
<div class="secedit-form-title"><strong>${this._escapeHTML(section.name)}</strong><span>${this._escapeHTML(section.code)}${typeStr ? ` · ${this._escapeHTML(typeStr)}` : ''}${edited ? ' · <b>معدّلة</b>' : ''}</span></div>
</div>
<div class="secedit-fields">
<label class="secedit-field wide"><span class="secedit-label"><i class="ph ph-user"></i> اسم المحاضر</span><input class="secedit-input" id="sf-instructor" maxlength="120" value="${this._escapeHTML(st.draft.instructor)}" placeholder="غير محدد"></label>
<label class="secedit-field"><span class="secedit-label"><i class="ph ph-hash"></i> رقم الشعبة</span><input class="secedit-input" id="sf-section" maxlength="20" inputmode="numeric" value="${this._escapeHTML(st.draft.section)}"></label>
<label class="secedit-field"><span class="secedit-label"><i class="ph ph-map-pin"></i> المكان</span><input class="secedit-input" id="sf-location" maxlength="120" value="${this._escapeHTML(st.draft.location)}" placeholder="غير محدد"></label>
</div>
<div class="secedit-times">
<div class="secedit-times-head"><span><i class="ph ph-clock"></i> المواعيد</span><button type="button" class="secedit-add-time"><i class="ph ph-plus"></i> إضافة موعد</button></div>
<div class="secedit-time-rows" id="sf-times"></div>
</div>
<div class="secedit-actions">
<button type="button" class="secedit-btn ghost" data-act="reset" ${edited ? '' : 'disabled'}><i class="ph ph-arrow-counter-clockwise"></i> إرجاع الأصل</button>
<button type="button" class="secedit-btn primary" data-act="save"><i class="ph ph-check"></i> حفظ التعديلات</button>
</div>
</div>`;

          const bind = (sel, key, max) => {
            const el = host.querySelector(sel);
            if (el) el.addEventListener('input', () => { st.draft[key] = el.value.slice(0, max); });
          };
          bind('#sf-instructor', 'instructor', 120);
          bind('#sf-section', 'section', 20);
          bind('#sf-location', 'location', 120);
          host.querySelector('.secedit-back').addEventListener('click', () => { st.draft = null; this._seRenderList(host); });
          host.querySelector('.secedit-add-time').addEventListener('click', () => {
            const last = st.draft.rows[st.draft.rows.length - 1];
            st.draft.rows.push({ days: [], start: last ? last.start : '08:00', end: last ? last.end : '09:50' });
            this._seRenderTimeRows(host);
          });
          host.querySelector('[data-act="reset"]').addEventListener('click', () => this._seResetOne(host, section));
          host.querySelector('[data-act="save"]').addEventListener('click', () => this._seSave(host, section));
          this._seRenderTimeRows(host);
        },

        _seRenderTimeRows(host) {
          const wrap = host.querySelector('#sf-times');
          if (!wrap) return;
          const rows = this._secEdit.draft.rows;
          if (!rows.length) {
            wrap.innerHTML = '<p class="secedit-empty small"><i class="ph ph-moon-stars"></i>لا توجد مواعيد لهذه الشعبة — لن تظهر في الجدول.</p>';
            return;
          }
          const showWeekend = !!this.state.userSettings.showWeekends;
          wrap.innerHTML = rows.map((r, i) => {
            const err = this._seRowError(r);
            const days = this._SE_DAY_SHORT
              .map((label, d) => ({ label, d }))
              .filter(x => x.d < 5 || showWeekend || r.days.includes(x.d))
              .map(x => `<button type="button" class="secedit-day ${r.days.includes(x.d) ? 'on' : ''}" data-row="${i}" data-day="${x.d}">${x.label}</button>`).join('');
            return `<div class="secedit-time-row ${err ? 'has-error' : ''}">
<div class="secedit-time-main">
<div class="secedit-days">${days}</div>
<div class="secedit-time-inputs">
<label><span>من</span><input type="time" data-row="${i}" data-t="start" value="${this._escapeHTML(r.start)}"></label>
<label><span>إلى</span><input type="time" data-row="${i}" data-t="end" value="${this._escapeHTML(r.end)}"></label>
</div>
</div>
<button type="button" class="secedit-del-time" data-row="${i}" aria-label="حذف الموعد"><i class="ph ph-trash"></i></button>
${err ? `<span class="secedit-row-error"><i class="ph ph-warning-circle"></i> ${err}</span>` : `<span class="secedit-row-preview">${this._escapeHTML(this._seTimeString([r]))}</span>`}
</div>`;
          }).join('');

          wrap.querySelectorAll('.secedit-day').forEach(btn => btn.addEventListener('click', () => {
            const r = rows[+btn.dataset.row];
            const d = +btn.dataset.day;
            const at = r.days.indexOf(d);
            if (at >= 0) r.days.splice(at, 1); else r.days.push(d);
            r.days.sort((a, b) => a - b);
            this._seRenderTimeRows(host);
          }));
          wrap.querySelectorAll('input[type="time"]').forEach(input => input.addEventListener('change', () => {
            rows[+input.dataset.row][input.dataset.t] = input.value;
            this._seRenderTimeRows(host);
          }));
          wrap.querySelectorAll('.secedit-del-time').forEach(btn => btn.addEventListener('click', () => {
            rows.splice(+btn.dataset.row, 1);
            this._seRenderTimeRows(host);
          }));
        },

        _seResetOne(host, section) {
          const key = this._seKeyOf(section);
          if (!this._sectionOverrides()[key]) return;
          delete this._sectionOverrides()[key];
          this._saveSettings();
          this._seRefresh();
          this._vibrate(12);
          this._secEdit.draft = null;
          this._seRenderList(host);
          this._seFlash(host, 'success', 'رجعت الشعبة إلى بياناتها الأصلية.');
        },

        _seSave(host, section) {
          const draft = this._secEdit.draft;
          const bad = draft.rows.find(r => this._seRowError(r));
          if (bad) return this._seFlash(host, 'error', this._seRowError(bad));
          const num = this._seClean(draft.section, 20);
          if (!num) return this._seFlash(host, 'error', 'رقم الشعبة مطلوب.');

          const next = {
            instructor: this._seClean(draft.instructor, 120) || 'غير محدد',
            section: num,
            location: this._seClean(draft.location, 120) || 'غير محدد',
            time: this._seTimeString(draft.rows)
          };
          const key = this._seKeyOf(section);
          const overrides = this._sectionOverrides();
          const stored = {};
          this._SE_FIELDS.forEach(f => {
            const original = String(this._seOriginal(section, f) ?? '');
            let normalized = original;
            if (f === 'instructor' || f === 'location') normalized = this._seClean(original, 120) || 'غير محدد';
            else if (f === 'time') normalized = this._seTimeString(this._seTimeRows(original));
            if (next[f] !== normalized) stored[f] = next[f];
          });
          if (Object.keys(stored).length) overrides[key] = stored; else delete overrides[key];

          this._saveSettings();
          this._seRefresh();
          this._vibrate(12);
          const weekend = !this.state.userSettings.showWeekends && draft.rows.some(r => r.days.some(d => d >= 5));
          const message = Object.keys(stored).length
            ? `حُفظت تعديلات الشعبة.${weekend ? ' فعّل «إظهار عطلة نهاية الأسبوع» لرؤية مواعيد الجمعة والسبت.' : ''}`
            : 'الشعبة مطابقة للأصل — أُزيلت التعديلات.';
          this._secEdit.draft = null;
          this._seRenderList(host);
          this._seFlash(host, weekend ? 'info' : 'success', message);
        }
      });

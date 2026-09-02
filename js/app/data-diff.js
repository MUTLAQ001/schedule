Object.assign(QU_ScheduleApp, {
        _DIFF_KEY: 'quScheduleLastDiff_v1',
        _DIFF_MINE_CAP: 120,
        _DIFF_OTHERS_CAP: 80,
        _DIFF_NEW_TERM_OVERLAP: 0.25,
        _DIFF_KINDS: {
          opened: { icon: 'ph-lock-simple-open', label: 'فُتحت', note: 'أصبحت متاحة للتسجيل', cls: 'ok' },
          closed: { icon: 'ph-lock-simple', label: 'أُغلقت', note: 'لم تعد متاحة للتسجيل', cls: 'bad' },
          added: { icon: 'ph-plus-circle', label: 'شعبة جديدة', note: 'أُضيفت إلى المقررات المطروحة', cls: 'new' },
          removed: { icon: 'ph-minus-circle', label: 'أُلغيت', note: 'لم تعد موجودة في المقررات المطروحة', cls: 'bad' },
          changed: { icon: 'ph-pencil-simple-line', label: 'تعديل', note: '', cls: 'warn' }
        },
        _DIFF_ORDER: ['opened', 'closed', 'removed', 'changed', 'added'],
        _MERGE_MAX: 20000,

        _secKey(c) { const o = c && c.origFields; return `${c.code}|${o && o.section != null ? o.section : c.section}`; },
        _isClosedStatus(s) { return String(s || '').includes('مغلقة'); },
        _diffTimeText(t) { return String(t || '').replace(/<br\s*\/?>/gi, ' ، ').replace(/\s+/g, ' ').trim() || 'غير محدد'; },
        _diffEntry(c, kind, rel) {
          return { k: this._secKey(c), code: c.code, name: c.name, section: String(c.section), type: this._canonType(c.type), instructor: c.instructor || 'غير محدد', kind, rel };
        },
        _sectionsWord(n) { return n === 1 ? 'شعبة واحدة' : n === 2 ? 'شعبتان' : n <= 10 ? `${n} شعب` : `${n} شعبة`; },

        _looksLikeNewTerm(prev, next) {
          if (!prev.length || !next.length) return true;
          const oldKeys = new Set(prev.map(c => this._secKey(c)));
          const newKeys = new Set(next.map(c => this._secKey(c)));
          let hit = 0;
          newKeys.forEach(k => { if (oldKeys.has(k)) hit++; });
          return (hit / Math.max(1, Math.min(oldKeys.size, newKeys.size))) < this._DIFF_NEW_TERM_OVERLAP;
        },
        _scheduleRelevance(prevCourses) {
          const mySecKeys = new Set(), myCodes = new Set();
          const byId = new Map(prevCourses.map(c => [c.uniqueId, c]));
          this.state.schedules.forEach(s => s.sections.forEach(id => {
            const c = byId.get(id);
            if (!c) return;
            mySecKeys.add(this._secKey(c));
            myCodes.add(c.code);
          }));
          return { mySecKeys, myCodes };
        },
        _computeCoursesDiff(prev, next, ctx) {
          const oldMap = new Map(); prev.forEach(c => { const k = this._secKey(c); if (!oldMap.has(k)) oldMap.set(k, c.origFields ? { ...c, ...c.origFields } : c); });
          const newMap = new Map(); next.forEach(c => { if (!newMap.has(this._secKey(c))) newMap.set(this._secKey(c), c); });
          const relOf = (c) => ctx.mySecKeys.has(this._secKey(c)) ? 2 : (ctx.myCodes.has(c.code) ? 1 : 0);
          const counts = { opened: 0, closed: 0, added: 0, removed: 0, changed: 0 };
          const mine = [];
          const others = { opened: [], added: [] };
          const push = (entry) => {
            counts[entry.kind]++;
            if (entry.rel > 0) { if (mine.length < this._DIFF_MINE_CAP) mine.push(entry); }
            else if (others[entry.kind] && others[entry.kind].length < this._DIFF_OTHERS_CAP) others[entry.kind].push(entry);
          };
          newMap.forEach((c, k) => {
            const o = oldMap.get(k);
            const rel = relOf(c);
            if (!o) { push(this._diffEntry(c, 'added', rel)); return; }
            const wasClosed = this._isClosedStatus(o.status), isClosed = this._isClosedStatus(c.status);
            if (wasClosed && !isClosed) push(this._diffEntry(c, 'opened', rel));
            else if (!wasClosed && isClosed) push(this._diffEntry(c, 'closed', rel));
            const fields = [];
            const oInst = o.instructor || 'غير محدد', nInst = c.instructor || 'غير محدد';
            if (oInst !== nInst) fields.push({ l: 'المحاضر', f: oInst, t: nInst });
            const oTime = this._diffTimeText(o.time), nTime = this._diffTimeText(c.time);
            if (oTime !== nTime) fields.push({ l: 'الموعد', f: oTime, t: nTime });
            const oLoc = o.location || '—', nLoc = c.location || '—';
            if (oLoc !== nLoc) fields.push({ l: 'القاعة', f: oLoc, t: nLoc });
            if (fields.length) { const e = this._diffEntry(c, 'changed', rel); e.fields = fields; push(e); }
          });
          oldMap.forEach((c, k) => { if (!newMap.has(k)) push(this._diffEntry(c, 'removed', relOf(c))); });
          const rank = (e) => this._DIFF_ORDER.indexOf(e.kind);
          mine.sort((a, b) => (b.rel - a.rel) || (rank(a) - rank(b)) || a.code.localeCompare(b.code));
          const sortOthers = (list) => list.sort((a, b) => a.code.localeCompare(b.code) || String(a.section).localeCompare(String(b.section), undefined, { numeric: true }));
          sortOthers(others.opened); sortOthers(others.added);
          return {
            v: 1, at: Date.now(), prevAt: ctx.prevAt || 0, dropped: ctx.dropped || 0,
            hadSchedule: ctx.mySecKeys.size > 0, counts, mine, others,
            mineTotal: counts.opened + counts.closed + counts.added + counts.removed + counts.changed
          };
        },
        _saveLastDiff(diff) {
          try { localStorage.setItem(this._DIFF_KEY, JSON.stringify(diff)); } catch (e) { }
        },
        _loadLastDiff() {
          try {
            const raw = localStorage.getItem(this._DIFF_KEY);
            const d = raw ? JSON.parse(raw) : null;
            return (d && d.counts && Array.isArray(d.mine)) ? d : null;
          } catch (e) { return null; }
        },
        _diffTotal(diff) {
          const c = diff.counts;
          return c.opened + c.closed + c.added + c.removed + c.changed;
        },

        _remapSchedulesToNewData(prevCourses) {
          const oldIdToKey = new Map(prevCourses.map(c => [c.uniqueId, this._secKey(c)]));
          const keyToNewId = new Map();
          this.state.allCoursesData.forEach(c => { const k = this._secKey(c); if (!keyToNewId.has(k)) keyToNewId.set(k, c.uniqueId); });
          const mapId = (id) => { const k = oldIdToKey.get(id); return k ? (keyToNewId.get(k) || null) : null; };
          let kept = 0, dropped = 0;
          this.state.schedules.forEach(s => {
            const sections = new Set();
            s.sections.forEach(id => { const nid = mapId(id); if (nid) { sections.add(nid); kept++; } else dropped++; });
            const linked = new Map();
            s.linkedSections.forEach((set, trigger) => {
              const nTrigger = mapId(trigger);
              if (!nTrigger || !sections.has(nTrigger)) return;
              const ns = new Set();
              set.forEach(id => { const nid = mapId(id); if (nid && sections.has(nid)) ns.add(nid); });
              if (ns.size > 0) linked.set(nTrigger, ns);
            });
            s.sections = sections;
            s.linkedSections = linked;
          });
          return { kept, dropped };
        },

        _plainCourse(c) {
          const o = c.origFields || {};
          const raw = (f) => o[f] != null ? o[f] : c[f];
          return {
            code: c.code, name: c.name, section: raw('section'), time: raw('time'), location: raw('location'),
            instructor: raw('instructor'), examPeriodId: c.examPeriodId == null ? null : c.examPeriodId,
            hours: c.hours, type: c.type, status: c.status, campus: c.campus
          };
        },
        _mergeCoursesPayload(prev, next) {
          const merged = []; const at = new Map();
          prev.forEach(c => { const k = this._secKey(c); if (at.has(k)) return; at.set(k, merged.length); merged.push(this._plainCourse(c)); });
          let added = 0, updated = 0, skipped = 0;
          next.forEach(c => {
            const k = this._secKey(c); const i = at.get(k);
            if (i === undefined) {
              if (merged.length >= this._MERGE_MAX) { skipped++; return; }
              at.set(k, merged.length); merged.push(this._plainCourse(c)); added++;
            } else { merged[i] = this._plainCourse(c); updated++; }
          });
          return { merged, added, updated, skipped };
        },

        _applyNewCoursesData(courses) {
          const prev = this.state.isDemoMode ? [] : (this.state.allCoursesData || []).slice();
          const hadData = prev.length > 0;
          let merge = null;
          if (hadData && this.state.userSettings.mergeCoursesData) {
            merge = this._mergeCoursesPayload(prev, courses);
            courses = merge.merged;
          }
          const newTerm = !merge && (!hadData || this._looksLikeNewTerm(prev, courses));
          const rel = hadData ? this._scheduleRelevance(prev) : { mySecKeys: new Set(), myCodes: new Set() };
          const keepSchedules = !!merge || (hadData && !newTerm && rel.mySecKeys.size > 0);
          const prevAt = this._dataStamp();

          if (!keepSchedules) this._autoArchiveBeforeReset();
          this.state.isDemoMode = false;
          let persisted = true;
          try { localStorage.setItem(this.constants.STORAGE_KEYS.COURSES, JSON.stringify(courses)); } catch (e) { persisted = false; }
          this._markDataUpdated();
          if (!keepSchedules) {
            this.state.schedules = [];
            this._addSchedule(null, true);
            this.state.activeScheduleIndex = 0;
          }
          this._processAndDisplayData(courses);
          let remap = { kept: 0, dropped: 0 };
          if (keepSchedules) {
            remap = this._remapSchedulesToNewData(prev);
            this.state.activeScheduleIndex = Math.max(0, Math.min(this.state.activeScheduleIndex, this.state.schedules.length - 1));
          }
          this._saveSchedules();
          this.updateFullUI();

          let diff = null;
          if (hadData && !newTerm) {
            diff = this._computeCoursesDiff(prev, courses, { mySecKeys: rel.mySecKeys, myCodes: rel.myCodes, prevAt, dropped: remap.dropped });
            this._saveLastDiff(diff);
          } else if (newTerm) {
            try { localStorage.removeItem(this._DIFF_KEY); } catch (e) { }
          }
          return { diff, newTerm, keepSchedules, remap, merge, persisted, count: courses.length };
        },
        _afterDataUpdate(res) {
          if (!res) return;
          if (res.persisted === false) { this._showToast('warning', 'تعذّر حفظ البيانات محلياً — المساحة ممتلئة، وستضيع البيانات عند إغلاق الصفحة.'); return; }
          if (res.merge) {
            const m = res.merge;
            let msg = m.added > 0
              ? `أُضيفت ${this._sectionsWord(m.added)} من تخصص آخر — الإجمالي ${res.count} شعبة.`
              : 'لا شعب جديدة — كل ما حمّلته موجود لديك مسبقاً.';
            if (m.skipped > 0) msg += ` (تعذّرت إضافة ${m.skipped} لبلوغ الحد الأقصى)`;
            this._showToast(m.added > 0 ? 'success' : 'info', msg);
            if (res.diff && this._diffTotal(res.diff) > 0) setTimeout(() => this._showDataDiffModal(res.diff), 700);
            return;
          }
          if (res.newTerm) { this._showToast('success', `تم تحميل ${this._sectionsWord(res.count)}.`); return; }
          if (res.keepSchedules) this._showToast('success', 'تم تحديث البيانات مع الحفاظ على جدولك.');
          if (!res.diff || this._diffTotal(res.diff) === 0) {
            if (!res.keepSchedules) this._showToast('info', 'لا جديد — البيانات مطابقة لآخر تحديث.');
            else setTimeout(() => this._showToast('info', 'لا جديد منذ آخر تحديث.'), 400);
            return;
          }
          this._showDataDiffModal(res.diff);
        },

        _diffSinceText(diff) {
          if (!diff.prevAt) return 'مقارنة بآخر تحديث';
          const min = Math.floor((diff.at - diff.prevAt) / 60000), hr = Math.floor(min / 60), day = Math.floor(hr / 24);
          if (min < 1) return 'مقارنة بالبيانات السابقة';
          if (min < 60) return `التغييرات خلال آخر ${min} دقيقة`;
          if (hr < 24) return `التغييرات خلال آخر ${hr === 1 ? 'ساعة' : hr === 2 ? 'ساعتين' : `${hr} ساعات`}`;
          return `التغييرات خلال آخر ${this._daysPhrase(day)}`;
        },
        _diffItemHTML(e) {
          const meta = this._DIFF_KINDS[e.kind] || this._DIFF_KINDS.changed;
          const live = this.state.allCoursesData.find(c => this._secKey(c) === e.k);
          const tag = e.rel === 2 ? '<span class="dif-tag mine">في جدولك</span>' : (e.rel === 1 ? '<span class="dif-tag">من مقرراتك</span>' : '');
          const note = e.kind === 'changed' && Array.isArray(e.fields)
            ? e.fields.map(f => `<div class="dif-change"><b>${this._escapeHTML(f.l)}:</b> <bdi><s>${this._escapeHTML(f.f)}</s></bdi> <i class="ph ph-arrow-left"></i> <bdi>${this._escapeHTML(f.t)}</bdi></div>`).join('')
            : `<div class="dif-change">${this._escapeHTML(meta.note)}</div>`;
          const actions = live
            ? `<button type="button" class="dif-act" data-act="open" data-key="${this._escapeHTML(e.k)}" title="عرض الشعبة" aria-label="عرض الشعبة"><i class="ph ph-arrow-square-out"></i></button>`
            : '';
          return `<div class="dif-item ${meta.cls}"><span class="dif-badge"><i class="ph ${meta.icon}"></i></span><div class="dif-main"><div class="dif-head"><span class="dif-kind">${this._escapeHTML(meta.label)}</span><span class="dif-code">${this._escapeHTML(e.code)}</span><span class="dif-sec">شعبة ${this._escapeHTML(e.section)}</span>${tag}</div><div class="dif-name">${this._escapeHTML(e.name)} · ${this._escapeHTML(e.type)} · ${this._escapeHTML(e.instructor)}</div>${note}</div><div class="dif-actions"><button type="button" class="dif-act" data-act="copy" data-crn="${this._escapeHTML(e.section)}" title="نسخ رقم الشعبة" aria-label="نسخ رقم الشعبة"><i class="ph ph-copy"></i></button>${actions}</div></div>`;
        },
        _showDataDiffModal(diff) {
          if (!diff) { this._showToast('info', 'لا يوجد تقرير تغييرات بعد.'); return; }
          const c = diff.counts;
          const cards = [
            { v: c.opened, l: 'شعب فُتحت', cls: 'ok' },
            { v: c.closed, l: 'شعب أُغلقت', cls: 'bad' },
            { v: c.changed, l: 'مواعيد ومحاضرون', cls: 'warn' },
            { v: c.added + c.removed, l: 'إضافة وإلغاء', cls: '' }
          ].map(x => `<div class="analysis-card dif-card ${x.cls}"><div class="a-value">${x.v}</div><div class="a-label">${x.l}</div></div>`).join('');

          const droppedNote = diff.dropped > 0
            ? `<p class="dif-warn"><i class="ph ph-warning"></i> أُزيلت ${this._sectionsWord(diff.dropped)} من جداولك لأنها لم تعد موجودة في المقررات المطروحة.</p>`
            : '';
          const mineBlock = diff.mine.length > 0
            ? `<div class="dif-group"><h5><i class="ph ph-user-focus"></i> يخصّك (${diff.mine.length})</h5>${diff.mine.map(e => this._diffItemHTML(e)).join('')}</div>`
            : `<p class="dif-empty">${diff.hadSchedule ? 'لا تغييرات على مقرراتك أنت — التغييرات أدناه في بقية المقررات.' : 'لم تُضف مقررات إلى جدولك بعد، لذا هذا عرض عام لكل البيانات.'}</p>`;

          const otherOpened = diff.others.opened || [], otherAdded = diff.others.added || [];
          const otherCount = otherOpened.length + otherAdded.length;
          const othersBlock = otherCount > 0
            ? `<div class="dif-group dif-others"><button type="button" class="dif-toggle" aria-expanded="false"><span><i class="ph ph-list-magnifying-glass"></i> شعب فُتحت أو أُضيفت في مقررات أخرى (${otherCount})</span><i class="ph ph-caret-down"></i></button><div class="dif-others-body" hidden>${otherOpened.concat(otherAdded).map(e => this._diffItemHTML(e)).join('')}</div></div>`
            : '';

          Swal.fire({
            title: 'ما الذي تغيّر؟',
            html: `<div id="dif-modal-content" class="custom-scrollbar"><p class="dif-note">${this._escapeHTML(this._diffSinceText(diff))}</p><div class="analysis-grid dif-grid">${cards}</div>${droppedNote}${mineBlock}${othersBlock}</div>`,
            confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal' },
            didOpen: () => {
              const root = document.getElementById('dif-modal-content');
              if (!root) return;
              root.addEventListener('click', (ev) => {
                const toggle = ev.target.closest('.dif-toggle');
                if (toggle) {
                  const body = toggle.parentElement.querySelector('.dif-others-body');
                  const open = toggle.getAttribute('aria-expanded') === 'true';
                  toggle.setAttribute('aria-expanded', String(!open));
                  toggle.classList.toggle('open', !open);
                  if (body) body.hidden = open;
                  return;
                }
                const btn = ev.target.closest('.dif-act');
                if (!btn) return;
                if (btn.dataset.act === 'copy') {
                  navigator.clipboard.writeText(btn.dataset.crn || '')
                    .then(() => this._showToast('success', 'تم نسخ رقم الشعبة.'))
                    .catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.'));
                  return;
                }
                if (btn.dataset.act === 'open') {
                  const sec = this.state.allCoursesData.find(x => this._secKey(x) === btn.dataset.key);
                  const grp = sec ? this.state.groupedCourses[sec.code] : null;
                  if (!sec || !grp) { this._showToast('error', 'تعذّر فتح الشعبة.'); return; }
                  Swal.close();
                  setTimeout(() => { if (isMobile) this._showMobileSectionDetails(sec, grp); else this._showSectionQuickView(sec, grp); }, 220);
                }
              });
            }
          });
        },
        _openLastDiff() {
          const diff = this._loadLastDiff();
          if (!diff) { this._showToast('info', 'لا يوجد تقرير بعد — سيظهر بعد أول تحديث للبيانات.'); return; }
          this._toggleSettingsModal(false);
          this._showDataDiffModal(diff);
        },
        _lastDiffSummaryText() {
          const diff = this._loadLastDiff();
          if (!diff) return 'يظهر تقرير بما فُتح وأُغلق وتغيّر بعد كل تحديث للبيانات.';
          const total = this._diffTotal(diff);
          if (total === 0) return 'آخر تحديث: لا تغييرات تُذكر.';
          const parts = [];
          if (diff.counts.opened) parts.push(`${diff.counts.opened} فُتحت`);
          if (diff.counts.closed) parts.push(`${diff.counts.closed} أُغلقت`);
          if (diff.counts.changed) parts.push(`${diff.counts.changed} تعديل`);
          const fallback = total === 1 ? 'تغيير واحد' : total === 2 ? 'تغييران' : total <= 10 ? `${total} تغييرات` : `${total} تغييراً`;
          return `آخر تحديث: ${parts.join(' · ') || fallback}.`;
        }
      });

Object.assign(QU_ScheduleApp, {
        _buildGenBundles(includeClosed) {
          const groups = Object.values(this.state.groupedCourses).filter(g => !this.state.hiddenCourseCodes.has(g.code));
          const map = new Map();
          groups.forEach(g => {
            const key = this.state.linkedCourseGroups[g.name] ? 'n:' + g.name : 'c:' + g.code;
            if (!map.has(key)) map.set(key, { key, name: g.name, color: g.color, codes: [], sections: [] });
            const b = map.get(key);
            if (!b.codes.includes(g.code)) b.codes.push(g.code);
            const secs = includeClosed ? g.sections.slice() : g.sections.filter(s => !s.status || !s.status.includes('مغلقة'));
            b.sections.push(...secs);
          });
          return [...map.values()].filter(b => b.sections.length > 0).map(b => {
            const parts = new Map();
            b.sections.forEach(s => { const t = this._canonType(s.type); if (!parts.has(t)) parts.set(t, []); parts.get(t).push(s); });
            b.parts = [...parts.entries()].map(([type, sections]) => ({
              type, sections,
              instructors: [...new Set(sections.map(s => (s.instructor || '').trim()).filter(Boolean))]
            })).sort((x, y) => this._typeRank(x.type) - this._typeRank(y.type) || x.type.localeCompare(y.type, 'ar'));
            return b;
          });
        },
        _secOverlap(a, b) { return (a.timeSlots || []).some(x => (b.timeSlots || []).some(y => x.day === y.day && x.start < y.end && x.end > y.start)); },
        _secClash(a, b) {
          if (this._secOverlap(a, b)) return true;
          if (a.code !== b.code && a.name !== b.name && a.examPeriodId && b.examPeriodId && this._examPeriodsOverlap(a.examPeriodId, b.examPeriodId)) return true;
          return false;
        },
        _expandLinked(secs, includeClosed = false) {
          const out = secs.slice();
          secs.forEach(s => {
            const linkedGroup = this.state.linkedCourseGroups[s.name];
            if (!linkedGroup) return;
            linkedGroup.filter(c => c !== s.code).forEach(otherCode => {
              const comp = (this.state.groupedCourses[otherCode]?.sections || []).find(x => x.section === s.section);
              if (!comp) return;
              if (!includeClosed && comp.status && comp.status.includes('مغلقة')) return;
              if (out.some(x => x.uniqueId === comp.uniqueId)) return;
              if (out.some(x => x.code === comp.code && this._canonType(x.type) === this._canonType(comp.type))) return;
              out.push(comp);
            });
          });
          return out;
        },
        _quickUnits(bundle, includeClosed) {
          const isOpen = s => includeClosed || !(s.status && s.status.includes('مغلقة'));
          const units = [];
          bundle.codes.forEach(code => {
            const ordered = this.state.groupedCourses[code]?.sections || [];
            const paired = ordered.some(s => this._qaCompanion(s)) && ordered.some(s => !this._qaCompanion(s));
            ordered.forEach((sec, i) => {
              if (!isOpen(sec)) return;
              if (!paired) { units.push([sec]); return; }
              if (this._qaCompanion(sec)) return;
              const byType = new Map();
              for (let j = i + 1; j < ordered.length; j++) {
                if (!this._qaCompanion(ordered[j])) break;
                if (!isOpen(ordered[j])) continue;
                const k = this._typeLabel(ordered[j].type) || 'مرافقة';
                if (!byType.has(k)) byType.set(k, []);
                byType.get(k).push(ordered[j]);
              }
              let combos = [[sec]];
              byType.forEach(arr => {
                const next = [];
                combos.forEach(c => arr.forEach(x => { if (next.length < 80) next.push(c.concat([x])); }));
                if (next.length) combos = next;
              });
              combos.forEach(c => units.push(c));
            });
          });
          return units;
        },
        _quickBundleOptions(bundle, prefs, useInst, useDays, relaxed, cap) {
          const includeClosed = !!(prefs && prefs.includeClosed);
          const wantedMap = prefs.instructors || {};
          const seen = new Set();
          let options = [];
          this._quickUnits(bundle, includeClosed).forEach(unit => {
            const full = this._expandLinked(unit, includeClosed);
            for (let a = 0; a < full.length; a++) { for (let b = a + 1; b < full.length; b++) { if (this._secOverlap(full[a], full[b])) return; } }
            const sig = full.map(s => s.uniqueId).sort().join('|');
            if (seen.has(sig)) return;
            seen.add(sig);
            options.push(full);
          });
          if (useInst && Object.keys(wantedMap).some(k => k.startsWith(bundle.key + '|'))) {
            const ok = options.filter(o => o.every(s => { const w = wantedMap[bundle.key + '|' + this._canonType(s.type)]; return !w || !w.length || w.includes((s.instructor || '').trim()); }));
            if (ok.length) options = ok; else if (relaxed) relaxed.add(`${bundle.name} (الدكاترة المفضلون)`);
          }
          if (useDays && prefs.daysOff && prefs.daysOff.length) {
            const ok = options.filter(o => !o.some(s => (s.timeSlots || []).some(t => prefs.daysOff.includes(t.day))));
            if (ok.length) options = ok; else if (relaxed) relaxed.add(`${bundle.name} (أيام الإجازة)`);
          }
          return options.slice(0, cap || 120);
        },
        _bundleOptions(bundle, prefs, useInst, useDays, relaxed, cap) {
          if (prefs && prefs.mode === 'quick') return this._quickBundleOptions(bundle, prefs, useInst, useDays, relaxed, cap);
          const limit = cap || 120;
          const wantedMap = prefs.instructors || {};
          const parts = bundle.parts.map(p => {
            let secs = p.sections;
            if (useInst) {
              const wanted = wantedMap[bundle.key + '|' + p.type];
              if (wanted && wanted.length) {
                const f = secs.filter(s => wanted.includes((s.instructor || '').trim()));
                if (f.length) secs = f; else if (relaxed) relaxed.add(`${bundle.name} (دكتور ${p.type})`);
              }
            }
            if (useDays && prefs.daysOff && prefs.daysOff.length) {
              const f = secs.filter(s => !(s.timeSlots || []).some(t => prefs.daysOff.includes(t.day)));
              if (f.length) secs = f; else if (relaxed) relaxed.add(`${bundle.name} (أيام الإجازة)`);
            }
            return { type: p.type, sections: secs };
          });
          const options = []; const acc = [];
          const walk = (i) => {
            if (options.length >= limit) return;
            if (i >= parts.length) {
              const full = this._expandLinked(acc, !!(prefs && prefs.includeClosed));
              for (let a = 0; a < full.length; a++) { for (let b = a + 1; b < full.length; b++) { if (this._secOverlap(full[a], full[b])) return; } }
              options.push(full);
              return;
            }
            let cands = parts[i].sections;
            if (acc.length) {
              const linked = cands.filter(c => acc.some(a => a.code !== c.code && a.name === c.name && a.section === c.section));
              if (linked.length) cands = linked;
            }
            for (const sec of cands) {
              if (acc.some(a => a.uniqueId === sec.uniqueId)) continue;
              if (acc.some(a => this._secOverlap(a, sec))) continue;
              acc.push(sec); walk(i + 1); acc.pop();
              if (options.length >= limit) return;
            }
          };
          walk(0);
          return options;
        },
        _handleAutoGenerate() {
          if (this.state.allCoursesData.length === 0) { this._showToast('error', 'حمّل بيانات المقررات أولاً.'); return; }
          const saved = this._loadGenPrefs();
          let includeClosed = !!saved.includeClosed;
          let bundles = this._buildGenBundles(includeClosed);
          if (bundles.length === 0) { this._showToast('error', 'لا توجد مقررات ظاهرة لإنشاء جدول.'); return; }
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
          const savedCourses = Array.isArray(saved.courses) && saved.courses.length ? saved.courses : null;
          const selected = new Set(bundles.filter(b => !savedCourses || savedCourses.includes(b.key)).map(b => b.key));
          if (selected.size === 0) bundles.forEach(b => selected.add(b.key));
          const instState = {};
          const savedInst = saved.instructors || {};
          Object.keys(savedInst).forEach(k => { instState[k] = [...savedInst[k]]; });
          const esc = s => this._escapeHTML(s);
          const buildCourseCardsHTML = () => bundles.map(b => {
            const partsLabel = b.parts.map(p => p.type).join(' + ');
            return `<div class="gen-course-chip ${selected.has(b.key) ? 'selected' : ''}" data-key="${esc(b.key)}"><span class="color-dot" style="background:${b.color}"></span><div class="gc-info"><div class="gc-name">${esc(b.name)}</div><div class="gc-meta">${esc(b.codes.join(' + '))} <span class="gc-sep"></span> ${partsLabel} <span class="gc-sep"></span> ${b.sections.length} شعبة</div></div><i class="ph ph-check-circle gc-check"></i></div>`;
          }).join('');
          const includeClosedToggleHTML = `<div class="settings-item gen-closed-toggle"><div class="settings-item-label"><span>تضمين الشعب المغلقة</span><small>اعتبارها خياراً عند بناء الجدول رغم أنها مغلقة حالياً</small></div><label class="toggle-switch"><input type="checkbox" id="gen-include-closed"${includeClosed ? ' checked' : ''}><span class="slider"></span></label></div>`;
          const coursesHTML = `${includeClosedToggleHTML}<div class="gen-select-bar"><span class="gen-count" id="gen-course-count"></span><button type="button" class="gen-mini-btn" id="gen-courses-all"><i class="ph ph-checks"></i>الكل</button><button type="button" class="gen-mini-btn" id="gen-courses-none"><i class="ph ph-prohibit"></i>لا شيء</button></div><div class="gen-course-grid" id="gen-courses">${buildCourseCardsHTML()}</div>`;
          const modesHTML = `<div class="gen-options" id="gen-options">
<div class="gen-option gen-option-quick ${saved.mode === 'quick' ? 'selected' : ''}" data-mode="quick"><i class="ph ph-lightning"></i><div><div class="g-title">طريقة الجامعة <span class="gen-quick-badge">ينصح به</span></div><div class="g-desc">ينزّل المقرر واللي يتبع له مثل طريقة الإضافة بموقع الجامعة</div></div></div>
<div class="gen-option ${(saved.mode || 'any') === 'any' ? 'selected' : ''}" data-mode="any"><i class="ph ph-shuffle"></i><div><div class="g-title">أي جدول متاح</div><div class="g-desc">تركيبة خالية من التعارض</div></div></div>
<div class="gen-option ${saved.mode === 'late' ? 'selected' : ''}" data-mode="late"><i class="ph ph-sun-horizon"></i><div><div class="g-title">بدون محاضرات مبكرة</div><div class="g-desc">تفضيل الشعب المتأخرة صباحاً</div></div></div>
<div class="gen-option ${saved.mode === 'compact' ? 'selected' : ''}" data-mode="compact"><i class="ph ph-arrows-in-line-vertical"></i><div><div class="g-title">أقل فراغات</div><div class="g-desc">تقليل الفجوات بين المحاضرات</div></div></div>
<div class="gen-option ${saved.mode === 'days' ? 'selected' : ''}" data-mode="days"><i class="ph ph-calendar-minus"></i><div><div class="g-title">أقل أيام دوام</div><div class="g-desc">ضغط الجدول في أيام أقل</div></div></div>
</div>`;
          const daysHTML = `<div class="pref-chips" id="gen-days">${dayNames.map((n, i) => `<span class="pref-chip ${Array.isArray(saved.daysOff) && saved.daysOff.includes(i) ? 'selected' : ''}" data-day="${i}"><i class="ph ph-island"></i>${n}</span>`).join('')}</div>`;
          const partIcon = t => this._typeIcon(t);
          const buildInstHTML = () => {
            const active = bundles.filter(b => selected.has(b.key));
            if (!active.length) return '<p class="gen-hint">اختر مقرراً واحداً على الأقل من الأعلى.</p>';
            const html = active.map(b => {
              const partsHTML = b.parts.map(p => {
                const k = b.key + '|' + p.type;
                const sel = instState[k] || [];
                if (!p.instructors.length) return `<div class="inst-part"><span class="part-tag ${this._typeCls(p.type)}"><i class="ph ${partIcon(p.type)}"></i>${esc(p.type)}</span><span class="inst-empty">أسماء الدكاترة غير متوفرة</span></div>`;
                const chips = p.instructors.map(n => `<span class="pref-chip inst-chip ${sel.includes(n) ? 'selected' : ''}" data-k="${esc(k)}" data-inst="${esc(n)}"><i class="ph ph-user"></i>${esc(n)}</span>`).join('');
                return `<div class="inst-part"><span class="part-tag ${this._typeCls(p.type)}"><i class="ph ${partIcon(p.type)}"></i>${esc(p.type)}</span><div class="pref-chips">${chips}</div></div>`;
              }).join('');
              const multi = b.parts.length > 1 ? `<small class="gc-linked"><i class="ph ph-link"></i>${esc(b.parts.map(p => p.type).join(' + '))}</small>` : '';
              return `<div class="inst-group"><div class="inst-course"><span class="color-dot" style="background:${b.color}"></span>${esc(b.name)}${multi}</div>${partsHTML}</div>`;
            }).join('');
            return html;
          };
          const syncUI = () => {
            const countEl = document.getElementById('gen-course-count');
            if (countEl) countEl.textContent = `${selected.size} من ${bundles.length} مقرر`;
            const wrap = document.getElementById('gen-inst-wrap');
            if (wrap) { wrap.innerHTML = buildInstHTML(); wireInstChips(); }
          };
          const wireInstChips = () => {
            document.querySelectorAll('#gen-inst-wrap .inst-chip').forEach(el => el.addEventListener('click', () => {
              const k = el.dataset.k, name = el.dataset.inst;
              const list = instState[k] || (instState[k] = []);
              const i = list.indexOf(name);
              if (i >= 0) { list.splice(i, 1); el.classList.remove('selected'); } else { list.push(name); el.classList.add('selected'); }
            }));
          };
          const wireCourseChips = () => {
            document.querySelectorAll('#gen-courses .gen-course-chip').forEach(el => el.addEventListener('click', () => {
              const k = el.dataset.key;
              if (selected.has(k)) { selected.delete(k); el.classList.remove('selected'); } else { selected.add(k); el.classList.add('selected'); }
              syncUI();
            }));
          };
          Swal.fire({
            title: 'إنشاء الجدول الذكي',
            html: `<div class="gen-wizard custom-scrollbar">
<div class="gen-step-title"><i class="ph ph-list-checks"></i>المقررات المطلوبة <small>(اختر ما تريد جدولته)</small></div>${coursesHTML}
<div class="gen-step-title"><i class="ph ph-sliders"></i>نمط الجدول</div>${modesHTML}
<div class="gen-step-title"><i class="ph ph-island"></i>أيام إجازة مفضلة <small>(اختياري)</small></div>${daysHTML}
<div class="gen-step-title"><i class="ph ph-chalkboard-teacher"></i>الدكاترة المفضلون <small>(لكل جزء من المقرر)</small></div><div id="gen-inst-wrap"></div>
</div>`,
            width: 640,
            showCancelButton: true, confirmButtonText: '<i class="ph ph-magic-wand"></i> أنشئ الجدول', cancelButtonText: 'إلغاء',
            didOpen: () => {
              document.querySelectorAll('#gen-options .gen-option').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('#gen-options .gen-option').forEach(x => x.classList.remove('selected')); el.classList.add('selected'); }));
              wireCourseChips();
              const includeClosedToggle = document.getElementById('gen-include-closed');
              if (includeClosedToggle) {
                includeClosedToggle.onchange = e => {
                  includeClosed = e.target.checked;
                  bundles = this._buildGenBundles(includeClosed);
                  const coursesWrap = document.getElementById('gen-courses');
                  if (coursesWrap) { coursesWrap.innerHTML = buildCourseCardsHTML(); wireCourseChips(); }
                  syncUI();
                };
              }
              const allBtn = document.getElementById('gen-courses-all');
              const noneBtn = document.getElementById('gen-courses-none');
              if (allBtn) allBtn.addEventListener('click', () => { bundles.forEach(b => selected.add(b.key)); document.querySelectorAll('#gen-courses .gen-course-chip').forEach(el => el.classList.add('selected')); syncUI(); });
              if (noneBtn) noneBtn.addEventListener('click', () => { selected.clear(); document.querySelectorAll('#gen-courses .gen-course-chip').forEach(el => el.classList.remove('selected')); syncUI(); });
              document.querySelectorAll('#gen-days .pref-chip[data-day]').forEach(el => el.addEventListener('click', () => el.classList.toggle('selected')));
              syncUI();
            },
            preConfirm: () => {
              if (selected.size === 0) { Swal.showValidationMessage('اختر مقرراً واحداً على الأقل'); return false; }
              const instructors = {};
              Object.keys(instState).forEach(k => {
                const bundleKey = k.split('|')[0];
                if (selected.has(bundleKey) && instState[k].length) instructors[k] = [...instState[k]];
              });
              return {
                courses: [...selected],
                mode: document.querySelector('#gen-options .gen-option.selected')?.dataset.mode || 'any',
                daysOff: [...document.querySelectorAll('#gen-days .pref-chip[data-day].selected')].map(c => +c.dataset.day),
                instructors,
                includeClosed
              };
            }
          }).then(res => {
            if (!res.isConfirmed) return;
            const prefs = res.value;
            this._saveGenPrefs(prefs);
            const picked = bundles.filter(b => prefs.courses.includes(b.key));
            const { solutions, note } = this._collectSchedules(picked, prefs);
            if (!solutions.length) { this._showConflictResolver(picked, prefs); return; }
            this._showGeneratedPreview(solutions, 0, note, prefs);
          });
        },
        _analyzeGroupConflicts(bundles, prefs) {
          const prep = bundles.map(b => ({ key: b.key, name: b.name, color: b.color, options: this._bundleOptions(b, { instructors: {}, includeClosed: !!(prefs && prefs.includeClosed) }, false, false, null, 25) }));
          const pairs = [];
          for (let i = 0; i < prep.length; i++) {
            for (let j = i + 1; j < prep.length; j++) {
              let total = 0, conf = 0, timeOnly = 0, examOnly = 0, both = 0;
              const examPeriods = new Set();
              prep[i].options.forEach(oa => prep[j].options.forEach(ob => {
                total++;
                let t = false, e = false;
                oa.forEach(a => ob.forEach(b2 => {
                  if (this._secOverlap(a, b2)) t = true;
                  if (a.code !== b2.code && a.name !== b2.name && a.examPeriodId && b2.examPeriodId && this._examPeriodsOverlap(a.examPeriodId, b2.examPeriodId)) { e = true; examPeriods.add(a.examPeriodId); }
                }));
                if (!t && !e) return;
                conf++;
                if (t && e) both++; else if (t) timeOnly++; else examOnly++;
              }));
              if (total > 0 && conf > 0) {
                const cause = (timeOnly + both) && (examOnly + both) ? 'both' : (examOnly + both) ? 'exam' : 'time';
                pairs.push({ a: prep[i], b: prep[j], ratio: conf / total, cause, examPeriods: [...examPeriods] });
              }
            }
          }
          pairs.sort((x, y) => y.ratio - x.ratio);
          return pairs;
        },
        _showConflictResolver(bundles, prefs) {
          const pairs = this._analyzeGroupConflicts(bundles, prefs);
          const hard = pairs.filter(pr => pr.ratio >= 1);
          const shown = hard.length ? hard : pairs.slice(0, 4);
          const involved = new Map();
          shown.forEach(pr => { involved.set(pr.a.key, pr.a); involved.set(pr.b.key, pr.b); });
          const chipSource = involved.size > 0 ? [...involved.values()] : bundles.map(b => ({ key: b.key, name: b.name, color: b.color }));
          const courseTag = (c) => `<span class="cp-course"><span class="color-dot" style="background:${c.color}"></span>${this._escapeHTML(c.name)}</span>`;
          const causeMeta = { time: { icon: 'ph-clock', label: 'تعارض وقت المحاضرات', cls: 'time' }, exam: { icon: 'ph-file-text', label: 'تعارض موعد الاختبار', cls: 'exam' }, both: { icon: 'ph-warning-octagon', label: 'تعارض وقت واختبار', cls: 'both' } };
          const rowsHTML = shown.map(pr => {
            const m = causeMeta[pr.cause] || causeMeta.time;
            const periodNote = (pr.cause !== 'time' && pr.examPeriods.length) ? ` <span class="cp-period">فترة ${this._escapeHTML(pr.examPeriods[0])}</span>` : '';
            return `<div class="conflict-pair-row ${m.cls}"><div class="cp-cause"><span class="cp-cause-tag ${m.cls}"><i class="ph ${m.icon}"></i>${m.label}</span><span class="cp-degree ${pr.ratio >= 1 ? 'full' : ''}">${pr.ratio >= 1 ? 'كل الشعب' : Math.round(pr.ratio * 100) + '٪ من التركيبات'}</span>${periodNote}</div><div class="cp-pair">${courseTag(pr.a)}<i class="ph ph-arrows-left-right cp-x"></i>${courseTag(pr.b)}</div></div>`;
          }).join('');
          const hint = shown.length
            ? (hard.length ? 'هذه المقررات تتعارض شعبها مع بعض بالكامل، فما يمكن جمعها في جدول واحد. سبب كل تعارض موضّح أدناه:' : 'ما فيه تركيبة تجمع كل المقررات. هذه أكثر المقررات تعارضاً، وسبب كل تعارض:')
            : 'التعارض ناتج عن تداخل عدة مقررات معاً. اختر مقرراً لاستبعاده وجرّب من جديد:';
          const chips = chipSource.map(c => `<span class="pref-chip conflict-drop-chip" data-key="${this._escapeHTML(c.key)}"><span class="color-dot" style="background:${c.color}"></span>${this._escapeHTML(c.name)}</span>`).join('');
          Swal.fire({
            icon: 'warning',
            title: 'تعذّر إنشاء الجدول',
            html: `<div class="gen-wizard custom-scrollbar"><p class="conflict-resolver-hint">${hint}</p>${rowsHTML}<div class="gen-step-title" style="margin-top:1rem;"><i class="ph ph-hand-tap"></i>اختر ما تريد استبعاده من الجدول</div><div class="pref-chips" id="conflict-drop-chips">${chips}</div></div>`,
            width: 620,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-arrows-clockwise"></i> أنشئ بدون المستبعد',
            cancelButtonText: 'إلغاء',
            didOpen: () => { document.querySelectorAll('#conflict-drop-chips .pref-chip').forEach(el => el.addEventListener('click', () => el.classList.toggle('selected'))); },
            preConfirm: () => {
              const excluded = [...document.querySelectorAll('#conflict-drop-chips .pref-chip.selected')].map(c => c.dataset.key);
              if (!excluded.length) { Swal.showValidationMessage('اختر مقرراً واحداً على الأقل لاستبعاده'); return false; }
              if (excluded.length >= bundles.length) { Swal.showValidationMessage('لا يمكن استبعاد جميع المقررات'); return false; }
              return excluded;
            }
          }).then(res => {
            if (!res.isConfirmed) return;
            const excluded = res.value || [];
            const remaining = bundles.filter(b => !excluded.includes(b.key));
            const { solutions, note } = this._collectSchedules(remaining, prefs);
            if (!solutions.length) { this._showConflictResolver(remaining, prefs); return; }
            const names = excluded.map(k => bundles.find(b => b.key === k)?.name || k);
            const exNote = 'تم استبعاد: ' + names.join('، ') + '.';
            this._showGeneratedPreview(solutions, 0, note ? note + ' ' + exNote : exNote, prefs);
          });
        },
        _previewGridHTML(sol) {
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const items = [];
          sol.forEach(s => (s.timeSlots || []).forEach(t => items.push({ sec: s, day: t.day, from: this._toMin(t.start), to: this._toMin(t.end) })));
          if (!items.length) return '<div class="gen-grid-empty"><i class="ph ph-calendar-x"></i>لا توجد أوقات محاضرات لعرضها في هذه التركيبة.</div>';
          const used = new Set(items.map(i => i.day));
          const days = [0, 1, 2, 3, 4].concat([5, 6].filter(d => used.has(d)));
          let min = Math.floor(Math.min(...items.map(i => i.from)) / 60) * 60;
          let max = Math.ceil(Math.max(...items.map(i => i.to)) / 60) * 60;
          if (max - min < 240) max = min + 240;
          const span = max - min;
          const rowsCount = Math.round(span / 60);
          const axis = Array.from({ length: rowsCount }, (_, i) => `<div class="gp-hour"><span>${this._formatClock(min + i * 60)}</span></div>`).join('');
          const head = `<div class="gp-corner"></div>` + days.map(d => `<div class="gp-day ${used.has(d) ? '' : 'free'}">${dayNames[d]}</div>`).join('');
          const cols = days.map(d => {
            const dayItems = items.filter(i => i.day === d).sort((a, b) => a.from - b.from);
            if (!dayItems.length) return `<div class="gp-col free"><span class="gp-free">إجازة</span></div>`;
            const blocks = dayItems.map(it => {
              const color = this.state.groupedCourses[it.sec.code]?.color || '#8b5cf6';
              const top = ((it.from - min) / span) * 100;
              const h = ((it.to - it.from) / span) * 100;
              const dur = it.to - it.from;
              const type = this._canonType(it.sec.type);
              const title = `${it.sec.name} — ${type} — شعبة ${it.sec.section} — ${this._formatClock(it.from)} إلى ${this._formatClock(it.to)}${it.sec.instructor ? ' — ' + it.sec.instructor : ''}`;
              return `<div class="gp-block ${dur < 60 ? 'short' : ''}" style="top:${top.toFixed(2)}%;height:${h.toFixed(2)}%;--gp-c:${color};--gp-rgb:${this._hexToRgb(color)}" title="${this._escapeHTML(title)}"><b>${this._escapeHTML(it.sec.name)}</b><small>${this._escapeHTML(String(it.sec.section))}</small></div>`;
            }).join('');
            return `<div class="gp-col">${blocks}</div>`;
          }).join('');
          return `<div class="gen-grid-wrap custom-scrollbar"><div class="gen-grid" style="--gp-days:${days.length};--gp-rows:${rowsCount}"><div class="gp-head">${head}</div><div class="gp-body"><div class="gp-axis">${axis}</div>${cols}</div></div></div>`;
        },
        _showGeneratedPreview(solutions, index, note, prefs) {
          const total = solutions.length;
          let idx = ((index % total) + total) % total;
          let view = 'grid';
          const esc = s => this._escapeHTML(s);
          const statsHTML = (sol) => {
            const daySet = new Set(); let earliest = 24 * 60;
            sol.forEach(s => (s.timeSlots || []).forEach(t => { daySet.add(t.day); const st = this._toMin(t.start); if (st < earliest) earliest = st; }));
            const gaps = this._solutionGaps(sol);
            const startText = earliest === 24 * 60 ? 'غير محدد' : this._formatClock(earliest);
            return `<div class="gen-summary-stats"><span class="stat-chip"><i class="ph ph-calendar-blank"></i>${daySet.size} أيام دوام</span><span class="stat-chip"><i class="ph ph-clock"></i>يبدأ ${startText}</span><span class="stat-chip"><i class="ph ph-hourglass-medium"></i>فراغات ${Math.round(gaps / 6) / 10}س</span><span class="stat-chip"><i class="ph ph-stack"></i>${sol.length} شعبة</span></div>`;
          };
          const rowsHTML = (sol) => sol.slice().sort((a, b) => a.name.localeCompare(b.name, 'ar') || this._typeRank(this._canonType(a.type)) - this._typeRank(this._canonType(b.type))).map(s => {
            const color = this.state.groupedCourses[s.code]?.color || 'var(--color-primary)';
            const wanted = (prefs.instructors || {})[this._instKeyOf(s)];
            const star = wanted && wanted.includes((s.instructor || '').trim()) ? ' <i class="ph-fill ph-star" style="color:var(--color-warning);font-size:0.7rem;"></i>' : '';
            const t = this._canonType(s.type);
            const tag = `<span class="g-type ${this._typeCls(t)}">${esc(t)}</span>`;
            return `<div class="gen-summary-row"><span class="color-dot" style="background:${color}"></span><div class="g-info"><div class="g-name">${esc(s.name)} ${tag}</div><div class="g-meta">${esc(s.instructor || 'غير محدد')}${star}</div></div><span class="g-sec">شعبة ${esc(s.section)}</span></div>`;
          }).join('');
          const noteHTML = note ? `<div class="gen-note"><i class="ph-fill ph-warning"></i>${note}</div>` : '';
          const bodyHTML = () => {
            const sol = solutions[idx];
            const nav = total > 1
              ? `<div class="gen-nav"><button type="button" class="gen-nav-btn" id="gen-prev" aria-label="التركيبة السابقة"><i class="ph ph-caret-right"></i></button><span class="gen-nav-count">تركيبة <b>${idx + 1}</b> من ${total}</span><button type="button" class="gen-nav-btn" id="gen-next" aria-label="التركيبة التالية"><i class="ph ph-caret-left"></i></button></div>`
              : `<div class="gen-alt-count">تركيبة واحدة متاحة</div>`;
            const tabs = `<div class="gen-view-tabs" role="tablist"><button type="button" class="gvt-btn ${view === 'grid' ? 'active' : ''}" data-view="grid"><i class="ph ph-squares-four"></i>معاينة الجدول</button><button type="button" class="gvt-btn ${view === 'list' ? 'active' : ''}" data-view="list"><i class="ph ph-list-bullets"></i>الشعب</button></div>`;
            const body = view === 'grid' ? this._previewGridHTML(sol) : rowsHTML(sol);
            return `${noteHTML}${nav}${statsHTML(sol)}${tabs}<div class="gen-view-body">${body}</div>`;
          };
          const wire = () => {
            const root = document.getElementById('gen-preview-body');
            if (!root) return;
            const go = step => { idx = (idx + step + total) % total; this._vibrate(8); render(); };
            root.querySelector('#gen-prev')?.addEventListener('click', () => go(-1));
            root.querySelector('#gen-next')?.addEventListener('click', () => go(1));
            root.querySelectorAll('.gvt-btn').forEach(b => b.addEventListener('click', () => { view = b.dataset.view; render(); }));
          };
          const render = () => {
            const root = document.getElementById('gen-preview-body');
            if (!root) return;
            root.innerHTML = bodyHTML();
            root.scrollTop = 0;
            wire();
          };
          Swal.fire({
            title: total > 1 ? 'اختر جدولك المقترح' : 'جدول مقترح',
            html: `<div class="gen-summary custom-scrollbar" id="gen-preview-body">${bodyHTML()}</div>`,
            width: 620,
            showCancelButton: true,
            confirmButtonText: '<i class="ph ph-check"></i> اعتماد الجدول',
            cancelButtonText: 'إلغاء',
            customClass: { popup: 'swal2-popup gen-preview-swal' },
            didOpen: () => wire()
          }).then(r => {
            if (!r.isConfirmed) return;
            const sol = solutions[idx];
            const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            this._addSchedule(`مقترح ${time}`, false);
            const sched = this.state.schedules[this.state.schedules.length - 1];
            sol.forEach(s => sched.sections.add(s.uniqueId));
            const linkedIds = new Set();
            const anchors = new Map();
            sol.forEach(s => {
              if (!this.state.linkedCourseGroups[s.name]) return;
              const cur = anchors.get(s.name);
              if (!cur || this._typeRank(this._canonType(s.type)) < this._typeRank(this._canonType(cur.type))) anchors.set(s.name, s);
            });
            anchors.forEach(s => {
              const linkedGroup = this.state.linkedCourseGroups[s.name];
              if (!linkedGroup) return;
              linkedGroup.filter(c => c !== s.code).forEach(otherCode => {
                const comp = sol.find(x => x.code === otherCode && x.section === s.section);
                if (!comp || linkedIds.has(comp.uniqueId) || comp.uniqueId === s.uniqueId) return;
                if (!sched.linkedSections.has(s.uniqueId)) sched.linkedSections.set(s.uniqueId, new Set());
                sched.linkedSections.get(s.uniqueId).add(comp.uniqueId);
                linkedIds.add(comp.uniqueId);
              });
            });
            if (prefs.mode === 'quick') {
              const inSol = new Set(sol.map(s => s.uniqueId));
              sol.forEach(s => {
                if (!this._qaCompanion(s) || linkedIds.has(s.uniqueId)) return;
                const anchor = this._qaAnchorOf(s);
                if (!anchor || !inSol.has(anchor.uniqueId)) return;
                if (!sched.linkedSections.has(anchor.uniqueId)) sched.linkedSections.set(anchor.uniqueId, new Set());
                sched.linkedSections.get(anchor.uniqueId).add(s.uniqueId);
                linkedIds.add(s.uniqueId);
              });
            }
            this.state.activeScheduleIndex = this.state.schedules.length - 1;
            this.updateFullUI(); this._toggleSettingsModal(false); this._vibrate([15, 40, 15]);
            this._showToast('success', `تم اعتماد الجدول المقترح (${sol.length} شعبة).`);
          });
        },
        _solutionGaps(sol) {
          const byDay = {};
          sol.forEach(s => (s.timeSlots || []).forEach(t => (byDay[t.day] = byDay[t.day] || []).push(t)));
          let gap = 0;
          Object.values(byDay).forEach(slots => {
            slots.sort((a, b) => this._toMin(a.start) - this._toMin(b.start));
            for (let i = 1; i < slots.length; i++) { const g = this._toMin(slots[i].start) - this._toMin(slots[i - 1].end); if (g > 0) gap += g; }
          });
          return gap;
        },
        _collectSchedules(bundles, prefs) {
          const relaxed = new Set();
          const build = (useInst, useDays) => {
            const prep = bundles.map(b => ({ key: b.key, options: this._bundleOptions(b, prefs, useInst, useDays, relaxed) })).filter(p => p.options.length > 0);
            if (prep.length < bundles.length) return [];
            prep.sort((a, b) => a.options.length - b.options.length);
            const solutions = []; const chosen = []; let nodes = 0;
            const clashes = (opt) => opt.some(sec => chosen.some(c => this._secClash(sec, c)));
            const solve = (i) => {
              if (solutions.length >= 40 || nodes > 60000) return;
              if (i >= prep.length) { solutions.push(chosen.slice()); return; }
              const cands = prep[i].options.slice();
              for (let k = cands.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [cands[k], cands[j]] = [cands[j], cands[k]]; }
              for (const opt of cands) {
                nodes++;
                if (clashes(opt)) continue;
                opt.forEach(s => chosen.push(s));
                solve(i + 1);
                opt.forEach(() => chosen.pop());
                if (solutions.length >= 40 || nodes > 60000) return;
              }
            };
            solve(0);
            return solutions;
          };
          let note = '';
          const hasInst = Object.keys(prefs.instructors || {}).length > 0;
          let solutions = build(true, true);
          if (!solutions.length && prefs.daysOff && prefs.daysOff.length) { solutions = build(true, false); if (solutions.length) note = 'تعذّر تحقيق يوم الإجازة المفضل، هذه أفضل البدائل.'; }
          if (!solutions.length && hasInst) { solutions = build(false, true); if (solutions.length) note = 'تعذّر الالتزام بالدكاترة المختارين، هذه أفضل البدائل.'; }
          if (!solutions.length) { solutions = build(false, false); if (solutions.length) note = 'تعذّر تحقيق التفضيلات، هذه التركيبات المتاحة فقط.'; }
          if (!note && relaxed.size) note = `لا خيارات مطابقة لتفضيلاتك في: ${[...relaxed].join('، ')}.`;
          const startMin = sol => Math.min(...sol.flatMap(s => (s.timeSlots || []).map(t => this._toMin(t.start))).concat([24 * 60]));
          const daysCount = sol => new Set(sol.flatMap(s => (s.timeSlots || []).map(t => t.day))).size;
          const instScore = sol => sol.filter(s => ((prefs.instructors || {})[this._instKeyOf(s)] || []).includes((s.instructor || '').trim())).length;
          const dayViolations = sol => (prefs.daysOff && prefs.daysOff.length) ? sol.filter(s => (s.timeSlots || []).some(t => prefs.daysOff.includes(t.day))).length : 0;
          solutions.sort((a, b) => {
            const inst = instScore(b) - instScore(a);
            if (inst !== 0) return inst;
            const viol = dayViolations(a) - dayViolations(b);
            if (viol !== 0) return viol;
            if (prefs.mode === 'late') return startMin(b) - startMin(a);
            if (prefs.mode === 'compact') return this._solutionGaps(a) - this._solutionGaps(b);
            if (prefs.mode === 'days') return daysCount(a) - daysCount(b);
            return 0;
          });
          return { solutions, note };
        },
        _gapScore(sec, chosen) {
          let score = 0;
          sec.timeSlots.forEach(ts => chosen.forEach(c => c.timeSlots.forEach(cs => {
            if (cs.day === ts.day) score += Math.abs(this._toMin(ts.start) - this._toMin(cs.end)) + Math.abs(this._toMin(cs.start) - this._toMin(ts.end));
          })));
          return score;
        },
      });

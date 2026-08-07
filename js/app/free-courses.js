Object.assign(QU_ScheduleApp, {
        _FREE_KEY: 'quFreeCourses_v1',

        _loadFreeState() {
          try {
            const o = JSON.parse(localStorage.getItem(this._FREE_KEY));
            if (o && typeof o === 'object') return { g: o.g === 'male' || o.g === 'female' ? o.g : null, added: (o.added && typeof o.added === 'object') ? o.added : {} };
          } catch (e) { }
          return { g: null, added: {} };
        },
        _saveFreeState(s) { try { localStorage.setItem(this._FREE_KEY, JSON.stringify(s)); } catch (e) { } },
        _freeList(gender) { return (QU_FREE_COURSES[gender] || []); },
        _freeCourse(gender, code) { return this._freeList(gender).find(c => c.code === code) || null; },
        _freeSectionCount(course) { return course.campuses.reduce((n, cp) => n + cp.sections.length, 0); },

        _freeCourseRows(course) {
          const rows = [];
          course.campuses.forEach(cp => cp.sections.forEach(s => rows.push({
            code: course.code,
            name: course.name,
            section: String(s.n),
            time: 'غير محدد',
            location: cp.name,
            instructor: s.i || 'لم يحدد',
            examPeriodId: course.exam || null,
            hours: String(course.hours),
            type: s.m || course.mode,
            status: 'مفتوحة',
            campus: cp.name
          })));
          return rows;
        },

        _applyFreePayload(next) {
          const prev = (this.state.allCoursesData || []).slice();
          try {
            if (next.length) localStorage.setItem(this.constants.STORAGE_KEYS.COURSES, JSON.stringify(next));
            else localStorage.removeItem(this.constants.STORAGE_KEYS.COURSES);
          } catch (e) {
            this._showToast('warning', 'تعذّر حفظ البيانات محلياً — المساحة ممتلئة.');
            return false;
          }
          this._processAndDisplayData(next);
          this._remapSchedulesToNewData(prev);
          this._saveSchedules();
          this.updateFullUI();
          if (!next.length && this.dom.installOverlay) {
            this.dom.installOverlay.style.display = 'flex';
            this.dom.installOverlay.classList.add('visible');
          }
          return true;
        },

        _freeSecKeySet() {
          const out = new Set();
          const added = this._loadFreeState().added || {};
          Object.keys(added).forEach(k => (Array.isArray(added[k]) ? added[k] : []).forEach(key => out.add(key)));
          return out;
        },

        _isFreeAdded(gender, code) {
          const keys = this._loadFreeState().added[`${gender}:${code}`];
          return Array.isArray(keys) && keys.length > 0;
        },

        _freeFlash(type, msg) { this._freeView.flash = { type, msg }; },

        _addFreeCourse(gender, code) {
          if (this.state.isDemoMode) { this._freeFlash('info', 'لا يمكن الإضافة في وضع المعاينة.'); return; }
          const course = this._freeCourse(gender, code);
          if (!course) return;
          const prev = (this.state.allCoursesData || []).map(c => this._plainCourse(c));
          const have = new Set(prev.map(c => this._secKey(c)));
          const rows = this._freeCourseRows(course).filter(r => !have.has(this._secKey(r)));
          if (!rows.length) { this._freeFlash('info', `شعب ${course.name} موجودة لديك مسبقاً في المقررات.`); return; }
          if (!this._applyFreePayload(prev.concat(rows))) return;
          const st = this._loadFreeState();
          st.g = gender;
          st.added[`${gender}:${code}`] = rows.map(r => this._secKey(r));
          this._saveFreeState(st);
          this._vibrate(12);
          this._freeFlash('ok', `تمت إضافة ${course.name} (${this._sectionsWord(rows.length)}) إلى المقررات — تجدها الآن في قائمة المقررات.`);
        },

        _removeFreeCourse(gender, code) {
          const st = this._loadFreeState();
          const keys = new Set(st.added[`${gender}:${code}`] || []);
          if (!keys.size) return;
          const next = (this.state.allCoursesData || []).map(c => this._plainCourse(c)).filter(c => !keys.has(this._secKey(c)));
          if (!this._applyFreePayload(next)) return;
          delete st.added[`${gender}:${code}`];
          this._saveFreeState(st);
          const course = this._freeCourse(gender, code);
          this._freeFlash('info', `تمت إزالة ${course ? course.name : 'المقرر'} من المقررات.`);
        },

        _freeIntroHTML() {
          const d = QU_FREE_COURSES;
          const faq = d.intro.faq.map(f => `<div class="fq-card"><div class="fq-q"><i class="ph-fill ph-check-circle"></i><span>${this._escapeHTML(f.q)}</span></div><p class="fq-a">${this._escapeHTML(f.a)}</p></div>`).join('');
          const tables = d.intro.hours.map(g => `<div class="fh-card"><div class="fh-head">${this._escapeHTML(g.college)}</div>${g.rows.map(r => `<div class="fh-row"><span class="fh-major">${this._escapeHTML(r.major)}</span><span class="fh-val ${r.h === '0' ? 'zero' : ''}">${this._escapeHTML(r.h)}</span></div>`).join('')}</div>`).join('');
          return `<div class="free-hero">
              <span class="fh-term"><i class="ph-fill ph-calendar-dots"></i> الفصل ${this._escapeHTML(d.term)}</span>
              <h4>المقررات الحرة</h4>
              <p>${this._escapeHTML(d.intro.what)}</p>
            </div>
            <div class="free-faq">${faq}</div>
            <div class="free-sec-title"><i class="ph ph-hourglass-medium"></i> عدد الساعات الحرة المطلوبة من كل تخصص</div>
            <div class="free-hours">${tables}</div>
            <div class="free-pick">
              <div class="fp-title">اختر القسم لعرض الشعب المقترحة</div>
              <div class="fp-btns">
                <button type="button" class="fp-btn" data-free-gender="male"><i class="ph-fill ph-student"></i><span>طالب</span></button>
                <button type="button" class="fp-btn" data-free-gender="female"><i class="ph-fill ph-student"></i><span>طالبة</span></button>
              </div>
            </div>
            ${this._freeSourceHTML()}`;
        },

        _freeSourceHTML() {
          const d = QU_FREE_COURSES;
          const links = d.links.map(l => `<a class="free-link" href="${l.u}" target="_blank" rel="noopener noreferrer">${this._escapeHTML(l.t)}</a>`).join('');
          return `<div class="free-source">
              <p>تم أخذ هذه المعلومات من ملف <a href="${d.sourceUrl}" target="_blank" rel="noopener noreferrer">«المقررات الحرة ${this._escapeHTML(d.term)} — طلاب وطالبات»</a> المنشور في قناة جامعة القصيم جميع التخصصات، ولهم جزيل الشكر.</p>
              <div class="free-links">${links}</div>
            </div>`;
        },

        _freeListHTML(gender) {
          const list = this._freeList(gender);
          const st = this._loadFreeState();
          const notes = QU_FREE_COURSES.notes.map(n => `<div class="fn-item"><i class="ph ${n.i}"></i><div><b>${this._escapeHTML(n.t)}</b><span>${this._escapeHTML(n.d)}</span></div></div>`).join('');
          const cards = list.map(c => {
            const added = Array.isArray(st.added[`${gender}:${c.code}`]) && st.added[`${gender}:${c.code}`].length > 0;
            const total = this._freeSectionCount(c);
            const campuses = c.campuses.map(cp => `<div class="fc-campus"><span class="fc-campus-name"><i class="ph ph-map-pin"></i>${this._escapeHTML(cp.name)}</span><div class="fc-secs">${cp.sections.map(s => `<span class="fc-sec"><b>${this._escapeHTML(String(s.n))}</b><small>${this._escapeHTML(s.i || 'لم يحدد')}</small>${s.m ? `<em>${this._escapeHTML(s.m)}</em>` : ''}</span>`).join('')}</div></div>`).join('');
            return `<div class="fc-card ${added ? 'is-added' : ''}" role="button" tabindex="0" data-free-code="${this._escapeHTML(c.code)}" aria-pressed="${added}">
                <div class="fc-top">
                  <span class="fc-code">${this._escapeHTML(c.code)}</span>
                  <div class="fc-title"><h5>${this._escapeHTML(c.name)}</h5><div class="fc-chips"><span class="fc-chip"><i class="ph ph-hourglass-medium"></i>${c.hours} ساعات</span><span class="fc-chip"><i class="ph ph-laptop"></i>${this._escapeHTML(c.mode)}</span><span class="fc-chip"><i class="ph ph-file-text"></i>${c.exam ? 'فترة ' + this._escapeHTML(c.exam) : 'فترة لم تحدد'}</span><span class="fc-chip"><i class="ph ph-squares-four"></i>${this._sectionsWord(total)}</span></div></div>
                  <span class="fc-state">${added ? '<i class="ph-fill ph-check-circle"></i><span>مضاف</span>' : '<i class="ph ph-plus-circle"></i><span>إضافة</span>'}</span>
                </div>
                <p class="fc-targets"><i class="ph ph-users-three"></i> ${this._escapeHTML(c.targets)}</p>
                <div class="fc-campuses">${campuses}</div>
                <div class="fc-cta">${added ? '<i class="ph ph-x-circle"></i> اضغط للإزالة من المقررات' : '<i class="ph ph-arrow-down"></i> اضغط لإضافته إلى المقررات مع شعبه'}</div>
              </div>`;
          }).join('');
          return `<div class="free-listbar">
              <button type="button" class="free-back" data-free-back><i class="ph ph-arrow-right"></i> التفاصيل</button>
              <span class="free-gender-chip"><i class="ph-fill ph-student"></i> شطر ${gender === 'male' ? 'الطلاب' : 'الطالبات'}</span>
              <div class="fp-btns compact">
                <button type="button" class="fp-btn ${gender === 'male' ? 'active' : ''}" data-free-gender="male">طالب</button>
                <button type="button" class="fp-btn ${gender === 'female' ? 'active' : ''}" data-free-gender="female">طالبة</button>
              </div>
            </div>
            ${this._freeFlashHTML()}
            <div class="free-notes">${notes}</div>
            <div class="free-cards">${cards}</div>
            ${this._freeSourceHTML()}`;
        },

        _freeFlashHTML() {
          const f = this._freeView.flash;
          if (!f) return '';
          const icon = f.type === 'ok' ? 'ph-check-circle' : 'ph-info';
          return `<div class="free-flash ${this._escapeHTML(f.type)}"><i class="ph-fill ${icon}"></i><span>${this._escapeHTML(f.msg)}</span></div>`;
        },

        _renderFreeCourses(root) {
          if (!root) return;
          const v = this._freeView;
          const keepScroll = root.scrollTop;
          const hadCards = !!root.querySelector('.fc-card');
          root.innerHTML = v.screen === 'list' && v.gender ? this._freeListHTML(v.gender) : this._freeIntroHTML();
          v.flash = null;
          root.scrollTop = hadCards && v.screen === 'list' ? keepScroll : 0;
          root.querySelectorAll('[data-free-gender]').forEach(btn => {
            btn.addEventListener('click', () => {
              const g = btn.dataset.freeGender;
              this._freeView = { screen: 'list', gender: g };
              const st = this._loadFreeState(); st.g = g; this._saveFreeState(st);
              this._renderFreeCourses(root);
            });
          });
          const back = root.querySelector('[data-free-back]');
          if (back) back.addEventListener('click', () => { this._freeView.screen = 'intro'; this._renderFreeCourses(root); });
          root.querySelectorAll('[data-free-code]').forEach(card => {
            const act = () => {
              const code = card.dataset.freeCode;
              if (this._isFreeAdded(v.gender, code)) this._removeFreeCourse(v.gender, code);
              else this._addFreeCourse(v.gender, code);
              this._renderFreeCourses(root);
            };
            card.addEventListener('click', act);
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
          });
        },

        _showFreeCoursesModal() {
          this._freeView = { screen: 'intro', gender: this._loadFreeState().g };
          Swal.fire({
            title: 'المقررات الحرة',
            html: '<div id="free-root" class="custom-scrollbar"></div>',
            showConfirmButton: false,
            showCloseButton: true,
            allowOutsideClick: true,
            customClass: { popup: 'swal2-popup wide-swal free-swal' },
            didOpen: (popup) => this._renderFreeCourses(popup.querySelector('#free-root'))
          });
        }
      });

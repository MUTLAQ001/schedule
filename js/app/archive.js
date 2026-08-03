Object.assign(QU_ScheduleApp, {
        _ARCHIVE_KEY: 'quScheduleArchives_v1',
        _STALE_DISMISS_KEY: 'quScheduleStaleDismiss_v1',
        _STALE_AFTER_DAYS: 15,
        _STALE_SNOOZE_DAYS: 7,
        _MAX_ARCHIVES: 8,

        _daysPhrase(n) {
          if (n === 1) return 'يوم واحد';
          if (n === 2) return 'يومان';
          if (n <= 10) return `${n} أيام`;
          return `${n} يوماً`;
        },
        _dataStamp() {
          try { const t = parseInt(localStorage.getItem('quScheduleCoursesTime') || '0', 10); return isFinite(t) && t > 0 ? t : 0; } catch (e) { return 0; }
        },
        _dataAgeDays() {
          const t = this._dataStamp();
          if (!t || t > Date.now()) return null;
          return Math.floor((Date.now() - t) / 86400000);
        },
        _isStaleBannerDismissed() {
          let d = null;
          try { const raw = localStorage.getItem(this._STALE_DISMISS_KEY); d = raw ? JSON.parse(raw) : null; } catch (e) { return false; }
          if (!d || typeof d !== 'object') return false;
          if (d.t !== this._dataStamp()) return false;
          return (Date.now() - (parseInt(d.at, 10) || 0)) < this._STALE_SNOOZE_DAYS * 86400000;
        },
        _dismissStaleBanner() {
          try { localStorage.setItem(this._STALE_DISMISS_KEY, JSON.stringify({ t: this._dataStamp(), at: Date.now() })); } catch (e) { }
          document.querySelectorAll('.stale-data-banner').forEach(el => el.remove());
        },
        _renderStaleDataBanner() {
          document.querySelectorAll('.stale-data-banner').forEach(el => el.remove());
          if (this.state.isDemoMode || this.state.allCoursesData.length === 0) return;
          if (!this._dataStamp()) { this._markDataUpdated(); return; }
          const days = this._dataAgeDays();
          if (days === null || days < this._STALE_AFTER_DAYS) return;
          if (this._isStaleBannerDismissed()) return;
          const host = isMobile ? document.getElementById('mobile-calendar-view') : document.querySelector('.page-wrapper .main-content');
          if (!host) return;
          const el = document.createElement('div');
          el.className = 'stale-data-banner';
          el.innerHTML = `<span class="sdb-icon"><i class="ph-fill ph-clock-countdown"></i></span><div class="sdb-body"><span class="sdb-title">بيانات المقررات قديمة</span><span class="sdb-sub">مضى ${this._daysPhrase(days)} على آخر تحديث — قد تكون بعض الشعب أُغلقت أو تغيّرت مواعيدها.</span></div><button class="sdb-update" type="button"><i class="ph ph-arrows-clockwise"></i> حدّث الآن</button><button class="sdb-close" type="button" aria-label="إخفاء التنبيه" title="إخفاء لمدة أسبوع"><i class="ph ph-x"></i></button>`;
          const header = isMobile ? null : host.querySelector(':scope > .main-header');
          if (header) host.insertBefore(el, header.nextSibling);
          else host.insertBefore(el, host.firstChild);
          el.querySelector('.sdb-close').addEventListener('click', () => this._dismissStaleBanner());
          el.querySelector('.sdb-update').addEventListener('click', () => this._openDataUpdateGuide());
        },
        _openDataUpdateGuide() {
          const overlay = this.dom.installOverlay;
          if (!overlay) return;
          const container = this.dom.installSectionContainer;
          if (container && !container.querySelector('.install-close-btn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'install-close-btn';
            btn.setAttribute('aria-label', 'إغلاق');
            btn.innerHTML = '<i class="ph ph-x"></i>';
            btn.addEventListener('click', () => this._closeDataUpdateGuide());
            container.appendChild(btn);
          }
          this._toggleSettingsModal(false);
          overlay.style.display = 'flex';
          requestAnimationFrame(() => overlay.classList.add('visible'));
        },
        _closeDataUpdateGuide() {
          const overlay = this.dom.installOverlay;
          if (!overlay || this.state.allCoursesData.length === 0) return;
          overlay.classList.remove('visible');
          overlay.style.display = 'none';
        },

        _loadArchives() {
          try { const raw = localStorage.getItem(this._ARCHIVE_KEY); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a.filter(x => x && x.id) : []; } catch (e) { return []; }
        },
        _saveArchives(list) {
          try { localStorage.setItem(this._ARCHIVE_KEY, JSON.stringify(list)); return true; }
          catch (e) { this._showToast('error', 'لا توجد مساحة كافية للأرشيف — احذف أرشيفاً قديماً وأعد المحاولة.'); return false; }
        },
        _defaultArchiveName() {
          let d = '';
          try { d = new Date().toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: 'long' }); } catch (e) { }
          if (!d) { try { d = new Date().toLocaleDateString('ar'); } catch (e2) { d = ''; } }
          return d ? `أرشيف ${d}` : 'أرشيف فصل سابق';
        },
        _archiveSignature(a) {
          return (a.schedules || []).map(s => (s.sections || []).slice().sort().join(',')).sort().join('|');
        },
        _buildArchiveSnapshot(name) {
          const schedules = this.state.schedules
            .filter(s => s && s.sections && s.sections.size > 0)
            .map(s => ({ name: s.name, sections: Array.from(s.sections), linked: Array.from(s.linkedSections.entries()).map(([k, v]) => [k, Array.from(v)]) }));
          if (schedules.length === 0) return null;
          const used = new Set();
          schedules.forEach(s => s.sections.forEach(id => used.add(id)));
          const courses = this.state.allCoursesData.filter(c => used.has(c.uniqueId)).map(c => ({
            uniqueId: c.uniqueId, code: c.code, name: c.name, section: c.section, time: c.time,
            location: c.location, instructor: c.instructor, hours: c.hours, type: c.type,
            examPeriodId: c.examPeriodId, timeSlots: c.timeSlots || []
          }));
          if (courses.length === 0) return null;
          const colors = {};
          courses.forEach(c => { const g = this.state.groupedCourses[c.code]; if (g && g.color) colors[c.code] = g.color; });
          return { v: 1, id: `a${Date.now()}${Math.floor(Math.random() * 1000)}`, name: name || this._defaultArchiveName(), savedAt: Date.now(), schedules, courses, colors };
        },
        _archiveCurrentTerm(opts) {
          opts = opts || {};
          if (this.state.isDemoMode) { if (!opts.silent) this._showToast('info', 'لا يمكن الأرشفة في وضع المعاينة.'); return null; }
          const snap = this._buildArchiveSnapshot(opts.name);
          if (!snap) { if (!opts.silent) this._showToast('info', 'لا يوجد جدول فيه مقررات لأرشفته.'); return null; }
          const list = this._loadArchives();
          if (opts.dedupe) {
            const sig = this._archiveSignature(snap);
            if (list.some(a => this._archiveSignature(a) === sig)) return null;
          }
          list.unshift(snap);
          while (list.length > this._MAX_ARCHIVES) list.pop();
          if (!this._saveArchives(list)) return null;
          if (!opts.silent) this._showToast('success', `تمت أرشفة "${snap.name}".`);
          return snap;
        },
        _autoArchiveBeforeReset() {
          if (this.state.isDemoMode) return;
          const snap = this._archiveCurrentTerm({ silent: true, dedupe: true });
          if (snap) this._showToast('info', `تم حفظ جدولك السابق في الأرشيف باسم "${snap.name}".`);
        },
        _archiveStats(a) {
          const byId = new Map((a.courses || []).map(c => [c.uniqueId, c]));
          const main = (a.schedules || [])[0];
          const secs = main ? (main.sections || []).map(id => byId.get(id)).filter(Boolean) : [];
          const codes = new Set(secs.map(c => c.code));
          let credits = 0;
          const counted = new Set();
          secs.forEach(c => { if (counted.has(c.code)) return; counted.add(c.code); const h = parseInt(c.hours, 10); if (!isNaN(h)) credits += h; });
          const days = new Set();
          secs.forEach(c => (c.timeSlots || []).forEach(t => days.add(t.day)));
          return { schedules: (a.schedules || []).length, courses: codes.size, credits, days: days.size };
        },
        _reopenArchives(res) {
          if (res && res.isDismissed && !res.dismiss) return;
          this._showArchivesModal();
        },
        _archiveDateText(a) {
          try { return new Date(a.savedAt).toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { }
          try { return new Date(a.savedAt).toLocaleDateString('ar-SA'); } catch (e) { return ''; }
        },
        _showArchivesModal() {
          const list = this._loadArchives();
          if (list.length === 0) {
            Swal.fire({
              title: 'الفصول المؤرشفة',
              html: `<div class="arch-empty"><i class="ph ph-archive"></i><p>لا يوجد أرشيف بعد.</p><p class="arch-empty-sub">عند تحميل بيانات فصل جديد، يُحفظ جدولك الحالي هنا تلقائياً قبل استبداله. ويمكنك الأرشفة يدوياً من الإعدادات في أي وقت.</p></div>`,
              confirmButtonText: 'تم'
            });
            return;
          }
          const cards = list.map(a => {
            const s = this._archiveStats(a);
            const meta = [this._archiveDateText(a), `${s.courses} مقرر`, `${s.credits} ساعة`, s.schedules > 1 ? `${s.schedules} جداول` : ''].filter(Boolean).join(' · ');
            return `<div class="arch-card" data-id="${this._escapeHTML(a.id)}"><div class="arch-main"><div class="arch-name">${this._escapeHTML(a.name)}</div><div class="arch-meta">${this._escapeHTML(meta)}</div></div><div class="arch-actions"><button type="button" data-act="view" title="عرض الجدول" aria-label="عرض"><i class="ph ph-eye"></i></button><button type="button" data-act="rename" title="إعادة تسمية" aria-label="إعادة تسمية"><i class="ph ph-pencil-simple"></i></button><button type="button" data-act="export" title="تنزيل كملف" aria-label="تنزيل"><i class="ph ph-download-simple"></i></button><button type="button" data-act="delete" class="danger" title="حذف" aria-label="حذف"><i class="ph ph-trash"></i></button></div></div>`;
          }).join('');
          Swal.fire({
            title: 'الفصول المؤرشفة',
            html: `<div id="arch-modal-content" class="custom-scrollbar"><p class="arch-note">نسخ محفوظة من جداولك السابقة. تُحفظ على جهازك فقط، وتُمسح مع "إعادة تعيين التطبيق".</p>${cards}</div>`,
            confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup wide-swal' },
            didOpen: () => {
              const root = document.getElementById('arch-modal-content');
              if (!root) return;
              root.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-act]');
                if (!btn) return;
                const id = btn.closest('.arch-card')?.dataset.id;
                if (!id) return;
                const act = btn.dataset.act;
                if (act === 'view') this._viewArchive(id);
                else if (act === 'rename') this._renameArchive(id);
                else if (act === 'export') this._exportArchive(id);
                else if (act === 'delete') this._deleteArchive(id);
              });
            }
          });
        },
        _viewArchive(id) {
          const a = this._loadArchives().find(x => x.id === id);
          if (!a) { this._showToast('error', 'تعذّر العثور على الأرشيف.'); return; }
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const byId = new Map((a.courses || []).map(c => [c.uniqueId, c]));
          const blocks = (a.schedules || []).map(sch => {
            const secs = (sch.sections || []).map(i => byId.get(i)).filter(Boolean)
              .sort((x, y) => x.code.localeCompare(y.code) || String(x.section).localeCompare(String(y.section), undefined, { numeric: true }));
            if (secs.length === 0) return '';
            let credits = 0;
            const counted = new Set();
            const days = new Set();
            secs.forEach(c => {
              if (!counted.has(c.code)) { counted.add(c.code); const h = parseInt(c.hours, 10); if (!isNaN(h)) credits += h; }
              (c.timeSlots || []).forEach(t => days.add(t.day));
            });
            const rows = secs.map(c => {
              const color = (a.colors || {})[c.code] || 'var(--color-primary)';
              const times = (c.timeSlots || []).length
                ? (c.timeSlots || []).map(t => `${dayNames[t.day] || ''} ${this._formatClock(this._toMin(t.start))} – ${this._formatClock(this._toMin(t.end))}`).join('<br>')
                : this._escapeHTML(String(c.time || 'غير محدد')).replace(/&lt;br&gt;/g, '<br>');
              return `<tr><td class="arch-course"><span class="arch-dot" style="background:${this._escapeHTML(color)}"></span><div><div class="arch-c-code">${this._escapeHTML(c.code)}</div><div class="arch-c-name">${this._escapeHTML(c.name)}</div></div></td><td>${this._escapeHTML(String(c.section))}</td><td>${this._escapeHTML(this._typeLabel ? this._typeLabel(c.type) : String(c.type || ''))}</td><td class="arch-time">${times}</td><td>${this._escapeHTML(c.instructor || 'غير محدد')}</td><td>${this._escapeHTML(c.location || '—')}</td></tr>`;
            }).join('');
            const crns = secs.map(c => String(c.section)).join(', ');
            return `<div class="arch-sched"><div class="arch-sched-head"><h5>${this._escapeHTML(sch.name || 'جدول')}</h5><span>${secs.length} شعبة · ${counted.size} مقرر · ${credits} ساعة · ${days.size} يوم</span></div><div class="arch-table-wrap"><table class="arch-table"><thead><tr><th>المقرر</th><th>الشعبة</th><th>النوع</th><th>المواعيد</th><th>المحاضر</th><th>القاعة</th></tr></thead><tbody>${rows}</tbody></table></div><button type="button" class="data-btn arch-copy-crns" data-crns="${this._escapeHTML(crns)}"><i class="ph ph-clipboard-text"></i> نسخ أرقام الشعب</button></div>`;
          }).join('');
          Swal.fire({
            title: this._escapeHTML(a.name),
            html: `<div id="arch-view-content" class="custom-scrollbar"><p class="arch-note">محفوظ في ${this._escapeHTML(this._archiveDateText(a))} — للعرض فقط.</p>${blocks || '<p class="arch-note">لا توجد مقررات في هذا الأرشيف.</p>'}</div>`,
            confirmButtonText: 'رجوع',
            customClass: { popup: 'swal2-popup wide-swal' },
            didOpen: () => {
              document.getElementById('arch-view-content')?.addEventListener('click', (e) => {
                const btn = e.target.closest('.arch-copy-crns');
                if (!btn) return;
                navigator.clipboard.writeText(btn.dataset.crns || '')
                  .then(() => this._showToast('success', 'تم نسخ أرقام الشعب.'))
                  .catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.'));
              });
            }
          }).then(res => this._reopenArchives(res));
        },
        _renameArchive(id) {
          const list = this._loadArchives();
          const a = list.find(x => x.id === id);
          if (!a) return;
          Swal.fire({
            title: 'إعادة تسمية الأرشيف',
            input: 'text',
            inputValue: a.name,
            inputAttributes: { maxlength: 60 },
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            inputValidator: (v) => (!v || !v.trim()) ? 'الاسم فارغ' : undefined
          }).then(res => {
            if (!res.isConfirmed) { this._reopenArchives(res); return; }
            a.name = String(res.value).trim().slice(0, 60);
            if (this._saveArchives(list)) this._showToast('success', 'تم تغيير الاسم.');
            this._reopenArchives(res);
          });
        },
        _deleteArchive(id) {
          const list = this._loadArchives();
          const a = list.find(x => x.id === id);
          if (!a) return;
          Swal.fire({
            title: 'حذف الأرشيف؟',
            text: `سيتم حذف "${a.name}" نهائياً.`,
            icon: 'warning',
            showCancelButton: true,
            customClass: { confirmButton: 'swal-danger' },
            confirmButtonText: '<i class="ph ph-trash"></i> حذف',
            cancelButtonText: 'إلغاء'
          }).then(res => {
            if (res.isConfirmed) {
              const next = list.filter(x => x.id !== id);
              if (this._saveArchives(next)) this._showToast('success', 'تم الحذف.');
              if (this.dom.settingsModal?.classList.contains('open')) this._buildSettingsModal();
            }
            this._reopenArchives(res);
          });
        },
        _exportArchive(id) {
          const a = this._loadArchives().find(x => x.id === id);
          if (!a) return;
          const blob = new Blob([JSON.stringify(a)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const el = document.createElement('a');
          el.href = url;
          el.download = `qu_archive_${new Date(a.savedAt).toISOString().slice(0, 10)}.json`;
          document.body.appendChild(el); el.click(); document.body.removeChild(el);
          URL.revokeObjectURL(url);
          this._showToast('success', 'تم تنزيل ملف الأرشيف.');
        }
      });

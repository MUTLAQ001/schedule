Object.assign(QU_ScheduleApp, {
        _initPWA() {
          try {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta && this.state.userSettings.accentColor) meta.setAttribute('content', this.state.userSettings.accentColor);
          } catch (e) { }
          try {
            if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
              window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
            }
          } catch (e) { }
        },
        _showToast(type, message) { Toast.fire({ icon: type, title: message }); },
        _vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} },
        _toMin(hms) { const p = String(hms).split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); },
        _normalizeArabic(str) { return String(str ?? '').toLowerCase().replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي'); },
        _formatDuration(totalMin) {
          const h = Math.floor(totalMin / 60), m = totalMin % 60;
          if (h === 0) return `${m} دقيقة`;
          const hText = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
          return m > 0 ? `${hText} و ${m} دقيقة` : hText;
        },
        _formatClock(totalMin) {
          let h = Math.floor(totalMin / 60); const m = totalMin % 60;
          const period = h >= 12 ? 'م' : 'ص';
          h = h % 12 || 12;
          return `${h}:${String(m).padStart(2, '0')} ${period}`;
        },
        _loadQRCodeLib() {
          if (window.QRCode) return Promise.resolve();
          if (this._qrLibPromise) return this._qrLibPromise;
          this._qrLibPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
            s.onload = resolve;
            s.onerror = () => { this._qrLibPromise = null; reject(new Error('qr lib failed')); };
            document.head.appendChild(s);
          });
          return this._qrLibPromise;
        },
        _showUndoSnackbar(message, onUndo) {
          let bar = document.getElementById('undo-snackbar');
          if (!bar) { bar = document.createElement('div'); bar.id = 'undo-snackbar'; bar.className = 'undo-snackbar'; document.body.appendChild(bar); }
          clearTimeout(this._undoTimer);
          bar.innerHTML = `<span class="undo-msg">${message}</span><button class="undo-btn"><i class="ph ph-arrow-counter-clockwise"></i> تراجع</button>`;
          requestAnimationFrame(() => bar.classList.add('show'));
          const hide = () => { bar.classList.remove('show'); clearTimeout(this._undoTimer); };
          bar.querySelector('.undo-btn').onclick = () => { hide(); onUndo(); };
          this._undoTimer = setTimeout(hide, 5000);
        },
        _removeWithUndo(uniqueId, schedule) {
          const section = this.state.allCoursesData.find(c => c.uniqueId === uniqueId);
          const prevSections = new Set(schedule.sections);
          const prevLinked = new Map(Array.from(schedule.linkedSections.entries()).map(([k, v]) => [k, new Set(v)]));
          this._removeSectionAndUnlink(uniqueId, schedule);
          this.updateCalendarAndConflicts();
          this._vibrate(15);
          this._showUndoSnackbar(`تمت إزالة ${section ? section.name : 'الشعبة'}`, () => {
            schedule.sections = prevSections; schedule.linkedSections = prevLinked;
            this.updateCalendarAndConflicts();
            if (this.dom.mobileSectionDetailsOverlay && this.dom.mobileSectionDetailsOverlay.classList.contains('open') && this._sheetState) {
              this._showMobileSectionDetails(this._sheetState.section, this._sheetState.group);
            }
          });
        },
        _isSectionClosed(section) { return !!(section && String(section.status || '').includes('مغلقة')); },
        _watchTextFor(section) { return `${String(section.code || '').trim()} | ${String(section.instructor || 'غير محدد').trim()}`; },
        _copyText(text) {
          const str = String(text == null ? '' : text);
          try { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(str); } catch (e) { }
          return new Promise((resolve, reject) => {
            try {
              const ta = document.createElement('textarea');
              ta.value = str; ta.setAttribute('readonly', '');
              ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
              document.body.appendChild(ta);
              ta.select(); ta.setSelectionRange(0, str.length);
              const ok = document.execCommand('copy');
              document.body.removeChild(ta);
              ok ? resolve() : reject(new Error('copy failed'));
            } catch (e) { reject(e); }
          });
        },
        _watchLinkAttrs(section, cls, extra) {
          return `<a class="${cls}" href="${this.constants.WATCH_BOT_URL}" target="_blank" rel="noopener noreferrer" data-watch-id="${this._escapeHTML(section.uniqueId)}"${extra || ''}>`;
        },
        _closedWatchHTML(section) {
          return `<span class="closed-watch"><span class="cw-status"><i class="ph-fill ph-lock-simple"></i>مغلقة</span>${this._watchLinkAttrs(section, 'cw-action', ' title="مراقبة الشعبة عبر البوت"')}<i class="ph-fill ph-bell-ringing"></i>راقبها</a></span>`;
        },
        _watchCardHTML(section) {
          return `<div class="watch-card"><div class="watch-card-icon"><i class="ph-fill ph-bell-ringing"></i></div><div class="watch-card-text"><strong>الشعبة مغلقة</strong><span>فعّل المراقبة وبيوصلك تنبيه أول ما يفتح فيها مقعد.</span></div>${this._watchLinkAttrs(section, 'watch-card-btn')}<i class="ph ph-telegram-logo"></i> مراقبة الشعبة</a></div>`;
        },
        _showWatchSnackbar(section) {
          let bar = document.getElementById('watch-snackbar');
          if (!bar) { bar = document.createElement('div'); bar.id = 'watch-snackbar'; bar.className = 'undo-snackbar watch-snackbar'; document.body.appendChild(bar); }
          clearTimeout(this._watchBarTimer);
          bar.innerHTML = `<span class="undo-msg"><i class="ph-fill ph-lock-simple"></i> شعبة ${this._escapeHTML(section.section)} مغلقة</span>${this._watchLinkAttrs(section, 'undo-btn')}<i class="ph-fill ph-bell-ringing"></i> راقبها</a>`;
          requestAnimationFrame(() => bar.classList.add('show'));
          this._watchBarTimer = setTimeout(() => bar.classList.remove('show'), 7000);
        },
        _watchSectionOnBot(section) {
          if (!section) return;
          const text = this._watchTextFor(section);
          this._vibrate(12);
          this._copyText(text)
            .then(() => this._showToast('success', `تم نسخ "${text}" — الصقه في البوت`))
            .catch(() => this._showToast('info', `انسخ يدوياً: ${text}`));
        },
        _visibleSectionsOf(group) {
          const secs = this.state.userSettings.hideClosedCourses ? group.sections.filter(sec => !sec.status.includes('مغلقة')) : group.sections;
          return secs.slice().sort((a, b) => a.section.localeCompare(b.section, undefined, { numeric: true }));
        },
        _courseNavigate(dir) {
          const st = this._sheetState; if (!st || !st.visibleGroups) return;
          const i = st.visibleGroups.findIndex(g => g.code === st.group.code);
          const ni = i + dir;
          if (ni < 0 || ni >= st.visibleGroups.length) return;
          const targetGroup = st.visibleGroups[ni];
          const firstSec = this._visibleSectionsOf(targetGroup)[0];
          if (!firstSec) return;
          this._vibrate(8);
          this._showMobileSectionDetails(firstSec, targetGroup, true);
        },
        _sheetNavigate(dir) {
          const st = this._sheetState; if (!st) return;
          const i = st.courseSections.findIndex(s => s.uniqueId === st.section.uniqueId);
          const ni = i + dir;
          if (ni < 0 || ni >= st.courseSections.length) return;
          this._showMobileSectionDetails(st.courseSections[ni], st.group);
        },
        _markDataUpdated() { try { localStorage.setItem('quScheduleCoursesTime', String(Date.now())); } catch (e) {} },
        _getDataUpdatedText() {
          const t = parseInt(localStorage.getItem('quScheduleCoursesTime') || '0', 10);
          if (!t) return 'غير معروف';
          const min = Math.floor((Date.now() - t) / 60000), hr = Math.floor(min / 60), day = Math.floor(hr / 24);
          if (min < 1) return 'الآن';
          if (min < 60) return `قبل ${min} دقيقة`;
          if (hr < 24) return `قبل ${hr} ساعة`;
          if (day < 30) return `قبل ${day} يوم`;
          return new Date(t).toLocaleDateString('ar-SA');
        },
        _loadGenPrefs() { try { return JSON.parse(localStorage.getItem('quGenPrefs_v2')) || {}; } catch (e) { return {}; } },
        _saveGenPrefs(p) { try { localStorage.setItem('quGenPrefs_v2', JSON.stringify(p)); } catch (e) { } },
        _canonType(t) {
          const s = String(t || '').replace(/\s+/g, ' ').trim();
          if (!s) return 'نظري';
          if (/عملي|معمل|مختبر|تطبيق/.test(s)) return 'عملي';
          if (/تمارين|تمرين|مناقشة|سكشن/.test(s)) return 'تمارين';
          if (/نظري|نظرى|محاضرة/.test(s)) return 'نظري';
          return s;
        },
        _typeRank(t) { const o = { 'نظري': 0, 'عملي': 1, 'تمارين': 2 }; return o[t] ?? 3; },
        _typeIcon(t) {
          if (t === 'عملي') return 'ph-flask';
          if (t === 'تمارين') return 'ph-pencil-simple-line';
          if (t === 'نظري') return 'ph-chalkboard-teacher';
          if (/تدريب|ميداني|زيارة|تطبيق/.test(t)) return 'ph-briefcase';
          return 'ph-book-open';
        },
        _typeCls(t) {
          if (t === 'نظري') return 'th';
          if (t === 'عملي') return 'lab';
          if (t === 'تمارين') return 'ex';
          return 'other';
        },
        _bundleKeyOf(sec) { return this.state.linkedCourseGroups[sec.name] ? 'n:' + sec.name : 'c:' + sec.code; },
        _instKeyOf(sec) { return this._bundleKeyOf(sec) + '|' + this._canonType(sec.type); },
      });

Object.assign(QU_ScheduleApp, {
        _loadSettings() {
          let saved = null;
          let parsed = null;
          try { saved = localStorage.getItem(this.constants.STORAGE_KEYS.SETTINGS); } catch (e) { saved = null; }
          if (saved) {
            try {
              parsed = JSON.parse(saved);
              this.state.userSettings = { ...this.state.userSettings, ...parsed };
              this.state.hiddenCourseCodes = new Set(this.state.userSettings.hiddenCourseCodes || []);
            } catch (e) { parsed = null; try { localStorage.removeItem(this.constants.STORAGE_KEYS.SETTINGS); } catch (e2) { } }
          }
          if (!parsed || typeof parsed.highPerformance !== 'boolean') {
            this.state.userSettings.highPerformance = false;
          }
          if (!this.state.userSettings.examScheduleMode) { this.state.userSettings.examScheduleMode = '3'; }
          if (!this.state.userSettings.customPalette || typeof this.state.userSettings.customPalette !== 'object') { this.state.userSettings.customPalette = {}; }
          this._applySettings();
        },
        _saveSettings() { if (this.state.isDemoMode) return; this.state.userSettings.hiddenCourseCodes = Array.from(this.state.hiddenCourseCodes); localStorage.setItem(this.constants.STORAGE_KEYS.SETTINGS, JSON.stringify(this.state.userSettings)); },
        _buildSettingsModal() {
          const modal = this.dom.settingsModal;
          const scrollContainer = modal.querySelector('.modal-content');
          const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

          let courseColorsHTML = Object.values(this.state.groupedCourses).sort((a, b) => a.code.localeCompare(b.code)).map(g => `<div class="settings-item"><div class="settings-item-label"><span style="color:${g.color};font-weight:600;">${this._escapeHTML(g.name)} (${this._escapeHTML(g.code)})</span></div><label class="color-picker-label" style="background-color:${g.color};"><input type="color" class="color-picker-input" data-course-code="${this._escapeHTML(g.code)}" value="${g.color}"></label></div>`).join('');
          if (!courseColorsHTML) courseColorsHTML = '<p style="color:var(--color-text-muted);font-size:0.9rem;">لم يتم تحميل بيانات المقررات بعد.</p>';
          let courseVisibilityHTML = Object.values(this.state.groupedCourses).sort((a, b) => a.code.localeCompare(b.code)).map(g => { const isHidden = this.state.hiddenCourseCodes.has(g.code); const label = this.state.isVisibilityNamesMode ? g.name : g.code; return `<button class="course-visibility-btn ${isHidden ? 'hidden' : 'visible'}" data-course-code="${this._escapeHTML(g.code)}" style="--item-color:${g.color};--item-color-rgb:${this._hexToRgb(g.color)};"><span class="color-dot"></span>${this._escapeHTML(label)}</button>`; }).join('');
          if (!courseVisibilityHTML) courseVisibilityHTML = '<p style="color:var(--color-text-muted);font-size:0.9rem;">لم يتم تحميل بيانات المقررات بعد.</p>';
          const archivesCount = this._loadArchives().length;
          const archivesSub = archivesCount === 0 ? 'لا يوجد أرشيف بعد.' : archivesCount === 1 ? 'فصل واحد محفوظ.' : archivesCount === 2 ? 'فصلان محفوظان.' : `${archivesCount} فصول محفوظة.`;
          modal.innerHTML = `<div class="modal-header"><h3><i class="ph ph-gear-six"></i> الإعدادات</h3><i class="ph ph-x modal-close-btn"></i></div><div class="modal-content custom-scrollbar"><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-palette"></i>المظهر</h4><div class="settings-item"><div class="settings-item-label"><span>الوضع</span></div><div class="mode-toggle"></div></div><div class="settings-item"><div class="settings-item-label"><span>اللون الأساسي</span><small>اضغط على القلم لتبديل أي لون ثابت بلونك الخاص</small></div><div class="theme-picker" id="accent-color-picker"></div></div><div class="settings-item"><div class="settings-item-label"><span>وضع الأداء العالي</span><small>إلغاء تأثيرات الشفافية لتسريع الموقع</small></div><label class="toggle-switch"><input type="checkbox" id="high-perf-toggle"><span class="slider"></span></label></div></div><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-funnel"></i>ترشيح المقررات</h4><div class="settings-item"><div class="settings-item-label"><span>إخفاء الشعب المغلقة</span><small>لإزالة الشعب غير المتاحة من القائمة</small></div><label class="toggle-switch"><input type="checkbox" id="hide-closed-toggle"><span class="slider"></span></label></div><div class="settings-item"><div class="settings-item-label"><span>وضع الإضافة السريعة</span><small>عند تفعيله يقوم بمحاكاة أسلوب الإضافة بموقع الجامعة</small></div><label class="toggle-switch"><input type="checkbox" id="quick-add-toggle"><span class="slider"></span></label></div><div class="settings-group-title" style="margin-top:2rem; justify-content: space-between;"><div style="display:flex; align-items:center; gap:0.75rem;"><i class="ph ph-eye-slash"></i>التحكم في ظهور المقررات</div><button id="modal-visibility-swap-btn" class="data-btn" style="padding:0.2rem 0.6rem; font-size: 0.9rem;" title="تبديل الاسم/الرمز"><i class="ph ph-text-aa"></i></button></div><div id="course-visibility-list" class="course-visibility-grid">${courseVisibilityHTML}</div></div><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-paint-brush"></i>ألوان المقررات</h4><div id="course-colors-list">${courseColorsHTML}</div></div><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-squares-four"></i>تخطيط الواجهة</h4><div class="settings-item"><div class="settings-item-label"><span>موقع عمود الوقت</span><small>يمين أو يسار الجدول</small></div><div class="mode-toggle" id="time-axis-toggle"></div></div><div class="settings-item" id="sidebar-position-item"><div class="settings-item-label"><span>موقع قائمة المقررات</span><small>يمين أو يسار الشاشة (الكمبيوتر واللوحي)</small></div><div class="mode-toggle" id="sidebar-position-toggle"></div></div><div class="settings-item" id="layout-editor-item"><div class="settings-item-label"><span>تخطيط الصفحة</span><small>حرّك كل قسم لمكانه، وبدّل مواضعها في الصف، وتحكم في عرضها</small></div><button class="data-btn" id="layout-editor-btn"><i class="ph ph-squares-four"></i>تخصيص</button></div><div class="settings-item"><div class="settings-item-label"><span>إظهار عطلة نهاية الأسبوع</span><small>لعرض يومي الجمعة والسبت</small></div><label class="toggle-switch"><input type="checkbox" id="show-weekend-toggle"><span class="slider"></span></label></div></div><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-magic-wand"></i>أدوات الجدول</h4><div class="settings-item"><div class="settings-item-label"><span>إنشاء الجدول الذكي</span><small>نمط الجدول، أيام الإجازة، ودكاترتك المفضلون لكل مقرر.</small></div><button class="data-btn" id="auto-generate-btn"><i class="ph ph-magic-wand"></i>ابدأ</button></div><div class="settings-item"><div class="settings-item-label"><span>تصدير للتقويم (.ics)</span><small>يفتح جدولك في Google أو Apple Calendar مع تنبيهات.</small></div><button class="data-btn" id="export-ics-btn"><i class="ph ph-calendar-plus"></i>تصدير</button></div><div class="settings-item"><div class="settings-item-label"><span>تصدير الاختبارات (.ics)</span><small>مواعيد اختباراتك النهائية مع تذكير قبل يوم.</small></div><button class="data-btn" id="export-exams-btn"><i class="ph ph-file-text"></i>تصدير</button></div><div class="settings-item"><div class="settings-item-label"><span>تحليل الوقت</span><small>ساعات الحضور، الفراغات، وأيام الإجازة.</small></div><button class="data-btn" id="time-analysis-btn"><i class="ph ph-chart-bar"></i>عرض</button></div><div class="settings-item"><div class="settings-item-label"><span>مقارنة الجداول</span><small>قارن سيناريوهاتك: الأيام، الفراغات، والتعارضات.</small></div><button class="data-btn" id="compare-schedules-btn"><i class="ph ph-scales"></i>قارن</button></div><div class="settings-item"><div class="settings-item-label"><span>مقارنة مع صديق</span><small>الصق رابط جدوله لعرض الفراغات المشتركة بينكما.</small></div><button class="data-btn" id="friend-compare-btn"><i class="ph ph-users-three"></i>ابدأ</button></div><div class="settings-item"><div class="settings-item-label"><span>مقاطع الشرح</span><small>فيديوهات قصيرة لتثبيت الأداة على الجوال واللوحي والكمبيوتر.</small></div><button class="data-btn" id="guide-videos-settings-btn"><i class="ph ph-monitor-play"></i>مشاهدة</button></div><div class="settings-item"><div class="settings-item-label"><span>الجولة التعريفية</span><small>شرح سريع لأهم أجزاء الموقع.</small></div><button class="data-btn" id="start-tour-btn"><i class="ph ph-compass"></i>ابدأ</button></div><div class="settings-item"><div class="settings-item-label"><span>اختصارات لوحة المفاتيح</span><small>اختصارات سريعة لمستخدمي الحاسب.</small></div><button class="data-btn" id="settings-shortcuts-btn"><i class="ph ph-keyboard"></i>عرض</button></div><div class="settings-item"><div class="settings-item-label"><span>المميزات</span><small>قائمة كل ما يقدمه الموقع.</small></div><button class="data-btn" id="settings-features-btn"><i class="ph ph-sparkle"></i>عرض</button></div></div><div class="settings-group"><h4 class="settings-group-title"><i class="ph ph-database"></i>إدارة البيانات</h4><div class="settings-item"><div class="settings-item-label"><span>بيانات المقررات</span><small>آخر تحديث: ${this._getDataUpdatedText()}</small></div></div><div class="settings-item"><div class="settings-item-label"><span>ما الذي تغيّر؟</span><small>${this._escapeHTML(this._lastDiffSummaryText())}</small></div><button class="data-btn" id="data-diff-btn"><i class="ph ph-git-diff"></i>عرض</button></div><div class="settings-item"><div class="settings-item-label"><span>مشاركة وتصدير</span><small>شارك جدولك برابط أو رمز QR، أو احفظه كملف.</small></div><div class="data-actions-group"><button class="data-btn" id="share-btn"><i class="ph ph-share-network"></i>مشاركة</button><button class="data-btn" id="export-btn"><i class="ph ph-cloud-arrow-down"></i>تصدير</button><button class="data-btn" id="import-btn"><i class="ph ph-cloud-arrow-up"></i>استيراد</button><input type="file" id="import-file-input" accept=".json" style="display:none;"></div></div><div class="settings-item"><div class="settings-item-label"><span>استيراد باللصق</span><small>الصق JSON لجدول أو بيانات مقررات.</small></div><button class="data-btn" id="import-paste-btn"><i class="ph ph-clipboard-text"></i>لصق</button></div><div class="settings-item"><div class="settings-item-label"><span>أرشفة الفصل الحالي</span><small>احفظ نسخة من جداولك. تتم الأرشفة تلقائياً أيضاً عند تحميل بيانات فصل جديد.</small></div><button class="data-btn" id="archive-now-btn"><i class="ph ph-archive"></i>أرشفة</button></div><div class="settings-item"><div class="settings-item-label"><span>الفصول المؤرشفة</span><small>${archivesSub}</small></div><button class="data-btn" id="archives-btn"><i class="ph ph-clock-counter-clockwise"></i>عرض</button></div><div class="settings-item"><div class="settings-item-label"><span>إعادة تعيين التطبيق</span><small>سيؤدي هذا إلى مسح جميع بيانات التطبيق نهائياً، بما فيها الفصول المؤرشفة.</small></div><button class="data-btn danger" id="reset-app-btn"><i class="ph ph-arrow-counter-clockwise"></i>إعادة تعيين</button></div></div><div style="text-align: center; padding-top: 1.25rem; border-top: 1px solid var(--color-border); margin-top: .5rem;"><a href="https://t.me/mutlaq1" target="_blank" rel="noopener noreferrer" class="designer-credit"><i class="ph ph-telegram-logo"></i> MUTLAQ1</a></div></div>`;

          const newScrollContainer = modal.querySelector('.modal-content');
          if (newScrollContainer) {
            newScrollContainer.scrollTop = scrollTop;
          }

          this._attachModalEventListeners();
          this._applySettings();
        },
        _attachModalEventListeners() {
          const modal = this.dom.settingsModal;
          modal.querySelector('.modal-close-btn').addEventListener('click', () => this._toggleSettingsModal(false));
          modal.querySelector('#course-colors-list').addEventListener('input', e => this._handleCourseColorChange(e));
          modal.querySelector('#course-visibility-list').addEventListener('click', e => this._handleVisibilityToggle(e));
          modal.querySelector('#export-btn').addEventListener('click', () => this._handleExport());
          modal.querySelector('#share-btn').addEventListener('click', () => this._handleShare());
          modal.querySelector('#import-btn').addEventListener('click', () => modal.querySelector('#import-file-input').click());
          modal.querySelector('#import-file-input').addEventListener('change', e => this._handleImport(e));
          modal.querySelector('#auto-generate-btn').addEventListener('click', () => this._handleAutoGenerate());
          modal.querySelector('#export-ics-btn').addEventListener('click', () => this._handleExportICS());
          modal.querySelector('#time-analysis-btn').addEventListener('click', () => this._handleTimeAnalysis());
          modal.querySelector('#export-exams-btn')?.addEventListener('click', () => this._handleExportExamsICS());
          modal.querySelector('#compare-schedules-btn')?.addEventListener('click', () => { this._toggleSettingsModal(false); this._handleCompareSchedules(); });
          modal.querySelector('#friend-compare-btn')?.addEventListener('click', () => { this._toggleSettingsModal(false); this._handleFriendCompare(); });
          modal.querySelector('#settings-shortcuts-btn')?.addEventListener('click', () => { this._toggleSettingsModal(false); this._showShortcutsModal(); });
          modal.querySelector('#guide-videos-settings-btn')?.addEventListener('click', () => { this._toggleSettingsModal(false); this._showGuideModal(); });
          modal.querySelector('#start-tour-btn')?.addEventListener('click', () => this._startTour());
          modal.querySelector('#settings-features-btn')?.addEventListener('click', () => this._showFeaturesModal());
          modal.querySelector('#import-paste-btn').addEventListener('click', () => this._handleImportPaste());
          modal.querySelector('#archive-now-btn')?.addEventListener('click', () => { if (this._archiveCurrentTerm({})) this._buildSettingsModal(); });
          modal.querySelector('#archives-btn')?.addEventListener('click', () => { this._toggleSettingsModal(false); this._showArchivesModal(); });
          modal.querySelector('#data-diff-btn')?.addEventListener('click', () => this._openLastDiff());
          modal.querySelector('#reset-app-btn').addEventListener('click', () => this._handleReset());
          modal.querySelector('#modal-visibility-swap-btn').addEventListener('click', () => {
            this.state.isVisibilityNamesMode = !this.state.isVisibilityNamesMode;
            this._updateVisibilityLabels();
          });
        },
        _updateVisibilityLabels() {
          document.querySelectorAll('.course-visibility-btn').forEach(btn => {
            const code = btn.dataset.courseCode;
            const group = this.state.groupedCourses[code];
            if (!group) return;
            const label = this.state.isVisibilityNamesMode ? group.name : group.code;
            let dot = btn.querySelector('.color-dot');
            if (!dot) { dot = document.createElement('span'); dot.className = 'color-dot'; }
            btn.innerHTML = '';
            btn.appendChild(dot);
            btn.appendChild(document.createTextNode(label));
          });
        },
        _handleCourseColorChange(e) {
          if (!e.target.matches('.color-picker-input') || !e.target.dataset.courseCode) return;
          const code = e.target.dataset.courseCode; const color = e.target.value;
          this.state.customColors[code] = color;
          if (this.state.groupedCourses[code]) { this.state.groupedCourses[code].color = color; }
          const label = e.target.closest('.color-picker-label'); if (label) label.style.backgroundColor = color;
          const item = e.target.closest('.settings-item'); const nameSpan = item ? item.querySelector('.settings-item-label span') : null; if (nameSpan) nameSpan.style.color = color;
          document.querySelectorAll('.course-visibility-btn').forEach(b => {
            if (b.dataset.courseCode === code) { b.style.setProperty('--item-color', color); b.style.setProperty('--item-color-rgb', this._hexToRgb(color)); }
          });
          this._saveCustomColors(); this._renderCoursesList(); this.updateFullUI();
        },
        _handleVisibilityToggle(e) {
          const btn = e.target.closest('.course-visibility-btn'); if (!btn) return;
          const code = btn.dataset.courseCode;
          btn.blur();
          const nowHidden = !this.state.hiddenCourseCodes.has(code);
          if (nowHidden) { this.state.hiddenCourseCodes.add(code); } else { this.state.hiddenCourseCodes.delete(code); }
          document.querySelectorAll('.course-visibility-btn').forEach(b => {
            if (b.dataset.courseCode === code) { b.classList.toggle('hidden', nowHidden); b.classList.toggle('visible', !nowHidden); }
          });
          this._saveSettings(); this._renderCoursesList(); this.updateCalendarAndConflicts();
        },
        _checkUrlForSharedSchedule() {
          const urlParams = new URLSearchParams(window.location.search);
          const crnsParam = urlParams.get('crns');
          if (crnsParam) {
            if (this.state.allCoursesData.length === 0) {
              this._showToast('info', 'جدول مشارك: حمّل بيانات المقررات أولاً لعرضه.');
            } else {
              const crns = crnsParam.split(',');
              this._addSchedule('جدول مشارك', false);
              const newSchedule = this.state.schedules[this.state.schedules.length - 1];
              this.state.allCoursesData.forEach(c => {
                if (crns.includes(c.section)) newSchedule.sections.add(c.uniqueId);
              });
              this.updateFullUI();
              this._showToast('success', 'تم تحميل الجدول المشارك بنجاح!');
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('crns');
              window.history.replaceState({}, document.title, newUrl);
            }
          }
        },
        _handleShare() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) return this._showToast('warning', 'الجدول فارغ — اختر مقرراتك أولاً للمشاركة.');
          if (this.state.isDemoMode) return this._showToast('info', 'لا يمكنك المشاركة في وضع المعاينة.');
          const selectedSections = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const crns = selectedSections.map(c => c.section).join(',');
          const url = new URL(window.location.href);
          url.searchParams.set('crns', crns);
          const shareUrl = url.toString();
          const canNativeShare = typeof navigator.share === 'function';
          const copyLink = () => navigator.clipboard.writeText(shareUrl).then(() => this._showToast('success', 'تم نسخ رابط المشاركة!')).catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.'));
          Swal.fire({
            title: 'مشاركة الجدول',
            html: `<p style="margin:0 0 1rem;color:var(--color-text-muted);font-size:0.9rem;">امسح الرمز بكاميرا الجوال أو انسخ الرابط لفتح الجدول مباشرة.</p><div class="share-qr-frame" id="share-qr-frame"><div id="share-qr-target"></div></div><input class="share-url-input" readonly value="${this._escapeHTML(shareUrl)}" onclick="this.select()">`,
            showCancelButton: true,
            showDenyButton: canNativeShare,
            confirmButtonText: '<i class="ph ph-copy"></i> نسخ الرابط',
            denyButtonText: '<i class="ph ph-share-network"></i> مشاركة',
            cancelButtonText: 'إغلاق',
            didOpen: () => {
              this._loadQRCodeLib().then(() => {
                const target = document.getElementById('share-qr-target');
                if (target && window.QRCode) new QRCode(target, { text: shareUrl, width: 170, height: 170, colorDark: '#0f172a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
              }).catch(() => {
                const frame = document.getElementById('share-qr-frame');
                if (frame) frame.style.display = 'none';
              });
            }
          }).then(result => {
            if (result.isConfirmed) { copyLink(); }
            else if (result.isDenied && canNativeShare) {
              navigator.share({ title: 'QU Schedule', text: 'جدولي الدراسي في جامعة القصيم', url: shareUrl }).catch(() => { });
            }
          });
        },
        _handleExport() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) return this._showToast('warning', 'الجدول فارغ — اختر بعض الشعب أولاً.');
          if (this.state.isDemoMode) return this._showToast('info', 'لا يمكنك التصدير في وضع المعاينة.');
          const dataStr = JSON.stringify({ version: 20, schedule: Array.from(activeSchedule.sections), linked: Array.from(activeSchedule.linkedSections.entries()).map(([k, v]) => [k, Array.from(v)]) });
          const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `qu_schedule_${activeSchedule.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        },
        _handleImport(e) {
          const file = e.target.files[0]; if (!file) return;
          if (this.state.allCoursesData.length === 0) { this._showToast('error', 'حمّل بيانات المقررات أولاً قبل استيراد جدول.'); e.target.value = ''; return; }
          if (this.state.isDemoMode) this.state.isDemoMode = false;
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              if (data && data.schedule && Array.isArray(data.schedule)) {
                const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); const newName = `مستورد ${time}`;
                this._addSchedule(newName, false); const newSchedule = this.state.schedules[this.state.schedules.length - 1];
                data.schedule.forEach(id => { if (this.state.allCoursesData.some(c => c.uniqueId === id)) { newSchedule.sections.add(id); } });
                if (data.linked && Array.isArray(data.linked)) { newSchedule.linkedSections = new Map(data.linked.map(([k, v]) => [k, new Set(v)])); }
                this.updateFullUI(); this._toggleSettingsModal(false); this._showToast('success', 'تم استيراد الجدول بنجاح!');
              } else throw new Error('Invalid file format');
            } catch (error) { this._showToast('error', 'ملف غير صالح أو تالف.'); }
          };
          reader.readAsText(file); e.target.value = '';
        },
        _handleReset() {
          Swal.fire({ title: 'هل أنت متأكد؟', text: "سيؤدي هذا إلى مسح جميع بيانات التطبيق، بما في ذلك جميع الجداول المحفوظة والفصول المؤرشفة والإعدادات.", icon: 'warning', showCancelButton: true, customClass: { confirmButton: 'swal-danger' }, confirmButtonText: '<i class="ph ph-arrow-counter-clockwise"></i> نعم، إعادة تعيين!', cancelButtonText: 'إلغاء' }).then(r => { if (r.isConfirmed) { localStorage.clear(); location.reload(); } });
        },
        _toggleSettingsModal(show) { this.dom.modalOverlay.classList.toggle('open', show); this.dom.settingsModal.classList.toggle('open', show); },
        _applyAccentColorStyles(color) {
          const isLight = this.state.userSettings.theme === 'light';
          const pColor = isLight ? this._adjustColorBrightness(color, -8) : color;
          const pDark = this._adjustColorBrightness(pColor, -10); const pRgb = this._hexToRgb(pColor); const pHue = this._hexToHue(color);
          document.documentElement.style.setProperty('--color-primary', pColor); document.documentElement.style.setProperty('--color-primary-dark', pDark); document.documentElement.style.setProperty('--rgb-primary', pRgb); document.documentElement.style.setProperty('--primary-hue', String(pHue)); document.documentElement.style.setProperty('--secondary-hue', String((pHue + 40) % 360));
        },
        _applySettings() {
          const isLightTheme = this.state.userSettings.theme === 'light';
          document.body.classList.remove('high-performance', 'time-axis-right', 'sidebar-right', 'mobile-view', 'desktop-view');
          document.body.classList.toggle('light', isLightTheme);
          document.documentElement.classList.toggle('light-root', isLightTheme);
          document.documentElement.style.colorScheme = isLightTheme ? 'light' : 'dark';
          document.documentElement.style.backgroundColor = isLightTheme ? '#f7f6fc' : '#0b0a12';
          const themeMeta = document.querySelector('meta[name="theme-color"]');
          if (themeMeta) themeMeta.setAttribute('content', this.state.userSettings.theme === 'light' ? '#f7f6fc' : '#0b0a12');
          if (this.state.userSettings.highPerformance) { document.body.classList.add('high-performance'); }
          if (this.state.userSettings.timeAxisPosition === 'right') { document.body.classList.add('time-axis-right'); }
          if (this.state.userSettings.sidebarPosition === 'right') { document.body.classList.add('sidebar-right'); }
          if (isMobile) { document.body.classList.add('mobile-view'); } else { document.body.classList.add('desktop-view'); }
          this._applyLayout();
          this._applyAccentColorStyles(this.state.userSettings.accentColor);
          const modeToggle = this.dom.settingsModal.querySelector('.mode-toggle');
          if (modeToggle) {
            modeToggle.innerHTML = `<button class="mode-btn ${this.state.userSettings.theme === 'dark' ? 'active' : ''}" data-theme="dark">ظلام</button><button class="mode-btn ${this.state.userSettings.theme === 'light' ? 'active' : ''}" data-theme="light">نهار</button>`;
            modeToggle.onclick = e => { if (e.target.matches('.mode-btn')) { this.state.userSettings.theme = e.target.dataset.theme; this._saveSettings(); this._applySettings(); } };
          }
          this._populateAccentColorPicker();
          const timeAxisToggle = this.dom.settingsModal.querySelector('#time-axis-toggle');
          if (timeAxisToggle) {
            timeAxisToggle.innerHTML = `<button class="mode-btn ${this.state.userSettings.timeAxisPosition === 'left' ? 'active' : ''}" data-axis="left">يسار</button><button class="mode-btn ${this.state.userSettings.timeAxisPosition === 'right' ? 'active' : ''}" data-axis="right">يمين</button>`;
            timeAxisToggle.onclick = e => { if (e.target.matches('.mode-btn')) { this.state.userSettings.timeAxisPosition = e.target.dataset.axis; this._saveSettings(); this._initializeCalendar(); this.updateCalendarAndConflicts(); this._applySettings(); } };
          }
          const sidebarPosToggle = this.dom.settingsModal.querySelector('#sidebar-position-toggle');
          if (sidebarPosToggle) {
            const pos = this.state.userSettings.sidebarPosition === 'right' ? 'right' : 'left';
            sidebarPosToggle.innerHTML = `<button class="mode-btn ${pos === 'left' ? 'active' : ''}" data-side="left">يسار</button><button class="mode-btn ${pos === 'right' ? 'active' : ''}" data-side="right">يمين</button>`;
            sidebarPosToggle.onclick = e => { if (e.target.matches('.mode-btn')) { this.state.userSettings.sidebarPosition = e.target.dataset.side; this._saveSettings(); this._applySettings(); requestAnimationFrame(() => { try { this.state.calendar?.updateSize(); } catch (err) { } }); } };
          }
          const layoutEditorBtn = this.dom.settingsModal.querySelector('#layout-editor-btn');
          if (layoutEditorBtn) { layoutEditorBtn.onclick = () => { this._toggleSettingsModal(false); this._showLayoutEditor(); }; }
          const weekendToggle = this.dom.settingsModal.querySelector('#show-weekend-toggle');
          if (weekendToggle) { weekendToggle.checked = this.state.userSettings.showWeekends; weekendToggle.onchange = e => { this.state.userSettings.showWeekends = e.target.checked; this._saveSettings(); this._initializeCalendar(); this._renderFilterUI(); this.updateCalendarAndConflicts(); }; }
          const closedToggle = this.dom.settingsModal.querySelector('#hide-closed-toggle');
          if (closedToggle) { closedToggle.checked = this.state.userSettings.hideClosedCourses; closedToggle.onchange = e => { this.state.userSettings.hideClosedCourses = e.target.checked; this._saveSettings(); this._renderCoursesList(); this.updateCalendarAndConflicts(); }; }
          const quickAddToggle = this.dom.settingsModal.querySelector('#quick-add-toggle');
          if (quickAddToggle) { quickAddToggle.checked = !!this.state.userSettings.quickAddMode; quickAddToggle.onchange = e => { this.state.userSettings.quickAddMode = e.target.checked; this._saveSettings(); this._showToast(e.target.checked ? 'success' : 'info', e.target.checked ? 'تم تفعيل وضع الإضافة السريعة' : 'تم إيقاف وضع الإضافة السريعة'); }; }
          const perfToggle = this.dom.settingsModal.querySelector('#high-perf-toggle');
          if (perfToggle) { perfToggle.checked = this.state.userSettings.highPerformance; perfToggle.onchange = e => { this.state.userSettings.highPerformance = e.target.checked; this._saveSettings(); this._applySettings(); }; }
          if (typeof window.QU_syncStarfield === 'function') window.QU_syncStarfield();

          if (this.dom.examScheduleToggleBtn) {
            const textSpan = this.dom.examScheduleToggleBtn.querySelector('span');
            if (textSpan) textSpan.textContent = this.state.userSettings.examScheduleMode === '3' ? '3 فترات' : 'فترتين';
          }
          if (this.dom.mobileMyExamsPeriodToggle) {
            const mobileTextSpan = this.dom.mobileMyExamsPeriodToggle.querySelector('span');
            if (mobileTextSpan) mobileTextSpan.textContent = this.state.userSettings.examScheduleMode === '3' ? '3 فترات' : 'فترتين';
          }
        },
        _populateAccentColorPicker() {
          const picker = this.dom.settingsModal.querySelector('#accent-color-picker'); if (!picker) return;
          picker.innerHTML = '';
          const overrides = this.state.userSettings.customPalette || {};
          const editing = !!this.state.paletteEditMode;
          const entries = Object.entries(this.constants.PRESET_COLORS);
          entries.forEach(([key, base]) => {
            const color = overrides[key] || base;
            const dot = document.createElement('div');
            dot.className = `theme-dot ${this.state.userSettings.accentColor === color ? 'active' : ''} ${editing ? 'editing' : ''}`;
            dot.style.backgroundColor = color;
            if (!editing) {
              dot.title = 'اختيار هذا اللون';
              dot.onclick = () => { this.state.userSettings.accentColor = color; this._saveSettings(); this._applySettings(); };
            } else {
              const overlay = document.createElement('label');
              overlay.className = 'dot-edit-overlay';
              overlay.title = 'تبديل هذا اللون بلونك الخاص';
              overlay.innerHTML = `<i class="ph ph-pencil-simple"></i><input type="color" class="color-picker-input" value="${color}">`;
              const slotInput = overlay.querySelector('input');
              slotInput.addEventListener('input', e => { dot.style.backgroundColor = e.target.value; if (this.state.userSettings.accentColor === color) this._applyAccentColorStyles(e.target.value); });
              slotInput.addEventListener('change', e => {
                const picked = e.target.value;
                if (picked.toLowerCase() === base.toLowerCase()) { delete this.state.userSettings.customPalette[key]; } else { this.state.userSettings.customPalette[key] = picked; }
                if (this.state.userSettings.accentColor === color) this.state.userSettings.accentColor = picked;
                this._saveSettings(); this._applySettings();
              });
              dot.appendChild(overlay);
            }
            picker.appendChild(dot);
          });
          if (editing && Object.keys(overrides).length) {
            const reset = document.createElement('button');
            reset.className = 'palette-edit-btn reset';
            reset.title = 'إرجاع الألوان الأصلية';
            reset.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i>';
            reset.onclick = () => {
              const current = this.state.userSettings.accentColor;
              const hit = entries.find(([key, base]) => (overrides[key] || base) === current);
              this.state.userSettings.customPalette = {};
              if (hit) this.state.userSettings.accentColor = hit[1];
              this._saveSettings(); this._applySettings();
            };
            picker.appendChild(reset);
          }
          const toggle = document.createElement('button');
          toggle.className = `palette-edit-btn ${editing ? 'active' : ''}`;
          toggle.title = editing ? 'إنهاء التعديل' : 'تبديل الألوان الثابتة';
          toggle.innerHTML = `<i class="ph ${editing ? 'ph-check' : 'ph-pencil-simple'}"></i>`;
          toggle.onclick = () => { this.state.paletteEditMode = !editing; this._populateAccentColorPicker(); };
          picker.appendChild(toggle);
        },

        _renderSkeletons() {
          const listSk = `<div class="sk-course-list">${Array.from({ length: 6 }).map(() => `<div class="sk-course"><div class="sk sk-line title"></div><div class="sk sk-line sub"></div><div class="sk-pills"><div class="sk sk-pill"></div><div class="sk sk-pill"></div><div class="sk sk-pill"></div></div></div>`).join('')}</div>`;
          const desktopList = this.dom.desktopCoursesList;
          if (desktopList) { desktopList.dataset.skeleton = '1'; desktopList.innerHTML = listSk; }
          const mobileList = this.dom.mobileCoursesList;
          if (mobileList) { mobileList.dataset.skeleton = '1'; mobileList.innerHTML = listSk; }
        },
        _clearSkeletons() {
          [this.dom.desktopCoursesList, this.dom.mobileCoursesList].forEach(el => { if (el && el.dataset.skeleton) { el.innerHTML = ''; delete el.dataset.skeleton; } });
        },
      });

      const QU_ScheduleApp = {
        state: {
          calendar: null,
          allCoursesData: [],
          groupedCourses: {},
          linkedCourseGroups: {},
          schedules: [],
          activeScheduleIndex: 0,
          hiddenCourseCodes: new Set(),
          customColors: {},
          isDemoMode: false,
          searchTerm: '',
          showExamDates: false,
          isVisibilityNamesMode: false,
          areAllExpanded: false,
          history: [],
          filters: { days: [], period: 'any', noConflict: false, favOnly: false },
          userSettings: { theme: 'dark', accentColor: '#8b5cf6', customPalette: {}, showWeekends: false, minTime: '08:00:00', maxTime: '22:00:00', hiddenCourseCodes: [], hideClosedCourses: true, examScheduleMode: '3', highPerformance: false, timeAxisPosition: 'left', sidebarPosition: 'left', customLayout: null, quickAddMode: false, courseNotes: {}, favInstructors: [] }
        },
        constants: {
          PRESET_COLORS: { purple: '#8b5cf6', blue: '#3b82f6', pink: '#ec4899', green: '#22c55e', orange: '#f97316', red: '#ef4444' },
          COLOR_PALETTE: ['#7c5cf0', '#3b74d9', '#d94f70', '#2f9e6e', '#d97706', '#0d9488', '#a44fc9', '#5872a3', '#e0576b', '#4f8fdb', '#c2703d', '#3fa796', '#9b6bd6', '#5a9c3f'],
          DAY_MAPPING: { 'الأحد': 0, 'الاثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6 },
          LAYOUT_BLOCKS: { courses: { label: 'المقررات', icon: 'ph-stack' }, calendar: { label: 'الجدول', icon: 'ph-calendar-blank' }, myschedule: { label: 'جدولي', icon: 'ph-list-checks' } },
          LAYOUT_COLUMNS: 6,
          LAYOUT_MIN_WIDTH: 2,
          DEFAULT_LAYOUT: [{ id: 'calendar', w: 4, h: 1 }, { id: 'courses', w: 2, h: 1 }, { id: 'myschedule', w: 6, h: 1 }],
          STORAGE_KEYS: { SETTINGS: 'quScheduleSettings_v20', COURSES: 'quScheduleCourses_v20', SCHEDULES: 'quScheduleSchedules_v20', COLORS: 'quScheduleColors_v20' },
          EXAM_DATA: {
            '3': {},
            '2': {}
          }
        },
        dom: {},

        init() {
          this._prefetchHtml2Canvas();
          this._populateDOMElements();
          this._setupEventListeners();
          this._loadSettings();
          this._loadCustomColors();
          this._renderSkeletons();
          this._initializeCalendar();
          this._loadDataFromStorage();
          this._listenForDataFromOpener();
          this._updateBookmarkletCode();
          this._checkUrlForSharedSchedule();
          this._initPWA();
          this._renderFilterUI();
          this._initListKeyboardNav();
          this._maybeStartTour();
        },

        _sanitizeCourses(input) {
          if (!Array.isArray(input)) throw new Error('Courses payload is not an array.');
          if (input.length > 20000) throw new Error('Courses payload is too large.');
          const clean = (v) => String(v ?? '').replace(/[<>"'`]/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ');
          const str = (v, max = 400) => clean(v).slice(0, max);
          const timeStr = (v) => String(v ?? '').split(/<br\s*\/?>/i).map(clean).join('<br>').slice(0, 600);
          const out = input
            .filter(c => c && typeof c === 'object' && !Array.isArray(c))
            .map(c => ({
              code: str(c.code, 40),
              name: str(c.name, 200),
              section: str(c.section, 40),
              time: timeStr(c.time),
              location: str(c.location, 200),
              instructor: str(c.instructor, 200) || 'غير محدد',
              examPeriodId: c.examPeriodId == null ? null : str(c.examPeriodId, 20),
              hours: str(c.hours, 10) || '0',
              type: str(c.type, 60) || 'نظري',
              status: str(c.status, 60) || 'غير معروف',
              campus: str(c.campus, 120) || 'غير معروف'
            }))
            .filter(c => c.code && c.name && c.section);
          if (out.length === 0) throw new Error('No usable courses in payload.');
          return out;
        },
        _loadDataFromStorage() {
          const storedCourses = localStorage.getItem(this.constants.STORAGE_KEYS.COURSES);
          if (storedCourses) {
            try {
              const courses = this._sanitizeCourses(JSON.parse(storedCourses));
              this.state.isDemoMode = false;
              this._processAndDisplayData(courses);
              this._loadSchedules();
              this.updateFullUI();
            } catch (e) {
              localStorage.removeItem(this.constants.STORAGE_KEYS.COURSES);
              this.dom.installOverlay.style.display = 'flex';
              this.dom.installOverlay.classList.add('visible');
            }
          } else {
            this.dom.installOverlay.style.display = 'flex';
            this.dom.installOverlay.classList.add('visible');
          }
        },
        _isTrustedOpenerOrigin(origin) {
          try {
            const host = new URL(origin).hostname.toLowerCase();
            return host === 'qu.edu.sa' || host.endsWith('.qu.edu.sa');
          } catch (e) { return false; }
        },
        _listenForDataFromOpener() {
          window.addEventListener('message', (event) => {
            if (!event.data || event.data.type !== 'universityCoursesData') return;
            if (!window.opener || event.source !== window.opener) return;
            if (!this._isTrustedOpenerOrigin(event.origin)) return;
            let courses;
            try {
              courses = this._sanitizeCourses(event.data.data);
            } catch (err) {
              this._showToast('error', 'البيانات المستلمة غير صالحة.');
              return;
            }
            this.state.isDemoMode = false;
            localStorage.setItem(this.constants.STORAGE_KEYS.COURSES, JSON.stringify(courses));
            this._markDataUpdated();
            this.state.schedules = [];
            this._addSchedule(null, true);
            this.state.activeScheduleIndex = 0;
            this._saveSchedules();
            this._processAndDisplayData(courses);
            this.updateFullUI();
            this._checkUrlForSharedSchedule();
          }, false);
          if (window.opener) {
            let target = '*';
            try { if (document.referrer) target = new URL(document.referrer).origin; } catch (e) { }
            window.opener.postMessage('request_schedule_data', target);
          }
        },
        _processAndDisplayData(courses) {
          this.dom.installOverlay.style.display = 'none';
          this.dom.installOverlay.classList.remove('visible');
          this.state.allCoursesData = courses.map((section, index) => ({
            ...section, uniqueId: `${section.code}-${section.section}-${index}`, timeSlots: this._parseTimeEntries(section.time)
          }));
          const coursesByName = {};
          this.state.groupedCourses = this.state.allCoursesData.reduce((acc, course) => {
            if (!acc[course.code]) { acc[course.code] = { name: course.name, code: course.code, sections: [] }; if (!coursesByName[course.name]) coursesByName[course.name] = []; coursesByName[course.name].push(course.code); }
            acc[course.code].sections.push(course);
            return acc;
          }, {});
          this.state.linkedCourseGroups = {};
          for (const name in coursesByName) { if (coursesByName[name].length > 1) { this.state.linkedCourseGroups[name] = [...new Set(coursesByName[name])]; } }
          const usedColors = new Set(Object.values(this.state.customColors));
          let colorIndex = 0;
          Object.values(this.state.groupedCourses).forEach(group => {
            if (this.state.customColors[group.code]) { group.color = this.state.customColors[group.code]; return; }
            const color = this._pickCourseColor(usedColors, colorIndex++);
            usedColors.add(color);
            group.color = color;
          });
          this._clearSkeletons();
          const noDataEl = document.getElementById('no-data-message');
          if (noDataEl) noDataEl.style.display = 'none';
          this._renderCoursesList();
          this._renderQuickVisibilityList();
          this._buildSettingsModal();
          this._toggleDemoBadge();
        },
        _loadSchedules() {
          const stored = localStorage.getItem(this.constants.STORAGE_KEYS.SCHEDULES);
          if (stored && !this.state.isDemoMode) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed && Array.isArray(parsed.schedules) && parsed.schedules.length > 0) {
                this.state.schedules = parsed.schedules.map(s => ({ name: s.name || 'جدول', sections: new Set(s.sections), linkedSections: new Map((s.linkedSections || []).map(([key, value]) => [key, new Set(value)])) }));
                this.state.activeScheduleIndex = Math.max(0, Math.min(parseInt(parsed.activeScheduleIndex, 10) || 0, this.state.schedules.length - 1));
              } else { throw new Error("No valid schedules found"); }
            } catch (e) {
              localStorage.removeItem(this.constants.STORAGE_KEYS.SCHEDULES);
              this.state.schedules = [];
              this._addSchedule(null, true);
            }
          }
          if (this.state.schedules.length === 0) { this._addSchedule(null, true); }
        },
        _saveSchedules() {
          if (this.state.isDemoMode) return;
          const serializableSchedules = { activeScheduleIndex: this.state.activeScheduleIndex, schedules: this.state.schedules.map(s => ({ name: s.name, sections: Array.from(s.sections), linkedSections: Array.from(s.linkedSections.entries()).map(([key, value]) => [key, Array.from(value)]) })) };
          localStorage.setItem(this.constants.STORAGE_KEYS.SCHEDULES, JSON.stringify(serializableSchedules));
        },
        _loadCustomColors() {
          const stored = localStorage.getItem(this.constants.STORAGE_KEYS.COLORS);
          if (stored && !this.state.isDemoMode) { try { this.state.customColors = JSON.parse(stored); } catch (e) { localStorage.removeItem(this.constants.STORAGE_KEYS.COLORS); } }
        },
        _saveCustomColors() { if (this.state.isDemoMode) return; localStorage.setItem(this.constants.STORAGE_KEYS.COLORS, JSON.stringify(this.state.customColors)); },
      };

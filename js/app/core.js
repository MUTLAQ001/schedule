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
          userSettings: { theme: 'dark', accentColor: '#8b5cf6', customPalette: {}, showWeekends: false, minTime: '08:00:00', maxTime: '22:00:00', hiddenCourseCodes: [], hideClosedCourses: true, examScheduleMode: '3', examModeOverrides: {}, highPerformance: false, timeAxisPosition: 'left', quickAddMode: false, courseNotes: {}, favInstructors: [] }
        },
        constants: {
          PRESET_COLORS: { purple: '#8b5cf6', blue: '#3b82f6', pink: '#ec4899', green: '#22c55e', orange: '#f97316', red: '#ef4444' },
          COLOR_PALETTE: ['#7c5cf0', '#3b74d9', '#d94f70', '#2f9e6e', '#d97706', '#0d9488', '#a44fc9', '#5872a3', '#e0576b', '#4f8fdb', '#c2703d', '#3fa796', '#9b6bd6', '#5a9c3f'],
          DAY_MAPPING: { 'الأحد': 0, 'الاثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6 },
          STORAGE_KEYS: { SETTINGS: 'quScheduleSettings_v20', COURSES: 'quScheduleCourses_v20', SCHEDULES: 'quScheduleSchedules_v20', COLORS: 'quScheduleColors_v20' },
          WATCH_BOT_URL: 'https://t.me/QU_ScheduleRbot',
          EXAM_DATA: {
            '3': {
              1: '26/06/1448 (08:00 - 10:00)', 2: '26/06/1448 (10:30 - 12:30)', 3: '26/06/1448 (13:00 - 15:00)',
              4: '27/06/1448 (08:00 - 10:00)', 5: '27/06/1448 (10:30 - 12:30)', 6: '27/06/1448 (13:00 - 15:00)',
              7: '28/06/1448 (08:00 - 10:00)', 8: '28/06/1448 (10:30 - 12:30)', 9: '28/06/1448 (13:00 - 15:00)',
              10: '29/06/1448 (08:00 - 10:00)', 11: '29/06/1448 (10:30 - 12:30)', 12: '29/06/1448 (13:00 - 15:00)',
              13: '01/07/1448 (08:00 - 10:00)', 14: '01/07/1448 (10:30 - 12:30)', 15: '01/07/1448 (13:00 - 15:00)',
              16: '04/07/1448 (08:00 - 10:00)', 17: '04/07/1448 (10:30 - 12:30)', 18: '04/07/1448 (13:00 - 15:00)',
              19: '05/07/1448 (08:00 - 10:00)', 20: '05/07/1448 (10:30 - 12:30)', 21: '05/07/1448 (13:00 - 15:00)',
              22: '06/07/1448 (08:00 - 10:00)', 23: '06/07/1448 (10:30 - 12:30)', 24: '06/07/1448 (13:00 - 15:00)',
              25: '07/07/1448 (08:00 - 10:00)', 26: '07/07/1448 (10:30 - 12:30)', 27: '07/07/1448 (13:00 - 15:00)',
              28: '08/07/1448 (08:00 - 10:00)', 29: '08/07/1448 (10:30 - 12:30)', 30: '08/07/1448 (13:00 - 15:00)',
              31: '11/07/1448 (08:00 - 10:00)', 32: '11/07/1448 (10:30 - 12:30)', 33: '11/07/1448 (13:00 - 15:00)',
              34: '12/07/1448 (08:00 - 10:00)', 35: '12/07/1448 (10:30 - 12:30)', 36: '12/07/1448 (13:00 - 15:00)',
              37: '13/07/1448 (08:00 - 10:00)', 38: '13/07/1448 (10:30 - 12:30)', 39: '13/07/1448 (13:00 - 15:00)',
              40: '14/07/1448 (08:00 - 10:00)', 41: '14/07/1448 (10:30 - 12:30)', 42: '14/07/1448 (13:00 - 15:00)',
              43: '15/07/1448 (08:00 - 10:00)', 44: '15/07/1448 (10:30 - 12:30)', 45: '15/07/1448 (13:00 - 15:00)',
              46: '18/07/1448 (08:00 - 10:00)', 47: '18/07/1448 (10:30 - 12:30)', 48: '18/07/1448 (13:00 - 15:00)',
              49: '19/07/1448 (08:00 - 10:00)', 50: '19/07/1448 (10:30 - 12:30)', 51: '19/07/1448 (13:00 - 15:00)',
              52: '20/07/1448 (08:00 - 10:00)', 53: '20/07/1448 (10:30 - 12:30)', 54: '20/07/1448 (13:00 - 15:00)',
              55: '21/07/1448 (08:00 - 10:00)', 56: '21/07/1448 (10:30 - 12:30)', 57: '21/07/1448 (13:00 - 15:00)',
              58: '22/07/1448 (08:00 - 10:00)', 59: '22/07/1448 (10:30 - 12:30)', 60: '22/07/1448 (13:00 - 15:00)',
              61: '25/07/1448 (08:00 - 10:00)', 62: '25/07/1448 (10:30 - 12:30)', 63: '25/07/1448 (13:00 - 15:00)',
              64: '26/07/1448 (08:00 - 10:00)', 65: '26/07/1448 (10:30 - 12:30)', 66: '26/07/1448 (13:00 - 15:00)',
              67: '27/07/1448 (08:00 - 10:00)', 68: '27/07/1448 (10:30 - 12:30)', 69: '27/07/1448 (13:00 - 15:00)',
              70: '28/07/1448 (08:00 - 10:00)', 71: '28/07/1448 (10:30 - 12:30)', 72: '28/07/1448 (13:00 - 15:00)',
              73: '29/07/1448 (08:00 - 10:00)', 74: '29/07/1448 (10:30 - 12:30)', 75: '29/07/1448 (13:00 - 15:00)'
            },
            '2': {
              1: '26/06/1448 (09:00 - 12:00)', 2: '26/06/1448 (13:00 - 16:00)',
              3: '27/06/1448 (09:00 - 12:00)', 4: '27/06/1448 (13:00 - 16:00)',
              5: '28/06/1448 (09:00 - 12:00)', 6: '28/06/1448 (13:00 - 16:00)',
              7: '29/06/1448 (09:00 - 12:00)', 8: '29/06/1448 (13:00 - 16:00)',
              9: '01/07/1448 (09:00 - 12:00)', 10: '01/07/1448 (13:00 - 16:00)',
              11: '04/07/1448 (09:00 - 12:00)', 12: '04/07/1448 (13:00 - 16:00)',
              13: '05/07/1448 (09:00 - 12:00)', 14: '05/07/1448 (13:00 - 16:00)',
              15: '06/07/1448 (09:00 - 12:00)', 16: '06/07/1448 (13:00 - 16:00)',
              17: '07/07/1448 (09:00 - 12:00)', 18: '07/07/1448 (13:00 - 16:00)',
              19: '08/07/1448 (09:00 - 12:00)', 20: '08/07/1448 (13:00 - 16:00)',
              21: '11/07/1448 (09:00 - 12:00)', 22: '11/07/1448 (13:00 - 16:00)',
              23: '12/07/1448 (09:00 - 12:00)', 24: '12/07/1448 (13:00 - 16:00)',
              25: '13/07/1448 (09:00 - 12:00)', 26: '13/07/1448 (13:00 - 16:00)',
              27: '14/07/1448 (09:00 - 12:00)', 28: '14/07/1448 (13:00 - 16:00)',
              29: '15/07/1448 (09:00 - 12:00)', 30: '15/07/1448 (13:00 - 16:00)',
              31: '18/07/1448 (09:00 - 12:00)', 32: '18/07/1448 (13:00 - 16:00)',
              33: '19/07/1448 (09:00 - 12:00)', 34: '19/07/1448 (13:00 - 16:00)',
              35: '20/07/1448 (09:00 - 12:00)', 36: '20/07/1448 (13:00 - 16:00)',
              37: '21/07/1448 (09:00 - 12:00)', 38: '21/07/1448 (13:00 - 16:00)',
              39: '22/07/1448 (09:00 - 12:00)', 40: '22/07/1448 (13:00 - 16:00)',
              41: '25/07/1448 (09:00 - 12:00)', 42: '25/07/1448 (13:00 - 16:00)',
              43: '26/07/1448 (09:00 - 12:00)', 44: '26/07/1448 (13:00 - 16:00)',
              45: '27/07/1448 (09:00 - 12:00)', 46: '27/07/1448 (13:00 - 16:00)',
              47: '28/07/1448 (09:00 - 12:00)', 48: '28/07/1448 (13:00 - 16:00)',
              49: '29/07/1448 (09:00 - 12:00)', 50: '29/07/1448 (13:00 - 16:00)'
            }
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
              campus: str(c.campus, 120) || 'غير معروف',
              gender: str(c.gender, 40),
              college: str(c.college, 120),
              department: str(c.department, 120)
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
              this._exitDemoMode();
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
            this._exitDemoMode();
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

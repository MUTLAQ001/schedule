Object.assign(QU_ScheduleApp, {
        _hijriToGregorian(hy, hm, hd) {
          try {
            const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
            const read = (dt) => {
              const o = {};
              fmt.formatToParts(dt).forEach(p => { if (p.type === 'day' || p.type === 'month' || p.type === 'year') o[p.type] = parseInt(p.value, 10); });
              return o;
            };
            const days = Math.floor((hy - 1) * 354.367068) + Math.floor((hm - 1) * 29.530589) + hd;
            let d = new Date(Date.UTC(622, 6, 16) + (days - 1) * 86400000);
            for (let i = 0; i < 40; i++) {
              const r = read(d);
              if (!r.year) return null;
              if (r.year === hy && r.month === hm && r.day === hd) return d;
              let step = Math.round((r.year - hy) * 354.367 + (r.month - hm) * 29.53 + (r.day - hd));
              if (step === 0) step = ((r.year - hy) * 10000 + (r.month - hm) * 100 + (r.day - hd)) > 0 ? 1 : -1;
              d = new Date(d.getTime() - step * 86400000);
            }
            return null;
          } catch (e) { return null; }
        },
        _getExamDateInfo(periodId) {
          if (!periodId) return null;
          if (!this._examDateCache) this._examDateCache = {};
          const mode = this.state.userSettings.examScheduleMode;
          const key = `${mode}-${periodId}`;
          if (this._examDateCache[key] !== undefined) return this._examDateCache[key];
          const raw = this.constants.EXAM_DATA[mode][periodId];
          let info = null;
          if (raw) {
            const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*\((\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\)/);
            if (m) {
              const g = this._hijriToGregorian(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));
              if (g) {
                const start = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate(), parseInt(m[4], 10), parseInt(m[5], 10), 0, 0);
                const end = new Date(g.getUTCFullYear(), g.getUTCMonth(), g.getUTCDate(), parseInt(m[6], 10), parseInt(m[7], 10), 0, 0);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dayOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const daysLeft = Math.round((dayOnly - today) / 86400000);
                info = { raw, start, end, daysLeft, gregorianText: start.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' }) };
              }
            }
            if (!info) info = { raw, start: null, end: null, daysLeft: null, gregorianText: '' };
          }
          this._examDateCache[key] = info;
          return info;
        },
        _examSummaryText(periodId) {
          if (!periodId) return 'لا يوجد';
          const info = this._getExamDateInfo(periodId);
          if (!info) return `فترة ${periodId}`;
          const hijri = (info.raw || '').split('(')[0].trim();
          const time = (info.raw || '').match(/\(([^)]+)\)/);
          const parts = [`فترة ${periodId}`];
          if (hijri) parts.push(`${hijri} هـ`);
          if (info.gregorianText) parts.push(`${info.gregorianText} م`);
          if (time) parts.push(time[1].trim());
          return parts.join(' · ');
        },
        _countdownText(daysLeft) {
          if (daysLeft === null || daysLeft === undefined) return null;
          if (daysLeft < 0) return { text: 'انتهى', cls: 'past', icon: 'ph-check-circle' };
          if (daysLeft === 0) return { text: 'اليوم', cls: 'urgent', icon: 'ph-warning-circle' };
          if (daysLeft === 1) return { text: 'غداً', cls: 'urgent', icon: 'ph-hourglass-high' };
          if (daysLeft === 2) return { text: 'بعد يومين', cls: 'soon', icon: 'ph-hourglass-medium' };
          const label = daysLeft <= 10 ? `بعد ${daysLeft} أيام` : `بعد ${daysLeft} يوماً`;
          return { text: label, cls: daysLeft <= 7 ? 'soon' : '', icon: 'ph-hourglass-low' };
        },
        _renderFinalExams(selectedCourses) {
          const uniqueExams = [...new Map(selectedCourses.filter(e => e.examPeriodId).map(e => [e.examPeriodId, e])).values()];
          const toggleBtnDesktop = this.dom.desktopDateToggle;
          const toggleBtnMobile = this.dom.mobileMyExamsDateToggle;
          [toggleBtnDesktop, toggleBtnMobile].forEach(btn => { if (btn) btn.classList.toggle('active', this.state.showExamDates); });

          let footerHtml = '';
          if (this.state.showExamDates && uniqueExams.length > 0) {
            footerHtml = '<div style="margin-top:1rem; animation:fadeInUp 0.3s both;"><a href="https://t.me/Qassim_U/4414294" target="_blank" rel="noopener noreferrer" class="exam-source-link"><span class="esl-icon"><i class="ph ph-file-arrow-down"></i></span><span class="esl-text"><span class="esl-title">تواريخ الفترات كاملة</span><span class="esl-sub">ملف جدول الاختبارات · اجتهاد فيصل</span></span><i class="ph ph-arrow-up-left esl-arrow"></i></a></div>';
          }

          const staleNote = this._examDataIsEmpty() ? `<div class="exam-stale-note"><i class="ph-fill ph-warning-circle"></i><div>لم تُحدَّث تواريخ فترات الاختبارات لهذا الفصل بعد، لذلك تظهر أرقام الفترات بدون تواريخ أو عدّاد. كشف تعارض الاختبارات يعمل بشكل طبيعي.</div></div>` : '';
          const emptyHTML = `<div class="empty-state"><div class="es-icon"><i class="ph ph-file-text"></i></div><h4>لا توجد اختبارات</h4><p>لم تُحدَّد اختبارات نهائية للمقررات المختارة. أضف مقررات لجدولك لتظهر مواعيد اختباراتها هنا.</p><div class="es-actions"><button class="es-btn primary" data-empty-action="browse"><i class="ph ph-stack"></i> تصفح المقررات</button></div></div>`;

          const sorted = uniqueExams.slice().map(e => ({ exam: e, info: this._getExamDateInfo(e.examPeriodId) }))
            .sort((a, b) => {
              const da = a.info && a.info.start ? a.info.start.getTime() : Infinity;
              const db = b.info && b.info.start ? b.info.start.getTime() : Infinity;
              if (da !== db) return da - db;
              return parseInt(a.exam.examPeriodId, 10) - parseInt(b.exam.examPeriodId, 10);
            });

          const upcoming = sorted.filter(x => x.info && x.info.daysLeft !== null && x.info.daysLeft >= 0)[0];
          let bannerHTML = '';
          if (upcoming) {
            const cd = this._countdownText(upcoming.info.daysLeft);
            const num = upcoming.info.daysLeft === 0 ? 'اليوم' : upcoming.info.daysLeft;
            bannerHTML = `<div class="exam-next-banner"><i class="ph-fill ph-alarm"></i><div class="enb-text"><span class="enb-label">أقرب اختبار</span><span class="enb-title">${this._escapeHTML(upcoming.exam.name)}</span></div><div class="enb-days">${num}<small>${upcoming.info.daysLeft === 0 ? cd.text : 'يوم متبقٍ'}</small></div></div>`;
          }

          const buildItem = (x, mobileMode) => {
            const exam = x.exam, info = x.info;
            const cd = info ? this._countdownText(info.daysLeft) : null;
            const pill = cd ? `<span class="exam-countdown ${cd.cls}"><i class="ph ${cd.icon}"></i> ${cd.text}</span>` : '';
            let examText = `فترة الاختبار: ${exam.examPeriodId}`;
            if (this.state.showExamDates) {
              if (info && info.raw) examText = info.gregorianText ? `${info.raw} — ${info.gregorianText}` : info.raw;
              else examText = `فترة: ${exam.examPeriodId} (غير مدرجة)`;
            }
            if (mobileMode) {
              return `<div class="mobile-schedule-item mobile-exam-item"><div class="mobile-schedule-header"><div class="mobile-schedule-title"><h3>${this._escapeHTML(exam.name)} (${this._escapeHTML(exam.code)})</h3><span class="mobile-exam-date">${examText}</span></div>${pill}</div></div>`;
            }
            const styled = this.state.showExamDates && info && info.raw ? `<span style="color:var(--color-primary); font-weight:700">${examText}</span>` : `<span style="${info && info.raw ? '' : 'opacity:0.6'}">${examText}</span>`;
            return `<div class="course-item"><div class="course-item-header" style="cursor:default;"><div class="course-info"><h3>${this._escapeHTML(exam.name)} (${this._escapeHTML(exam.code)})</h3><p><strong>${styled}</strong></p></div>${pill}</div></div>`;
          };

          if (this.dom.desktopExamsList) {
            if (sorted.length === 0) {
              this.dom.desktopExamsList.innerHTML = emptyHTML;
            } else {
              this.dom.desktopExamsList.innerHTML = staleNote + bannerHTML + sorted.map(x => buildItem(x, false)).join('') + footerHtml;
            }
            this._bindEmptyStateActions(this.dom.desktopExamsList);
          }

          if (this.dom.mobileMyExamsList) {
            if (sorted.length === 0) {
              this.dom.mobileMyExamsList.innerHTML = emptyHTML;
            } else {
              this.dom.mobileMyExamsList.innerHTML = staleNote + bannerHTML + sorted.map(x => buildItem(x, true)).join('') + footerHtml;
            }
            this._bindEmptyStateActions(this.dom.mobileMyExamsList);
          }
        },
        _handleExportExamsICS() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          const sections = activeSchedule ? Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean) : [];
          const uniqueExams = [...new Map(sections.filter(e => e.examPeriodId).map(e => [e.examPeriodId, e])).values()];
          if (uniqueExams.length === 0) { this._showToast('error', 'لا توجد اختبارات في جدولك الحالي.'); return; }
          const withDates = uniqueExams.map(e => ({ exam: e, info: this._getExamDateInfo(e.examPeriodId) })).filter(x => x.info && x.info.start);
          if (withDates.length === 0) { this._showToast('error', 'تعذّر تحديد تواريخ الاختبارات.'); return; }
          const pad = n => String(n).padStart(2, '0');
          const now = new Date();
          const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
          const fmt = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
          const esc = t => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
          const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QU Schedule//Exams//AR//', 'CALSCALE:GREGORIAN'];
          withDates.forEach(x => {
            lines.push('BEGIN:VEVENT', `UID:exam-${x.exam.code}-${x.exam.examPeriodId}@qu-schedule`, `DTSTAMP:${dtstamp}`, `DTSTART:${fmt(x.info.start)}`, `DTEND:${fmt(x.info.end)}`, `SUMMARY:${esc('اختبار ' + x.exam.name + ' (' + x.exam.code + ')')}`);
            if (x.exam.location) lines.push(`LOCATION:${esc(x.exam.location)}`);
            lines.push(`DESCRIPTION:${esc('الفترة ' + x.exam.examPeriodId + ' — ' + x.info.raw)}`,
              'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير اختبار غداً', 'END:VALARM',
              'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير اختبار', 'END:VALARM', 'END:VEVENT');
          });
          lines.push('END:VCALENDAR');
          const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'qu_exams.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          const skipped = uniqueExams.length - withDates.length;
          this._showToast('success', skipped > 0 ? `تم تصدير ${withDates.length} اختبار (تعذّر ${skipped}).` : `تم تصدير ${withDates.length} اختبار.`);
        },
      });

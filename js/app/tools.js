Object.assign(QU_ScheduleApp, {
        _handleExportICS() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('error', 'الجدول فارغ!'); return; }
          const secs = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const pad = n => String(n).padStart(2, '0');
          const now = new Date();
          const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
          const nextDate = (dayIdx) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7)); return d; };
          const fmt = (d, hms) => { const p = hms.split(':'); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(parseInt(p[0], 10))}${pad(parseInt(p[1], 10))}00`; };
          const esc = t => String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
          const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//QU Schedule//AR//', 'CALSCALE:GREGORIAN'];
          secs.forEach(sec => (sec.timeSlots || []).forEach((slot, k) => {
            const d = nextDate(slot.day);
            lines.push('BEGIN:VEVENT', `UID:${sec.uniqueId}-${k}@qu-schedule`, `DTSTAMP:${dtstamp}`, `DTSTART:${fmt(d, slot.start)}`, `DTEND:${fmt(d, slot.end)}`, 'RRULE:FREQ=WEEKLY;COUNT=15', `SUMMARY:${esc(sec.name)} (${esc(sec.code)})`);
            if (sec.location) lines.push(`LOCATION:${esc(sec.location)}`);
            lines.push(`DESCRIPTION:${esc('شعبة ' + sec.section + (sec.instructor ? ' — ' + sec.instructor : ''))}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير محاضرة', 'END:VALARM', 'END:VEVENT');
          }));
          lines.push('END:VCALENDAR');
          const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'qu_schedule.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          this._showToast('success', 'تم تصدير ملف التقويم (.ics).');
        },
        _handleTimeAnalysis() {
          const activeSchedule = this.state.schedules[this.state.activeScheduleIndex];
          if (!activeSchedule || activeSchedule.sections.size === 0) { this._showToast('error', 'الجدول فارغ!'); return; }
          const secs = Array.from(activeSchedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean);
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const byDay = {}; let totalMin = 0;
          secs.forEach(s => (s.timeSlots || []).forEach(t => { (byDay[t.day] = byDay[t.day] || []).push(t); totalMin += this._toMin(t.end) - this._toMin(t.start); }));
          const activeDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);
          if (activeDays.length === 0) { this._showToast('info', 'لا توجد محاضرات ذات مواعيد محددة.'); return; }
          let totalGap = 0;
          const fmtM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
          const rows = activeDays.map(d => {
            const slots = byDay[d].slice().sort((a, b) => this._toMin(a.start) - this._toMin(b.start));
            const first = this._toMin(slots[0].start), last = this._toMin(slots[slots.length - 1].end);
            let gap = 0; for (let i = 1; i < slots.length; i++) { const g = this._toMin(slots[i].start) - this._toMin(slots[i - 1].end); if (g > 0) gap += g; }
            totalGap += gap;
            return `<div class="analysis-day-row"><span class="d-name">${dayNames[d]}</span><span class="d-info">${fmtM(first)} - ${fmtM(last)} · ${slots.length} محاضرة${gap > 0 ? ` · فراغ ${Math.round(gap / 6) / 10}س` : ''}</span></div>`;
          }).join('');
          const hrs = m => Math.round(m / 6) / 10;
          const offDays = 5 - activeDays.filter(d => d < 5).length;
          const html = `<div class="analysis-grid"><div class="analysis-card"><div class="a-value">${hrs(totalMin)}</div><div class="a-label">ساعات الحضور</div></div><div class="analysis-card"><div class="a-value">${activeDays.length}</div><div class="a-label">أيام دراسية</div></div><div class="analysis-card"><div class="a-value">${hrs(totalGap)}</div><div class="a-label">ساعات الفراغات</div></div><div class="analysis-card"><div class="a-value">${offDays < 0 ? 0 : offDays}</div><div class="a-label">إجازة (أحد-خميس)</div></div></div><div class="analysis-days">${rows}</div>`;
          Swal.fire({ title: 'تحليل الوقت', html, confirmButtonText: 'تم' });
        },
        _handleImportPaste() {
          Swal.fire({
            title: 'استيراد باللصق',
            html: `<p style="text-align:center;color:var(--color-text-muted);font-size:0.85rem;margin-bottom:0.5rem;">الصق محتوى ملف جدول مُصدَّر (JSON)، أو مصفوفة بيانات المقررات.</p><textarea id="paste-import-area" class="custom-textarea" placeholder="الصق هنا..." style="min-height:140px;"></textarea>`,
            showCancelButton: true, confirmButtonText: 'استيراد', cancelButtonText: 'إلغاء',
            preConfirm: () => { const v = (document.getElementById('paste-import-area').value || '').trim(); if (!v) { Swal.showValidationMessage('الحقل فارغ'); return false; } try { return JSON.parse(v); } catch (e) { Swal.showValidationMessage('صيغة JSON غير صالحة'); return false; } }
          }).then(res => {
            if (!res.isConfirmed || !res.value) return;
            const data = res.value;
            try {
              if (Array.isArray(data)) {
                const courses = this._sanitizeCourses(data);
                const applied = this._applyNewCoursesData(courses);
                this._toggleSettingsModal(false);
                this._afterDataUpdate(applied);
              } else if (data && Array.isArray(data.schedule)) {
                if (this.state.allCoursesData.length === 0) { this._showToast('error', 'حمّل بيانات المقررات أولاً.'); return; }
                const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                this._addSchedule(`مستورد ${time}`, false); const ns = this.state.schedules[this.state.schedules.length - 1];
                data.schedule.forEach(id => { if (this.state.allCoursesData.some(c => c.uniqueId === id)) ns.sections.add(id); });
                if (data.linked && Array.isArray(data.linked)) ns.linkedSections = new Map(data.linked.map(([k, v]) => [k, new Set(v)]));
                this.state.activeScheduleIndex = this.state.schedules.length - 1;
                this.updateFullUI(); this._toggleSettingsModal(false); this._showToast('success', 'تم استيراد الجدول.');
              } else { this._showToast('error', 'محتوى غير معروف.'); }
            } catch (e) { this._showToast('error', 'تعذّر الاستيراد.'); }
          });
        },
        _handleTabClick(button) {
          const parentSidebar = button.closest('.sidebar');
          parentSidebar.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); button.classList.add('active');
          parentSidebar.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active')); document.getElementById(button.dataset.tab).classList.add('active');
          if (button.dataset.tab === 'courses-tab') {
            this.dom.quickVisibilityWrapper.style.display = 'block';
          } else {
            this.dom.quickVisibilityWrapper.style.display = 'none';
          }
        },
        _handleMobileNav(button) {
          const view = button.dataset.view;
          this.dom.mobileNavButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active');
          this.dom.mobileViewContents.forEach(content => { content.style.display = 'none'; content.classList.remove('active'); });
          const targetView = document.getElementById(view); if (targetView) { targetView.style.display = 'flex'; targetView.classList.add('active'); }
          this._updateMobileHeader(); if (view === 'mobile-calendar-view') { setTimeout(() => { if (this.state.calendar) this.state.calendar.updateSize() }, 50); }
        },
        _showFeaturesModal() {
          const groups = [
            { icon: 'ph-calendar-plus', title: 'بناء الجدول', items: [
              { i: 'ph-calendar-blank', t: 'تقويم تفاعلي', d: 'عرض محاضراتك على تقويم أسبوعي حي مع الشعبة والدكتور والقاعة.' },
              { i: 'ph-stack', t: 'جداول متعددة', d: 'أنشئ أكثر من جدول، قارن بينها، وبدّل بضغطة واحدة.' },
              { i: 'ph-cursor-click', t: 'بطاقة المحاضرة', d: 'اضغط أي محاضرة في التقويم لعرض تفاصيلها، تبديل شعبتها، نسخ رقمها، أو إزالتها.' },
              { i: 'ph-warning-octagon', t: 'كشف التعارضات', d: 'بطاقة توضح المقرر المتعارض واليوم والوقت المتداخل ومدته، مع أداة لحل التعارضات دفعة واحدة.' },
              { i: 'ph-gauge', t: 'حدود الساعات المسموحة', d: 'تنبيه في «جدولي» إذا تجاوزت الحد الأعلى أو نزلت عن الأدنى، محسوب من معدلك ونوع الفصل وحالة التخرج.' },
              { i: 'ph-arrow-counter-clockwise', t: 'التراجع عن الأخطاء', d: 'Ctrl + Z يرجّع أي إضافة أو حذف أو مسح للجدول، حتى ٣٠ خطوة للخلف.' },
              { i: 'ph-magic-wand', t: 'إنشاء الجدول الذكي', d: 'توليد تلقائي لجدول بلا تعارض حسب نمطك، أيام إجازتك، ودكاترتك المفضلين.' },

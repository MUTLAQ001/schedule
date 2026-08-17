Object.assign(QU_ScheduleApp, {
        _notionLogoSVG() {
          return `<svg class="brand-svg brand-notion" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/></svg>`;
        },
        _obsidianLogoSVG() {
          return `<svg class="brand-svg brand-obsidian" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#7C3AED" d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5zM8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531zM5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831zM9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z"/></svg>`;
        },
        _notesExportData() {
          const schedule = this.state.schedules[this.state.activeScheduleIndex];
          const secs = schedule ? Array.from(schedule.sections).map(id => this.state.allCoursesData.find(c => c.uniqueId === id)).filter(Boolean) : [];
          if (!secs.length) return null;
          const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
          const meetings = [];
          secs.forEach(sec => {
            const slots = sec.timeSlots || [];
            if (!slots.length) { meetings.push({ sec, day: 9, dayName: 'بدون موعد', start: '', end: '', mins: 0 }); return; }
            slots.forEach(s => meetings.push({ sec, day: s.day, dayName: dayNames[s.day] || 'بدون موعد', start: String(s.start).slice(0, 5), end: String(s.end).slice(0, 5), mins: this._toMin(s.end) - this._toMin(s.start) }));
          });
          meetings.sort((a, b) => (a.day - b.day) || (this._toMin(a.start || '00:00') - this._toMin(b.start || '00:00')) || a.sec.name.localeCompare(b.sec.name));
          const courses = secs.slice().sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }) || a.section.localeCompare(b.section, undefined, { numeric: true }));
          const exams = [...new Map(secs.filter(s => s.examPeriodId).map(s => [s.code, s])).values()]
            .map(s => ({ sec: s, info: this._getExamDateInfo(s.examPeriodId) }))
            .sort((a, b) => {
              const da = a.info && a.info.start ? a.info.start.getTime() : Infinity;
              const db = b.info && b.info.start ? b.info.start.getTime() : Infinity;
              if (da !== db) return da - db;
              return parseInt(a.sec.examPeriodId, 10) - parseInt(b.sec.examPeriodId, 10);
            });
          const now = new Date();
          const pad = n => String(n).padStart(2, '0');
          return {
            name: (schedule.name || 'جدولي').trim(),
            dayNames, secs, meetings, courses, exams,
            credits: this._totalCreditsOf(secs),
            courseCount: new Set(secs.map(s => s.code)).size,
            activeDays: new Set(meetings.filter(m => m.day < 7).map(m => m.day)).size,
            notes: this.state.userSettings.courseNotes || {},
            date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
          };
        },
        _slotsText(sec, dayNames) {
          const slots = (sec.timeSlots || []).slice().sort((a, b) => (a.day - b.day) || (this._toMin(a.start) - this._toMin(b.start)));
          if (!slots.length) return 'غير محدد';
          return slots.map(s => `${dayNames[s.day] || 'غير محدد'} ${String(s.start).slice(0, 5)} - ${String(s.end).slice(0, 5)}`).join(' · ');
        },
        _lecturesWord(n) { return n === 1 ? 'محاضرة واحدة' : n === 2 ? 'محاضرتان' : n <= 10 ? `${n} محاضرات` : `${n} محاضرة`; },
        _studyDaysWord(n) { return n === 1 ? 'يوم دراسي واحد' : n === 2 ? 'يومان دراسيان' : n <= 10 ? `${n} أيام دراسية` : `${n} يوماً دراسياً`; },
        _csvCell(v) {
          const s = String(v == null ? '' : v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        },
        _mdCell(v) { return String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\s*\r?\n\s*/g, ' ').trim() || '—'; },
        _wikiName(v) { return String(v == null ? '' : v).replace(/[\[\]|#^]/g, ' ').replace(/\s+/g, ' ').trim(); },
        _yamlText(v) { return `"${String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`; },
        _buildNotionCSV(data) {
          const head = ['المقرر', 'الرمز', 'الشعبة', 'النشاط', 'الساعات', 'اليوم', 'من', 'إلى', 'المدة', 'القاعة', 'المحاضر', 'الحالة', 'المقر', 'الفترة', 'الاختبار النهائي', 'ملاحظات'];
          const rows = data.meetings.map(m => [
            m.sec.name, m.sec.code, m.sec.section, this._canonType(m.sec.type), m.sec.hours,
            m.dayName, m.start, m.end, m.mins ? this._formatDuration(m.mins) : '',
            m.sec.location, m.sec.instructor, m.sec.status, m.sec.campus,
            m.sec.examPeriodId || '', this._examSummaryText(m.sec.examPeriodId), data.notes[m.sec.code] || ''
          ]);
          return [head].concat(rows).map(r => r.map(c => this._csvCell(c)).join(',')).join('\r\n');
        },
        _buildNotionTable(data) {
          const head = ['اليوم', 'الوقت', 'المقرر', 'الرمز', 'الشعبة', 'القاعة', 'المحاضر'];
          const rows = data.meetings.map(m => [m.dayName, m.start ? `${m.start} - ${m.end}` : '—', m.sec.name, m.sec.code, m.sec.section, m.sec.location, m.sec.instructor]);
          return [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`]
            .concat(rows.map(r => `| ${r.map(c => this._mdCell(c)).join(' | ')} |`)).join('\n');
        },
        _buildObsidianMD(data) {
          const out = ['---', 'tags:', '  - جدول-دراسي', '  - qu-schedule',
            `الجدول: ${this._yamlText(data.name)}`,
            `الساعات-المعتمدة: ${data.credits}`,
            `عدد-المقررات: ${data.courseCount}`,
            `عدد-الشعب: ${data.courses.length}`,
            `أيام-الدراسة: ${data.activeDays}`,
            `تاريخ-التصدير: ${data.date}`, '---', '',
            `# جدولي الدراسي — ${data.name}`, '',
            '> [!info] ملخص',
            `> **${this._hoursText(data.credits)} معتمدة** · ${data.courseCount} ${this._coursesWord(data.courseCount)} · ${this._sectionsWord(data.courses.length)} · ${this._studyDaysWord(data.activeDays)}`, '',
            '## الجدول الأسبوعي', ''];
          [...new Set(data.meetings.map(m => m.day))].forEach(d => {
            const list = data.meetings.filter(m => m.day === d);
            out.push(`### ${list[0].dayName}`, '', '| الوقت | المقرر | الشعبة | القاعة | المحاضر |', '| --- | --- | --- | --- | --- |');
            list.forEach(m => out.push(`| ${m.start ? `${m.start} - ${m.end}` : '—'} | [[${this._wikiName(m.sec.name)}]] | ${this._mdCell(m.sec.section)} | ${this._mdCell(m.sec.location)} | ${this._mdCell(m.sec.instructor)} |`));
            out.push('');
          });
          out.push('## المقررات', '');
          data.courses.forEach(sec => {
            out.push(`### [[${this._wikiName(sec.name)}]] — شعبة ${sec.section}`, '',
              `- **الرمز:** ${this._mdCell(sec.code)}`,
              `- **الشعبة:** \`${sec.section}\``,
              `- **النشاط:** ${this._canonType(sec.type)} · **الساعات:** ${sec.hours}`,
              `- **المحاضر:** ${this._mdCell(sec.instructor)}`,
              `- **القاعة:** ${this._mdCell(sec.location)}`,
              `- **المواعيد:** ${this._slotsText(sec, data.dayNames)}`,
              `- **الاختبار النهائي:** ${this._examSummaryText(sec.examPeriodId)}`);
            if (data.notes[sec.code]) out.push(`- **ملاحظاتي:** ${this._mdCell(data.notes[sec.code])}`);
            out.push('');
          });
          if (data.exams.length) {
            out.push('## الاختبارات النهائية', '', '| المقرر | الرمز | الفترة | التاريخ الهجري | التاريخ الميلادي | الوقت |', '| --- | --- | --- | --- | --- | --- |');
            data.exams.forEach(x => {
              const raw = (x.info && x.info.raw) || '';
              const hijri = raw.split('(')[0].trim();
              const time = (raw.match(/\(([^)]+)\)/) || [])[1] || '';
              out.push(`| [[${this._wikiName(x.sec.name)}]] | ${this._mdCell(x.sec.code)} | ${this._mdCell(x.sec.examPeriodId)} | ${hijri ? `${hijri} هـ` : '—'} | ${x.info && x.info.gregorianText ? `${x.info.gregorianText} م` : '—'} | ${this._mdCell(time)} |`);
            });
            out.push('');
          }
          out.push('---', `*صُدِّر من QU Schedule بتاريخ ${data.date}*`, '');
          return out.join('\n');
        },
        _downloadTextFile(filename, mime, text) {
          const blob = new Blob([text], { type: `${mime};charset=utf-8` });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        _copyToClipboard(text, okMessage) {
          return navigator.clipboard.writeText(text)
            .then(() => this._showToast('success', okMessage))
            .catch(() => this._showToast('error', 'تعذر النسخ إلى الحافظة.'));
        },
        _notesExportTarget(kind, data) {
          if (kind === 'obsidian') {
            const md = this._buildObsidianMD(data);
            return {
              title: 'تصدير إلى Obsidian', brand: 'Obsidian', logo: this._obsidianLogoSVG(),
              desc: 'ملاحظة Markdown فيها جدولك الأسبوعي وتفاصيل مقرراتك واختباراتك، مع روابط [[wikilinks]] لكل مقرر.',
              steps: [
                'حمّل الملف، أو انسخ محتواه من الزر الثاني.',
                'انقل الملف إلى مجلد الـ Vault عندك — أو أنشئ ملاحظة جديدة والصق المحتوى فيها.',
                'اضغط على اسم أي مقرر لإنشاء ملاحظة خاصة به، وتظهر بيانات الجدول في خصائص الملاحظة.'
              ],
              file: 'qu_schedule.md', mime: 'text/markdown',
              fileText: md, copyText: md,
              fileBtn: 'تحميل ملف Markdown', copyBtn: 'نسخ المحتوى',
              fileDone: 'تم تصدير ملاحظة Obsidian.', copyDone: 'تم نسخ المحتوى — الصقه في ملاحظة جديدة.'
            };
          }
          return {
            title: 'تصدير إلى Notion', brand: 'Notion', logo: this._notionLogoSVG(),
            desc: 'ملف CSV يفتح في Notion كقاعدة بيانات، كل صف فيها محاضرة بيومها ووقتها وقاعتها ومحاضرها.',
            steps: [
              'حمّل ملف CSV من الزر بالأسفل.',
              'في Notion افتح الصفحة، اضغط ⋯ ثم <b>Import</b> واختر <b>CSV</b>.',
              'بعد الاستيراد استخدم <b>Group by</b> على عمود «اليوم» ليصير جدولك مرتباً بأيام الأسبوع.'
            ],
            file: 'qu_schedule_notion.csv', mime: 'text/csv',
            fileText: this._buildNotionCSV(data), copyText: this._buildNotionTable(data),
            fileBtn: 'تحميل ملف CSV', copyBtn: 'نسخ كجدول Markdown',
            fileDone: 'تم تصدير ملف Notion (.csv).', copyDone: 'تم نسخ الجدول — الصقه داخل صفحة Notion.'
          };
        },
        _handleNotesExport(kind) {
          const data = this._notesExportData();
          if (!data) { this._showToast('error', 'الجدول فارغ!'); return; }
          const t = this._notesExportTarget(kind, data);
          const lectures = data.meetings.filter(m => m.day < 7).length;
          const chips = [
            { i: 'ph-stack', v: `${data.courseCount} ${this._coursesWord(data.courseCount)}` },
            { i: 'ph-hash', v: this._sectionsWord(data.courses.length) },
            { i: 'ph-clock', v: `${this._lecturesWord(lectures)} أسبوعياً` },
            { i: 'ph-gauge', v: `${this._hoursText(data.credits)} معتمدة` }
          ].map(c => `<span class="stat-chip"><i class="ph ${c.i}"></i>${c.v}</span>`).join('');
          const html = `<div id="notes-export-content">
  <div class="nx-head">
    <span class="nx-ico">${t.logo}</span>
    <div class="nx-head-text"><div class="nx-title">${t.brand}</div><p class="nx-desc">${t.desc}</p></div>
  </div>
  <div class="nx-stats">${chips}</div>
  <div class="ic-steps">${t.steps.map((s, i) => `<div class="ics-row"><span class="icsr-num">${i + 1}</span><span>${s}</span></div>`).join('')}</div>
  <div class="nx-actions">
    <button type="button" class="nx-btn primary" data-nx="file"><i class="ph ph-download-simple"></i> ${t.fileBtn}</button>
    <button type="button" class="nx-btn" data-nx="copy"><i class="ph ph-clipboard-text"></i> ${t.copyBtn}</button>
  </div>
</div>`;
          Swal.fire({
            title: t.title, html, confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup notes-export-swal' },
            didOpen: (popup) => {
              popup.querySelector('[data-nx="file"]').addEventListener('click', () => {
                this._downloadTextFile(t.file, t.mime, t.fileText);
                this._showToast('success', t.fileDone);
              });
              popup.querySelector('[data-nx="copy"]').addEventListener('click', () => this._copyToClipboard(t.copyText, t.copyDone));
            }
          });
        },
      });

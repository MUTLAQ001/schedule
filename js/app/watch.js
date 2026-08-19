Object.assign(QU_ScheduleApp, {
        _watchQueryText(section) {
          const code = String(section && section.code ? section.code : '').trim();
          const instructor = String(section && section.instructor ? section.instructor : '').trim();
          const named = instructor && instructor !== 'غير محدد' && instructor !== 'لا يوجد';
          return named ? `${code} | ${instructor}` : code;
        },
        _copyWatchText(text) {
          const legacy = () => {
            try {
              const ta = document.createElement('textarea');
              ta.value = text;
              ta.setAttribute('readonly', '');
              ta.style.position = 'fixed';
              ta.style.top = '0';
              ta.style.insetInlineStart = '-9999px';
              ta.style.opacity = '0';
              document.body.appendChild(ta);
              ta.focus();
              ta.select();
              ta.setSelectionRange(0, ta.value.length);
              const ok = document.execCommand('copy');
              document.body.removeChild(ta);
              return !!ok;
            } catch (e) { return false; }
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => legacy());
          }
          return Promise.resolve(legacy());
        },
        _showWatchCopyFallback(text) {
          Swal.fire({
            title: 'انسخ النص يدوياً',
            html: `<div class="watch-manual"><p>تعذّر النسخ التلقائي. انسخ النص التالي وأرسله للبوت:</p><input type="text" id="watch-manual-input" class="watch-manual-input" readonly value="${this._escapeHTML(text)}"></div>`,
            confirmButtonText: 'تم',
            customClass: { popup: 'swal2-popup watch-manual-swal' },
            didOpen: () => {
              const input = document.getElementById('watch-manual-input');
              if (input) { input.focus(); input.select(); }
            }
          });
        },
        _watchLinkHTML(section, className, innerHTML) {
          const label = 'مراقبة الشعبة عبر بوت تليجرام';
          return `<a class="${className}" href="${this.constants.WATCH_BOT_URL}" target="_blank" rel="noopener noreferrer" data-watch-id="${this._escapeHTML(section.uniqueId)}" title="${label}" aria-label="${label}">${innerHTML}</a>`;
        },
        _closedWatchBadgeHTML(section) {
          if (!section || !this._isClosedStatus(section.status)) return '';
          return `<span class="closed-watch"><span class="closed-badge cw-closed"><i class="ph-fill ph-lock-simple"></i>مغلقة</span>${this._watchLinkHTML(section, 'cw-watch', '<i class="ph-fill ph-bell"></i>راقبها')}</span>`;
        },
        _sectionWatchBtnHTML(section) {
          if (!section || !this._isClosedStatus(section.status)) return '';
          return this._watchLinkHTML(section, 'sec-watch', '<i class="ph-fill ph-bell"></i>');
        },
        _watchChipHTML(section) {
          if (!section || !this._isClosedStatus(section.status)) return '';
          return this._watchLinkHTML(section, 'details-note-chip watch-chip', '<i class="ph-fill ph-bell"></i> راقبها');
        },
        _watchCardHTML(section) {
          if (!section || !this._isClosedStatus(section.status)) return '';
          return `<div class="watch-card"><div class="watch-card-top"><span class="watch-card-icon"><i class="ph-fill ph-bell-ringing"></i></span><div class="watch-card-text"><strong>الشعبة مغلقة</strong><span>خلّ بوت تليجرام يراقبها وينبهك أول ما ينفتح فيها مقعد.</span></div></div>${this._watchLinkHTML(section, 'watch-card-btn', '<i class="ph-fill ph-bell"></i> مراقبة الشعبة')}</div>`;
        },
        _hideWatchSnackbar() {
          clearTimeout(this._watchSnackTimer);
          const bar = document.getElementById('watch-snackbar');
          if (bar) bar.classList.remove('show');
        },
        _showWatchSnackbar(section) {
          if (!section) return;
          let bar = document.getElementById('watch-snackbar');
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'watch-snackbar';
            bar.className = 'undo-snackbar watch-snackbar';
            document.body.appendChild(bar);
          }
          clearTimeout(this._watchSnackTimer);
          const msg = `<span class="undo-msg"><i class="ph-fill ph-lock-simple watch-snack-icon"></i>شعبة ${this._escapeHTML(section.section)} مغلقة</span>`;
          bar.innerHTML = `${msg}${this._watchLinkHTML(section, 'undo-btn watch-snack-btn', '<i class="ph-fill ph-bell"></i> راقبها')}`;
          requestAnimationFrame(() => bar.classList.add('show'));
          this._watchSnackTimer = setTimeout(() => bar.classList.remove('show'), 7000);
        },
        _initWatchDelegation() {
          if (this._watchDelegationReady) return;
          this._watchDelegationReady = true;
          document.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || typeof target.closest !== 'function') return;
            const link = target.closest('[data-watch-id]');
            if (!link) return;
            e.stopPropagation();
            const section = this.state.allCoursesData.find(c => c.uniqueId === link.dataset.watchId);
            if (!section) return;
            this._hideWatchSnackbar();
            this._vibrate(12);
            const text = this._watchQueryText(section);
            this._copyWatchText(text).then(ok => {
              if (ok) this._showToast('success', 'تم نسخ بيانات الشعبة، الصقها في البوت');
              else this._showWatchCopyFallback(text);
            });
          }, true);
        }
      });

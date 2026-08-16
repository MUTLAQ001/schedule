Object.assign(QU_ScheduleApp, {
        _normalizeLayout(raw) {
          const ids = Object.keys(this.constants.LAYOUT_BLOCKS);
          const cols = this.constants.LAYOUT_COLUMNS;
          const minW = this.constants.LAYOUT_MIN_WIDTH;
          const source = Array.isArray(raw) ? raw : this.state.userSettings.customLayout;
          const fallback = () => this.constants.DEFAULT_LAYOUT.map(item => ({ ...item }));
          if (!Array.isArray(source) || !source.length) return fallback();
          const flat = [];
          source.forEach(entry => { if (Array.isArray(entry)) { entry.forEach(cell => flat.push(cell)); } else { flat.push(entry); } });
          const items = [];
          const seen = new Set();
          flat.forEach(cell => {
            const id = cell && cell.id;
            if (!ids.includes(id) || seen.has(id)) return;
            seen.add(id);
            items.push({
              id,
              w: Math.min(cols, Math.max(minW, parseInt(cell.w, 10) || cols)),
              h: Math.min(2, Math.max(1, parseInt(cell.h, 10) || 1))
            });
          });
          if (!items.length) return fallback();
          ids.forEach(id => { if (!seen.has(id)) items.push({ id, w: cols, h: 1 }); });
          return items;
        },
        _applyLayout() {
          const wrapper = document.querySelector('.page-wrapper');
          const main = wrapper && wrapper.querySelector('.main-content');
          if (!wrapper || !main) return;
          const cols = this.constants.LAYOUT_COLUMNS;
          const saved = this.state.userSettings.customLayout;
          const isCustom = Array.isArray(saved) && saved.length > 0;
          document.body.classList.toggle('custom-layout', isCustom);
          const blocks = {};
          Object.keys(this.constants.LAYOUT_BLOCKS).forEach(id => {
            const el = wrapper.querySelector(`[data-block="${id}"]`);
            if (!el) return;
            blocks[id] = el;
            el.style.removeProperty('--layout-w');
            el.style.removeProperty('--layout-h');
            el.classList.remove('layout-tall-full');
            el.remove();
          });
          wrapper.querySelectorAll('.layout-grid').forEach(grid => grid.remove());
          if (!isCustom) {
            if (blocks.calendar) main.appendChild(blocks.calendar);
            if (blocks.myschedule) main.appendChild(blocks.myschedule);
            if (blocks.courses) wrapper.appendChild(blocks.courses);
          } else {
            const grid = document.createElement('div');
            grid.className = 'layout-grid';
            this._normalizeLayout().forEach(item => {
              const el = blocks[item.id];
              if (!el) return;
              el.style.setProperty('--layout-w', String(item.w));
              el.style.setProperty('--layout-h', String(item.h));
              el.classList.toggle('layout-tall-full', item.w >= cols && item.h > 1);
              grid.appendChild(el);
            });
            if (grid.children.length) main.appendChild(grid);
          }
          requestAnimationFrame(() => { try { this.state.calendar?.updateSize(); } catch (e) { } });
        },
        _railBounds() {
          const vw = window.innerWidth || 1280;
          return { min: 280, max: Math.max(280, Math.round(Math.min(620, vw * 0.45))) };
        },
        _currentRailPx() {
          const el = document.querySelector('.page-wrapper > .sidebar');
          const w = el ? Math.round(el.getBoundingClientRect().width) : 0;
          return w || this._railBounds().min;
        },
        _applySidebarWidth() {
          const root = document.documentElement;
          const px = parseInt(this.state.userSettings.sidebarWidth, 10);
          if (!px) { root.style.removeProperty('--qs-rail'); return; }
          const b = this._railBounds();
          root.style.setProperty('--qs-rail', Math.min(b.max, Math.max(b.min, px)) + 'px');
        },
        _setSidebarWidth(px, opts) {
          const b = this._railBounds();
          this.state.userSettings.sidebarWidth = px == null ? null : Math.min(b.max, Math.max(b.min, Math.round(px)));
          this._applySidebarWidth();
          if (!opts || !opts.silent) this._saveSettings();
          this._syncSidebarWidthControl();
          requestAnimationFrame(() => { try { this.state.calendar?.updateSize(); } catch (e) { } });
        },
        _railPresets() {
          const b = this._railBounds();
          const fit = px => Math.min(b.max, Math.max(b.min, px));
          return [
            { key: 'narrow', label: 'ضيّق', px: fit(300) },
            { key: 'auto', label: 'متوسط', px: null },
            { key: 'wide', label: 'واسع', px: fit(470) }
          ];
        },
        _railActiveKey() {
          const saved = parseInt(this.state.userSettings.sidebarWidth, 10);
          if (!saved) return 'auto';
          return this._railPresets()
            .filter(p => p.px != null)
            .reduce((best, p) => Math.abs(p.px - saved) < Math.abs(best.px - saved) ? p : best).key;
        },
        _syncSidebarWidthControl() {
          const toggle = this.dom.settingsModal && this.dom.settingsModal.querySelector('#sidebar-width-toggle');
          if (!toggle) return;
          const active = this._railActiveKey();
          toggle.innerHTML = this._railPresets()
            .map(p => `<button class="mode-btn ${p.key === active ? 'active' : ''}" data-rail="${p.key}">${p.label}</button>`)
            .join('');
          toggle.onclick = e => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            const preset = this._railPresets().find(p => p.key === btn.dataset.rail);
            if (preset) this._setSidebarWidth(preset.px);
          };
        },
        _initSidebarResizer() {
          const sidebar = document.querySelector('.page-wrapper > .sidebar');
          if (!sidebar || sidebar.querySelector('.rail-resizer')) return;
          const handle = document.createElement('div');
          handle.className = 'rail-resizer';
          handle.setAttribute('role', 'separator');
          handle.setAttribute('aria-orientation', 'vertical');
          handle.setAttribute('aria-label', 'تغيير عرض قائمة المقررات');
          handle.setAttribute('title', 'اسحب لتغيير عرض القائمة · نقرتان للإرجاع');
          handle.tabIndex = 0;
          handle.innerHTML = '<span class="rail-resizer-grip"></span>';
          sidebar.appendChild(handle);
          const flip = () => document.body.classList.contains('sidebar-right') ? -1 : 1;
          let dragging = false, startX = 0, startW = 0, pending = 0, raf = 0;
          const paint = () => {
            raf = 0;
            const b = this._railBounds();
            document.documentElement.style.setProperty('--qs-rail', Math.min(b.max, Math.max(b.min, pending)) + 'px');
            try { this.state.calendar?.updateSize(); } catch (e) { }
          };
          const onMove = e => {
            if (!dragging) return;
            pending = startW + (e.clientX - startX) * flip();
            if (!raf) raf = requestAnimationFrame(paint);
          };
          const onUp = () => {
            if (!dragging) return;
            dragging = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            document.body.classList.remove('rail-resizing');
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            this._setSidebarWidth(pending);
          };
          handle.addEventListener('pointerdown', e => {
            if (isMobile || document.body.classList.contains('custom-layout')) return;
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startW = sidebar.getBoundingClientRect().width;
            pending = startW;
            try { handle.setPointerCapture(e.pointerId); } catch (err) { }
            document.body.classList.add('rail-resizing');
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
          });
          handle.addEventListener('dblclick', () => { this._setSidebarWidth(null); this._showToast('info', 'رجّعنا عرض القائمة للافتراضي.'); });
          handle.addEventListener('keydown', e => {
            const step = e.shiftKey ? 48 : 16;
            if (e.key === 'ArrowLeft') { e.preventDefault(); this._setSidebarWidth(this._currentRailPx() - step * flip()); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); this._setSidebarWidth(this._currentRailPx() + step * flip()); }
            else if (e.key === 'Home') { e.preventDefault(); this._setSidebarWidth(null); }
          });
          window.addEventListener('resize', () => this._applySidebarWidth());
        },
        _renderLayoutEditor(host) {
          const blocks = this.constants.LAYOUT_BLOCKS;
          const cols = this.constants.LAYOUT_COLUMNS;
          const minW = this.constants.LAYOUT_MIN_WIDTH;
          const items = this.state.layoutDraft;
          const cells = items.map((item, i) => `<div class="lay-chip" draggable="true" data-index="${i}" style="--lay-w:${item.w};--lay-h:${item.h};"><div class="lay-chip-top"><span class="lay-chip-icon"><i class="ph ${blocks[item.id].icon}"></i></span><span class="lay-chip-title">${blocks[item.id].label}</span><i class="ph ph-dots-six-vertical lay-grip"></i></div><div class="lay-chip-bar"><span class="lay-stepper"><button type="button" class="lay-step" data-index="${i}" data-act="narrow" aria-label="تضييق"${item.w <= minW ? ' disabled' : ''}>−</button><span class="lay-size">${item.w}<em>/${cols}</em></span><button type="button" class="lay-step" data-index="${i}" data-act="widen" aria-label="توسيع"${item.w >= cols ? ' disabled' : ''}>+</button></span><button type="button" class="lay-tall ${item.h === 2 ? 'on' : ''}" data-index="${i}" data-act="tall" title="${item.h === 2 ? 'إرجاعه لصف واحد' : 'مدّه على صفّين'}" aria-label="مدّ رأسي"><i class="ph ph-arrows-vertical"></i></button></div></div>`).join('');
          host.innerHTML = `<p class="lay-hint">اسحب أي قسم وأفلته على قسم آخر ليأخذ مكانه.</p><div class="lay-canvas"><div class="lay-grid">${cells}</div></div><div class="lay-legend"><span><b>−</b><b>+</b> عرض القسم</span><span><b><i class="ph ph-arrows-vertical"></i></b> مدّه على صفّين</span></div>`;
          this._bindLayoutEditor(host);
        },
        _bindLayoutEditor(host) {
          const cols = this.constants.LAYOUT_COLUMNS;
          const minW = this.constants.LAYOUT_MIN_WIDTH;
          const commit = () => {
            this.state.userSettings.customLayout = this.state.layoutDraft;
            this._saveSettings();
            this._applyLayout();
            this._renderLayoutEditor(host);
          };
          host.querySelectorAll('.lay-step, .lay-tall').forEach(btn => {
            btn.addEventListener('click', () => {
              const item = this.state.layoutDraft[+btn.dataset.index];
              if (!item) return;
              if (btn.dataset.act === 'widen') item.w = Math.min(cols, item.w + 1);
              else if (btn.dataset.act === 'narrow') item.w = Math.max(minW, item.w - 1);
              else if (btn.dataset.act === 'tall') item.h = item.h === 2 ? 1 : 2;
              commit();
            });
          });
          const clearMarks = () => host.querySelectorAll('.lay-chip').forEach(c => c.classList.remove('drop-target'));
          host.querySelectorAll('.lay-chip').forEach(chip => {
            chip.addEventListener('dragstart', e => {
              this.state.layoutDrag = +chip.dataset.index;
              chip.classList.add('dragging');
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', chip.dataset.index);
            });
            chip.addEventListener('dragend', () => { chip.classList.remove('dragging'); clearMarks(); });
            chip.addEventListener('dragover', e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (+chip.dataset.index !== this.state.layoutDrag) chip.classList.add('drop-target');
            });
            chip.addEventListener('dragleave', () => chip.classList.remove('drop-target'));
            chip.addEventListener('drop', e => {
              e.preventDefault();
              e.stopPropagation();
              clearMarks();
              const from = this.state.layoutDrag;
              const to = +chip.dataset.index;
              this.state.layoutDrag = null;
              if (from === null || from === undefined || from === to) return;
              const items = this.state.layoutDraft;
              const moved = items[from];
              if (!moved) return;
              items.splice(from, 1);
              items.splice(from < to ? to - 1 : to, 0, moved);
              commit();
            });
          });
        },
        _showLayoutEditor() {
          this.state.layoutDraft = this._normalizeLayout();
          Swal.fire({
            title: 'تخطيط الصفحة',
            html: '<div id="layout-editor-host"></div>',
            showCancelButton: true,
            confirmButtonText: 'تم',
            cancelButtonText: 'إرجاع الافتراضي',
            customClass: { popup: 'swal2-popup wide-swal' },
            didOpen: () => {
              const host = document.getElementById('layout-editor-host');
              if (host) this._renderLayoutEditor(host);
            }
          }).then(result => {
            if (result.dismiss === Swal.DismissReason.cancel) {
              this.state.userSettings.customLayout = null;
              this._saveSettings();
              this._applyLayout();
              this._showToast('success', 'تم إرجاع التخطيط الافتراضي.');
            }
          });
        }
      });

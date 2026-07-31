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
              grid.appendChild(el);
            });
            if (grid.children.length) main.appendChild(grid);
          }
          requestAnimationFrame(() => { try { this.state.calendar?.updateSize(); } catch (e) { } });
        },
        _renderLayoutEditor(host) {
          const blocks = this.constants.LAYOUT_BLOCKS;
          const cols = this.constants.LAYOUT_COLUMNS;
          const minW = this.constants.LAYOUT_MIN_WIDTH;
          const items = this.state.layoutDraft;
          const cells = items.map((item, i) => `<div class="lay-chip" draggable="true" data-index="${i}" style="--lay-w:${item.w};--lay-h:${item.h};"><div class="lay-chip-top"><span class="lay-chip-icon"><i class="ph ${blocks[item.id].icon}"></i></span><span class="lay-chip-title">${blocks[item.id].label}</span><i class="ph ph-dots-six-vertical lay-grip"></i></div><div class="lay-chip-bar"><span class="lay-stepper"><button type="button" class="lay-step" data-index="${i}" data-act="narrow" aria-label="تضييق"${item.w <= minW ? ' disabled' : ''}>−</button><span class="lay-size">${item.w}<em>/${cols}</em></span><button type="button" class="lay-step" data-index="${i}" data-act="widen" aria-label="توسيع"${item.w >= cols ? ' disabled' : ''}>+</button></span><button type="button" class="lay-tall ${item.h === 2 ? 'on' : ''}" data-index="${i}" data-act="tall"${item.w >= cols ? ' disabled' : ''} title="${item.w >= cols ? 'ضيّق القسم أولاً حتى يصير بجانبه قسم آخر' : item.h === 2 ? 'إرجاعه لصف واحد' : 'مدّه على صفّين'}" aria-label="مدّ رأسي"><i class="ph ph-arrows-vertical"></i></button></div></div>`).join('');
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
              if (btn.dataset.act === 'widen') { item.w = Math.min(cols, item.w + 1); if (item.w >= cols) item.h = 1; }
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

    document.addEventListener('DOMContentLoaded', () => {
      const getRowCells = (row) =>
        Array.from(row.children).filter((cell) => cell.matches('td, th'));

      const hasInteractiveContent = (th) =>
        !!th.querySelector('input, select, textarea, [contenteditable="true"], button');

      const cleanValue = (value) => (value || '').replace(/\s+/g, ' ').trim();

      const parseNumber = (raw) => {
        const candidate = cleanValue(raw)
          .replace(/\s/g, '')
          .replace(/,/g, '.')
          .replace(/[^\d.-]/g, '');
        if (!candidate || /^[-.]$/.test(candidate)) return null;
        const num = Number(candidate);
        return Number.isFinite(num) ? num : null;
      };

      const parseDate = (raw) => {
        const value = cleanValue(raw);
        if (!value) return null;
        const yearOnly = value.match(/^(\d{4})$/);
        if (yearOnly) return Date.UTC(Number(yearOnly[1]), 0, 1);

        const fiDate = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (fiDate) {
          const day = Number(fiDate[1]);
          const month = Number(fiDate[2]) - 1;
          const year = Number(fiDate[3]);
          const timestamp = Date.UTC(year, month, day);
          return Number.isFinite(timestamp) ? timestamp : null;
        }

        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const detectColumnType = (rows, index) => {
        let numberHits = 0;
        let dateHits = 0;
        let textHits = 0;

        rows.forEach((row) => {
          const cells = getRowCells(row);
          const text = cleanValue(cells[index] ? cells[index].textContent : '');
          if (!text) return;
          const asDate = parseDate(text);
          if (asDate !== null) {
            dateHits += 1;
            return;
          }
          const asNumber = parseNumber(text);
          if (asNumber !== null) {
            numberHits += 1;
            return;
          }
          textHits += 1;
        });

        if (dateHits >= numberHits && dateHits >= textHits && dateHits > 0) return 'date';
        if (numberHits > 0 && numberHits >= textHits) return 'number';
        return 'text';
      };

      const sortRows = (rows, { index, type, direction }) => {
        const collator = new Intl.Collator('fi', { numeric: true, sensitivity: 'base' });
        return [...rows].sort((a, b) => {
          const aCells = getRowCells(a);
          const bCells = getRowCells(b);
          const aRaw = cleanValue(aCells[index] ? aCells[index].textContent : '');
          const bRaw = cleanValue(bCells[index] ? bCells[index].textContent : '');

          if (type === 'date') {
            const aDate = parseDate(aRaw);
            const bDate = parseDate(bRaw);
            if (aDate === null && bDate === null) return 0;
            if (aDate === null) return 1;
            if (bDate === null) return -1;
            return direction === 'asc' ? aDate - bDate : bDate - aDate;
          }

          if (type === 'number') {
            const aNum = parseNumber(aRaw);
            const bNum = parseNumber(bRaw);
            if (aNum === null && bNum === null) return 0;
            if (aNum === null) return 1;
            if (bNum === null) return -1;
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
          }

          const cmp = collator.compare(aRaw, bRaw);
          return direction === 'asc' ? cmp : -cmp;
        });
      };

      const initHeaderFilters = (table) => {
        if (!table || table.dataset.headerFiltersInit === 'true') return;
        if (table.hasAttribute('data-no-header-filters')) return;

        const headRow = table.querySelector('thead tr:last-child');
        const tbody = table.querySelector('tbody');
        if (!headRow || !tbody) return;

        const headers = Array.from(headRow.children).filter((cell) => cell.matches('th, td'));
        if (!headers.length) return;

        const hasPlainHeader = headers.some((th) => !hasInteractiveContent(th));
        if (!hasPlainHeader) return;

        const rows = Array.from(tbody.querySelectorAll('tr')).filter((row) => {
          const cells = getRowCells(row);
          return cells.length > 1 || !cells[0]?.hasAttribute('colspan');
        });

        const sortControls = headers.map((th, index) => {
          if (th.dataset.filterSkip === 'true' || hasInteractiveContent(th)) return null;

          const label = (th.textContent || '').replace(/\s+/g, ' ').trim() || `Sarake ${index + 1}`;
          const type = detectColumnType(rows, index);
          const wrapper = document.createElement('div');
          wrapper.className = 'table-header-filter-wrap';

          const labelEl = document.createElement('div');
          labelEl.className = 'table-header-filter-label';
          while (th.firstChild) labelEl.appendChild(th.firstChild);

          const select = document.createElement('select');
          select.className = 'form-select form-select-sm table-header-sort-select';
          select.setAttribute('aria-label', `Lajittele saraketta: ${label}`);
          select.dataset.sortType = type;
          select.dataset.colIndex = String(index);
          select.innerHTML = '<option value="">Ei lajittelua</option>';

          if (type === 'text') {
            select.innerHTML += '<option value="asc">A-Ö</option><option value="desc">Ö-A</option>';
          } else if (type === 'date') {
            select.innerHTML += '<option value="desc">Uusin ensin</option><option value="asc">Vanhin ensin</option>';
          } else {
            select.innerHTML += '<option value="asc">Pienin ensin</option><option value="desc">Suurin ensin</option>';
          }
          select.addEventListener('click', (event) => event.stopPropagation());
          select.addEventListener('keydown', (event) => event.stopPropagation());

          wrapper.append(labelEl, select);
          th.appendChild(wrapper);
          return select;
        });

        let isApplyingSort = false;
        let observer = null;
        let suppressObserver = false;
        const applySort = () => {
          if (isApplyingSort) return;
          isApplyingSort = true;
          try {
            const activeSorts = sortControls
              .filter((control) => control && control.value)
              .map((control) => ({
                index: Number(control.dataset.colIndex),
                type: control.dataset.sortType || 'text',
                direction: control.value
              }));

            const rows = Array.from(tbody.querySelectorAll('tr'));
            const dataRows = rows.filter((row) => {
              const cells = getRowCells(row);
              return cells.length > 1 || !cells[0]?.hasAttribute('colspan');
            });
            const messageRows = rows.filter((row) => {
              const cells = getRowCells(row);
              return cells.length <= 1 && cells[0]?.hasAttribute('colspan');
            });

            let sorted = [...dataRows];
            activeSorts.forEach((cfg) => {
              sorted = sortRows(sorted, cfg);
            });

            const targetOrder = [...sorted, ...messageRows];
            const isSameOrder =
              targetOrder.length === rows.length &&
              targetOrder.every((row, idx) => row === rows[idx]);
            if (isSameOrder) return;

            suppressObserver = true;
            if (observer) observer.disconnect();
            try {
              targetOrder.forEach((row) => tbody.appendChild(row));
            } finally {
              if (observer) observer.observe(tbody, { childList: true });
              suppressObserver = false;
            }
          } finally {
            isApplyingSort = false;
          }
        };

        sortControls.forEach((control) => {
          if (!control) return;
          control.addEventListener('change', applySort);
        });

        observer = new MutationObserver(() => {
          if (suppressObserver) return;
          applySort();
        });
        observer.observe(tbody, { childList: true });

        table.dataset.headerFiltersInit = 'true';
        applySort();
      };

      document.querySelectorAll('table').forEach((table) => initHeaderFilters(table));
    });

import { describe, expect, it } from 'vitest';

import { renderBadge, renderBoolBadge } from '../../src/components/badge.js';
import { renderTable } from '../../src/components/table.js';

describe('frontend basic components', () => {
  it('renders status and boolean badges across fallback paths', () => {
    expect(renderBadge('')).toBe('');
    expect(renderBadge('published')).toContain('badge-success');
    expect(renderBadge('unknown-status')).toContain('badge-muted');
    expect(renderBadge('<unsafe>')).toContain('&lt;unsafe&gt;');

    expect(renderBoolBadge(true, 'yes', 'no')).toContain('badge-success');
    expect(renderBoolBadge(true, 'yes', 'no')).toContain('yes');
    expect(renderBoolBadge(false, 'yes', 'no')).toContain('badge-muted');
    expect(renderBoolBadge(false, 'yes', 'no')).toContain('no');
  });

  it('renders empty table states and escapes fallback content', () => {
    expect(renderTable({ columns: [], rows: null, empty: '<empty>' })).toContain('&lt;empty&gt;');
    expect(renderTable({ columns: [], rows: [], empty: 'none' })).toContain('table-empty');
  });

  it('renders header classes, escaped cells, and custom renderers', () => {
    const html = renderTable({
      columns: [
        { key: 'name', label: 'Name', class: 'name-col' },
        { key: 'raw', label: '<Raw>' },
        { key: 'action', label: 'Action', render: (row) => `<button data-id="${row.id}">go</button>` },
      ],
      rows: [{ id: 7, name: 'Alice', raw: '<script>' }],
    });

    expect(html).toContain('name-col');
    expect(html).toContain('&lt;Raw&gt;');
    expect(html).toContain('Alice');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('data-id="7"');
  });
});

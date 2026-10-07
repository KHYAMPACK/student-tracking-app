import { isValidElement } from 'react';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { theme } from './theme';

const s = StyleSheet.create({
  table: {
    borderWidth: 0.6,
    borderColor: theme.lineStrong,
    borderRadius: 4,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    backgroundColor: theme.headerGroupBg,
  },
  headRow: {
    flexDirection: 'row',
    backgroundColor: theme.headerBg,
  },
  headCell: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  headText: {
    fontSize: 6.5,
    fontWeight: 700,
    color: theme.headerText,
    textAlign: 'center',
  },
  groupText: {
    fontSize: 6.5,
    fontWeight: 700,
    color: theme.headerText,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 0.4,
    borderTopColor: theme.line,
  },
  cell: {
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});

/**
 * @typedef {Object} KitColumn
 * @property {string} key
 * @property {string} label
 * @property {number} w                Relative width weight.
 * @property {'left'|'center'|'right'} [align]
 * @property {string} [group]          Consecutive columns with the same group share one banner above.
 * @property {boolean} [sep]           Draw a divider on the left edge (start of a group).
 * @property {(row: any) => any} [render]
 * @property {(row: any) => ({ bg?: string, color?: string, bold?: boolean } | null)} [tone]
 */

/**
 * Fixed-geometry table: every cell width is computed in points so group banners,
 * header labels and body cells always line up.
 *
 * @param {{
 *   columns: KitColumn[],
 *   rows: any[],
 *   width: number,
 *   rowHeight?: number,
 *   fontSize?: number,
 *   zebra?: boolean,
 *   rowTone?: (row: any, index: number) => ({ bg?: string, color?: string, bold?: boolean } | null),
 * }} props
 */
export function KitTable({ columns, rows, width, rowHeight = 16, fontSize = 7, zebra = true, rowTone }) {
  const totalWeight = columns.reduce((sum, col) => sum + col.w, 0) || 1;
  const cols = columns.map((col) => ({ ...col, px: (col.w / totalWeight) * width }));

  const groups = [];
  for (const col of cols) {
    const last = groups[groups.length - 1];
    if (col.group && last && last.group === col.group) {
      last.px += col.px;
    } else {
      groups.push({ group: col.group ?? null, px: col.px, sep: Boolean(col.sep) });
    }
  }
  const hasGroups = groups.some((group) => group.group);

  return (
    <View style={[s.table, { width }]}>
      {hasGroups ? (
        <View style={s.groupRow}>
          {groups.map((group, index) => (
            <View
              key={`g-${index}`}
              style={[
                s.headCell,
                {
                  width: group.px,
                  height: 14,
                  borderLeftWidth: index > 0 && group.group ? 0.6 : 0,
                  borderLeftColor: theme.faint,
                },
              ]}
            >
              {group.group ? <Text style={s.groupText}>{group.group}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={s.headRow}>
        {cols.map((col) => (
          <View
            key={col.key}
            style={[
              s.headCell,
              {
                width: col.px,
                height: 17,
                borderLeftWidth: col.sep ? 0.6 : 0,
                borderLeftColor: theme.faint,
              },
            ]}
          >
            <Text style={[s.headText, col.align === 'left' ? { textAlign: 'left', paddingLeft: 1 } : null]}>
              {col.label}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => {
        const tone = rowTone?.(row, rowIndex) ?? null;
        const background = tone?.bg ?? (zebra && rowIndex % 2 === 1 ? theme.surfaceAlt : theme.surface);
        return (
          <View
            key={row.id ?? rowIndex}
            style={[s.row, { height: rowHeight, backgroundColor: background }]}
            wrap={false}
          >
            {cols.map((col) => {
              const raw = col.render ? col.render(row) : row[col.key];
              const cellTone = col.tone?.(row) ?? null;
              const bold = cellTone?.bold ?? tone?.bold ?? false;
              const color = cellTone?.color ?? tone?.color ?? theme.body;
              const align = col.align ?? 'center';
              return (
                <View
                  key={col.key}
                  style={[
                    s.cell,
                    {
                      width: col.px,
                      borderLeftWidth: col.sep ? 0.6 : 0,
                      borderLeftColor: theme.lineStrong,
                    },
                    cellTone?.bg ? { backgroundColor: cellTone.bg } : null,
                  ]}
                >
                  {isValidElement(raw) ? (
                    raw
                  ) : (
                    <Text
                      maxLines={1}
                      style={{
                        fontSize,
                        color,
                        fontWeight: bold ? 700 : 400,
                        textAlign: align,
                      }}
                    >
                      {raw == null ? '—' : String(raw)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/** Splits rows into pages: the first page usually holds less because of the header/cards. */
export function paginateRows(rows, firstCapacity, restCapacity) {
  if (!rows.length) return [[]];
  const pages = [rows.slice(0, firstCapacity)];
  for (let i = firstCapacity; i < rows.length; i += restCapacity) {
    pages.push(rows.slice(i, i + restCapacity));
  }
  return pages;
}

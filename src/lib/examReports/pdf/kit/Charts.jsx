import { Circle, Line, Path, Polyline, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import { formatNum } from '../formatReport';
import { theme } from './theme';

export const CHART = {
  correct: theme.good,
  wrong: '#dc2626',
  blank: theme.faint,
  bar: theme.accent,
};

const s = StyleSheet.create({
  card: {
    flex: 1,
    padding: 9,
    borderRadius: 6,
    borderWidth: 0.6,
    borderColor: theme.lineStrong,
    backgroundColor: theme.surface,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: theme.ink,
    marginBottom: 7,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpi: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: theme.tint,
    borderWidth: 0.6,
    borderColor: theme.accentSoft,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: theme.muted,
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: 700,
    color: theme.accent,
    marginTop: 2,
  },
  kpiHint: {
    fontSize: 6.5,
    color: theme.muted,
    marginTop: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  barLabel: {
    width: 62,
    fontSize: 7,
    color: theme.body,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.line,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    width: 34,
    fontSize: 7,
    fontWeight: 700,
    textAlign: 'right',
    color: theme.ink,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  swatch: {
    width: 7,
    height: 7,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 7,
    color: theme.body,
  },
  inlineTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.line,
    overflow: 'hidden',
  },
});

/** Row of headline figures. */
export function KpiStrip({ items }) {
  return (
    <View style={s.kpiRow}>
      {items.map((item) => (
        <View key={item.label} style={s.kpi}>
          <Text style={s.kpiLabel}>{item.label}</Text>
          <Text style={s.kpiValue}>{item.value}</Text>
          {item.hint ? <Text style={s.kpiHint}>{item.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Card with a title; children are laid out by the caller. */
export function ChartCard({ title, children, flex = 1 }) {
  return (
    <View style={[s.card, { flex }]}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

/**
 * Horizontal bars scaled against `max` (so a full bar means "everything right").
 * @param {{ items: { label: string, value: number, display?: string, color?: string }[], max: number, title?: string, flex?: number }} props
 */
export function BarListCard({ items, max, title, flex = 1 }) {
  const safeMax = max > 0 ? max : 1;
  return (
    <ChartCard title={title} flex={flex}>
      {items.map((item) => {
        const pct = Math.max(2, Math.min(100, (Math.max(item.value, 0) / safeMax) * 100));
        return (
          <View key={item.label} style={s.barRow}>
            <Text style={s.barLabel} maxLines={1}>
              {item.label}
            </Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${pct}%`, backgroundColor: item.color ?? CHART.bar }]} />
            </View>
            <Text style={s.barValue}>{item.display ?? formatNum(item.value, 1)}</Text>
          </View>
        );
      })}
    </ChartCard>
  );
}

function polar(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function ringPath(cx, cy, outer, inner, start, end) {
  const large = end - start > 180 ? 1 : 0;
  const a = polar(cx, cy, outer, start);
  const b = polar(cx, cy, outer, end);
  const c = polar(cx, cy, inner, end);
  const d = polar(cx, cy, inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}

/**
 * Ring chart with the total in the middle.
 * @param {{ segments: { label: string, value: number, color: string }[], title?: string, centerLabel?: string, flex?: number }} props
 */
export function DonutCard({ segments, title, centerLabel, flex = 1, digits = 0 }) {
  const total = segments.reduce((sum, segment) => sum + (segment.value || 0), 0);
  const size = 78;
  const c = size / 2;
  let cursor = 0;
  const active = segments.filter((segment) => segment.value > 0);
  const slices = active.map((segment) => {
    const angle = total ? (segment.value / total) * 360 : 0;
    const start = cursor;
    cursor += angle;
    return { ...segment, start, end: cursor, pct: total ? Math.round((segment.value / total) * 100) : 0 };
  });

  return (
    <ChartCard title={title} flex={flex}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: size, height: size, position: 'relative' }}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {total === 0 ? <Circle cx={c} cy={c} r={c - 2} fill={theme.line} /> : null}
            {slices.length === 1 ? <Circle cx={c} cy={c} r={c - 2} fill={slices[0].color} /> : null}
            {slices.length > 1
              ? slices.map((slice) => (
                  <Path key={slice.label} d={ringPath(c, c, c - 2, c - 15, slice.start, slice.end)} fill={slice.color} />
                ))
              : null}
            <Circle cx={c} cy={c} r={c - 15} fill="#ffffff" />
          </Svg>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: size,
              height: size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 700, color: theme.ink }}>{formatNum(Math.round(total), 0)}</Text>
            {centerLabel ? <Text style={{ fontSize: 5.5, color: theme.muted }}>{centerLabel}</Text> : null}
          </View>
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          {segments.map((segment) => (
            <View key={segment.label} style={s.legendRow}>
              <View style={[s.swatch, { backgroundColor: segment.color }]} />
              <Text style={s.legendText}>
                {segment.label}: {formatNum(segment.value, digits)}
                {total ? ` (%${Math.round((segment.value / total) * 100)})` : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ChartCard>
  );
}

function niceBounds(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const pad = span * 0.25;
  const step = span > 80 ? 20 : span > 30 ? 10 : span > 12 ? 5 : 2;
  const min = Math.floor((lo - pad) / step) * step;
  let max = Math.ceil((hi + pad) / step) * step;
  if (max === min) max = min + 2 * step;
  // Keep the middle gridline on a round number too.
  if (((max - min) / step) % 2 === 1) max += step;
  return { min, max };
}

/**
 * Simple trend line with value labels.
 * @param {{ points: { label: string, value: number | null }[], width: number, height?: number, title?: string, flex?: number, digits?: number }} props
 */
export function LineChartCard({ points, width, height = 92, title, flex = 1, digits = 1 }) {
  const valid = points.filter((point) => point.value != null);
  const padL = 26;
  const padR = 12;
  const padT = 12;
  const padB = 16;
  const plotW = Math.max(width - padL - padR, 10);
  const plotH = Math.max(height - padT - padB, 10);
  const bounds = valid.length ? niceBounds(valid.map((point) => point.value)) : { min: 0, max: 1 };
  const xFor = (index) =>
    points.length === 1 ? padL + plotW / 2 : padL + (plotW * index) / (points.length - 1);
  const yFor = (value) => padT + plotH - ((value - bounds.min) / (bounds.max - bounds.min)) * plotH;
  const coords = points
    .map((point, index) => (point.value == null ? null : { x: xFor(index), y: yFor(point.value), ...point }))
    .filter(Boolean);
  const mid = (bounds.min + bounds.max) / 2;

  return (
    <ChartCard title={title} flex={flex}>
      <View style={{ width, height, position: 'relative' }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {[bounds.min, mid, bounds.max].map((tick) => (
            <Line
              key={tick}
              x1={padL}
              x2={padL + plotW}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke={theme.line}
              strokeWidth={0.6}
            />
          ))}
          {coords.length > 1 ? (
            <Polyline
              points={coords.map((point) => `${point.x},${point.y}`).join(' ')}
              stroke={theme.accent}
              strokeWidth={1.6}
              fill="none"
            />
          ) : null}
          {coords.map((point) => (
            <Circle key={point.label} cx={point.x} cy={point.y} r={2.6} fill="#ffffff" stroke={theme.accent} strokeWidth={1.4} />
          ))}
        </Svg>
        {[bounds.min, mid, bounds.max].map((tick) => (
          <Text
            key={`y-${tick}`}
            style={{ position: 'absolute', left: 0, width: padL - 4, top: yFor(tick) - 4, fontSize: 5.5, color: theme.muted, textAlign: 'right' }}
          >
            {formatNum(tick, 0)}
          </Text>
        ))}
        {coords.map((point) => (
          <Text
            key={`v-${point.label}`}
            style={{ position: 'absolute', left: point.x - 22, width: 44, top: point.y - 12, fontSize: 6, fontWeight: 700, color: theme.ink, textAlign: 'center' }}
          >
            {formatNum(point.value, digits)}
          </Text>
        ))}
        {points.map((point, index) => (
          <Text
            key={`x-${point.label}-${index}`}
            style={{ position: 'absolute', left: xFor(index) - 20, width: 40, top: height - 11, fontSize: 5.5, color: theme.muted, textAlign: 'center' }}
          >
            {point.label}
          </Text>
        ))}
      </View>
    </ChartCard>
  );
}

/** Inline success bar for table cells. */
export function SuccessBar({ value, max = 100, showValue = true, digits = 0 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = pct >= 75 ? CHART.correct : pct >= 50 ? theme.accent : pct >= 30 ? '#d97706' : CHART.wrong;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={s.inlineTrack}>
        <View style={{ height: 5, borderRadius: 3, width: `${pct}%`, backgroundColor: tone }} />
      </View>
      {showValue ? (
        <Text style={{ width: 26, fontSize: 6.5, fontWeight: 700, textAlign: 'right', color: theme.body }}>
          {formatNum(value, digits)}%
        </Text>
      ) : null}
    </View>
  );
}

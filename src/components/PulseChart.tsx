import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

const STROKE_W = 2;
const STROKE_HALF = STROKE_W / 2;

type Props = {
  /** Tap-aligned bins (preferred). Flat/zero where there were no taps in that slice of the track. */
  waveform?: number[] | null;
  /** Legacy: 12-D signature — only used if waveform is missing */
  vector?: number[];
  width: number;
  height: number;
  timeLabels?: string[];
  /** Horizontal inset so the stroke stays inside the drawable area (px). */
  horizontalInset?: number;
};

function waveformToPath(
  wave: number[],
  width: number,
  height: number,
  insetX: number,
  strokeHalf: number
): string {
  const n = wave.length;
  if (n < 2) return '';
  const padX = insetX + strokeHalf;
  const innerW = Math.max(4, width - 2 * padX);
  const step = innerW / (n - 1);
  const bottom = height - 6 - strokeHalf;
  const topPad = 12 + strokeHalf;
  const usable = Math.max(8, bottom - topPad);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, wave[i] ?? 0));
    const y = bottom - v * usable;
    const x = padX + i * step;
    out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return out.join(' ');
}

export function PulseChart({ waveform, vector, width, height, timeLabels, horizontalInset = 14 }: Props) {
  const inset = horizontalInset;
  const clipIdRef = useRef(`pc_${Math.random().toString(36).slice(2, 11)}`);
  const gradIdRef = useRef(`pf_${Math.random().toString(36).slice(2, 11)}`);
  const clipId = clipIdRef.current;
  const gradId = gradIdRef.current;

  const path = useMemo(() => {
    if (waveform && waveform.length > 1) {
      return waveformToPath(waveform, width, height, inset, STROKE_HALF);
    }
    const v = vector?.length ? vector : [0.15];
    const pts = 48;
    const padX = inset + STROKE_HALF;
    const innerW = Math.max(4, width - 2 * padX);
    const step = innerW / (pts - 1);
    const base = [0.12, ...v.slice(0, 6), 0.12];
    const out: string[] = [];
    const bottom = height - 10 - STROKE_HALF;
    const topY = 14 + STROKE_HALF;
    const usableY = Math.max(8, bottom - topY);
    for (let i = 0; i < pts; i++) {
      const idx = Math.floor((i / pts) * base.length) % base.length;
      const val = Math.max(0.06, Math.min(1, base[idx]));
      const y = bottom - val * usableY;
      const x = padX + i * step;
      out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return out.join(' ');
  }, [waveform, vector, width, height, inset]);

  const padX = inset + STROKE_HALF;
  const fillPath = `${path} L ${width - padX} ${height} L ${padX} ${height} Z`;

  const w = Math.max(1, Math.floor(width));

  return (
    <View style={{ width: w, maxWidth: '100%', alignSelf: 'center', borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={w} height={height} />
          </ClipPath>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <Path d={fillPath} fill={`url(#${gradId})`} />
          <Path stroke={colors.accent} strokeWidth={STROKE_W} fill="none" d={path} />
        </G>
      </Svg>
      {timeLabels && timeLabels.length ? (
        <View
          style={{
            flexDirection: 'row',
            width: '100%',
            marginTop: 6,
            paddingHorizontal: 4,
            overflow: 'hidden',
          }}
        >
          {timeLabels.map((t, i) => (
            <Text
              key={`${t}-${i}`}
              numberOfLines={1}
              style={[
                {
                  flex: 1,
                  minWidth: 0,
                  color: colors.muted,
                  fontSize: 11,
                  textAlign: i === 0 ? 'left' : i === timeLabels.length - 1 ? 'right' : 'center',
                },
                font('regular'),
              ]}
            >
              {t}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

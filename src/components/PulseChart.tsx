import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

type Props = {
  /** Tap-aligned bins (preferred). Flat/zero where there were no taps in that slice of the track. */
  waveform?: number[] | null;
  /** Legacy: 12-D signature — only used if waveform is missing */
  vector?: number[];
  width: number;
  height: number;
  timeLabels?: string[];
  /** Horizontal inset so the stroke stays inside the card (px). */
  horizontalInset?: number;
};

function waveformToPath(wave: number[], width: number, height: number, insetX: number): string {
  const n = wave.length;
  if (n < 2) return '';
  const innerW = Math.max(4, width - 2 * insetX);
  const step = innerW / (n - 1);
  const bottom = height - 6;
  const topPad = 12;
  const usable = height - topPad - 10;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, wave[i] ?? 0));
    const y = bottom - v * usable;
    const x = insetX + i * step;
    out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return out.join(' ');
}

export function PulseChart({ waveform, vector, width, height, timeLabels, horizontalInset = 14 }: Props) {
  const inset = horizontalInset;
  const path = useMemo(() => {
    if (waveform && waveform.length > 1) {
      return waveformToPath(waveform, width, height, inset);
    }
    const v = vector?.length ? vector : [0.15];
    const pts = 48;
    const innerW = Math.max(4, width - 2 * inset);
    const step = innerW / (pts - 1);
    const base = [0.12, ...v.slice(0, 6), 0.12];
    const out: string[] = [];
    for (let i = 0; i < pts; i++) {
      const t = i / (pts - 1);
      const idx = Math.floor((i / pts) * base.length) % base.length;
      const val = Math.max(0.06, Math.min(1, base[idx]));
      const y = height - 10 - val * (height - 28);
      const x = inset + i * step;
      out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return out.join(' ');
  }, [waveform, vector, width, height, inset]);

  const fillPath = `${path} L ${width - inset} ${height} L ${inset} ${height} Z`;

  return (
    <View style={{ width, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#pulseFill)" />
        <Path stroke={colors.accent} strokeWidth={2} fill="none" d={path} />
      </Svg>
      {timeLabels && timeLabels.length ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 6,
            paddingHorizontal: 2,
          }}
        >
          {timeLabels.map((t) => (
            <Text key={t} style={[{ color: colors.muted, fontSize: 11 }, font('regular')]}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

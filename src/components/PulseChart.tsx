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
};

function waveformToPath(wave: number[], width: number, height: number): string {
  const n = wave.length;
  if (n < 2) return '';
  const step = width / (n - 1);
  const bottom = height - 4;
  const topPad = 10;
  const usable = height - topPad - 8;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(1, wave[i] ?? 0));
    const y = bottom - v * usable;
    const x = i * step;
    out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return out.join(' ');
}

export function PulseChart({ waveform, vector, width, height, timeLabels }: Props) {
  const path = useMemo(() => {
    if (waveform && waveform.length > 1) {
      return waveformToPath(waveform, width, height);
    }
    const v = vector?.length ? vector : [0.15];
    const pts = 48;
    const step = width / (pts - 1);
    const base = [0.12, ...v.slice(0, 6), 0.12];
    const out: string[] = [];
    for (let i = 0; i < pts; i++) {
      const t = i / (pts - 1);
      const idx = Math.floor((i / pts) * base.length) % base.length;
      const val = Math.max(0.06, Math.min(1, base[idx]));
      const y = height - 8 - val * (height - 24);
      const x = i * step;
      out.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    return out.join(' ');
  }, [waveform, vector, width, height]);

  const fillPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <View>
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

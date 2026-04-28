import React, { useMemo } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';

type Props = {
  /** 12-D (or any) signature — cyclic sample when no `samples` */
  vector?: number[];
  /** Time-series samples (e.g. waveform bins); resampled to `barCount` */
  samples?: number[];
  barCount?: number;
};

/**
 * Mini bar visualization — uses flex so the row never exceeds parent width (no horizontal spill).
 */
export function MiniPulseBars({ vector, samples, barCount = 24 }: Props) {
  const heights = useMemo(() => {
    if (samples?.length) {
      const out: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const t = (i / Math.max(barCount - 1, 1)) * (samples.length - 1);
        const j = Math.floor(t);
        const f = t - j;
        const a = samples[j] ?? 0;
        const b = samples[j + 1] ?? a;
        const v = a + f * (b - a);
        out.push(Math.max(0, Math.min(1, v)));
      }
      return out;
    }
    const base = vector?.length ? vector : [0.5];
    const out: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const v = base[i % base.length];
      const wobble = Math.sin((i / barCount) * Math.PI * 2) * 0.08;
      out.push(Math.max(0.15, Math.min(1, v + wobble)));
    }
    return out;
  }, [vector, samples, barCount]);

  const maxH = 48;
  return (
    <View style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', borderRadius: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: 54,
          width: '100%',
          paddingHorizontal: 2,
          gap: 2,
        }}
      >
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              height: 4 + h * maxH,
              maxHeight: 52,
              backgroundColor: colors.accent,
              borderRadius: 2,
              opacity: 0.9,
            }}
          />
        ))}
      </View>
    </View>
  );
}

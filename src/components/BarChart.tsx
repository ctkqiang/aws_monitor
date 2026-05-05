import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { SPACING, TYPOGRAPHY } from '@/theme/ThemeContext';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarChartDataPoint[];
  maxValue?: number;
  height?: number;
  formatValue?: (v: number) => string;
  showLabels?: boolean;
  emptyMessage?: string;
}

export default function BarChart({
  data,
  maxValue: maxProp,
  height = 200,
  formatValue = (v) => `$${v.toFixed(2)}`,
  showLabels = true,
  emptyMessage = 'No data available',
}: Props) {
  const theme = useTheme();

  const maxValue = maxProp ?? Math.max(...data.map((d) => d.value), 1) * 1.15;
  const barAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = barAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: i * 60,
        useNativeDriver: false,
      }),
    );
    Animated.parallel(animations).start();
  }, [data]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{emptyMessage}</Text>
      </View>
    );
  }

  const barWidth = Math.max(6, Math.min(28, (300 / data.length) - 4));
  const gap = Math.max(2, Math.min(6, 8 - data.length * 0.1));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.chartArea, { height }]}>
        <View style={styles.gridLines}>
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { bottom: `${pct * 100}%`, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.gridLabel, { color: theme.textMuted }]}>
                {formatValue(maxValue * (1 - pct))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.barsContainer}>
          {data.map((point, i) => {
            const barHeight = maxValue > 0 ? (point.value / maxValue) * (height - 30) : 0;

            return (
              <View key={i} style={[styles.barColumn, { marginHorizontal: gap }]}>
                <View style={styles.barSpace}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: barAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, barHeight],
                        }),
                        width: barWidth,
                        backgroundColor: point.color || theme.accent,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                      },
                    ]}
                  >
                    <Animated.Text
                      style={[
                        styles.barValue,
                        { color: '#fff', opacity: barAnims[i].interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }) },
                      ]}
                    >
                      {point.value > 0 ? formatValue(point.value) : ''}
                    </Animated.Text>
                  </Animated.View>
                </View>
                {showLabels ? (
                  <Text
                    style={[styles.barLabel, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {point.label}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  chartArea: { position: 'relative', paddingBottom: 24 },
  gridLines: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gridLabel: { ...TYPOGRAPHY.monoSm, position: 'absolute', left: 4, top: -8 },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 44,
    paddingRight: SPACING.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: 36,
    minWidth: 10,
  },
  barSpace: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    overflow: 'hidden',
  },
  barValue: {
    ...TYPOGRAPHY.monoSm,
    fontWeight: '600',
    fontSize: 8,
  },
  barLabel: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
  },
});

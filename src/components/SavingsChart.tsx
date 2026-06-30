import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SavingsChartItem = {
  label: string;
  value: number;
};

type SavingsChartProps = {
  title: string;
  subtitle?: string;
  data?: SavingsChartItem[];
};

export function SavingsChart({ title, subtitle, data = [] }: SavingsChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.totalPill}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>Tk {totalValue.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.chartRow}>
        {data.map((item) => (
          <View key={item.label} style={styles.column}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%` },
                ]}
              />
            </View>
            <Text style={styles.value}>Tk {item.value.toLocaleString()}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#173629',
    marginTop: 12,
    padding: 20,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#29503E',
    shadowColor: '#0A1B14',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF9F0',
  },
  subtitle: {
    fontSize: 12,
    color: '#B7CCBF',
    marginTop: 4,
  },
  totalPill: {
    backgroundColor: '#F7EBD2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ECD7A4',
    minWidth: 92,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B641E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4D3710',
    marginTop: 4,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 18,
    minHeight: 180,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    justifyContent: 'flex-end',
    backgroundColor: '#214637',
    padding: 5,
    borderWidth: 1,
    borderColor: '#315C49',
  },
  bar: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#C6E0A8',
    minHeight: 8,
  },
  value: {
    fontSize: 10,
    color: '#E9F2EB',
    marginTop: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF9F0',
    marginTop: 4,
  },
});

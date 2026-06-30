import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { goalService, transactionService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';

const isCurrentMonth = (dateValue: string) => {
  const date = new Date(dateValue);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const buildWeeklyTotals = (transactions: any[]) => {
  const labels = ['W1', 'W2', 'W3', 'W4'];
  const totals = labels.map((label) => ({ label, value: 0 }));

  transactions.forEach((item: any) => {
    const dateValue = item.createdAt || item.date;
    if (!isCurrentMonth(dateValue) || item.type !== 'deposit') {
      return;
    }

    const weekIndex = Math.min(3, Math.floor((new Date(dateValue).getDate() - 1) / 7));
    totals[weekIndex].value += Number(item.amount);
  });

  return totals;
};

const buildCategoryAnalytics = (goals: any[]) => {
  const colorMap: Record<string, string> = {
    investment: '#2D8C62',
    travel: '#3D7CF4',
    education: '#E39B16',
    emergency: '#D95D4C',
  };

  const totals = goals.reduce((acc: Record<string, number>, goal: any) => {
    const key = goal.category || 'investment';
    acc[key] = (acc[key] || 0) + Number(goal.currentAmount || goal.current || 0);
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([key, value]) => ({
      key,
      value: Number(value),
      color: colorMap[key] || '#2D8C62',
    }))
    .sort((a, b) => b.value - a.value);
};

export default function MonthlyReportScreen() {
  const [report, setReport] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsResponse, transactionsResponse, settings] = await Promise.all([
        goalService.getGoals(),
        transactionService.getTransactions(),
        getStoredAppSettings(),
      ]);
      const goals = goalsResponse.data || [];
      const transactions = transactionsResponse.data || [];
      const monthlyTransactions = transactions.filter((item: any) =>
        isCurrentMonth(item.createdAt || item.date)
      );
      const totalDeposits = monthlyTransactions
        .filter((item: any) => item.type === 'deposit')
        .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
      const totalWithdrawals = monthlyTransactions
        .filter((item: any) => item.type === 'withdrawal')
        .reduce((sum: number, item: any) => sum + Number(item.amount), 0);
      const topGoal = [...goals]
        .sort((a: any, b: any) => {
          const aProgress = Number(a.targetAmount) > 0 ? Number(a.currentAmount || 0) / Number(a.targetAmount) : 0;
          const bProgress = Number(b.targetAmount) > 0 ? Number(b.currentAmount || 0) / Number(b.targetAmount) : 0;
          return bProgress - aProgress;
        })[0];

      setReport({
        totalDeposits,
        totalWithdrawals,
        netSavings: totalDeposits - totalWithdrawals,
        transactionCount: monthlyTransactions.length,
        topGoal,
        weeklyTotals: buildWeeklyTotals(transactions),
        categoryAnalytics: buildCategoryAnalytics(goals),
      });
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading monthly report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  const text = getCopy(language);
  const categoryLabelMap: Record<string, string> = {
    investment: text.invest,
    travel: text.travel,
    education: text.study,
    emergency: text.emergency,
  };
  const maxWeeklyValue = Math.max(
    1,
    ...(report?.weeklyTotals || []).map((item: any) => item.value)
  );
  const maxCategoryValue = Math.max(
    1,
    ...(report?.categoryAnalytics || []).map((item: any) => item.value)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadReport} />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{text.monthlyReport}</Text>
        <Text style={styles.heroText}>{text.monthlyReportCaption}</Text>
      </View>

      <View style={styles.metricGrid}>
        <View style={[styles.metricCard, styles.metricCardGreen]}>
          <Text style={styles.metricLabel}>{text.depositsLabel}</Text>
          <Text style={styles.metricValue}>Tk {report?.totalDeposits?.toLocaleString() || 0}</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardRed]}>
          <Text style={styles.metricLabel}>{text.withdrawalsLabel}</Text>
          <Text style={styles.metricValue}>Tk {report?.totalWithdrawals?.toLocaleString() || 0}</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardDark]}>
          <Text style={[styles.metricLabel, styles.metricLabelLight]}>{text.netSavings}</Text>
          <Text style={[styles.metricValue, styles.metricValueLight]}>
            Tk {report?.netSavings?.toLocaleString() || 0}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{text.transactionsLabel}</Text>
          <Text style={styles.metricValue}>{report?.transactionCount || 0}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.weeklyDepositTrend}</Text>
        <View style={styles.chartRow}>
          {(report?.weeklyTotals || []).map((item: any) => (
            <View key={item.label} style={styles.barItem}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: `${Math.max(8, Math.round((item.value / maxWeeklyValue) * 100))}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>Tk {item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.bestGoalThisMonth}</Text>
        {report?.topGoal ? (
          <View style={styles.goalCard}>
            <Text style={styles.goalIcon}>{report.topGoal.icon}</Text>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{report.topGoal.title}</Text>
              <Text style={styles.goalMeta}>
                {Math.round((Number(report.topGoal.currentAmount || 0) / Math.max(1, Number(report.topGoal.targetAmount || 1))) * 100)}% {text.completed.toLowerCase()}
              </Text>
              <Text style={styles.goalMeta}>
                Tk {Number(report.topGoal.currentAmount || 0).toLocaleString()} of Tk {Number(report.topGoal.targetAmount || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>{text.noGoalsForReport}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.goalCategoryAnalytics}</Text>
        {(report?.categoryAnalytics || []).map((item: any) => (
          <View key={item.key} style={styles.categoryRow}>
            <View style={styles.categoryTopRow}>
              <Text style={styles.categoryLabel}>{categoryLabelMap[item.key] || item.key}</Text>
              <Text style={styles.categoryValue}>Tk {item.value.toLocaleString()}</Text>
            </View>
            <View style={styles.categoryTrack}>
              <View
                style={[
                  styles.categoryFill,
                  {
                    width: `${Math.max(10, Math.round((item.value / maxCategoryValue) * 100))}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.insights}</Text>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>{text.savingPace}</Text>
          <Text style={styles.insightText}>
            {report?.netSavings >= 0
              ? text.positiveSavingsInsight
              : text.negativeSavingsInsight}
          </Text>
        </View>
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>{text.recommendedNextStep}</Text>
          <Text style={styles.insightText}>{text.recommendedNextStepText}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#173629',
    borderWidth: 1,
    borderColor: '#29503F',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  heroText: {
    fontSize: 13,
    color: '#B8D4C7',
    marginTop: 6,
    lineHeight: 19,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
  },
  metricCardGreen: {
    backgroundColor: '#E9F7EE',
  },
  metricCardRed: {
    backgroundColor: '#FFF1EF',
  },
  metricCardDark: {
    backgroundColor: '#173629',
    borderColor: '#29503F',
  },
  metricLabel: {
    fontSize: 12,
    color: '#60756B',
    marginBottom: 6,
  },
  metricLabelLight: {
    color: '#B8D4C7',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10201A',
  },
  metricValueLight: {
    color: '#FFF',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10201A',
    marginBottom: 14,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 170,
    gap: 10,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 42,
    height: 110,
    borderRadius: 14,
    backgroundColor: '#E6EFEA',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#2D8C62',
    borderRadius: 14,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#35594B',
    marginTop: 10,
  },
  barValue: {
    fontSize: 11,
    color: '#60756B',
    marginTop: 4,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FBF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 14,
  },
  goalIcon: {
    fontSize: 34,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10201A',
  },
  goalMeta: {
    fontSize: 13,
    color: '#60756B',
    marginTop: 4,
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10201A',
  },
  categoryValue: {
    fontSize: 12,
    color: '#60756B',
  },
  categoryTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E6EFEA',
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
  },
  insightCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#E2ECE7',
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10201A',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#60756B',
  },
  emptyText: {
    fontSize: 13,
    color: '#60756B',
  },
});

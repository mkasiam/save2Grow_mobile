import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { goalService, transactionService, userService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';
import { ScreenLoadingOverlay, SavingsChart } from '../components';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

type DashboardGoal = {
  id: string;
  entityType?: 'goal' | 'userChallenge';
  title: string;
  description?: string;
  target: number;
  current: number;
  category: string;
  icon: string;
  startDate?: string;
  targetDate?: string;
  status: string;
};

type DashboardTransaction = {
  id: string;
  goalId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  description: string;
  paymentMethod?: string;
  note?: string;
};

type DashboardStats = {
  totalSavings: number;
  activeGoals: number;
  completedGoals: number;
  achievements: number;
};

const mapGoal = (goal: any): DashboardGoal => ({
  id: goal._id || goal.id,
  entityType: goal.entityType || goal.sourceType || 'goal',
  title: goal.title,
  description: goal.description,
  target: Number(goal.targetAmount || goal.target || 0),
  current: Number(goal.currentAmount || goal.current || 0),
  category: goal.category,
  icon: goal.icon || '🎯',
  startDate: goal.createdAt ? new Date(goal.createdAt).toISOString().slice(0, 10) : goal.startDate,
  targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : goal.targetDate,
  status: goal.status,
});

const mapTransaction = (transaction: any): DashboardTransaction => ({
  id: transaction._id || transaction.id,
  goalId: transaction.goalId?._id || transaction.goalId || '',
  type: transaction.type,
  amount: Number(transaction.amount || 0),
  date: transaction.createdAt ? new Date(transaction.createdAt).toISOString().slice(0, 10) : transaction.date,
  description: transaction.description || 'Manual deposit',
  paymentMethod: transaction.paymentMethod,
  note: transaction.note,
});

const buildMonthlySeries = (transactions: DashboardTransaction[]) => {
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr'];
  const monthTotals: { label: string; value: number }[] = monthLabels.map((label) => ({
    label,
    value: 0,
  }));

  transactions.forEach((item: DashboardTransaction) => {
    const monthIndex = new Date(item.date).getMonth();
    if (monthIndex >= 0 && monthIndex < monthTotals.length && item.type === 'deposit') {
      monthTotals[monthIndex].value += Number(item.amount);
    }
  });

  return monthTotals;
};

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [goals, setGoals] = useState<DashboardGoal[]>([]);
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (!user?.id) {
        return;
      }

      const [profileResponse, statsResponse, goalsResponse, transactionsResponse, settings] = await Promise.all([
        userService.getProfile(user.id),
        userService.getStats(user.id),
        goalService.getGoals(),
        transactionService.getTransactions(),
        getStoredAppSettings(),
      ]);

      const mappedGoals = (goalsResponse.data || []).map(mapGoal);
      const mappedTransactions = (transactionsResponse.data || []).map(mapTransaction);
      const completedGoals = mappedGoals.filter((item: DashboardGoal) => item.status === 'completed').length;

      setStats({
        totalSavings: Number(statsResponse.data?.totalSavings || 0),
        activeGoals: mappedGoals.filter((item: DashboardGoal) => item.status !== 'completed').length,
        completedGoals,
        achievements: Math.max(1, completedGoals + Math.round(Number(statsResponse.data?.totalSavings || 0) / 10000)),
      });
      setGoals(mappedGoals);
      setTransactions(mappedTransactions);
      setProfileUser(profileResponse.data);
      setLanguage(settings.language);
      setUnreadCount(mappedGoals.filter((goal: DashboardGoal) => {
        if (!goal.targetDate || goal.status === 'completed') {
          return false;
        }

        const daysUntilTarget = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilTarget >= 0 && daysUntilTarget <= 3;
      }).length);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setStats(null);
      setGoals([]);
      setTransactions([]);
      setUnreadCount(0);
      setLanguage((prev) => prev);
      // Keep the failure visible without leaking internals.
      setProfileUser((prev: any) => prev);
      setGoals([]);
      setTransactions([]);
      setUnreadCount(0);
      setStats(null);
      setProfileUser((prev: any) => prev);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const text = getCopy(language);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.greeting}>{text.dashboardTitle}</Text>
          <Text style={styles.userName}>{profileUser?.name || user?.name || text.studentFallback}</Text>
          <Text style={styles.motto}>{text.savingsMotto}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#173629" />
            {unreadCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={50} color="#1E8E5A" />
          </View>
        </View>
      </View>

      {stats && (
        <>
          <View style={styles.savingsHero}>
            <View style={styles.savingsHeroTop}>
              <View>
                <Text style={styles.savingsHeroEyebrow}>{text.totalSavings}</Text>
                <Text style={styles.savingsHeroValue}>
                  Tk {stats.totalSavings.toLocaleString()}
                </Text>
                <Text style={styles.savingsHeroCaption}>{text.savingsMomentumCaption}</Text>
              </View>
              <View style={styles.savingsHeroIconWrap}>
                <Text style={styles.savingsHeroIcon}>💰</Text>
              </View>
            </View>
            <View style={styles.savingsHeroFooter}>
              <View style={styles.savingsMiniStat}>
                <Text style={styles.savingsMiniLabel}>{text.activeGoals}</Text>
                <Text style={styles.savingsMiniValue}>{stats.activeGoals}</Text>
              </View>
              <View style={styles.savingsDivider} />
              <View style={styles.savingsMiniStat}>
                <Text style={styles.savingsMiniLabel}>{text.completed}</Text>
                <Text style={styles.savingsMiniValue}>{stats.completedGoals}</Text>
              </View>
              <View style={styles.savingsDivider} />
              <View style={styles.savingsMiniStat}>
                <Text style={styles.savingsMiniLabel}>{text.achievements}</Text>
                <Text style={styles.savingsMiniValue}>{stats.achievements}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCard2]}>
              <Text style={styles.icon}>🎯</Text>
              <Text style={styles.statLabel}>{text.activeGoals}</Text>
              <Text style={styles.statValue}>{stats.activeGoals}</Text>
            </View>
            <View style={[styles.statCard, styles.statCard3]}>
              <Text style={styles.icon}>✅</Text>
              <Text style={styles.statLabel}>{text.completed}</Text>
              <Text style={styles.statValue}>{stats.completedGoals}</Text>
            </View>
          </View>
        </>
      )}

      <SavingsChart
        title={text.totalSavings}
        subtitle={text.monthlyDepositTrend}
        data={buildMonthlySeries(transactions)}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{text.recentGoals}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={styles.seeAll}>{text.seeAll}</Text>
          </TouchableOpacity>
        </View>

        {goals.slice(0, 3).map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={styles.goalItem}
            onPress={() => goal.entityType === 'userChallenge'
              ? navigation.navigate('ChallengeDetail', { challengeId: goal.id })
              : navigation.navigate('GoalDetail', { goalId: goal.id })}
          >
            <View style={styles.goalLeft}>
              <Text style={styles.goalIcon}>{goal.icon}</Text>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalProgress}>
                  {Math.round((goal.current / goal.target) * 100)}% {text.completed.toLowerCase()}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{text.recentTransactions}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={styles.seeAll}>{text.seeAll}</Text>
          </TouchableOpacity>
        </View>
        {transactions.slice(0, 3).map((transaction) => (
          <TouchableOpacity
            key={transaction.id}
            style={styles.transactionItem}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <View style={styles.transactionLeft}>
              <Text style={styles.transactionIcon}>
                {transaction.type === 'deposit' ? '➕' : '➖'}
              </Text>
              <View>
                <Text style={styles.transactionTitle}>{transaction.description}</Text>
                <Text style={styles.transactionMeta}>
                  {(transaction.paymentMethod || 'manual').toUpperCase()} • {transaction.date}
                </Text>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <View
                style={[
                  styles.transactionTypeBadge,
                  transaction.type === 'deposit'
                    ? styles.depositBadge
                    : styles.withdrawBadge,
                ]}
              >
                <Text
                  style={[
                    styles.transactionTypeText,
                    transaction.type === 'deposit'
                      ? styles.depositAmount
                      : styles.withdrawAmount,
                  ]}
                >
                  {transaction.type === 'deposit' ? text.transactionTypeDeposit : text.transactionTypeWithdraw}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  transaction.type === 'deposit'
                    ? styles.depositAmount
                    : styles.withdrawAmount,
                ]}
              >
                {transaction.type === 'deposit' ? '+' : '-'}Tk{' '}
                {Number(transaction.amount).toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.quickActions}</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Goals')}
          >
            <Ionicons name="add-circle" size={32} color="#007AFF" />
            <Text style={styles.actionText}>{text.addGoal}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Goals')}
          >
            <Ionicons name="trending-up" size={32} color="#34C759" />
            <Text style={styles.actionText}>{text.addSavings}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Challenges')}
          >
            <Ionicons name="trophy" size={32} color="#FF9500" />
            <Text style={styles.actionText}>{text.challenges}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Achievements')}
          >
            <Ionicons name="ribbon" size={32} color="#7D5FFF" />
            <Text style={styles.actionText}>{text.achievements}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.spacing} />

      <ScreenLoadingOverlay visible={loading} message="Loading dashboard..." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F7F4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: '#E8F4EE',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8DE',
  },
  headerGlow: {
    position: 'absolute',
    right: -20,
    top: -26,
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.38)',
    transform: [{ rotate: '18deg' }],
  },
  headerTextWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: '#4F6C5F',
    marginTop: 12,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0E2018',
    marginTop: 2,
  },
  motto: {
    fontSize: 12,
    marginTop: 6,
    color: '#5E776C',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D7EDE0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#D9EEE2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#D94C3D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E8F4EE',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
  },
  savingsHero: {
    marginHorizontal: 20,
    marginTop: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#163E2C',
    shadowColor: '#0E2A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 5,
  },
  savingsHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  savingsHeroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A9D2BD',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  savingsHeroValue: {
    fontSize: 31,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 8,
  },
  savingsHeroCaption: {
    fontSize: 13,
    color: '#B9D6C7',
    marginTop: 10,
    maxWidth: 240,
    lineHeight: 18,
  },
  savingsHeroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsHeroIcon: {
    fontSize: 28,
  },
  savingsHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  savingsMiniStat: {
    flex: 1,
  },
  savingsMiniLabel: {
    fontSize: 11,
    color: '#A9D2BD',
  },
  savingsMiniValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
  },
  savingsDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DFECE5',
  },
  statCard1: {
    backgroundColor: '#ECF8F0',
  },
  statCard2: {
    backgroundColor: '#E8F3FF',
  },
  statCard3: {
    backgroundColor: '#FFF5E7',
  },
  statCard4: {
    backgroundColor: '#F5ECFF',
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#567167',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#13241D',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2ECE7',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10201A',
  },
  seeAll: {
    color: '#1E8E5A',
    fontWeight: '600',
    fontSize: 14,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF1EE',
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10201A',
  },
  goalProgress: {
    fontSize: 12,
    color: '#5A6F64',
    marginTop: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF1EE',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10201A',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#5A6F64',
    marginTop: 3,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  depositBadge: {
    backgroundColor: '#E7F5EC',
  },
  withdrawBadge: {
    backgroundColor: '#FCEBE8',
  },
  transactionTypeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  depositAmount: {
    color: '#1E8E5A',
  },
  withdrawAmount: {
    color: '#D94C3D',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#F7FBF8',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFEBE4',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#173126',
    marginTop: 8,
  },
  spacing: {
    height: 30,
  },
});

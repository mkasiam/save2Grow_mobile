import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { challengeService, goalService, notificationService, transactionService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';

const getNotificationAccent = (type: string) => {
  if (type === 'achievement') {
    return { bg: '#E9F7EE', fg: '#1E8E5A', icon: '🏆' };
  }
  if (type === 'challenge') {
    return { bg: '#FFF4E4', fg: '#C77700', icon: '🎯' };
  }

  return { bg: '#EAF1FF', fg: '#2B63C6', icon: '🔔' };
};

const getParticipantId = (participant: any) => {
  if (!participant) {
    return null;
  }

  if (typeof participant === 'string') {
    return participant;
  }

  return participant.id || participant._id || null;
};

const buildNotifications = (goals: any[], transactions: any[], challenges: any[], userId?: string) => {
  const now = Date.now();
  const in7Days = now + 7 * 24 * 60 * 60 * 1000;

  const goalAlerts = goals
    .filter((goal) => {
      if (!goal.targetDate || goal.status === 'completed') {
        return false;
      }

      const targetMs = new Date(goal.targetDate).getTime();
      return targetMs >= now && targetMs <= in7Days;
    })
    .map((goal) => ({
      id: `goal-deadline-${goal._id || goal.id}`,
      title: 'Goal deadline approaching',
      message: `${goal.title} is due on ${new Date(goal.targetDate).toLocaleDateString()}.`,
      type: 'reminder',
      timestamp: goal.targetDate,
      read: false,
    }));

  const recentTx = transactions
    .slice(0, 8)
    .map((tx) => ({
      id: `tx-${tx._id || tx.id}`,
      title: tx.type === 'deposit' ? 'Deposit completed' : 'Withdrawal completed',
      message: `Tk ${Number(tx.amount || 0).toLocaleString()} ${tx.type} recorded.`,
      type: tx.type === 'deposit' ? 'achievement' : 'reminder',
      timestamp: tx.createdAt || tx.date,
      read: false,
    }));

  const challengeJoined = challenges
    .filter((challenge) => {
      const participants = Array.isArray(challenge.participantIds) ? challenge.participantIds : [];
      return Boolean(userId && participants.some((participant: any) => getParticipantId(participant) === userId));
    })
    .slice(0, 4)
    .map((challenge) => ({
      id: `challenge-${challenge._id || challenge.id}`,
      title: 'Challenge joined',
      message: `You are participating in ${challenge.title}.`,
      type: 'challenge',
      timestamp: challenge.createdAt || new Date().toISOString(),
      read: true,
    }));

  return [...goalAlerts, ...recentTx, ...challengeJoined]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsResponse, transactionsResponse, challengesResponse, backendNotificationsResponse, settings] = await Promise.all([
        goalService.getGoals(),
        transactionService.getTransactions(),
        challengeService.getChallenges(),
        notificationService.getNotifications(),
        getStoredAppSettings(),
      ]);

      const built = buildNotifications(
        goalsResponse.data || [],
        transactionsResponse.data || [],
        challengesResponse.data || [],
        user?.id,
      );

      const backendNotifications = (backendNotificationsResponse.data || []).map((item: any) => ({
        id: item._id || item.id,
        title: item.title,
        message: item.body,
        type: item.type || 'system',
        timestamp: item.createdAt,
        read: Boolean(item.read),
      }));

      const merged = [...backendNotifications, ...built]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);

      setNotifications(merged);
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      return () => {};
    }, [loadNotifications])
  );

  const text = getCopy(language);

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{text.notifications}</Text>
        <Text style={styles.heroText}>{text.notificationsCaption}</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotifications} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const accent = getNotificationAccent(item.type);

          return (
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
                <Text style={[styles.icon, { color: accent.fg }]}>{accent.icon}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.cardText}>{item.message}</Text>
                <Text style={styles.cardTime}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
            <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{text.noNotificationsYet}</Text>
            <Text style={styles.emptyText}>{text.notificationsEmptyCaption}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  heroCard: {
    margin: 20,
    marginBottom: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#173629',
    borderWidth: 1,
    borderColor: '#29503F',
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10201A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1E8E5A',
  },
  cardText: {
    fontSize: 13,
    color: '#60756B',
    lineHeight: 18,
    marginTop: 4,
  },
  cardTime: {
    fontSize: 11,
    color: '#87988F',
    marginTop: 8,
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10201A',
  },
  emptyText: {
    fontSize: 13,
    color: '#60756B',
    textAlign: 'center',
    marginTop: 8,
  },
});

import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { challengeService, goalService, transactionService, userService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';

const getParticipantId = (participant: any) => {
  if (!participant) {
    return null;
  }

  if (typeof participant === 'string') {
    return participant;
  }

  return participant.id || participant._id || null;
};

const buildAchievements = (data: any, text: any) => {
  const completedGoals = data.goals.filter((item: any) => item.status === 'completed').length;
  const joinedChallenges = data.challenges.length;
  const depositCount = data.transactions.filter((item: any) => item.type === 'deposit').length;
  const withdrawalCount = data.transactions.filter((item: any) => item.type === 'withdrawal').length;
  const totalSavings = Number(data.stats.totalSavings || 0);

  return [
    {
      id: 'first-save',
      title: text.achievementFirstSaver,
      description: text.achievementFirstSaverDesc,
      icon: '🌱',
      unlocked: depositCount > 0,
      tone: '#E9F7EE',
    },
    {
      id: 'steady-saver',
      title: text.achievementSteadySaver,
      description: text.achievementSteadySaverDesc,
      icon: '📈',
      unlocked: depositCount >= 3,
      tone: '#EEF4FF',
    },
    {
      id: 'goal-finisher',
      title: text.achievementGoalFinisher,
      description: text.achievementGoalFinisherDesc,
      icon: '🏁',
      unlocked: completedGoals > 0,
      tone: '#FFF4E8',
    },
    {
      id: 'challenge-joined',
      title: text.achievementChallengePlayer,
      description: text.achievementChallengePlayerDesc,
      icon: '🏆',
      unlocked: joinedChallenges > 0,
      tone: '#F3EDFF',
    },
    {
      id: 'smart-withdraw',
      title: text.achievementSmartWithdraw,
      description: text.achievementSmartWithdrawDesc,
      icon: '💸',
      unlocked: withdrawalCount > 0,
      tone: '#FFF1EF',
    },
    {
      id: 'savings-hero',
      title: text.achievementSavingsHero,
      description: text.achievementSavingsHeroDesc,
      icon: '⭐',
      unlocked: totalSavings >= 50000,
      tone: '#FFF8E3',
    },
  ];
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);

  const loadAchievements = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setData(null);
        return;
      }

      const [goalsResponse, transactionsResponse, challengesResponse, statsResponse, settings] = await Promise.all([
        goalService.getGoals(),
        transactionService.getTransactions(),
        challengeService.getChallenges(),
        userService.getStats(user.id),
        getStoredAppSettings(),
      ]);

      const joinedChallenges = (challengesResponse.data || []).filter((challenge: any) => {
        const participants = Array.isArray(challenge.participantIds) ? challenge.participantIds : [];
        return participants.some((participant: any) => getParticipantId(participant) === user.id);
      });

      setData({
        goals: goalsResponse.data || [],
        transactions: transactionsResponse.data || [],
        challenges: joinedChallenges,
        stats: statsResponse.data || {},
      });
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAchievements();
    }, [loadAchievements])
  );

  const text = getCopy(language);
  const achievements = data ? buildAchievements(data, text) : [];
  const unlockedCount = achievements.filter((item) => item.unlocked).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadAchievements} />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{text.achievements}</Text>
        <Text style={styles.heroText}>{text.achievementsCaption}</Text>
        <View style={styles.heroStat}>
          <Text style={styles.heroStatValue}>{unlockedCount}</Text>
          <Text style={styles.heroStatLabel}>{text.unlockedBadges}</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{text.completedGoalsLabel}</Text>
          <Text style={styles.summaryValue}>{data?.stats?.completedGoals || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{text.joinedChallengesLabel}</Text>
          <Text style={styles.summaryValue}>
            {data?.challenges?.length || 0}
          </Text>
        </View>
      </View>

      {achievements.map((achievement) => (
        <View
          key={achievement.id}
          style={[
            styles.badgeCard,
            !achievement.unlocked && styles.badgeCardLocked,
          ]}
        >
          <View style={[styles.badgeIconWrap, { backgroundColor: achievement.tone }]}>
            <Text style={styles.badgeIcon}>{achievement.icon}</Text>
          </View>
          <View style={styles.badgeContent}>
            <View style={styles.badgeHeader}>
              <Text style={styles.badgeTitle}>{achievement.title}</Text>
              <View
                style={[
                  styles.statusPill,
                  achievement.unlocked ? styles.statusPillOn : styles.statusPillOff,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    achievement.unlocked ? styles.statusTextOn : styles.statusTextOff,
                  ]}
                >
                  {achievement.unlocked ? text.unlocked : text.locked}
                </Text>
              </View>
            </View>
            <Text style={styles.badgeDescription}>{achievement.description}</Text>
          </View>
        </View>
      ))}
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
    paddingBottom: 34,
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
  heroStat: {
    marginTop: 18,
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#B8D4C7',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#60756B',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10201A',
  },
  badgeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
    marginBottom: 12,
  },
  badgeCardLocked: {
    opacity: 0.7,
  },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeContent: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  badgeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#10201A',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillOn: {
    backgroundColor: '#E9F7EE',
  },
  statusPillOff: {
    backgroundColor: '#EEF2F0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOn: {
    color: '#237B4D',
  },
  statusTextOff: {
    color: '#6C7D75',
  },
  badgeDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#60756B',
    marginTop: 8,
  },
});

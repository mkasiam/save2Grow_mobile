import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { challengeService, goalService, transactionService, userService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';
import { Toast } from '../components';

const getParticipantId = (participant: any) => {
  if (!participant) {
    return null;
  }

  if (typeof participant === 'string') {
    return participant;
  }

  return participant.id || participant._id || null;
};

const mapChallenge = (challenge: any, userId: string) => {
  const participantIds = Array.isArray(challenge?.participantIds) ? challenge.participantIds : [];

  return {
    id: challenge?._id || challenge?.id,
    title: challenge?.title || '',
    description: challenge?.description || '',
    type: challenge?.type || 'save_amount',
    target: Number(challenge?.targetValue || challenge?.target || 0),
    reward: challenge?.reward || 'Badge & Recognition',
    endDate: challenge?.endDate ? new Date(challenge.endDate).toISOString().slice(0, 10) : '',
    startDate: challenge?.startDate ? new Date(challenge.startDate).toISOString().slice(0, 10) : '',
    status: challenge?.status || 'active',
    joined: Boolean(userId && participantIds.some((participant: any) => getParticipantId(participant) === userId)),
    participantIds,
  };
};

const getCurrentValue = (challenge: any, stats: any, transactions: any[], goals: any[]) => {
  if (!challenge) {
    return 0;
  }

  if (challenge.type === 'save_amount') {
    return Number(stats?.totalSavings || 0);
  }

  if (challenge.type === 'save_days') {
    return transactions.filter((item: any) => item.type === 'deposit').length;
  }

  if (challenge.type === 'save_percentage') {
    return goals.reduce((highest: number, goal: any) => {
      const target = Number(goal.targetAmount || goal.target || 0);
      const current = Number(goal.currentAmount || goal.current || 0);
      const progress = target > 0 ? Math.round((current / target) * 100) : 0;
      return Math.max(highest, progress);
    }, 0);
  }

  return Number(stats?.totalSavings || 0);
};

const formatChallengeValue = (value: number, challengeType: string) => {
  if (challengeType === 'save_days') {
    return `${value} days`;
  }

  if (challengeType === 'save_percentage') {
    return `${value}%`;
  }

  return `Tk ${Number(value).toLocaleString()}`;
};
export default function ChallengeDetailScreen({ route }: { route: any }) {
  const { user } = useAuth();
  const challengeId = route.params?.challengeId;
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    variant: 'success',
  });

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id || !challengeId) {
        setChallenge(null);
        setParticipants([]);
        return;
      }

      const [challengeResponse, statsResponse, transactionResponse, goalsResponse, settings] = await Promise.all([
        challengeService.getChallenges(),
        userService.getStats(user.id),
        transactionService.getTransactions(),
        goalService.getGoals(),
        getStoredAppSettings(),
      ]);

      const matchedChallenge = (challengeResponse.data || []).find(
        (item: any) => (item._id || item.id) === challengeId
      );

      if (!matchedChallenge) {
        setChallenge(null);
        setParticipants([]);
        setStats(statsResponse.data);
        setTransactions(transactionResponse.data || []);
        setGoals((goalsResponse.data || []).map((goal: any) => ({
          id: goal._id || goal.id,
          targetAmount: goal.targetAmount || goal.target,
          currentAmount: goal.currentAmount || goal.current,
        })));
        setLanguage(settings.language);
        return;
      }

      setChallenge(mapChallenge(matchedChallenge, user.id));
      setParticipants(Array.isArray(matchedChallenge?.participantIds) ? matchedChallenge.participantIds : []);
      setStats(statsResponse.data);
      setTransactions(transactionResponse.data || []);
      setGoals((goalsResponse.data || []).map((goal: any) => ({
        id: goal._id || goal.id,
        targetAmount: goal.targetAmount || goal.target,
        currentAmount: goal.currentAmount || goal.current,
      })));
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading challenge detail:', error);
    } finally {
      setLoading(false);
    }
  }, [challengeId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadChallenge();
    }, [loadChallenge])
  );

  const text = getCopy(language);

  const showToast = (message: string, variant = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const handleJoin = async () => {
    if (!challenge) {
      return;
    }

    if (challenge.joined) {
      showToast(text.youAlreadyJoinedChallenge);
      return;
    }

    try {
      await challengeService.joinChallenge(challenge.id);
      await loadChallenge();
      showToast(`${text.joinedChallengePrefix} ${challenge.title}`);
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert(text.joinFailed, text.challengeCouldNotJoin);
    }
  };

  if (!challenge) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{text.challengeNotFound}</Text>
        <Text style={styles.emptyText}>{text.challengeNotFoundCaption}</Text>
      </View>
    );
  }

  const currentValue = getCurrentValue(challenge, stats, transactions, goals);
  const progressRatio = Math.min(currentValue / Math.max(challenge.target, 1), 1);
  const progressPercent = Math.round(progressRatio * 100);
  const participantNames = participants
    .map((participant: any) => participant?.name || participant?.email || 'Participant')
    .filter(Boolean);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadChallenge} />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroIcon}>{challenge.id ? '🏁' : '🎯'}</Text>
          {challenge.joined ? (
            <View style={styles.joinedBadge}>
              <Text style={styles.joinedBadgeText}>{text.alreadyJoined}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.description}>{challenge.description}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{text.reward}</Text>
            <Text style={styles.metaValue}>{challenge.reward}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{text.ends}</Text>
            <Text style={styles.metaValue}>{challenge.endDate}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{text.participants}</Text>
            <Text style={styles.metaValue}>{participantNames.length}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>{text.target}</Text>
            <Text style={styles.metaValue}>{formatChallengeValue(challenge.target, challenge.type)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.sectionTitle}>{text.challengeProgress}</Text>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <Text style={styles.progressValue}>
          {formatChallengeValue(currentValue, challenge.type)} / {formatChallengeValue(challenge.target, challenge.type)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(progressPercent, 6)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {challenge.type === 'save_amount'
            ? text.savedSoFar
            : challenge.type === 'save_days'
              ? text.depositDays
              : challenge.type === 'save_percentage'
                ? text.bestGoalProgress
                : text.communityReadySavings}
        </Text>
        <Text style={styles.supportText}>
          {challenge.type === 'save_amount'
            ? text.totalSavingsGoalsCaption
            : challenge.type === 'save_days'
              ? text.depositDaysCaption
              : challenge.type === 'save_percentage'
                ? text.bestGoalProgressCaption
                : text.communityReadySavingsCaption}
        </Text>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.sectionTitle}>{text.challengeSnapshot}</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{text.joinedStatus}</Text>
          <Text style={styles.breakdownValue}>
            {challenge.joined ? text.alreadyJoined : text.notJoinedYet}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{text.type}</Text>
          <Text style={styles.breakdownValue}>{challenge.type.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>{text.bestNextStep}</Text>
          <Text style={styles.breakdownValue}>
            {challenge.type === 'save_days'
              ? text.saveDaysNextStep
              : text.defaultChallengeNextStep}
          </Text>
        </View>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.sectionTitle}>Participants</Text>
        {participantNames.length ? (
          participantNames.map((name, index) => (
            <View key={`${name}-${index}`} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Member {index + 1}</Text>
              <Text style={styles.breakdownValue}>{name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.supportText}>No participants yet.</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, challenge.joined && styles.actionButtonMuted]}
        onPress={handleJoin}
      >
        <Ionicons
          name={challenge.joined ? 'checkmark-circle' : 'rocket-outline'}
          size={18}
          color={challenge.joined ? '#486258' : '#FFF'}
        />
        <Text
          style={[
            styles.actionText,
            challenge.joined && styles.actionTextMuted,
          ]}
        >
          {challenge.joined ? text.youAlreadyJoined : text.joinThisChallenge}
        </Text>
      </TouchableOpacity>

      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F7F4',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#13241D',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#60756B',
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E1ECE6',
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 40,
  },
  joinedBadge: {
    backgroundColor: '#E3EFE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  joinedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10201A',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#60756B',
    marginTop: 8,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  metaCard: {
    width: '48%',
    backgroundColor: '#F7FAF8',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E3ECE7',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6A7D74',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#13241D',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E1ECE6',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#13241D',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E8E5A',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10201A',
    marginBottom: 12,
  },
  track: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#E4EEE9',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2D8C62',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#335C4B',
    marginTop: 12,
  },
  supportText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#60756B',
    marginTop: 6,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E1ECE6',
    marginBottom: 18,
  },
  breakdownRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F0',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D8C62',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F0',
  },
  leaderboardRowActive: {
    backgroundColor: '#F7FBF8',
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3F0',
  },
  rankBadgeGold: {
    backgroundColor: '#FFF4D6',
  },
  rankBadgeSilver: {
    backgroundColor: '#EEF1F4',
  },
  rankBadgeBronze: {
    backgroundColor: '#F8E7DE',
  },
  rankBadgeUser: {
    backgroundColor: '#E7F3EC',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#173629',
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#13241D',
  },
  leaderboardMeta: {
    fontSize: 12,
    color: '#60756B',
    marginTop: 3,
  },
  leaderboardScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#173629',
    marginLeft: 10,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6A7D74',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#13241D',
  },
  actionButton: {
    backgroundColor: '#1E8E5A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonMuted: {
    backgroundColor: '#E3ECE7',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionTextMuted: {
    color: '#486258',
  },
});

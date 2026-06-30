import React, { useState, useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { challengeService } from '../services/api';
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

const mapChallenge = (challenge: any, userId?: string) => {
  const participantIds = Array.isArray(challenge.participantIds) ? challenge.participantIds : [];

  return {
    id: challenge._id || challenge.id,
    title: challenge.title,
    description: challenge.description || '',
    icon: challenge.icon || '🎯',
    reward: challenge.reward || 'Badge & Recognition',
    endDate: challenge.endDate ? new Date(challenge.endDate).toISOString().slice(0, 10) : '',
    participants: participantIds.length,
    joined: Boolean(userId && participantIds.some((participant: any) => getParticipantId(participant) === userId)),
    status: challenge.status || 'active',
  };
};

export default function ChallengesScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' });

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const [challengeResponse, settings] = await Promise.all([
        challengeService.getChallenges(),
        getStoredAppSettings(),
      ]);
      setChallenges((challengeResponse.data || []).map((challenge: any) => mapChallenge(challenge, user?.id)));
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [loadChallenges])
  );

  const text = getCopy(language);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const handleJoinChallenge = async (challenge: any) => {
    try {
      if (challenge.joined) {
        showToast('You already joined this challenge');
        return;
      }

      await challengeService.joinChallenge(challenge.id);
      await loadChallenges();

      showToast(`Joined ${challenge.title}`);
    } catch (error) {
      console.error('Error joining challenge:', error);
      showToast('Challenge could not be joined', 'error');
    }
  };

  const filteredChallenges =
    filter === 'joined'
      ? challenges.filter((item: any) => item.joined)
      : challenges;

  const openChallengeDetail = (challengeId: string) => {
    navigation.navigate('ChallengeDetail', { challengeId });
  };

  const renderChallengeCard = ({ item: challenge }: { item: any }) => (
    <View key={challenge.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.challengeIcon}>{challenge.icon}</Text>
        <View style={styles.cardTitleSection}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <View style={styles.participantsRow}>
            <Ionicons name="people" size={14} color="#999" />
            <Text style={styles.participantsText}>
              {challenge.participants} participants
            </Text>
          </View>
        </View>
        {challenge.joined && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedBadgeText}>✓ Joined</Text>
          </View>
        )}
      </View>

      <Text style={styles.challengeDescription}>{challenge.description}</Text>

      <View style={styles.rewardBox}>
        <Ionicons name="star" size={16} color="#FF9500" />
        <Text style={styles.rewardText}>{challenge.reward}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.endDate}>Ends: {challenge.endDate}</Text>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => openChallengeDetail(challenge.id)}
          >
            <Text style={styles.detailButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.joinButton,
              challenge.joined && styles.joinButtonJoined,
            ]}
            onPress={() => handleJoinChallenge(challenge)}
          >
            <Text
              style={[
                styles.joinButtonText,
                challenge.joined && styles.joinButtonTextJoined,
              ]}
            >
              {challenge.joined ? 'Joined' : 'Join Challenge'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <View>
          <Text style={styles.headerTitle}>Challenges</Text>
          <Text style={styles.headerSubtitle}>
            {challenges.filter((c) => c.joined).length} joined
          </Text>
        </View>
        <Text style={styles.headerIcon}>🏆</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'joined' && styles.filterTabActive]}
          onPress={() => setFilter('joined')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'joined' && styles.filterTabTextActive,
            ]}
          >
            My Challenges
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredChallenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallengeCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadChallenges} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {filter === 'joined' ? 'No joined challenges yet' : 'No challenges found'}
            </Text>
            <Text style={styles.emptyText}>
              Join a challenge to track it here.
            </Text>
          </View>
        }
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#E8F4EE',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8DE',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    right: -18,
    top: -20,
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.34)',
    transform: [{ rotate: '18deg' }],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10201A',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5B7167',
    marginTop: 4,
  },
  headerIcon: {
    fontSize: 32,
    marginTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#E7EFEB',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1E8E5A',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#486258',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#0F3A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardTitleSection: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#13241D',
    marginBottom: 4,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    fontSize: 12,
    color: '#60756B',
  },
  joinedBadge: {
    backgroundColor: '#E2F4E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinedBadgeText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: 13,
    color: '#5A6F64',
    marginBottom: 12,
    lineHeight: 18,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  rewardText: {
    fontSize: 13,
    color: '#E67E22',
    fontWeight: '600',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  endDate: {
    fontSize: 12,
    color: '#60756B',
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D7E5DE',
    backgroundColor: '#F8FBF9',
  },
  detailButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#365B4B',
  },
  joinButton: {
    backgroundColor: '#1E8E5A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  joinButtonJoined: {
    backgroundColor: '#E7EFEB',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  joinButtonTextJoined: {
    color: '#486258',
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#13241D',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#60756B',
    textAlign: 'center',
  },
});

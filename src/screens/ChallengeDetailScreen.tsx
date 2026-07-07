import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { challengeService, goalService, transactionService, userService, withdrawalService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';
import { PaymentWebViewModal, ScreenLoadingOverlay, Toast } from '../components';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

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

const getCurrentValue = (challenge: any, _stats: any, _transactions: any[], _goals: any[], userChallenges: any[]) => {
  if (!challenge) {
    return 0;
  }

  const ucMatch = userChallenges.find((item) => (item._id || item.id) === challenge.id);
  if (ucMatch && ucMatch.currentAmount !== undefined) {
    return Number(ucMatch.currentAmount || 0);
  }

  return 0;
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

const roundMoney = (value: number) => Math.round(Number(value || 0) * 100) / 100;

const getUserChallengeId = (userChallenges: any[], challengeId: string) => {
  const match = userChallenges.find((item) => (item._id || item.id) === challengeId);
  return match?.userChallengeId || match?.userChallengeId?._id || match?.userChallengeId?.id || null;
};
export default function ChallengeDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  const challengeId = route.params?.challengeId;
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<any[]>([]);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [withdrawalPreview, setWithdrawalPreview] = useState<any>(null);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    variant: 'success',
  });

  const loadChallenge = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (!user?.id || !challengeId) {
        setChallenge(null);
        setParticipants([]);
        return;
      }

      const [challengeResponse, statsResponse, transactionResponse, goalsResponse, userChallengeResponse, settings] = await Promise.all([
        challengeService.getChallenges(),
        userService.getStats(user.id),
        transactionService.getTransactions(),
        goalService.getGoals(),
        challengeService.getUserChallenges(),
        getStoredAppSettings(),
      ]);

      const userChallengeList = userChallengeResponse.data || [];

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
      setUserChallenges(userChallengeList);
      setUserChallenges(userChallengeList);
      setGoals((goalsResponse.data || []).map((goal: any) => ({
        id: goal._id || goal.id,
        targetAmount: goal.targetAmount || goal.target,
        currentAmount: goal.currentAmount || goal.current,
        entityType: goal.entityType || goal.sourceType || 'goal',
      })));
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading challenge detail:', error);
      showToast(getFriendlyErrorMessage(error, 'Unable to load this challenge right now.'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const isVerifiedStudent = user?.verificationStatus === 'verified';

  const requireVerification = () => {
    if (isVerifiedStudent) {
      return true;
    }

    setShowVerificationNotice(true);
    return false;
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

  const openWithdrawalModal = () => {
    if (!challenge) {
      return;
    }

    if (!requireVerification()) {
      return;
    }

    const baseAmount = roundMoney(currentValue);
    const completed = progressPercent >= 100 || challenge.status === 'completed';
    const penaltyRate = completed ? 0 : 0.05;
    const penaltyFee = roundMoney(baseAmount * penaltyRate);
    const payoutAmount = roundMoney(Math.max(baseAmount - penaltyFee, 0));

    setWithdrawalPreview({
      baseAmount,
      completed,
      penaltyRate,
      penaltyFee,
      payoutAmount,
    });
    setWithdrawalNote('');
    setWithdrawalModalVisible(true);
  };

  const submitWithdrawalRequest = async () => {
    if (!challenge) {
      return;
    }

    const userChallengeId = getUserChallengeId(userChallenges, challenge.id);
    const payload = userChallengeId
      ? { userChallengeId, adminNote: withdrawalNote.trim() || undefined }
      : { challengeId: challenge.id, adminNote: withdrawalNote.trim() || undefined };

    setWithdrawalSubmitting(true);
    try {
      await withdrawalService.requestWithdrawal(payload);
      setWithdrawalModalVisible(false);
      showToast('Withdrawal request submitted');
      await loadChallenge();
    } catch (error: any) {
      console.error('Error submitting withdrawal request:', error);
      Alert.alert('Withdrawal request failed', getFriendlyErrorMessage(error, 'Please try again later'));
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const openDepositModal = () => {
    if (!challenge || !challenge.joined) return;
    if (!requireVerification()) return;
    setDepositAmount('');
    setDepositModalVisible(true);
  };

  const handleDeposit = async () => {
    if (!challenge) return;
    const parsedAmount = Number(depositAmount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const userChallengeId = getUserChallengeId(userChallenges, challenge.id);
    if (!userChallengeId) {
      Alert.alert('Error', 'User challenge not found');
      return;
    }

    try {
      const payload = {
        userChallengeId,
        amount: parsedAmount,
        description: '',
        paymentMethod: 'sslcommerz',
      };

      const sessionResponse = await transactionService.createSslcommerzDepositSession(payload);

      const gatewayUrl = sessionResponse.data?.gatewayPageURL;
      if (!gatewayUrl) {
        throw new Error('Gateway URL was not returned by SSLCommerz');
      }

      setDepositModalVisible(false);
      setCheckoutUrl(gatewayUrl);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error saving deposit:', error);
      showToast(getFriendlyErrorMessage(error, 'SSLCommerz checkout could not be started'), 'error');
    }
  };

  if (loading && !challenge) {
    return <ScreenLoadingOverlay visible={true} message="Loading challenge details..." />;
  }

  if (!challenge) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{text.challengeNotFound}</Text>
        <Text style={styles.emptyText}>{text.challengeNotFoundCaption}</Text>
      </View>
    );
  }

  const currentValue = getCurrentValue(challenge, stats, transactions, goals, userChallenges);
  const progressRatio = Math.min(currentValue / Math.max(challenge.target, 1), 1);
  const progressPercent = Math.round(progressRatio * 100);
  const userChallengeId = getUserChallengeId(userChallenges, challenge.id);
  const scopedTransactions = transactions.filter((item: any) => {
    const transactionUserChallengeId = item.userChallengeId?._id || item.userChallengeId;
    return transactionUserChallengeId === userChallengeId;
  }).slice(0, 2);
  const participantNames = participants
    .map((participant: any) => participant?.name || participant?.email || 'Participant')
    .filter(Boolean);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadChallenge(true)} />
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

      <View style={styles.breakdownCard}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {scopedTransactions.length ? (
          scopedTransactions.map((transaction: any) => {
            const isPendingWithdrawal = transaction.type === 'withdrawal' && transaction.status === 'pending';
            const transactionLabel = isPendingWithdrawal ? 'Withdrawal Request' : transaction.type === 'withdrawal' ? 'Withdrawal' : 'Deposit';

            return (
              <View key={transaction._id || transaction.id} style={styles.activityRow}>
                <View style={styles.activityTextWrap}>
                  <Text style={styles.activityTitle}>{transaction.description || transactionLabel}</Text>
                  <View style={[styles.transactionBadge, isPendingWithdrawal && styles.pendingBadge]}>
                    <Text style={[styles.transactionBadgeText, isPendingWithdrawal && styles.pendingBadgeText]}>{transactionLabel}</Text>
                  </View>
                  <Text style={styles.activityMeta}>{transaction.paymentMethod || 'manual'} • {new Date(transaction.createdAt || transaction.date).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.activityAmount, transaction.type === 'deposit' ? styles.depositAmount : styles.withdrawalAmount]}>
                  {transaction.type === 'deposit' ? '+' : '-'}Tk {Number(transaction.amount).toLocaleString()}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.supportText}>No recent activity yet.</Text>
        )}
        {transactions.filter((item: any) => (item.userChallengeId?._id || item.userChallengeId) === userChallengeId).length > 2 ? (
          <TouchableOpacity style={styles.seeMoreButton} onPress={() => navigation.navigate('TransactionHistory', { userChallengeId, scope: 'challenge' })}>
            <Text style={styles.seeMoreButtonText}>See More</Text>
          </TouchableOpacity>
        ) : null}
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

      {challenge.joined ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.withdrawButton, { flex: 1, marginRight: 8, backgroundColor: '#1E8E5A' }]} onPress={openDepositModal}>
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.withdrawButtonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.withdrawButton, { flex: 1 }]} onPress={openWithdrawalModal}>
            <Ionicons name="cash-outline" size={18} color="#FFF" />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={withdrawalModalVisible} transparent animationType="fade" onRequestClose={() => setWithdrawalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Withdrawal Request</Text>
            <Text style={styles.modalText}>
              {withdrawalPreview?.completed
                ? 'You completed this challenge. You are eligible for a full payout.'
                : 'This is an early withdrawal. A strict 5% penalty will be applied.'}
            </Text>

            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRowCompact}>
                <Text style={styles.breakdownLabel}>Initial deposit</Text>
                <Text style={styles.breakdownValue}>Tk {withdrawalPreview?.baseAmount?.toLocaleString()}</Text>
              </View>
              <View style={styles.breakdownRowCompact}>
                <Text style={styles.breakdownLabel}>Penalty fee</Text>
                <Text style={styles.breakdownValue}>Tk {withdrawalPreview?.penaltyFee?.toLocaleString()}</Text>
              </View>
              <View style={styles.breakdownRowCompact}>
                <Text style={styles.breakdownLabel}>Payout amount</Text>
                <Text style={styles.breakdownValue}>Tk {withdrawalPreview?.payoutAmount?.toLocaleString()}</Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>Admin note</Text>
            <TextInput
              style={styles.noteInput}
              value={withdrawalNote}
              onChangeText={setWithdrawalNote}
              placeholder="Optional note for the admin"
              placeholderTextColor="#8A9B92"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setWithdrawalModalVisible(false)} disabled={withdrawalSubmitting}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={submitWithdrawalRequest} disabled={withdrawalSubmitting}>
                <Text style={styles.modalConfirmText}>{withdrawalSubmitting ? 'Submitting...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={depositModalVisible} transparent animationType="fade" onRequestClose={() => setDepositModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Make a Deposit</Text>
            <Text style={styles.modalText}>Enter the amount to save for this challenge.</Text>
            <TextInput
              style={[styles.noteInput, { marginTop: 12, fontSize: 18 }]}
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="Amount (Tk)"
              placeholderTextColor="#8A9B92"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDepositModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleDeposit}>
                <Text style={styles.modalConfirmText}>Proceed to Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </ScrollView>

      <PaymentWebViewModal
        visible={showPaymentModal}
        checkoutUrl={checkoutUrl}
        onClose={() => {
          setShowPaymentModal(false);
          setCheckoutUrl(null);
        }}
        onSuccess={async () => {
          showToast('Payment completed successfully');
          await loadChallenge();
        }}
        onFailure={() => showToast('Payment failed or was cancelled', 'error')}
      />

      <ScreenLoadingOverlay visible={loading} message="Loading challenge details..." />

      <Modal visible={showVerificationNotice} transparent animationType="fade" onRequestClose={() => setShowVerificationNotice(false)}>
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Account verification pending</Text>
            <Text style={styles.noticeText}>
              Your account is awaiting administrator verification. Withdrawal requests are disabled until approval.
            </Text>
            <TouchableOpacity style={styles.noticeButton} onPress={() => setShowVerificationNotice(false)}>
              <Text style={styles.noticeButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F0',
    marginTop: 8,
  },
  activityTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#13241D',
  },
  activityMeta: {
    fontSize: 12,
    color: '#60756B',
    marginTop: 4,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  transactionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF3EE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  pendingBadge: {
    backgroundColor: '#FFF2CC',
  },
  transactionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  pendingBadgeText: {
    color: '#A36B00',
  },
  seeMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#173629',
  },
  seeMoreButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  withdrawButton: {
    marginTop: 12,
    backgroundColor: '#173629',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noticeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'center',
    padding: 24,
  },
  noticeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10201A',
  },
  noticeText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6D66',
  },
  noticeButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1E8E5A',
  },
  noticeButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E1ECE6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#13241D',
  },
  modalText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#60756B',
  },
  breakdownBox: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: '#E3ECE7',
    padding: 12,
    gap: 8,
  },
  breakdownRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#13241D',
  },
  noteInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#DDE7E1',
    borderRadius: 14,
    backgroundColor: '#FBFDFB',
    padding: 12,
    color: '#10201A',
    textAlignVertical: 'top',
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#EEF3F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#486258',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#1E8E5A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionTextMuted: {
    color: '#486258',
  },
  depositAmount: {
    color: '#34C759',
  },
  withdrawalAmount: {
    color: '#FF3B30',
  },
});

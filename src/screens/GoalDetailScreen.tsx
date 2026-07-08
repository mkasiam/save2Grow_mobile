import React, { useState, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { goalService, transactionService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';
import { getFriendlyErrorMessage } from '../utils/errorMessages';
import { useAuth } from '../hooks/useAuth';
import { useTransaction } from '../hooks/useTransaction';
import { PaymentWebViewModal, ScreenLoadingOverlay, SavingsChart, Toast } from '../components';

const PAYMENT_METHODS = ['bkash', 'nagad', 'bank'];
const CONTRIBUTION_FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'every_3_days', label: 'Every 3 Days' },
  { id: 'weekly', label: 'Every 7 Days' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'every_3_months', label: 'Every 3 Months' },
];

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateForInput = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const isValidDateInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const toDateInputValue = (date: Date) => formatDateForInput(date);

const getDateFromInput = (value: string) => {
  if (isValidDateInput(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date();
};

const formatDateDisplay = (value: string) => {
  if (!value) {
    return 'Select date';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildGoalSeries = (transactions: any[]) => {
  const recent = [...transactions].reverse().slice(-4);
  return recent.map((item, index) => ({
    label: `T${index + 1}`,
    value: Number(item.amount),
  }));
};

const normalizeGoal = (value: any) => {
  if (!value) {
    return null;
  }

  return {
    ...value,
    id: value.id || value._id,
    target: Number(value.targetAmount || value.target || 0),
    current: Number(value.currentAmount || value.current || 0),
    startDate: value.createdAt
      ? formatDateForInput(new Date(value.createdAt))
      : value.startDate,
    targetDate: value.targetDate
      ? formatDateForInput(new Date(value.targetDate))
      : value.targetDate,
  };
};

const normalizeTransaction = (value: any) => ({
  ...value,
  id: value.id || value._id,
  date: value.createdAt
    ? formatDateForInput(new Date(value.createdAt))
    : value.date,
});

export default function GoalDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { goalId } = route.params;
  const { user, refreshUser } = useAuth();
  const { executeTransaction, startDepositSession } = useTransaction();
  const [goal, setGoal] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [depositForm, setDepositForm] = useState({
    amount: '',
    description: '',
    paymentMethod: 'bkash',
  });
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    description: '',
    paymentMethod: 'bkash',
    note: '',
  });
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<null | 'targetDate' | 'nextContributionDate'>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' });
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    target: '',
    targetDate: '',
    nextContributionDate: '',
    contributionFrequency: 'weekly',
  });

  const loadGoalDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [goalResponse, transactionResponse, settings] = await Promise.all([
        goalService.getGoal(goalId),
        transactionService.getGoalTransactions(goalId),
        getStoredAppSettings(),
      ]);
      setGoal(normalizeGoal(goalResponse.data));
      setTransactions((transactionResponse.data || []).map(normalizeTransaction));
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading goal details:', error);
      showToast(getFriendlyErrorMessage(error, 'Unable to load this goal right now.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useFocusEffect(
    useCallback(() => {
      loadGoalDetail();
    }, [loadGoalDetail])
  );

  const text = getCopy(language);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
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

  const openDepositModal = () => {
    if (!requireVerification()) {
      return;
    }

    setShowDepositModal(true);
  };

  const openWithdrawModal = () => {
    if (!requireVerification()) {
      return;
    }

    setShowWithdrawModal(true);
  };

  const openEditModal = () => {
    if (!goal) {
      return;
    }

    setEditForm({
      title: goal.title,
      description: goal.description || '',
      target: String(goal.target),
      targetDate: goal.targetDate,
      nextContributionDate: goal.nextContributionDate || '',
      contributionFrequency: goal.contributionFrequency || 'weekly',
    });
    setShowEditModal(true);
  };

  const openDatePicker = (field: 'targetDate' | 'nextContributionDate') => {
    const currentValue = field === 'targetDate' ? editForm.targetDate : editForm.nextContributionDate;
    setActiveDateField(field);
    setPickerDate(getDateFromInput(currentValue));
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
    setActiveDateField(null);
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    setPickerDate(selectedDate);

    if (Platform.OS === 'android' && activeDateField) {
      setEditForm((prev) => ({
        ...prev,
        [activeDateField]: toDateInputValue(selectedDate),
      }));
      closeDatePicker();
    }
  };

  const confirmPickedDate = () => {
    if (!activeDateField) {
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      [activeDateField]: toDateInputValue(pickerDate),
    }));
    closeDatePicker();
  };

  const handleDeposit = async () => {
    if (!goal) {
      return;
    }

    const parsedAmount = Number(depositForm.amount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const description = (depositForm.description ?? '').trim();
      const sessionResponse = await startDepositSession({
        goalId: goal.id,
        amount: parsedAmount,
        description,
        descriptionFallback: 'Goal Deposit',
        paymentMethod: depositForm.paymentMethod,
      });

      const gatewayUrl = sessionResponse.data?.gatewayPageURL;
      if (!gatewayUrl) {
        throw new Error('Gateway URL was not returned by SSLCommerz');
      }

      setDepositForm({ amount: '', description: '', paymentMethod: 'bkash' });
      setShowDepositModal(false);
      setCheckoutUrl(gatewayUrl);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Error saving deposit:', error);
      showToast(getFriendlyErrorMessage(error, 'SSLCommerz checkout could not be started'), 'error');
    }
  };

  const handleWithdraw = async () => {
    if (!goal) {
      return;
    }

    const parsedAmount = Number(withdrawForm.amount.replace(/,/g, '').trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (parsedAmount > goal.current) {
      Alert.alert('Error', 'Withdraw amount is higher than your saved balance');
      return;
    }

    try {
      const description = (withdrawForm.description ?? '').trim();
      const note = (withdrawForm.note ?? '').trim();
      await executeTransaction({
        goalId: goal.id,
        type: 'withdrawal',
        amount: parsedAmount,
        description: description || '',
        paymentMethod: withdrawForm.paymentMethod,
        note: note || '',
      });

      await loadGoalDetail();
      setWithdrawForm({
        amount: '',
        description: '',
        paymentMethod: 'bkash',
        note: '',
      });
      setShowWithdrawModal(false);
      await refreshUser();
      showToast(`Tk ${parsedAmount.toLocaleString()} withdrawn`);
    } catch (error: any) {
      console.error('Error saving withdrawal:', error);
      showToast(getFriendlyErrorMessage(error, 'Transaction failed. Please check your balance and try again.'), 'error');
    }
  };

  const handleSaveGoalEdits = async () => {
    const parsedTarget = Number(editForm.target.replace(/,/g, '').trim());
    if (!editForm.title.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      showToast('Please enter a valid title and target amount', 'error');
      return;
    }

    if (
      !isValidDateInput(editForm.targetDate.trim()) ||
      (editForm.nextContributionDate.trim() &&
        !isValidDateInput(editForm.nextContributionDate.trim()))
    ) {
      showToast('Use valid dates in YYYY-MM-DD format', 'error');
      return;
    }

    try {
      const updatedGoal = await goalService.updateGoal(goal.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        targetAmount: parsedTarget,
        targetDate: editForm.targetDate.trim(),
      });
      setGoal(normalizeGoal(updatedGoal.data));
      setShowEditModal(false);
      await refreshUser();
      showToast('Goal updated successfully');
    } catch (error) {
      console.error('Error updating goal:', error);
      showToast('Goal could not be updated', 'error');
    }
  };

  const handleDeleteGoal = () => {
    Alert.alert(
      'Delete Goal',
      'This will remove the goal and its transactions from your account view.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.deleteGoal(goal.id);
              await refreshUser();
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting goal:', error);
              showToast('Goal could not be deleted', 'error');
            }
          },
        },
      ]
    );
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setCheckoutUrl(null);
  };

  const handlePaymentSuccess = async () => {
    showToast('Payment completed successfully');
    await loadGoalDetail();
    await refreshUser();
  };

  const handlePaymentFailure = () => {
    showToast('Payment could not be completed', 'error');
  };

  if (!goal) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const progress = (goal.current / goal.target) * 100;
  const remaining = Math.max(goal.target - goal.current, 0);
  const daysLeft = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const recentTransactions = [...transactions].slice(0, 2);

  const handleSeeMoreTransactions = () => {
    navigation.navigate('TransactionHistory', { goalId: goal.id, scope: 'goal' });
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={openEditModal}>
              <Ionicons name="create-outline" size={18} color="#173629" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleDeleteGoal}>
              <Ionicons name="trash-outline" size={18} color="#B23B2D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.goalIcon}>{goal.icon}</Text>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalCategory}>{goal.category.toUpperCase()}</Text>
          <Text style={styles.goalDescription}>{goal.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.progress}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>

          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={styles.amountValue}>Tk {goal.current.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.amountLabel}>Target</Text>
              <Text style={styles.amountValue}>Tk {goal.target.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.amountLabel}>Remaining</Text>
              <Text style={styles.amountValue}>Tk {remaining.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <SavingsChart
          title={text.statistics}
          subtitle="Last 4 transaction amounts"
          data={buildGoalSeries(transactions)}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.timeline}</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineIcon}>📅</Text>
              <View>
                <Text style={styles.timelineLabel}>Start Date</Text>
                <Text style={styles.timelineValue}>{goal.startDate}</Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineRow}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineIcon}>⏳</Text>
              <View>
                <Text style={styles.timelineLabel}>Target Date</Text>
                <Text style={styles.timelineValue}>
                  {goal.targetDate} ({daysLeft} days left)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.timelineRow}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineIcon}>🔔</Text>
              <View>
                <Text style={styles.timelineLabel}>Deposit Schedule</Text>
                <Text style={styles.timelineValue}>
                  {CONTRIBUTION_FREQUENCIES.find(
                    (item) => item.id === goal.contributionFrequency
                  )?.label || 'Every 7 Days'}
                </Text>
                <Text style={styles.timelineSubvalue}>
                  Next deposit date: {goal.nextContributionDate || 'Not set'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.recentTransactions}</Text>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => {
              const isPendingWithdrawal = transaction.type === 'withdrawal' && transaction.status === 'pending';
              const transactionLabel = isPendingWithdrawal
                ? 'Withdrawal Request'
                : transaction.type === 'withdrawal'
                  ? 'Withdrawal'
                  : 'Deposit';

              return (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <Text style={styles.transactionIcon}>
                      {transaction.type === 'deposit' ? '➕' : '➖'}
                    </Text>
                    <View style={styles.transactionTextWrap}>
                      <Text style={styles.transactionDescription}>
                        {transaction.description || transactionLabel}
                      </Text>
                      <View style={[styles.transactionBadge, isPendingWithdrawal && styles.pendingBadge]}>
                        <Text style={[styles.transactionBadgeText, isPendingWithdrawal && styles.pendingBadgeText]}>
                          {transactionLabel}
                        </Text>
                      </View>
                      <Text style={styles.transactionDate}>
                        {transaction.paymentMethod || 'manual'} • {transaction.date}
                      </Text>
                      {transaction.note ? (
                        <Text style={styles.transactionNote}>{transaction.note}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === 'deposit'
                        ? styles.depositAmount
                        : styles.withdrawalAmount,
                    ]}
                  >
                    {transaction.type === 'deposit' ? '+' : '-'}Tk{' '}
                    {Number(transaction.amount).toLocaleString()}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.noTransactions}>{text.noTransactions}</Text>
          )}

          {transactions.length > 2 ? (
            <TouchableOpacity style={styles.seeMoreButton} onPress={handleSeeMoreTransactions}>
              <Text style={styles.seeMoreButtonText}>See More</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={openDepositModal}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>{text.addSavings}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openWithdrawModal}
          >
            <Ionicons name="wallet" size={20} color="#FF3B30" />
            <Text style={styles.secondaryButtonText}>{text.withdraw}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacing} />
      </ScrollView>

      <ScreenLoadingOverlay visible={loading} message="Loading goal details..." />

      <Modal visible={showDepositModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{text.addSavings}</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Amount (Tk)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              keyboardType="decimal-pad"
              value={depositForm.amount}
              onChangeText={(amount) => setDepositForm((prev) => ({ ...prev, amount }))}
            />

            <Text style={styles.modalLabel}>{text.description}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Optional"
              value={depositForm.description}
              onChangeText={(description) =>
                setDepositForm((prev) => ({ ...prev, description }))
              }
            />

            <Text style={styles.modalLabel}>{text.paymentMethod}</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodChip,
                    depositForm.paymentMethod === method && styles.methodChipActive,
                  ]}
                  onPress={() =>
                    setDepositForm((prev) => ({ ...prev, paymentMethod: method }))
                  }
                >
                  <Text
                    style={[
                      styles.methodText,
                      depositForm.paymentMethod === method && styles.methodTextActive,
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={handleDeposit}>
              <Text style={styles.modalButtonText}>Pay with SSLCommerz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showVerificationNotice} transparent animationType="fade" onRequestClose={() => setShowVerificationNotice(false)}>
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Account verification pending</Text>
            <Text style={styles.noticeText}>
              Your account is awaiting administrator verification. Deposits and withdrawals are disabled until approval.
            </Text>
            <TouchableOpacity style={styles.noticeButton} onPress={() => setShowVerificationNotice(false)}>
              <Text style={styles.noticeButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardShell}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalContent, styles.modalContentExpanded]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Goal</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Title</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.title}
                  onChangeText={(title) => setEditForm((prev) => ({ ...prev, title }))}
                  placeholder="Goal title"
                />

                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.description}
                  onChangeText={(description) =>
                    setEditForm((prev) => ({ ...prev, description }))
                  }
                  placeholder="Goal description"
                />

                <Text style={styles.modalLabel}>Target Amount (Tk)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.target}
                  onChangeText={(target) => setEditForm((prev) => ({ ...prev, target }))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.modalLabel}>Target Date</Text>
                <TouchableOpacity
                  style={styles.dateFieldButton}
                  onPress={() => openDatePicker('targetDate')}
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.dateFieldValue}>{formatDateDisplay(editForm.targetDate)}</Text>
                    <Text style={styles.dateFieldMeta}>{editForm.targetDate || 'Tap to choose a date'}</Text>
                  </View>
                  <Ionicons name="calendar-outline" size={20} color="#1E8E5A" />
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Next Deposit Date</Text>
                <TouchableOpacity
                  style={styles.dateFieldButton}
                  onPress={() => openDatePicker('nextContributionDate')}
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.dateFieldValue}>
                      {formatDateDisplay(editForm.nextContributionDate)}
                    </Text>
                    <Text style={styles.dateFieldMeta}>
                      {editForm.nextContributionDate || 'Tap to choose a date'}
                    </Text>
                  </View>
                  <Ionicons name="calendar-outline" size={20} color="#1E8E5A" />
                </TouchableOpacity>

                <Text style={styles.modalLabel}>Deposit Frequency</Text>
                <View style={[styles.methodRow, styles.frequencyWrap]}>
                  {CONTRIBUTION_FREQUENCIES.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.methodChip,
                        editForm.contributionFrequency === item.id &&
                          styles.methodChipActive,
                      ]}
                      onPress={() =>
                        setEditForm((prev) => ({
                          ...prev,
                          contributionFrequency: item.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.methodText,
                          editForm.contributionFrequency === item.id &&
                            styles.methodTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.modalButton} onPress={handleSaveGoalEdits}>
                  <Text style={styles.modalButtonText}>Save Goal</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeDateField === 'nextContributionDate' ? 'Next Deposit Date' : 'Target Date'}
              </Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={handleDateChange}
              style={styles.datePicker}
            />

            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancel} onPress={closeDatePicker}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirm} onPress={confirmPickedDate}>
                <Text style={styles.datePickerConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{text.withdraw}</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHelperText}>
              {text.availableBalance}: Tk {goal.current.toLocaleString()}
            </Text>
            <Text style={styles.modalLabel}>Amount (Tk)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              keyboardType="decimal-pad"
              value={withdrawForm.amount}
              onChangeText={(amount) => setWithdrawForm((prev) => ({ ...prev, amount }))}
            />

            <Text style={styles.modalLabel}>{text.description}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Optional"
              value={withdrawForm.description}
              onChangeText={(description) =>
                setWithdrawForm((prev) => ({ ...prev, description }))
              }
            />

            <Text style={styles.modalLabel}>{text.paymentMethod}</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodChip,
                    withdrawForm.paymentMethod === method && styles.methodChipActive,
                  ]}
                  onPress={() =>
                    setWithdrawForm((prev) => ({ ...prev, paymentMethod: method }))
                  }
                >
                  <Text
                    style={[
                      styles.methodText,
                      withdrawForm.paymentMethod === method && styles.methodTextActive,
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{text.note}</Text>
            <TextInput
              style={[styles.modalInput, styles.noteInput]}
              placeholder="Optional note"
              multiline
              value={withdrawForm.note}
              onChangeText={(note) => setWithdrawForm((prev) => ({ ...prev, note }))}
            />

            <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}>
              <Text style={styles.modalButtonText}>{text.completeWithdraw}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PaymentWebViewModal
        visible={showPaymentModal}
        checkoutUrl={checkoutUrl}
        onClose={closePaymentModal}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />

      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>{text.goalCompleted}</Text>
            <Text style={styles.celebrationText}>{text.goalCompletedCaption}</Text>
            <TouchableOpacity
              style={styles.celebrationButton}
              onPress={() => setShowCelebration(false)}
            >
              <Text style={styles.celebrationButtonText}>{text.dismiss}</Text>
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
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#DDEFE5',
  },
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 6,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFE0D7',
  },
  goalIcon: {
    fontSize: 50,
    marginTop: 14,
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#153127',
    marginBottom: 4,
  },
  goalCategory: {
    fontSize: 12,
    color: '#416154',
    marginBottom: 12,
    letterSpacing: 1,
  },
  goalDescription: {
    fontSize: 14,
    color: '#38554A',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E7EEEA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#10201A',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressPercent: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  amountLabel: {
    fontSize: 12,
    color: '#73877D',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10201A',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#73877D',
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10201A',
    marginTop: 2,
  },
  timelineSubvalue: {
    fontSize: 12,
    color: '#60756B',
    marginTop: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  transactionTextWrap: {
    flex: 1,
  },
  transactionIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10201A',
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
  transactionDate: {
    fontSize: 12,
    color: '#73877D',
    marginTop: 2,
  },
  transactionNote: {
    fontSize: 12,
    color: '#4F6C5F',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  depositAmount: {
    color: '#34C759',
  },
  withdrawalAmount: {
    color: '#FF3B30',
  },
  noTransactions: {
    textAlign: 'center',
    color: '#73877D',
    paddingVertical: 20,
  },
  seeMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
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
  actionSection: {
    padding: 20,
    backgroundColor: '#FFF',
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7EEEA',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#1E8E5A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardShell: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalContentExpanded: {
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalHelperText: {
    fontSize: 13,
    color: '#5F6D66',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#10201A',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
  },
  noteInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dateFieldButton: {
    borderWidth: 1,
    borderColor: '#D7E5DD',
    borderRadius: 14,
    backgroundColor: '#F7FBF8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10201A',
  },
  dateFieldMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#60756B',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  frequencyWrap: {
    flexWrap: 'wrap',
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDF3EF',
  },
  methodChipActive: {
    backgroundColor: '#1E8E5A',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D4E42',
    textTransform: 'uppercase',
  },
  methodTextActive: {
    color: '#FFF',
  },
  modalButton: {
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  withdrawButton: {
    backgroundColor: '#D94C3D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
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
  modalButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    justifyContent: 'center',
    padding: 20,
  },
  datePickerCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    maxHeight: '90%',
  },
  datePicker: {
    alignSelf: 'stretch',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  datePickerCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EEF3F0',
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: '#41554A',
    fontWeight: '700',
  },
  datePickerConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E8E5A',
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFF',
    fontWeight: '700',
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 32, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10201A',
  },
  celebrationText: {
    fontSize: 14,
    color: '#5F6D66',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  celebrationButton: {
    backgroundColor: '#1E8E5A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  celebrationButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  spacing: {
    height: 34,
  },
});

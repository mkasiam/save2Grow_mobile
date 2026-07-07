import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { challengeService } from '../services/api';
import { ScreenLoadingOverlay, Toast } from '../components';

const CHALLENGE_TYPES = [
  { id: 'save_amount', label: 'Save Amount' },
  { id: 'save_days', label: 'Daily Streak' },
  { id: 'save_percentage', label: 'Percentage Target' },
  { id: 'group_challenge', label: 'Group Saving' },
];

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
] as const;

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatDateForInput = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const mapChallenge = (challenge: any) => ({
  id: challenge._id || challenge.id,
  title: challenge.title,
  description: challenge.description || '',
  type: challenge.type,
  targetValue: Number(challenge.targetValue || 0),
  reward: challenge.reward || 'Badge & Recognition',
  status: challenge.status || 'active',
  participantCount: Array.isArray(challenge.participantIds) ? challenge.participantIds.length : 0,
  startDate: challenge.startDate ? formatDateForInput(new Date(challenge.startDate)) : '',
  endDate: challenge.endDate ? formatDateForInput(new Date(challenge.endDate)) : '',
});

const getStatusColors = (status: string) => {
  if (status === 'inactive') {
    return { bg: '#F3F5F7', fg: '#5E6A73' };
  }

  return { bg: '#E7F5EC', fg: '#1E8E5A' };
};

export default function AdminChallengesScreen() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'save_amount',
    targetValue: '',
    reward: '',
    endDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  });
  const [challenges, setChallenges] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' as 'success' | 'error' });

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const response = await challengeService.getAdminChallenges({
        page: 1,
        limit: 50,
        status: activeFilter,
      });

      setChallenges((response.data?.data || []).map(mapChallenge));
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      showToast('Failed to load challenges', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [loadChallenges])
  );

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    setPickerDate(selectedDate);
    if (Platform.OS === 'android') {
      setForm((prev) => ({ ...prev, endDate: formatDateForInput(selectedDate) }));
      setShowDatePicker(false);
    }
  };

  const confirmPickedDate = () => {
    setForm((prev) => ({ ...prev, endDate: formatDateForInput(pickerDate) }));
    setShowDatePicker(false);
  };

  const handleCreateChallenge = async () => {
    const targetVal = Number(form.targetValue.replace(/,/g, '').trim());
    if (!form.title.trim() || !form.description.trim() || !Number.isFinite(targetVal) || targetVal <= 0) {
      showToast('Please fill all required fields correctly', 'error');
      return;
    }

    setLoading(true);
    try {
      await challengeService.createChallenge({
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        targetValue: targetVal,
        reward: form.reward.trim() || undefined,
        endDate: form.endDate,
      });

      showToast('Challenge created successfully!');
      setForm({
        title: '',
        description: '',
        type: 'save_amount',
        targetValue: '',
        reward: '',
        endDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      });
      setPickerDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      await loadChallenges();
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      showToast(error?.response?.data?.error || 'Failed to create challenge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (challenge: any) => {
    const nextStatus = challenge.status === 'inactive' ? 'active' : 'inactive';

    try {
      await challengeService.updateChallenge(challenge.id, { status: nextStatus });
      showToast(`Challenge marked as ${nextStatus}`);
      await loadChallenges();
    } catch (error: any) {
      console.error('Error updating challenge:', error);
      showToast(error?.response?.data?.error || 'Failed to update challenge', 'error');
    }
  };

  const handleDeleteChallenge = (challenge: any) => {
    Alert.alert(
      'Delete challenge',
      `Delete ${challenge.title}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await challengeService.deleteChallenge(challenge.id);
              showToast('Challenge deleted successfully');
              await loadChallenges();
            } catch (error: any) {
              console.error('Error deleting challenge:', error);
              showToast(error?.response?.data?.error || 'Failed to delete challenge', 'error');
            }
          },
        },
      ]
    );
  };

  const renderChallengeCard = (challenge: any) => {
    const colors = getStatusColors(challenge.status);

    return (
      <View key={challenge.id} style={styles.challengeCard}>
        <View style={styles.challengeTopRow}>
          <View style={styles.challengeTitleWrap}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeMeta}>{challenge.type.replace(/_/g, ' ')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusBadgeText, { color: colors.fg }]}>{challenge.status}</Text>
          </View>
        </View>

        <Text style={styles.challengeDescription}>{challenge.description}</Text>

        <View style={styles.challengeStatsRow}>
          <View style={styles.challengeStat}>
            <Text style={styles.challengeStatLabel}>Target</Text>
            <Text style={styles.challengeStatValue}>Tk {challenge.targetValue.toLocaleString()}</Text>
          </View>
          <View style={styles.challengeStat}>
            <Text style={styles.challengeStatLabel}>Participants</Text>
            <Text style={styles.challengeStatValue}>{challenge.participantCount}</Text>
          </View>
          <View style={styles.challengeStat}>
            <Text style={styles.challengeStatLabel}>Ends</Text>
            <Text style={styles.challengeStatValue}>{challenge.endDate || 'n/a'}</Text>
          </View>
        </View>

        <View style={styles.challengeActions}>
          <TouchableOpacity style={styles.actionChip} onPress={() => handleToggleStatus(challenge)}>
            <Ionicons name={challenge.status === 'inactive' ? 'play-outline' : 'pause-outline'} size={16} color="#1E8E5A" />
            <Text style={styles.actionChipText}>{challenge.status === 'inactive' ? 'Activate' : 'Deactivate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionChip, styles.deleteChip]} onPress={() => handleDeleteChallenge(challenge)}>
            <Ionicons name="trash-outline" size={16} color="#C0392B" />
            <Text style={[styles.actionChipText, styles.deleteChipText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Challenge Dashboard</Text>
          <Text style={styles.subtitle}>Review, activate, deactivate, and create savings challenges.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filterRow}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, activeFilter === filter.id && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.id)}
              >
                <Text style={[styles.filterChipText, activeFilter === filter.id && styles.filterChipTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.summaryText}>Showing {challenges.length} of {pagination.total} challenges</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Challenges</Text>
          {challenges.length ? (
            <View style={styles.listWrap}>{challenges.map(renderChallengeCard)}</View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="trophy-outline" size={42} color="#9BB6A8" />
              <Text style={styles.emptyText}>No challenges match the selected filter.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Create Challenge</Text>
          <Text style={styles.sectionSubtitle}>Deploy a new platform-wide savings initiative for students.</Text>

          <Text style={styles.label}>Challenge Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Eid Savings Challenge"
            placeholderTextColor="#999"
            value={form.title}
            onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
            editable={!loading}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the rules or guidelines for this savings challenge..."
            placeholderTextColor="#999"
            value={form.description}
            onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <Text style={styles.label}>Challenge Type *</Text>
          <View style={styles.typeGrid}>
            {CHALLENGE_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, form.type === t.id && styles.typeChipActive]}
                onPress={() => setForm((prev) => ({ ...prev, type: t.id }))}
                disabled={loading}
              >
                <Text style={[styles.typeChipText, form.type === t.id && styles.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Target Savings Value (Tk) *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={form.targetValue}
            onChangeText={(targetValue) => setForm((prev) => ({ ...prev, targetValue }))}
            editable={!loading}
          />

          <Text style={styles.label}>End Date *</Text>
          <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)} disabled={loading}>
            <Text style={styles.dateText}>{form.endDate}</Text>
            <Ionicons name="calendar-outline" size={20} color="#1E8E5A" />
          </TouchableOpacity>

          <Text style={styles.label}>Reward Descriptor</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Green Saver Badge & 50 XP"
            placeholderTextColor="#999"
            value={form.reward}
            onChangeText={(reward) => setForm((prev) => ({ ...prev, reward }))}
            editable={!loading}
          />

          <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleCreateChallenge} disabled={loading}>
            <Ionicons name="rocket-outline" size={20} color="#FFF" />
            <Text style={styles.submitButtonText}>{loading ? 'Creating...' : 'Launch Challenge'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select End Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.pickerActions}>
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerConfirm} onPress={confirmPickedDate}>
                  <Text style={styles.pickerConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />

      <ScreenLoadingOverlay visible={loading} message="Processing..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F7F4',
  },
  header: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0E2018',
  },
  subtitle: {
    fontSize: 13,
    color: '#5E776C',
    marginTop: 4,
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#163E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0E2018',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#5E776C',
    marginBottom: 12,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  filterChipActive: {
    backgroundColor: '#E8F4EE',
    borderColor: '#1E8E5A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E776C',
  },
  filterChipTextActive: {
    color: '#1E8E5A',
  },
  summaryText: {
    fontSize: 12,
    color: '#5E776C',
  },
  loadingWrap: {
    paddingVertical: 24,
  },
  listWrap: {
    gap: 12,
  },
  challengeCard: {
    borderWidth: 1,
    borderColor: '#E6EEE9',
    backgroundColor: '#FAFCFB',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  challengeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  challengeTitleWrap: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0E2018',
  },
  challengeMeta: {
    fontSize: 12,
    color: '#5E776C',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  challengeDescription: {
    fontSize: 13,
    color: '#5E776C',
    lineHeight: 18,
  },
  challengeStatsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  challengeStat: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7EEEA',
    padding: 10,
  },
  challengeStatLabel: {
    fontSize: 11,
    color: '#6B7D74',
    marginBottom: 4,
  },
  challengeStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10201A',
  },
  challengeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F4EE',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CFE4D8',
  },
  deleteChip: {
    backgroundColor: '#FDF0EE',
    borderColor: '#F4D3CE',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E8E5A',
  },
  deleteChipText: {
    color: '#C0392B',
  },
  emptyWrap: {
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#5E776C',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0E2018',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DFEBE4',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#F9FBF9',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    width: '48%',
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: '#E8F4EE',
    borderColor: '#1E8E5A',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E776C',
  },
  typeChipTextActive: {
    color: '#1E8E5A',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFEBE4',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F9FBF9',
  },
  dateText: {
    fontSize: 15,
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  submitButtonDisabled: {
    backgroundColor: '#7BB89A',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  pickerCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pickerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E776C',
  },
  pickerConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#1E8E5A',
    borderRadius: 10,
  },
  pickerConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
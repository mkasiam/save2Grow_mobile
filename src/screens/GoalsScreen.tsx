import React, { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { GoalCard, ScreenLoadingOverlay, Toast } from '../components';
import { goalService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

type GoalItem = {
  id: string;
  entityType?: 'goal' | 'userChallenge';
  userChallengeId?: string;
  title: string;
  description: string;
  target: number;
  current: number;
  targetDate: string;
  startDate: string;
  category: string;
  icon: string;
  status: 'active' | 'completed' | 'abandoned' | string;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateForInput = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const mapGoal = (goal: any): GoalItem => ({
  id: goal._id || goal.id,
  entityType: goal.entityType || goal.sourceType || 'goal',
  userChallengeId: goal.userChallengeId || undefined,
  title: goal.title,
  description: goal.description || '',
  target: Number(goal.targetAmount || goal.target || 0),
  current: Number(goal.currentAmount || goal.current || 0),
  targetDate: goal.targetDate ? formatDateForInput(new Date(goal.targetDate)) : goal.targetDate,
  startDate: goal.createdAt ? formatDateForInput(new Date(goal.createdAt)) : goal.startDate,
  category: goal.category,
  icon: goal.icon || '🎯',
  status: goal.status || 'active',
});

const CATEGORY_OPTIONS = [
  { id: 'investment', labelKey: 'invest', icon: '💻' },
  { id: 'travel', labelKey: 'travel', icon: '✈️' },
  { id: 'education', labelKey: 'study', icon: '📚' },
  { id: 'emergency', labelKey: 'emergency', icon: '🆘' },
];

const CONTRIBUTION_FREQUENCIES = [
  { id: 'daily', labelKey: 'daily' },
  { id: 'every_3_days', labelKey: 'every3Days' },
  { id: 'weekly', labelKey: 'every7Days' },
  { id: 'monthly', labelKey: 'monthly' },
  { id: 'every_3_months', labelKey: 'every3Months' },
];

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

export default function GoalsScreen({ navigation }: { navigation: any }) {
  const { width } = useWindowDimensions();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [goalTypeFilter, setGoalTypeFilter] = useState<'all' | 'personal' | 'challenge'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<null | 'targetDate' | 'nextContributionDate'>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    target: '',
    targetDate: '',
    nextContributionDate: '',
    contributionFrequency: 'weekly',
    category: 'investment',
    icon: '🎯',
  });

  const loadGoals = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [goalData, settings] = await Promise.all([
        goalService.getGoals(),
        getStoredAppSettings(),
      ]);
      setGoals((goalData.data || []).map(mapGoal));
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading goals:', error);
      showToast(getFriendlyErrorMessage(error, 'Unable to load goals right now.'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
      return undefined;
    }, [loadGoals])
  );

  const text = getCopy(language);
  const copy = text as Record<string, string>;
  const isCompactScreen = width < 380;

  const filteredGoals = goals
    .filter((goal) => {
      if (filter === 'active') return goal.status === 'active';
      if (filter === 'completed') return goal.status === 'completed';
      return true;
    })
    .filter((goal) => {
      if (goalTypeFilter === 'challenge') {
        return goal.entityType === 'userChallenge' || Boolean(goal.userChallengeId);
      }

      if (goalTypeFilter === 'personal') {
        return goal.entityType !== 'userChallenge' && !goal.userChallengeId;
      }

      return true;
    })
    .filter((goal) => {
      if (categoryFilter === 'all') return true;
      return goal.category === categoryFilter;
    })
    .filter((goal) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;

      return (
        goal.title.toLowerCase().includes(query) ||
        goal.description.toLowerCase().includes(query) ||
        goal.category.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'progress') {
        return b.current / b.target - a.current / a.target;
      }

      if (sortBy === 'deadline') {
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }

      if (sortBy === 'target') {
        return b.target - a.target;
      }

      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const handleCreateGoal = async () => {
    const target = Number(form.target);

    if (!form.title.trim() || !target || !form.targetDate.trim()) {
      Alert.alert(text.errorTitle, text.goalCreateValidation);
      return;
    }

    if (
      !isValidDateInput(form.targetDate.trim()) ||
      (form.nextContributionDate.trim() &&
        !isValidDateInput(form.nextContributionDate.trim()))
    ) {
      Alert.alert(
        text.errorTitle,
        text.invalidDateFormat
      );
      return;
    }

    try {
      const selectedCategory = CATEGORY_OPTIONS.find((item) => item.id === form.category);
      const createdGoalResponse = await goalService.createGoal({
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount: target,
        targetDate: form.targetDate.trim(),
        category: form.category,
        icon: form.icon || selectedCategory?.icon || '🎯',
      });

      setShowCreateModal(false);
      setForm({
        title: '',
        description: '',
        target: '',
        targetDate: '',
        nextContributionDate: '',
        contributionFrequency: 'weekly',
        category: 'investment',
        icon: '🎯',
      });
      showToast(text.goalCreateSuccess);
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      showToast(getFriendlyErrorMessage(error, text.goalCreateFailed), 'error');
    }
  };

  const openDatePicker = (field: 'targetDate' | 'nextContributionDate') => {
    const currentValue = field === 'targetDate' ? form.targetDate : form.nextContributionDate;
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
      setForm((prev) => ({
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

    setForm((prev) => ({
      ...prev,
      [activeDateField]: toDateInputValue(pickerDate),
    }));
    closeDatePicker();
  };

  const renderFilterButton = (value: string, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGlow} />
        <View>
          <Text style={styles.headerTitle}>{text.goals}</Text>
          <Text style={styles.headerSubtitle}>
            {filteredGoals.length} {text.goalsInProgress}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={40} color="#1E8E5A" />
        </TouchableOpacity>
      </View>

      <View style={[styles.filterContainer, styles.primaryFilterRow]}>
        {[
          { id: 'all', label: 'All' },
          { id: 'personal', label: 'Personal Goals' },
          { id: 'challenge', label: 'Platform Challenges' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.filterButton, goalTypeFilter === item.id && styles.filterButtonActive]}
            onPress={() => setGoalTypeFilter(item.id as 'all' | 'personal' | 'challenge')}
          >
            <Text style={[styles.filterButtonText, goalTypeFilter === item.id && styles.filterButtonTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterContainer, styles.primaryFilterRow]}>
        {renderFilterButton('all', text.allGoals)}
        {renderFilterButton('active', text.active)}
        {renderFilterButton('completed', text.completed)}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#5D7469" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={text.searchGoalsPlaceholder}
          placeholderTextColor="#82948C"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#7B8E86" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.filterContainer, styles.wrapFilterRow]}>
        <TouchableOpacity
          style={[
            styles.secondaryChip,
            categoryFilter === 'all' && styles.secondaryChipActive,
            isCompactScreen && styles.secondaryChipCompact,
          ]}
          onPress={() => setCategoryFilter('all')}
        >
          <Text
            style={[
              styles.secondaryChipText,
              isCompactScreen && styles.compactChipText,
              categoryFilter === 'all' && styles.secondaryChipTextActive,
            ]}
          >
              {text.allCategories}
            </Text>
          </TouchableOpacity>
        {CATEGORY_OPTIONS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.secondaryChip,
              isCompactScreen && styles.secondaryChipCompact,
              categoryFilter === item.id && styles.secondaryChipActive,
            ]}
            onPress={() => setCategoryFilter(item.id)}
          >
            <Text
              style={[
                styles.secondaryChipText,
                isCompactScreen && styles.compactChipText,
                categoryFilter === item.id && styles.secondaryChipTextActive,
              ]}
            >
              {item.icon} {copy[item.labelKey]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterContainer, styles.wrapFilterRow]}>
        {[
          { id: 'latest', labelKey: 'latest' },
          { id: 'progress', labelKey: 'topProgress' },
          { id: 'deadline', labelKey: 'deadline' },
          { id: 'target', labelKey: 'topTarget' },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.sortChip,
              isCompactScreen && styles.sortChipCompact,
              sortBy === item.id && styles.sortChipActive,
            ]}
            onPress={() => setSortBy(item.id)}
          >
            <Text
              style={[
                styles.sortChipText,
                isCompactScreen && styles.compactChipText,
                sortBy === item.id && styles.sortChipTextActive,
              ]}
            >
              {copy[item.labelKey]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GoalCard
            title={item.title}
            currentAmount={item.current}
            targetAmount={item.target}
            category={item.category}
            icon={item.icon}
            onPress={() => item.entityType === 'userChallenge'
              ? navigation.navigate('ChallengeDetail', { challengeId: item.id })
              : navigation.navigate('GoalDetail', { goalId: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadGoals(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>{text.noGoals}</Text>
            <Text style={styles.emptySubtext}>{text.createFirstGoal}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyButtonText}>+ {text.createGoal}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScreenLoadingOverlay visible={loading} message="Loading goals..." />

      <Modal visible={showCreateModal} transparent animationType="slide">
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
                  <View>
                    <Text style={styles.modalTitle}>{text.createGoal}</Text>
                    <Text style={styles.modalSubtitle}>{text.createGoalSubtitle}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <Ionicons name="close" size={24} color="#10201A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
                  placeholder={text.startupFund}
                />

                <Text style={styles.label}>{text.description}</Text>
                <TextInput
                  style={styles.input}
                  value={form.description}
                  onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
                  placeholder={text.whatSavingFor}
                />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>{text.targetAmount}</Text>
                    <TextInput
                      style={styles.input}
                      value={form.target}
                      onChangeText={(target) => setForm((prev) => ({ ...prev, target }))}
                      keyboardType="decimal-pad"
                      placeholder="50000"
                    />
                  </View>
                </View>

                <Text style={styles.label}>{text.targetDate}</Text>
                <TouchableOpacity
                  style={styles.dateFieldButton}
                  onPress={() => openDatePicker('targetDate')}
                >
                  <View>
                    <Text style={styles.dateFieldValue}>{formatDateDisplay(form.targetDate)}</Text>
                    <Text style={styles.dateFieldMeta}>{form.targetDate || 'Tap to choose a date'}</Text>
                  </View>
                  <Ionicons name="calendar-outline" size={20} color="#1E8E5A" />
                </TouchableOpacity>

                <Text style={styles.label}>{text.nextDepositDate}</Text>
                <TouchableOpacity
                  style={styles.dateFieldButton}
                  onPress={() => openDatePicker('nextContributionDate')}
                >
                  <View>
                    <Text style={styles.dateFieldValue}>
                      {formatDateDisplay(form.nextContributionDate)}
                    </Text>
                    <Text style={styles.dateFieldMeta}>
                      {form.nextContributionDate || 'Tap to choose a date'}
                    </Text>
                  </View>
                  <Ionicons name="calendar-outline" size={20} color="#1E8E5A" />
                </TouchableOpacity>

                <Text style={styles.label}>{text.depositFrequency}</Text>
                <View style={styles.categoryWrap}>
                  {CONTRIBUTION_FREQUENCIES.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.categoryChip,
                        form.contributionFrequency === item.id && styles.categoryChipActive,
                      ]}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          contributionFrequency: item.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          form.contributionFrequency === item.id &&
                            styles.categoryChipTextActive,
                        ]}
                      >
                        {copy[item.labelKey]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{text.category}</Text>
                <View style={styles.categoryWrap}>
                  {CATEGORY_OPTIONS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.categoryChip,
                        form.category === item.id && styles.categoryChipActive,
                      ]}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          category: item.id,
                          icon: item.icon,
                        }))
                      }
                    >
                      <Text style={styles.categoryEmoji}>{item.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          form.category === item.id && styles.categoryChipTextActive,
                        ]}
                      >
                        {copy[item.labelKey]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleCreateGoal}>
                  <Text style={styles.primaryButtonText}>{text.saveChanges}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.secondaryButtonText}>{text.cancel}</Text>
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
                {activeDateField === 'nextContributionDate' ? text.nextDepositDate : text.targetDate}
              </Text>
              <TouchableOpacity onPress={closeDatePicker}>
                <Ionicons name="close" size={24} color="#10201A" />
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
                <Text style={styles.datePickerCancelText}>{text.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirm} onPress={confirmPickedDate}>
                <Text style={styles.datePickerConfirmText}>{text.saveChanges}</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#E8F4EE',
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8DE',
  },
  headerGlow: {
    position: 'absolute',
    right: -18,
    top: -22,
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.34)',
    transform: [{ rotate: '20deg' }],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10201A',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#5F6D66',
    marginTop: 4,
  },
  addButton: {
    padding: 4,
    marginTop: 18,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  primaryFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E7EFEB',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1E8E5A',
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#456056',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFEAE4',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#10201A',
  },
  wrapFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EDF3F0',
    borderWidth: 1,
    borderColor: '#E0E9E4',
    minHeight: 36,
    justifyContent: 'center',
  },
  secondaryChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  secondaryChipActive: {
    backgroundColor: '#173629',
    borderColor: '#173629',
  },
  secondaryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#486258',
  },
  secondaryChipTextActive: {
    color: '#FFF',
  },
  sortChip: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDE8E2',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sortChipActive: {
    backgroundColor: '#E7F3EC',
    borderColor: '#7BB795',
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#486258',
  },
  sortChipTextActive: {
    color: '#1E8E5A',
  },
  compactChipText: {
    fontSize: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 30,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4ECE8',
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10201A',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64756D',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#1E8E5A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 14, 0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardShell: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalContentExpanded: {
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10201A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64756D',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#25453A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F7FBF8',
    borderWidth: 1,
    borderColor: '#DCE9E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  dateFieldButton: {
    borderWidth: 1,
    borderColor: '#DCE9E1',
    borderRadius: 12,
    backgroundColor: '#F7FBF8',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10201A',
  },
  dateFieldMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7F75',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#DCE9E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F7FBF8',
  },
  categoryChipActive: {
    backgroundColor: '#1E8E5A',
    borderColor: '#1E8E5A',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25453A',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  primaryButton: {
    backgroundColor: '#1E8E5A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#EEF4F0',
  },
  secondaryButtonText: {
    color: '#355549',
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 14, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  datePickerCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 18,
  },
  datePicker: {
    alignSelf: 'stretch',
  },
  datePickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  datePickerCancel: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#EEF4F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerCancelText: {
    color: '#355549',
    fontWeight: '700',
  },
  datePickerConfirm: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#1E8E5A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFF',
    fontWeight: '700',
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { challengeService } from '../services/api';
import { Toast } from '../components';

const CHALLENGE_TYPES = [
  { id: 'save_amount', label: 'Save Amount' },
  { id: 'save_days', label: 'Daily Streak' },
  { id: 'save_percentage', label: 'Percentage Target' },
  { id: 'group_challenge', label: 'Group Saving' },
];

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatDateForInput = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export default function AdminChallengesScreen() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'save_amount',
    targetValue: '',
    reward: '',
    endDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' as 'success' | 'error' });

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!selectedDate) return;
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
      
      // Reset form
      setForm({
        title: '',
        description: '',
        type: 'save_amount',
        targetValue: '',
        reward: '',
        endDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      });
      setPickerDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      showToast(error?.response?.data?.error || 'Failed to create challenge', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create Challenge</Text>
        <Text style={styles.subtitle}>Deploy a new platform-wide savings initiative for students</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
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
                style={[
                  styles.typeChip,
                  form.type === t.id && styles.typeChipActive,
                ]}
                onPress={() => setForm((prev) => ({ ...prev, type: t.id }))}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    form.type === t.id && styles.typeChipTextActive,
                  ]}
                >
                  {t.label}
                </Text>
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
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
            disabled={loading}
          >
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

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateChallenge}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Launch Challenge</Text>
              </>
            )}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F7F4',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#E8F4EE',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8DE',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0E2018',
  },
  subtitle: {
    fontSize: 12,
    color: '#5E776C',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#163E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  pickerCancel: {
    padding: 10,
  },
  pickerCancelText: {
    color: '#777',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerConfirm: {
    padding: 10,
    backgroundColor: '#1E8E5A',
    borderRadius: 8,
  },
  pickerConfirmText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Toast } from '../components';
import {
  getStoredAppSettings,
  updateStoredAppSettings,
} from '../utils/appSettings';
import { getCopy } from '../utils/copy';

const FREQUENCY_OPTIONS = ['daily', 'weekly', 'weekdays'];
const TIME_OPTIONS = ['7:00 AM', '8:00 PM', '9:30 PM'];

export default function ReminderSettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await getStoredAppSettings();
      setSettings(stored);
      setLanguage(stored.language);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const text = getCopy(language);

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const saveSettings = async (updates: Record<string, any>) => {
    try {
      const next = await updateStoredAppSettings(updates);
      setSettings(next);
      showToast(text.remindersUpdated);
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      showToast(text.remindersUpdateFailed, 'error');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadSettings} />
      }
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{text.reminderSettings}</Text>
        <Text style={styles.heroText}>{text.chooseReminderCaption}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.sectionTitle}>{text.savingsReminders}</Text>
            <Text style={styles.sectionText}>{text.remindersToggleCaption}</Text>
          </View>
          <Switch
            value={Boolean(settings?.remindersEnabled)}
            onValueChange={(value) => saveSettings({ remindersEnabled: value })}
            trackColor={{ false: '#D6E3DD', true: '#7CC6A1' }}
            thumbColor={settings?.remindersEnabled ? '#1E8E5A' : '#F7FBF8'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.frequency}</Text>
        <View style={styles.optionRow}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionChip,
                settings?.reminderFrequency === option && styles.optionChipActive,
              ]}
              onPress={() => saveSettings({ reminderFrequency: option })}
            >
              <Text
                style={[
                  styles.optionChipText,
                  settings?.reminderFrequency === option && styles.optionChipTextActive,
                ]}
              >
                {option === 'daily'
                  ? text.daily
                  : option === 'weekly'
                    ? text.every7Days
                    : text.every3Days}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{text.preferredTime}</Text>
        <View style={styles.optionColumn}>
          {TIME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.timeCard,
                settings?.reminderTime === option && styles.timeCardActive,
              ]}
              onPress={() => saveSettings({ reminderTime: option })}
            >
              <Text
                style={[
                  styles.timeTitle,
                  settings?.reminderTime === option && styles.timeTitleActive,
                ]}
              >
                {option}
              </Text>
              <Text style={styles.timeText}>
                {option === '7:00 AM'
                  ? text.reminderMorningCaption
                  : option === '8:00 PM'
                    ? text.reminderEveningCaption
                    : text.reminderLateCaption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
  section: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10201A',
  },
  sectionText: {
    fontSize: 13,
    color: '#60756B',
    lineHeight: 19,
    marginTop: 6,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EFF5F1',
    borderWidth: 1,
    borderColor: '#E0E9E4',
  },
  optionChipActive: {
    backgroundColor: '#173629',
    borderColor: '#173629',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#486258',
  },
  optionChipTextActive: {
    color: '#FFF',
  },
  optionColumn: {
    gap: 10,
    marginTop: 12,
  },
  timeCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E1ECE6',
    backgroundColor: '#F7FBF8',
  },
  timeCardActive: {
    borderColor: '#2D8C62',
    backgroundColor: '#EAF6EF',
  },
  timeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10201A',
  },
  timeTitleActive: {
    color: '#1E8E5A',
  },
  timeText: {
    fontSize: 12,
    color: '#60756B',
    marginTop: 6,
    lineHeight: 18,
  },
});

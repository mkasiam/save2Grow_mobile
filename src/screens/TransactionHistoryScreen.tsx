import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { goalService, transactionService } from '../services/api';
import { getStoredAppSettings } from '../utils/appSettings';
import { getCopy } from '../utils/copy';

const formatMethod = (method: any) => {
  if (!method) {
    return 'MANUAL';
  }

  return method.toUpperCase();
};

export default function TransactionHistoryScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goalsMap, setGoalsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [transactionResponse, goalsResponse, settings] = await Promise.all([
        transactionService.getTransactions(),
        goalService.getGoals(),
        getStoredAppSettings(),
      ]);

      setTransactions(transactionResponse.data || []);
      setGoalsMap(
        (goalsResponse.data || []).reduce((acc: Record<string, string>, goal: any) => {
          const goalId = goal._id || goal.id;
          if (goalId) {
            acc[goalId] = goal.title;
          }
          return acc;
        }, {})
      );
      setLanguage(settings.language);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const text = getCopy(language);
  const totalIn = transactions
    .filter((item: any) => item.type === 'deposit')
    .reduce((sum, item: any) => sum + Number(item.amount), 0);
  const totalOut = transactions
    .filter((item: any) => item.type === 'withdrawal')
    .reduce((sum, item: any) => sum + Number(item.amount), 0);
  const filteredTransactions = transactions.filter((item: any) => {
    const goalId = item.goalId?._id || item.goalId;
    const matchesType = filter === 'all' ? true : item.type === filter;
    const searchTarget = [
      item.description,
      item.paymentMethod,
      item.note,
      goalsMap[goalId],
      item.createdAt,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = query.trim()
      ? searchTarget.includes(query.trim().toLowerCase())
      : true;

    return matchesType && matchesQuery;
  });

  const renderItem = ({ item }: { item: any }) => {
    const isDeposit = item.type === 'deposit';
    const goalId = item.goalId?._id || item.goalId;
    const itemDate = new Date(item.createdAt || item.date).toLocaleDateString();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedTransaction(item)}
      >
        <View
          style={[
            styles.timelineDot,
            isDeposit ? styles.depositDot : styles.withdrawalDot,
          ]}
        />
        <View style={[styles.iconWrap, isDeposit ? styles.iconWrapIn : styles.iconWrapOut]}>
          <Text style={styles.icon}>{isDeposit ? '↘' : '↗'}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.rowTop}>
            <Text style={styles.title}>{item.description}</Text>
            <View
              style={[
                styles.typePill,
                isDeposit ? styles.typePillIn : styles.typePillOut,
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  isDeposit ? styles.deposit : styles.withdrawal,
                ]}
              >
                {isDeposit ? 'Deposit' : 'Withdraw'}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {goalsMap[goalId] || 'Unknown Goal'} • {itemDate}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.methodPill}>{formatMethod(item.paymentMethod)}</Text>
            {item.note ? <Text style={styles.noteText}>{item.note}</Text> : null}
          </View>
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, isDeposit ? styles.deposit : styles.withdrawal]}>
            {isDeposit ? '+' : '-'}Tk {Number(item.amount).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{text.transactionHistory}</Text>
        <Text style={styles.summaryText}>{text.historyCaption}</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryMetric, styles.summaryMetricIn]}>
            <Text style={styles.summaryMetricLabel}>{text.moneyIn}</Text>
            <Text style={styles.summaryMetricValue}>Tk {totalIn.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryMetric, styles.summaryMetricOut]}>
            <Text style={styles.summaryMetricLabel}>{text.moneyOut}</Text>
            <Text style={styles.summaryMetricValue}>Tk {totalOut.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterCard}>
        <TextInput
          style={styles.searchInput}
          placeholder={text.searchTransactions}
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: text.allGoals },
            { id: 'deposit', label: text.deposits },
            { id: 'withdrawal', label: text.withdrawals },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.filterChip,
                filter === item.id && styles.filterChipActive,
              ]}
              onPress={() => setFilter(item.id as 'all' | 'deposit' | 'withdrawal')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item: any) => item._id || item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTransactions} />
        }
        ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{text.noTransactions}</Text>
            <Text style={styles.emptyText}>{text.historyEmptyCaption}</Text>
          </View>
        }
      />

      <Modal visible={Boolean(selectedTransaction)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{text.transactionDetails}</Text>
              <TouchableOpacity onPress={() => setSelectedTransaction(null)}>
                <Text style={styles.closeText}>{text.close}</Text>
              </TouchableOpacity>
            </View>

            {selectedTransaction ? (
              <View style={styles.detailList}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    Tk {Number(selectedTransaction.amount).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Goal</Text>
                  <Text style={styles.detailValue}>
                    {goalsMap[selectedTransaction.goalId?._id || selectedTransaction.goalId] || 'Unknown Goal'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedTransaction.createdAt || selectedTransaction.date).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailValue}>
                    {formatMethod(selectedTransaction.paymentMethod)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.description}
                  </Text>
                </View>
                {selectedTransaction.note ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{selectedTransaction.note}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  summaryCard: {
    margin: 20,
    marginBottom: 8,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#173629',
    borderWidth: 1,
    borderColor: '#29503F',
    shadowColor: '#0E2A1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: '#B8D4C7',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  summaryMetric: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  summaryMetricIn: {
    backgroundColor: 'rgba(198, 224, 168, 0.14)',
    borderColor: 'rgba(198, 224, 168, 0.28)',
  },
  summaryMetricOut: {
    backgroundColor: 'rgba(247, 235, 210, 0.12)',
    borderColor: 'rgba(247, 235, 210, 0.24)',
  },
  summaryMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B8D4C7',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  filterCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 14,
  },
  searchInput: {
    backgroundColor: '#F6FAF7',
    borderWidth: 1,
    borderColor: '#DFEAE4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#10201A',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EDF4F0',
  },
  filterChipActive: {
    backgroundColor: '#173629',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#486258',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  card: {
    backgroundColor: '#FFFCF6',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8E1D3',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#103B2D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 14, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
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
    color: '#10201A',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173629',
  },
  detailList: {
    gap: 12,
  },
  detailRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3EF',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#72847A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 15,
    color: '#10201A',
    marginTop: 4,
    lineHeight: 20,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 18,
    marginRight: 10,
  },
  depositDot: {
    backgroundColor: '#1E8E5A',
  },
  withdrawalDot: {
    backgroundColor: '#D94C3D',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapIn: {
    backgroundColor: '#E3F0E1',
  },
  iconWrapOut: {
    backgroundColor: '#F8EEDF',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10201A',
    flex: 1,
  },
  meta: {
    fontSize: 12,
    color: '#64756D',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  methodPill: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5B4A21',
    backgroundColor: '#F6EEDB',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: '#E7D4A7',
  },
  noteText: {
    fontSize: 12,
    color: '#60756B',
    flexShrink: 1,
  },
  typePill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  typePillIn: {
    backgroundColor: '#E3F0E1',
  },
  typePillOut: {
    backgroundColor: '#F8EEDF',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  amountWrap: {
    marginLeft: 10,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#E7EFEB',
    justifyContent: 'center',
    minHeight: 48,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
  },
  deposit: {
    color: '#1E8E5A',
  },
  withdrawal: {
    color: '#D94C3D',
  },
  emptyState: {
    marginTop: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#10201A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64756D',
    textAlign: 'center',
  },
});

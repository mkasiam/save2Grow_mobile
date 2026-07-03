import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { transactionService, withdrawalService } from '../services/api';
import { Toast } from '../components';

type TransactionItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  date: string;
  description: string;
};

type WithdrawalItem = {
  id: string;
  studentName: string;
  studentEmail: string;
  challengeTitle: string;
  requestType: string;
  payoutAmount: number;
  penaltyFee: number;
  initialDepositAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  adminNote?: string;
};

export default function AdminTransactionsScreen() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'transactions' | 'withdrawals'>('transactions');
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' as 'success' | 'error' });

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [transactionsResponse, withdrawalsResponse] = await Promise.all([
        transactionService.getAllTransactions(),
        withdrawalService.getAllWithdrawalRequests(),
      ]);

      setTransactions((transactionsResponse.data || []).map((item: any) => ({
        id: item._id || item.id,
        studentName: item.userId?.name || 'Unknown Student',
        studentEmail: item.userId?.email || 'N/A',
        type: item.type,
        amount: Number(item.amount || 0),
        paymentMethod: item.paymentMethod || 'bkash',
        transactionId: item.transactionId || item._id || item.id,
        status: item.status || 'pending',
        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A',
        description: item.description || 'Manual deposit',
      })));

      setWithdrawalRequests((withdrawalsResponse.data || []).map((item: any) => ({
        id: item._id || item.id,
        studentName: item.userId?.name || 'Unknown Student',
        studentEmail: item.userId?.email || 'N/A',
        challengeTitle: item.challengeId?.title || 'Challenge withdrawal',
        requestType: item.requestType || 'early_withdrawal',
        payoutAmount: Number(item.payoutAmount || 0),
        penaltyFee: Number(item.penaltyFee || 0),
        initialDepositAmount: Number(item.initialDepositAmount || 0),
        status: item.status || 'pending',
        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A',
        adminNote: item.adminNote || '',
      })));
    } catch (error) {
      console.error('Error fetching admin data:', error);
      showToast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleUpdateStatus = async (transactionId: string, status: 'completed' | 'failed') => {
    try {
      await transactionService.updateTransactionStatus(transactionId, status);
      showToast(`Transaction ${status === 'completed' ? 'approved' : 'rejected'} successfully`);
      setTransactions((prev) => prev.map((item) => (item.id === transactionId ? { ...item, status } : item)));
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      showToast(error?.response?.data?.error || 'Failed to update transaction', 'error');
    }
  };

  const handleWithdrawalDecision = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    try {
      await withdrawalService.updateWithdrawalStatus(
        withdrawalId,
        status,
        status === 'approved' ? 'Approved & processing for manual transfer' : 'Rejected by admin',
      );
      showToast(`Withdrawal request ${status}`);
      setWithdrawalRequests((prev) => prev.map((item) => (item.id === withdrawalId ? { ...item, status } : item)));
    } catch (error: any) {
      console.error('Error updating withdrawal request:', error);
      showToast(error?.response?.data?.error || 'Failed to update withdrawal request', 'error');
    }
  };

  const filteredTransactions = transactions.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.studentName.toLowerCase().includes(query) ||
      item.studentEmail.toLowerCase().includes(query) ||
      item.transactionId.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);

    const matchesFilter = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const filteredWithdrawals = withdrawalRequests.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.studentName.toLowerCase().includes(query) ||
      item.studentEmail.toLowerCase().includes(query) ||
      item.challengeTitle.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query);

    const matchesFilter = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return { bg: '#E7F5EC', text: '#1E8E5A' };
      case 'failed':
      case 'rejected':
        return { bg: '#FCEBE8', text: '#D94C3D' };
      case 'processing':
        return { bg: '#EEF3FF', text: '#2B63C6' };
      case 'pending':
      default:
        return { bg: '#FEF9EC', text: '#D9A13C' };
    }
  };

  const renderTransactionItem = ({ item }: { item: TransactionItem }) => {
    const colors = getStatusColor(item.status);
    const isDeposit = item.type === 'deposit';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={[styles.detailValue, isDeposit ? styles.depositText : styles.withdrawText]}>
              {isDeposit ? '+' : '-'}Tk {item.amount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type / Method:</Text>
            <Text style={styles.detailValue}>
              {item.type.toUpperCase()} via {item.paymentMethod.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{item.description}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID:</Text>
            <Text style={styles.detailCode}>{item.transactionId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{item.date}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleUpdateStatus(item.id, 'completed')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleUpdateStatus(item.id, 'failed')}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderWithdrawalItem = ({ item }: { item: WithdrawalItem }) => {
    const colors = getStatusColor(item.status);
    const isPending = item.status === 'pending';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.studentName}>{item.studentName}</Text>
            <Text style={styles.studentEmail}>{item.studentEmail}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Challenge:</Text>
            <Text style={styles.detailValue}>{item.challengeTitle}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payout / Penalty:</Text>
            <Text style={styles.detailValue}>Tk {item.payoutAmount.toLocaleString()} / Tk {item.penaltyFee.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Initial deposit:</Text>
            <Text style={styles.detailValue}>Tk {item.initialDepositAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{item.requestType.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Note:</Text>
            <Text style={styles.detailValue}>{item.adminNote || 'No admin note'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{item.date}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleWithdrawalDecision(item.id, 'approved')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleWithdrawalDecision(item.id, 'rejected')}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Approvals</Text>
        <Text style={styles.subtitle}>Track deposits and review withdrawal requests</Text>
      </View>

      <View style={styles.searchFilterSection}>
        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'transactions' && styles.viewToggleActive]}
            onPress={() => setViewMode('transactions')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'transactions' && styles.viewToggleTextActive]}>
              Transactions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'withdrawals' && styles.viewToggleActive]}
            onPress={() => setViewMode('withdrawals')}
          >
            <Text style={[styles.viewToggleText, viewMode === 'withdrawals' && styles.viewToggleTextActive]}>
              Withdrawal Requests
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by student, ID, description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterChipsRow}>
          {(['all', 'pending', 'completed', 'failed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && transactions.length === 0 && withdrawalRequests.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1E8E5A" />
        </View>
      ) : (
        <FlatList
          data={viewMode === 'transactions' ? filteredTransactions : filteredWithdrawals}
          renderItem={viewMode === 'transactions' ? renderTransactionItem : renderWithdrawalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} colors={['#1E8E5A']} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="swap-horizontal-outline" size={64} color="#C4D7CE" />
              <Text style={styles.emptyText}>
                {viewMode === 'transactions' ? 'No transaction records found' : 'No withdrawal requests found'}
              </Text>
            </View>
          }
        />
      )}

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
  searchFilterSection: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF1EE',
    gap: 12,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  viewToggleActive: {
    backgroundColor: '#173629',
    borderColor: '#173629',
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E776C',
  },
  viewToggleTextActive: {
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  filterChipActive: {
    backgroundColor: '#1E8E5A',
    borderColor: '#1E8E5A',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5E776C',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#163E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF1EE',
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0E2018',
  },
  studentEmail: {
    fontSize: 12,
    color: '#5E776C',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailsSection: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#2D3748',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  detailCode: {
    fontSize: 11,
    color: '#718096',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  depositText: {
    color: '#1E8E5A',
    fontWeight: '700',
  },
  withdrawText: {
    color: '#D94C3D',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: '#1E8E5A',
  },
  rejectButton: {
    backgroundColor: '#D94C3D',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    color: '#8A9E94',
    marginTop: 12,
    fontWeight: '600',
  },
});
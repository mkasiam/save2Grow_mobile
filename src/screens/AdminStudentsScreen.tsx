import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { userService } from '../services/api';
import { Toast, ScreenLoadingOverlay } from '../components';

type StudentUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  university?: string;
  studentId?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
};

export default function AdminStudentsScreen() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [toast, setToast] = useState({ visible: false, message: '', variant: 'success' as 'success' | 'error' });

  const fetchStudents = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await userService.getAllStudents();
      const mapped = (response.data || []).map((item: any) => ({
        id: item._id || item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        university: item.university || item.studentProfile?.university,
        studentId: item.studentId || item.studentProfile?.studentId,
        verificationStatus: item.verificationStatus || item.studentProfile?.verificationStatus || 'pending',
      }));
      setStudents(mapped);
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStudents();
    }, [fetchStudents])
  );

  const showToast = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, variant });
  };

  const handleVerify = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      await userService.verifyStudent(userId, status);
      showToast(`Student verification ${status} successfully`);
      
      // Update local state instantly to prevent hard re-renders
      setStudents((prev) =>
        prev.map((student) =>
          student.id === userId ? { ...student, verificationStatus: status } : student
        )
      );
    } catch (error: any) {
      console.error('Error verifying student:', error);
      showToast(error?.response?.data?.error || 'Verification failed', 'error');
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.university && student.university.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.studentId && student.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = statusFilter === 'all' || student.verificationStatus === statusFilter;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return { bg: '#E7F5EC', text: '#1E8E5A' };
      case 'rejected':
        return { bg: '#FCEBE8', text: '#D94C3D' };
      case 'pending':
      default:
        return { bg: '#FEF9EC', text: '#D9A13C' };
    }
  };

  const renderStudentItem = ({ item }: { item: StudentUser }) => {
    const colors = getStatusColor(item.verificationStatus);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={24} color="#163E2C" />
          </View>
          <View style={styles.infoWrap}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentEmail}>{item.email}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {(item.verificationStatus || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.academicDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.detailText}>University: {item.university || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Student ID: {item.studentId || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Phone: {item.phone || 'N/A'}</Text>
          </View>
        </View>

        {item.verificationStatus === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleVerify(item.id, 'verified')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleVerify(item.id, 'rejected')}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFF" />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Student Verifications</Text>
        <Text style={styles.subtitle}>Review academic status credentials and approve accounts</Text>
      </View>

      <View style={styles.searchFilterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#777" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, or university..."
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
          {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                statusFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredStudents}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchStudents(true)} colors={['#1E8E5A']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={64} color="#C4D7CE" />
            <Text style={styles.emptyText}>No student records found</Text>
          </View>
        }
      />

      <ScreenLoadingOverlay visible={loading} message="Loading students..." />

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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF1EE',
    paddingBottom: 12,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F4EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoWrap: {
    flex: 1,
    marginLeft: 12,
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
  academicDetails: {
    gap: 8,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
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
  approveButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#D94C3D',
  },
  rejectButtonText: {
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

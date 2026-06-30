import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => logout(), style: 'destructive' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Profile</Text>
        <Text style={styles.subtitle}>System Administrator settings and actions</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Ionicons name="shield-checkmark" size={48} color="#1E8E5A" />
        </View>
        <Text style={styles.adminName}>{user?.name || 'Administrator'}</Text>
        <Text style={styles.adminEmail}>{user?.email || 'admin@save2grow.com'}</Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>SYSTEM ADMIN</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#D94C3D" />
          <Text style={styles.logoutText}>Sign Out of System</Text>
        </TouchableOpacity>
      </View>
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
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2ECE7',
    shadowColor: '#163E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F4EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0E2018',
  },
  adminEmail: {
    fontSize: 14,
    color: '#5E776C',
    marginTop: 4,
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: '#1E8E5A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionsSection: {
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FCEBE8',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: '#D94C3D',
    fontSize: 15,
    fontWeight: '600',
  },
});

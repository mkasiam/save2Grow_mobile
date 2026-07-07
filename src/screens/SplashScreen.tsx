import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconShell}>
        <Ionicons name="leaf" size={20} color="#F6FFF9" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.save}>Save</Text>
        <Text style={styles.grow}>2Grow</Text>
      </View>

      <ActivityIndicator size={36} color="#007AFF" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E8E5A',
    shadowColor: '#173629',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  save: {
    fontSize: 30,
    fontWeight: '800',
    color: '#173629',
    letterSpacing: 0.5,
  },
  grow: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2D8C62',
    letterSpacing: 0.5,
  },
  loader: {
    marginTop: 20,
  },
});

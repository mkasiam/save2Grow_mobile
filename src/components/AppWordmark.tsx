import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function AppWordmark({ scale = 1 }: { scale?: number }) {
  return (
    <View style={[styles.wrap, { transform: [{ scale }] }]}>
      <View style={styles.iconShell}>
        <Ionicons name="leaf" size={15} color="#F6FFF9" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.save}>Save</Text>
        <Text style={styles.grow}>2Grow</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#173629',
    letterSpacing: 0.5,
  },
  grow: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D8C62',
    letterSpacing: 0.5,
  },
});

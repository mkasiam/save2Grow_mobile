import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type ScreenLoadingOverlayProps = {
  visible: boolean;
  message?: string;
};

export const ScreenLoadingOverlay = ({ visible, message = 'Loading...' }: ScreenLoadingOverlayProps) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#1E8E5A" />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 28, 22, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  card: {
    minWidth: 160,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#0E2018',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#173629',
  },
});
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function Toast({
  visible,
  message,
  variant = 'success',
  onHide,
}) {
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(() => {
      onHide?.();
    }, 2400);

    return () => clearTimeout(timer);
  }, [visible, onHide]);

  if (!visible || !message) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        variant === 'error' ? styles.error : styles.success,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  success: {
    backgroundColor: '#163E2C',
  },
  error: {
    backgroundColor: '#8C2F24',
  },
  text: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

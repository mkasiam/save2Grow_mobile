import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

type PaymentWebViewModalProps = {
  visible: boolean;
  checkoutUrl: string | null;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: () => void;
};

const isCheckoutCompleteUrl = (url: string) =>
  url.startsWith('save2grow://payment-complete') || url.includes('/sslcommerz/success');

const isCheckoutFailedUrl = (url: string) =>
  url.startsWith('save2grow://payment-failed') ||
  url.includes('/sslcommerz/fail') ||
  url.includes('/sslcommerz/cancel');

export const PaymentWebViewModal = ({
  visible,
  checkoutUrl,
  onClose,
  onSuccess,
  onFailure,
}: PaymentWebViewModalProps) => {
  const [pageLoading, setPageLoading] = useState(true);

  const webViewSource = useMemo(() => {
    if (!checkoutUrl) {
      return null;
    }

    return { uri: checkoutUrl };
  }, [checkoutUrl]);

  const handleNavigationChange = (navigationState: any) => {
    const url = navigationState.url || '';

    if (isCheckoutCompleteUrl(url)) {
      onSuccess();
      onClose();
    }

    if (isCheckoutFailedUrl(url)) {
      onFailure();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Secure checkout</Text>
            <Text style={styles.subtitle}>Complete your deposit inside Save2Grow.</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#173629" />
          </TouchableOpacity>
        </View>

        <View style={styles.webViewWrap}>
          {webViewSource ? (
            <WebView
              source={webViewSource}
              onNavigationStateChange={handleNavigationChange}
              onLoadEnd={() => setPageLoading(false)}
              onLoadStart={() => setPageLoading(true)}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#1E8E5A" />
                </View>
              )}
            />
          ) : null}

          {pageLoading ? (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#1E8E5A" />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1ECE6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10201A',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#60756B',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F2EC',
  },
  webViewWrap: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
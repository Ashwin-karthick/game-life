import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive-action confirm.
 * Alert.alert is a no-op on react-native-web, so fall back to window.confirm.
 */
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  onCancel?: () => void
) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    } else {
      onCancel?.();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: onCancel },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

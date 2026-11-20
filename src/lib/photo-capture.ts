import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  exif: false,
};

/**
 * Takes a photo with the camera. Every photo in the app (documents, selfies, pickup/drop proof)
 * must be captured live: picking an existing image from the gallery is not offered, so a driver
 * can't upload someone else's document or an old photo. Resolves null if the user cancels or the
 * camera can't be used.
 */
export async function capturePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Camera access needed',
      'Allow camera access in Settings to take verification photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ],
    );
    return null;
  }
  try {
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  } catch {
    Alert.alert('Camera unavailable', 'This device has no camera that can take the photo.');
    return null;
  }
}

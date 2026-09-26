import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type PhotoSource = 'camera' | 'library';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.6,
  exif: false,
};

async function launch(source: PhotoSource): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access in Settings to take verification photos.',
      );
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return result.canceled ? null : (result.assets[0]?.uri ?? null);
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/**
 * Takes a photo, falling back to the library when the camera is unavailable
 * (simulators have no camera feed). Resolves null if the user cancels.
 */
export async function capturePhoto(allowLibrary = true): Promise<string | null> {
  if (!Device.isDevice) return allowLibrary ? launch('library') : null;
  try {
    return await launch('camera');
  } catch {
    // No camera hardware — the library is the only way to attach a photo.
    return allowLibrary ? launch('library') : null;
  }
}

/** Asks where the photo should come from, for documents that may already exist as images. */
export function choosePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => capturePhoto().then(resolve) },
      { text: 'Choose from library', onPress: () => launch('library').then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

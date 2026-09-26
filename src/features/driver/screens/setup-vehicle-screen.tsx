import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppKeyboardAvoidingView,
  AppPressable,
  AppScrollView,
  AppText,
  AppView,
  Button,
  FocusAwareStatusBar,
  Icon,
  LiquidGlassBackButton,
  TextField,
} from '@/components/ui';
import { useDriverStore } from '@/stores/driver-store';

import { PhotoUploadBox } from '../components/photo-upload-box';

const VEHICLE_TYPES = ['Tata Ace', '2 Wheeler', '3 Wheeler', 'Pickup 8ft', 'Canter 14ft'];

export function SetupVehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const vehicle = useDriverStore((s) => s.vehicle);
  const saveVehicleDetails = useDriverStore((s) => s.saveVehicleDetails);

  const [type, setType] = useState(vehicle.type || 'Tata Ace');
  const [model, setModel] = useState(vehicle.model || 'Tata Ace Gold');
  const [plateNumber, setPlateNumber] = useState(vehicle.plateNumber || 'KA 03 MX 2814');
  const [capacity, setCapacity] = useState(vehicle.capacity || '750 kg');
  const [rcPhoto, setRcPhoto] = useState<string | null>(
    vehicle.rcUploaded
      ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
      : null,
  );
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(
    vehicle.photoUploaded
      ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
      : null,
  );

  const handleSave = () => {
    if (!model.trim() || !plateNumber.trim()) {
      Alert.alert('Required Fields', 'Please enter your vehicle model and registration number.');
      return;
    }

    saveVehicleDetails({
      type,
      model,
      plateNumber: plateNumber.toUpperCase(),
      capacity,
      rcUploaded: Boolean(rcPhoto),
      photoUploaded: Boolean(vehiclePhoto),
    });

    Alert.alert('Vehicle Saved! 🚚', 'Your vehicle details have been saved successfully.', [
      { text: 'Done', onPress: () => router.back() },
    ]);
  };

  return (
    <AppView className="flex-1 bg-background">
      <FocusAwareStatusBar />

      {/* Top Header */}
      <AppView
        style={{ paddingTop: Math.max(insets.top, 12) + 4 }}
        className="border-b border-border/80 bg-card px-5 pb-3.5 shadow-sm"
      >
        <AppView row className="items-center gap-3">
          <LiquidGlassBackButton onPress={() => router.back()} />
          <AppView>
            <AppText className="text-[20px] font-black text-foreground">Add Your Vehicle</AppText>
            <AppText className="text-[12px] text-muted">Enter vehicle specs & documents</AppText>
          </AppView>
        </AppView>
      </AppView>

      <AppKeyboardAvoidingView>
        <AppScrollView
          contentContainerClassName="px-5 pb-16 pt-4 gap-5"
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle Type Selection */}
          <AppView>
            <AppText className="mb-2 text-[14px] font-semibold text-foreground">
              Vehicle Category
            </AppText>
            <AppScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {VEHICLE_TYPES.map((vType) => {
                const isSelected = type === vType;
                return (
                  <AppPressable
                    key={vType}
                    onPress={() => setType(vType)}
                    className={`rounded-2xl border px-4 py-2.5 ${
                      isSelected ? 'border-brand bg-brand/10' : 'border-border bg-card'
                    }`}
                  >
                    <AppText
                      className={`text-[13px] ${
                        isSelected ? 'font-bold text-brand' : 'font-medium text-foreground'
                      }`}
                    >
                      {vType}
                    </AppText>
                  </AppPressable>
                );
              })}
            </AppScrollView>
          </AppView>

          {/* Model & Plate */}
          <TextField
            variant="outlined"
            label="Vehicle Model"
            required
            value={model}
            onChangeText={setModel}
            placeholder="e.g. Tata Ace Gold"
            leading={<Icon name="box.truck" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Registration Number"
            required
            value={plateNumber}
            onChangeText={setPlateNumber}
            placeholder="e.g. KA 03 MX 2814"
            autoCapitalize="characters"
            leading={<Icon name="tag.fill" size={18} tone="icon-subtle" />}
          />

          <TextField
            variant="outlined"
            label="Payload Capacity"
            value={capacity}
            onChangeText={setCapacity}
            placeholder="e.g. 750 kg"
            leading={<Icon name="shippingbox.fill" size={18} tone="icon-subtle" />}
          />

          {/* RC Document Photo */}
          <PhotoUploadBox
            label="Vehicle RC (Registration Certificate)"
            hint="Upload front copy of your vehicle RC card"
            photoUri={rcPhoto}
            onSelectPhoto={() =>
              setRcPhoto(
                'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
              )
            }
          />

          {/* Vehicle Front Photo */}
          <PhotoUploadBox
            label="Vehicle Front Photo"
            hint="Ensure full front and number plate are clearly visible"
            photoUri={vehiclePhoto}
            onSelectPhoto={() =>
              setVehiclePhoto(
                'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
              )
            }
          />

          {/* Save Button */}
          <AppView className="pt-2">
            <Button
              label="Save Vehicle Details"
              onPress={handleSave}
              size="lg"
              textClassName="font-extrabold text-base"
            />
          </AppView>
        </AppScrollView>
      </AppKeyboardAvoidingView>
    </AppView>
  );
}

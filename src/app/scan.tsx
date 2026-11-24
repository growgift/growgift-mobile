import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";
import { Button, P, Screen } from "../components/ui";
import { extractCode } from "../lib/qr";

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) return <Screen><P muted>Checking camera access…</P></Screen>;
  if (!permission.granted)
    return (
      <Screen>
        <P>GrowGift uses the camera only to scan the QR code on your gift box.</P>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Type the code instead" kind="secondary" onPress={() => router.back()} />
      </Screen>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const code = extractCode(data);
          if (!code) return;
          handled.current = true;
          router.replace({ pathname: "/(tabs)/redeem", params: { code } });
        }}
      />
      <View style={{ position: "absolute", bottom: 40, left: 20, right: 20 }}>
        <Button title="Cancel" kind="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

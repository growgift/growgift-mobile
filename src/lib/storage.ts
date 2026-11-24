import * as SecureStore from "expo-secure-store";

// The access token is the only thing stored on the device, in the iOS Keychain / Android Keystore.
const TOKEN_KEY = "gg_token";

export async function saveToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* secure storage unavailable: the session then lasts only until the app closes */
  }
}

export async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

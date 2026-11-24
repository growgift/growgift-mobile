// API location. A phone cannot reach "localhost" on your computer:
//   iOS simulator:     http://localhost:8080
//   Android emulator:  http://10.0.2.2:8080
//   Physical device:   http://<your-computer-LAN-IP>:8080
// Set EXPO_PUBLIC_API_BASE (gateway, ending in /api/v1) and EXPO_PUBLIC_WEB_BASE (the website) in `.env`.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "http://localhost:8080/api/v1";
export const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE ?? "http://localhost:3000";

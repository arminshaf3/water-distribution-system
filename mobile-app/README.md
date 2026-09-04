# water_distribution_mobile

A new Flutter project.

## Backend URL

The app defaults to the development computer URL:

```bash
http://10.44.138.211:8080/api/v1
```

For a physical Android phone, keep the phone on the same Wi-Fi as the backend
computer and test this in the phone browser:

```bash
http://10.44.138.211:8080/api/v1/auth/me
```

The expected result is an unauthorized JSON response. If the page does not load,
the phone cannot reach the backend network route or Windows is blocking TCP
port 8080.

Override the API URL at run/build time when the server IP changes:

```bash
flutter run --dart-define=API_BASE_URL=http://<server-ip>:8080/api/v1
```

For the Android emulator, use:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

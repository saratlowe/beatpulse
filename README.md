# BeatPulse

BeatPulse is an **Expo (React Native)** app for logging live-music nights, attaching set audio, tapping along while you listen, and refining a **pulse signature** used for discovery and crowd-style matching.

## Stack

- **Expo SDK ~54**, **React Native**
- **TypeScript**
- Navigation: React Navigation (tabs + native stack)
- Audio: `expo-av`
- Local files: `expo-document-picker`
- Persistence: `@react-native-async-storage/async-storage`

## Features (high level)

- **Home** — List logged events; open one to **relive** the same attached audio and flow.
- **Log event** — Enter **artist**, **venue**, **date**; attach audio via:
  - **EDM demo search** (metadata for discovery; playback uses royalty-free placeholder streams — see in-app copy), or  
  - **Your own** MP3 / audio file from the device (blob URLs on web are temporary).
- **Listen + tap** — Play the set and tap to record engagement; **Refine** adds vibe tags; **Pulse signature** shows the recap chart and taste lines.
- **Discover** — Energy / match style discovery (friends / events depending on build).
- **Profile** — User-facing extras for the demo.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended) and **npm**

For physical devices, install [**Expo Go**](https://expo.dev/go).

## Install

```bash
git clone https://github.com/agastya-g/beatpulse-gus.git
cd beatpulse-gus
npm install
```

## Run

### Dev server (QR / all targets)

```bash
npm start
```

Then press **`w`** for web, scan the QR code with **Expo Go**, or use platform shortcuts shown in the terminal.

### Web only

```bash
npm run web
```

If **port 8081 is already in use**, allow Expo to use another port (e.g. **8082**) when prompted, or start explicitly:

```bash
npx expo start --web --port 8082
```

### iOS Simulator / Android

```bash
npm run ios
npm run android
```

> **`Unable to run simctl` / Xcode errors** only affect the **iOS simulator**. Web and Expo Go still work. Install/select Xcode command-line tools if you need the simulator.

## Project layout

```text
beatpulse-gus/
├── App.tsx
├── app.json
├── index.ts
├── assets/
└── src/
    ├── components/
    ├── context/        # app state + persisted logged events
    ├── lib/            # data + pulse / tap helpers
    ├── navigation/
    ├── screens/
    └── theme.ts
```

## Contributing / Git

```bash
git pull origin main
# make changes
git add -A
git commit -m "Describe change"
git push origin main
```

## License

Private coursework / team project — confirm license with the repo owners before redistribution.

## AI Use
Used ChatGPT and GitHub Copilot during implementation to assistance with debugging, structural componenets, and guidance on handling audio playback and event-driven logic:

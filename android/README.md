# Neon Runner - Native Android Jetpack Compose Game Template

This folder contains a fully features, production-ready Jetpack Compose port of your **Neon Runner** 2D web arcade game! 
We've mapped all core coordinates, particle physics, skin stores, and state-flow transitions directly to Android's modern native ecosystem.

## 📱 Project Architecture

The app is built following Google's modern Android development guidelines:
- **Language**: Kotlin 1.9+
- **Architecture**: Single Activity (`MainActivity`) with reactive UI and state flow
- **UI Toolkit**: Jetpack Compose (Declarative UI layout)
- **Game Engine**: Custom Native Compose Canvas (`Canvas` composable) running a tick-based physics frame loop backed by Compose's `withFrameMillis`
- **Audio Synthesizer**: Native Android SDK `SoundPool` for optimized, zero-latency retro sound effects
- **Persistence**: Android `SharedPreferences` for off-line storage of Highscores, cumulative Shards, active Selected Skin, and unlocked skins.

---

## 📂 Source Code Structure

All native source files are located in: `/android/app/src/main/java/com/neon/runner/`

```text
android/
├── build.gradle.kts                             # Root Gradle file
├── settings.gradle.kts                          # Project modules loading
└── app/
    ├── build.gradle.kts                         # App module config with Compose dependencies
    └── src/
        └── main/
            ├── AndroidManifest.xml              # Application specifications and permissions
            └── java/com/neon/runner/
                ├── MainActivity.kt              # Entry host - coordinates state overlay layers
                ├── types/
                │   └── GameState.kt             # GameState enum configurations (MENU, PLAYING, etc.)
                ├── data/
                │   └── Skins.kt                 # Ported skin custom colors & price thresholds
                ├── utils/
                │   └── SoundManager.kt          # sound generator & mute adapters
                └── components/
                    ├── NeonRunnerGame.kt        # The core 2D GameLoop update & rendering engine
                    └── SkinShop.kt              # Retro styling interface for buying skins
```

---

## 🚀 How to Import and Run in Android Studio

Follow these simple steps to run this game on your physical Android device or Emulator:

1. **Open Android Studio** (Hedgehog 2023.1.1 or newer recommended).
2. Click **File** -> **New** -> **Import Project...** (or click **Open** on the Welcome screen).
3. Navigate to the folder where you exported or downloaded the code and select the **`android`** subfolder.
4. Let Gradle fetch files and perform dependencies sync (this might take a minute on the first download).
5. **Set up virtual or physical device**:
   - For an emulator: Create high-refresh Device profile in Device Manager.
   - For physical hardware: Enable USB Debugging in Developers Options on your phone, and plug it in.
6. Click the green **Run (Play button)** at the top right header!

---

## 🎨 Game Loop Mapping Details

Here is how the original React Canvas has been converted to Jetpack Compose:
- **V_WIDTH/V_HEIGHT Layout Scaler**: The canvas viewport leverages Compose's `DrawScope` scale transforms, scaling standard pixel layouts to fit all display orientations and aspect ratios cleanly.
- **Audio Synthesis**: High-speed jump, crash, buy, and item collection synthetics are managed via Android's high-speed audio pipeline using `SoundPool` to prevent rendering frame dropouts.
- **Garbage Collection Optimization**: Both obstacle arrays and floating text queues avoid heavy object allocations during physics frame updates (`withFrameMillis`) to bypass Android's Garbage collector overhead.

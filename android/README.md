# Neon Runner - Android WebView TypeScript Game Wrapper

This folder contains a fully streamlined, high-performance Android host wrapper of your **Neon Runner** 2D web arcade game! 

Rather than maintaining two completely redundant codebases (a Kotlin game loop and a Web TypeScript game loop), we have transitioned the Android app to operate over a single, standardized, high-performance **WebView** shell container. This brings 100% feature parity, zero code duplication, and extreme performance!

---

## 📱 Project Architecture

The app wraps your React/TypeScript code using high-performance Android APIs:
- **Core Wrapper**: Single Activity (`MainActivity.kt`) that inherits from modern `ComponentActivity`.
- **Display Layer**: High-speed, Hardware-Accelerated standard Android `WebView` that fills the viewport.
- **Orientation**: Immersive Fullscreen (`sensorLandscape` default) with `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` enabled to hide status bars and gesture home keys.
- **Runtime Optimization**: Enabled JavaScript, enabled HTML5 DOM storage API, and forced `FLAG_KEEP_SCREEN_ON` so the display does not timeout/sleep during run records.
- **Single Source of Truth**: All coordinates, physics rendering, skin stores, achievements, and custom retro audio synths are driven straight from your polished **TypeScript** source.

---

## 📂 Project Structure

```text
android/
├── build.gradle.kts                             # Root Gradle configuration
├── settings.gradle.kts                          # Project Gradle build settings
└── app/
    ├── build.gradle.kts                         # App module config with active dependencies
    └── src/
        └── main/
            ├── AndroidManifest.xml              # Safe Internet and Varnish feedback permissions config
            ├── assets/                          # Local directory containing your compiled TypeScript bundle
            │   └── index.html                   # HTML entry loaded relative via file:///android_asset/
            └── java/com/neon/runner/
                └── MainActivity.kt              # Entry WebView Host Controller (handles fullscreen & settings)
```

---

## 🛠️ How to Sync and Compile

To generate the Android bundle and run it, follow these steps:

1. **Build Your Web Assets**:
   Make sure to compile your latest React/TypeScript code by running:
   ```bash
   npm run build
   ```
   This compiles everything relative (via `base: "./"` in `vite.config.ts`) and outputs files to the `dist/` directory.

2. **Copy the Compiled Build into Android Assets**:
   Create a directory labeled `assets` under `android/app/src/main/` if it does not exist, and copy your bundle contents into it:
   ```bash
   mkdir -p android/app/src/main/assets
   cp -r dist/* android/app/src/main/assets/
   ```

3. **Import to Android Studio**:
   - Open Android Studio (Hedgehog or newer recommended).
   - Class-select **Open** and direct to the **`/android`** subdirectory.
   - Run the project on any emulator or connected physical Android device!

---

## 🎨 Advantages of TypeScript Hybrid Flow

- **Zero Core Drifts**: Never redevelop core mechanics (e.g. particles, obstacle heights, coins) in parallel languages; write once in TypeScript, compile, and run everywhere.
- **Optimal Hardware Canvas**: Standard Web canvas is hardware accelerated directly inside Android's WebView.
- **Local Persistence Mapping**: The game's store and highscore states seamlessly resolve using the WebView's robust local storage implementation.

# Playback Speed for YouTube

A lightweight Firefox extension (Desktop & Android) that sets a default playback speed on YouTube and remembers custom speeds for individual videos and pages.

## Features

- **Default speed for all videos** — starts every new video at your chosen default speed (`1.5×` out of the box).
- **Per-page speed memory** — save a separate speed for a specific video, Short, live stream, or YouTube page. Saved by video ID (`watch`, `shorts`, `live`), so it persists across reloads and timestamps.
- **Quick presets** — `1.0×`, `1.25×`, `1.5×`, `1.6×`, `1.75×`, `2.0×`.
- **Smart YouTube handling** — works with YouTube SPA navigation (`www.youtube.com` and `m.youtube.com`), ignores ads while preserving your target speed when the video resumes, and doesn't override manual changes you make in YouTube's player menu after startup.
- **Mobile-friendly UI** — responsive popup designed for touch screens with automatic light/dark mode support.
- **Localized in 21 languages** — `ar`, `cs`, `da`, `de`, `en`, `es`, `fi`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `no`, `pl`, `pt`, `ru`, `sv`, `tr`, `zh`.

## Privacy

- **Zero data collection** — all settings are stored locally in your browser via `browser.storage.local`.
- **No tracking, analytics, or external requests.**
- Scoped strictly to `*://youtube.com/*`, `*://www.youtube.com/*`, and `*://m.youtube.com/*` (YouTube Music is excluded).

## Installation

### From Mozilla Add-ons
*(Add your AMO store link here once published)*

### Manual Testing (Desktop Firefox)
1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on...** and select `manifest.json`.

### Testing on Firefox for Android
1. Enable **USB Debugging** on Android and **Remote debugging via USB** in Firefox Settings.
2. Connect your phone and run:
   ```bash
   npx web-ext run --target=firefox-android --android-device=<DEVICE_ID>
   ```
   *(Or install a signed `.xpi` via Firefox Settings → About Firefox → tap the logo 5 times → Install extension from file.)*

## Project Structure

```text
.
├── _locales/          # Translations (21 languages)
├── content.js         # YouTube player hook & SPA navigation handler
├── icon.svg           # Extension vector icon
├── manifest.json      # WebExtension manifest (MV2)
├── popup.css          # Light & dark responsive styles
├── popup.html         # Extension popup markup
└── popup.js           # Popup logic & storage management
```

## Requirements

- Firefox `140.0+` (Desktop)
- Firefox for Android `142.0+`

## License

This project is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](LICENSE).
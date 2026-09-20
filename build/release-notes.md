THE LAST TRAIN is now a standalone macOS application. No Node.js installation, browser, or local server is required to play.

## Download

- **Apple Silicon (M1/M2/M3/M4 and later):** download the DMG ending in `mac-arm64.dmg`. This is the build for your MacBook Air M3.

This release contains the verified Apple Silicon application. Intel packaging remains available from source, but no Intel DMG is published: the hosted Intel runner could not initialize WebGL, so that build could not be validated.

Open the disk image and drag **The Last Train** into **Applications**, then launch it from Applications. Do not run the app from inside the mounted DMG.

## First launch

This community build is ad-hoc signed, **not Apple Developer ID signed or notarized**. macOS may block the first launch. If it does, open **System Settings → Privacy & Security**, review the message for The Last Train, and choose **Open Anyway**. Only do this for the application downloaded from this repository. Organization-managed Macs may disallow unnotarized applications.

## Included

- Five connected 3D train carriages, eight physical clues, and four animated suspects.
- Persistent interrogation memory, contradictions, notebook, case board, and a written accusation ending.
- Offline game assets, fonts, and synthesized audio.
- Native application window, fullscreen, macOS menus, and persistent local saves.
- Optional AI direction through a user-configured endpoint; local dialogue requires no service.

Browser saves do not automatically migrate. Export your case in the browser game's Settings and import it in the application's Settings.

The Apple Silicon app bundle is smoke-tested on a native Apple Silicon macOS runner before publication. Its ad-hoc signature and DMG integrity are verified, and a SHA-256 checksum is attached. Use a currently supported macOS release.

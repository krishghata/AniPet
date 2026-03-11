# AniPet — Asset Credits

## Audio Files

| File | Sound | Source | License |
|------|-------|--------|---------|
| `assets/audio/dog_bark.mp3` | Spitz barking (small dog) | [BigSoundBank #0682](https://bigsoundbank.com/detail-0682-spitz-barking.html) | CC0 — Public Domain |
| `assets/audio/cat_meow.mp3` | Cat meow | [BigSoundBank #1890](https://bigsoundbank.com/detail-1890-cat-meow.html) | CC0 — Public Domain |
| `assets/audio/duck_quack.mp3` | Single duck quack | [freesoundslibrary.com](https://www.freesoundslibrary.com/single-duck-quack-sound-effect/) | CC BY 4.0 — Credit: freesoundslibrary.com |

## Background Music

Synthesised entirely in the browser using the **Web Audio API** — no audio file.

- **Type:** Sine wave oscillators (melody) + triangle wave oscillators (bass)
- **Scale:** C major pentatonic — C, D, E, G, A
- **Tempo:** ~143 BPM, 16-step looping pattern
- **Notes (Hz):** C5 (523.25), D5 (587.33), E5 (659.25), G5 (783.99), A5 (880.00)
- **Implementation:** `js/audioEngine.js` → `startBgMusic()` / `scheduleBgStep()`
- **No external file or library used**

## Sprite Sheets

| Character | Source | License |
|-----------|--------|---------|
| Dog (`assets/sprites/dog/`) | User-provided | — |
| Cat (`assets/sprites/cat/`) | [GameArt2D — Cat & Dog Sprite Sheet](https://www.gameart2d.com/cat-and-dog-free-sprites.html) | Free to use |
| Duck (`assets/sprites/duck/`) | [OpenGameArt — Cute Ducky Duck by Segel](https://opengameart.org/content/cute-ducky-duck) | CC0 — Public Domain |

## Icons

| File | Description |
|------|-------------|
| `icons/anipet_icon.png` | App icon (user-provided) |
| `icons/anipet_icon_192.png` | PWA 192×192 icon (user-provided) |
| `icons/anipet_icon_512.png` | PWA 512×512 icon (user-provided) |

## Fonts

| Font | Source | License |
|------|--------|---------|
| Fredoka One | [Google Fonts](https://fonts.google.com/specimen/Fredoka+One) | OFL — Free |
| Nunito | [Google Fonts](https://fonts.google.com/specimen/Nunito) | OFL — Free |

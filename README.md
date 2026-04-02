# Hearing Loss Simulator

A web-based tool for experiencing how different types of hearing loss alter the perception of sound. Upload any audio file, choose a hearing profile, and hear the difference in real time.

**Live:** [hearing-loss-simulator.netlify.app](https://hearing-loss-simulator.netlify.app)

---

## What It Does

Most hearing loss explainers reduce the experience to "things sound quieter." This simulator goes further. It models:

- **Frequency-specific attenuation** — each profile is derived from a real audiogram, applying the specific pattern of loss at each frequency rather than uniform volume reduction
- **Threshold gating** — sounds that fall below the hearing threshold at a given frequency vanish entirely, rather than fading, which is the clinically accurate behaviour
- **Tinnitus** — an optional persistent tone at a configurable pitch and loudness, which partially masks nearby frequencies

The audiogram display uses the standard clinical format (ISO 8253-1): blue X marks for the left ear, red O marks for the right, with dB HL on the Y axis and frequency on the X axis.

---

## Hearing Profiles

Fifteen built-in profiles across seven categories:

| Category | Profiles |
|---|---|
| Sensorineural | Mild, Moderate, Severe |
| Age-related (Presbycusis) | Mild, Moderate, Severe |
| Noise-Induced | 4 kHz notch |
| Conductive | Mild, Moderate |
| Genetic patterns | Cookie Bite (mid-low), Cookie Bite (mid-high), Precipitous high-frequency |
| Asymmetric | Noise-induced asymmetric, Sudden unilateral |
| Reference | Normal Hearing |

Custom audiograms can be created by entering dB HL values at each of the eight standard audiogram frequencies (250, 500, 1k, 2k, 3k, 4k, 6k, 8k Hz). Custom profiles are saved to localStorage and persist across sessions.

---

## How the Simulation Works

### Signal Chain

```
AudioBufferSource → ChannelSplitter
  [L] → 8× BiquadFilter (peaking EQ) → AudioWorkletNode(L) → ChannelMerger → SensorineuralPathGain
  [R] → 8× BiquadFilter (peaking EQ) → AudioWorkletNode(R) ↗
  [direct]                                                  → ConductivePathGain
  [direct]                                                  → BypassPathGain
                                              → Limiter → Analyser → VolumeGain → Destination
```

Three signal paths exist simultaneously. Profile switching crossfades between them over 100ms — no click, no interruption.

### Frequency Attenuation

Eight peaking EQ BiquadFilterNodes are placed at the standard audiogram frequencies. Audiogram values are in dB HL, which is a clinical reference scale — not direct signal attenuation. The ISO 389-7 RETSPL correction is applied to convert:

```
effectiveAttenuation[i] = max(0, dBHL[i] - RETSPL[i])
```

Where the RETSPL corrections are: `[25.5, 11.5, 7.0, 9.0, 11.5, 12.0, 16.0, 15.5]` dB at 250–8000 Hz.

Filter Q values vary per band based on the frequency spacing of adjacent audiogram frequencies, preventing gaps and overlap. Q is additionally reduced proportional to loss magnitude — damaged cochlear hair cells have broader tuning curves:

```
Q_effective = Q_base / (1 + min(loss_dB, 60) / 30)
```

Conductive loss profiles bypass the EQ chain entirely and use flat gain reduction — conductive loss is mechanical and has no cochlear frequency shaping.

### AudioWorklet Processor

For sensorineural profiles an `AudioWorkletNode` runs after the BiquadFilter chain. The processor (`public/hearing-processor.js`) implements:

**Per-band threshold gating**
A filterbank of 8 analysis biquads measures RMS energy per band each 128-sample block. Filter state is saved and restored around each measurement to prevent state drift. The same RETSPL correction is applied to thresholds before sending them to the processor — without this, mild loss profiles gate far too aggressively (10 dB HL at 250 Hz is actually 0 dB effective SPL loss after RETSPL correction).

Below threshold, the band output is gated to silence. This models the non-linear threshold behaviour of cochlear hair cells — sounds don't fade gradually, they disappear.

**Tinnitus**
A sinusoidal oscillator at the configured frequency is added to the output. Phase increment is computed once per 128-sample block rather than per sample. The tinnitus frequency maps 500–12,000 Hz on the slider.

### Profile Sharing

Built-in profiles are shared as a simple `?preset=<id>` URL — short, readable, and impossible to corrupt. Custom audiograms encode the full profile as compact JSON, UTF-8 encoded to a byte array, then URL-safe Base64 encoded into a `?p=` parameter. No server involved. Links are permanent and decode correctly even from older URL formats that used standard Base64 with percent-encoding.

---

## Development

### Requirements

- Node.js 18+
- A Netlify account (for deployment — the app runs fully locally without one)

### Setup

```bash
npm install
npm run dev       # Vite dev server at localhost:5173
npm run build     # Production build to dist/
```

### Project Structure

```
src/
  App.jsx                    — client-side router (2 routes: /?p= and /)
  main.jsx                   — entry point, global CSS, ErrorBoundary
  constants/
    frequencies.js           — RETSPL values, filter Q, file validation
    presets.js               — 15 built-in profiles + PRESET_CATEGORIES
    theme.js                 — Modern Minimalist design tokens
  engine/
    AudioEngine.js           — Web Audio API lifecycle, playback, seek, loadBuffer
    buildFilterChain.js      — per-playback node graph (bypass/conductive/sensorineural)
    workletBridge.js         — RETSPL correction, sendWorkletParams, tinnitusLevelLabel
  hooks/
    useAudioEngine.js        — React wrapper for AudioEngine, workletAttempted state
    useAudiogramEditor.js    — custom profile CRUD, localStorage persistence
    useKeyboardShortcuts.js  — Space (play/stop), ← → (cycle presets)
    useWorkletParams.js      — tinnitus overrides on top of preset defaults
  components/
    AboutSection.jsx         — always-visible feature description
    AttenuationBars.jsx      — per-band attenuation visualisation
    AudiogramDisplay.jsx     — SVG audiogram (ISO 8253-1 conventions)
    AudiogramEditor.jsx      — modal for creating/editing custom profiles
    ErrorBoundary.jsx        — class component, recovery UI on render error
    FileUploader.jsx         — drag-and-drop + click audio file loader
    PlaybackControls.jsx     — play/stop, seek bar, volume, loop
    PresetDescription.jsx    — active profile name and description
    PresetSelector.jsx       — profile buttons with hover-delete for custom
    ShareDialog.jsx          — profile URL + QR code share modal
    SmallComponents.jsx      — Header, ErrorBanner, WarningBar, SharedProfileBanner
    SpectrumAnalyser.jsx     — canvas real-time FFT display
    WorkletControls.jsx      — tinnitus enable/pitch/loudness controls
  pages/
    SimulatorPage.jsx        — full app layout (two-column)
  utils/
    fileValidation.js        — formatDuration, displayFileName (validation is in AudioEngine)
    presetUrlEncoding.js     — Base64 URL encode/decode for profile sharing
    volumeCurve.js           — percentToGain: cubic perceptual volume curve

public/
  hearing-processor.js       — AudioWorklet processor (served as static file)

netlify.toml                 — Netlify build config + SPA redirects
```

### Adding a Hearing Profile

Add an entry to `src/constants/presets.js`:

```js
my_profile: {
  name:     'Display Name',
  left:     [0, 0, 10, 20, 30, 40, 40, 40],  // dB HL at [250,500,1k,2k,3k,4k,6k,8k]
  right:    [0, 0, 10, 20, 30, 40, 40, 40],
  color:    '#36454f',           // UI accent (audiogram uses clinical colours)
  colorRight: null,              // set for asymmetric profiles, null = use color
  category: 'sensorineural',     // sensorineural|noise|conductive|genetic|asymmetric|reference
  bypass:   false,               // true only for Normal Hearing
  isConductive: false,
  flatAttenuationL: null,        // dB, used for conductive profiles only
  flatAttenuationR: null,
  desc:        'Plain-language description.',
  worklet: {
    tinnitus: { enabled: false, frequency: 4000, level: 0.15 },
  },
},
```

The profile will appear in the selector under its category automatically.

---

## Design Notes

**Why RETSPL correction matters:** Audiogram values are in dB HL (hearing level), a clinical reference scale where 0 dB HL = just audible to a normal ear at that frequency. But 0 dB HL means different things at different frequencies — 250 Hz requires 25.5 dB more signal energy than 1 kHz to reach the same perceptual threshold. Without RETSPL correction, a mild loss profile (10 dB HL at 250 Hz) would gate out a large fraction of normal speech at 250 Hz, despite there being effectively zero loss there.

**Why the simulation sounds quieter than normal:** That's intentional and correct. Real hearing loss makes the world quieter. No loudness compensation is applied — each profile is presented at its natural attenuated level, so the perceptual difference between profiles reflects actual differences in hearing loss severity. Severe profiles will be very quiet; turn up your system volume if needed. Per-band attenuation is capped at 40 dB — beyond that, bands become inaudible in a digital simulation, which defeats the educational purpose.

**Why conductive loss is different:** Conductive loss is mechanical — fluid in the middle ear, ossicular chain disruption, cerumen impaction. The cochlea is intact. There is no frequency-specific damage and no threshold gating effect at the cochlear level. The simulation uses flat gain reduction only.

**Why the AudioWorklet runs after the filters:** The BiquadFilter chain handles frequency shaping. The worklet handles non-linear threshold behaviour that cannot be modelled with linear filters. Gating decisions are made on RETSPL-corrected band energy — the same correction as the filters — so both stages operate on the same perceptual scale.

**Audiogram colours vs UI theme:** The audiogram display always uses clinical colours (blue for left ear, red for right) per ISO 8253-1, regardless of the UI theme. This ensures the audiogram remains clinically meaningful even as the app's visual design evolves.

---

## Limitations

- Filterbank energy measurement is per-block RMS (128 samples ≈ 3ms at 44.1 kHz), not a continuous instantaneous measurement
- Binaural processing — how both ears collaborate to localise sounds and separate competing voices — is not modelled
- Bone conduction thresholds are not distinguished from air conduction
- Listening fatigue and cognitive load are not modelled
- AudioWorklet availability varies by browser; the app falls back to BiquadFilter-only in browsers that don't support it (basic frequency attenuation still works)

---

## Tech Stack

React 18 · Vite 6 · Web Audio API · AudioWorklet · Netlify

---

## License

See LICENSE for licensing information.

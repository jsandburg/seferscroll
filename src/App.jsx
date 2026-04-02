/**
 * App.jsx
 * Minimal client-side router.
 *
 * Route 1: /?p=<encoded>     → SimulatorPage with shared custom profile pre-loaded
 * Route 2: /?preset=<id>     → SimulatorPage with a built-in preset pre-selected
 * Route 3: /                 → SimulatorPage (default: mild sensorineural)
 */

import { SimulatorPage } from './pages/SimulatorPage.jsx';
import { decodePresetFromUrl } from './utils/presetUrlEncoding.js';

export default function App() {
  const params = new URLSearchParams(window.location.search);

  // Route 1: Preset-only share — /?p=eyJ...
  const encodedPreset = params.get('p');
  if (encodedPreset) {
    const decoded = decodePresetFromUrl(encodedPreset);
    if (decoded) {
      return (
        <SimulatorPage
          initialProfile={decoded}
          sharedProfile={true}
        />
      );
    }
    // Malformed ?p= — fall through to normal app
  }

  // Route 2: Normal app — optionally with ?preset=key
  const initialPresetId = params.get('preset') ?? undefined;
  return <SimulatorPage initialPresetId={initialPresetId} />;
}

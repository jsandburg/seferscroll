/**
 * pages/SimulatorPage.jsx
 *
 * Two-column layout (maxWidth 1100px):
 *   Left  — Hearing Loss block (selector + tinnitus + description + share)
 *   Right — Audiogram card + Audio Player card
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PRESETS, findPreset } from '../constants/presets.js';
import { THEME } from '../constants/theme.js';
import { useAudioEngine }       from '../hooks/useAudioEngine.js';
import { useWorkletParams }     from '../hooks/useWorkletParams.js';
import { useAudiogramEditor }   from '../hooks/useAudiogramEditor.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';

import {
  Header, ErrorBanner, WarningBar, SharedProfileBanner,
} from '../components/SmallComponents.jsx';
import { AboutSection }      from '../components/AboutSection.jsx';
import { PresetSelector }    from '../components/PresetSelector.jsx';
import { AudiogramDisplay }  from '../components/AudiogramDisplay.jsx';
import { AudiogramEditor }   from '../components/AudiogramEditor.jsx';
import { PresetDescription } from '../components/PresetDescription.jsx';
import { WorkletControls }   from '../components/WorkletControls.jsx';
import { FileUploader }      from '../components/FileUploader.jsx';
import { PlaybackControls }  from '../components/PlaybackControls.jsx';
import { SpectrumAnalyser }  from '../components/SpectrumAnalyser.jsx';
import { AttenuationBars }   from '../components/AttenuationBars.jsx';
import { ShareDialog }       from '../components/ShareDialog.jsx';

export function SimulatorPage({ initialPresetId, initialProfile, sharedProfile }) {

  const defaultId      = initialPresetId ?? 'mild_sensorineural';
  const defaultProfile = initialProfile ?? findPreset(defaultId) ?? PRESETS.normal;

  const [activePresetId, setActivePresetId] = useState(
    initialProfile ? initialProfile.id : defaultId
  );
  const [activeProfile, setActiveProfile] = useState(defaultProfile);

  const audio   = useAudioEngine();
  const worklet = useWorkletParams(activeProfile);
  const editor  = useAudiogramEditor();

  const [volume,      setVolumeState] = useState(75);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [sharedBannerProfile, setSharedBannerProfile] = useState(
    sharedProfile ? activeProfile : null
  );

  const uploaderRef = useRef(null);

  // ── Profile selection ──────────────────────────────────────────────────────

  const selectProfile = useCallback((id, profile) => {
    setActivePresetId(id);
    setActiveProfile(profile);
    worklet.resetToPreset();
    if (audio.playState === 'playing') {
      audio.switchProfile(profile, {});
    }
  }, [audio.playState, audio.switchProfile, worklet.resetToPreset]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleTogglePlay = useCallback(() => {
    if (audio.playState === 'playing') {
      audio.stop();
    } else if (audio.fileInfo) {
      audio.startPlay(activeProfile, worklet.overrides);
    }
  }, [audio, activeProfile, worklet.overrides]);

  useKeyboardShortcuts({ onTogglePlay: handleTogglePlay });

  // ── Worklet param changes → engine ─────────────────────────────────────────

  useEffect(() => {
    if (audio.playState === 'playing') {
      audio.updateWorkletOverrides(worklet.overrides);
    }
  }, [worklet.overrides, audio.playState, audio.updateWorkletOverrides]);

  // ── Volume / loop ──────────────────────────────────────────────────────────

  const handleVolume = useCallback((v) => {
    setVolumeState(v);
    audio.setVolume(v);
  }, [audio.setVolume]);

  const handleLoop = useCallback(() => {
    setLoopEnabled(prev => {
      const next = !prev;
      audio.setLooping(next);
      return next;
    });
  }, [audio.setLooping]);

  // ── Custom audiogram ───────────────────────────────────────────────────────

  const handleSaveCustom = useCallback(() => {
    const saved = editor.saveProfile();
    if (saved) selectProfile(saved.id, saved);
  }, [editor.saveProfile, selectProfile]);

  const handleDeleteCustom = useCallback((id) => {
    editor.deleteProfile(id);
    if (activePresetId === id) {
      selectProfile('mild_sensorineural', PRESETS['mild_sensorineural']);
    }
  }, [editor.deleteProfile, activePresetId, selectProfile]);

  const handleScrollToUploader = useCallback(() => {
    uploaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const supported = typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';

  const isLoadingAudio = audio.playState === 'loading';

  // ── Section title style ────────────────────────────────────────────────────
  const sectionTitle = {
    fontSize: 10, fontFamily: THEME.fontSans, fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: THEME.textPrimary,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      background: THEME.bg,
      minHeight: '100vh',
      color: THEME.textPrimary,
      fontFamily: THEME.fontSans,
    }}>

      <Header />
      <AboutSection
        workletReady={audio.workletReady}
        workletAttempted={audio.workletAttempted}
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px 48px' }}>

        {sharedBannerProfile && (
          <SharedProfileBanner
            profile={sharedBannerProfile}
            onDismiss={() => setSharedBannerProfile(null)}
            onScrollToUploader={handleScrollToUploader}
            onSave={() => {
              const saved = editor.addCustomProfile(sharedBannerProfile);
              selectProfile(saved.id, saved);
            }}
          />
        )}

        <ErrorBanner errors={audio.errors} onClear={audio.clearError} />
        <WarningBar  warnings={audio.warnings} onClear={audio.clearWarning} />

        {!supported && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'rgba(183,119,13,0.06)',
            border: `1px solid rgba(183,119,13,0.3)`,
            borderRadius: 4, fontSize: 11, color: THEME.warning,
          }}>
            ⚠ Web Audio is not supported in this browser. Try Chrome, Firefox, Safari, or Edge.
          </div>
        )}

        {/* ── Two-column body ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginTop: 24,
          alignItems: 'start',
        }}>

          {/* ── Left column ── */}
          <div>

            {/* Hearing Loss block */}
            <div style={{
              background: THEME.bgCardHover,
              border: `1px solid ${THEME.border}`,
              borderRadius: 4,
              padding: '16px 20px 20px',
              marginBottom: 20,
            }}>
              {/* Section label + share button on same row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <div style={sectionTitle}>
                  Hearing Loss
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  style={{
                    padding: '4px 10px',
                    background: 'none',
                    border: `1px solid ${THEME.textTertiary}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontFamily: THEME.fontSans,
                    color: THEME.textSecondary,
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.textPrimary; e.currentTarget.style.color = THEME.textPrimary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.textTertiary; e.currentTarget.style.color = THEME.textSecondary; }}
                >
                  Share profile
                </button>
              </div>

              {/* Profile selector */}
              <PresetSelector
                activeId={activePresetId}
                onSelect={selectProfile}
                customProfiles={editor.customProfiles}
                onNewCustom={editor.openNewEditor}
                onDeleteCustom={handleDeleteCustom}
              />

              {/* Divider */}
              <div style={{ borderTop: `1px solid ${THEME.border}`, margin: '16px 0 0' }} />

              {/* Tinnitus */}
              <WorkletControls
                effective={worklet.effective}
                onSetTinnitus={worklet.setTinnitus}
                hasFile={!!audio.fileInfo}
              />

              {/* Divider */}
              <div style={{ borderTop: `1px solid ${THEME.border}`, margin: '14px 0 14px' }} />

              {/* Profile description */}
              <PresetDescription
                profile={activeProfile}
                workletReady={audio.workletReady}
                workletAttempted={audio.workletAttempted}
                effectiveTinnitus={worklet.effective.tinnitus}
              />
            </div>

          </div>{/* end left column */}

          {/* ── Right column: Audiogram + Audio Player ── */}
          <div>

            {/* Audiogram card */}
            <div style={{
              border: `1px solid ${THEME.border}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 20,
            }}>
              <div style={{
                padding: '10px 24px 8px',
                background: THEME.bgCardHover,
                borderBottom: `1px solid ${THEME.border}`,
              }}>
                <div style={sectionTitle}>
                  Audiogram
                </div>
              </div>
              <AudiogramDisplay profile={activeProfile} />
              <div style={{ borderTop: `1px solid ${THEME.border}` }}>
                <AttenuationBars profile={activeProfile} />
              </div>
            </div>

            {/* Audio Player card */}
            <div style={{
              border: `1px solid ${THEME.border}`,
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                background: THEME.bgCardHover,
                borderBottom: `1px solid ${THEME.border}`,
              }}>
                <div style={sectionTitle}>
                  Audio Player
                </div>
                {!audio.fileInfo && !isLoadingAudio && (
                  <div style={{ fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary, marginTop: 2, fontStyle: 'italic' }}>
                    Upload a file to begin
                  </div>
                )}
              </div>

              {/* Upload + playback */}
              <div style={{ padding: '16px' }}>
                <FileUploader
                  onFile={audio.loadFile}
                  onRemove={audio.removeFile}
                  fileInfo={audio.fileInfo}
                  isLoading={isLoadingAudio}
                  uploaderRef={uploaderRef}
                />
                <PlaybackControls
                  playState={audio.playState}
                  elapsed={audio.elapsed}
                  duration={audio.engine?.buffer?.duration}
                  volume={volume}
                  loopEnabled={loopEnabled}
                  onTogglePlay={handleTogglePlay}
                  onSeek={audio.seek}
                  onVolumeChange={handleVolume}
                  onLoopToggle={handleLoop}
                  hasAudio={!!audio.fileInfo}
                  accentColor={THEME.info}
                />
              </div>

              {/* Spectrum */}
              <div style={{ borderTop: `1px solid ${THEME.border}`, padding: '14px 16px 16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline', marginBottom: 8,
                }}>
                  <div style={sectionTitle}>
                    Frequency Spectrum
                  </div>
                  <div style={{ fontSize: 10, fontFamily: THEME.fontSans, color: THEME.textSecondary }}>
                    Live output
                  </div>
                </div>
                <SpectrumAnalyser engine={audio.engine} isPlaying={audio.playState === 'playing'} />
              </div>
            </div>

          </div>{/* end right column */}

        </div>{/* end two-column grid */}
      </div>{/* end column body */}

      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        profile={activeProfile}
      />

      {editor.isEditorOpen && editor.editingProfile && (
        <AudiogramEditor
          profile={editor.editingProfile}
          onSetName={editor.setName}
          onSetLoss={editor.setLossValue}
          onMirrorLR={editor.mirrorLeftToRight}
          onMirrorRL={editor.mirrorRightToLeft}
          onSave={handleSaveCustom}
          onCancel={editor.closeEditor}
        />
      )}

      {/* ── Footer ── */}
      <footer style={{
        borderTop: `1px solid ${THEME.border}`,
        background: THEME.bg,
        padding: '18px 32px',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          fontSize: 11,
          fontFamily: THEME.fontSans,
          color: THEME.textTertiary,
          textAlign: 'center',
        }}>
          <a
            href="https://github.com/jsandburg/hearing-loss-simulator/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: THEME.textTertiary, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = THEME.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.color = THEME.textTertiary; }}
          >
            GitHub
          </a>
        </div>
      </footer>

    </div>
  );
}

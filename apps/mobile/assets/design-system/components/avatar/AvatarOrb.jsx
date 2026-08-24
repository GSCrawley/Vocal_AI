import React from 'react';

const TIER_COLORS = {
  speaking: { core: 'var(--voice-speaking-primary)', ring: 'var(--voice-speaking-accent)' },
  singing: { core: 'var(--voice-singing-primary)', ring: 'var(--voice-singing-accent)' },
  default: { core: 'var(--voice-accent-strong)', ring: 'var(--voice-accent)' },
};

const BAR_COUNT = 20;

/**
 * The VOICE avatar coach, rendered as a circular "orb" rather than an
 * illustrated character — a soft core with a dashed attention ring, radial
 * bars that vibrate outward like a speaker cone when the coach is speaking
 * or listening, and expanding ripple rings for emphasis. Maps 1:1 to the six
 * avatar behavioral states from docs/product/ai-avatar-spec.md, plus a
 * seventh `playback` state for "here's what you sound like" comparisons.
 *
 * `hapticStandIn` renders a small pulsing dot as a stand-in for a real device
 * haptic tick — HTML can't trigger actual haptics, so this only documents
 * where in the interaction a haptic should fire (each time the orb "speaks").
 */
export function AvatarOrb({
  state = 'idle',
  tier,
  size = 200,
  waveform,
  label,
  hapticStandIn = false,
}) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.default;
  const isSpeaking = state === 'coaching' || state === 'listening' || state === 'celebrating';
  const showBars = state === 'listening' || state === 'coaching' || state === 'playback';

  const [live, setLive] = React.useState(() => Array.from({ length: BAR_COUNT }, () => 0.25));

  React.useEffect(() => {
    if (state !== 'listening' && state !== 'coaching') return undefined;
    const iv = setInterval(() => {
      setLive((prev) =>
        prev.map((v) => {
          const target = 0.2 + Math.random() * 0.8;
          return v + (target - v) * 0.5;
        })
      );
    }, 120);
    return () => clearInterval(iv);
  }, [state]);

  const bars = React.useMemo(() => {
    if (state === 'playback' && waveform && waveform.length) {
      return Array.from({ length: BAR_COUNT }, (_, i) => {
        const srcIdx = Math.floor((i / BAR_COUNT) * waveform.length);
        return waveform[srcIdx] ?? 0.2;
      });
    }
    return live;
  }, [state, waveform, live]);

  const core = size * 0.44;
  const ringInset = size * 0.03;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* ripple rings — only while actively speaking/celebrating */}
        {isSpeaking &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${colors.ring}`,
                animation: `voice-orb-ripple ${state === 'celebrating' ? 1.4 : 2.2}s ease-out infinite`,
                animationDelay: `${i * (state === 'celebrating' ? 0.35 : 0.6)}s`,
                opacity: 0,
              }}
            />
          ))}

        {/* dashed attention ring */}
        <div
          style={{
            position: 'absolute',
            inset: ringInset,
            borderRadius: '50%',
            border: `2px dashed ${colors.ring}`,
            animation:
              state === 'celebrating'
                ? 'voice-orb-rotate 3s linear infinite'
                : state === 'analyzing'
                ? 'voice-orb-rotate 6s linear infinite'
                : 'voice-orb-rotate 40s linear infinite',
            opacity: state === 'idle' ? 0.5 : 0.85,
          }}
        />

        {/* core */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: core,
            height: core,
            borderRadius: '50%',
            background: colors.core,
            transform: 'translate(-50%, -50%)',
            animation:
              state === 'idle'
                ? 'voice-orb-breathe 3.2s ease-in-out infinite'
                : state === 'celebrating'
                ? 'voice-orb-celebrate 1.1s ease-in-out infinite'
                : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* radial vibration bars */}
          {showBars && (
            <div style={{ position: 'absolute', inset: 0 }}>
              {bars.map((v, i) => {
                const angle = (360 / BAR_COUNT) * i;
                const barRadius = core * 0.5;
                const len = core * (0.14 + v * 0.28);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 2.5,
                      height: len,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.85)',
                      transformOrigin: 'center',
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${barRadius}px)`,
                      transition: 'height 0.12s ease',
                    }}
                  />
                );
              })}
            </div>
          )}

          {state === 'analyzing' && (
            <div
              style={{
                width: core * 0.22,
                height: core * 0.22,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                animation: 'voice-orb-breathe 0.9s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* haptic stand-in indicator */}
        {hapticStandIn && isSpeaking && (
          <div
            style={{
              position: 'absolute',
              right: -2,
              bottom: 6,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: colors.ring,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${colors.ring}`,
                animation: 'voice-haptic-pulse 1.1s ease-out infinite',
              }}
            />
          </div>
        )}
      </div>
      {label && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, letterSpacing: 0.2 }}>{label}</div>
      )}
    </div>
  );
}

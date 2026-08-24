/* @ds-bundle: {"format":4,"namespace":"VOICEDesignSystem_a64ca0","components":[{"name":"AvatarOrb","sourcePath":"components/avatar/AvatarOrb.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"LevelMeter","sourcePath":"components/data/LevelMeter.jsx"},{"name":"CoachingCard","sourcePath":"components/feedback/CoachingCard.jsx"},{"name":"ScoreCard","sourcePath":"components/feedback/ScoreCard.jsx"},{"name":"XPCard","sourcePath":"components/feedback/XPCard.jsx"},{"name":"OptionChip","sourcePath":"components/forms/OptionChip.jsx"},{"name":"ToggleRow","sourcePath":"components/forms/ToggleRow.jsx"}],"sourceHashes":{"components/avatar/AvatarOrb.jsx":"570a11c0913e","components/core/Badge.jsx":"45f15b9254d9","components/core/Button.jsx":"fbea057c0a78","components/data/LevelMeter.jsx":"26225a117739","components/feedback/CoachingCard.jsx":"4d3bf341699f","components/feedback/ScoreCard.jsx":"774cad5a2dc5","components/feedback/XPCard.jsx":"c8009fe4d674","components/forms/OptionChip.jsx":"2dd02b5e6a2b","components/forms/ToggleRow.jsx":"dcb8f9f1ecf8","ui_kits/mobile-app/App.jsx":"cf9c0d0209b3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.VOICEDesignSystem_a64ca0 = window.VOICEDesignSystem_a64ca0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/avatar/AvatarOrb.jsx
try { (() => {
const TIER_COLORS = {
  speaking: {
    core: 'var(--voice-speaking-primary)',
    ring: 'var(--voice-speaking-accent)'
  },
  singing: {
    core: 'var(--voice-singing-primary)',
    ring: 'var(--voice-singing-accent)'
  },
  default: {
    core: 'var(--voice-accent-strong)',
    ring: 'var(--voice-accent)'
  }
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
function AvatarOrb({
  state = 'idle',
  tier,
  size = 200,
  waveform,
  label,
  hapticStandIn = false
}) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.default;
  const isSpeaking = state === 'coaching' || state === 'listening' || state === 'celebrating';
  const showBars = state === 'listening' || state === 'coaching' || state === 'playback';
  const [live, setLive] = React.useState(() => Array.from({
    length: BAR_COUNT
  }, () => 0.25));
  React.useEffect(() => {
    if (state !== 'listening' && state !== 'coaching') return undefined;
    const iv = setInterval(() => {
      setLive(prev => prev.map(v => {
        const target = 0.2 + Math.random() * 0.8;
        return v + (target - v) * 0.5;
      }));
    }, 120);
    return () => clearInterval(iv);
  }, [state]);
  const bars = React.useMemo(() => {
    if (state === 'playback' && waveform && waveform.length) {
      return Array.from({
        length: BAR_COUNT
      }, (_, i) => {
        const srcIdx = Math.floor(i / BAR_COUNT * waveform.length);
        return waveform[srcIdx] ?? 0.2;
      });
    }
    return live;
  }, [state, waveform, live]);
  const core = size * 0.44;
  const ringInset = size * 0.03;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size
    }
  }, isSpeaking && [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: `2px solid ${colors.ring}`,
      animation: `voice-orb-ripple ${state === 'celebrating' ? 1.4 : 2.2}s ease-out infinite`,
      animationDelay: `${i * (state === 'celebrating' ? 0.35 : 0.6)}s`,
      opacity: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: ringInset,
      borderRadius: '50%',
      border: `2px dashed ${colors.ring}`,
      animation: state === 'celebrating' ? 'voice-orb-rotate 3s linear infinite' : state === 'analyzing' ? 'voice-orb-rotate 6s linear infinite' : 'voice-orb-rotate 40s linear infinite',
      opacity: state === 'idle' ? 0.5 : 0.85
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: core,
      height: core,
      borderRadius: '50%',
      background: colors.core,
      transform: 'translate(-50%, -50%)',
      animation: state === 'idle' ? 'voice-orb-breathe 3.2s ease-in-out infinite' : state === 'celebrating' ? 'voice-orb-celebrate 1.1s ease-in-out infinite' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, showBars && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0
    }
  }, bars.map((v, i) => {
    const angle = 360 / BAR_COUNT * i;
    const barRadius = core * 0.5;
    const len = core * (0.14 + v * 0.28);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 2.5,
        height: len,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.85)',
        transformOrigin: 'center',
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${barRadius}px)`,
        transition: 'height 0.12s ease'
      }
    });
  })), state === 'analyzing' && /*#__PURE__*/React.createElement("div", {
    style: {
      width: core * 0.22,
      height: core * 0.22,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.85)',
      animation: 'voice-orb-breathe 0.9s ease-in-out infinite'
    }
  })), hapticStandIn && isSpeaking && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -2,
      bottom: 6,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: colors.ring
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: '50%',
      border: `2px solid ${colors.ring}`,
      animation: 'voice-haptic-pulse 1.1s ease-out infinite'
    }
  }))), label && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.2
    }
  }, label));
}
Object.assign(__ds_scope, { AvatarOrb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/avatar/AvatarOrb.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
/**
 * Small status pill. Used for "Personal Best!", performance band labels,
 * and the 🏆 milestone badge on RewardSummary.
 */
function Badge({
  children,
  tone = 'accent'
}) {
  const tones = {
    accent: {
      background: 'var(--action-primary-soft)',
      color: 'var(--voice-accent)'
    },
    success: {
      background: 'var(--feedback-success-soft)',
      color: 'var(--feedback-success)'
    },
    warning: {
      background: 'var(--feedback-warning-soft)',
      color: 'var(--feedback-warning)'
    },
    danger: {
      background: 'var(--feedback-danger-soft)',
      color: 'var(--feedback-danger)'
    }
  };
  const t = tones[tone] || tones.accent;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 14,
      padding: '10px 20px',
      borderRadius: 'var(--radius-sm)',
      ...t
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
/**
 * Primary interactive control. Variants map to the RN `<Button color={...}>`
 * pattern used throughout the app (accent = primary action, muted = secondary/
 * "Try Again", danger reserved for destructive confirms not yet in the app).
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}) {
  const variants = {
    primary: {
      background: 'var(--action-primary)',
      color: '#ffffff'
    },
    secondary: {
      background: 'var(--surface-raised)',
      color: 'var(--text-primary)'
    },
    muted: {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid var(--border-hairline)'
    },
    danger: {
      background: 'var(--feedback-danger)',
      color: '#ffffff'
    }
  };
  const sizes = {
    sm: {
      padding: '8px 16px',
      fontSize: 14
    },
    md: {
      padding: '12px 24px',
      fontSize: 16
    },
    lg: {
      padding: '16px 32px',
      fontSize: 18
    }
  };
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      borderRadius: 'var(--radius-sm)',
      border: v.border || 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      minHeight: 'var(--tap-target-min)',
      transition: 'opacity 0.15s ease, transform 0.1s ease',
      ...v,
      ...s
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/data/LevelMeter.jsx
try { (() => {
/**
 * Vertical fill meter for live volume during the sustained-note exercise —
 * matches SustainedNoteScreen's meterContainer (40x200, radius 20, success
 * fill growing from the bottom).
 */
function LevelMeter({
  value = 0
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'var(--meter-width)',
      height: 'var(--meter-height)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-meter)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      height: `${pct}%`,
      background: 'var(--feedback-success)',
      transition: 'height 0.1s ease'
    }
  }));
}
Object.assign(__ds_scope, { LevelMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LevelMeter.jsx", error: String((e && e.message) || e) }); }

// components/feedback/CoachingCard.jsx
try { (() => {
/**
 * The avatar coach's one-praise + one-tip message pair — never more than
 * two lines of coaching per the product's "one correction at a time" rule.
 */
function CoachingCard({
  praise,
  tip
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--feedback-success)',
      fontSize: 20,
      fontWeight: 700,
      marginBottom: 12
    }
  }, praise), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 16,
      lineHeight: '24px'
    }
  }, tip));
}
Object.assign(__ds_scope, { CoachingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/CoachingCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ScoreCard.jsx
try { (() => {
/**
 * Large numeric score readout in a flat surface card, exactly matching
 * ResultScreen's scoreCard (padding:32, radius:16, centered, "Personal Best!"
 * label in warning color when isBest).
 */
function ScoreCard({
  score,
  isBest = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      padding: 32,
      borderRadius: 'var(--radius-md)',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--voice-accent)',
      fontSize: 'var(--text-4xl)',
      fontWeight: 700,
      fontFamily: 'var(--font-mono)'
    }
  }, Math.round(score)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 18,
      marginTop: 8
    }
  }, "Score"), isBest && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--feedback-warning)',
      fontWeight: 700,
      marginTop: 16,
      fontSize: 16
    }
  }, "Personal Best!"));
}
Object.assign(__ds_scope, { ScoreCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ScoreCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/XPCard.jsx
try { (() => {
/**
 * XP readout card for RewardSummary — big success-colored number in a
 * flat surface card.
 */
function XPCard({
  xp
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      paddingTop: 20,
      paddingBottom: 20,
      paddingLeft: 40,
      paddingRight: 40,
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      boxShadow: 'var(--shadow-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--feedback-success)',
      fontSize: 'var(--text-3xl)',
      fontWeight: 700,
      fontFamily: 'var(--font-mono)'
    }
  }, "+", xp, " XP"));
}
Object.assign(__ds_scope, { XPCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/XPCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/OptionChip.jsx
try { (() => {
/**
 * Selectable text chip used for reflection prompts ("Easy" / "Challenging" /
 * "Felt Tension"). Selected state = accent border + accent-soft fill,
 * matching the exact hexToRgba(accent, 0.1) pattern from ReflectionScreen.
 */
function OptionChip({
  children,
  selected = false,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      display: 'block',
      width: '100%',
      fontFamily: 'var(--font-sans)',
      fontSize: 16,
      fontWeight: selected ? 700 : 400,
      color: selected ? 'var(--voice-accent)' : 'var(--text-primary)',
      background: selected ? 'var(--action-primary-soft)' : 'var(--surface-card)',
      border: selected ? '1px solid var(--voice-accent)' : '1px solid transparent',
      borderRadius: 'var(--radius-sm)',
      padding: '14px 20px',
      marginBottom: 12,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'background 0.15s ease, border-color 0.15s ease'
    }
  }, children);
}
Object.assign(__ds_scope, { OptionChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/OptionChip.jsx", error: String((e && e.message) || e) }); }

// components/forms/ToggleRow.jsx
try { (() => {
/**
 * Labelled row with a trailing switch — the Settings screen pattern
 * ("Audio Storage Consent"). Renders a native-style toggle track using the
 * exact trackColor/thumbColor pairing from SettingsScreen.tsx.
 */
function ToggleRow({
  title,
  description,
  checked = false,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      borderBottom: '1px solid var(--surface-card)',
      gap: 16,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 14,
      lineHeight: '20px'
    }
  }, description)), /*#__PURE__*/React.createElement("button", {
    role: "switch",
    "aria-checked": checked,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 51,
      height: 31,
      borderRadius: 999,
      border: 'none',
      padding: 2,
      background: checked ? 'var(--feedback-success)' : 'var(--surface-card)',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: checked ? 'flex-end' : 'flex-start',
      transition: 'background 0.15s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 27,
      height: 27,
      borderRadius: '50%',
      background: 'var(--text-primary)',
      display: 'block'
    }
  })));
}
Object.assign(__ds_scope, { ToggleRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/ToggleRow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/App.jsx
try { (() => {
// NOTE: this file is concatenated into _ds_bundle.js and executes at bundle-eval
// time, BEFORE the bundle's own window.<Namespace>.<Component> assignments run —
// so component destructuring + the final mount are deferred with setTimeout(0)
// to run after the whole bundle script has finished executing.
let Button, Badge, OptionChip, ToggleRow, ScoreCard, CoachingCard, XPCard, LevelMeter, AvatarOrb;

// ---- shared phone-screen shell ----
function Screen({
  children,
  justify = 'center',
  pad = 24
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: justify,
      padding: pad,
      background: 'var(--voice-bg-1)',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box',
      height: '100%',
      overflowY: 'auto'
    }
  }, children);
}
const H1 = ({
  children,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    color: 'var(--text-primary)',
    fontSize: 28,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 16,
    ...style
  }
}, children);
const Body = ({
  children,
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    color: 'var(--text-muted)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: '24px',
    marginBottom: 24,
    ...style
  }
}, children);

// ---- 1. Mic Permission ----
function MicPermissionScreen({
  onNext,
  onSettings
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 24,
      fontWeight: 700
    }
  }, "Microphone Access"), /*#__PURE__*/React.createElement("button", {
    onClick: onSettings,
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--voice-accent)',
      fontSize: 16,
      cursor: 'pointer'
    }
  }, "Settings")), /*#__PURE__*/React.createElement(Body, {
    style: {
      textAlign: 'center'
    }
  }, "We need microphone access to hear you and provide feedback."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onNext
  }, "Grant Permission"));
}

// ---- 2. Mic Check ----
function MicCheckScreen({
  onNext
}) {
  const [listening, setListening] = React.useState(false);
  const run = () => {
    setListening(true);
    setTimeout(() => {
      setListening(false);
      onNext();
    }, 1600);
  };
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(H1, null, "Let's check your mic"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(AvatarOrb, {
    state: listening ? 'listening' : 'idle',
    tier: "singing",
    size: 140,
    hapticStandIn: true
  })), /*#__PURE__*/React.createElement(Body, null, "Say something for 2 seconds."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: run,
    disabled: listening
  }, listening ? 'Listening...' : 'Start Mic Check'));
}

// ---- 3. Exercise Intro ----
function ExerciseIntroScreen({
  onNext
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(AvatarOrb, {
    state: "coaching",
    tier: "singing",
    size: 130
  })), /*#__PURE__*/React.createElement(H1, null, "Sustained Note Hold"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--feedback-success)',
      fontSize: 20,
      fontWeight: 700,
      textAlign: 'center',
      marginBottom: 24
    }
  }, "Target: A4 (440 Hz)"), /*#__PURE__*/React.createElement(Body, {
    style: {
      color: 'var(--text-primary)',
      fontSize: 18,
      marginBottom: 48
    }
  }, "Match the target pitch and hold it as steady as you can for 5 seconds."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onNext
  }, "Ready"));
}

// ---- 4. Sustained Note (recording) ----
function SustainedNoteScreen({
  onNext
}) {
  const [phase, setPhase] = React.useState('countdown');
  const [countdown, setCountdown] = React.useState(5);
  const [level, setLevel] = React.useState(0.15);
  React.useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown(c => c - 1), 700);
        return () => clearTimeout(t);
      }
      setPhase('recording');
    }
  }, [phase, countdown]);
  React.useEffect(() => {
    if (phase === 'recording') {
      const iv = setInterval(() => setLevel(0.3 + Math.random() * 0.5), 150);
      const t = setTimeout(() => {
        clearInterval(iv);
        setPhase('analyzing');
      }, 2400);
      return () => {
        clearInterval(iv);
        clearTimeout(t);
      };
    }
    if (phase === 'analyzing') {
      const t = setTimeout(onNext, 1000);
      return () => clearTimeout(t);
    }
  }, [phase]);
  return /*#__PURE__*/React.createElement(Screen, {
    justify: "center"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, phase === 'countdown' && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--voice-accent)',
      fontSize: 72,
      fontWeight: 700,
      fontFamily: 'var(--font-mono)'
    }
  }, countdown), phase === 'recording' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 24,
      marginBottom: 32
    }
  }, "Hold A4..."), /*#__PURE__*/React.createElement(AvatarOrb, {
    state: "listening",
    tier: "singing",
    size: 200,
    hapticStandIn: true
  })), phase === 'analyzing' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 24,
      marginBottom: 32
    }
  }, "Analyzing..."), /*#__PURE__*/React.createElement(AvatarOrb, {
    state: "analyzing",
    tier: "singing",
    size: 160
  }))));
}

// ---- 5. Result ----
const YOU_TAKE = [0.15, 0.4, 0.75, 0.5, 0.3, 0.65, 0.85, 0.4, 0.2, 0.55, 0.7, 0.35, 0.5, 0.8, 0.3, 0.45];
const TARGET_TAKE = [0.45, 0.5, 0.55, 0.5, 0.48, 0.52, 0.55, 0.5, 0.47, 0.5, 0.53, 0.5, 0.49, 0.5, 0.51, 0.5];
function ResultScreen({
  onTryAgain,
  onContinue
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement(H1, null, "Result"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(ScoreCard, {
    score: 87,
    isBest: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24,
      display: 'flex',
      justifyContent: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement(AvatarOrb, {
    state: "playback",
    size: 96,
    waveform: YOU_TAKE,
    label: "You"
  }), /*#__PURE__*/React.createElement(AvatarOrb, {
    state: "playback",
    size: 96,
    waveform: TARGET_TAKE,
    label: "Target"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement(CoachingCard, {
    praise: "Solid pitch control on that rep.",
    tip: "You drifted slightly in the middle of the hold \u2014 focus on your breath staying even."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "muted",
    onClick: onTryAgain
  }, "Try Again")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onContinue
  }, "Continue"))));
}

// ---- 6. Reflection ----
function ReflectionScreen({
  onComplete
}) {
  const [a1, setA1] = React.useState(null);
  const [a2, setA2] = React.useState(null);
  return /*#__PURE__*/React.createElement(Screen, {
    justify: "flex-start",
    pad: 24
  }, /*#__PURE__*/React.createElement(H1, {
    style: {
      marginTop: 24,
      marginBottom: 32
    }
  }, "Quick Reflection"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16
    }
  }, "How did it feel?"), ['Easy', 'Challenging', 'Felt Tension'].map(o => /*#__PURE__*/React.createElement(OptionChip, {
    key: o,
    selected: a1 === o,
    onClick: () => setA1(o)
  }, o))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16
    }
  }, "What will you focus on next time?"), ['Breathing', 'Steady Pitch', 'Relaxation'].map(o => /*#__PURE__*/React.createElement(OptionChip, {
    key: o,
    selected: a2 === o,
    onClick: () => setA2(o)
  }, o))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    disabled: !a1 || !a2,
    onClick: onComplete
  }, "Complete Session"));
}

// ---- 7. Reward Summary ----
function RewardSummaryScreen({
  onDone
}) {
  return /*#__PURE__*/React.createElement(Screen, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(H1, {
    style: {
      marginBottom: 40
    }
  }, "Session Complete!"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(XPCard, {
    xp: 120
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 18,
      marginBottom: 24,
      opacity: 0.8
    }
  }, "Performance: EXCELLENT"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "\uD83C\uDFC6 Personal Best Achieved!")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onDone
  }, "Done"))));
}

// ---- 8. Settings ----
function SettingsScreen({
  onBack
}) {
  const [consent, setConsent] = React.useState(false);
  return /*#__PURE__*/React.createElement(Screen, {
    justify: "flex-start",
    pad: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--voice-accent)',
      fontSize: 22,
      cursor: 'pointer'
    }
  }, "\u2039"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-primary)',
      fontSize: 28,
      fontWeight: 700
    }
  }, "Settings")), /*#__PURE__*/React.createElement(ToggleRow, {
    title: "Audio Storage Consent",
    description: "Enable deep analysis of your vocal exercises. This requires uploading your audio recordings securely to our servers.",
    checked: consent,
    onChange: setConsent
  }));
}

// ---- App shell / router ----
const FLOW = ['permission', 'micCheck', 'intro', 'note', 'result', 'reflection', 'reward'];
function PhoneApp() {
  const [screen, setScreen] = React.useState('permission');
  const [prevScreen, setPrevScreen] = React.useState('permission');
  const go = s => setScreen(s);
  const openSettings = () => {
    setPrevScreen(screen);
    setScreen('settings');
  };
  const screens = {
    permission: /*#__PURE__*/React.createElement(MicPermissionScreen, {
      onNext: () => go('micCheck'),
      onSettings: openSettings
    }),
    micCheck: /*#__PURE__*/React.createElement(MicCheckScreen, {
      onNext: () => go('intro')
    }),
    intro: /*#__PURE__*/React.createElement(ExerciseIntroScreen, {
      onNext: () => go('note')
    }),
    note: /*#__PURE__*/React.createElement(SustainedNoteScreen, {
      onNext: () => go('result')
    }),
    result: /*#__PURE__*/React.createElement(ResultScreen, {
      onTryAgain: () => go('intro'),
      onContinue: () => go('reflection')
    }),
    reflection: /*#__PURE__*/React.createElement(ReflectionScreen, {
      onComplete: () => go('reward')
    }),
    reward: /*#__PURE__*/React.createElement(RewardSummaryScreen, {
      onDone: () => go('micCheck')
    }),
    settings: /*#__PURE__*/React.createElement(SettingsScreen, {
      onBack: () => go(prevScreen)
    })
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 390,
      height: 780,
      borderRadius: 40,
      overflow: 'hidden',
      background: 'var(--voice-bg-1)',
      boxShadow: '0 0 0 10px #1c1b26, 0 30px 60px rgba(36,34,47,0.18)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }
  }, screens[screen]);
}
function App() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#e6e4f0',
      padding: 40,
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(PhoneApp, null));
}
setTimeout(() => {
  ({
    Button,
    Badge,
    OptionChip,
    ToggleRow,
    ScoreCard,
    CoachingCard,
    XPCard,
    LevelMeter,
    AvatarOrb
  } = window.VOICEDesignSystem_a64ca0);
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
}, 0);
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/App.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AvatarOrb = __ds_scope.AvatarOrb;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.LevelMeter = __ds_scope.LevelMeter;

__ds_ns.CoachingCard = __ds_scope.CoachingCard;

__ds_ns.ScoreCard = __ds_scope.ScoreCard;

__ds_ns.XPCard = __ds_scope.XPCard;

__ds_ns.OptionChip = __ds_scope.OptionChip;

__ds_ns.ToggleRow = __ds_scope.ToggleRow;

})();

import React from 'react';

// NOTE: this file is concatenated into _ds_bundle.js and executes at bundle-eval
// time, BEFORE the bundle's own window.<Namespace>.<Component> assignments run —
// so component destructuring + the final mount are deferred with setTimeout(0)
// to run after the whole bundle script has finished executing.
let Button, Badge, OptionChip, ToggleRow, ScoreCard, CoachingCard, XPCard, LevelMeter, AvatarOrb;

// ---- shared phone-screen shell ----
function Screen({ children, justify = 'center', pad = 24 }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        padding: pad,
        background: 'var(--voice-bg-1)',
        fontFamily: 'var(--font-sans)',
        boxSizing: 'border-box',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>
  );
}

const H1 = ({ children, style }) => (
  <div style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 16, ...style }}>
    {children}
  </div>
);
const Body = ({ children, style }) => (
  <div style={{ color: 'var(--text-muted)', fontSize: 16, textAlign: 'center', lineHeight: '24px', marginBottom: 24, ...style }}>
    {children}
  </div>
);

// ---- 1. Mic Permission ----
function MicPermissionScreen({ onNext, onSettings }) {
  return (
    <Screen>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700 }}>Microphone Access</div>
        <button onClick={onSettings} style={{ background: 'none', border: 'none', color: 'var(--voice-accent)', fontSize: 16, cursor: 'pointer' }}>
          Settings
        </button>
      </div>
      <Body style={{ textAlign: 'center' }}>We need microphone access to hear you and provide feedback.</Body>
      <Button variant="primary" onClick={onNext}>Grant Permission</Button>
    </Screen>
  );
}

// ---- 2. Mic Check ----
function MicCheckScreen({ onNext }) {
  const [listening, setListening] = React.useState(false);
  const run = () => {
    setListening(true);
    setTimeout(() => { setListening(false); onNext(); }, 1600);
  };
  return (
    <Screen>
      <H1>Let's check your mic</H1>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <AvatarOrb state={listening ? 'listening' : 'idle'} tier="singing" size={140} hapticStandIn />
      </div>
      <Body>Say something for 2 seconds.</Body>
      <Button variant="primary" onClick={run} disabled={listening}>
        {listening ? 'Listening...' : 'Start Mic Check'}
      </Button>
    </Screen>
  );
}

// ---- 3. Exercise Intro ----
function ExerciseIntroScreen({ onNext }) {
  return (
    <Screen>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <AvatarOrb state="coaching" tier="singing" size={130} />
      </div>
      <H1>Sustained Note Hold</H1>
      <div style={{ color: 'var(--feedback-success)', fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
        Target: A4 (440 Hz)
      </div>
      <Body style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 48 }}>
        Match the target pitch and hold it as steady as you can for 5 seconds.
      </Body>
      <Button variant="primary" onClick={onNext}>Ready</Button>
    </Screen>
  );
}

// ---- 4. Sustained Note (recording) ----
function SustainedNoteScreen({ onNext }) {
  const [phase, setPhase] = React.useState('countdown');
  const [countdown, setCountdown] = React.useState(5);
  const [level, setLevel] = React.useState(0.15);

  React.useEffect(() => {
    if (phase === 'countdown') {
      if (countdown > 0) {
        const t = setTimeout(() => setCountdown((c) => c - 1), 700);
        return () => clearTimeout(t);
      }
      setPhase('recording');
    }
  }, [phase, countdown]);

  React.useEffect(() => {
    if (phase === 'recording') {
      const iv = setInterval(() => setLevel(0.3 + Math.random() * 0.5), 150);
      const t = setTimeout(() => { clearInterval(iv); setPhase('analyzing'); }, 2400);
      return () => { clearInterval(iv); clearTimeout(t); };
    }
    if (phase === 'analyzing') {
      const t = setTimeout(onNext, 1000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <Screen justify="center">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {phase === 'countdown' && (
          <div style={{ color: 'var(--voice-accent)', fontSize: 72, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{countdown}</div>
        )}
        {phase === 'recording' && (
          <>
            <div style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 32 }}>Hold A4...</div>
            <AvatarOrb state="listening" tier="singing" size={200} hapticStandIn />
          </>
        )}
        {phase === 'analyzing' && (
          <>
            <div style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 32 }}>Analyzing...</div>
            <AvatarOrb state="analyzing" tier="singing" size={160} />
          </>
        )}
      </div>
    </Screen>
  );
}

// ---- 5. Result ----
const YOU_TAKE = [0.15,0.4,0.75,0.5,0.3,0.65,0.85,0.4,0.2,0.55,0.7,0.35,0.5,0.8,0.3,0.45];
const TARGET_TAKE = [0.45,0.5,0.55,0.5,0.48,0.52,0.55,0.5,0.47,0.5,0.53,0.5,0.49,0.5,0.51,0.5];

function ResultScreen({ onTryAgain, onContinue }) {
  return (
    <Screen>
      <H1>Result</H1>
      <div style={{ marginBottom: 24 }}>
        <ScoreCard score={87} isBest={true} />
      </div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', gap: 28 }}>
        <AvatarOrb state="playback" size={96} waveform={YOU_TAKE} label="You" />
        <AvatarOrb state="playback" size={96} waveform={TARGET_TAKE} label="Target" />
      </div>
      <div style={{ marginBottom: 40 }}>
        <CoachingCard
          praise="Solid pitch control on that rep."
          tip="You drifted slightly in the middle of the hold — focus on your breath staying even."
        />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}><Button variant="muted" onClick={onTryAgain}>Try Again</Button></div>
        <div style={{ flex: 1 }}><Button variant="primary" onClick={onContinue}>Continue</Button></div>
      </div>
    </Screen>
  );
}

// ---- 6. Reflection ----
function ReflectionScreen({ onComplete }) {
  const [a1, setA1] = React.useState(null);
  const [a2, setA2] = React.useState(null);
  return (
    <Screen justify="flex-start" pad={24}>
      <H1 style={{ marginTop: 24, marginBottom: 32 }}>Quick Reflection</H1>
      <div style={{ marginBottom: 32 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>How did it feel?</div>
        {['Easy', 'Challenging', 'Felt Tension'].map((o) => (
          <OptionChip key={o} selected={a1 === o} onClick={() => setA1(o)}>{o}</OptionChip>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>What will you focus on next time?</div>
        {['Breathing', 'Steady Pitch', 'Relaxation'].map((o) => (
          <OptionChip key={o} selected={a2 === o} onClick={() => setA2(o)}>{o}</OptionChip>
        ))}
      </div>
      <Button variant="primary" disabled={!a1 || !a2} onClick={onComplete}>Complete Session</Button>
    </Screen>
  );
}

// ---- 7. Reward Summary ----
function RewardSummaryScreen({ onDone }) {
  return (
    <Screen>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <H1 style={{ marginBottom: 40 }}>Session Complete!</H1>
        <div style={{ marginBottom: 24 }}><XPCard xp={120} /></div>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, marginBottom: 24, opacity: 0.8 }}>Performance: EXCELLENT</div>
        <div style={{ marginBottom: 48 }}>
          <Badge tone="warning">🏆 Personal Best Achieved!</Badge>
        </div>
        <div style={{ width: '100%' }}>
          <Button variant="primary" onClick={onDone}>Done</Button>
        </div>
      </div>
    </Screen>
  );
}

// ---- 8. Settings ----
function SettingsScreen({ onBack }) {
  const [consent, setConsent] = React.useState(false);
  return (
    <Screen justify="flex-start" pad={24}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--voice-accent)', fontSize: 22, cursor: 'pointer' }}>‹</button>
        <div style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700 }}>Settings</div>
      </div>
      <ToggleRow
        title="Audio Storage Consent"
        description="Enable deep analysis of your vocal exercises. This requires uploading your audio recordings securely to our servers."
        checked={consent}
        onChange={setConsent}
      />
    </Screen>
  );
}

// ---- App shell / router ----
const FLOW = ['permission', 'micCheck', 'intro', 'note', 'result', 'reflection', 'reward'];

function PhoneApp() {
  const [screen, setScreen] = React.useState('permission');
  const [prevScreen, setPrevScreen] = React.useState('permission');

  const go = (s) => setScreen(s);
  const openSettings = () => { setPrevScreen(screen); setScreen('settings'); };

  const screens = {
    permission: <MicPermissionScreen onNext={() => go('micCheck')} onSettings={openSettings} />,
    micCheck: <MicCheckScreen onNext={() => go('intro')} />,
    intro: <ExerciseIntroScreen onNext={() => go('note')} />,
    note: <SustainedNoteScreen onNext={() => go('result')} />,
    result: <ResultScreen onTryAgain={() => go('intro')} onContinue={() => go('reflection')} />,
    reflection: <ReflectionScreen onComplete={() => go('reward')} />,
    reward: <RewardSummaryScreen onDone={() => go('micCheck')} />,
    settings: <SettingsScreen onBack={() => go(prevScreen)} />,
  };

  return (
    <div
      style={{
        width: 390,
        height: 780,
        borderRadius: 40,
        overflow: 'hidden',
        background: 'var(--voice-bg-1)',
        boxShadow: '0 0 0 10px #1c1b26, 0 30px 60px rgba(36,34,47,0.18)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {screens[screen]}
    </div>
  );
}

function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e6e4f0',
        padding: 40,
        boxSizing: 'border-box',
      }}
    >
      <PhoneApp />
    </div>
  );
}

setTimeout(() => {
  ({ Button, Badge, OptionChip, ToggleRow, ScoreCard, CoachingCard, XPCard, LevelMeter, AvatarOrb } =
    window.VOICEDesignSystem_a64ca0);
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}, 0);

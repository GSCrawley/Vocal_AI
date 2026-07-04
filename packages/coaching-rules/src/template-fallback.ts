// packages/coaching-rules/src/template-fallback.ts

import type {
  LLMCoachingRequest,
  LLMCoachingResponse,
  SingingMetricKey,
  SuccessBand,
} from '@voice/shared-types';

type TemplateEntry = {
  praiseMessage: string;
  correctionMessage: string;
  actionTip: string;
  microExerciseCue?: string;
  avatarMood: LLMCoachingResponse['avatarMood'];
};

// Metric × Band → template entry
// Each praiseMessage references something specific (the metric name + a measurable anchor).
// correctionMessage is exactly one issue.
const TEMPLATES: Record<SingingMetricKey, Record<SuccessBand, TemplateEntry>> = {
  pitchAccuracy: {
    excellent: {
      praiseMessage:
        'Your pitch accuracy was outstanding — you stayed inside the target zone for most of the hold.',
      correctionMessage: 'Keep that same approach: find the note before you fully open your voice.',
      actionTip: 'Repeat once and listen for the moment you lock in.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Solid pitch control on that rep.',
      correctionMessage:
        'You drifted slightly in the middle of the hold — focus on your breath staying even.',
      actionTip:
        'On the next rep, think about supporting the note from below, not from the throat.',
      microExerciseCue: 'Hum the target pitch softly for 5 seconds before you sing it.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You got through the exercise — that's the starting point.",
      correctionMessage:
        'Pitch accuracy needs more work — your cents error was high across the hold.',
      actionTip:
        'Before the next rep, match the reference tone quietly on an "mmm" — then open to the vowel.',
      microExerciseCue: 'Hum the reference pitch for 8 seconds with mouth closed.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You stayed in the exercise — that takes persistence.',
      correctionMessage: 'The pitch was not landing in the target zone this rep.',
      actionTip:
        'Take a breath, listen to the reference tone once more, then try again without any strain.',
      microExerciseCue: 'Slide up to the target note slowly from a note you know is comfortable.',
      avatarMood: 'encouraging',
    },
  },
  stability: {
    excellent: {
      praiseMessage:
        'Very steady hold — your pitch stability score reflects strong breath support.',
      correctionMessage: 'Keep monitoring the end of the hold, where drift usually creeps in.',
      actionTip: 'Try extending the next hold by one second and maintaining that same evenness.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good stability across most of the hold.',
      correctionMessage: "The note wobbled near the end — that's usually a breath support issue.",
      actionTip:
        'On the next rep, imagine pushing the note forward from your belly as you approach the end.',
      microExerciseCue: 'Sustain an "sss" sound for 8 seconds at steady volume before singing.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: 'You held the note — now we work on keeping it steady.',
      correctionMessage:
        'Pitch stability was low — the note moved sharp and flat through the hold.',
      actionTip:
        'Try a shorter hold duration first and focus on keeping the note as still as possible.',
      microExerciseCue: 'Hold a comfortable pitch for 3 seconds, aiming for zero movement.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: "You gave it a full attempt — let's reset and try again.",
      correctionMessage:
        'The note was not stable this time — the signal was moving too much to score.',
      actionTip: 'Relax your jaw and tongue fully before starting. Tension fights stability.',
      microExerciseCue: 'Roll your lips on "brr" for 5 seconds to release jaw tension.',
      avatarMood: 'encouraging',
    },
  },
  breathControl: {
    excellent: {
      praiseMessage: 'Strong breath support — your RMS envelope was consistent through the hold.',
      correctionMessage:
        'Continue pacing your inhale before each rep — that consistency is what produced this result.',
      actionTip:
        'Now try adding a small crescendo at the end of the next hold to test your breath reserve.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good breath management this rep.',
      correctionMessage:
        "Your support faded slightly in the second half — that's a breath depth issue.",
      actionTip:
        'Before you sing, expand the belly on the inhale. Think "fill from the bottom up."',
      microExerciseCue:
        'Take one slow belly breath (4 counts in, 6 counts out) before the next rep.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: 'You completed the rep — breath work takes time to build.',
      correctionMessage:
        'Breath control was inconsistent — volume dropped off before the hold ended.',
      actionTip:
        'Shorten the hold target for now and focus on keeping the volume steady the whole way through.',
      microExerciseCue: 'Exhale on a quiet "fff" for 6 seconds at steady pressure.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: "You got through it — that's a starting point.",
      correctionMessage: 'Breath support was insufficient to sustain the note.',
      actionTip:
        'Rest for 30 seconds, take two slow deep breaths, and try a shorter version of the exercise.',
      microExerciseCue: 'Breathe in for 4, hold for 2, breathe out for 6. Do this twice.',
      avatarMood: 'encouraging',
    },
  },
  toneQuality: {
    excellent: {
      praiseMessage: 'Your tone was clear and resonant this rep.',
      correctionMessage:
        "Keep the same throat and jaw relaxation — that's what produced the cleaner phonation.",
      actionTip:
        'Try the same exercise on a different vowel ("ah" → "oh") to see if the tone carries.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good tone overall.',
      correctionMessage:
        'There was some breathiness in the tone — a slightly firmer onset would help.',
      actionTip:
        'Start the next rep with a gentle "h" sound before the note to set the onset cleanly.',
      microExerciseCue: 'Hum with mouth closed for 5 seconds and feel the resonance in your face.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're working on your tone — this takes patience.",
      correctionMessage:
        'Tone quality was inconsistent, indicating phonation effort that varies through the hold.',
      actionTip:
        'Sing this note on a "hmm" rather than a full vowel — it reduces strain and clarifies the tone.',
      microExerciseCue: 'Hum a comfortable note for 8 seconds; then open to "ahh" for 3 seconds.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: "You tried the rep — let's figure out what's happening with the tone.",
      correctionMessage: 'Tone was not consistent enough to measure reliably.',
      actionTip: 'Warm up with 2 minutes of gentle humming before trying this rep again.',
      microExerciseCue: 'Gentle hum on a comfortable pitch. No pressure. Just buzz.',
      avatarMood: 'encouraging',
    },
  },
  dynamics: {
    excellent: {
      praiseMessage: 'Excellent volume control — intentional dynamics through the whole rep.',
      correctionMessage: 'Keep the same awareness of your volume at phrase endings.',
      actionTip:
        'Try a deliberate decrescendo on the next rep to test your upper range of control.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good dynamics this rep.',
      correctionMessage: 'Volume was slightly inconsistent in the middle of the hold.',
      actionTip: 'Imagine a horizontal line at your target volume level and try to stay on it.',
      microExerciseCue: 'Sustain "vvv" for 6 seconds at the same volume from start to finish.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're building volume awareness — that's the first step.",
      correctionMessage:
        'Dynamic control was low — volume changed unintentionally through the hold.',
      actionTip: 'Focus only on keeping the volume steady, not on the pitch. One thing at a time.',
      microExerciseCue:
        'Sustain "sss" for 5 seconds at steady pressure to calibrate your breath output.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You completed the rep.',
      correctionMessage: 'Volume control was not measurable this rep.',
      actionTip: 'Reset with a breath, then try at a softer starting volume and stay there.',
      microExerciseCue: 'Breathe out for 8 counts at steady pressure before singing.',
      avatarMood: 'encouraging',
    },
  },
  diction: {
    excellent: {
      praiseMessage: 'Clear diction throughout.',
      correctionMessage: 'Keep your lips and tongue active at the same level on the next rep.',
      actionTip:
        'Try the same exercise on a different consonant start to confirm the clarity holds.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good articulation this rep.',
      correctionMessage: 'Consonants softened a little toward the end — tongue fatigue is common.',
      actionTip:
        'Tongue twisters for 30 seconds before practice can sharpen up the articulation muscles.',
      microExerciseCue: 'Say "ta-ta-ta-ta" quickly for 5 seconds, clearly and rhythmically.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're working on articulation — it takes repetition.",
      correctionMessage: 'Diction was unclear in this rep — consonants were swallowed or soft.',
      actionTip:
        'Slow down by 20% and overdo each consonant. It feels odd but resets the muscle patterns.',
      microExerciseCue: 'Say "pa-ta-ka" slowly, feeling each sound land before moving to the next.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You got through the rep.',
      correctionMessage: 'Diction was too unclear to measure this time.',
      actionTip:
        'Try speaking the phrase clearly before singing it, so your mouth knows the shape.',
      microExerciseCue: 'Speak the lyric or vowel slowly twice before singing.',
      avatarMood: 'encouraging',
    },
  },
  // Placeholders for Phase 2+ metrics — returns a safe generic message
  styleExpression: {
    excellent: {
      praiseMessage: 'Style expression was strong this rep.',
      correctionMessage: 'Keep that stylistic intent consistent throughout.',
      actionTip: 'Try adding more of that character to the next rep.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good style presence.',
      correctionMessage: 'Style markers faded slightly in the middle.',
      actionTip: 'Think about the feeling of the style from the first note, not just the peak.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're exploring the style — keep experimenting.",
      correctionMessage: 'Style markers were not consistent through the rep.',
      actionTip: 'Listen to one bar of the reference track and carry that sound into the exercise.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: "You're getting started with this style.",
      correctionMessage: 'Style expression needs more work before we can measure it reliably.',
      actionTip:
        'Focus on pitch and stability first; style will follow once the foundation is solid.',
      avatarMood: 'encouraging',
    },
  },
  musicality: {
    excellent: {
      praiseMessage: 'Musical phrasing was expressive and well-timed.',
      correctionMessage: 'Keep that onset precision on every phrase going forward.',
      actionTip: 'Try the same phrase at a slightly faster tempo.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good musical sense this rep.',
      correctionMessage: 'Onset timing lagged slightly on the first note.',
      actionTip: 'Think of starting just ahead of the beat rather than on it.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're developing your musical ear.",
      correctionMessage: 'Musicality was low — phrase shape and timing need more attention.',
      actionTip: 'Clap the rhythm of the phrase before singing it.',
      microExerciseCue: 'Clap the target rhythm twice before the next rep.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You attempted the phrase.',
      correctionMessage: 'Musicality was not measurable this rep.',
      actionTip: 'Return to the simpler sustained-note exercise to rebuild precision.',
      avatarMood: 'encouraging',
    },
  },
  posture: {
    excellent: {
      praiseMessage: 'Breath dynamics suggest strong posture support.',
      correctionMessage: "Keep that alignment — it's supporting everything else.",
      actionTip: "Notice how the voice feels when you're positioned well.",
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good support through the rep.',
      correctionMessage: 'Breath dynamics suggest posture may have shifted mid-rep.',
      actionTip: 'Check that your shoulders are relaxed and your chest is open before each rep.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're building the foundation.",
      correctionMessage:
        'Posture proxy score is low — breath support may be restricted by positioning.',
      actionTip:
        "Stand if you're sitting. Drop your shoulders and lift the crown of your head slightly.",
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You kept going.',
      correctionMessage: 'Posture and technique need attention before the score will improve.',
      actionTip:
        'Shake out your shoulders, take a slow breath, and reset your body before trying again.',
      avatarMood: 'encouraging',
    },
  },
  consistency: {
    excellent: {
      praiseMessage: "You're showing up and improving — your consistency score reflects that.",
      correctionMessage: 'Keep the same practice cadence.',
      actionTip: 'Try this exercise at a slightly harder difficulty to keep the challenge alive.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good session-to-session consistency.',
      correctionMessage:
        'Performance varies a little between sessions — warming up the same way each time can reduce that.',
      actionTip: 'Use the same warm-up order every session to set a consistent baseline.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're showing up — that's the most important thing.",
      correctionMessage:
        'Your scores vary quite a bit between sessions, which points to warm-up or environmental factors.',
      actionTip:
        'Try practicing at the same time each day — consistency of timing improves consistency of performance.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'Every session is a starting point.',
      correctionMessage: 'Consistency across sessions is low right now.',
      actionTip:
        'Focus on completing short sessions regularly rather than long sessions occasionally.',
      avatarMood: 'encouraging',
    },
  },
  repertoire: {
    excellent: {
      praiseMessage: 'Your match with the reference melody was very close.',
      correctionMessage: 'Keep that same precision on the next snippet.',
      actionTip: 'Unlock the next snippet and apply the same approach.',
      avatarMood: 'celebratory',
    },
    good: {
      praiseMessage: 'Good match with the song.',
      correctionMessage: 'There was some drift from the reference melody in the middle section.',
      actionTip: 'Listen to the reference one more time focusing on the phrase where you drifted.',
      microExerciseCue: 'Hum the melody of the drifted phrase twice.',
      avatarMood: 'calm',
    },
    developing: {
      praiseMessage: "You're learning this song — keep going.",
      correctionMessage: 'The pitch match with the reference was developing.',
      actionTip:
        'Sing along with the original recording (with vocals) once before practicing over the instrumental.',
      avatarMood: 'encouraging',
    },
    retry: {
      praiseMessage: 'You attempted the snippet.',
      correctionMessage:
        "The match with the reference song wasn't close enough to register this time.",
      actionTip:
        'Work on the sustained-note exercises for pitch accuracy first, then return to this snippet.',
      avatarMood: 'encouraging',
    },
  },
};

/**

- Deterministic template fallback.
- Always returns a valid LLMCoachingResponse — this cannot fail.
  */
export function buildTemplateFallback(req: LLMCoachingRequest): LLMCoachingResponse {
  const entry = TEMPLATES[req.weaknessReport.focusMetric]?.[req.successBand];

  if (!entry) {
    // Ultimate fallback for any unexpected metric/band combination
    return {
      praiseMessage: 'You completed the rep.',
      correctionMessage: 'Focus on your target metric for the next attempt.',
      actionTip: 'Take a breath and try again with a fresh approach.',
      avatarMood: 'encouraging',
      generatedBy: 'template',
    };
  }

  return { ...entry, generatedBy: 'template' };
}

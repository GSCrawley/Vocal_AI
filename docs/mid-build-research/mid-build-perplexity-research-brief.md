# VOICE App Research Brief

### Vocal Pedagogy × Motor Learning × Voice AI × Gamification × Legal

_Research synthesized June 27, 2026. All citations link to primary sources. "Well-established" vs. "emerging/contested" is flagged per finding. Recommendations flagged with ⚠️ carry vocal-health, legal, or trust risk._

---

## 1. Executive Summary — The 10 Most Decision-Changing Findings

1. **The synthesized-self target is technically feasible today, but with a critical asterisk.** Zero-shot singing voice conversion (Seed-VC, RVC, So-VITS-SVC) can render a recognizable version of a user's voice singing at pitches they haven't reached — but it produces _plausible_ synthesis, not _acoustically accurate_ prediction. Present it as motivational preview, not scientific forecast. Treating the output as a guaranteed ceiling risks serious trust damage. ([arXiv LHQ-SVC 2025](https://arxiv.org/abs/2409.08583), [Seed-VC GitHub](https://github.com/Plachtaa/seed-vc))

2. **Vocal range gain from training is real but bounded and slow.** A 10-week vocal function exercise (VFE) protocol in graduate opera singers produced statistically significant VRP area expansion, primarily in the upper and middle thirds. ([JSLHR 2020](https://pubs.asha.org/doi/10.1044/2020_JSLHR-19-00362)) Untrained adults enter with ~2 octave spans; trained singers expand toward ~3 octaves over years. Any synthesized ceiling must reflect this envelope, not an unlimited ideal. ([voicescience.org VRP data](https://www.voicescience.org/lexicon/average-singing-frequencies/), [Folia Phoniatr 2016](https://pubmed.ncbi.nlm.nih.gov/27584050/))

3. **Feedforward self-modeling has strong empirical support.** Showing learners an idealized (but believable) version of themselves performing the target skill accelerates acquisition compared to showing a model or a non-edited self-video. ([Ste-Marie et al., Frontiers in Psychology 2011, PMC3133863](https://pmc.ncbi.nlm.nih.gov/articles/PMC3133863/)) This is the strongest single piece of learning-science justification for the synthesized-self target.

4. **Demucs HTDemucs is the current gold standard for open-source stem separation** (SDR ~9 dB on MUSDB18-HQ), but the originating Meta repository is now archived and unmaintained. Artifacts from separation — especially HF smearing and transient blurring — corrupt downstream HNR, jitter, and shimmer measurements reliably. Quality gates before profiling a user-submitted target are non-negotiable. ([facebookresearch/demucs GitHub](https://github.com/facebookresearch/demucs), [arXiv 2305.07489](http://arxiv.org/pdf/2305.07489.pdf))

5. **Duolingo's "Birdbrain" adaptive difficulty model is the right architecture for this product.** It combines per-item difficulty estimation with per-learner knowledge tracing to deliver exercises at exactly the right challenge level. The VOICE app should implement an analogous system, mapping vocal-metric deltas (current vs. target baseline) to exercise difficulty parameters. ([Duolingo Birdbrain blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/))

6. **Gamification misuse is the single biggest retention risk.** A qualitative study of Duolingo users found that streaks, leaderboards, and competitive mechanics drove users to optimize for XP rather than learning, causing anxiety, guilt, and eventually churn. ([Mogavi et al., L@S 2022](https://ar5iv.labs.arxiv.org/html/2203.16175)) For a wellness-adjacent singing app, the harm vector is doubled: gamification pressure can induce vocal strain. The product must decouple engagement mechanics from progress vanity.

7. **Voice recordings + synthesized voiceprints are biometric data under GDPR, CCPA, and state laws including Illinois BIPA.** Storing a synthesized voice model of a user likely triggers biometric data obligations in Illinois and potentially Texas, Washington, and the EU. Explicit, granular consent and a clear deletion pathway are legally required before any synthesis happens. ([waywithwords.net legal overview](https://waywithwords.net/resource/legal-obligations-collecting-voice-data/))

8. **Copyright exposure from third-party audio ingestion is severe.** Downloading and separating commercially released audio — even for private analysis — crosses into territory that recording label ToS and potentially the DMCA (§1201 anti-circumvention) make indefensible at scale. User-uploaded audio is less clear but still risky. The synthesized-self path avoids this entirely.

9. **CPP/CPPS is the best single acoustic proxy for vocal strain in a mobile context.** Cepstral Peak Prominence Smoothed correlates strongly with perceptual voice quality degradation and vocal fatigue, is computable in near-real-time from a standard microphone, and is more robust to noise than HNR or jitter/shimmer. ([PMC10645846](https://pmc.ncbi.nlm.nih.gov/articles/PMC10645846/)) It should be the primary stop-singing trigger.

10. **Abstract, audio-reactive avatar designs outperform humanoid avatars for AI voice agents** on trust and warmth, while avoiding uncanny-valley effects. The "woofer cone" concept maps well to this literature. The key design variables are response latency (keep <300ms for conversational feel), motion vocabulary (organic, not mechanical), and restraint — the avatar should stop animating during user singing to cede the sonic space. ([switchboard.audio latency guide](https://switchboard.audio/hub/voice-ai-latency/), [decagon.ai voice agent design](https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent/))

---

## 2. Per-Area Findings

---

### Area 1 — The "Best-Possible-Self" Synthesized Target Baseline

#### 2.1a Key Findings & Evidence

**Voice synthesis state of the art — what's real now**

The singing voice conversion (SVC) field has matured rapidly. Three open-source systems dominate practical deployment:

- **RVC (Retrieval-based Voice Conversion)** uses HuBERT content features + RMVPE pitch extraction + VITS acoustic model + a top-k feature retrieval module that borrows closest training-set embeddings at inference to enhance timbre fidelity. It requires as little as a few minutes of reference audio for fine-tuning. ([gudgud96 annotated RVC](https://gudgud96.github.io/2024/09/26/annotated-rvc/)) Well-established for speech; solid but artifact-prone for singing at extended range.

- **So-VITS-SVC / SoftVC VITS** ([GitHub svc-develop-team](https://github.com/svc-develop-team/so-vits-svc)) is an earlier system that separates content (via SoftVC encoder), pitch (f0), and timbre. Produces naturalistic results within the model's trained range. Quality degrades at pitches the reference speaker never produced — which is precisely the scenario needed for a "best possible self" synthesis of high notes the user cannot yet sing.

- **Seed-VC** ([Plachtaa/seed-vc, now archived](https://github.com/Plachtaa/seed-vc)) supported zero-shot voice conversion with 1–30 seconds of reference audio and real-time inference at ~300ms algorithm delay + ~100ms device delay. It demonstrated competitive zero-shot singing conversion. The project is now archived (Nov 2025); forks continue.

- **LHQ-SVC (ICASSP 2025)** is specifically optimized for CPU-compatible, lightweight inference — making it the most viable candidate for on-device or affordable server inference. Maintains competitive performance while reducing computational demand. ([arXiv 2409.08583](https://arxiv.org/abs/2409.08583))

- **TCSinger / YingMusic-SVC**: Zero-shot SVS systems with style transfer and cross-lingual support; emerging (2024–2025), promising MOS scores but limited production hardening. ([aclanthology TCSinger](https://aclanthology.org/2024.emnlp-main.117.pdf), [arXiv YingMusic-SVC](https://www.arxiv.org/pdf/2512.04793.pdf))

**A 2025 survey of deep-learning singing voice synthesis** ([arXiv 2601.13910](https://arxiv.org/html/2601.13910v1)) maps the full landscape into: Hi-Fidelity Synthesis, Controllable Synthesis, Singing Style Transfer, and Text-to-Song Generation. The controllability axis (pitch range, timbre, dynamics, style) is directly relevant for modeling a "trained self."

**On-device vs. server inference for consumer mobile:**

- Cloud TTS/SVC at scale (500 chars × 2 calls/day × 1,000 users = 1B chars/month) costs approximately $1,000–$4,000/month with major API providers. ([swmansion.com on-device TTS analysis](https://swmansion.com/blog/on-device-ai-beats-cloud-for-tts-heres-why/))
- On-device models (e.g., Kokoro at 82M params, Apache 2.0) eliminate per-call cost after a one-time model download. Kokoro supports 9 languages and runs acceptably on modern iPhone/Android.
- For singing synthesis specifically, on-device quality is currently inferior to server-side. A hybrid model is most practical: use server inference for the one-time target synthesis; use on-device TTS only for the coaching voice.
- Latency target for voice agents: 200–300ms response start to avoid perceived failure; 500ms+ causes discomfort. ([switchboard.audio](https://switchboard.audio/hub/voice-ai-latency/))

**The hard problem: distinguishing fantasy ceiling from physiological ceiling**

Vocal science provides useful constraints:

| Population                  | Typical Span (semitones) | Source                                                                                |
| --------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Untrained children 7–10 yrs | ~24 ST (2 octaves)       | [voicescience.org](https://www.voicescience.org/lexicon/average-singing-frequencies/) |
| Untrained adults (control)  | ~24–28 ST                | [Folia Phoniatr 2016](https://pubmed.ncbi.nlm.nih.gov/27584050/)                      |
| Singing students Year 1     | ~28–32 ST                | [ibid.]                                                                               |
| Singing students Year 5     | ~34–38 ST                | [ibid.]                                                                               |
| Classical trained soprano   | ~24 ST (C4–C6)           | [voicescience.org]                                                                    |
| Classical trained bass      | ~24 ST (E2–E4)           | [ibid.]                                                                               |

Key finding: **range span is roughly preserved across training; it is the absolute ceiling (particularly the high end) that expands.** A 10-week VFE protocol in graduate opera singers produced significant VRP area expansion, particularly in the upper and middle frequency thirds ([JSLHR 2020](https://pubs.asha.org/doi/10.1044/2020_JSLHR-19-00362)). A 2025 scoping review of 20 studies found that SOVT exercises, VFEs, and structured warm-ups consistently improved jitter, shimmer, resonance, and phonation time in trained singers. ([J Voice 2025, PMID 41058356](https://pubmed.ncbi.nlm.nih.gov/41058356/))

**Latent potential indicators observable from the configuration exercises:**

The existing range-walk + sustained-hold protocol already captures the essential variables. Enhancements that increase predictive power:

1. **Passaggio detection** — where the chest-to-head register break occurs. A clean, early passaggio suggests anatomical capacity for extension in both directions.
2. **VRP upper-third behavior** — how far above the break the user can phonate (even weakly). Even a single flutey note 2–3 semitones above the break indicates latent range.
3. **CPP trajectory across range** — high CPP (clean phonation) at the edges of range suggests better cord closure capability than average.
4. **Breath control score from the sustained hold** — longer MPT (maximum phonation time) and stable dynamics suggest better respiratory support, which is the primary enabler of range extension.
5. **Formant adaptability (optional)** — a neutral vs. open-mouth sustained vowel on the same pitch reveals how well the user can tune resonance (linked to projection potential). ([Titze et al., J Voice 2017, PMID 28029556](https://pubmed.ncbi.nlm.nih.gov/28029556/))

**Self-modeling / feedforward evidence**

[Ste-Marie et al. (Frontiers in Psychology, 2011)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3133863/) randomized children learning trampoline skills to feedforward self-modeling (FSM) vs. control. FSM — showing the learner an edited video of themselves successfully performing the target skill before they had mastered it — produced superior skill acquisition. The mechanism: FSM establishes a behavioral reference point (what "correct" looks and feels like for _this body_) and boosts self-efficacy. Translated to singing: an audio preview of "you, but trained" creates an internal target that is more motivating than imitating a stranger's voice and more accurate than abstract description.

A 2021 review ([PMID bura.brunel.ac.uk](https://bura.brunel.ac.uk/bitstream/2438/25337/1/FullText.pdf)) extended these findings to multiple motor domains, confirming robust effects in children and emerging evidence in adults.

**Self-Determination Theory and singing well-being**

[Krause, North & Davidson (Frontiers in Psychology, 2019, PMC6407371)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6407371/) found that competence and relatedness need satisfaction predict singing well-being across all dimensions; autonomous motivation (not controlled external reward) predicts all five well-being subscales. The implication: the synthesized-self target supports _competence_ (see what you can become) and _autonomy_ (here is your personal target, not someone else's). This is superior to a third-party target from an SDT standpoint.

#### 2.1b Concrete Recommendations for this Product

1. **Name the feature clearly**: Call it "Your Future Voice" or "Voice Preview" — not "Your Predicted Voice." Framing it as aspirational preview prevents the implication of a scientific guarantee.

2. **Build a graduated synthesis ceiling algorithm** using five configuration-exercise signals (passaggio point, VRP upper-third reach, CPP at range edges, MPT, and optionally formant flexibility). Each metric maps to a ceiling multiplier. The output is a set of synthesis parameters: target pitch range (current high + N semitones, capped at a physiologically conservative estimate), target CPP level (set to upper-quartile norms for the user's voice type), and dynamics envelope.

3. **Synthesis architecture**: Use server-side RVC or LHQ-SVC fine-tuned on 2–5 minutes of user audio collected during configuration. Render the target as 3–5 short audio clips (scale exercises at target ceiling) — not a full song. This limits compute cost and avoids the "AI cover song" copyright/ethics territory.

4. **Explicit simulation framing in the UI**: Before playback, show: _"This is a computer-generated preview based on your voice today. Actual results vary with practice and are never guaranteed."_ This framing is analogous to fitness apps showing a "goal physique" composite.

5. **Re-synthesize the target at 30-day intervals** as the user's baseline updates. The moving target is itself motivating and honest.

6. **Consent screen** before any voice model synthesis: explain what data is captured, how long it is stored, what it is used for, and how to delete it. See Area 7 for legal detail.

#### 2.1c Risks & Unknowns

- **Over-promise / trust erosion**: If users sound nothing like the synthesis after 90 days, they churn and distrust the product. Mitigation: explicit simulation framing + conservative ceiling estimates + honest progress tracking.
- **Synthesis quality at extended range**: Current SVC models produce audible artifacts at pitches far from the reference distribution. The further the synthesized target from the user's current range, the less convincing the audio. This may limit ceiling modeling to ~4–6 semitones above current range credibly. _Contested: ongoing research may narrow this gap._
- **Registration artifacts**: SVC models trained on speech perform poorly across the passaggio. Singers trained specifically on opera vs. pop have different timbral profiles; a general model will produce a blended artifact.
- **RVC/Seed-VC are community projects**: Both main repos are archived. Production deployment requires forking and maintaining the code, or licensing a commercial equivalent (e.g., ElevenLabs, Resemble AI — but verify their singing synthesis terms).

#### 2.1d Key Sources

- [Ste-Marie et al. — Feedforward Self-Modeling, Frontiers in Psychology 2011 (PMC3133863)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3133863/)
- [LHQ-SVC, arXiv 2409.08583, ICASSP 2025](https://arxiv.org/abs/2409.08583)
- [Synthetic Singers SVS Survey, arXiv 2601.13910](https://arxiv.org/html/2601.13910v1)
- [Voice Range Profiles of Singing Students, Folia Phoniatr 2016 (PMID 27584050)](https://pubmed.ncbi.nlm.nih.gov/27584050/)
- [VFE RCT on opera singers, JSLHR 2020](https://pubs.asha.org/doi/10.1044/2020_JSLHR-19-00362)
- [Vocal exercise effectiveness scoping review, J Voice 2025 (PMID 41058356)](https://pubmed.ncbi.nlm.nih.gov/41058356/)
- [Formant Range Profile for Singers, J Voice 2017 (PMID 28029556)](https://pubmed.ncbi.nlm.nih.gov/28029556/)
- [SDT and musical well-being, Frontiers 2019 (PMC6407371)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6407371/)
- [swmansion.com — On-device TTS cost analysis](https://swmansion.com/blog/on-device-ai-beats-cloud-for-tts-heres-why/)
- [Seed-VC GitHub (archived)](https://github.com/Plachtaa/seed-vc)

---

### Area 2 — Third-Party Target Vocals: Ingestion, Isolation, Analysis

#### 2.2a Key Findings & Evidence

**SOTA stem separation**

| System                                 | SDR (vocals) | License     | Notes                                                                                                                                         |
| -------------------------------------- | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| HTDemucs v4 (Hybrid Transformer)       | ~9.0 dB      | MIT         | Best open-source; repo now archived by original author ([facebookresearch/demucs](https://github.com/facebookresearch/demucs))                |
| HTDemucs fine-tuned (htdemucs-ft)      | ~9.3 dB      | MIT         | Fine-tuned on additional data; available on HuggingFace ([StemSplitio/htdemucs-ft-onnx](https://huggingface.co/StemSplitio/htdemucs-ft-onnx)) |
| Spleeter (Deezer, 2019)                | ~6.5 dB      | MIT         | Faster, lower quality; predominantly superseded                                                                                               |
| Ensemble models (2024)                 | ~9.5–10 dB   | Mixed       | [arXiv 2410.20773](https://arxiv.org/abs/2410.20773) — combining models via harmonic mean of SNR+SDR                                          |
| Commercial APIs (LALAL.AI, AudioShake) | ~9–10 dB     | Proprietary | Better at edge cases; monthly cost ~$20–$200                                                                                                  |

A 2024 ensemble study ([arXiv 2410.20773](https://arxiv.org/abs/2410.20773)) demonstrated that combining multiple separation architectures via harmonic mean SDR selection improves both traditional VDB stems and sub-stem separation (lead vs. backing vocals). This is the recommended approach for production quality.

**How separation artifacts corrupt downstream analysis:**

SDR of 9 dB means the residual bleed-through energy is about 12% of signal power — audible and measurable. Effects on specific metrics:

- **HNR**: Instrumental bleed adds noise → artificially _lowers_ HNR → falsely suggests dysphonia
- **Jitter/shimmer**: Percussive transients in bleed → artificially _raises_ both → falsely suggests poor vocal quality
- **Pitch detection (F0)**: Harmonic bleed from instruments in same pitch range → pitch estimation errors, especially on choral or densely arranged recordings
- **Formant analysis (F1/F2)**: Background vocals, reverb tails → smear formant valleys → less reliable formant profiles
- **CPP**: More robust than the above, but still affected by sustained tonal bleed

**Quality gates are essential** before accepting a target profile. Recommended checks:

1. **Bleed energy ratio**: measure energy outside the vocal fundamental's harmonic series — reject if >15%
2. **Pitch continuity**: F0 contour smoothness check — flag tracks with >20% unvoiced frames at expected pitch
3. **CPP threshold**: minimum CPP of 8 dB on steady vowels post-separation; below this, reject or warn
4. **Manual listen gate**: for tracks flagging 2+ automatic checks, surface a warning to the user

**What a target voice profile should contain:**

A robust target profile for adaptive learning should include:

| Feature                                         | Extraction Method                                                                                      | Robustness to Separation Artifacts |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Singing range (low/high MIDI, comfortable zone) | VRP from sustained notes                                                                               | High                               |
| Voice type classification                       | Range + formant centroid                                                                               | High                               |
| Tessitura (most-used pitch zone)                | Pitch histogram from [PMC8786980 Schloneger method](https://pmc.ncbi.nlm.nih.gov/articles/PMC8786980/) | High                               |
| Vibrato rate/extent                             | F0 modulation analysis                                                                                 | Medium                             |
| Dynamics envelope (ppp–fff range)               | SPL distribution                                                                                       | Medium                             |
| CPP / tone quality                              | Cepstral analysis                                                                                      | Medium                             |
| Onset style (soft vs. hard glottal)             | Attack energy profile                                                                                  | Low                                |
| Formant profile / vowel space                   | F1/F2 analysis                                                                                         | Low — use cautiously               |
| Phrasing / phrase contour                       | DTW alignment                                                                                          | Medium                             |

Omit features rated "Low" from the target profile unless the track passes all quality gates at high confidence.

**Studio-recording inflation**

Professional recordings apply: pitch correction (Auto-Tune/Melodyne), multiband compression, reverb, saturation, and sometimes pitch-shifting. A study by [Mårtensson (Luleå University, 2022)](https://www.diva-portal.org/smash/get/diva2:1660360/FULLTEXT01.pdf) confirmed that pitch correction introduces statistically detectable timbral changes, primarily in the treble register — which means the target timbre the system extracts is not the artist's natural timbre.

Normalization strategies:

1. **Range normalization**: map extracted range to voice-type norms, flagging if the artist's tesssitura is unusually compressed or expanded
2. **CPP de-compression**: apply an inverse compression estimate based on dynamic range ratio; flag tracks with DR < 8 dB as heavily compressed
3. **Reverb tail removal**: use a short-RT median filter on the separation output before acoustic analysis
4. **Communicate the gap**: show users an honest comparison ("this artist's studio voice vs. your live voice") to prevent demoralization from comparing studio-polished targets to raw microphone input

#### 2.2b Concrete Recommendations

1. **Default to HTDemucs fine-tuned** (server-side) for all third-party ingestion. Run quality gates on every track; surface pass/warn/reject status in the UI.
2. **Build the target profile using only high-robustness features** when artifacts are detected; disable formant-dependent features on warn-flagged tracks.
3. **Display a "studio processing notice"** when targets appear compressed or pitch-corrected: _"This track may include pitch correction and studio processing. Your live voice will differ — that's normal and expected."_
4. **Store the separated vocal stem ephemerally** (process and discard within session); store only the derived feature vector. This is both privacy-smart and limits copyright exposure.
5. **Offer a human-voice reference library** of unprocessed, consent-cleared reference voices as an alternative to user-uploaded commercial audio.

#### 2.2c Risks & Unknowns

- **Copyright/DMCA**: Covered fully in Area 7. Even high-quality separation for analysis-only purposes has legal exposure. Treat as a premium feature with explicit legal warnings.
- **Separation quality on reverberant recordings**: HTDemucs performs poorly on recordings with long reverb tails (large arenas, cathedrals). Consider a pre-processing dereverb step.
- **Backing vocals**: Many pop recordings have prominent backing vocals that separation assigns to the "vocals" stem. This can create multi-pitch artifacts in the profile. Add a "multiple singers detected" flag.

#### 2.2d Key Sources

- [facebookresearch/demucs (HTDemucs v4)](https://github.com/facebookresearch/demucs)
- [arXiv 2305.07489 — HTDemucs paper](http://arxiv.org/pdf/2305.07489.pdf)
- [arXiv 2410.20773 — Ensemble approach to MSS 2024](https://arxiv.org/abs/2410.20773)
- [neuralanalog.com — Spleeter vs. Demucs comparison](https://neuralanalog.com/docs/spleeter-vs-demucs-comparison)
- [Mårtensson 2022 — Pitch correction timbral effects](https://www.diva-portal.org/smash/get/diva2:1660360/FULLTEXT01.pdf)
- [Schloneger et al. 2021 — Tessitura measurement (PMC8786980)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8786980/)

---

### Area 3 — Competitive Teardown

_(Full product matrix in Section 3 below.)_

#### 2.3a Key Findings

**Singing/voice apps**

- **Yousician Singing** is a module within a multi-instrument platform. It offers real-time pitch detection, songs to sing along with, and technique lessons, but is relatively light on scientific rigor. Reviews consistently note the song library is limited and the singing module feels secondary to the instrument tracks. Its strength is making practice feel like a game; its weakness is shallow vocal pedagogy and no coach persona. ([American Songwriter Yousician Review](https://americansongwriter.com/yousician-singing-review/), [bloomvocal.site review 2026](https://www.bloomvocal.site/en/blog/yousician-review-2026))

- **Simply Sing (Smule)** focuses on pitch accuracy within the user's current range. Solid onboarding range-match, but no concept of a target baseline or progressive stretch goals. Strong karaoke integration; weak on structured technique development.

- **Singing Carrots** has evolved into an AI vocal coach product with conversational feedback, adaptive daily sessions, and a vocal range test. Their claim that 80% of users improve in 2 weeks is not independently verified. The most MIR-sophisticated of the consumer apps. ([singingcarrots.com](https://www.singingcarrots.com/), [singingcarrots blog 2026 app comparison](https://blog.singingcarrots.com/best-learn-to-sing-apps-2026/))

- **SingTrue** (now "Voice Training for Singers") emphasizes ear training and pitch matching. High App Store ratings for pitch exercises; no progression model or gamification beyond basic completion.

- **Vanido** used daily short-session micro-exercises. It had the best onboarding UX of any singing app (Techcrunch-praised) but has stagnated. No synthesized target feature anywhere in the market.

- **Erol Singer's Studio**: Technique-heavy, video-driven. Closest to a genuine vocal pedagogy curriculum. Not gamified; not adaptive. No baseline comparison system.

**Gamified education leaders — Duolingo deep dive**

Duolingo ($748M revenue in 2024, [Wikipedia/Duolingo](https://en.wikipedia.org/wiki/Duolingo)) is the canonical gamified learning case study. Its key mechanics and their evidence status:

| Mechanic                      | What It Does                               | Evidence Status                                                                                                                         | Failure Mode                                                                                                          |
| ----------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Daily streak                  | Habit formation via completion consistency | Well-established for retention                                                                                                          | Streak anxiety; users take "streak shields" not lessons; churn on first miss                                          |
| XP / points                   | Immediate reward for activity              | Well-established short-term                                                                                                             | Gamification misuse: XP farming without learning ([Mogavi et al. 2022](https://ar5iv.labs.arxiv.org/html/2203.16175)) |
| Hearts / energy               | Error cost; rate limiter                   | Controversial — adds friction                                                                                                           | Pay-to-restore dark pattern; punishes natural mistake-making in learning                                              |
| Leagues                       | Social competition                         | Mixed evidence                                                                                                                          | Anxiety, toxic competitiveness, bots                                                                                  |
| Skill tree                    | Visual progression map                     | Useful for orientation                                                                                                                  | Misleading completion; tree does not represent true mastery                                                           |
| Birdbrain adaptive difficulty | IRT-based per-learner difficulty matching  | Well-established; published evidence ([Duolingo blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/)) | Requires large user base to calibrate; cold-start problem                                                             |
| Push notifications            | Habit trigger                              | Effective for retention                                                                                                                 | Manipulative framing ("Duo is SAD you missed a day"); erodes trust                                                    |
| Streak society / milestones   | Long-term anchor                           | Positive; reinforces identity                                                                                                           | Social comparison anxiety                                                                                             |

**Duolingo Music** (launched Oct 2023) teaches ear training, sheet music reading, and piano note location via playing songs. It uses the same XP/streak system as language learning. Scoring is 0–1000 per lesson based on accuracy and rhythm. Notably, it does not teach singing — the gap VOICE is filling. ([duolingo.fandom.com Duolingo Music](https://duolingo.fandom.com/wiki/Duolingo_Music))

**Gamification misuse research (critical for VOICE)**

[Mogavi et al. (L@S 2022)](https://ar5iv.labs.arxiv.org/html/2203.16175) identified three primary failure modes in Duolingo:

1. **Competitiveness** — league rankings drive farming behavior
2. **Overindulgence in playfulness** — entertainment value crowds out learning intent
3. **Herding** — social proof ("everyone does streaks") creates conformist anxiety

For singing, a fourth failure mode is unique: **gamification-induced vocal overuse**. Users who feel urgency to maintain streaks may sing through fatigue, hoarseness, or illness — causing real physical harm.

#### 2.3b Concrete Recommendations

1. **Do not implement hearts/energy rate limiters.** For a wellness/skill product, penalizing honest attempts is counterproductive and medically problematic (users may push through strain to avoid losing hearts).
2. **Implement "practice detected" streaks, not "completion" streaks.** Count a session as complete when the user shows up and attempts exercises — not when they complete a minimum score. Lowering the threshold to maintain streaks reduces anxiety without reducing habit formation.
3. **Cap competitive mechanics** at personal-best comparison. No leagues, no head-to-head. Singing is intrinsically personal.
4. **Adopt the Birdbrain architecture** for exercise difficulty adaptation. The prerequisite DAG of vocal skills (breath → pitch → passaggio → vibrato → style) is already implicit in the 4-level curriculum; formalize it as a skill graph.
5. **Make the XP system transparent**: show users what XP represents (effort, not quality) and decouple it from the primary progress metric, which should be baseline-to-target distance.

#### 2.3c Risks & Unknowns

- **Singing Carrots AI vocal coach** is the closest competitor to the envisioned product. Monitor their feature velocity; they may ship synthesized targets before VOICE does.
- **Gamification calibration for slow-progress skills**: Singing improvements that take 3–6 months to manifest need intermediate "micro-win" mechanics to sustain engagement. Duolingo benefits from vocabulary that shows up in days; singing does not. This is a genuine unsolved design problem.

#### 2.3d Key Sources

- [American Songwriter — Best Singing Apps 2026](https://americansongwriter.com/best-singing-apps/)
- [Singing Carrots blog — Best learn-to-sing apps 2026](https://blog.singingcarrots.com/best-learn-to-sing-apps-2026/)
- [Mogavi et al. — When Gamification Spoils Your Learning, L@S 2022](https://ar5iv.labs.arxiv.org/html/2203.16175)
- [Duolingo Birdbrain blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/)
- [Wikipedia — Duolingo (financials, mechanics)](https://en.wikipedia.org/wiki/Duolingo)
- [bloomvocal.site — Yousician review 2026](https://www.bloomvocal.site/en/blog/yousician-review-2026)
- [Blake Crosley — Duolingo gamification design](https://blakecrosley.com/guides/design/duolingo)

---

### Area 4 — Learning Science of a "Here → There" Model & Roadmap Generation

#### 2.4a Key Findings & Evidence

**Motor learning frameworks applicable to vocal skill**

Singing is a complex motor skill: it involves coordinated control of respiratory, laryngeal, and articulatory subsystems, each with distinct learning rates. Motor learning research provides several directly applicable frameworks:

1. **Challenge Point Framework (Guadagnoli & Lee 2004)**: Optimal learning occurs when task difficulty is calibrated to the learner's functional state. Too easy → boredom, no adaptation. Too hard → overload, failure. The "challenge point" shifts with skill level. For singing: the exercise difficulty should be set at ~85% success rate — enough error to drive adaptation, enough success to maintain motivation. ([msl.kin.educ.ubc.ca](https://msl.kin.educ.ubc.ca/sites/default/files/publication-files/PrePrint_Chall))

2. **Desirable Difficulties (Bjork 1994; Bjork & Bjork 2011)**: Difficulties that slow acquisition but enhance long-term retention: interleaved practice, spaced repetition, reduced feedback frequency, variability of practice. A 2024 academic review confirmed these effects across musical domains. ([Wiley medu.14916](https://onlinelibrary.wiley.com/doi/abs/10.1111/medu.14916))

3. **Guidance Hypothesis**: Frequent, continuous augmented feedback during practice improves performance _during_ practice but impairs _retention_ because learners become feedback-dependent. Post-attempt feedback is better than concurrent feedback for retention. _However_, a recent PMC study ([PMC4893479 Fujii et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4893479/)) found that for _novel_ coordination patterns (like a new vocal register), more feedback is indeed better during initial acquisition — the guidance hypothesis applies most strongly after basic pattern formation. Practical synthesis: **concurrent pitch display is beneficial for early learners on new exercises; should fade as exercises become familiar.**

4. **Augmented feedback review** ([PMC8681883](https://pmc.ncbi.nlm.nih.gov/articles/PMC8681883/)): Visual feedback is superior for complex skill learning in novices; auditory feedback is more effective for already-partially-learned patterns. The existing karaoke comparison engine (DTW pitch + timing) is the right substrate for visual feedback; complement it with auditory playback of the comparison result.

5. **Spaced and interleaved practice**: A 2023 review confirms spaced > massed for retention across motor tasks. Interleaved (mixed-exercise) practice produces slower acquisition but stronger long-term retention and transfer than blocked (same-exercise-repeated) practice. ([Academic study 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC11981649/)) Implication: sessions should mix exercise types (e.g., SOVT + scale walk + passaggio navigation) rather than drilling one exercise to completion.

6. **ZPD (Vygotsky / Csikszentmihalyi flow)**:The Zone of Proximal Development — tasks slightly beyond current ability but achievable with effort — maps directly to the challenge point framework. Adaptive curriculum research confirms that ZPD-calibrated delivery improves both performance and motivation. ([dspace.library.uu.nl Ferguson et al. 2022](https://dspace.library.uu.nl/bitstream/handle/1874/432394/Ferguson_etal2022-ArtificialIntelligence.pdf))

**Knowledge tracing and adaptive curriculum**

Bayesian Knowledge Tracing (BKT), introduced by Corbett & Anderson (1994), models each skill as a hidden Markov process with states (known/unknown) and four parameters: P(L₀), P(T), P(G), P(S). Modern extensions (Deep Knowledge Tracing, DKT) use LSTMs to handle the multi-skill interdependencies inherent in vocal development. ([PMC arXiv BKT 2026](https://www.scitepress.org/Papers/2026/150538/150538.pdf))

For VOICE, the prerequisite DAG is:

```
Breathing Foundation
    ↓
SOVT / Straw Phonation → Sustained Hold → Reference Tone Match
    ↓
Scale Walk → Octave Jump → Interval Training
    ↓
Passaggio Navigation → Range Extension
    ↓
Phrase Hold → Dynamic Control
    ↓
Vibrato Introduction → Style-Specific Phrases
```

Each node has: a set of measurable mastery conditions (CPP, pitch accuracy, hold duration, interval accuracy) and a contribution weight to the target-distance calculation.

**Converting multi-dimensional metric deltas to exercise priority**

The current-to-target distance is multi-dimensional:

| Dimension                        | Current → Target Gap                 | Priority if gap is large                  |
| -------------------------------- | ------------------------------------ | ----------------------------------------- |
| Range (high end)                 | Semitones missing above current high | Range Extension + Passaggio Navigation    |
| Range (low end)                  | Semitones missing below current low  | Scale Walk (downward) + Breath Foundation |
| Pitch accuracy                   | Cent deviation from target           | Reference Tone Match + Scale Walk         |
| Pitch stability (vibrato/tremor) | Jitter/shimmer gap                   | Sustained Hold + Vibrato Introduction     |
| Breath control                   | MPT gap + dynamics range             | Breathing Foundation + Dynamic Control    |
| Tone quality (CPP gap)           | CPPS below target norm               | SOVT + Sustained Hold                     |
| Phrasing/contour                 | DTW distance on phrases              | Phrase Hold + Style-Specific Phrases      |

**Priority rule (empirically grounded)**: Always fix breath foundation first — respiratory support is the enabling constraint for every other dimension. Then pitch accuracy (because poor pitch masking prevents the learner from hearing improvements in other dimensions). Then registration/passaggio (the primary bottleneck for range extension).

#### 2.4b Concrete Recommendations

1. **Formalize the skill graph** as a directed acyclic graph (DAG) in the backend. Store each node's prerequisite mask and mastery thresholds. This makes roadmap generation explainable: the app can tell users _why_ they are doing Breathing Foundation before Range Extension.

2. **Implement a lightweight BKT layer** — even simple per-skill mastery estimates (4-parameter BKT) are sufficient for small teams. Defer DKT until the dataset exceeds 10,000 practice sessions.

3. **Set exercise difficulty via the challenge point**: after each attempt, measure success rate. If >90% for 3 consecutive sessions, increase difficulty (tempo, range, interval size, hold duration). If <60% for 3 consecutive sessions, decrease. This automates the Birdbrain-equivalent for singing.

4. **Use spaced repetition for review exercises**: schedule exercises that have been recently mastered at 3-day, 1-week, 2-week intervals. Use Leitner box logic initially; upgrade to FSRS (Free Spaced Repetition Scheduler) as session data accumulates.

5. **Concurrent vs. post-attempt feedback scheduling**: For exercises in the first 3 sessions (new skill), show real-time pitch display. After mastery onset (>70% accuracy for 2 sessions), switch to post-attempt comparison only, to prevent feedback dependency.

6. **Re-plan on plateau**: if a metric shows no improvement over 14 days of regular practice, trigger a re-planning event — offer a different exercise pathway for the same dimension (e.g., swap Scale Walk for Interval Training for range development) and re-assess the current baseline.

#### 2.4c Risks & Unknowns

- **Mastery in singing is hard to operationalize**: unlike vocabulary (correct/incorrect), pitch accuracy is a continuum and depends on key, context, and vowel. Define mastery thresholds carefully with a vocal pedagogy advisor.
- **Transfer from exercises to songs**: most motor learning research shows that blocked drill practice does not automatically transfer to performance contexts. Song-based practice (the karaoke comparison engine) should be integrated into every session, not treated as a separate mode.
- **Individual differences are large**: VRP studies show 2–3× variation in natural range and training response across individuals at the same training level. The adaptive system must accommodate outliers.

#### 2.4d Key Sources

- [Moinuddin et al. — Augmented Feedback Motor Learning, PMC8681883](https://pmc.ncbi.nlm.nih.gov/articles/PMC8681883/)
- [Fujii et al. — More Feedback Is Better for Novel Patterns, PMC4893479](https://pmc.ncbi.nlm.nih.gov/articles/PMC4893479/)
- [Spaced + Interleaved Practice review 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC11981649/)
- [BKT adaptive learning 2026](https://www.scitepress.org/Papers/2026/150538/150538.pdf)
- [Ferguson et al. — ZPD and AI guidance 2022](https://dspace.library.uu.nl/bitstream/handle/1874/432394/Ferguson_etal2022-ArtificialIntelligence.pdf)
- [Vocal exercise effectiveness scoping review, J Voice 2025 (PMID 41058356)](https://pubmed.ncbi.nlm.nih.gov/41058356/)

---

### Area 5 — Gamified Goal Matrix

#### 2.5a Key Findings & Evidence

**What sustains long-term skill practice vs. what causes early burnout**

The [Mogavi et al. (L@S 2022)](https://ar5iv.labs.arxiv.org/html/2203.16175) study is the most rigorous direct evidence: gamification misuse in Duolingo was driven by streaks (completion anxiety), leaderboards (social comparison), and badge hunting (vanity metrics). The users who persisted and learned were those who connected gamification to learning identity, not performance identity.

The [PMC gamification and health psychology review (PMC11353921)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11353921/) found that:

- **Points and progress bars** show consistent positive effects on motivation and engagement.
- **Badges and achievements** have weak-to-moderate effects; effects decay over time.
- **Leaderboards** show the most inconsistent effects: positive for high performers, negative for low-middle performers.
- **Narrative/story elements** show consistent positive effects, particularly for well-being-adjacent applications.

**SDT-based analysis of gamification**: Extrinsic rewards (XP, badges) undermine intrinsic motivation when they signal _external_ evaluation ([SDT theory, selfdeterminationtheory.org](https://selfdeterminationtheory.org/theory/)). The key is that rewards must feel like _acknowledgments of competence_ (autonomy-preserving), not _bribes for compliance_ (autonomy-threatening). Verbal praise with specific content ("your upper register is stabilizing") is more SDT-aligned than a generic XP award.

**Variable reward schedules**: Intermittent (partial) reinforcement produces more resistant extinction than fixed ratio — the slot-machine effect. This makes variable XP drops and surprise badge unlocks powerful. _However_, for a wellness product, the ethical line is between pleasant surprise (finding a new skill tree unlocked) and compulsive checking (checking for new content 20x/day). The latter becomes a dark pattern. The distinction is whether the check is triggered by genuine progress or by anxiety.

**Long-term evidence on skill practice gamification**: A study of gamification in reducing procrastination ([ScienceDirect PMC 2019](https://www.sciencedirect.com/science/article/pii/S037877881933097X)) found significant short-term effects; 6-month follow-up showed substantial decay unless gamification was paired with habit formation cues and identity-level motivation. This is directly relevant: the app needs to move users from "I'm doing this for XP" to "I'm a singer" within the first 30 days.

#### 2.5b Concrete Recommendations

1. **Map every XP-earning action to a real vocal-capacity action**. XP is awarded for: completing a session (regardless of score), achieving a new accuracy milestone, reaching a new note, and maintaining a streak. Not for purchasing streak shields or watching ads.

2. **Use "progress bars toward real milestones"** as the primary motivation layer — e.g., "3 semitones from the note you targeted." This is more honest and more motivating than abstract XP.

3. **Streak architecture**: implement a "practice streak" (any session launched > 3 exercises), not a "perfect session streak." Offer a weekly "vocal rest day" grace (silence is good for voice recovery) without breaking the streak. This is both vocally sound and retention-smart.

4. **Skill tree design**: Nodes should correspond to genuine vocal capacities (not app-defined arbitrary levels). Unlock each node with a measurable performance gate (e.g., "hold a steady note for 8 seconds at CPP >10 dB"). Cosmetic unlocks (avatar appearances, woofer cone color palettes) are fine as bonus rewards — decouple them from functional access.

5. **Badge taxonomy**: use three tiers: (a) milestone badges (first high note, first vibrato detected, 30-day streak) — rare, meaningful; (b) process badges (practiced before 8am, tried a new exercise) — frequent, autonomy-affirming; (c) surprise badges (hidden — "sang in a storm," triggered by unusual session conditions) — variable reward.

6. **No energy/hearts/rate limiters** — singing is a health behavior. Penalizing practice attempts is harmful.

7. **Monthly "vocal story"**: generate an infographic showing the user's vocal development over the past month. Real data, honest framing. This is the highest-value retention mechanic for slow-progress skills because it makes invisible progress visible.

#### 2.5c Risks & Unknowns

- **Cold-start problem**: new users have no progress data; the skill tree is empty and the progress bar shows 0%. First 72 hours must be engineered with manufactured early wins (easy reference tone matches, confirming "you can already do X").
- **Plateau representation**: when users stop improving (common at 2–3 month mark), the progress bar freezes — this is demotivating. Introduce "depth metrics" (steadiness, dynamics, style variety) that can show improvement even when range is plateauing.

#### 2.5d Key Sources

- [Mogavi et al. — Gamification Misuse in Duolingo, L@S 2022](https://ar5iv.labs.arxiv.org/html/2203.16175)
- [PMC11353921 — Gamification for health/well-being review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11353921/)
- [SDT theory overview](https://selfdeterminationtheory.org/theory/)
- [SDT and musical participation (PMC6407371)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6407371/)
- [Blake Crosley — Duolingo gamification design](https://blakecrosley.com/guides/design/duolingo)

---

### Area 6 — The AI Vocal Coach Avatar

#### 2.6a Key Findings & Evidence

**Abstract vs. anthropomorphic avatar design**

The uncanny valley effect — where near-human agents trigger unease — is well-documented (Mori 1970; multiple confirmations). For an AI voice coach, avoiding humanoid form is design-safe and increasingly mainstream: Siri (colored sphere), Google Assistant (colored dots), Alexa (animated ring), Spotify DJ (animated waveform), Apple's Siri on iOS 17+ (glowing orb). These all represent a convergent design choice toward abstract, audio-reactive forms for voice AI.

A 2025 arXiv study ([arXiv 2505.05543](https://arxiv.org/pdf/2505.05543)) found that uncanny AI avatars specifically _reduced_ trust and willingness to follow advice — directly relevant for a coaching context where users must follow vocal health guidance. Abstract designs with warm color palettes and organic motion scored higher on trust and perceived competence in the studies surveyed.

**"Talking circle" / woofer-cone concept**: The speaker-cone aesthetic maps to audio-reactive visualization patterns in professional media production (Adobe Premiere Pro waveform editor, podcast art). Key motion vocabulary that reads as "alive and warm":

- **Organic, non-uniform oscillation**: slight irregularity in amplitude response (not perfect sine) feels more biological
- **Breath-paced idle animation**: subtle slow expand-contract at ~0.25 Hz (respiratory rate) when idle
- **Reactivity to TTS frequency**: high-frequency speech content → faster, smaller oscillations; low-frequency → slower, larger
- **Damping after speech ends**: vibration fades naturally (exponential decay) rather than snapping to zero

What reads as mechanical: perfectly symmetric motion, instant transitions, pixel-exact repetition, static default state.

**Haptic feedback**

Research on haptics in mobile learning ([end-educationconference.org 2024 paper](https://end-educationconference.org/wp-content/uploads/2024/07/202402OP041.pdf)) found that haptic feedback improves engagement and information retention in mobile learning contexts, particularly for timing-based tasks. Accessibility angle: haptic feedback provides non-visual/non-auditory confirmation of app events — valuable for users with hearing impairment.

Recommended haptic events (conservative, not compulsive):

- **Coach speech start**: single subtle tap (confirms attention direction)
- **Pitch-match success**: gentle "bloom" (escalating intensity, ~100ms) — positively reinforcing
- **Breath cue during exercise**: rhythmic gentle pulse at the breathing rhythm (in/out cycle)
- **Session complete**: distinct celebratory pattern (differentiated from routine success)
- **Vocal warning**: a distinctly different, non-startling haptic (two short taps) when CPP drops below strain threshold

What to avoid: haptic for every interaction (desensitizes), strong vibration during singing (disrupts proprioception), any haptic that mimics anxiety signals.

**Conversational behavior & persona**

The [Decagon voice agent design guide (2026)](https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent/) articulates five conversation design principles: help users get things done fast, sound clear and natural, stay silent when listening, correct course without blame, and maintain consistent persona. For a singing coach, the "stay silent while listening" principle is especially important — the avatar should not speak during the user's singing attempt. This is non-trivial to implement (requires clean VAD on the coach side).

**Pedagogical agent research** ([CEUR-WS IUI 2021](https://ceur-ws.org/Vol-2903/IUI21WS-CUIIUI-4.PDF)) found that trust in conversational agents is built through: response timing consistency, calibrated acknowledgment of user context, non-judgmental language, and demonstrated competence (giving accurate information). For singing, trust is also built by the coach _not_ over-praising: users who receive only positive feedback distrust the coach faster than users who receive specific, sometimes critical, but constructive feedback.

**Persona design across singing sub-personas**

The product serves a continuum from "I've never sung before" to "I'm preparing for an audition." A single persona tone won't serve both ends. Recommended approach:

| User Stage                     | Coach Tone             | Voice Characteristics                | Feedback Style                                              |
| ------------------------------ | ---------------------- | ------------------------------------ | ----------------------------------------------------------- |
| Absolute beginner (Foundation) | Warm, curious, playful | Relaxed pace, simple vocabulary      | One thing at a time; celebrate presence over performance    |
| Improving (Core Skills)        | Encouraging, precise   | Slightly more technical vocabulary   | Acknowledge what's working; one specific target per session |
| Advancing (Musicality)         | Collaborative, direct  | Peer-like; occasional musical jargon | "You're choosing to..." framing; ownership language         |
| Near-target (Expression/Style) | Respectful, specific   | Succinct; less handholding           | Analytical comparisons to target profile                    |

**Should the coach have a synthesized voice? Should it ever sing?**

TTS coach voice: strongly recommended over text-only. Conversational speech is dramatically more effective for learning cues than text when the user is in a listening/performing state — they cannot read while singing. The coach should speak; use a high-quality TTS model (not robotic). On-device options (Kokoro) are viable for coaching speech; server-side for higher emotional expressiveness.

**Coach demonstrating by singing**: _controversial_. Evidence from instrument teaching suggests that demonstration accelerates acquisition of motor patterns; however, AI-generated singing has consistent quality and style artifacts that may not match the user's voice type or target. Recommendation: the coach can demonstrate exercises using the user's own "current" synthesized voice (from the configuration audio) played back — not a generic AI singer voice. This is more pedagogically valid and avoids the "alien voice" distraction.

#### 2.6b Concrete Recommendations

1. **Woofer-cone visualization**: implement as an SVG/Canvas animation driven by the TTS audio waveform (not by frequency analysis — too computationally expensive in-sync). Sample the audio buffer at 60fps, apply a Gaussian smoothing (window ~30ms), map to cone radius ±20% around rest state. Add 2–3% random noise to the oscillation to feel organic.

2. **Avatar state machine refinement**: add a distinct visual state for VOCAL_REST mode (coach dims, animation slows to breathing pulse) that fires when the system detects user singing input. The coach literally yields the floor.

3. **Haptic budget**: max 5 distinct haptic patterns; test each for disruptiveness during singing (vibration during phonation can disrupt pitch control). Consider disabling haptics during active singing and triggering only at natural pause points.

4. **Coach TTS voice**: choose a warm, mid-register voice (male or female; avoid very high-pitched TTS which can feel shrill on mobile speakers). Test perceived warmth with 5+ users before committing; warmth ratings correlate strongly with trust and completion. Use on-device Kokoro for coaching speech; reserve server-side for higher-expressiveness moments (e.g., celebration speech).

5. **One-correction-at-a-time rule**: the avatar's coaching state should surface exactly one piece of feedback per attempt, prioritized by which metric is furthest from target. This is both pedagogically correct (blocking practice of the most impactful skill) and maintains the non-shame tone.

6. **Never speak during the user's singing attempt.** Implement silence detection on the user's microphone input; when singing begins, suppress all coach speech. Resume only when the user finishes and there's a 1–2 second silence.

#### 2.6c Risks & Unknowns

- **Persona consistency over time**: users who interact with the coach 100+ times will notice inconsistencies in TTS-generated responses. Consider a limited-set templated response library with persona-consistent variation, audited for tone, rather than fully LLM-generated responses.
- **Crossing into advice the app isn't qualified to give**: the coach must never diagnose vocal pathology, never say "your voice is damaged," and always refer to an SLP or doctor for persistent hoarseness. _This must be a hard rule in the response generation system, not a soft guideline._

#### 2.6d Key Sources

- [Decagon.ai — Voice agent conversational design 2026](https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent/)
- [arXiv 2505.05543 — Uncanny valley and trust in AI agents](https://arxiv.org/pdf/2505.05543)
- [CEUR-WS IUI21 — Trust in conversational agents](https://ceur-ws.org/Vol-2903/IUI21WS-CUIIUI-4.PDF)
- [end-educationconference.org — Haptic feedback in mobile learning](https://end-educationconference.org/wp-content/uploads/2024/07/202402OP041.pdf)
- [switchboard.audio — Voice AI latency and conversation timing](https://switchboard.audio/hub/voice-ai-latency/)
- [swmansion.com — On-device TTS (Kokoro)](https://swmansion.com/blog/on-device-ai-beats-cloud-for-tts-heres-why/)

---

### Area 7 — Legal, Privacy & Vocal-Health Framing

#### 2.7a Key Findings & Evidence

**Copyright / ToS Analysis**

| Source scenario                                      | Risk level | Analysis                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (i) Synthesized-self target from user's own audio    | Low        | User owns their voice performance. No third-party IP involved. Principal risk is the voice synthesis model's training data licensing (RVC's training data is undocumented — use with caution in commercial product).                                                        |
| (ii) User-uploaded third-party audio                 | High       | User has no license to reproduce or analyze the underlying composition/recording. The "personal use" defense is not available to a commercial platform processing the file on behalf of the user. The DMCA safe harbor (§512) requires a proper notice-and-takedown system. |
| (iii) User-pointed YouTube/streaming links           | Very High  | The app's servers downloading YouTube audio violates YouTube ToS (§5.1K, §5.1I); may violate DMCA §1201 if any technical protection measures are circumvented. There is no fair use analysis strong enough to support this in a commercial application.                     |
| (iv) App downloading/separating audio from streaming | Extreme    | Same as (iii) + circumvention of streaming platform DRM. Litigation risk from record labels is severe (e.g., RIAA actions against RipX, Yout.com).                                                                                                                          |

Fair use does not cover systematic/commercial downloading. The [U.S. Copyright Office Fair Use Index](https://www.copyright.gov/fair-use/) and [YouTube's own fair use guidance](https://support.google.com/youtube/answer/9783148) make clear that transformation for educational purposes is context-dependent; automated platform-level processing is not transformation.

**Recommended path**: Build a consent-cleared reference voice library. License short vocal samples from willing artists under permissive licenses, or partner with a vocal coaching IP holder. This eliminates the copyright exposure entirely. Alternatively, restrict third-party targeting to audio the user has licensed (e.g., purchased downloads from Bandcamp or direct artist permission).

**Privacy & biometric law**

Voice data that enables biometric identification is regulated as special-category data under GDPR (Article 9), "biometric information" under Illinois BIPA (740 ILCS 14), CCPA (Cal. Civ. Code §1798.140(c)(1)(E)), and analogous state laws in Texas (CUBI) and Washington (WFBPA). ([waywithwords.net legal overview](https://waywithwords.net/resource/legal-obligations-collecting-voice-data/))

A synthesized voice model built from a user's recordings is almost certainly a voiceprint under BIPA's definition — it enables re-identification of the user. Obligations triggered include:

- **Explicit written consent** before collection (not buried in a ToS)
- **Published retention policy** with defined destruction timeline
- **No monetization** of biometric data without separate consent
- **Deletion on demand** within a defined window
- **Illinois-specific**: cannot sell, lease, trade, or profit from biometric identifiers

GDPR additionally requires:

- **Data minimization**: collect only what's needed to deliver the feature
- **Storage limitation**: retain only as long as necessary for the stated purpose
- **Right to erasure**: delete all derived models when user requests or account is deleted

⚠️ **Consult a qualified privacy lawyer before shipping the synthesis feature.** The legal landscape for AI-generated voice models is actively litigating (several class actions against AI voice companies are pending as of 2026).

**Vocal-Health Guardrails** _(Flag as highest-priority)_

Vocal injury in singers follows predictable patterns: overuse (too many sessions/too long), overshooting range, practicing through fatigue or illness. The gamification and streak mechanics of the app create direct injury risk if not counterbalanced by health safeguards.

**CPP/CPPS as strain proxy**: Cepstral Peak Prominence (CPP) and its smoothed variant (CPPS) are the most clinically validated acoustic measures for detecting vocal fatigue and quality deterioration in real time. ([PMC10645846](https://pmc.ncbi.nlm.nih.gov/articles/PMC10645846/)) CPPS drops of >2 dB from a user's clean baseline are a reliable early indicator of vocal fatigue.

**Recommended vocal health guardrails:**

1. **Real-time CPPS monitor**: compute CPPS on every sustained note. If it drops >2 dB below the user's session-start average for 3 consecutive exercises, trigger a soft vocal rest prompt.
2. **Session length limit**: auto-prompt rest after 20 continuous minutes of phonation (not clock time — active singing time). Professional singers typically warm up for 15–20 minutes; extended sessions without rest cause micro-trauma.
3. **Hoarseness / pain stop cue**: display a prominent prompt before every session: "Voice feels rough, scratchy, or painful? Rest today — singing through strain risks injury." This prompt should be impossible to dismiss in < 2 taps (prevent habitual dismissal).
4. **Illness detection heuristic**: CPP at baseline capture significantly lower than the user's historical average → flag as possible illness; recommend rest before attempting new exercises.
5. **Vocal rest day**: frame the rest day not as "day off" (sounds like failure) but as "Recovery Day" — a positive identity consistent with athletic training.
6. **Gamification override rule**: streak protection must apply automatically on vocal rest days and illness-flagged sessions. The health system must be architecturally upstream of the streak system — not a downstream exception.

⚠️ **The most critical single rule: no gamification mechanic — streak, XP, badge, league — should ever create pressure to sing through pain or hoarseness. This must be an explicit design principle reviewed in every feature release.**

#### 2.7b Concrete Recommendations

1. **Ship with synthesized-self mode as the primary target pathway.** Delay third-party upload until legal review is complete. If shipped, require users to affirm: (a) they own the recording, (b) they have license for analysis, and (c) the app will store only the derived feature vector (not the audio).

2. **Build a biometric consent flow** as a standalone screen before first voice capture — not embedded in a general ToS. Include: what is captured (voice recording + derived vocal model), why (to build your personalized target), how long it's stored (until you delete it or close your account), and how to delete it (accessible from settings at any time).

3. **Implement a deletion cascade**: when a user requests data deletion, remove: all voice recordings, all derived feature vectors, all synthesized audio, the baseline snapshot, and any ML model fine-tuned on their data. Log the deletion with a timestamp for compliance.

4. **Do not implement YouTube/streaming audio ingestion.** It is legally indefensible for a commercial app.

5. **Label all synthesized audio with an explicit disclosure**: "AI-generated preview — not a recording of your voice" on every playback of synthesized target audio.

#### 2.7c Risks & Unknowns

- **BIPA class action risk**: Illinois BIPA has the highest per-violation statutory damages ($1,000–$5,000/violation) in U.S. biometric law and has spawned numerous class actions. A defective consent flow for 50,000 Illinois users = $50M–$250M exposure. Do not ship without counsel review.
- **EU AI Act (effective 2026)**: AI systems that create "synthetic audio of existing persons" may be classified as Limited-Risk AI requiring disclosure obligations. Monitor implementation guidance. ([Relevant EU AI Act overview](https://callsphere.ai/blog/vw2d-eu-gdpr-eprivacy-ai-voice-2026))
- **Vocal health liability**: if a user develops vocal nodules and claims the app's gamification pushed them to over-practice, the app's ToS (not liable for use) is the only shield. Health warning copy should be drafted by a healthcare attorney.

#### 2.7d Key Sources

- [waywithwords.net — Legal obligations collecting voice data](https://waywithwords.net/resource/legal-obligations-collecting-voice-data/)
- [U.S. Copyright Office — Fair Use Index](https://www.copyright.gov/fair-use/)
- [YouTube — Fair use guidance](https://support.google.com/youtube/answer/9783148)
- [callsphere.ai — EU GDPR, ePrivacy, AI voice 2026](https://callsphere.ai/blog/vw2d-eu-gdpr-eprivacy-ai-voice-2026)
- [PMC10645846 — CPP/CPPS vocal fatigue](https://pmc.ncbi.nlm.nih.gov/articles/PMC10645846/)
- [J Voice 2025 — Vocal exercise effectiveness scoping review (PMID 41058356)](https://pubmed.ncbi.nlm.nih.gov/41058356/)
- [NIDCD — Taking care of your voice](https://www.nidcd.nih.gov/health/taking-care-your-voice)

---

## 3. Competitive Teardown Matrix

| Product                  | What They Do Well                                                                                                                       | Primary Failure Mode                                                                            | What to Beat                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Singing Carrots**      | AI vocal coach with conversational feedback; adaptive daily sessions; vocal range test; 80% user improvement claim; song-range matching | No synthesized target baseline; improvement claim unverified; limited exercise science rigor    | Real synthesized-self target; honest, cited improvement framing                            |
| **Yousician (Singing)**  | Technique-focused; song catalog; fun game feel; 17-min avg session; 20M+ user platform                                                  | Singing is secondary module; shallow vocal pedagogy; no coach persona; limited song choice      | Dedicated singing-first product; genuine baseline system; AI coach with personality        |
| **Simply Sing (Smule)**  | Range-matched song selection; clean onboarding; karaoke social layer                                                                    | No progressive stretch goals; no target baseline; no structured exercise curriculum             | Goal matrix with distance-to-target; structured progression                                |
| **SingTrue**             | Ear training depth; pitch-matching exercises; high App Store ratings                                                                    | No gamification; no progression model; UI dated                                                 | Gamified skill tree on top of a solid pitch-training engine                                |
| **Vanido**               | Beautiful minimalist UX; best-in-class onboarding; micro-session design                                                                 | Stagnant; no target feature; no coaching voice                                                  | Maintain the design quality Vanido established; add AI coaching layer                      |
| **Erol Singer's Studio** | Genuine vocal pedagogy; video lessons with real technique depth                                                                         | Not adaptive; not gamified; no baseline system                                                  | Bring the pedagogy rigor into an adaptive, gamified shell                                  |
| **Smule (karaoke)**      | Social recording; pitch scoring; enormous song catalog; social motivation                                                               | Pitch scoring without pedagogical framing; no skill-building path; audio quality variable       | DTW-based feedback with coaching interpretation, not just a score                          |
| **StarMaker**            | High production value karaoke scoring; vocal effects; social features                                                                   | Vanity metrics (score) without skill mapping; heavy monetization dark patterns                  | Honest skill metrics; no pay-to-improve mechanics                                          |
| **Duolingo (language)**  | Retention engineering (streaks, XP, notifications); Birdbrain adaptive difficulty; lesson-path visual design; global scale              | Gamification misuse; hearts rate limiter; shallow learning if metrics optimized; streak anxiety | Adopt Birdbrain architecture; drop hearts/energy; add wellness override for streaks        |
| **Duolingo Music**       | Sheet music + ear training gamified; same XP/streak system; Sony licensing for songs                                                    | Does not teach singing; no voice input; no vocal coach                                          | Singing-specific: voice as input, not keyboard. The gap Duolingo Music deliberately leaves |
| **Elevate**              | Micro-skill cognitive training; clear daily session design; progress visualization                                                      | Short-form tasks do not build complex skills; no long-term trajectory visible                   | Monthly "vocal story" infographic as Elevate-style progress visualization                  |

---

## 4. Recommended End-to-End Design

### 4.1 Dual-Baseline System (Complete Spec)

#### Current-Skill Baseline (Already Built — Refinements)

The existing range-walk + sustained-hold protocol captures range, pitch accuracy, CPP, HNR, jitter, shimmer, MPT, and voice type. Recommended additions:

1. **Add a passaggio probe**: ask the user to slide slowly from a comfortable note upward until the voice "cracks or shifts" — record the shift point. This is the passaggio MIDI note.
2. **Add a formant flexibility probe** (optional, advanced): same note with "ah" (neutral) vs. "aw" (open). Delta in F1/F2 reveals resonance adaptability.
3. **Log session-start CPPS** as the reference health baseline for that session (used for intra-session fatigue monitoring).

#### Target Baseline: Synthesized-Self Mode (Primary Path — Spec)

**Configuration Flow (5–8 minutes):**

1. **Consent + framing screen** (60 seconds): "We'll use your voice to create a preview of what you could sound like with training. This is AI-generated — it's aspirational, not a guarantee." Explicit biometric consent with plain-language explanation.

2. **Extended range probe** (90 seconds): standard range walk, but extended to the user's comfortable limits + 2 semitones above and below (even weak/quiet phonation counts). Capture VRP data including upper-range fluttery notes.

3. **Passaggio probe** (45 seconds): slow glide from comfortable mid-range upward through the first register break.

4. **Breath capacity probe** (60 seconds): /s/ fricative hold (not phonation — avoids vocal strain) to measure respiratory support as a proxy for breath control capacity. Plus a sustained /a/ at comfortable pitch for MPT.

5. **Tone quality probe** (60 seconds): sustained /a/ at comfortable pitch, then soft vs. loud on same pitch, to capture dynamic range and CPP at both extremes.

6. **Target ceiling algorithm**: compute target parameters:
   - _Target high note_ = current high MIDI + ceiling gain (estimated from passaggio point, upper-range reach, MPT; typically 2–5 ST for first synthesis)
   - _Target CPP_ = 75th percentile for voice type norms
   - _Target dynamics range_ = current range × 1.3 (conservative expansion)
   - _Target vibrato_ = if current jitter indicates natural vibrato onset, model mild vibrato; else, omit

7. **Synthesis** (server-side, ~30 seconds): generate 3 audio clips (scale exercise at target high, sustained note at target high, a short phrase covering the full new range) using RVC/LHQ-SVC fine-tuned on the 3-minute configuration audio.

8. **Playback + reaction capture**: "Here is a preview of where you could be heading. This was made from your voice." After playback, ask: "How does this feel — exciting, unrealistic, or somewhere in between?" Route routing skeptics to the third-party target option; route the excited to the adaptive learning path.

#### Target Baseline: Third-Party Target Mode (Fallback/Alt)

Only available after biometric consent. User uploads or selects from a rights-cleared library. Pipeline:

1. **Ingest** → run HTDemucs fine-tuned → vocal stem
2. **Quality gates** (bleed energy, pitch continuity, CPP threshold) → pass/warn/reject
3. **Profile extraction** (range, tessitura, vibrato, dynamics, CPP) using only high-robustness features
4. **Studio normalization** (flag compression/pitch correction; warn user)
5. **Store feature vector only** (not audio) → ephemeral stem deletion

### 4.2 Roadmap Engine

```
INPUTS: current_baseline, target_baseline, session_history

DISTANCE = {
  pitch_accuracy: target.pitch_acc - current.pitch_acc,
  range_high: target.high_midi - current.high_midi,
  range_low: current.low_midi - target.low_midi,
  cpps: target.cpps - current.cpps,
  mpt: target.mpt - current.mpt,
  dynamics: target.dyn_range - current.dyn_range,
  vibrato: target.vibrato_onset (bool)
}

PRIORITY_ORDER = [mpt, pitch_accuracy, cpps, range_high, range_low, dynamics, vibrato]
# (breath → accuracy → tone → range → dynamics → style)

EXERCISE_MAP = {
  mpt: [Breathing Foundation, SOVT],
  pitch_accuracy: [Reference Tone Match, Scale Walk],
  cpps: [SOVT, Sustained Hold],
  range_high: [Passaggio Navigation, Range Extension, Octave Jump],
  range_low: [Scale Walk (descending), Interval Training],
  dynamics: [Dynamic Control, Phrase Hold],
  vibrato: [Vibrato Introduction, Style-Specific Phrases]
}

SESSION = generate_session(top_2_priority_dimensions, BKT.per_skill_mastery,
                           challenge_point.difficulty,
                           spaced_review.due_exercises)
```

**Session structure**: 3–4 exercises per session. Always open with a warm-up (SOVT or Breathing Foundation, low difficulty). Close with a song-based exercise using the karaoke comparison engine on a recommended-key song. Mid-session exercises are the primary target exercises from the PRIORITY_ORDER.

**Re-planning triggers**: (a) 14 days with no metric improvement → swap exercise pathway; (b) new baseline capture at day 30/60/90 → recompute full distance; (c) CPP health flag → remove all range-extension exercises until CPP recovers.

### 4.3 Gamification Stack (Improved Duolingo Model)

| Layer               | Mechanic                                                          | Design Principle                 |
| ------------------- | ----------------------------------------------------------------- | -------------------------------- |
| Daily habit         | Practice streak (≥ 3 exercises launched)                          | Threshold is effort, not quality |
| Streak protection   | Auto-granted on flagged vocal rest / illness days                 | Health system is upstream        |
| Progress metric     | Semitones-to-target, seconds-to-MPT-target, CPPS delta            | Honest, real-world               |
| XP                  | Awarded for sessions attempted and milestones hit                 | Effort + achievement, not vanity |
| Skill tree          | DAG of vocal capacities; unlock with measurable performance gates | No fake mastery                  |
| Badges              | Three tiers: milestone, process, surprise (hidden)                | Variable + meaningful            |
| Cosmetic unlocks    | Avatar appearance, woofer cone palette, audio effects             | Decouple from functional access  |
| Monthly vocal story | Infographic of real progress data                                 | Makes invisible progress visible |
| No leagues          | Personal-best comparison only                                     | Singing is personal              |
| No hearts/energy    | No penalty for honest attempts                                    | Health and safety                |

### 4.4 Avatar Interaction Design (Woofer Concept — Action Spec)

**Visual**: SVG woofer cone, 120–160px diameter, centered on screen. Cone has 4 concentric rings (like a real speaker). In IDLE: slow breathing pulse (0.25 Hz, ±5% radius). In LISTENING: active micro-oscillations (reactive to microphone input amplitude). In COACHING: oscillations driven by TTS audio waveform (60fps, Gaussian-smoothed, ±20% radius). In ANALYZING: spinning elliptical pattern (processing indicator, not audio-reactive). In CELEBRATING: fast multi-ring pulse outward, warm color shift.

**Color palette**: default warm mid-gray (#8B7355 tonal reference); transitions to amber during COACHING (#D4813A), green during CELEBRATING (#5A9A6F), cool blue during ANALYZING (#4A7FA5). Colors should feel like a warm, high-quality analog device — not digital neon.

**Haptic schedule**: COACHING_START (single subtle tap), PITCH_MATCH (gentle bloom 100ms), BREATH_CUE (rhythmic pulse at breathing tempo), SESSION_COMPLETE (distinct celebration pattern), VOCAL_WARNING (two short distinct taps).

**Persona voice rules**: warm, mid-register TTS; speaking rate 140–160 WPM (slightly slower than conversational English average of 180 WPM, to match coaching deliberateness); never more than 2 sentences per coaching prompt; always use second-person ownership ("Your upper register..." not "The voice...").

**State machine additions**: add VOCAL_REST state (coach dims to 30% opacity, animation slows to breathing pulse only, no speech, screen text says "Your turn — I'm listening"). Transition to VOCAL_REST on voice activity detection; remain for duration of singing attempt; transition to ANALYZING on silence.

---

## 5. Risk Register

| Risk                                                                     | Category             | Severity  | Likelihood                | Mitigation                                                                                                                 |
| ------------------------------------------------------------------------ | -------------------- | --------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Synthesis over-promises ceiling; user churns when reality falls short    | Trust / Motivational | High      | Medium                    | Explicit simulation framing; conservative ceiling estimates; monthly re-synthesis updates                                  |
| Gamification induces singing through vocal strain                        | Vocal Health         | High      | Medium                    | CPP fatigue monitor upstream of streak system; vocal rest days protected automatically                                     |
| BIPA/biometric consent defect → class action                             | Legal                | Very High | Medium (if not addressed) | Privacy lawyer review before launch; standalone explicit consent screen; full deletion cascade                             |
| Copyright exposure from third-party audio ingestion                      | Legal                | High      | High (if shipped naively) | Do not ship YouTube/streaming ingestion; third-party upload with explicit user affirmation only; store feature vector only |
| Synthesis audio used to impersonate user                                 | Privacy / Trust      | Medium    | Low                       | Synthesized audio stored ephemerally; only played back to authenticated user; watermark embedded                           |
| SVC model artifacts degrade at range extremes                            | Technical            | Medium    | High                      | Limit synthesis target to ≤5 ST above current range; flag audible artifacts to user with disclosure                        |
| RVC/Seed-VC community repos archived; no support                         | Technical            | Medium    | High (already occurred)   | Fork and maintain; or license commercial SVC API; budget for ongoing maintenance                                           |
| User treats synthesized voice preview as medical/professional assessment | Trust / Legal        | Medium    | Medium                    | Explicit disclaimers; never use clinical language in synthesis framing                                                     |
| Gamification misuse: XP farming, streak anxiety                          | Motivational         | Medium    | Medium                    | Practice streak (not perfect-session streak); no hearts/energy; no league mechanics                                        |
| Cold-start demotivation (skill tree empty, 0% progress)                  | Motivational         | Medium    | High                      | Engineered early wins in first 3 sessions; first badge awarded within 10 minutes                                           |
| Coach gives vocal health advice beyond its scope                         | Legal / Health       | High      | Low                       | Hard blocklist of clinical diagnosis language; always-refer-to-SLP rule for persistent symptoms                            |
| EU AI Act synthetic voice disclosure obligation                          | Legal                | Medium    | Medium (emerging)         | Label all synthesized audio; monitor EU AI Act implementation guidance 2026                                                |
| Vocal nodules or injury from over-practice                               | Vocal Health         | High      | Low (with guardrails)     | 20-min active phonation limit; CPP monitoring; illness detection; attorney-reviewed health warnings                        |
| Stem separation quality failure on user-uploaded audio                   | Technical            | Medium    | High                      | Mandatory quality gates; warn/reject flow; user expectation-setting                                                        |
| Persona inconsistency erodes coach trust over time                       | Trust                | Medium    | Medium                    | Templated response library with variation; persona guidelines in LLM prompt; quarterly tone audit                          |

---

## 6. Open Questions That Genuinely Need User Testing

1. **Does hearing a synthesized preview of "your future voice" increase motivation or create a gap that feels discouraging?** This is the central behavioral hypothesis of the synthesized-self feature. Cannot be answered without a controlled A/B test: synthesized-self target vs. no target vs. third-party reference.

2. **What synthesis quality threshold is "good enough" to motivate vs. "too obviously artificial" to trust?** The current generation of singing SVC at extended range has audible artifacts. User perception of quality depends heavily on musical background. Minimum MOS threshold for motivational effect needs empirical testing.

3. **What is the right session length and frequency for adult amateur singers?** Motor learning literature suggests 3–5 sessions/week × 15–20 minutes active phonation. Whether this is acceptable to app users (vs. the Duolingo 5-min/day model) needs testing.

4. **Does the "one correction at a time" coaching philosophy improve outcomes vs. comprehensive feedback?** The SDT coaching philosophy is well-grounded theoretically, but singing-specific controlled evidence is sparse. Warrants an A/B test within the app.

5. **How do users respond to the CPP vocal fatigue prompt?** Will users dismiss it routinely, or will they internalize it as a safety system? Testing compliance rates vs. dismissal rates will calibrate whether the prompt needs more friction.

6. **What is the right passageway navigation exercise sequencing for untrained singers going through register break for the first time?** The existing exercise library includes Passaggio Navigation but untrained singers' first contact with the passaggio is often disorienting. Qualitative user sessions needed.

7. **Does the woofer-cone avatar feel warm enough to sustain a coaching relationship, or does it feel too abstract/impersonal?** A/B test: woofer-cone vs. simple waveform vs. Siri-style orb. Measure trust ratings and session completion.

8. **Does "Recovery Day" framing (vs. "Rest Day") measurably reduce streak-break anxiety?** Small copy test; high impact if successful.

9. **At what cadence should the re-synthesized target be updated?** Monthly feels right theoretically, but users may need it sooner to maintain motivational relevance in the first 30-day retention window.

10. **Do users in different singing sub-persona segments (bathroom singer vs. aspiring performer) respond differently to the same gamification mechanics?** Segmented A/B testing on XP vs. progress-metric primary motivation would inform whether persona-specific gamification tracks are warranted.

---

## 7. Annotated Sources

All sources cited inline throughout. Key sources organized by area:

### Voice Synthesis & Technology

- [LHQ-SVC: Lightweight High Quality Singing Voice Conversion (arXiv 2409.08583, ICASSP 2025)](https://arxiv.org/abs/2409.08583) — CPU-compatible SVC; most viable for near-device inference
- [Self-Supervised Representations for SVC (arXiv 2303.12197)](https://arxiv.org/abs/2303.12197) — HuBERT/Wav2Vec2 approach; methodological foundation for RVC
- [Synthetic Singers: Deep-Learning SVS Survey (arXiv 2601.13910, 2025)](https://arxiv.org/html/2601.13910v1) — comprehensive landscape map of singing synthesis
- [Seed-VC: Zero-Shot Voice Conversion (GitHub, archived Nov 2025)](https://github.com/Plachtaa/seed-vc) — real-time VC with 300ms latency
- [RVC Project (GitHub)](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) — most widely deployed community SVC system
- [RVC annotated technical breakdown (gudgud96 blog)](https://gudgud96.github.io/2024/09/26/annotated-rvc/) — best technical explanation of RVC internals
- [On-device TTS cost analysis — Software Mansion, Apr 2026](https://swmansion.com/blog/on-device-ai-beats-cloud-for-tts-heres-why/) — Kokoro on-device vs. cloud cost comparison
- [Voice AI latency guide (switchboard.audio)](https://switchboard.audio/hub/voice-ai-latency/) — 200–300ms response start threshold for conversational feel

### Vocal Pedagogy & Science

- [Voice Range Profiles of Singing Students (Folia Phoniatr 2016, PMID 27584050)](https://pubmed.ncbi.nlm.nih.gov/27584050/) — training duration effects on VRP; Year 1 vs. Year 5 comparison
- [Does VFE Enhance Voice Range? (JSLHR 2020)](https://pubs.asha.org/doi/10.1044/2020_JSLHR-19-00362) — RCT showing VFE expanded VRP area in 10 weeks; upper/middle frequency gains
- [Effectiveness of Vocal Exercises Scoping Review (J Voice 2025, PMID 41058356)](https://pubmed.ncbi.nlm.nih.gov/41058356/) — 20-study scoping review; SOVT, VFE, structured warm-ups; improved jitter, shimmer, resonance
- [Average Singing Frequencies by Voice Type (voicescience.org)](https://www.voicescience.org/lexicon/average-singing-frequencies/) — normative VRP data across voice types and development
- [Formant Range Profile for Singers (J Voice 2017, PMID 28029556)](https://pubmed.ncbi.nlm.nih.gov/28029556/) — F1/F2 vowel space as trainability metric
- [Quantifying Vocal Tessitura (PMC8786980, J Voice 2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8786980/) — real-time tessitura measurement method
- [Vocal Instabilities in Untrained Female Singers (PMC12230185, J Voice 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12230185/) — register shift patterns in untrained voices
- [CPP/CPPS and Vocal Fatigue (PMC10645846)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10645846/) — cepstral analysis as vocal fatigue biomarker
- [Pitch Correction Timbral Effects (Mårtensson, Luleå University 2022)](https://www.diva-portal.org/smash/get/diva2:1660360/FULLTEXT01.pdf) — statistically significant timbral artifact from Auto-Tune

### Motor Learning & Learning Science

- [Feedforward Self-Modeling (Ste-Marie et al., Frontiers in Psychology 2011, PMC3133863)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3133863/) — FSM accelerates motor skill acquisition vs. control
- [Augmented Feedback: More is Better for Novel Patterns (PMC4893479)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4893479/) — concurrent AF beneficial early; guidance hypothesis applies to practiced skills
- [Role of Augmented Feedback in Motor Learning (PMC8681883)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8681883/) — systematic review; visual AF cornerstone; auditory AF effective for learned patterns
- [Spaced/Interleaved Practice review (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11981649/) — interleaved > blocked for retention and transfer
- [BKT Adaptive Learning (arXiv/SCITEPRESS 2026)](https://www.scitepress.org/Papers/2026/150538/150538.pdf) — Bayesian knowledge tracing for adaptive curriculum
- [ZPD and AI guidance (Ferguson et al. 2022)](https://dspace.library.uu.nl/bitstream/handle/1874/432394/Ferguson_etal2022-ArtificialIntelligence.pdf) — maintaining optimal zone of proximal development with AI

### Gamification & Motivation

- [When Gamification Spoils Learning (Mogavi et al., L@S 2022)](https://ar5iv.labs.arxiv.org/html/2203.16175) — qualitative study; three misuse patterns in Duolingo
- [Gamification for Health/Well-Being (PMC11353921)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11353921/) — evidence review; progress bars positive; leaderboards inconsistent; narrative effective
- [SDT and Musical Participation (PMC6407371, Frontiers 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6407371/) — competence + relatedness need satisfaction predicts singing well-being
- [SDT Theory Overview](https://selfdeterminationtheory.org/theory/) — foundational framework
- [Duolingo Birdbrain adaptive model blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/) — IRT-based per-learner difficulty; A/B tested at scale
- [Duolingo gamification design (Blake Crosley)](https://blakecrosley.com/guides/design/duolingo) — retention-first design philosophy analysis
- [Duolingo Music (fandom wiki)](https://duolingo.fandom.com/wiki/Duolingo_Music) — feature scope: ear training, not singing

### Competitive Apps

- [American Songwriter — Best Singing Apps 2026](https://americansongwriter.com/best-singing-apps/) — practitioner review of app landscape
- [Singing Carrots Blog — Best learn-to-sing apps 2026](https://blog.singingcarrots.com/best-learn-to-sing-apps-2026/) — competitive overview from incumbent
- [bloomvocal.site — Yousician review 2026](https://www.bloomvocal.site/en/blog/yousician-review-2026) — deep product teardown; funding/user data

### Stem Separation

- [HTDemucs (facebookresearch/demucs GitHub)](https://github.com/facebookresearch/demucs) — SDR ~9.0 dB; archived Jan 2025
- [HTDemucs paper (arXiv 2305.07489)](http://arxiv.org/pdf/2305.07489.pdf) — technical specification
- [Ensemble MSS approach (arXiv 2410.20773)](https://arxiv.org/abs/2410.20773) — harmonic-mean SDR ensemble; 2024 SOTA

### Avatar & Interaction

- [Uncanny valley and trust in AI avatars (arXiv 2505.05543)](https://arxiv.org/pdf/2505.05543) — uncanny agents reduce trust and advice-following
- [Trust in conversational agents (CEUR-WS IUI21)](https://ceur-ws.org/Vol-2903/IUI21WS-CUIIUI-4.PDF) — trust-building factors in AI coaches
- [Voice agent conversational design (Decagon, 2026)](https://decagon.ai/blog/beyond-latency-the-art-of-building-a-truly-great-voice-agent/) — five principles for great voice agents
- [Haptic feedback in mobile learning (end-educationconference.org 2024)](https://end-educationconference.org/wp-content/uploads/2024/07/202402OP041.pdf) — evidence base for haptic effectiveness

### Legal & Privacy

- [Collecting voice data: legal obligations (waywithwords.net)](https://waywithwords.net/resource/legal-obligations-collecting-voice-data/) — GDPR, POPIA, CCPA overview for voice data
- [U.S. Copyright Office Fair Use Index](https://www.copyright.gov/fair-use/) — primary source
- [YouTube Fair Use guidance](https://support.google.com/youtube/answer/9783148) — YouTube's own position on downloading
- [EU GDPR and ePrivacy for AI voice 2026 (callsphere.ai)](https://callsphere.ai/blog/vw2d-eu-gdpr-eprivacy-ai-voice-2026) — 2026 regulatory landscape

---

_This document was researched and compiled June 27, 2026. All technical specifications for SVC/SVS systems reflect published state as of that date. Legal analysis is for informational purposes only; consult qualified legal counsel before shipping any feature that captures, synthesizes, or stores user voice data. Vocal health guidance reflects published clinical guidelines; this document does not constitute medical advice._

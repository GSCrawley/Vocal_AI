# VOICE — Adaptive Difficulty Model: Open-Source Options and Integration Plan

**Date:** June 30, 2026
**Context:** The VOICE coaching engine currently uses a hand-coded rule system (5 difficulty levels, streak-based advance/regress signals) that directly parallels what Duolingo's Birdbrain replaced in its early years. This document answers: what open-source foundations exist, which fits VOICE's specific data shape, and exactly what integration work is required to build a proprietary system on top of one.

---

## Executive Summary

Duolingo's Birdbrain is, under the hood, a form of **Multidimensional Item Response Theory (MIRT)** — a probabilistic model that simultaneously estimates a per-learner ability vector and per-item difficulty/discrimination parameters, then predicts the probability the learner succeeds on any given exercise. The key differentiators from a rule system are: (1) it calibrates item difficulty empirically from real attempt data rather than assigning it by hand; (2) it produces a continuous probability estimate rather than a categorical advance/hold/regress signal; and (3) it personalizes per learner from day one using population priors that get refined with each attempt.

The good news: you do not need Duolingo's engineering budget to build this. Several mature, production-ready open-source libraries implement exactly these algorithms. The right choice for VOICE is **pyBKT** in the near term with a migration path to **a lightweight MIRT model** once the dataset is large enough — augmented by a custom **continuous-score adapter** because VOICE's metrics are 0–100 continuous values, not binary pass/fail.

**The three-layer architecture this document recommends:**

1. **pyBKT** — Bayesian Knowledge Tracing per skill per user, handling the "does this user currently know this skill" state estimate. Near-zero cold-start problem, interpretable parameters, runs in milliseconds. Start here.
2. **Custom continuous-score bridge** — a lightweight normalization layer that converts VOICE's 0–100 metric scores into the binary-like observations pyBKT (and eventually MIRT) expects. This is VOICE-proprietary and is the primary novel engineering contribution.
3. **Item (exercise) difficulty calibration** — using attempt logs to empirically derive each exercise's difficulty and discrimination parameters, replacing the hand-assigned 1–5 difficulty levels with data-driven estimates.

---

## Part 1: What Duolingo's Birdbrain Actually Is

### The Birdbrain Model

Duolingo's [Birdbrain blog post](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/) describes it as a machine learning model that simultaneously estimates:

- **How much a learner knows** (ability)
- **How difficult each exercise is** for that specific learner

The [Duolingo research paper trail](https://research.duolingo.com/papers/settles.tacl20.pdf) confirms the underlying formalism is IRT — specifically the **Rasch model** (1PL IRT) for their English proficiency test, and an **MIRT / collaborative filtering hybrid** for their adaptive learning system. The [machine learning–driven language assessment paper](https://research.duolingo.com/papers/settles.tacl20.pdf) states explicitly: "We use a simple logistic IRF, also known as the Rasch model."

For the adaptive app (not the proficiency test), Duolingo extends this with:

- **Half-Life Regression (HLR)** — an open-source spaced repetition model ([github.com/duolingo/halflife-regression](https://github.com/duolingo/halflife-regression)) that estimates the "half-life" of a learned item in memory, not just whether it was known
- **Session Generator** — a curriculum sequencing layer on top of Birdbrain that uses the probability estimates to select exercises at the right difficulty for the current session

### What makes Birdbrain more than rules

A rule system says: "2 consecutive good → advance." Birdbrain says: "Given that this learner has probability 0.73 of knowing `pitch accuracy` and this exercise has difficulty parameter 0.81, the predicted success probability is 0.61 — which is in the target zone (0.55–0.75), so assign this exercise."

The rule system has no concept of exercise difficulty calibration — every difficulty-1 exercise is assumed equally hard. Birdbrain calibrates each exercise independently using population data.

### What Birdbrain does NOT do that is relevant to VOICE

Duolingo operates on **binary responses** — you either got the word right or you didn't. VOICE operates on **continuous metric scores** (0–100). This is the fundamental mismatch, and it is the primary engineering problem in adapting any of these frameworks to VOICE. It is solvable, but it requires custom work regardless of which library is chosen.

---

## Part 2: The Open-Source Landscape

### Candidate Frameworks Evaluated

Five classes of open-source system are relevant:

| Framework                                            | Type                       | Language | Binary/Continuous        | Active          | VOICE Fit                                   |
| ---------------------------------------------------- | -------------------------- | -------- | ------------------------ | --------------- | ------------------------------------------- |
| [pyBKT](https://github.com/CAHLR/pyBKT)              | Bayesian Knowledge Tracing | Python   | Binary (with extensions) | Yes             | **Best for Phase 1**                        |
| [py-irt](https://github.com/nd-ball/py-irt)          | Bayesian IRT (1PL/2PL/4PL) | Python   | Binary                   | Yes             | Good for item calibration                   |
| [irtorch](https://github.com/joakimwallmark/irtorch) | IRT with PyTorch/GPU       | Python   | Binary/Polytomous        | Yes             | Good for item calibration                   |
| [mirt (Python)](https://pypi.org/project/mirt/)      | MIRT with Rust backend     | Python   | Binary/Polytomous        | Yes             | **Best for Phase 2**                        |
| [pyKT](https://github.com/pykt-team/pykt-toolkit)    | Deep Learning KT           | Python   | Binary                   | Active research | Overkill for Phase 1; relevant for Phase 2+ |
| Duolingo HLR                                         | Spaced repetition          | Python   | Binary                   | Archived (2016) | Not directly applicable                     |
| Elo/Glicko/TrueSkill                                 | Rating systems             | Many     | Continuous               | Very active     | Simple fallback option                      |

---

### Framework 1: pyBKT (Recommended — Phase 1)

**What it is:** Python implementation of Bayesian Knowledge Tracing from UC Berkeley's CAHLR lab. BKT is a Hidden Markov Model with four parameters per skill:

- `prior` — probability the learner already knows the skill at the start
- `learn` — probability of transitioning from "not known" to "known" after a practice opportunity
- `slip` — probability of answering incorrectly despite knowing the skill
- `guess` — probability of answering correctly despite not knowing the skill

**Why it fits VOICE:**

- The "skill" maps directly to a `SingingMetricKey` — pitch accuracy, stability, breath control, etc.
- The "practice opportunity" maps to a single exercise attempt
- The `prior` parameter can be initialized from the baseline snapshot (not a cold start)
- `multilearn` variant allows per-resource (per-exercise-type) learn rates — some exercises improve pitch faster than others
- `forgets` variant adds forgetting probability — relevant because vocal skills can regress with disuse
- Python package, pip-installable, runs on CPU, fits within the existing audio processor Python service

**Key limitation:** Expects binary correctness. A pitch accuracy score of 73 is not a 1 or a 0. This requires the continuous-score bridge described in Part 3.

**Maturity:** Production-ready. Used in research at Berkeley, CMU, MIT. Active maintenance. C++ accelerated inference available.

**License:** MIT

---

### Framework 2: mirt (Python, Rust backend) (Recommended — Phase 2)

**What it is:** [Multidimensional IRT for Python](https://pypi.org/project/mirt/) with a high-performance Rust backend, inspired by R's mirt package. Models multiple latent dimensions of ability simultaneously — appropriate once you have enough data to calibrate across multiple metrics jointly.

**Why it fits VOICE (eventually):**

- VOICE has 11 metric dimensions. MIRT can model a learner as a vector in 11-dimensional ability space, not just a scalar
- MIRT separates item discrimination from item difficulty — an exercise might strongly discriminate on pitch accuracy but weakly discriminate on breath control
- The MIRT ability vector can be updated after each attempt, making it a real-time personalizer

**Key limitation:** Requires significantly more data to calibrate reliably. Cold-start problem is much more severe than BKT. Should not be used until each exercise has been attempted at least 50–100 times by the user base.

**License:** MIT

---

### Framework 3: py-irt / irtorch (Item Calibration Tool)

Neither py-irt nor irtorch is a real-time learner model — they are **offline calibration tools** that estimate exercise difficulty and discrimination parameters from historical attempt logs. They are the tool used to replace VOICE's hand-assigned difficulty levels (1–5) with empirically derived parameters.

**How they fit into the architecture:**

- Run nightly or weekly on the `coaching_history` table
- Output: per-exercise `difficulty` (β) and `discrimination` (α) parameters
- These parameters replace the `SUSTAINED_HOLD_DIFFICULTY_PARAMS` table's hand-tuned values

**py-irt** ([arxiv](https://arxiv.org/abs/2203.01282)): Bayesian 1PL/2PL/4PL models in Pyro/PyTorch. Best for continuous or polytomous data extensions. MIT license.

**irtorch** ([GitHub](https://github.com/joakimwallmark/irtorch)): PyTorch-based, GPU support, polytomous models. Good choice once VOICE has enough attempts to calibrate at scale.

---

### Framework 4: pyKT (Deep Learning KT — Future Option)

pyKT implements Deep Knowledge Tracing (DKT), DKVMN, SAKT, AKT, GIKT, and other attention-based deep learning knowledge tracing models. The [SingPAD paper](https://files.eric.ed.gov/fulltext/ED675668.pdf) — the only published knowledge tracing study on singing data — evaluated all six on music performance data. Results:

| Model    | AUC       | ACC       |
| -------- | --------- | --------- |
| BKT      | 0.687     | 0.747     |
| DKT      | 0.833     | 0.809     |
| SAKT     | 0.840     | 0.820     |
| **GIKT** | **0.848** | **0.825** |

DKT and attention-based models outperform BKT significantly on singing data. This makes pyKT the right long-term answer — but only once VOICE has accumulated enough attempt data to train the models. A deep learning KT model trained on 1,000 users and 50,000 attempts will be catastrophically overfit. The SingPAD dataset had ~1 million exercises from ~1,000 students before these results were reliable.

**Recommendation:** File this away as a Phase 3 target. Build the architecture so the deep KT model is a drop-in replacement for the pyBKT model when the data is ready.

---

### Framework 5: Elo / Glicko / TrueSkill (Simplest Option, Lowest Ceiling)

Elo-based systems treat each exercise attempt as a "match" between the learner (player) and the exercise (opponent). If the learner beats the exercise, their rating goes up; if not, it goes down. The exercise's difficulty rating is updated inversely.

**Advantage:** Trivially simple to implement, no binary conversion needed (Elo works on continuous scores directly), the K-factor handles adaptation speed, and item difficulty auto-calibrates from play data.

**Disadvantage:** Elo is unidimensional — it tracks one global skill rating, not per-metric ability. It has no forgetting model, no prior probability, no discrimination parameter, and no way to model "this user is good at pitch but weak at breath control." A multidimensional Elo (one rating per metric) is possible but requires careful design to avoid ratings drifting independently without accounting for correlations.

**Verdict:** Elo is a reasonable fallback if the team finds pyBKT integration harder than expected. It would represent a modest improvement over the current rule system and could be implemented in a weekend. But it has a much lower ceiling than IRT/BKT for a multi-metric system like VOICE.

---

## Part 3: The Continuous-Score Bridge (VOICE-Specific)

This is the most important piece of custom engineering and the primary way VOICE's system becomes proprietary. Every framework above assumes binary (correct/incorrect) responses. VOICE produces 0–100 scores. The bridge converts them.

### Why this matters

A user who scores 78 on pitch accuracy has not "failed" (binary 0) — they are partially correct. If you threshold at 60: they pass. But a user who scores 61 is treated identically to a user who scores 95. The model loses information. More importantly, it loses the fine-grained progress signal that is the entire point of measuring continuous metrics.

### Three bridge strategies

**Strategy A — Hard threshold (simplest)**

Define a pass threshold per metric (e.g., 65 = pass for pitch accuracy) and feed binary observations into pyBKT. Loses information but is immediately implementable and does not require research.

```python
def score_to_binary(score: float, threshold: float = 65.0) -> int:
    return 1 if score >= threshold else 0
```

This is the minimum viable bridge. Use it in Phase 1 while building the better version.

**Strategy B — Soft binary with success band (recommended)**

Map the continuous score to a weighted pseudo-probability using the existing `SuccessBand` structure. This preserves more information while remaining compatible with pyBKT's EM fitting algorithm.

The existing `SuccessBand` definition:

| Band         | Score range | Pseudo-probability |
| ------------ | ----------- | ------------------ |
| `excellent`  | ≥ 90        | 1.0                |
| `good`       | 75–89       | 0.85               |
| `developing` | 55–74       | 0.5                |
| `retry`      | < 55        | 0.0                |

Feed the `pseudo_probability` as a fractional correctness value. pyBKT's `multigs` variant supports this directly via weighted observations.

**Strategy C — Graded response model (long-term)**

Use `irtorch`'s polytomous IRT (graded response model) to treat the score as an ordinal variable with 4 categories (the 4 success bands). This is theoretically the most correct approach for vocal performance data, where "78" means something meaningfully different from "61." The [Journal of Intelligence paper on Duolingo's continuous IRT models](https://pmc.ncbi.nlm.nih.gov/articles/PMC10970766/) validates the approach for bounded continuous educational responses — their findings show a Beta IRT model provides the best out-of-sample predictive accuracy for scores in the 0–1 range.

For Phase 2, implement a `BetaIRT` normalization: scale each metric score to [0, 1] and treat it as a Beta-distributed observation. `py-irt` supports this via custom model extension.

### Per-metric threshold calibration

A key insight: the "pass threshold" should not be the same for every metric. Pitch accuracy at 65 is a reasonable basic target. Vibrato at 65 would be excellent for a beginner. The thresholds must be metric-specific and ideally user-tier-specific.

Initial calibration table (to be refined with real data):

| Metric          | Beginner pass | Intermediate pass | Advanced pass |
| --------------- | ------------- | ----------------- | ------------- |
| `pitchAccuracy` | 60            | 72                | 84            |
| `stability`     | 55            | 68                | 80            |
| `breathControl` | 50            | 65                | 78            |
| `toneQuality`   | 45            | 60                | 75            |
| `onset`         | 55            | 68                | 80            |
| `vibrato`       | 40            | 60                | 78            |

These replace the hand-tuned `SUSTAINED_HOLD_DIFFICULTY_PARAMS` thresholds and are refined by the offline IRT calibration pipeline (Part 4).

---

## Part 4: Recommended Architecture

### The three-layer VOICE adaptive model

```
Attempt submitted
        │
        ▼
┌───────────────────────────────┐
│  Layer 1: Continuous Bridge   │ (VOICE-proprietary)
│  score → success_band         │
│  success_band → pseudo_prob   │
│  Per-metric threshold table   │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  Layer 2: pyBKT per-skill     │ (open-source core)
│  Update P(knows | metric)     │
│  for each measured metric     │
│  Output: mastery probability  │
│  vector [p1, p2, ..., p11]    │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  Layer 3: Exercise Selector   │ (VOICE-proprietary)
│  Target P(success) = 0.65     │
│  Match user state vector to   │
│  exercise difficulty params   │
│  from offline calibration     │
└───────────────────────────────┘
```

### Layer 2 detail: pyBKT per-metric model

Run one pyBKT model per `SingingMetricKey`. Each model tracks the user's probability of mastery of that metric:

```python
from pyBKT.models import Model

# One model per metric, initialized from baseline snapshot
models: dict[SingingMetricKey, Model] = {}

for metric in SingingMetricKey:
    model = Model(seed=42, num_fits=1)
    # Initialize prior from baseline snapshot score
    prior = baseline_score_to_prior(snapshot.metrics[metric])
    model.coef_ = {
        'prior': prior,           # From baseline: e.g., 0.3 for a 45/100 baseline score
        'learns': 0.18,           # Population prior: refined via EM after 100 users
        'forgets': 0.02,          # Low forgetting within a session; higher for next-session prior
        'guesses': 0.05,
        'slips': 0.10,
    }
    models[metric] = model
```

After each attempt, update the model for the focus metric:

```python
def update_mastery(
    user_id: str,
    metric: SingingMetricKey,
    score: float,
    exercise_id: str,
    models: dict
) -> float:
    """
    Feed a new observation into the BKT model for this metric.
    Returns updated P(mastery) for this metric.
    """
    observation = score_to_pseudo_probability(score, metric)
    mastery_prob = models[metric].roster_update(
        user_id=user_id,
        correct=observation,
        resource=exercise_id,  # multilearn: per-exercise learn rate
    )
    return mastery_prob
```

The result is a **mastery probability vector** per user per metric — a richer representation than the current binary "has this difficulty advanced or not."

### Layer 3 detail: Exercise selection using mastery probabilities

Replace the current `adaptDifficulty()` rule logic with a target-probability selector:

```python
TARGET_SUCCESS_PROB = 0.65  # The "zone of proximal development" target

def select_next_exercise(
    mastery_vector: dict[SingingMetricKey, float],
    exercise_catalog: list[ExerciseDef],
    focus_metric: SingingMetricKey,
    user_id: str
) -> ExerciseDef:
    """
    Find the exercise whose predicted success probability is
    closest to TARGET_SUCCESS_PROB for this user's current mastery.
    """
    scored = []
    for exercise in exercise_catalog:
        if exercise.primaryMetric != focus_metric:
            continue

        # Predict success probability using IRT item parameters
        predicted_p = predict_success(
            user_mastery=mastery_vector[focus_metric],
            item_difficulty=exercise.irt_difficulty,   # calibrated offline
            item_discrimination=exercise.irt_discrimination
        )

        distance_from_target = abs(predicted_p - TARGET_SUCCESS_PROB)
        scored.append((exercise, distance_from_target))

    # Return exercise closest to target difficulty
    return min(scored, key=lambda x: x[1])[0]


def predict_success(
    user_mastery: float,
    item_difficulty: float,
    item_discrimination: float = 1.0
) -> float:
    """2PL IRT item response function."""
    import math
    logit = item_discrimination * (user_mastery - item_difficulty)
    return 1 / (1 + math.exp(-logit))
```

### Backward compatibility: preserving the rule system as fallback

The current `adaptDifficulty()` rule system should be kept as a fallback for two scenarios:

1. **Cold start** — a new user's first 3–5 attempts before pyBKT has enough observations to be reliable
2. **Degraded mode** — if the adaptive model service is unavailable, the rules provide deterministic behavior

This means the adaptive model is a drop-in enhancement, not a replacement. The `DifficultyConfig` interface stays the same; the model simply produces better inputs to it.

---

## Part 5: Where the Data Lives and the Offline Calibration Pipeline

### What data the model needs

The adaptive model requires data already being collected in VOICE's existing schema:

| Data needed                     | Where it lives                  | Already collected? |
| ------------------------------- | ------------------------------- | ------------------ |
| Per-attempt metric scores       | `coaching_history.focus_score`  | ✅ Yes             |
| Exercise ID per attempt         | `coaching_history.exercise_id`  | ✅ Yes             |
| User ID per attempt             | `coaching_history.user_id`      | ✅ Yes             |
| Success band per attempt        | `coaching_history.success_band` | ✅ Yes             |
| Attempt timestamp               | `coaching_history.created_at`   | ✅ Yes             |
| Baseline snapshot scores        | `user_baseline_snapshot`        | ✅ Yes             |
| Current difficulty per exercise | `user_exercise_state`           | ✅ Yes (Task 17)   |

No new data collection infrastructure is needed. The model reads from tables that already exist.

### Offline calibration pipeline

Add a daily or weekly background job (fits in the existing `voice-data-retention-cron` service or a new cron service):

```python
# calibration_pipeline.py — runs nightly
# 1. Fetch all attempt data from coaching_history
# 2. Apply continuous bridge to convert scores to pseudo-binary
# 3. Run py-irt 2PL calibration to estimate per-exercise difficulty/discrimination
# 4. Write calibrated parameters to exercise_irt_params table
# 5. Update population-level BKT priors (learn, slip, guess) via EM

def run_calibration():
    attempts = fetch_all_attempts()  # from coaching_history

    # Convert to py-irt format
    observations = build_irt_observations(attempts)

    # Fit 2PL model
    model = IRTModel('2pl')
    model.fit(observations)

    # Write item parameters
    for exercise_id, params in model.item_params_.items():
        upsert_exercise_irt_params(
            exercise_id=exercise_id,
            difficulty=params['difficulty'],       # replaces hand-assigned 1–5 level
            discrimination=params['discrimination']
        )

    # Update population BKT priors
    updated_priors = estimate_population_priors(attempts)
    upsert_bkt_priors(updated_priors)
```

**New table required:**

```sql
CREATE TABLE exercise_irt_params (
  exercise_id           TEXT PRIMARY KEY,
  metric_key            TEXT NOT NULL,
  irt_difficulty        REAL NOT NULL DEFAULT 0.0,      -- logit scale: -3 to +3
  irt_discrimination    REAL NOT NULL DEFAULT 1.0,      -- how sharply it separates mastery levels
  calibration_n         INTEGER NOT NULL DEFAULT 0,     -- attempts used to calibrate
  calibrated_at         TIMESTAMPTZ,
  is_calibrated         BOOLEAN NOT NULL DEFAULT FALSE
);
```

Exercises with `is_calibrated = FALSE` fall back to rule-based difficulty selection until enough data accumulates.

### Cold-start handling

Every new user and every new exercise starts with no data. Solve it two ways:

**For new users:** Initialize pyBKT priors from the baseline snapshot. A baseline pitch accuracy of 55 → `prior = 0.25`; a baseline of 78 → `prior = 0.55`. This gives the model a meaningful starting point rather than a flat 0.1 prior.

```python
def baseline_score_to_prior(score: float | None) -> float:
    """Map a 0–100 baseline score to a BKT prior probability."""
    if score is None:
        return 0.1  # conservative unknown prior
    # Linear map: 0→0.05, 50→0.35, 80→0.65, 100→0.85
    return max(0.05, min(0.85, (score / 100) * 0.8 + 0.05))
```

**For new exercises (cold-start item difficulty):** Use the hand-assigned difficulty level (1–5) to initialize the IRT difficulty parameter before real data arrives:

```python
def difficulty_level_to_irt(level: int) -> float:
    """Map 1–5 difficulty level to IRT logit scale."""
    mapping = {1: -2.0, 2: -1.0, 3: 0.0, 4: 1.0, 5: 2.0}
    return mapping[level]
```

This means the hand-coded `SUSTAINED_HOLD_DIFFICULTY_PARAMS` table is not wasted — it seeds the IRT parameters that get refined over time.

---

## Part 6: Integration Roadmap

### Phase 1 — Foundation (2–4 weeks, 1 engineer)

**Goal:** pyBKT running in production, feeding mastery probabilities into the existing rule-based difficulty selector. The rules still run; the model data is collected and validated in parallel.

**Tasks:**

1. Add `exercise_irt_params` table to Supabase schema (migration)
2. Add `user_metric_mastery` table to store per-user per-metric pyBKT state:
   ```sql
   CREATE TABLE user_metric_mastery (
     user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     metric_key  TEXT NOT NULL,
     mastery_p   REAL NOT NULL DEFAULT 0.1,
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (user_id, metric_key)
   );
   ```
3. Add `pip install pyBKT` to `services/audio-processor/python/requirements.txt`
4. Create `services/audio-processor/python/app/adaptive/bkt_models.py` — singleton pyBKT model manager with one model per `SingingMetricKey`, initialization from baseline snapshot, and `update_mastery()` function
5. Call `update_mastery()` inside the existing `POST /v1/sessions/{sessionId}/attempts` handler, after the coaching result is computed
6. Write mastery probabilities to `user_metric_mastery` table
7. Add `GET /v1/users/me/mastery` endpoint returning the current mastery vector
8. **Shadow mode:** log what the model _would have_ recommended vs what the rules recommended, without acting on the model output yet. Validate that recommendations look reasonable before activating.

**Acceptance criteria:**

- `user_metric_mastery` is updated on every attempt
- Mastery probability for pitch accuracy increases over a simulated session of improving scores
- Shadow mode logs show ≥70% agreement between model recommendations and rule recommendations on test fixtures

---

### Phase 2 — Model Activates (2–3 weeks, 1 engineer)

**Goal:** Replace `adaptDifficulty()` rule logic with the model-driven `select_next_exercise()` for exercises that have IRT-calibrated parameters. Rules remain for uncalibrated exercises.

**Tasks:**

1. Create `calibration_pipeline.py` cron job (py-irt 2PL calibration on coaching_history data)
2. Schedule calibration to run nightly
3. Update `select_next_exercise()` to use IRT parameters when `is_calibrated = TRUE`, rules otherwise
4. Introduce `TARGET_SUCCESS_PROB = 0.65` as a named constant (make it configurable per goal type — aspiring performers may want 0.60 for more challenge; bathroom singers may want 0.70 for more success)
5. A/B test: route 50% of new users to model-driven selection, 50% to rule-driven. Measure 14-day retention and metric improvement rate.

**Acceptance criteria:**

- Model-driven cohort shows statistically significant improvement in 14-day metric progression vs rule cohort (or parity, with path to improvement)
- No increase in session dropout rate vs rule cohort

---

### Phase 3 — MIRT + Target Baseline Integration (4–6 weeks, 1–2 engineers)

**Goal:** Multi-dimensional IRT that models the covariance between metrics (pitch and stability are correlated; breath control and tone quality are correlated differently) and integrates the target baseline as a direction vector.

**Tasks:**

1. Migrate from per-metric scalar mastery to full MIRT ability vector using the `mirt` Python library
2. Compute `distance_to_target` as a vector in MIRT ability space — the target baseline becomes a point the user is navigating toward, and the exercise selector chooses the step most likely to move them toward it
3. Replace population-level BKT `learn` priors with deep learning KT predictions (pyKT GIKT or SAKT) as input features
4. Build the "synthesized self" target as a point in MIRT space: run baseline assessment → generate MIRT ability vector → project forward by expected vocal development gains per the vocal science research → that projected point _is_ the synthesized self target

**This is where the product becomes distinctively proprietary.** The synthesized-self target expressed as an IRT ability vector — and the adaptive path navigating toward it — is the core novel contribution. No competitor has this.

---

### Phase 4 — Deep KT (Post-Product/Market Fit)

Once VOICE has >10,000 active users and >500,000 exercise attempts: replace pyBKT with a GIKT or SAKT model from pyKT. Based on [SingPAD research](https://files.eric.ed.gov/fulltext/ED675668.pdf) on the only published singing KT dataset, GIKT achieves AUC 0.848 on music performance data — significantly better than BKT's 0.687. The architecture built in Phases 1–3 is designed to make this a model-swap, not a rewrite.

---

## Part 7: Risks and Mitigations

| Risk                                                              | Severity | Mitigation                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cold start — too few attempts to calibrate reliably**           | High     | Phase 1 seeds from baseline snapshot; hand-coded parameters as fallback; shadow mode validates before model activates                                                         |
| **Overfitting on small user base**                                | High     | Phase 1 uses pyBKT (low parameter count, interpretable, regularized by design); deep learning models deferred until data is sufficient                                        |
| **Metric scores are continuous but model expects binary**         | High     | Continuous bridge in Part 3; Strategy B (pseudo-probability) is implemented in Phase 1; Strategy C (Beta IRT) in Phase 2                                                      |
| **Model recommends exercises that don't exist in the curriculum** | Medium   | `select_next_exercise()` always has a fallback to the best available calibrated exercise; never returns null                                                                  |
| **Vocal health: model advances difficulty too aggressively**      | Critical | CPPS safety gate remains upstream of all difficulty logic; vocal health stop-cues are never overridden by the model; maximum difficulty advance rate capped at +1 per session |
| **Target-baseline distance causes the model to overshoot**        | Medium   | Target distance is one signal among many in Phase 3; progression speed is capped by the per-session difficulty advance limit                                                  |
| **pyBKT package maintenance risk**                                | Low      | MIT license; can fork if needed; the model is simple enough to re-implement if pyBKT becomes unmaintained                                                                     |
| **IRT calibration quality degrades if exercise catalog changes**  | Medium   | `is_calibrated` flag per exercise; newly added exercises go through rule-based fallback until enough data accumulates                                                         |

---

## Part 8: Summary Recommendation

| Phase       | Timeframe  | Core library     | What it replaces                | Key output                                                             |
| ----------- | ---------- | ---------------- | ------------------------------- | ---------------------------------------------------------------------- |
| **Phase 1** | Weeks 1–4  | pyBKT            | Nothing (parallel)              | Mastery probability vector per user                                    |
| **Phase 2** | Weeks 5–8  | py-irt + pyBKT   | Rule-based advance/hold/regress | Data-calibrated exercise selection                                     |
| **Phase 3** | Months 3–5 | mirt             | Per-metric scalar mastery       | Multi-dimensional ability vector; synthesized-self as IRT target point |
| **Phase 4** | Post-PMF   | pyKT (GIKT/SAKT) | pyBKT                           | Deep learning KT with ~15% AUC improvement over BKT                    |

The total engineering investment to reach Phase 2 (a genuinely Birdbrain-like system) is approximately **6–8 weeks of one engineer's time**, after which the calibration pipeline runs automatically and the model improves continuously as users generate data. The expensive part is Phase 3 (MIRT + synthesized-self integration), which is also the part that creates the most differentiation.

The approach is not to build Birdbrain from scratch — it is to assemble it from well-maintained open-source components, contribute the proprietary continuous-score bridge and the synthesized-self target integration, and let the underlying math (which Duolingo and Carnegie Mellon have validated) do the heavy lifting.

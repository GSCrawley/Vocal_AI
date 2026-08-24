Small status pill for milestone and band labels, e.g. the "🏆 Personal Best Achieved!" badge on RewardSummary.

```jsx
<Badge tone="warning">🏆 Personal Best Achieved!</Badge>
<Badge tone="success">Excellent</Badge>
```

Tones: `accent`, `success`, `warning`, `danger` — each renders as text color on a 14–20% tint of that color (matches the `hexToRgba(color, 0.1–0.2)` pattern used across Reflection/RewardSummary screens).

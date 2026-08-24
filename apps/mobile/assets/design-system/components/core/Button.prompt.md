Primary interactive control used for the app's main CTAs (Start Session, Grant Permission, Continue).

```jsx
<Button variant="primary" onClick={handleReady}>Ready</Button>
<Button variant="muted" onClick={handleTryAgain}>Try Again</Button>
```

Variants: `primary` (accent fill, main CTA), `secondary` (raised-surface fill), `muted` (outline, used for secondary actions like "Try Again"), `danger` (reserved, not yet used in-app). Sizes: `sm`, `md`, `lg`.

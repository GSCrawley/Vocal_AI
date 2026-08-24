Selectable single-choice chip for the post-session reflection prompts.

```jsx
<OptionChip selected={ans === 'Easy'} onClick={() => setAns('Easy')}>Easy</OptionChip>
```

Stack chips vertically, one group per prompt. Only one chip per group is selected at a time (radio behavior, not checkbox).

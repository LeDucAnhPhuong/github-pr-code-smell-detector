# react/inline-function-overuse

**Rule ID:** `react/inline-function-overuse`
**Default Severity:** `warning`
**Default Threshold:** 3 inline functions per JSX element
**Category:** Maintainability

## Description

Flags JSX elements that pass more inline arrow functions as props than the configured threshold.

## Why It Matters

Inline functions (`onClick={() => ...}`) are re-created on every render. When a single JSX element has many inline functions it hurts both readability and performance (every render creates new function objects, potentially causing unnecessary child re-renders).

## Configuration

```yaml
rules:
  react/inline-function-overuse:
    enabled: true
    severity: warning
    threshold: 3
    blocking: false
```

## Examples

### Valid (≤3 inline functions)

```tsx
<Button onClick={() => save()} onChange={() => setDirty(true)} />
```

### Invalid (>3 inline functions)

```tsx
<Form onSubmit={() => submit()} onChange={() => setDirty(true)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onReset={() => reset()} />
```

## Suppression

Extract handlers to named `const handleX = ...` variables before the JSX. Raise `threshold` sparingly.

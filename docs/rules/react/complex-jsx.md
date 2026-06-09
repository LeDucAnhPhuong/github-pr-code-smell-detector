# react/complex-jsx

**Rule ID:** `react/complex-jsx`
**Default Severity:** `warning`
**Default Threshold:** 5 levels of nesting
**Category:** Maintainability

## Description

Flags JSX structures whose nesting depth exceeds the configured threshold.

## Why It Matters

Deeply nested JSX is difficult to read, hard to modify, and error-prone. When JSX goes beyond 5 levels, it usually signals that intermediate sections should be extracted into their own components.

## Configuration

```yaml
rules:
  react/complex-jsx:
    enabled: true
    severity: warning
    threshold: 5
    blocking: false
```

## Examples

### Valid (≤5 levels)

```tsx
<div><section><article><p>Content</p></article></section></div>
```

### Invalid (>5 levels)

```tsx
<div><section><article><div><ul><li><span>Deep</span></li></ul></div></article></section></div>
```

## Suppression

Extract the inner structure into a named component. Raise `threshold` for complex layout components where nesting is unavoidable.

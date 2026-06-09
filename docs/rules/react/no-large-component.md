# react/no-large-component

**Rule ID:** `react/no-large-component`
**Default Severity:** `warning`
**Default Threshold:** 150 lines
**Category:** Maintainability

## Description

Flags React components that exceed a maximum line count threshold.

## Why It Matters

Large components are hard to read, test, and modify. When a component grows beyond ~150 lines it typically handles too many concerns at once. Breaking it into smaller, focused components improves readability, reusability, and testability.

## Configuration

```yaml
rules:
  react/no-large-component:
    enabled: true          # default: true
    severity: warning      # default: warning
    threshold: 150         # default: 150 (lines)
    blocking: false        # default: false
```

## Examples

### Valid (no finding)

```tsx
export function SmallCard({ title }: { title: string }) {
  return <div className="card">{title}</div>
}
```

### Invalid (triggers finding)

A component with 200+ lines of state, handlers, and JSX all in one place.

## Suppression

Set `enabled: false` or increase the threshold for large page-level components where splitting is impractical.

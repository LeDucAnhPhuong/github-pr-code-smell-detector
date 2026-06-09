# react/too-many-states

**Rule ID:** `react/too-many-states`
**Default Severity:** `warning`
**Default Threshold:** 5 useState calls
**Category:** Maintainability

## Description

Flags React components that call `useState` more times than the configured threshold.

## Why It Matters

Many `useState` calls in one component signals that the component manages complex, interrelated state that would be better handled by `useReducer` or a custom hook. This leads to hard-to-follow state transitions and makes the component harder to test.

## Configuration

```yaml
rules:
  react/too-many-states:
    enabled: true
    severity: warning
    threshold: 5
    blocking: false
```

## Examples

### Valid (≤5 useState calls)

```tsx
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  return <form>...</form>
}
```

### Invalid (>5 useState calls)

```tsx
export function Dashboard() {
  const [user, setUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [quota, setQuota] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // ... 6 states
}
```

## Suppression

Refactor with `useReducer` or extract state into custom hooks. Raise `threshold` if the component genuinely needs more state.

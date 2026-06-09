# react/mixed-responsibility

**Rule ID:** `react/mixed-responsibility`
**Default Severity:** `warning`
**Category:** Maintainability

## Description

Flags React components that mix API calls (`fetch`, `axios`) with JSX rendering in the same function body.

## Why It Matters

Mixing data-fetching and UI rendering in one component creates an untestable, hard-to-reuse unit. The component becomes tightly coupled to a specific API endpoint and can't be used with different data sources. Testing it requires mocking the network.

## Configuration

```yaml
rules:
  react/mixed-responsibility:
    enabled: true
    severity: warning
    blocking: false
```

## Examples

### Valid (pure UI)

```tsx
export function UserList({ users }: { users: User[] }) {
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### Invalid (mixed)

```tsx
export function UserList() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then(setUsers)
  }, [])
  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

## Suppression

Extract data fetching into a `useUsers()` custom hook and keep the component a pure renderer. Set `enabled: false` for page-level components where co-located fetching is intentional.

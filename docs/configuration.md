# Configuration

The analyzer reads `.github/code-smell-detector.yml` from the root of your repository.
If no file is present, documented defaults are applied.

## Full Example

```yaml
# .github/code-smell-detector.yml

# Set to true to exit with code 1 when blocking findings are present
blocking: false

# Paths to include in analysis (relative to repo root)
targetPaths:
  - app
  - pages
  - components
  - hooks
  - features
  - src

# Paths to exclude from analysis
excludePaths:
  - node_modules
  - dist
  - .next
  - out
  - build
  - coverage

# Per-rule configuration
rules:
  react/no-large-component:
    enabled: true       # set to false to disable
    severity: warning   # error | warning | info
    threshold: 150      # max lines per component
    blocking: false     # if true, exit code 1 when this rule fires

  react/too-many-props:
    enabled: true
    severity: warning
    threshold: 7        # max props per component
    blocking: false

  react/too-many-states:
    enabled: true
    severity: warning
    threshold: 5        # max useState calls per component
    blocking: false

  react/complex-jsx:
    enabled: true
    severity: warning
    threshold: 5        # max JSX nesting depth
    blocking: false

  react/inline-function-overuse:
    enabled: true
    severity: warning
    threshold: 3        # max inline arrow functions per JSX element
    blocking: false

  react/mixed-responsibility:
    enabled: true
    severity: warning
    blocking: false
```

## Fields Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `blocking` | boolean | `false` | Exit code 1 when any blocking finding is present |
| `targetPaths` | string[] | `[app, pages, components, hooks, features, src]` | Included directory globs |
| `excludePaths` | string[] | `[node_modules, dist, .next, out, build, coverage]` | Excluded paths |
| `rules.<id>.enabled` | boolean | `true` | Enable or disable a specific rule |
| `rules.<id>.severity` | string | rule default | Override severity (`error`, `warning`, `info`) |
| `rules.<id>.threshold` | number | rule default | Override numeric threshold |
| `rules.<id>.blocking` | boolean | `false` | This specific rule causes blocking exit |

## Handling Noisy Findings

1. **Raise the threshold** — if a rule fires too often, increase `threshold` to match your team's standards.
2. **Downgrade severity** — set `severity: info` for rules you want to track but not be warned about.
3. **Disable a rule** — set `enabled: false` for rules that don't apply to your project.
4. **Warning-first mode** — keep `blocking: false` (the default) so findings never block PRs.

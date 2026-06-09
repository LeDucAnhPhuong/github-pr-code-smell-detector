# Usage Guide

## GitHub Action Installation

Add the following workflow file to your repository:

```yaml
# .github/workflows/code-smell-detector.yml
name: Code Smell Detector

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Analyze PR for code smells
        uses: leducanhphuongdev/github-pr-code-smell-detector@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | yes | `${{ github.token }}` | GitHub token with `pull-requests:write` and `checks:write` |
| `config-path` | no | `.github/code-smell-detector.yml` | Path to config file |
| `blocking` | no | `false` | Fail the workflow when blocking findings are found |

### Outputs

| Output | Description |
|--------|-------------|
| `findings-count` | Total number of findings |
| `error-count` | Number of error-severity findings |
| `warning-count` | Number of warning-severity findings |

## Local CLI Usage

### Install

```bash
npm install -g github-pr-code-smell-detector
```

### Analyze changed files (compared to a base branch)

```bash
code-smell-detector analyze --repo ./my-project --base-ref main
```

### Analyze all files in a repository

```bash
code-smell-detector analyze --repo ./my-project
```

### With a custom config path

```bash
code-smell-detector analyze --repo ./my-project --config ./my-config.yml
```

### JSON output for CI pipelines

```bash
code-smell-detector analyze --repo . --format json > findings.json
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Clean run (no blocking findings) |
| `1` | Blocking findings present (only when `blocking: true`) |
| `2` | Fatal error (invalid config, repo not found, etc.) |

## Handling Noisy Findings

See the [Configuration Guide](./configuration.md) for how to:
- Raise thresholds for rules that fire too often
- Disable rules that don't apply to your project
- Downgrade severity from `warning` to `info`
- Keep `blocking: false` (the default) to never block PRs

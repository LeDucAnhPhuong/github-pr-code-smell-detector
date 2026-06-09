# react/too-many-props

**Rule ID:** `react/too-many-props`
**Default Severity:** `warning`
**Default Threshold:** 7 props
**Category:** Maintainability

## Description

Flags React components that receive more props than the configured threshold.

## Why It Matters

A component with many props is often doing too much or is overly coupled to its parent. It becomes hard to understand what each prop does, difficult to document, and painful to refactor. Grouping related props into objects or extracting sub-components reduces coupling.

## Configuration

```yaml
rules:
  react/too-many-props:
    enabled: true
    severity: warning
    threshold: 7    # max number of props before flagging
    blocking: false
```

## Examples

### Valid

```tsx
<Button label="Submit" onClick={handleSubmit} disabled={loading} />
```

### Invalid

```tsx
<DataTable data={rows} columns={cols} onSort={s} onFilter={f} onPage={p} loading={l} error={e} emptyMsg="none" />
```

## Suppression

Increase `threshold` for complex data-display components, or refactor to accept a single `config` prop object.

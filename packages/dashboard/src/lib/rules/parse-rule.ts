/**
 * Parse a custom rule's markdown (plan 03): YAML-ish frontmatter + body. The raw
 * markdown is the source of truth; we extract `title/severity/appliesTo` into
 * columns for fast filtering. Minimal hand-rolled parser (no gray-matter dep) —
 * the frontmatter shape is small and fixed.
 */

export type Severity = "error" | "warning" | "info";

export interface ParsedRule {
  title: string;
  severity: Severity;
  appliesTo: string[]; // empty = global (applies to every file)
  bodyMd: string; // full raw markdown (source of truth)
}

const SEVERITIES: Severity[] = ["error", "warning", "info"];

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseInlineList(value: string): string[] {
  // ["a", "b"]  or  [a, b]
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((x) => stripQuotes(x))
    .filter((x) => x.length > 0);
}

/**
 * Parse rule markdown. Throws Error with a user-facing message on invalid input.
 * `title` is required; `severity` defaults to "warning"; missing `appliesTo`
 * means the rule is global.
 */
export function parseRuleMarkdown(raw: string): ParsedRule {
  const text = raw.replace(/\r\n/g, "\n");
  const fm = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fm) {
    throw new Error("Rule must start with a YAML frontmatter block delimited by '---'.");
  }
  const [, frontmatter, body] = fm;

  let title = "";
  let severity: Severity = "warning";
  const appliesTo: string[] = [];

  const lines = frontmatter.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const kv = line.match(/^([A-Za-z]+):(.*)$/);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();

    if (key === "title") {
      title = stripQuotes(value);
    } else if (key === "severity") {
      const sev = stripQuotes(value).toLowerCase();
      if (!SEVERITIES.includes(sev as Severity)) {
        throw new Error(`Invalid severity "${sev}". Use one of: ${SEVERITIES.join(", ")}.`);
      }
      severity = sev as Severity;
    } else if (key === "appliesto") {
      if (value.startsWith("[")) {
        appliesTo.push(...parseInlineList(value));
      } else if (value) {
        // single value on the same line
        appliesTo.push(stripQuotes(value));
      } else {
        // following "  - item" lines
        for (let j = i + 1; j < lines.length; j++) {
          const item = lines[j].match(/^\s*-\s*(.+)$/);
          if (!item) break;
          appliesTo.push(stripQuotes(item[1]));
          i = j;
        }
      }
    }
  }

  if (!title) throw new Error("Rule frontmatter must include a non-empty 'title'.");
  if (!body.trim()) throw new Error("Rule body (markdown after frontmatter) must not be empty.");

  return { title, severity, appliesTo: appliesTo.filter(Boolean), bodyMd: raw };
}

/**
 * Minimal glob matcher for RepoRule.appliesTo (plan 03). Supports the subset we
 * need — `**` (any chars incl. `/`), `*` (any except `/`), `?` (one non-`/`).
 * Pure + dependency-free for unit testing and worker reuse.
 */

/** Convert a glob to an anchored RegExp. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // ** → any chars including '/'
        re += ".*";
        i++;
        // consume a following slash so "src/**/x" matches "src/x" too
        if (glob[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/** True when `path` matches the glob. */
export function matchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}

/** True when `path` matches any of the globs. Empty list = no match. */
export function matchesAnyGlob(path: string, globs: string[]): boolean {
  return globs.some((g) => matchesGlob(path, g));
}

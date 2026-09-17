#!/usr/bin/env node
/**
 * Fails when a Markdown file links to a relative path that does not exist.
 *
 * Documentation rots silently: a file gets renamed and every link to it keeps
 * looking fine in review. This is the one class of rot a machine can catch, so
 * it runs in CI rather than relying on a checklist.
 *
 * Deliberately dependency-free — no third-party action to keep up with.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** [text](target) — the target stops at the first whitespace or closing paren. */
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

/** ``` or ~~~, optionally indented, with an optional info string. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** `code` — spans may use several backticks as their delimiter. */
const INLINE_CODE = /(`+)(?:(?!\1)[\s\S])*\1/g;

function trackedMarkdownFiles() {
  return execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

/** External URLs, anchors and mail links are out of scope. */
function isCheckable(target) {
  return !/^(https?:|mailto:|#)/.test(target);
}

const broken = [];
let checked = 0;

for (const file of trackedMarkdownFiles()) {
  const lines = (await readFile(file, "utf8")).split("\n");
  let fence = null;

  lines.forEach((line, index) => {
    // Anything inside a fenced block is sample text, not a link. Templates in
    // docs/contrib/ai-agents/ contain literal `[file](path)` placeholders.
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;

    // Same reasoning for inline code spans.
    for (const [, target] of line.replace(INLINE_CODE, "").matchAll(LINK)) {
      if (!isCheckable(target)) continue;

      // Strip any anchor: the file is what we can verify.
      const path = target.split("#")[0];
      if (!path) continue;

      checked += 1;
      if (!existsSync(resolve(dirname(file), path))) {
        broken.push({ file, line: index + 1, target });
      }
    }
  });
}

if (broken.length > 0) {
  console.error(`\n${broken.length} broken link(s):\n`);
  for (const { file, line, target } of broken) {
    console.error(`  ${file}:${line}  ->  ${target}`);
  }
  console.error("");
  process.exit(1);
}

console.log(`All ${checked} relative links resolve.`);

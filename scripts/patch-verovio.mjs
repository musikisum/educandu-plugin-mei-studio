import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

// verovio's WASM loader (dist/verovio-module.mjs) contains an unreachable Node.js
// fallback branch (`await import("node:module")`) that is never executed in the
// browser but that esbuild still tries to resolve at bundle time because it can see
// the string literal. Rebuilding the specifier via Array#join hides it from esbuild's
// static analysis (a plain string concatenation gets constant-folded back into a
// literal and still trips the resolver) while keeping the Node.js behavior identical,
// so no bundler config changes are needed downstream. This runs as a postinstall step
// because it patches node_modules; it resolves verovio's location via Node's own module
// resolution so it also works when this package is installed as a dependency elsewhere
// and verovio ends up hoisted to a different node_modules folder.

const targetFile = createRequire(import.meta.url).resolve('verovio/wasm');
const originalSnippet = 'await import("node:module")';
const patchedSnippet = 'await import(["node","module"].join(":"))';

const content = readFileSync(targetFile, 'utf8');

if (content.includes(patchedSnippet)) {
  console.log('[patch-verovio] Already patched, skipping.');
} else if (content.includes(originalSnippet)) {
  writeFileSync(targetFile, content.replace(originalSnippet, patchedSnippet));
  console.log('[patch-verovio] Patched verovio/dist/verovio-module.mjs');
} else {
  console.warn('[patch-verovio] Expected snippet not found - verovio may have changed. Skipping patch, the build may fail.');
}

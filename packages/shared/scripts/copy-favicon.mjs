#!/usr/bin/env node
// Copies shared favicon assets into a target directory (default: ./public).
// Run from an app via: node ../../packages/shared/scripts/copy-favicon.mjs public
// Keeps packages/shared/favicon as the single source of truth — see its README.

import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(scriptDir, "../favicon");
const targetDir = resolve(process.cwd(), process.argv[2] ?? "public");

// Asset files only — skip docs that live alongside them.
const SKIP = new Set(["README.md"]);

await mkdir(targetDir, { recursive: true });

const entries = await readdir(sourceDir, { withFileTypes: true });
let copied = 0;
for (const entry of entries) {
	if (!entry.isFile() || SKIP.has(entry.name)) continue;
	await cp(join(sourceDir, entry.name), join(targetDir, entry.name));
	copied += 1;
}

console.log(`[copy-favicon] ${copied} file(s) → ${targetDir}`);

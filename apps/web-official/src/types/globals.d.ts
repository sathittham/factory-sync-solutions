// Shared ambient declarations — avoids duplicate-identifier errors across modules.
// biome-ignore lint/style/noVar: ambient global declaration requires `declare var`
declare var gtag: ((...args: unknown[]) => void) | undefined;

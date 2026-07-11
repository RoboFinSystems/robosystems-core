/// <reference types="next" />

// Ambient declarations for compiling this package standalone. Input .d.ts
// files are never emitted, so nothing here reaches dist/ or consumers.
//
// The `next` reference supplies Next's global fetch() RequestInit
// augmentation (`{ next: { revalidate } }`) that next-env.d.ts provides
// inside the consuming apps.

// hooks/use-user.ts guards dev-only console warnings with
// `typeof jest === 'undefined'`; the test-runner global does not exist in
// this standalone compilation.
declare var jest: Record<string, unknown> | undefined

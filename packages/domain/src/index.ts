/**
 * Pure types, workflow-safe. The ONLY package `packages/workflows` is allowed
 * to import (Step 9 enforces). No runtime deps, no env reads, no I/O.
 */

export type HelloInput = {
  userId: string;
  name: string;
};

export type HelloResult = {
  greeting: string;
  greetedAt: string;
};

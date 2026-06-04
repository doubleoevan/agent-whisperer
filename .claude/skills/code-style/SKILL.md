---
name: code-style
description: Variable naming and control flow style for the techstartups.ai monorepo. Use when writing or reviewing any TypeScript or JavaScript code. Covers abbreviation rules, boolean prefix conventions, brace style for control flow, and comment style.
---

### No abbreviations in variable names

Write the full word, always.

```typescript
// wrong
const res = await fetch(...)
const req = request
const err = error
if (e) { ... }

// right
const response = await fetch(...)
const request = ...
const error = ...
if (event) { ... }
```

Exceptions that are clearer than the spelled-out version: `url`, `id`, `api`, `html`, `css`, `sdk`.
Other common substitutions:

- `btn` → `button`
- `val` → `value`
- `cb` → `callback`
- `tmp` / `temp` → a descriptive name for what it actually holds

### Boolean prefix

Boolean variables and props must be prefixed with `is`, `has`, `can`, `should`, or `will`. Examples: `isPopular`, `isLoading`, `hasError`, `canSubmit`, `shouldRetry`, `willExpire`.

### Meaningful variable names

Variable names must describe what the value represents, not its position or freshness. Generic names like `existing`, `latest`, `current`, `result`, `data`, `value`, `item` are not self-documenting — a reader has to look around to figure out what's actually being held.

```typescript
// wrong
const existing = await db.findUser(id)
const latest = posts[posts.length - 1]
const result = parseFrontmatter(raw)
const data = await response.json()

// right
const existingUser = await db.findUser(id)
const latestPost = posts[posts.length - 1]
const frontmatter = parseFrontmatter(raw)
const reviewPayload = await response.json()
```

### Always use curly braces on control flow

Always use curly braces for `if` / `else` blocks — even single-line ones. Same rule for `for`, `while`, and `else`. The body always goes on its own line — never on the same line as the brace.

```typescript
// never
if (response.ok) setSubmitted(true)

// never
if (response.ok) {
  setSubmitted(true)
}

// always
if (response.ok) {
  setSubmitted(true)
}
```

### JSDoc for exported functions

Double-star `/** */` block comment above every exported function. One line only. Describe what it does, not how.

```typescript
/**
 * Validates and parses raw frontmatter against the post schema.
 */
export function validateFrontmatter(data: unknown): Frontmatter { ... }
```

### Discriminated unions

When a type has a status/kind field and other fields that only apply to certain variants, model each variant as its own union member — do not use optional fields to paper over structural differences.

```typescript
// never — error is optional but only meaningful on failure
interface Result {
  status: 'success' | 'failed'
  data?: string
  error?: unknown
}

// always — each variant carries only what it owns
type Result = { status: 'success'; data: string } | { status: 'failed'; error: unknown }
```

This applies to return types, API response shapes, and any data that has meaningfully different shapes depending on a discriminant field.

### Branded types

Use branded types to distinguish semantically different strings (or numbers) that TypeScript would otherwise treat as interchangeable.

```typescript
// define the brand
type Email = string & { readonly _brand: 'Email' }
type Slug = string & { readonly _brand: 'Slug' }

// apply at the validation boundary — Zod transform is the cleanest place
const emailSchema = z.email().transform((value) => value as Email)
const slugField = z.string().transform((value) => value as Slug)
```

Good candidates: validated email addresses, post slugs, user IDs, tokens, any string with a clear semantic identity where accidental mixing with another string would be a bug. Apply at the validation/parsing boundary so the brand flows through naturally — don't scatter casts throughout the codebase.

Poor candidates: env vars used immediately in one place, strings that are only ever used as plain strings and never compared or mixed with other string types.

### Comment style

- Comment every logical group of lines — be verbose. A reader should be able to skim comments alone and understand the full flow.
- Place the comment on the line immediately above the group it describes. Never inline at the end of a line.
- No blank line between the comment and the code it describes.
- Keep comments short and lowercase.
- JSX section comments use `{/* section name */}`.

```typescript
// parse the request body
const body: unknown = await request.json()
const result = schema.safeParse(body)

// reject invalid input
if (!result.success) {
  return Response.json({ error: 'Invalid input' }, { status: 400 })
}

// verify the shared secret
const { secret } = result.data
if (secret !== process.env.MY_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// write the record to the database
const { error } = await supabase.from('table').insert(result.data)
if (error) {
  return Response.json({ error: 'Database error' }, { status: 500 })
}

return Response.json({ success: true })
```

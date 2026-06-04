---
name: git-discipline
description: Git workflow rules for the agent-whisperer monorepo. Use whenever changes have been made to files and a commit is being considered. Covers the never-commit-or-push rule, diff review, and commit message format.
---

### Never commit or push

Do not run `git commit` or `git push` under any circumstances. The user reviews every diff in Cursor's source control panel (Cmd+Shift+G) and commits manually.

After making changes, stop and suggest a commit message in this exact shape:

```
Suggested commit message:
[type]: [description]

Ready for your review — check the diff in Cmd+Shift+G, edit if needed, then commit and push.
```

### Commit message format

```
feat: [what was added]
fix: [what was fixed]
chore: [config, deps, setup — no app logic]
refactor: [restructured without changing behaviour]
```

Examples:

```
chore: add next-themes and configure tailwind dark mode
feat: global layout with header, footer, and theme toggle
feat: landing page (HomePage) with waitlist form and pricing tiers
feat: pricing page (PricingPage) with plan builder and running total
```

### Show the diff before suggesting the message

When asked to review what was just changed, walk through each file and the key decisions first. Do not jump straight to a commit message before the explanation.

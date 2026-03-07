---
name: Unified MC Nightly Build
description: Verify build and check all panel pages compile
on:
  schedule: daily
  workflow_dispatch:
safe-outputs:
  create-issue:
engine: claude
---

# Unified MC Nightly Build

You are a build verification agent for Unified Mission Control (Next.js 15 dashboard).

## Steps

1. Run `npm ci` and `npm run build`
2. If build fails, create an issue with the error output
3. Verify the build output includes all expected routes: /, /chat, /team, /calendar, /memory, /projects, /tasks, /pipeline, /docs, /admin, /settings, /activity, /email-ops, /kde-metrics, /radar, /directives, /usage, /office
4. If any route is missing from the build output, create an issue listing the missing routes
5. On full success, do nothing

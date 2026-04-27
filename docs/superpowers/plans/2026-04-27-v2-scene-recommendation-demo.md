# V2 Scene Recommendation Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a homepage-first demo that shows scene entry cards and local-skill recommendations before the full skill library.

**Architecture:** Keep the existing app shell, sidebar, top bar, and right detail panel. Add a scene recommendation layer above the current skill library using static seed data and scene config generated in `skill dashboard v2`, then map recommended items back to real `Skill` records when possible so existing detail interactions keep working.

**Tech Stack:** React 19, TypeScript, Vite, existing local API + static JSON seed data

---

### Task 1: Bring demo data into the app repo

**Files:**
- Create: `D:\AI-Coding\skill dashboard\src\data\skill-registry.seed.json`
- Create: `D:\AI-Coding\skill dashboard\src\data\recommendation-scenes.json`

- [ ] Copy the generated seed registry from `D:\AI-Coding\skill dashboard v2\data\skill-registry.seed.json`
- [ ] Copy the generated scenes config from `D:\AI-Coding\skill dashboard v2\data\recommendation-scenes.json`
- [ ] Verify both files are readable from the app repo

### Task 2: Define demo recommendation types and mapping helpers

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\src\types.ts`
- Create: `D:\AI-Coding\skill dashboard\src\recommendation.ts`

- [ ] Add scene and seed record types
- [ ] Add helpers to normalize ids, match static seed records to real `Skill` items, and derive a recommendation result for one selected scene
- [ ] Keep matching rules simple: source path first, title fallback, tags/category support

### Task 3: Build homepage scene recommendation UI

**Files:**
- Create: `D:\AI-Coding\skill dashboard\src\components\pages\RecommendationHome.tsx`

- [ ] Implement the homepage-first hero
- [ ] Implement scene entry cards
- [ ] Implement recommendation cards with title, description, reason, source, health
- [ ] Implement a light coverage summary row
- [ ] Expose callbacks so clicking a recommended item opens the existing right panel when a real `Skill` match exists

### Task 4: Wire the recommendation layer into the existing homepage

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\src\App.tsx`

- [ ] Import static scene/seed data
- [ ] Add selected scene state with a sensible default
- [ ] Compute recommendation result from current loaded `skills`
- [ ] Render `RecommendationHome` above the existing library sections
- [ ] Preserve current search, filters, source scan cards, and skill list below the new homepage layer

### Task 5: Polish copy and visual hierarchy

**Files:**
- Modify: `D:\AI-Coding\skill dashboard\src\components\TopBar.tsx`
- Modify: `D:\AI-Coding\skill dashboard\src\index.css`
- Modify: `D:\AI-Coding\skill dashboard\src\components\pages\RecommendationHome.tsx`

- [ ] Tune homepage-first copy to match the approved v2 wording
- [ ] Make scene cards the first visual focus
- [ ] Ensure the recommendation layer fits the current dark dashboard design without fighting existing components

### Task 6: Verify and snapshot

**Files:**
- No new product files expected unless fixes are needed

- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Fix any type or build issues
- [ ] Review the homepage flow manually in the browser if needed
- [ ] Prepare a focused commit once the demo is stable

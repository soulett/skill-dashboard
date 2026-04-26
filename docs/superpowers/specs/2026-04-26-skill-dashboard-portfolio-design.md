# Skill Dashboard Portfolio Page Design

Date: 2026-04-26
Status: Draft approved in chat, written for user review

## Goal

Create a single-page HTML portfolio for `Skill Dashboard` aimed at product manager interviewers. The page should balance PM storytelling with product showcase value, so it can be used both as a portfolio artifact and as a speaking aid in interviews.

## Audience

Primary audience: product managers and interviewers evaluating product thinking.

What they need to understand quickly:

- What user problem this project solves
- Why the problem is real and worth solving
- What the Alpha version actually delivers
- How product decisions connect to system design
- What boundaries and trade-offs were chosen intentionally

## Narrative Direction

Chosen direction: conflict-first portfolio interview style.

The page should open with the tension that users already have many AI skills installed, but do not have a usable map of what they own or when to use it. That conflict should lead into the product definition, then the Alpha closed loop, then the concrete interaction and data model decisions.

This structure is preferred over a demo-first presentation because it mirrors how PM candidates are usually evaluated: problem framing first, decision quality second, implementation credibility third.

## Page Structure

### 1. Hero

Purpose:
Establish the project category, value proposition, and interview relevance within a few seconds.

Content:

- Product name: `Skill Dashboard`
- Tagline focused on making existing AI capabilities visible and usable
- One-sentence value proposition
- 3 to 4 stats grounded in the repo and project framing, such as local skills recognized, capability categories, Alpha loop stages, or supported metadata fields
- Short Alpha loop line:
  `扫描本地技能 -> 展示真实数据 -> 健康检查 -> 去完善 -> 保存 sidecar metadata`

### 2. Problem Statement

Purpose:
Show that the product starts from a real cognitive problem rather than a generic dashboard idea.

Content:

- Users have installed many skills but cannot recall or locate them
- File paths and raw markdown are not usable mental models
- Existing prompt managers store assets but do not interpret them
- The result is “能力存在，但不可调用”

Format:

- 3 or 4 pain-point cards with concise titles and descriptions

### 3. Target User and Product Insight

Purpose:
Demonstrate user clarity and sharpen the product framing.

Content:

- Core user: non-technical vibe coding enthusiasts
- Current behavior: installs many skills and prompts from tutorials
- Failure mode: either repeats work or relies on vague memory
- Product insight: users do not primarily lack more AI tools; they lack control over what they already have

Format:

- 3 persona-style cards or 1 primary persona plus 2 supporting usage contexts

### 4. Alpha Closed Loop

Purpose:
Present the product as a real workflow rather than a static concept.

Content:

- Scan local Codex skills directories
- Parse `SKILL.md` into a normalized model
- Show real data in dashboard cards
- Detect missing display information through health checks
- Fill in display metadata without touching source files
- Persist sidecar metadata for refresh-safe display

Format:

- Horizontal journey with 4 or 5 steps and pain/decision labels

### 5. Key Features

Purpose:
Translate the loop into tangible user-facing capabilities.

Content:

- Skill card dashboard with quick semantic summaries
- Search and filter by category and source
- Skill detail panel with source content preview
- Chinese display layer for English-origin skills
- Health check entry into remediation flow

Format:

- 4 or 5 feature cards with labels such as `DISCOVERY`, `STRUCTURE`, `LOCALIZATION`, `SAFE EDIT`

### 6. Product Decisions and Boundaries

Purpose:
Make PM trade-offs explicit.

Content:

- Do not edit original `SKILL.md`
- Save only sidecar metadata
- Do not execute skills or call LLMs in MVP scope
- Do not add cloud sync or multi-device collaboration
- Focus on “know what you have” before “chain workflows together”

Format:

- User story cards or decision cards with rationale

### 7. Technical Architecture

Purpose:
Show that the implementation model supports the product promise.

Content:

- Local skill files as source layer
- Parser and normalization layer
- Sidecar metadata storage layer
- Local API layer
- React/Vite application layer
- End-user interaction layer

Also include:

- Why metadata overlay is safer than source mutation
- Why merged display data supports localization and editing
- Why fallback scanning supports both real and sample datasets

Format:

- Pure HTML/CSS layered architecture diagram
- Tech stack badges for React, Vite, Express, TypeScript, metadata JSON

### 8. Outcome and Why It Matters

Purpose:
End with what the Alpha proves.

Content:

- The product moved from static demo to usable local loop
- Users can inspect real installed skills
- Chinese display information persists across refresh
- Original skill files remain untouched
- The project demonstrates product framing, scope control, and implementation alignment

## Visual Direction

Style target:

- Portfolio-interview hybrid
- Clean and product-like, not flashy
- Strong information hierarchy
- Slight editorial tone to feel intentional and memorable

Design constraints:

- Single self-contained HTML file
- Responsive on desktop and mobile
- No external images required
- Use embedded CSS and small JS for scroll reveal and nav activation

## Content Grounding Rules

- All feature claims must be grounded in project docs, README, PRD, Alpha design notes, or current repo structure
- Avoid invented metrics, user counts, or business outcomes
- If a stat is not explicitly measured, present it as a structural fact, not performance evidence
- Architecture must reflect the actual stack and file responsibilities

## Out of Scope

- Multi-page portfolio site
- Live backend integration beyond what the current project already documents
- Fabricated business impact numbers
- Rewriting the product story for external marketing audiences

## Deliverable

One standalone HTML file stored in the project, suitable for opening locally and reusing as a PM portfolio case-study page.

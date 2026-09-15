---
name: flagforge-svg
description: Canonical SVG and iconography language for FlagForge. Use for brand marks, navigation, categories, states, rank, first blood, diagrams, and technical decoration.
---

# FlagForge SVG System

SVG is a core part of FlagForge's visual identity.

## Core rule
Important symbols must look like members of one designed family.

Do not use:
- emoji
- arbitrary Unicode symbols
- unrelated icon packs
- random stock vectors

## Visual grammar
Define and preserve:
- viewBox conventions
- optical weight
- stroke/fill logic
- corner treatment
- negative space
- size hierarchy
- active/inactive behavior

Prefer simple, memorable geometry over detailed illustrations.

## Families
Maintain coherent families for:
- logo/brand
- navigation
- challenge categories
- difficulty/state
- solved/unsolved
- locked
- first blood
- leaderboard ranks
- admin/system states
- empty states
- technical decoration
- challenge-specific motifs

## Categories
Web: network/globe/connection geometry.
Crypto: key/cipher/transformation geometry.
Pwn: process/memory/execution geometry.
Forensics: evidence/trace/investigation geometry.
Reversing: reversal/transformation/directional geometry.
Misc: modular/wildcard geometry.

Avoid literal stock icons when an authored abstract symbol would be stronger.

## First Blood
First Blood is a flagship competition state.
Create a dedicated SVG treatment. It should feel rare and important without a giant emoji flame.

## Decoration
SVG decoration must:
- reinforce identity
- structure information
- communicate state
- or reinforce challenge context

If it only fills empty space, remove it.

## Accessibility
Decorative SVG: aria-hidden=true.
Meaningful SVG: provide an accessible name where needed.
Never communicate critical meaning using color alone.

See references/visual-grammar.md and references/competition-states.md.

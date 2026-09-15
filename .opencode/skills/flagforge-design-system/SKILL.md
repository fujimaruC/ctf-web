---
name: flagforge-design-system
description: Canonical visual identity and design system for FlagForge. Use for all FlagForge UI design, styling, redesign, and visual review.
---

# FlagForge Design System

Treat the existing frontend as functional reference, not visual authority.

## Identity
FlagForge is a purpose-built CTF competition platform.

Desired character:
- dark
- refined
- technical
- precise
- quietly cool
- slightly futuristic
- slightly underground
- tactile
- competition-oriented
- human-authored

Do not chase "modern" as an aesthetic. Make choices that feel intentional and product-specific.

## Color
Foundation: deep graphite, charcoal, steel blue-gray, layered near-black surfaces.
Primary identity: warm forged amber / muted gold / brass / heated-metal warmth.
Supporting semantic colors: muted teal success, restrained blue info, restrained violet for reversing/special states, controlled red for danger/errors.

Never make neon green the identity. Green is semantic, not "cybersecurity branding".

See references/colors.md.

## Typography
Use an intentional hierarchy:
- display/title face for major headings and selected competition numerals
- excellent UI/body face for normal interface copy
- monospace only for genuinely technical content

Do not use monospace merely to look hacker-like.
See references/typography.md.

## Geometry
Not every element is a rounded rectangle.
Use restrained radii, stronger framing for challenge workspaces, structural dividers, technical edge treatments, and occasional asymmetric geometry.
Avoid pill-everything and card-everything.
See references/geometry.md.

## Composition
Prefer hierarchy through typography, spacing, alignment, borders, dividers, framing, asymmetry, and density.
Do not default every page to:
title + subtitle + cards + giant card + table card.

Challenge detail should feel like a mission workspace.
Leaderboard should feel competitive.
Profile should feel like player identity.
Admin should feel operational while sharing the same visual DNA.

## Motion
Motion communicates navigation, state, solving, unlocking, progression, and feedback.
Do not animate every card just because animation exists.
Respect prefers-reduced-motion.
See references/motion.md.

## SVG
Use the flagforge-svg skill for brand symbols, navigation, categories, competition states, illustrations, and technical geometry.
Never substitute emoji or random Unicode for designed interface icons.

## Quality
When a component begins to resemble generic AI-generated SaaS UI, invoke flagforge-anti-slop and recompose it.

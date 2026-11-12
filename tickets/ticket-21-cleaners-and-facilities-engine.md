# [TICKET-21] Cleaners Queue, Facilities State Tracking, Jug Replacement, and Cleanliness HUD

**Phase / Milestone**: Phase K6: Facilities & Cleanliness  
**Status**: COMPLETED  
**Date**: 2026-11-12  
**Commit SHA**: `3b71b9a`  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
Eating, drinking, and foot traffic generate dirt; cleaners must prioritize and service dirty rooms autonomously.

## 2. Architectural Design & Key Changes
Built facilities state engine tracking dirt, bin fill, and supply depletion, cleaners maintenance queue (mop, wipe tables, empty bins, replace water jugs), wet-floor signs, and per-room cleanliness scores.

## 3. Data & Schema Modifications
office_facility_state, office_facility_cleaning_queue.

## 4. Verification & Quality Gates
- **Lint**: Passed (`npm run lint`)
- **Type Check**: Passed (`npx tsc --noEmit`)
- **Unit & Integration Tests**: Passed (`npm test`)
- **Build**: Passed (`npm run build`)
- **Evidence**: Cleaners push sanitation carts, mop spills, and replace water cooler jugs when levels drop.

## 5. Notes & Dependencies
Cleaners have vital reserves and take scheduled breaks like all agents.

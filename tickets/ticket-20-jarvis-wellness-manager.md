# [TICKET-20] Jarvis Wellness Manager, Autonomy Policy, Approvals, and Wellness UI

**Phase / Milestone**: Phase K5: Autonomous Wellness Governance  
**Status**: COMPLETED  
**Date**: 2026-11-12  
**Commit SHA**: `5a33249`  
**Branch**: `office-v3`  
**Author / Assignee**: Josiah (Lead Architect) & Antigravity Autonomous Engineering Fleet  

---

## 1. Context & Objectives
JARVIS governs agent stamina and break requests under configurable operator policies with human-in-the-loop approvals.

## 2. Architectural Design & Key Changes
Created standing autonomy policy (auto-approves small breaks within 30% caps; requires operator approval for major leaves), WAITING FOR YOU approval cards, wellness query tools, and department heat strip UI.

## 3. Data & Schema Modifications
office_wellness_policy, office_break_requests, office_approvals.

## 4. Verification & Quality Gates
- **Lint**: Passed (`npm run lint`)
- **Type Check**: Passed (`npx tsc --noEmit`)
- **Unit & Integration Tests**: Passed (`npm test`)
- **Build**: Passed (`npm run build`)
- **Evidence**: Approvals flow from break requests to WAITING FOR YOU cards with Approve/Deny actions.

## 5. Notes & Dependencies
Urgent task assignments protect resting agents and propose wakeups only when necessary.

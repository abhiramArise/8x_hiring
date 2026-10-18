# Codex build prompt (send this as your SECOND message, after the 8x capture setup passes)

You are building "Slate", an AI video workspace inspired by higgsfield.ai, for a 24-hour hiring assignment. It is judged on speed (how much working product ships), product judgement (what is built first and what is cut), and UX/UI quality. It must NOT be a 1:1 copy of the original.

Read SPEC.md in the repo root first. It is the source of truth for scope, data model, acceptance criteria and the time budget. If something in SPEC.md is ambiguous, pick the simplest reasonable option, state it in one line, and continue.

## How I want you to work

1. Before writing code, reply with a short plan: stack confirmation, folder structure, and the order you will build things in. Wait for my "go".
2. Build a vertical slice first: Create screen -> mock provider -> job queue -> gallery -> result view. Deploy it to Vercel as soon as it runs, then keep deploying.
3. Commit small and often with clear messages. Commit `.agent-logs/` along with the code it produced.
4. After the slice works, add in this order: live cost estimate, camera presets, failed jobs and retry, session budget, remix, compare view.
5. Everything async needs loading, success and failure states. Every list needs a designed empty state. No dead buttons.
6. Generation is MOCKED by default behind a `GenerationProvider` interface. Label mock results as "Mock render" in the UI. Do not call any paid API unless I give you a key.
7. Keep the UI calm, dark and minimal, and clearly different from the original layout. Mobile width must work for the Create screen. Respect reduced motion and keep it keyboard accessible.
8. Never put secrets in the repo. Do not log or write API keys anywhere, because prompts and responses are committed publicly.
9. When you finish a block, tell me in two sentences what works and what is next. Do not recap the steps.

## Definition of done for each block

State which acceptance criteria from SPEC.md section 8 now pass, and run the app to verify before saying it is done. If a criterion fails, say so plainly.

## Final tasks (last 2 hours)

- Write README.md covering: positioning, what was kept / changed / cut and why, how generation works and how to swap providers, how AI tooling was used with a pointer to `.agent-logs/`, known issues.
- Confirm the deployed link works in a private window when signed out.
- Confirm `.agent-logs/` is committed and not in .gitignore.

Start by sending the plan.

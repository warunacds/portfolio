---
title: From Prompts to Process - How Subagents and Skills Improve Agentic Development
date: 2026-04-10
excerpt: Better prompts didn't make agentic coding reliable — better process did. Here's how role specialization, review gates, and validation turn Claude Code into a team.
---

Agentic coding tools have changed what's possible in day-to-day software development, but they haven't changed what makes software reliable. The core challenge isn't whether AI can write code. It's whether we can wrap AI with the same process discipline that makes human engineering teams produce trustworthy output.

Over several months of daily Claude Code use across Rails, SwiftUI, Go, and Next.js projects, a pattern became clear: the most reliable outputs didn't come from better prompts. They came from better process structure around the prompts. A task handled by a single agent in a single context produced variable results. The same task, routed through role specialization, peer review, and mandatory validation, produced consistently correct output.

This isn't a new insight about AI. It's the same insight engineering managers have applied to human teams for decades. Bounded contexts, specialization, review gates, and verification are what turn individual contributors into reliable teams. When Claude Code introduced subagents and skills, it became possible to apply those same principles to agentic development.

This post describes how to structure an agentic coding pipeline using Claude Code's native features, what each piece contributes to accuracy, and where the approach still has limitations worth naming.

## The two-layer configuration model

The foundation is a separation of concerns between global process and project context.

A global `CLAUDE.md` file at `~/.claude/CLAUDE.md` defines *how* work gets done: roles, handoff protocols, review standards, validation requirements. It stays consistent across every project.

A project-level `CLAUDE.md` at the root of each repository defines *what* the team is working with: tech stack, naming conventions, folder structure, domain language, testing approach. Every project gets its own.

```
~/.claude/CLAUDE.md          # Global process — how work happens
your-project/CLAUDE.md        # Project context — what we're working with
```

The separation matters because it lets the process scale. Whether the current task is a SwiftUI screen, a Rails service object, or a Next.js route handler, the workflow structure stays identical. Only the context changes. This reduces the cognitive load of switching between projects and prevents one project's conventions from leaking into another.

It also makes the process portable. A team can share a global file as a standard and let each repository define its own context. New engineers joining a project inherit both layers automatically.

## Role specialization via subagents

The most impactful structural decision is using Claude Code's subagent feature to define specialized roles rather than relying on a single agent to handle everything.

A single-context agent holds the task definition, implementation, and evaluation in the same working memory. This is the agentic equivalent of asking one engineer to write a feature, review it, and sign off on it in a single pass. It works, but accuracy degrades because no single context can optimize simultaneously for understanding, producing, and critiquing.

Role specialization distributes these functions across subagents, each with focused context and a single purpose.

**The Tech Lead Orchestrator** is the entry point for every task. It reads the project's `CLAUDE.md`, analyzes the requested work, asks clarifying questions before assigning anything, and routes the task to the appropriate specialist. Its single responsibility is understanding the work well enough to hand it off cleanly.

This addresses a specific failure mode: premature implementation. Without an explicit clarification phase, agents default to filling ambiguity with assumptions, and those assumptions compound through the rest of the pipeline. An early clarification step produces an order of magnitude more accurate outcomes because errors get caught before any code is written.

**Specialist agents** handle implementation in specific domains. A Rails specialist knows the project's conventions for service objects and background jobs. A SwiftUI specialist knows the project's state management and navigation patterns. A database specialist handles migrations and schema changes. Each specialist has a narrower context than a generalist agent, which means less noise and higher accuracy.

**The Senior Code Reviewer** sits between implementation and delivery. Its only job is to evaluate the specialist's work against project standards and known failure modes. It classifies findings into three categories: critical issues that block delivery, warnings that should be addressed, and nits that are optional improvements. If any critical issues exist, the work returns to the specialist with specific feedback.

The review loop continues until the reviewer approves the output or a cycle limit is reached. In practice, most changes pass on the first or second pass. The review stage isn't there to catch the majority of issues — it's there to catch the minority that cause the most damage.

The combination of these three roles creates natural checkpoints where errors surface early. A mistake in the Tech Lead's task interpretation gets caught during clarification. A mistake in the specialist's implementation gets caught during review. This early-error-detection pattern is the same reason human engineering teams use design reviews, code reviews, and QA passes.

## Fast-track vs full-path routing

Not every task warrants the same process overhead. A typo fix doesn't need a full specification. A new feature does.

The Tech Lead routes tasks into one of two paths based on complexity.

**Fast-track** handles small, well-bounded changes: single-file edits, formatting changes, configuration tweaks, straightforward renames. The Tech Lead writes a brief instead of a detailed specification and hands it directly to a specialist.

**Full-path** handles everything else: new features, refactors spanning multiple files, architectural changes, anything with non-obvious requirements. The Tech Lead produces a detailed specification with acceptance criteria before routing.

The critical design decision is that fast-track skips the specification, not the review. Both paths still pass through the Senior Code Reviewer and the validation step. This matters because "trivial" changes are responsible for a disproportionate share of production incidents. A one-line fix that breaks an import is still a broken build. The review and validation stages exist specifically to catch these cases.

The routing decision itself is lightweight. The Tech Lead classifies the task in a sentence or two and proceeds. Over time, this classification becomes consistent enough to be predictable, which helps when multiple engineers are reviewing outputs from the same pipeline.

## Skills for domain expertise

Subagents handle process. Skills handle domain expertise.

Claude Code's skills feature lets you define reusable prompt libraries for specific domains — Rails testing patterns, SwiftUI navigation idioms, database migration conventions, API error handling standards. A skill is effectively a focused reference document that a specialist agent can load when needed.

The combination is what makes role specialization work in practice. A Rails specialist subagent alone is useful. A Rails specialist with access to a `rails-service-objects` skill and an `rspec-testing-patterns` skill produces output that matches your team's conventions without having to re-explain them in every session.

Skills are particularly valuable for established patterns: the specific way your team structures controllers, the idiomatic way you handle background job retries, the conventions your codebase follows for error handling. These are patterns that rarely change but often need to be communicated. A skill captures them once.

They're less useful for novel problem domains where the right answer isn't yet clear. If your team is exploring a new architectural approach, a skill would constrain exploration rather than accelerate it. The rule of thumb: skills encode known good patterns; subagents handle the work of applying them.

## The validation loop

Validation is the highest-leverage addition to the pipeline. If a team adopts only one piece of this approach, it should be this one.

The problem validation solves is a specific failure mode of agentic coding: agents will claim completion without verifying that the code actually works. "The implementation is complete" is not evidence of completion. Compilation is evidence. Tests passing is evidence. A successful build is evidence.

After the Senior Code Reviewer approves the output, the pipeline requires a validation step that produces objective proof of correctness. The validation strategy depends on the project type:

| Project type | Validation method |
|---|---|
| Swift/iOS | `xcodebuild`, run in iOS Simulator |
| Android | Gradle build, run in Android Emulator |
| Web (JS/TS) | `npm run build` or equivalent |
| Rails | `bundle exec rails test` or `rspec` |
| Browser UI | Playwright or Cypress end-to-end tests |
| CLI tools | Execute the command, verify output |
| Libraries | Run the test suite |

When validation fails, the error output becomes input to the next iteration. This feedback loop is important: the specialist doesn't just try again. It tries again with the specific error message, stack trace, or test failure that caused the previous attempt to fail. Agentic coding tools are generally good at fixing errors they can see. They're bad at fixing errors they didn't know existed.

Adding the validation step eliminated a whole category of recurring problem: code that compiled in theory but broke when run. Before validation, roughly a third of completed tasks had to be reopened after manual testing revealed missing imports, unused variables, or runtime errors that the agent didn't anticipate. After validation, that rate dropped to near zero. The review stage now catches a different class of issue: code that compiles and runs but violates project conventions or contains subtle logic bugs.

## Safety rails

Three rules apply across every agent and every stage of the pipeline.

**Never assume, always ask.** If any part of a task is unclear, the agent stops and lists questions before proceeding. This rule matters most in the early stages of a pipeline, where one wrong assumption can compound through every subsequent step. The cost of asking is small. The cost of proceeding on a wrong assumption and discovering it only at validation time is large.

**Destructive actions require confirmation.** Deleting files, renaming files that are imported elsewhere, removing dependencies, running destructive database migrations, and large refactors all require an explicit confirmation step before execution. Agentic tools move quickly, and irreversible actions deserve a deliberate pause. This rule is less about preventing mistakes and more about preventing the specific kind of mistake that can't be undone by rolling back the code.

**Three-iteration limit.** If the review-validate loop exceeds three cycles without resolution, the Tech Lead halts the pipeline and reports the blocker to the user. The intent is to prevent infinite loops where an agent repeatedly attempts the same failing approach. In practice, if three iterations haven't produced a working result, the underlying problem usually requires human intervention or a different decomposition of the task.

## Measuring the impact

The approach described here isn't a controlled experiment. It's an observational account of what changed across several months of daily use. The measurements are informal but consistent.

**Before adding role specialization and review**, roughly a third of completed tasks needed significant rework after an initial review. The most common failure mode was code that matched the literal request but missed the intent — for example, implementing a feature in a way that worked in isolation but violated the project's existing patterns.

**After adding role specialization**, the same failure mode dropped substantially. The Tech Lead's clarification phase surfaced intent mismatches before any code was written, and the Senior Code Reviewer caught the subset that survived clarification. A typical task now passes review on the first or second pass.

**Before adding validation**, roughly a third of tasks claimed completion with code that didn't compile or didn't run as specified. After adding validation, this rate dropped to near zero. The review stage shifted from catching compile errors to catching convention violations and subtle bugs, which is a more valuable use of reviewer attention.

**Skills contributed to a different kind of improvement** that's harder to measure quantitatively. The output became more consistent with project conventions. Engineers reading code produced through the pipeline reported that it looked and felt like code written by someone who had internalized the project's style — because, in effect, the skill had internalized it.

None of these numbers are rigorous. They're informal observations from daily use, subject to the same biases as any self-report. But the direction is consistent enough to be useful: each addition to the pipeline measurably reduced a specific failure mode without introducing new ones.

## Limitations and open questions

Several parts of this approach remain unresolved and worth naming.

**The iteration limit is arbitrary.** Three cycles works most of the time, but some tasks legitimately need more. A better approach would be to classify blocking conditions: "failing for the same reason" should halt quickly, while "making progress but not yet complete" should continue. The current heuristic is blunt.

**Role specialization has diminishing returns.** Adding more subagents creates coordination overhead that eventually outweighs the specialization benefit. The sweet spot in practice is three to five specialized roles, not a full organizational chart. More than that, and the handoffs become the bottleneck.

**Skills encode known patterns.** They accelerate work on established problems and constrain exploration on novel ones. A team introducing a new architectural approach shouldn't write a skill for it until the approach has stabilized. Otherwise the skill becomes a barrier to revision.

**The approach requires discipline.** If one engineer bypasses the pipeline and commits directly, the quality signal gets noisy. Measuring which outputs went through the pipeline and which didn't becomes harder. This is fixable with tooling (for example, git hooks that check for pipeline metadata), but it's currently a social constraint rather than a technical one.

**Process overhead is real.** A task that would take five minutes with a direct prompt might take fifteen minutes through the full pipeline. The tradeoff is worth it for tasks where correctness matters more than speed — which is most production work — but it's not free. Fast-track routing exists specifically to reduce this overhead for low-risk changes.

## Getting started

The full pipeline is a commitment. A smaller starting point produces most of the benefit.

If you're going to adopt one piece, adopt validation. Add a rule to your existing Claude Code setup that every task must end with a measurable proof of correctness — a build, a test run, a successful execution. This single change addresses the most frequent failure mode of agentic coding and requires no subagent configuration.

If you're going to adopt two pieces, add the clarification step. Before any specialist implementation, require an explicit reading of the project context and an explicit list of clarifying questions. This catches intent mismatches early, which is where they're cheapest to fix.

If you're going to adopt the full pipeline, start with one project and one team. Treat it as an experiment. Measure what changes — both the wins and the overhead. The value isn't in copying someone else's workflow. It's in understanding why each piece exists so you can adapt it to your own constraints.

## Closing

The core insight isn't about Claude Code specifically. It's that agentic coding tools need process scaffolding to produce reliable results, and that scaffolding is the same scaffolding we've used for human engineering teams for decades: task decomposition, specialization, peer review, and verification.

The tools changed. The principles didn't.

What's new is that the scaffolding is now configuration — a few files in a repository that define roles, handoffs, and validation requirements. This makes engineering process infrastructure in a way it wasn't before. Teams that take the time to define their process explicitly will produce more reliable agentic development than teams that rely on the default behavior of the tools. That's a competitive advantage worth investing in.

---

*Using Claude Code and want to see the complete CLAUDE.md? Drop a comment below — happy to share the whole thing. or see it here https://github.com/warunacds/claude-config/*

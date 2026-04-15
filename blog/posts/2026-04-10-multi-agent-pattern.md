---
title: "A multi-agent pattern for Claude Code"
subtitle: "Software teams aren't councils. They're hierarchies. Here's a 487-line Ruby script that takes the metaphor seriously."
date: 2026-04-10
tags: [claude-code, agentic, multi-agent, ruby, workflows]
---

There's a recurring idea in the AI tooling world right now that you can get better code out of LLMs by having several of them collaborate. The framing is usually some variation of "council" or "panel" — five frontier models deliberate on your question, debate across multiple rounds, vote, and produce a synthesized answer. Andrej Karpathy shipped a weekend hack of this in late 2025 and it went viral. There are now at least four paid SaaS products built on the same pattern.

For general questions, this works fine. For coding, it falls apart, and the failure mode is interesting enough to be worth dissecting — because the right structure for multi-agent coding is hiding in plain sight, and it's not a council.

## What's wrong with the council pattern for code

Three things, in order of how badly they break.

**Code is verifiable, and a council ignores that.** When you ask five models "should we use Postgres or DynamoDB?" the question has no ground truth — you're sampling perspectives because reasonable engineers genuinely disagree. When you ask five models "implement a rate limiter for this endpoint," the question has ground truth: the code either passes the tests or it doesn't. Voting on which implementation is best when you can just *run them all and see* is theater. The judge should be the test suite, not another LLM.

**Councils are flat, and software work isn't.** Real engineering teams aren't five equally-weighted voices brainstorming in a room. They're hierarchies with roles. The tech lead doesn't poll the team on every line of code — they decompose the task, assign work to the people best suited to each piece, and stitch the results back together. Most of the actual work happens in parallel, not in committee. Meetings are decision points, not the default mode.

**Councils burn tokens linearly with rounds.** Five models × three rounds × N turns in a conversation gets expensive fast, and most of that cost is models re-deciding things that were already decided. The Sonnet engineer working on the OAuth callback controller doesn't need to spend tokens reasoning about whether OAuth is the right choice — that's settled. They need to execute their piece well. A council pays everyone to think about everything; a team pays each person to think about their part.

So if not a council, what?

## The team metaphor, taken seriously

Imagine you give a real engineering team a real task: *"Add OAuth login with Google and GitHub, including tests."* Watch what they actually do.

A tech lead reads the task and produces a plan. Not code — a plan. They look at the codebase, understand the constraints, and decide: this is three pieces of work. The gem and config setup is one engineer's afternoon. The callbacks controller and routes is a different engineer who'll own that surface area. The user model changes and the tests are a third engineer who'll set up the test fixtures and cover the failure modes. The lead writes a brief for each engineer that includes which files they touch, what they implement, and crucially, what interface their piece must honor so the others can plug in.

The engineers go to their own branches and work in parallel. They don't see each other's work. They don't need to. Engineer A trusts that engineer B will produce a `User.from_oauth(provider, payload)` method because that was in the contract; they just call it. The juniors don't need to understand the whole system, they need to understand their slice and the seams.

A QA engineer writes the test plan in parallel with implementation, not after. The implementers know what they're targeting; QA isn't just rubber-stamping whatever felt right.

When the engineers finish, the lead does the integration. They merge the branches, watch what conflicts, run the test suite, fix the seams that don't quite line up. If something fundamentally broken comes back from an engineer, the lead kicks it back rather than rewriting it themselves. The lead is the only one who talks to the human.

This is how almost every functional engineering team works, and it's almost the exact opposite of how a council works. The team is hierarchical, asynchronous, parallel, and accountable. The council is flat, synchronous, sequential, and diffuse.

The interesting thing about mapping this onto LLMs is that the strengths are *actually* different now in ways that mirror real seniority. Opus 4.6 is genuinely better at long-horizon reasoning the way a senior engineer is. Sonnet is fast and competent at focused tasks the way a strong mid-level is. Gemini 2.5 Pro has the long-context superpower that's analogous to the engineer who actually read all the docs. These aren't marketing claims — they're observable in real use. So when you compose a "team" of different models for different roles, you're exploiting genuine differentiation, not pretending the models are interchangeable.

## Why subagents aren't enough

Claude Code ships with a subagent system that looks at first glance like it solves this. You define specialists in markdown files — `architect.md`, `critic.md`, `implementer.md` — give each its own system prompt, tools, and model. The main agent delegates to them based on their description. Each subagent gets its own context window. It feels like a team.

It isn't. There's a critical limitation: **subagents share the parent session's working directory**. Two parallel subagents editing the same file collide. They have isolated context windows, which is what people usually mean when they say "isolated," but they don't have isolated filesystems. There's no way around this from inside Claude Code's subagent system, because subagents are designed to *help* a single main session, not to *be* multiple independent sessions.

If you want multiple Claude Code sessions running in true parallel, each in its own checkout, with no shared state — and you do, because that's what real engineers on real branches are — you need to step outside Claude Code's subagent system entirely.

## The architecture that actually works

```
your shell or a tiny orchestrator script
        │
        ├─→ claude -p "<lead prompt>" in main repo
        │     ↓ produces plan.json with N work items
        │
        ├─→ for each work item, in parallel:
        │     git worktree add ../proj-eng-N -b team/eng-N
        │     (cd ../proj-eng-N && claude -p "<engineer brief>") &
        │
        ├─→ wait for all engineers to finish
        │
        ├─→ git worktree add ../proj-integration -b team/integration
        │     cd ../proj-integration
        │     merge each engineer branch
        │     claude -p "<integration + test + report prompt>"
        │
        └─→ present unified diff to you
```

The key piece is `claude -p "<prompt>"` — Claude Code's headless / non-interactive mode. It runs a Claude Code session as a subprocess, executes the prompt, prints the result, and exits. People use it in CI pipelines. It's exactly what you need: each engineer is a separate `claude -p` process started in a separate worktree directory. They have no shared context, no shared filesystem, no awareness of each other. They're truly independent processes the way real engineers on different branches are. The orchestrator — a small script in whatever language you like — is the only thing that knows about all of them.

This sidesteps the subagent limitation entirely because you're not using subagents. You're using shell, git, and the headless mode of the CLI. The "lead" isn't a subagent either — it's a separate `claude -p` invocation the orchestrator runs first, whose only job is to read the task, look at the codebase, and produce a structured plan that the orchestrator can parse. The orchestrator then loops over the work items, creates worktrees, dispatches engineers in parallel, and finally fires off an integration step in a fresh worktree that merges the branches and runs the tests.

## What changes when you build it this way

True parallelism. With `& wait` in bash (or `Thread.new` and `Thread#value` in Ruby), all engineers literally run at the same wall-clock time. Subagents in Claude Code, even when "delegated in parallel," go through the parent session's serialized tool-use loop. The orchestrator approach gives you actual N× speedup on independent work, not just context isolation.

True filesystem isolation. Each worktree is a real git checkout. Engineer A can rewrite `sessions_controller.rb` in their worktree while Engineer B is rewriting it differently in theirs. When you merge, you find out whether their decisions were compatible. **Conflicts at merge time are information** — they tell you the lead's decomposition didn't cleanly separate concerns, which is exactly the feedback signal you want. Most multi-agent systems try to prevent conflicts; this one uses them as a diagnostic.

Different models per role, easily. Each `claude -p` call can specify `--model` independently. Lead on Opus, engineers on Sonnet, integration on Opus. Or mix providers entirely — replace one of the engineer slots with a `gemini -p` or an OpenAI Codex CLI call if you want true cross-model diversity. The orchestrator doesn't care; it just dispatches commands and waits.

A real chain of accountability. When something's wrong, you can trace it. Was it the lead's plan? An engineer's execution? A missed case in QA's test plan? The logs from each `claude -p` invocation are sitting right there in `.team/logs/`. In a council, when the consensus is wrong, nobody owns it — they all do, which means none of them do.

## The hard parts (because there are some)

This isn't a free lunch.

**The lead's plan format has to be machine-parseable.** You need its output to be JSON the orchestrator can iterate over. That means a strict schema in the prompt and validation on the way out. About 5% of the time the lead ignores the "respond with only JSON" instruction and wraps it in prose; you handle that with a fallback extractor that pulls the first `{...}` it finds. If parsing fails twice, the right move is to surface to the human, not to loop forever.

**Engineer briefs are where the prompt engineering really lives.** Each brief includes the engineer's specific work item, the files they're allowed to touch, the interface contract they need to honor for the other engineers' pieces, and explicit instructions to *not* touch anything outside scope. The lead writes these as part of the plan. Getting this right is most of the work, and it's the part that benefits most from iteration.

**Engineers will sometimes blow scope.** Despite "stay in your files" rules in the prompt, occasionally an engineer will edit something outside its assigned list. Git catches it at merge time but it can still cause conflicts. The fix is either tighter prompt language or a post-engineer diff check that rejects out-of-scope changes — but I'd hold off on building that until you've actually felt the failure.

**Integration is where the truth comes out.** After all engineers finish, you have N branches that all need to merge cleanly into one. The integration step is where things break — and that's actually fine, because broken integration is exactly the bug you want to catch early. The integration `claude -p` invocation gets the merged tree (with conflict markers if any) plus the original task plus all the engineer reports, and its job is to resolve, run tests, and either declare success or kick back to a specific engineer.

**Cost can surprise you.** Each engineer reads files in its worktree, which burns tokens. A typical run with three engineers at default models is somewhere in the $0.50–$3 range, which is fine for non-trivial tasks but ruinous if you point this thing at trivial ones. The discipline is to use it for tasks that genuinely benefit from decomposition, and use plain Claude Code for everything else.

## What to actually do with this

I built the orchestrator as a single Ruby script — about 487 lines, no gems, just stdlib. The whole thing is on GitHub: [warunacds/claude-team](https://github.com/warunacds/claude-team). Drop it on your PATH, run it inside a clean git repo, and it works.

```bash
./team.rb "add OAuth login with Google and GitHub, with tests"

# preview the lead's plan without executing
./team.rb --dry-run "refactor the auth module to use a service object"

# nuke all team/* worktrees and branches from a previous run
./team.rb --cleanup
```

If you want to test it, pick a task that's big enough to actually decompose (not a one-line fix), small enough to debug if it goes wrong (not a major refactor), in a repo you'd `git reset --hard` without crying, and has a fast test suite so the integrator gets quick feedback. Good first targets: "add a new endpoint with a controller, model, and tests"; "implement a feature flag across the existing flag system"; "refactor function X out of file A into a new module B with backward-compatible imports."

Bad first targets: anything vague ("improve the codebase"), anything without a clear decomposition ("add tests"), anything touching fewer than five files (overhead exceeds benefit).

## The bigger point

The reason I'm writing this isn't to evangelize a script. The script is fine — it does what it does, and you can hack on it because it's 487 lines of straightforward Ruby. The bigger point is that **the metaphors we choose for multi-agent systems shape what we can build with them**, and "council" has been the dominant metaphor for the last few months, and I think it's the wrong one for code.

The team metaphor isn't just better — it maps to something real about how engineering work decomposes. Roles, hierarchy, parallel execution, accountability, integration. These aren't arbitrary design choices; they're load-bearing features of how humans build software at scale. We figured this out over decades of trial and error. Pretending we need to redesign the social architecture from scratch because we're now building with LLMs instead of people is wishful thinking. The architecture works. The agents are different — that's the only variable that changed.

If you're building multi-agent tools right now, the question worth asking isn't "how do I get these models to vote better?" It's "what role does this model fill on the team I'm trying to build?" Different question, different answer, much more useful tool.

---

*The orchestrator script and full README are at [github.com/warunacds/claude-team](https://github.com/warunacds/claude-team). It's a weekend hack, not a product — fork it, hack it, make it yours. If you build something interesting on top of it, let me know.*

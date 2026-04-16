---
title: Building DomainPilot - Engineering a Multi-Region Uptime Monitoring SaaS
subtitle: An architecture story about distributed systems, anti-spam alerting, and the tradeoffs of building a real product end-to-end.
date: 2026-03-10
tags: [SAAS, software architecture, domain management, uptime monitoring]
---

## Why This Article Exists

Most architecture articles either show off vanity diagrams or hide the interesting decisions behind marketing language. This is an attempt at neither. [DomainPilot](https://domainpilot.io) is a multi-region uptime and SSL monitoring SaaS I designed and built with a co-founder over the past year. I own all engineering and design; product direction is co-owned. Everything in this article is real and currently running in production.

The most useful engineering writing is the kind that explains *why* a system is shaped the way it is, not just what's in it. Architecture diagrams are easy. Architecture *decisions* are harder, and they're what other engineers actually want to read about.

What follows is a tour through the parts of DomainPilot's architecture that taught me the most, with an emphasis on the tradeoffs we faced and the patterns that ended up mattering.

---

## The System at a Glance

DomainPilot monitors websites and SSL certificates from multiple geographic regions, alerts users when something breaks, and provides analytics on uptime and certificate health over time. Users register domains through a web dashboard, the system probes them on a regular schedule, and any failures are evaluated, deduplicated, and turned into alerts delivered through email, Slack, push notifications, and webhooks.

At the highest level, the system has three main components:

- A **Next.js frontend** running on Vercel, providing the dashboard and real-time UI
- A **Rails backend** running on Fly.io, handling the API, business logic, billing, and orchestration
- A **Go uptime service** running across multiple Fly.io regions worldwide, performing the actual probes

These talk through a combination of REST APIs, Redis Pub/Sub, and a PostgreSQL database that serves as the system of record. Time-series data lives in a separate TimescaleDB instance optimized for high-volume writes and aggregation queries.

The architecture went through one significant evolution that's worth describing in detail, because the decision-making behind it is more interesting than the result.

---

## The Database Polling Problem

In the original architecture, each Go probe instance periodically queried the Rails database to figure out which domains it was responsible for monitoring. This is the obvious approach and it works fine when you have one or two regions. It stops being fine when you have many.

The math is unforgiving. With each region polling every few seconds across a domain population that grows linearly, the database query load grows multiplicatively with regions. The database started spending more time answering "which domains do I check?" than answering anything else. Most of those queries returned nearly identical results.

There were three obvious responses to this:

1. **Add caching at the Rails layer.** Reduces query load but doesn't solve the fundamental coupling between probe regions and the central database.
2. **Cache configurations locally in each Go instance with a TTL.** Reduces query frequency but introduces staleness. When a user adds or removes a domain, they want it monitored or unmonitored *now*, not in 30 seconds.
3. **Push configurations to probes instead of having them pull.** Inverts the relationship. The database stops being a hot path for probe scheduling.

The third option is structurally cleaner. The first two patch the symptom; the third addresses the cause. So that's what we built.

---

## Push, Don't Pull: The Redis Config Broadcast

The current architecture treats Rails as the single source of truth for domain configurations and uses Redis as the broadcast channel. The pattern works like this:

When a domain is created, updated, or deleted in Rails, an `after_save` (or `after_destroy`) callback writes the configuration to a Redis hash and publishes a notification on a Pub/Sub channel. Each Go probe subscribes to that channel and maintains an in-memory map of the domains it's responsible for. On startup, a probe loads the entire domain set with a single Redis call. From then on, it only reads from Redis when it receives a Pub/Sub notification telling it something changed.

The result: zero database queries from probes during normal operation. All probe scheduling happens against in-memory data, with config updates propagating from Rails to every region within milliseconds.

This pattern has some properties worth naming explicitly:

**Rails remains the source of truth.** Redis is a cache and a transport mechanism. If Redis loses data, the system can rebuild from Rails. We don't have to reason about distributed consistency between databases because there's only one database that matters.

**Probes are stateless from the perspective of configuration.** They can be restarted, redeployed, or scaled at any time. On startup they load everything they need from Redis in one operation.

**Updates propagate at Redis Pub/Sub latency.** In practice, this is fast enough that domain changes are reflected globally before a user can refresh their dashboard.

**The pattern degrades gracefully.** If Pub/Sub temporarily drops a notification, the next probe restart will catch up. If Redis is unavailable, probes continue running on cached configs while Rails queues updates.

The interesting tradeoff here is that we deliberately chose Redis Pub/Sub over a more robust message queue like Kafka or RabbitMQ. The reasoning: domain configuration updates are infrequent compared to probe traffic, occasional missed notifications are recoverable on restart, and adding Kafka would mean operating Kafka. For our scale, Pub/Sub's "at-most-once" delivery is acceptable. For an enterprise-grade system serving thousands of customers with strict SLAs, the calculus would change. We'll know we've outgrown this when the operational simplicity stops outweighing the durability gap.

---

## The Alerting Problem Nobody Talks About

The hardest problem in uptime monitoring isn't detecting that a site is down. That's a 200ms HTTP request away.

The hardest problem is *not telling users about failures that don't matter*.

If you've ever used an uptime monitoring service, you've probably been woken up by a 3 AM SMS for a 30-second blip caused by a transient DNS hiccup or a momentary network issue between a single probe region and your origin. You acknowledged the alert, went back to sleep, and when you checked in the morning, everything was fine. The service worked exactly as designed and you hated it.

This pattern --- call it alert fatigue --- is why most uptime monitoring tools eventually get muted, ignored, or replaced. It's also why we spent a disproportionate amount of architectural effort on the layer between "detection" and "notification."

DomainPilot's anti-spam pipeline has two layers, applied in sequence to every potential alert.

### Layer One: Multi-Region Consensus

Before any alert fires, multiple geographically distinct regions must independently observe the failure within a short time window. A single region reporting a failure is treated as a *signal*, not as ground truth. The system stores per-region failure observations, ages them out after the consensus window, and only escalates to "domain is down" when enough regions agree.

The reasoning is simple: a real outage looks different from a transient network issue. A real outage is observable from multiple vantage points within seconds. A transient issue between one probe and the target site is observable from one vantage point and disappears before another can confirm it. By requiring multi-region agreement, we filter out a huge class of false positives without affecting alert latency for real outages.

There's a special case for domains that only have one region configured (a feature we offer for cost reasons). For these, the consensus threshold automatically adjusts to one --- better to occasionally over-alert than to never alert.

### Layer Two: Flap Detection

Some sites enter pathological states where they oscillate between up and down repeatedly --- usually due to overloaded backends, failing health checks, or DNS issues during deployments. From a probe's perspective, every state transition is a real event. From a user's perspective, ten state-change emails in an hour is a denial-of-service attack.

The flap detector watches for domains that transition states above a threshold within a rolling window. Once a domain enters flap mode, individual alerts are suppressed and replaced with an hourly digest summarizing what happened. The user gets one informative email instead of ten panic-inducing ones.

Together, these two layers turn a noisy detection system into a usable alerting system. They're also the kind of feature that's difficult to retrofit --- they have to be designed into the alert pipeline from the beginning, because they fundamentally change what "an alert" means.

---

## The Time-Series Story

Every probe generates data. Multiply that by hundreds of domains and many regions, and you produce a lot of rows per minute. PostgreSQL can handle this, but not cheaply, and not well at query time when you want to render a one-year uptime graph for a customer.

We use TimescaleDB (Postgres-compatible, optimized for time-series workloads) for all probe data. It gives us three properties that matter:

**Hypertables** automatically partition data by time, which keeps insert performance constant as the data set grows. We don't have to think about partition management.

**Continuous aggregates** materialize hourly and daily roll-ups in the background. When a user opens a dashboard, the query hits a small pre-aggregated table, not raw probe data. Dashboards stay responsive even when the underlying data set is huge.

**Compression and retention policies** automatically compress older data and drop data past our retention window. Storage costs stay predictable as the system grows.

The interesting decision here was *not* to put our transactional data (users, organizations, subscriptions, billing) in TimescaleDB. Those live in a separate PostgreSQL instance. The reasoning: time-series data and transactional data have completely different access patterns and operational profiles. Mixing them creates a database that's bad at both.

This is one of those architectural decisions that sounds obvious in hindsight but requires discipline to maintain. There's always a temptation to keep "just one table" of operational data near the probe data because it's convenient. We've held the line on the separation, and it's paid off in operational simplicity.

---

## Probe Scheduling Without a Coordinator

A multi-region probe fleet has a coordination problem. If two regions decide to probe the same domain at the same instant, you double your traffic to that origin for no benefit. If no region decides to probe it for a long stretch, you miss outages.

The naive solution is a central scheduler that hands out probe assignments. We considered this and rejected it. A central scheduler is a single point of failure, an extra service to operate, and an additional network hop in a hot path.

Instead, each region runs its own scheduler against its in-memory copy of the domain configuration. Probes are scheduled based on a tier system --- different domains have different probe frequencies based on subscription level --- and a worker pool of bounded concurrency executes them.

This works because the probes don't need to coordinate with each other for correctness. We *want* multiple regions probing the same domain. The multi-region consensus layer described earlier depends on it. Independent regional scheduling is the right model for this workload.

Where regions *do* need to communicate is in escalating their observations to the central system, which happens through a batched write pipeline that aggregates probe results in Redis before flushing them to TimescaleDB. This gives us back the throughput we'd lose to per-probe writes without losing the multi-region independence.

---

## What I Learned

A few patterns generalized beyond this specific system:

**Pull is easier to reason about; push scales better.** The polling-to-broadcast migration was the single biggest architectural improvement in the system's life. Inverting "who initiates the request" turned out to be more important than any individual optimization.

**Anti-spam is alert architecture, not alert formatting.** You can't bolt good alerting onto a system that wasn't designed for it. The consensus and flap detection layers had to be designed into the data model, the alert pipeline, and the user experience together.

**Operational simplicity is a feature.** Choosing Redis Pub/Sub over Kafka, choosing in-memory regional schedulers over a central coordinator, choosing TimescaleDB instead of building our own roll-ups --- every one of these decisions trades theoretical robustness for fewer things to operate. For a small team, that tradeoff is almost always worth it. We can revisit when the scale justifies the complexity.

**Separating transactional data from time-series data is non-negotiable.** They have different access patterns, different durability requirements, and different scaling profiles. Trying to make one database good at both is how systems become unmaintainable.

**Real-world systems leak through their architecture.** The consensus window, the flap detection threshold, the probe tier intervals --- these are products of empirical tuning, not first-principles design. Our most important tuning happens after deployment, not before.

---

## What's Next

The current architecture handles our load comfortably and scales for our roadmap, but there are obvious next steps:

A formal incident state machine to replace the current ad-hoc state tracking. A migration from Pub/Sub to a more durable transport when our customer base demands stronger SLA guarantees. Dedicated alerting engine separation. Eventually, an external probe network for catching network-path issues that our current regions can't see.

We'll do those when they earn their place --- when the operational pain of *not* having them exceeds the cost of operating them. That's the only honest principle for architectural evolution.

---

If you want to see the product these decisions ended up shaping, you can find it at [domainpilot.io](https://domainpilot.io).

---

*Waruna de Silva is a product engineer with 12+ years shipping software end-to-end. He's currently Lead Application Engineer at Paro AI and builds [DomainPilot](https://domainpilot.io) with a co-founder under Frontcube LLC. He also maintains [Agent Desk](https://github.com/warunacds), [whygit](https://github.com/warunacds/whygit), and writes about engineering process and AI-assisted development. More at [waruna.dev](https://waruna.dev).*

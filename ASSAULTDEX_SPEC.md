# AssaultDex Project Specification

## Goal

Build **AssaultDex**, website for competitive **Pokémon Champions doubles battles**.

Main feature **ChoiceDex**: check battle state now, rank best actions for user.

Domain: `assaultdex.com`

## Fixed scope

* Support only Pokémon Champions doubles.
* No singles, no older games, no Pokémon Showdown, no custom rulesets.
* Don't assume mechanics from older Pokémon games apply.
* No public API.
* Internal backend routes OK.
* Connect reliable external APIs for Pokémon, competitive, tournament, team, replay data.
* Never invent mechanics, stats, formulas, external data.
* Mark unsupported/unverified mechanics clearly.

## Development rules

Before code:

1. Look at repo.
2. Sum up existing structure.
3. Find reusable code.
4. Design architecture and database.
5. Find external data sources and unverified mechanics.
6. Make implementation plan.
7. Build one phase at a time.

For every change:

* Use TypeScript, strict checking.
* Validate all inputs, external responses.
* Keep battle calc separate from UI and database.
* Add automated tests.
* Run type checks, lint, tests, prod build.
* Never say command passed unless run.
* Don't replace working code without reason.
* Don't build later phases before current phase works.

## Preferred stack

Use existing stack when fits. Else use:

* Next.js
* React
* TypeScript
* PostgreSQL
* Prisma or Drizzle
* Tailwind CSS
* Zod
* Vitest or Jest
* Playwright
* Docker Compose
* Background jobs for imports and simulations
* Redis only when needed

## Main modules

1. Pokémon database
2. Metagame homepage
3. Team builder
4. Team analysis
5. ChoiceDex
6. Opponent-set inference
7. Speed and damage calculators
8. Scenario sandbox
9. Battle simulations
10. Replay and post-battle analysis
11. Tournament prep
12. Practice opponent
13. Personal stats
14. Data import and admin

## External data

Make server-side provider adapters for:

* Pokémon reference data
* Pokémon Champions mechanics
* Competitive usage
* Teams and cores
* Tournament results
* Battle and replay data

Each adapter must handle:

* Auth
* Validation
* Timeouts
* Pagination
* Rate limits
* Retries
* Caching
* Provider failures
* Data normalization

Store provider, external ID, retrieval time, data version, normalization version, update status.

Imports must repeat without dupes.

Old imported data and saved teams stay usable during provider outage.

## Homepage

Show:

* Most-used Pokémon
* Usage and win-rate rankings
* Two-, three-, and four-Pokémon cores
* Recent successful teams
* Common leads
* Rising and declining Pokémon
* Move, item, ability, nature, EV trends
* Lead matchup heatmaps
* Search and filters

Every stat must show:

* Source
* Date range
* Sample size
* Last update
* Reliability

Keep popularity separate from performance.

## Pokémon pages

Show:

* Types and base stats
* Type matchups
* Common and best moves
* Items
* Abilities
* Natures
* EV spreads
* Teammates
* Leads
* Cores
* Full teams
* Counters and checks
* Usage and win rates
* Historical trends
* Sample reliability

Counter types:

* Hard counter
* Soft counter
* Offensive check
* Defensive check
* Situational answer
* Speed-based answer

Don't classify counters using type matchup alone.

## Team builder

Users can:

* Create, edit, save, duplicate, import, export, delete teams
* Store teams in collections
* View, compare, restore team versions
* Save notes
* Check team legality

Pokémon sets must have all props relevant to Pokémon Champions — species, form, ability, item, moves, nature, EVs, IVs.

Don't add mechanics just cuz they existed in older games.

## Collections

Users can sort teams into collections like:

* Current teams
* Tournament teams
* Experimental teams
* Opponent teams
* Archived teams

Collections private unless changed later.

## Team analysis

Check each team for:

* Shared weaknesses
* Poor defensive switching
* Missing speed control
* Weak common matchups
* Few answers to common leads or cores
* Dependence on one Pokémon
* Poor endgame options
* Weak speed tiers
* Limited coverage
* Predictable leads

Classify likely team archetypes, show evidence and confidence.

Make matchup matrix vs common Pokémon, leads, cores, archetypes, saved opponent teams.

## Speed calculator

Calc move order using verified Pokémon Champions mechanics.

Support:

* Stats and possible stat ranges
* Nature, EVs, and IVs
* Items and abilities
* Status and field effects
* Stat changes
* Speed ties
* Unknown opponent spreads

Show:

* Final speed
* Possible opponent range
* Conditions to move first
* Speed-tie odds
* Assumptions
* Spreads ruled out by seen evidence

## ChoiceDex

### Setup

Show:

* User team left
* Opponent team right
* Active Pokémon and field state center
* Recs in separate panel
* Turn history

Clearly split confirmed, entered, calculated, inferred, unknown info.

### Lead selection

Before battle, rank possible user leads vs likely opponent leads.

Weigh:

* Damage pressure
* Defensive position
* Speed control
* Knockout risk
* Switch options
* Board position
* Common opponent strategies
* Future positioning

### Battle state

Track:

* Active and remaining Pokémon
* HP
* Status
* Stat changes
* Field effects
* Revealed moves, items, and abilities
* Used-up resources
* Fainted Pokémon
* Past actions
* Temp effect durations
* Turn number

Support undo, fixes, jump back to earlier turns.

### Legal actions

Gen all legal combos for both active user Pokémon — moves, targets, switches, defensive actions, Pokémon Champions-specific actions.

Gen likely legal opponent actions from known data, inferred sets, stats, current position.

### Damage output

Show:

* Min, max, expected damage
* Damage %
* One-hit and two-hit KO odds
* Survival odds
* Accuracy-adjusted odds
* Relevant random outcomes
* Assumptions on opponent stats

### Recommendations

Rank several full action combos.

For each rec show:

* Both user actions and targets
* Damage and KO odds
* Survival odds
* Expected resulting position
* Likely opponent responses
* Main risk
* Assumptions
* Confidence
* Alt action
* Explanation

Never call an uncertain result guaranteed.

## Recommendation scoring

Keep scoring open and clear.

Possible factors:

* Expected damage
* KO and survival odds
* Pokémon advantage
* Board control
* Speed control
* Type position
* Switch flexibility
* Resource saving
* Endgame value
* Info gained
* Counterplay risk
* Worst-case result

Store each factor alone, not just final score.

## Recommendation profiles

Support:

* Balanced
* Safest
* Highest expected value
* Max immediate damage
* Best long-term position
* Aggressive prediction
* Conservative tournament play

Profiles can shift scoring weights, not battle mechanics or odds.

## Opponent inference

Track odds for unknown opponent:

* Moves
* Item
* Ability
* Nature
* EVs and IVs
* Speed range
* Offensive and defensive investment
* Role

Update odds from:

* Revealed info
* Damage dealt or taken
* Move order
* Survival
* Switching
* Team makeup
* Competitive usage

Show prior odds, updated odds, supporting evidence, contra evidence, confidence.

Only drop a possibility when confirmed evidence makes it impossible.

## Scenario sandbox

Let users copy battle state, change vars like:

* Opponent set
* HP
* Field state
* Leads
* Moves
* Switches
* Speed assumptions
* Damage rolls
* Rec profile

Show diff between original and changed result.

Don't touch original battle.

## Branching turn explorer

Show possible future turns as decision tree with:

* User actions
* Opponent responses
* Random outcomes
* Switches
* Knockouts
* State transitions
* Odds and expected value

Control tree size with depth limits, odds thresholds, beam search, state dedup, time limits, cancel.

## Simulation mode

Run repeat single-turn or multi-turn sims.

Show:

* Est win odds
* Action success rate
* KO rate
* Common resulting states
* Best and worst cases
* Variance
* Confidence interval
* Done sim count

Run long sims as cancellable bg jobs.

Give fast deterministic rec before sim results when possible.

## Practice opponent

Make opponent run by AssaultDex.

Must:

* Use legal actions
* Switch, save resources
* Use common strategies
* React to battle state
* Never peek user's hidden choice before picking own action

Difficulty levels:

* Basic
* Standard
* Competitive
* High variance

Users can practice vs common, random, archetype-based, and saved opponent teams.

## Replay import

Import Pokémon Champions battle records when reliable, allowed format exists.

Importer must check and rebuild:

* Players
* Teams
* Turns
* Actions
* Revealed info
* Field states

Report unsupported or contradictory data.

Till real format confirmed, use interface and test fixtures — don't claim full replay support.

## Post-battle analysis

Compare real vs recommended actions each turn.

Show:

* Est decision-value diff
* Missed KO chances
* Needless risks
* Better switches
* Wrong assumptions
* Key info
* High-uncertainty turns
* Turning points
* Alt branches

Keep decision quality separate from random results and info learned later.

## Tournament preparation

Support:

* Expected opponents
* Saved opponent teams
* Preferred and alt leads
* Matchup plans
* Speed benchmarks
* Common opponent sets
* Practice records
* Battle reports
* Team versions

Sum up weak matchups, recommended practice, lead plans, relevant metagame shifts.

## Metagame analytics

Support history compare by date, season, regulation, tournament, rank, competition level.

Analyze:

* Usage
* Win rates
* Moves
* Items
* Abilities
* Natures
* EV spreads
* Leads
* Cores
* Archetypes

Split:

* General usage
* High-rank usage
* Tournament usage
* High-performing-player usage

Classify results as:

* Popular and successful
* Popular but underperforming
* Uncommon but successful
* Uncommon and underperforming
* Not enough data

Use documented reliability thresholds.

## Core discovery

Auto-find common two-, three-, and four-Pokémon combos.

For each core show:

* Usage
* Win rate
* Sample size
* Reliability
* Common teams and leads
* Strategy
* Synergy
* Support
* Weaknesses
* Counters
* Historical trend

## Personal dashboard

Track:

* Record by team and team version
* Record by archetype and lead
* Common decision mistakes
* Missed KOs
* Switching mistakes
* Wrong opponent assumptions
* Matchups needing practice
* Performance over time
* Confidence calibration

Don't draw big conclusions from small samples.

Users must be able to delete own battle history and analytics.

## Confidence calibration

Compare predicted odds vs seen results.

Use documented measures like:

* Calibration buckets
* Reliability diagrams
* Brier score
* Sample size

Keep calibration separate for damage, opponent inference, recs, win odds.

Don't use info unavailable at prediction time.

## Accounts and security

Support:

* Register and login
* Password reset
* Saved private data
* Data export
* Account deletion
* Battle-history deletion

Implement server-side validation, auth, secure sessions, password hashing, rate limits, secret mgmt, safe imports, sanitized errors, admin audit logs.

Never expose private teams, creds, external API keys, stack traces, internal prompts.

## Administration

Admins can manage:

* Reference data
* Pokémon Champions legality and mechanics
* Providers and imports
* Import failures
* Stat rebuilds
* Reliability thresholds
* Users
* Jobs
* Cache
* Errors
* System health

## Testing

Test:

* Types and dual types
* Damage and KO odds
* Speed and priority
* Legal actions and targets
* Switching
* Items, abilities, status, field effects
* Battle-state history and undo
* Opponent inference
* Rec scoring and profiles
* Sandbox isolation
* Simulations
* Replays
* Team validation and versioning
* Imports and normalization
* Core and trend calc
* Reliability and confidence calibration
* Auth and authorization

Add regression test for every calc bug.

Mark tests on unverified mechanics as provisional.

## Implementation phases

1. Foundation, database, auth, provider adapters, Pokémon search and pages
2. Team builder, validation, versions, collections, basic team analysis
3. Type, speed, damage, field-state, and legal-action engines
4. ChoiceDex lead analysis, battle editor, scoring, recs, explanations
5. Usage, win-rate, trend, core, counter, and lead stats
6. Opponent-set inference
7. Sandbox, matchup matrix, tournament prep, and turn explorer
8. Simulations and practice opponent
9. Replays, post-battle reports, personal dashboard, and confidence calibration
10. Security, performance, accessibility, deployment, monitoring, and legal pages

## First task

First give:

1. Repo assessment
2. Architecture
3. Folder structure
4. Database overview
5. Mechanics-engine design
6. ChoiceDex scoring design
7. Opponent-inference design
8. External-provider design
9. Testing strategy
10. Risks and unverified mechanics
11. Phase 1 accept criteria

Then build only first vertical slice:

1. Import verified Pokémon data or documented fixtures.
2. Search and open a Pokémon page.
3. Create and save a team.
4. Create and compare team versions.
5. Add team to collection.
6. Pick two user and two opponent Pokémon.
7. Enter basic battle state.
8. Calc type effectiveness, speed, and damage.
9. Gen legal actions.
10. Show ranked recs with scores and assumptions.

Include migrations, setup steps, env vars, tests, error states, loading states, prod-build check.

Don't build later phases till this slice works and passes all checks.
# AssaultDex Project Specification

## Goal

Build **AssaultDex**, a production website for competitive **Pokémon Champions doubles battles**.

The main feature is **ChoiceDex**, which evaluates the current battle state and ranks the user's best possible actions.

Domain: `assaultdex.com`

## Fixed scope

* Support only Pokémon Champions doubles.
* Do not support singles, older games, Pokémon Showdown, or custom rulesets.
* Do not assume mechanics from older Pokémon games apply.
* Do not host a public API.
* Internal backend routes are allowed.
* Connect to reliable external APIs for Pokémon, competitive, tournament, team, or replay data.
* Never invent mechanics, statistics, formulas, or external data.
* Mark unsupported or unverified mechanics clearly.

## Development rules

Before coding:

1. Inspect the repository.
2. Summarize the existing structure.
3. Identify reusable code.
4. Design the architecture and database.
5. Identify external data sources and unverified mechanics.
6. Create an implementation plan.
7. Implement one phase at a time.

For every change:

* Use TypeScript with strict checking.
* Validate all inputs and external responses.
* Keep battle calculations separate from the UI and database.
* Add automated tests.
* Run type checks, linting, tests, and the production build.
* Never claim that a command passed unless it was run.
* Do not replace working code without a reason.
* Do not implement later phases before the current phase works.

## Preferred stack

Use the existing stack when suitable. Otherwise use:

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
11. Tournament preparation
12. Practice opponent
13. Personal statistics
14. Data import and administration

## External data

Create server-side provider adapters for:

* Pokémon reference data
* Pokémon Champions mechanics
* Competitive usage
* Teams and cores
* Tournament results
* Battle and replay data

Each adapter must handle:

* Authentication
* Validation
* Timeouts
* Pagination
* Rate limits
* Retries
* Caching
* Provider failures
* Data normalization

Store provider, external ID, retrieval time, data version, normalization version, and update status.

Imports must be repeatable without creating duplicates.

Previously imported data and saved teams must remain available during provider outages.

## Homepage

Show:

* Most-used Pokémon
* Usage and win-rate rankings
* Two-, three-, and four-Pokémon cores
* Recent successful teams
* Common leads
* Rising and declining Pokémon
* Move, item, ability, nature, and EV trends
* Lead matchup heatmaps
* Search and filters

Every statistic must show:

* Source
* Date range
* Sample size
* Last update
* Reliability

Separate popularity from performance.

## Pokémon pages

Show:

* Types and base stats
* Type matchups
* Common and best-performing moves
* Items
* Abilities
* Natures
* EV spreads
* Teammates
* Leads
* Cores
* Complete teams
* Counters and checks
* Usage and win rates
* Historical trends
* Sample reliability

Counter categories:

* Hard counter
* Soft counter
* Offensive check
* Defensive check
* Situational answer
* Speed-based answer

Do not classify counters using type matchups alone.

## Team builder

Users can:

* Create, edit, save, duplicate, import, export, and delete teams
* Store teams in collections
* View, compare, and restore team versions
* Save notes
* Validate team legality

Pokémon sets must contain all properties relevant to Pokémon Champions, such as species, form, ability, item, moves, nature, EVs, and IVs.

Do not include mechanics only because they existed in older games.

## Collections

Users can organize teams into collections such as:

* Current teams
* Tournament teams
* Experimental teams
* Opponent teams
* Archived teams

Collections are private unless explicitly changed later.

## Team analysis

Analyse each team for:

* Shared weaknesses
* Poor defensive switching
* Missing speed control
* Weak common matchups
* Limited answers to common leads or cores
* Dependence on one Pokémon
* Poor endgame options
* Weak speed tiers
* Limited coverage
* Predictable leads

Classify likely team archetypes and show evidence and confidence.

Create a matchup matrix against common Pokémon, leads, cores, archetypes, and saved opponent teams.

## Speed calculator

Calculate move order using verified Pokémon Champions mechanics.

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
* Conditions for moving first
* Speed-tie probability
* Assumptions
* Spreads eliminated by observed evidence

## ChoiceDex

### Setup

Display:

* User team on the left
* Opponent team on the right
* Active Pokémon and field state centrally
* Recommendations in a separate panel
* Turn history

Clearly distinguish confirmed, entered, calculated, inferred, and unknown information.

### Lead selection

Before battle, rank possible user leads against likely opponent leads.

Consider:

* Damage pressure
* Defensive position
* Speed control
* Knockout risk
* Switching options
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
* Consumed resources
* Fainted Pokémon
* Previous actions
* Temporary effect durations
* Turn number

Support undo, corrections, and returning to earlier turns.

### Legal actions

Generate all legal combinations for both active user Pokémon, including moves, targets, switches, defensive actions, and Pokémon Champions-specific actions.

Generate likely legal opponent actions using known data, inferred sets, statistics, and the current position.

### Damage output

Show:

* Minimum, maximum, and expected damage
* Damage percentage
* One-hit and two-hit knockout probabilities
* Survival probability
* Accuracy-adjusted probability
* Relevant random outcomes
* Assumptions about opponent stats

### Recommendations

Rank several complete action combinations.

For each recommendation show:

* Both user actions and targets
* Damage and knockout probabilities
* Survival probabilities
* Expected resulting position
* Likely opponent responses
* Main risk
* Assumptions
* Confidence
* Alternative action
* Explanation

Never describe an uncertain result as guaranteed.

## Recommendation scoring

Keep scoring transparent.

Possible factors:

* Expected damage
* Knockout and survival probability
* Pokémon advantage
* Board control
* Speed control
* Type position
* Switching flexibility
* Resource preservation
* Endgame value
* Information gained
* Counterplay risk
* Worst-case result

Store each factor separately rather than only storing a final score.

## Recommendation profiles

Support:

* Balanced
* Safest
* Highest expected value
* Maximum immediate damage
* Best long-term position
* Aggressive prediction
* Conservative tournament play

Profiles may change scoring weights but not battle mechanics or probabilities.

## Opponent inference

Track probabilities for unknown opponent:

* Moves
* Item
* Ability
* Nature
* EVs and IVs
* Speed range
* Offensive and defensive investment
* Role

Update probabilities from:

* Revealed information
* Damage dealt or received
* Move order
* Survival
* Switching
* Team composition
* Competitive usage

Show prior probability, updated probability, supporting evidence, contradictory evidence, and confidence.

Only remove a possibility when confirmed evidence makes it impossible.

## Scenario sandbox

Allow users to copy a battle state and change variables such as:

* Opponent set
* HP
* Field state
* Leads
* Moves
* Switches
* Speed assumptions
* Damage rolls
* Recommendation profile

Show differences between the original and changed result.

Do not modify the original battle.

## Branching turn explorer

Display possible future turns as a decision tree containing:

* User actions
* Opponent responses
* Random outcomes
* Switches
* Knockouts
* State transitions
* Probability and expected value

Control tree size with depth limits, probability thresholds, beam search, state deduplication, time limits, and cancellation.

## Simulation mode

Run repeated single-turn or multi-turn simulations.

Show:

* Estimated win probability
* Action success rate
* Knockout rate
* Common resulting states
* Best and worst cases
* Variance
* Confidence interval
* Completed simulation count

Run long simulations as cancellable background jobs.

Return a fast deterministic recommendation before simulation results when possible.

## Practice opponent

Create an opponent controlled by AssaultDex.

It must:

* Use legal actions
* Switch and preserve resources
* Use common strategies
* React to the battle state
* Never read the user's hidden choice before selecting its action

Difficulty levels:

* Basic
* Standard
* Competitive
* High variance

Users can practise against common, random, archetype-based, and saved opponent teams.

## Replay import

Import Pokémon Champions battle records when a reliable and permitted format exists.

The importer must validate and reconstruct:

* Players
* Teams
* Turns
* Actions
* Revealed information
* Field states

Report unsupported or contradictory data.

Until a real format is confirmed, use an interface and test fixtures rather than claiming full replay support.

## Post-battle analysis

Compare actual and recommended actions for each turn.

Show:

* Estimated decision-value difference
* Missed knockout opportunities
* Unnecessary risks
* Better switches
* Incorrect assumptions
* Important information
* High-uncertainty turns
* Turning points
* Alternative branches

Separate decision quality from random results and information learned later.

## Tournament preparation

Support:

* Expected opponents
* Saved opponent teams
* Preferred and alternative leads
* Matchup plans
* Speed benchmarks
* Common opponent sets
* Practice records
* Battle reports
* Team versions

Summarize weak matchups, recommended practice, lead plans, and relevant metagame changes.

## Metagame analytics

Support historical comparison by date, season, regulation, tournament, rank, and competition level.

Analyse:

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

Separate:

* General usage
* High-ranked usage
* Tournament usage
* High-performing-player usage

Classify results as:

* Popular and successful
* Popular but underperforming
* Uncommon but successful
* Uncommon and underperforming
* Insufficient data

Use documented reliability thresholds.

## Core discovery

Automatically find common two-, three-, and four-Pokémon combinations.

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
* Missed knockouts
* Switching mistakes
* Incorrect opponent assumptions
* Matchups requiring practice
* Performance over time
* Confidence calibration

Do not draw strong conclusions from small samples.

Users must be able to delete their battle history and analytics.

## Confidence calibration

Compare predicted probabilities with observed results.

Use documented measures such as:

* Calibration buckets
* Reliability diagrams
* Brier score
* Sample size

Keep separate calibration for damage, opponent inference, recommendations, and win probabilities.

Do not use information that was unavailable when the prediction was made.

## Accounts and security

Support:

* Registration and login
* Password reset
* Saved private data
* Data export
* Account deletion
* Battle-history deletion

Implement server-side validation, authorization, secure sessions, password hashing, rate limits, secret management, safe imports, sanitized errors, and administrator audit logs.

Never expose private teams, credentials, external API keys, stack traces, or internal prompts.

## Administration

Administrators can manage:

* Reference data
* Pokémon Champions legality and mechanics
* Providers and imports
* Import failures
* Statistical rebuilds
* Reliability thresholds
* Users
* Jobs
* Cache
* Errors
* System health

## Testing

Test:

* Types and dual types
* Damage and knockout probability
* Speed and priority
* Legal actions and targets
* Switching
* Items, abilities, status, and field effects
* Battle-state history and undo
* Opponent inference
* Recommendation scoring and profiles
* Sandbox isolation
* Simulations
* Replays
* Team validation and versioning
* Imports and normalization
* Core and trend calculations
* Reliability and confidence calibration
* Authentication and authorization

Add a regression test for every calculation bug.

Mark tests based on unverified mechanics as provisional.

## Implementation phases

1. Foundation, database, authentication, provider adapters, Pokémon search and pages
2. Team builder, validation, versions, collections, basic team analysis
3. Type, speed, damage, field-state, and legal-action engines
4. ChoiceDex lead analysis, battle editor, scoring, recommendations, and explanations
5. Usage, win-rate, trend, core, counter, and lead statistics
6. Opponent-set inference
7. Sandbox, matchup matrix, tournament preparation, and turn explorer
8. Simulations and practice opponent
9. Replays, post-battle reports, personal dashboard, and confidence calibration
10. Security, performance, accessibility, deployment, monitoring, and legal pages

## First task

First provide:

1. Repository assessment
2. Architecture
3. Folder structure
4. Database overview
5. Mechanics-engine design
6. ChoiceDex scoring design
7. Opponent-inference design
8. External-provider design
9. Testing strategy
10. Risks and unverified mechanics
11. Phase 1 acceptance criteria

Then implement only the first vertical slice:

1. Import verified Pokémon data or documented fixtures.
2. Search and open a Pokémon page.
3. Create and save a team.
4. Create and compare team versions.
5. Add the team to a collection.
6. Select two user and two opponent Pokémon.
7. Enter a basic battle state.
8. Calculate type effectiveness, speed, and damage.
9. Generate legal actions.
10. Display ranked recommendations with scores and assumptions.

Include migrations, setup instructions, environment variables, tests, error states, loading states, and production-build validation.

Do not implement later phases until this slice works and passes all checks.

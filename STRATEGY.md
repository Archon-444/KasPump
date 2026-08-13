# KasPump strategy board

**Status:** Draft — 2026-08-13. Not decided.  
**Rule:** Product and mainnet wait on the decisions in this file. Code is inventory, not a strategy.

This replaces “ship a Pump.fun clone to BSC because the contracts compile.” Competitors are not going away. Time is an advantage only if we use it to pick a customer and a reason they switch — not to add features.

Canonical ops/code state: [STATUS.md](./STATUS.md). This file outranks [ROADMAP.md](./ROADMAP.md) until the decision log at the bottom is filled.

---

## Freeze (effective now)

- No public mainnet. No “soft launch.” No marketing that says we are live.
- No new features unless they are required to **test a wedge** (see Proof, below).
- Do not redeploy, audit-freeze, or buy distribution until a wedge is written in the decision log.
- Keep the repo; it is a prototype of *a* launchpad, not proof that *this* launchpad should exist.

---

## What we now know (2026-08-13, from the founder)

**Thesis (stated):** creators should **earn more**, and the launch should be **harder to rug**. That is B + C. It is a real thesis. It is not “simple for everyone.”

**Origin:** Kaspa / KRC-20 was the home. EVM/BSC was a detour because Kasplex-era tech and volume could not carry a proper curve product. Crescendo (May 2025, 10 BPS) and Toccata (June 2026, L1 covenants / native KRC-20 path) improved the chain. The chain is still small. Fear: without volume the launcher dies.

**Correction to an earlier grill:** the AMM **already** pays the creator on every trade. `CREATOR_FEE_SHARE = 5000` — 50% of the trading fee, pull-payment (`withdrawCreatorFees`). Referrer can take 5% of the fee. Graduation still locks LP 6 months and vests the creator token bag 6 months. So the *contract* is closer to the thesis than the *homepage* is.

What the product currently *says*: “BSC meme coin launchpad,” “no team allocation,” “standard sigmoid.” It does not lead with “you earn 50% of every trade” or “LP is locked; you cannot yank liquidity.” The thesis is buried in Solidity.

---

## The volume trap (read this twice)

You are right that a launcher with no flow is a ghost town. The mistake is thinking **BSC volume is available to us**.

- Four.meme already sits on that volume. We would own a rounding error of it.
- KaspaCom (defi.kaspa.com) is the Kaspa DeFi hub. DefiLlama-scale numbers as of this writing: TVL on the order of **~$120k**, 30-day DEX volume **~$150k**, 24h volume **hundreds of dollars**. That is a pond, not an ocean.
- KaspaCom’s “launchpad” is a **presale / batch sale**: pre-mint, whitelist, rounds, **creator withdraws the KAS raised** (2.5% platform fee). That is the *opposite* of less-rug + ongoing creator pay. It is a CEX-style raise, not a Pump.fun curve.

So:

| Path | Volume you might touch | Thesis fit |
|------|------------------------|------------|
| Generic BSC Pump.fun | Huge pool, ~0% ours | Weak — Four.meme has the room |
| Kaspa bonding-curve pad | Tiny pool, **high % ours if we become the default** | Strong — we are not a KaspaCom clone; we are the thing they are not |
| “Both, for volume” | Dilutes the Kas name and the story | Usually dies twice |

Launchpads do not import another chain’s volume. Traders follow coins and a **scene**. A scene is a Discord / CT circle that already talks. Kaspa has one. “BSC degens” are not ours.

**Kill criterion (proposed):** if after a closed Kaspa (or Kaspa-community) test we cannot get repeat traders from *that room*, BSC will not save us. It will only hide the failure in a bigger graveyard.

Crescendo/Toccata made a curve product *technically* more plausible. They did not create Pump.fun-scale flow. Treat Kaspa as: **small, native, thesis-aligned, with a weak incumbent launchpad model** — not as “the chain is ready so we will have volume.”

---

If an answer is “everyone,” “meme coin users,” or “BSC because gas is cheap,” it is not an answer. Rewrite it until a stranger could say no.

### 1. Who, specifically, launches the first 20 coins?

Name them. If you cannot name ten people who would launch here **instead of Four.meme or Pump.fun** this month, you do not have a market. You have a repo.

“Simple for everyone” is how we built a 5-step wizard and then a 3-field form without ever talking to a creator. Everyone is not a customer.

### 2. What do you own that Four.meme and Pump.fun do not?

Distribution is the product in this category. They have attention, KOLs, muscle memory, and (on BSC) Binance-adjacent gravity. We have:

- an empty X handle in `src/config/brand.ts`
- a name that still says **Kas** while the tagline says **BSC meme coins**
- no named community, no KOL list, no waitlist

If the honest answer is “we own engineering time,” that is not a go-to-market. It is a hobby with a factory contract.

### 3. Why did Kasplex / Kaspa die as the story, and why is BSC the replacement?

The token is still called `KRC20Token`. The product is still called KasPump. The homepage says BSC. That is three identities. Pick one:

- We are the launchpad for **a chain/community we actually belong to** (then BSC-as-Four.meme-clone is the wrong war).
- We are a **generic EVM Pump.fun** (then the Kas name is a liability, and Four.meme already won the obvious chain).
- We are **not a consumer launchpad** (then stop designing a casino UI).

Migrating off Kasplex because the chain was hard, then pointing the same codebase at the most crowded EVM meme venue, is how you get “clumsy market fit.”

### 4. Why would a creator leave Four.meme — or KaspaCom?

On **BSC**: Four.meme has the audience. Our 50% trade-fee share is a real paycheck **only if trades happen**. Empty feed = donation.

On **Kaspa**: KaspaCom already lets people “launch,” but the creator **withdraws the raise**. Our pitch writes itself if we stay honest: *you get paid on every trade; you cannot pull LP; your bag vests.* That is a switch reason **inside a room we might actually belong to.**

The remaining question is not the contract. It is: **are we in that Kaspa room every week, or only in this repo?**

### 5. Why would a trader open this app instead of the one they already have open?

Traders follow flow. Flow follows coins. Coins follow creators and the feed. A prettier AMM does not move them. If we cannot describe the **first session** (open phone → see coins → ape → comment → share) in one breath, we are not in this category.

### 6. What is the lie we are already telling?

Brand copy: “No presale, no team allocation — fair launch for everyone.”  
Protocol: 40M creator tokens vest over 6 months.

That is a team allocation. Shipping that sentence to mainnet is how you get ratioed on day one. Strategy has to pick a moral story we can say without crossing our own specs.

### 7. Are we building a protocol, a consumer brand, or a studio?

- **Protocol:** other frontends, bots, integrations. UX “for everyone” is the wrong north star. APIs, invariants, audit, chain presence.
- **Consumer brand:** one feed, one chain, one ritual. Kill analytics, alerts, health scores, multi-chain until that ritual is addictive.
- **Studio:** we launch coins for a community we run. The app is a tool for us, not a public utility.

Trying to be all three produced a DeFi dashboard with a 30-second launch badge.

### 8. What does winning look like in 12 months that is not “we exist”?

Pick a number that would make you keep going, and a number that would make you stop. Examples (replace with yours):

- 50 coins launched by people we did not personally DM, *or we kill the consumer app*
- $X creator fees paid out, *or we admit the creator wedge failed*
- One chain where we are in the top three launchpads by new-coin count, *or we stop pretending this is a category play*

“Ship and see” is how clones die slowly.

---

## What we got wrong

1. **We optimized the curve and called it product.** Linear vs sigmoid vs Simpson’s Rule never made Pump.fun. The 3-field form was the right cut. The rest of the UI still explains the protocol.
2. **We copied the category after it had a winner on the chain we chose.** Four.meme is the BSC default. A late, quieter, “fairer” clone is not a strategy.
3. **We kept a Kaspa name on a BSC meme pitch** and never locked brand, domain, or socials. That is not “parked rebrand.” That is unfinished identity.
4. **We built rooms (analytics, alerts, favorites, health scores) before a feed.** Meme launchpads are boards of coins, not Bloomberg.
5. **We treated mainnet as the milestone.** Mainnet without a wedge is a press release for a product nobody needed.
6. **We never listed distribution as a workstream.** Engineering ran for a year. GTM is still an empty Twitter string.

---

## What is not a strategy

Do not disguise these as the plan:

| Idea | Why it fails as the plan |
|------|--------------------------|
| Better bonding-curve math | Invisible to users; not a switch reason |
| More features (limits, stop-loss, pairs, referrals-as-code) | Increases surface without a customer |
| Multi-chain from day one | Liquidity and attention do not split three ways at zero users |
| “Fairer than Pump.fun” | Fairness is a trust feature, not an acquisition engine, unless you name the scared customer |
| “Simple for everyone” | No one to design for; everyone already has an app |
| Launch because the code is ready | Code readiness ≠ demand |

---

## Wedges (pick exactly one)

Write the choice in the decision log. Do not hybridize in v1.

### A — Community launchpad (own the room)

We are the default launcher for **one** existing community we already have access to (chain, language, geography, or a scene we actually sit in). The app is how that room launches coins. Distribution is the community, not Twitter ads.

**Works if:** we can name the room and its mods/KOLs today.  
**Dies if:** the room is “crypto Twitter” or “BSC degens.”

### B — Creator-pay launchpad (own the paycheck)

We exist so creators earn **on every trade**, not only if they graduate. That is a contract + positioning change, not a CSS change. We still need a room (A) or we are Pump.fun with extra steps and no audience.

**Works if:** we will change fee split before UI polish, and we have a creator who will say so in public.  
**Dies if:** we keep 70/20/10 graduation-only and market “creator-friendly.”

### C — Anti-rug venue (own the scared user)

LP lock, vesting, sniper tax, no instant founder dump — aimed at people who **will not** use Four.meme because they got burned. Smaller market. Must be honest about the 40M vest. UI should feel like a clear rules board, not a casino, *or* we are lying again.

**Works if:** we can find those users in the wild (they cluster in specific Discords, not on /biz/).  
**Dies if:** we want Pump.fun volume. Those users want heat, not a lockup.

### D — Not a public launchpad

The codebase becomes an internal studio tool, a white-label, or protocol infra. Stop the consumer homepage. Stop “fair launch for everyone.”

**Works if:** we admit the last year was a prototype for something else.  
**Dies if:** we keep shipping public UX “in case it takes off.”

### E — Kill / mothball consumer KasPump

Keep the repo as a library of AMM/graduation patterns. Put energy on a different product. This is a valid adult outcome.

---

## Recommended default (challenge this)

**Wedge: B + C, in one room (A).** Creator paycheck + cannot-rug LP. Not a generic meme casino.

**Chain: Kaspa-first unless you will drop the Kas name.** BSC is the volume mirage. The incumbent on KAS is a withdraw-the-raise pad, not a curve. That is the only place the thesis is a *difference* instead of a slogan.

**Do not** dual-home at v1. One feed, one asset (KAS), one ritual.

**I was wrong** to treat C as a weak primary and B as missing from the contracts. The contracts already do both. The failure is identity + distribution + UI that sells “BSC Pump.fun.”

**Still fatal if true:** we have no Kaspa presence (no handle, no weekly face, cannot name ten Kaspa creators). Then B+C on Kaspa is still a ghost town — and the honest fork is D/E, not BSC.

**Volume:** optimize for **share of a small pond**, then grow with the chain. If that ceiling is unacceptable, this is the wrong category, not the wrong AMM.

---

## Proof before product

After the wedge is written, the next work is **not** a UI rewrite. It is evidence.

1. **Ten conversations** with the named customer. Notes in a private doc: why they launch where they launch, what would move them, what they called us when we described the wedge. If eight would not switch, the wedge is wrong.
2. **A closed test, not a brand launch.** Fresh testnet or a cheap mainnet you can afford to fail. Twenty coins max, people you can text. Watch: did they launch, did anyone else buy, did they share a URL, did they come back the next day.
3. **One ritual.** Feed → coin → buy, or launch → share. If that ritual needs a hero, orbs, health scores, or a sigmoid label, delete those before adding anything.
4. **Distribution as a workstream.** Handle, room, weekly presence. If nobody will be the public face, we are D or E.

Only after (1)–(3) look alive do we talk audit, Safe, subgraph, WS host, mainnet. Those are *scale* costs. They are waste if the wedge is wrong.

---

## What we stop building (until the log is filled)

- Mainnet deploy scripts as a goal
- Feature parity with Pump.fun/Four.meme (socials-on-form is allowed *after* A is chosen; it is not the strategy)
- New curve types or a curve picker
- Limit orders / stop-loss / extra pairs
- Analytics, alerts, multi-chain expansion
- “Impeccable” audits of surfaces we may delete

Allowed: answering this file; talking to users; deleting UI that contradicts the wedge; fixing honesty bugs in copy (team allocation vs “no team allocation”) when we know which story we are telling.

---

## Decision log (fill this)

Copy and date each revision. Unfilled = freeze holds.

| Decision | Choice | Date | Notes |
|----------|--------|------|-------|
| Wedge | **Leaning B+C** (creator pay + less rug) | 2026-08-13 | Founder-stated thesis. Not locked until chain/room is. |
| Customer (named) | *open* | | Need: Kaspa creators who hate withdraw-the-raise pads? Name ten. |
| Chain / room | **Kaspa was origin; BSC was detour; still afraid of small-chain volume** | 2026-08-13 | Recommendation: Kaspa-first. Challenge: are we in the room weekly? |
| Brand | Keep KasPump *if* Kaspa-first; else rename | | Tagline still says BSC — that must die if we go home |
| Creator economics | **Already 50% of trade fees on-chain** | 2026-08-13 | UI/homepage do not lead with this. Graduation 20% native surplus + 6mo vest still exists |
| Allocation story | Vested 40M + LP lock 6mo | | Homepage “no team allocation” is still a lie. Rewrite as “vested creator bag, locked LP” |
| 12-month win | *open* | | Propose: become default *curve* launcher in the Kaspa room, or kill consumer |
| Public face / distribution | Empty X/TG in `brand.ts` | | Fatal if unchanged |
| Next proof | Conversations in the Kaspa room, not a BSC deploy | | Ten chats before any chain work |

---

## How we work from here

1. You answer the grill. Push back. “I don’t know” is allowed; “everyone on BSC” is not.
2. We write one wedge paragraph a stranger could repeat.
3. We run proof (above). Product changes are only those the proof needs.
4. Launch is a later document. It does not get to rewrite this one in a panic.

*If this file and the UI disagree, this file wins until we change it on purpose.*

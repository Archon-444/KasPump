# KasPump strategy board

**Status:** Decided — 2026-08-13. **Wedge E: mothball.**  
**Rule:** This file is the record of why we stopped. Do not revive product work until the reopen tests at the bottom are all true.

Canonical ops/code state: [STATUS.md](./STATUS.md). This file outranks [ROADMAP.md](./ROADMAP.md).

---

## Decision (locked)

Founder cannot name ten people who would launch here. That was the kill criterion. **Bury consumer KasPump for now.** Same instinct for [Archon-444/ARC](https://github.com/Archon-444/ARC) until a community exists; Arc is not decided beyond “not now.”

The months of engineering are a **library**, not a failed launch. The failure would have been shipping with wrong fundamentals.

Founder’s own post-mortem (keep this wording):

- **Kas:** chain maturity — native L1 cannot do Pump.fun graduation; L2 wrap is against ethos. Wait. Do not force it.
- **Arc:** focus lacking on the community. Tried to revive without a room. Recipe for disaster.
- Reviving a repo because the code exists is how you get another year of the same loop.

**Kas:** keep this repo as-is. Reopen only when native L1 has a DEX the Kas room will use **without wrapping** — a hardfork is not enough by itself (Crescendo/Toccata already happened; they did not add that substrate).  
**Arc:** unknown. Do not race 2026-09-16 without names. NFT stays dead.

---

## Mothball rules (effective now)

- No public mainnet. No “soft launch.” No marketing that says we are live.
- No new features, deploys, audits-as-a-goal, or dual-repo revival “in case it takes off.”
- Keep the git history. Do not delete contracts to punish sunk cost.
- Allowed: reading this file; tiny honesty/docs fixes; a future reopen that passes the tests below.

---

## What we now know (2026-08-13, from the founder)

**Thesis (stated):** creators should **earn more**, and the launch should be **harder to rug**. That is B + C. It is a real thesis. It is not “simple for everyone.”

**Origin:** Kaspa / KRC-20 was the home. Native Kaspa could not DEX-graduate. Kasplex/Igra *can*, but **wKAS is against Kas ethos**. SOL and BSC are out. Base incumbents (Zora/Clanker/Flaunch) were not a room we sit in. [Archon-444/ARC](https://github.com/Archon-444/ARC) is a USDC-native launcher plus a dead NFT marketplace. **Locked later the same day:** no names → mothball both for now.

**Correction to an earlier grill:** the AMM **already** pays the creator on every trade. `CREATOR_FEE_SHARE = 5000` — 50% of the trading fee, pull-payment (`withdrawCreatorFees`). Referrer can take 5% of the fee. Graduation still locks LP 6 months and vests the creator token bag 6 months. So the *contract* is closer to the thesis than the *homepage* is.

What the product currently *says*: “BSC meme coin launchpad,” “no team allocation,” “standard sigmoid.” It does not lead with “you earn 50% of every trade” or “LP is locked; you cannot yank liquidity.” The thesis is buried in Solidity.

---

## The graduation wall (this is the actual constraint)

Pump.fun is not “a bonding curve.” It is **curve + one-tx graduation into a live DEX pool**. Our AMM already does that *if* the chain has a Uniswap-V2-compatible `addLiquidityETH` router. `DexConfig.sol` currently knows BSC, Arbitrum, Base. It does **not** know Kaspa.

Treat “Kaspa” as three different products. Mixing them is why this feels like square one.

| Layer | What it is | Can this codebase graduate? | Volume / oracles | Identity |
|-------|------------|-----------------------------|------------------|----------|
| **Native Kaspa L1 / KRC-20** | Inscriptions, not our Solidity ERC-20 | **No.** This was the wall. Still the wall. | DEX/oracles still not a Pump.fun substrate | Real Kas community |
| **Kasplex / Igra EVM** | EVM L2s that settle to Kas; native token is KAS | **Yes, as a port.** Kroko on Kasplex already publishes a V2 router (`0xC7ca845B…`, chain 202555) + WKAS. KaspaCom DEX is a Uniswap V2 fork (write APIs still immature; the *router* exists). Graduation is a `DexConfig` row + a fork-test, not a new language. | Pond: KaspaCom-scale DEX ~$150k/30d. Oracles thin. Graduation is **real technically, shallow economically**. | Still Kas. Name KasPump is honest. |
| **Public EVM (BSC / Base / Arb)** | Where this repo already points | **Yes, already wired.** | Real DEXes and oracles. Volume is **owned** (Four.meme on BSC; Clanker / Flaunch / Zora on Base — Base is *not* empty). | KasPump is a lie unless we rename |

**Oracle FOMO is a later problem.** v1 graduation does not need Chainlink. It needs a router. USD charts, stop-loss, and “fair launch” badges can wait. Do not pick Base because “Kas has no oracle.”

**Move (Sui / Aptos) is out.** Correct instinct. This is an EVM factory + CREATE2 AMM. Move is a second product, not a port. Do not reopen it to avoid a hard choice.

### You cannot keep all three

1. **Kas as home** (community you already sit in, name that says Kas)
2. **Pump.fun-style DEX graduation** (V2 `addLiquidityETH` in the same tx)
3. **Meaningful volume / less crowded than SOL**

| If you insist on… | You give up… | Honest home |
|-------------------|--------------|-------------|
| 1 + 2 | Volume. Graduate into a thin Kasplex/Igra pool | **Closed by founder:** wKAS + L2s will not pick up |
| 2 + 3 | Kas as home. Rename. Fight whoever owns the feed | **Base** (known incumbents) or **Arc** (new L1, not empty) |
| 1 + 3 | Graduation — native KRC-20 still cannot do our loop | Not this repo |

Native KRC-20 + this Solidity pad was never a coherent product. Square one was mixing the three Kas layers.

**Founder override (2026-08-13, later the same day): Kas L2s are out.** wKAS is ugly and against Kas ethos. Weak L2 pools are read as *evidence* that the Kas room will not move until it is L1-native. That is a community constraint, not a missing router. Honor it. Then **Kas is closed as home for this repo.** Native L1 cannot graduate; L2s will not be used. Do not spend a year on Kasplex and rewrite later. That prediction is now on the record.

**SOL is out. BSC is out.** Four.meme owns that room; we will not contest it.

**Move (Sui / Aptos) is out.** Correct instinct. This is an EVM factory + CREATE2 AMM. Move is a second product, not a port.

---

## Closed doors (do not reopen without a new fact)

| Door | Why it is closed |
|------|------------------|
| Native Kas L1 / KRC-20 | This AMM cannot DEX-graduate. Ethos wants L1. Product needs a V2 router. Deadlock. |
| Kasplex / Igra | Graduation works; **wKAS + L2 adoption** will not. Effort for a dying venue or a rewrite. |
| Solana | Pump.fun owns it. Out. |
| BSC | Four.meme owns it. Out. |
| Aptos / Sui | Move rewrite. Out. |
| NFT marketplace sidecar | Dead category. OpenSea struggling is the tombstone. Do not rebuild it on Arc. |

What remains is not “Kas vs the world.” It is **Base vs Circle Arc vs mothball.**

---

## Base: “I don’t even know them” is the warning, not the opportunity

Not recognizing the incumbents does **not** mean the room is empty. It means we are not in the room.

Base’s own docs tell people to launch via **Zora, Clanker, or Flaunch** — not a custom factory. As of this writing:

- **Zora** (Coinbase / Base app): posts mint as coins; Base has at times **outraced Solana on daily token launches** on that loop. Creators already get a fee share. That is the distribution we do not have.
- **Clanker**: Farcaster-native / AI deploy. On the order of **~1.4M tokens deployed** on Base. This is not a stealth startup.
- **Flaunch**: Uniswap V4 hooks, programmable creator fees, bid walls.

The Coinbase onramp is real. It dumps users into **those** apps, not into an unknown “KasPump on Base.” If we have not used Base app / Farcaster enough to know those names, we do not have a Base customer. Shipping there anyway is the Four.meme mistake with a nicer onramp.

Base is only alive if we can name the **room** (Farcaster channel, Base app circle, specific creators) and a reason they leave Zora/Clanker. “I haven’t heard of them” is not that reason.

---

## Arc: USDC-native is the clean wrap; the field is not empty

[Archon-444/ARC](https://github.com/Archon-444/ARC) (created 2025-11, last push 2026-07) is already a **token launcher + NFT marketplace** on Circle’s Arc: `ArcTokenFactory` + `ArcBondingCurveAMM`, USDC gas/payments, launch → token page → discovery. That is closer to “no wrap, dollar onramp” than Base-ETH or wKAS.

Facts that matter:

- Arc public mainnet is **2026-09-16** (about a month from this writing). Private mainnet + public testnet already exist. Gas is **USDC** (Circle docs: fund Arc testnet USDC for fees). Uniswap is a named day-one DeFi name. Graduation substrate can exist without inventing a DEX.
- Native USDC gas is the *ethos-compatible* version of the wKAS complaint: users do not wrap a volatile gas token to ape. That is a real product difference vs Base (ETH gas) and vs Kas L2s (wKAS).
- **“No competition whatsoever” is stale.** ArcLens-scale roundups already list **300+** claimed Arc projects. Launch/DEX names already in the water: **AstraPump** (one-click pad, trending among testnet meme users), **Radar DEX** (Uniswap v3 launcher, LP lock). “Empty L1” is the story every testnet farmer tells in August.
- Circle’s validator set is **Visa, Mastercard, BlackRock, DTCC…** Official use cases are payments, FX, tokenized funds — not /biz/ casinos. A Pump.fun clone may be *technically* permissionless and *socially* unwelcome. That is a risk, not a vibe.
- The ARC repo’s GAP file still talks **OpenSea-level NFT marketplace**. Founder now says NFT is dead. Believe that. A launcher buried under marketplace chrome is the same “rooms before a feed” failure as KasPump’s analytics.

Arc is a **greenfield race with a date**, not a secret. Early ≠ default. Default on new L1s is whoever is in Discord/CT the week mainnet opens.

---

## Two repos is a strategy smell

KasPump (this tree) and ARC are two incomplete launchers. Do not “keep both in case.” If Arc is the home, **this repo is a library** (wedge E for KasPump) and ARC is the product — NFT deleted, B+C thesis ported if the Arc AMM does not already pay the creator on every trade. If Base is the home, KasPump can port (DexConfig already has Base) but **must rename** and we still need a room. Dual-shipping both is how neither gets a face.

---

## The volume trap (read this twice)

You are right that a launcher with no flow is a ghost town. The mistake is thinking **BSC volume is available to us**.

- Four.meme already sits on that volume. We would own a rounding error of it.
- KaspaCom (defi.kaspa.com) is the Kaspa DeFi hub. DefiLlama-scale numbers as of this writing: TVL on the order of **~$120k**, 30-day DEX volume **~$150k**, 24h volume **hundreds of dollars**. That is a pond, not an ocean.
- KaspaCom’s “launchpad” is a **presale / batch sale**: pre-mint, whitelist, rounds, **creator withdraws the KAS raised** (2.5% platform fee). That is the *opposite* of less-rug + ongoing creator pay. It is a CEX-style raise, not a Pump.fun curve.

So:

| Path | Volume you might touch | Thesis fit |
|------|------------------------|------------|
| BSC | Huge pool, ~0% ours | **Closed** — Four.meme |
| Base, unnamed | Coinbase onramp into Zora/Clanker | Weak unless we join that room and rename |
| Kasplex/Igra | Tiny pool | **Closed** — wKAS ethos / L2 non-adoption |
| Arc launcher (no NFT) | Zero until 2026-09-16, then a land rush | Possible — USDC-native, Uniswap day-one, AstraPump already in the water |
| Keep KasPump + ARC both | Diluted | Dies twice |

Launchpads do not import another chain’s volume. Traders follow coins and a **scene**. The Kas scene will not follow us to wKAS. The Base scene already has Zora. The Arc scene does not exist yet — **that is both the opening and the trap.**

**Kill criterion (proposed):** if we cannot name ten people who will launch on *the chosen chain* the week it matters (Base: this month; Arc: week of 2026-09-16), we mothball. A new L1 does not invent friends.

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

### 3. Kas is closed. Base vs Arc vs stop — pick without nostalgia.

The token is still called `KRC20Token`. The product is still called KasPump. The homepage says BSC. DexConfig has no Kasplex row. There is a second repo on Arc with an NFT mall.

Kas as home for *this* product is closed (L1 can’t graduate; L2 won’t be used). Remaining:

- **Base** — only if we rename and can name the Farcaster/Base-app room. Not knowing Clanker/Zora/Flaunch is disqualifying until we have used them.
- **Arc** — USDC gas, Circle onramp, mainnet 2026-09-16, existing launcher code. Kill NFT. Expect AstraPump/Radar. Expect Circle’s bank-shaped culture. Name ten Arc Discord humans or it is another empty feed.
- **Stop (E)** — KasPump was a Kas product. The Kas version cannot exist. That is allowed.

“I want Kas community *and* a clean EVM DEX” is the sentence we just retired.

### 4. Why would a creator leave Zora, Clanker, or AstraPump?

On **Base**: Zora already pays creators (fee share on every post-coin). Clanker is one tag. Our 50% trade-fee share is only a paycheck if trades happen *here*. Empty feed = donation. Switch reason must be **cannot-rug + vested bag**, said out loud, to people who already got burned on those pads.

On **Arc**: AstraPump is already the one-click meme pad in testnet chatter. Radar already does locked-LP Uniswap v3 launches. We are not “first.” We are late-to-the-testnet. B+C has to be louder than their UI.

On **Kas**: irrelevant for this product now. KaspaCom still exists for the founder’s other life; it is not our GTM.

The remaining question is: **are we in the Arc Discord or Base app every week, or only in these repos?**

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

### 9. Will we accept a thin post-graduation pool?

On a brand-new Arc, graduation works as *code* until Uniswap (or whoever) has depth. Week-one pools will be thin. If that is unacceptable, we are not launching on a new L1 — and Base’s depth sits inside Zora/Clanker, not in our factory.

### 10. Are we willing to be a meme casino on a bank chain?

Arc’s public story is Visa / BlackRock / payments. B+C (less rug, creator pay) fits “fairer markets” better than a sniper-tax degen board. If we need /biz/ heat, Arc is the wrong room. If we need Coinbase-retail dollars with locked LP, Arc/Base are the rooms and the UI must not look like Pump.fun’s slot machine.

---

---

## What we got wrong

1. **We optimized the curve and called it product.** Linear vs sigmoid vs Simpson’s Rule never made Pump.fun. The 3-field form was the right cut. The rest of the UI still explains the protocol.
2. **We copied the category after it had a winner on the chain we chose.** Four.meme is the BSC default. A late, quieter, “fairer” clone is not a strategy.
3. **We kept a Kaspa name on a BSC meme pitch** and never locked brand, domain, or socials. That is not “parked rebrand.” That is unfinished identity.
4. **We built rooms (analytics, alerts, favorites, health scores) before a feed.** Meme launchpads are boards of coins, not Bloomberg.
5. **We treated mainnet as the milestone.** Mainnet without a wedge is a press release for a product nobody needed.
6. **We never listed distribution as a workstream.** Engineering ran for a year. GTM is still an empty Twitter string.
7. **We treated “Kaspa” as one chain.** Native KRC-20 cannot graduate. Kasplex/Igra EVM can. That distinction mattered — and then the founder correctly killed L2s on ethos. Hunting Base because native Kas had no DEX was incomplete; hunting Kasplex without asking “will Kas *use* a wrap?” was the miss.
8. **“I don’t know the competitors” was treated as empty market.** On Base it means we are tourists. On Arc it will mean we missed AstraPump.

---

## What is not a strategy

Do not disguise these as the plan:

| Idea | Why it fails as the plan |
|------|--------------------------|
| Better bonding-curve math | Invisible to users; not a switch reason |
| More features (limits, stop-loss, pairs, referrals-as-code) | Increases surface without a customer |
| Multi-chain from day one | Liquidity and attention do not split three ways at zero users |
| Port to Sui/Aptos | Move is a rewrite; does not unlock the Kas room |
| Dual-home Kas + Base “for volume” | Two empty feeds; onramp is not a scene |
| Keep NFT marketplace “while we’re at it” | Dead market; buries the launcher |
| Two launcher repos (KasPump + ARC) | Neither gets a face |
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

## Recommended default (locked: E)

**Mothball consumer KasPump.** Kas-as-home is closed until native L1 DEX without wrap. Base was never our room (we did not know Zora/Clanker/Flaunch as users). Arc is a maybe with no names — that is a no for now.

**If a future self wants to continue:** B+C is still the only thesis worth porting (creator paycheck + cannot-rug). Chain comes after ten names, not before.

---

## Next time — do not skip

Wrong fundamentals *are* a disaster recipe. The checklist that would have stopped both revivals:

1. **Ten named humans** who will launch in the next month, written down before any compile. No names = no product. “The chain will have users” is not a name.
2. **One room we already sit in weekly.** Kas community ≠ Kas L2 users. Coinbase onramp ≠ our feed. Circle mainnet day ≠ our Discord.
3. **Graduation substrate the room will actually use.** Native Kas has none for this Solidity. Wrapped L2 has one and the room refuses it. Wait for the *substrate + ethos*, not “a hardfork.”
4. **Incumbents named before we write ‘no competition.’** Four.meme, Pump.fun, Zora, Clanker, Flaunch, AstraPump, Radar. Not knowing them means we are tourists.
5. **One repo, one ritual.** Two launchers plus an NFT mall is focus failure. Kill the dead category first.
6. **Thesis in the first sentence of the UI**, or it is not the product. 50% creator fees buried in Solidity do not count.
7. **Sunk-cost is not a reason to revive.** Code ready ≠ demand. This week’s freeze exists so we do not learn this twice.

---

## Proof before product (for a future reopen only)

Do not run this now. If the reopen tests pass, evidence still comes before UI:

1. **Ten conversations** with the named customer. Notes in a private doc: why they launch where they launch, what would move them, what they called us when we described the wedge. If eight would not switch, the wedge is wrong.
2. **A closed test, not a brand launch.** Fresh testnet or a cheap mainnet you can afford to fail. Twenty coins max, people you can text. Watch: did they launch, did anyone else buy, did they share a URL, did they come back the next day.
3. **One ritual.** Feed → coin → buy, or launch → share. If that ritual needs a hero, orbs, health scores, or a sigmoid label, delete those before adding anything.
4. **Distribution as a workstream.** Handle, room, weekly presence. If nobody will be the public face, we are D or E.

Only after (1)–(3) look alive do we talk audit, Safe, subgraph, WS host, mainnet. Those are *scale* costs. They are waste if the wedge is wrong.

---

## What we stop building (mothball)

Everything that was a launch path. Feature parity, deploys, audits-as-milestone, Arc race, Kasplex rows, NFT marketplace.

Allowed: this file; leaving the library intact; a reopen that passes the tests below.

---

## Decision log (filled)

| Decision | Choice | Date | Notes |
|----------|--------|------|-------|
| Wedge | **E — mothball consumer KasPump** | 2026-08-13 | Founder: no names. Kill criterion hit. B+C remains the thesis *if* we ever return. |
| Customer (named) | **None** | 2026-08-13 | “I do not have names.” That is the answer. |
| Chain / room | **None. Kas parked; Arc unknown / not now; SOL/BSC/Base not ours** | 2026-08-13 | Kas waits on native L1 DEX without wrap, not on “a hardfork” alone. Arc: community was missing. |
| Brand | KasPump stays as archive name on a mothballed repo | | Do not rename in mothball. Rename only if a new product ships elsewhere. |
| Creator economics | Library: 50% of trade fees on-chain | 2026-08-13 | Do not change bytecode for a product we are not shipping. |
| Allocation story | Unshipped. Copy still lies if anyone deploys this. | | |
| 12-month win | **Not a consumer launchpad this year** | 2026-08-13 | Learning locked in this file. |
| Public face / distribution | Empty — accepted as fatal for v1 | 2026-08-13 | |
| Next proof | Reopen tests, not a deploy | | See below. |

### Reopen tests (all required)

KasPump consumer work restarts only if **all** of these are true:

1. Ten named people who will launch in the following month.
2. A chain whose DEX the *same* people already use, with no wrap the room rejects.
3. Incumbents listed, and a one-sentence switch reason (B+C or something sharper).
4. One repo, NFT not in scope, empty analytics/alerts until the feed lives.

Arc (separate repo) restarts only with (1)+(3)+(4) plus a weekly presence in that community *before* mainnet week.

---

## How we work from here

Stop. Read this file before touching either launcher again.

*If this file and the UI disagree, this file wins until we change it on purpose.*

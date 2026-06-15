export interface Paper {
  authors: string
  year: number
  title: string
  journal: string
  url?: string
}

export interface FactorCharacteristics {
  typicalISSharpe: string
  typicalOOSSharpe: string
  turnover: 'low' | 'medium' | 'high' | 'very-high'
  capacity: 'large' | 'medium' | 'small'
  decayHalfLifeMonths: number | null
  longOnly: boolean
}

export interface Factor {
  slug: string
  name: string
  tagline: string
  category: 'momentum' | 'value' | 'quality' | 'risk' | 'structural'
  oasSurvival: 'strong' | 'moderate' | 'weak' | 'mixed'
  overview: string
  economicIntuition: string
  overfittingNote: string
  characteristics: FactorCharacteristics
  keyPapers: Paper[]
  furtherReading: Paper[]
  alsoKnownAs: string[]
  relatedMissions: Array<{ label: string; href: string }>
  relatedAnomalies: string[]
}

export const FACTORS: Factor[] = [
  {
    slug: 'momentum',
    name: 'Momentum',
    tagline: 'Stocks that have risen keep rising — for a while.',
    category: 'momentum',
    oasSurvival: 'strong',
    overview: `Cross-sectional momentum is one of the most replicated findings in empirical finance. Stocks that have outperformed their peers over the past 2–12 months tend to continue outperforming over the next 1–6 months. Jegadeesh and Titman (1993) documented an annualized return spread of roughly 12% per year between winner and loser deciles in US equities. The effect has been confirmed in international markets, across asset classes, and across time periods extending back to the Victorian era.`,
    economicIntuition: `Three competing explanations dominate the literature. Behavioral theories attribute momentum to investor underreaction: good news is incorporated into prices too slowly, so past winners are still undervalued relative to their fundamental outlook. Overreaction theories argue the opposite — investors chase trends, pushing prices beyond fundamentals, generating short-term continuation followed by long-run reversal. Risk-based explanations posit that momentum portfolios have time-varying exposure to systematic risk factors, earning a premium for bearing crash risk. The 2008–09 momentum crash — one of the worst drawdowns in recorded financial history — lends credence to the crash-risk view.`,
    overfittingNote: `Momentum is the factor that most convincingly survives out-of-sample, both in time and across geographies. Post-publication decay is detectable but modest compared to value or size. The main risk is not data-mining but strategy crowding: as momentum becomes widely implemented, the crash risk intensifies and the Sharpe degrades during reversals. The 12-1 specification (skip the most recent month) is standard; its survival across decades and markets makes it a reliable benchmark for any alpha discovery exercise.`,
    characteristics: {
      typicalISSharpe: '0.6 – 1.0',
      typicalOOSSharpe: '0.4 – 0.7',
      turnover: 'high',
      capacity: 'medium',
      decayHalfLifeMonths: 6,
      longOnly: false,
    },
    keyPapers: [
      {
        authors: 'Jegadeesh, N., & Titman, S.',
        year: 1993,
        title: 'Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1993.tb04702.x',
      },
      {
        authors: 'Carhart, M. M.',
        year: 1997,
        title: 'On Persistence in Mutual Fund Performance',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1997.tb03808.x',
      },
      {
        authors: 'Asness, C., Moskowitz, T. J., & Pedersen, L. H.',
        year: 2013,
        title: 'Value and Momentum Everywhere',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/jofi.12021',
      },
      {
        authors: 'Daniel, K., & Moskowitz, T. J.',
        year: 2016,
        title: 'Momentum Crashes',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2016.02.009',
      },
      {
        authors: 'Fama, E. F., & French, K. R.',
        year: 1996,
        title: 'Multifactor Explanations of Asset Pricing Anomalies',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1996.tb05202.x',
      },
    ],
    furtherReading: [
      {
        authors: 'Geczy, C., & Samonov, M.',
        year: 2016,
        title: 'Two Centuries of Price-Return Momentum',
        journal: 'Financial Analysts Journal',
      },
      {
        authors: 'Israel, R., & Moskowitz, T. J.',
        year: 2013,
        title: 'The Role of Shorting, Firm Size, and Time on Market Anomalies',
        journal: 'Journal of Financial Economics',
      },
    ],
    alsoKnownAs: ['Price momentum', 'Cross-sectional momentum', '12-1 momentum', 'UMD (Up Minus Down)', 'WML (Winners Minus Losers)'],
    relatedMissions: [
      { label: 'Mission 1: Overfitting', href: '/getting-started' },
      { label: 'Mission 3: Alpha Discovery', href: '/getting-started' },
    ],
    relatedAnomalies: ['Price Momentum', 'Earnings Momentum'],
  },

  {
    slug: 'value',
    name: 'Value',
    tagline: 'Cheap stocks outperform expensive ones — on average, over long horizons.',
    category: 'value',
    oasSurvival: 'mixed',
    overview: `The value premium — the tendency of stocks with high book-to-market (B/M) ratios to outperform growth stocks — was the defining anomaly of the 1990s and underpins the Fama-French three-factor model. Fama and French (1992, 1993) showed that B/M ratio subsumes much of the cross-sectional variation in stock returns that beta alone cannot explain. The premium has been documented globally, across asset classes, and in variants using earnings yield, cash flow yield, sales-to-price, and other cheapness measures. However, value underperformed dramatically from 2007–2020, prompting debate about whether the premium has been arbitraged away or whether it is temporarily suppressed by macro conditions.`,
    economicIntuition: `Two schools of thought: (1) Risk-based — value stocks are fundamentally riskier, particularly during recessions when their distress risk peaks. Investors rationally demand compensation. (2) Behavioral — investors systematically extrapolate past growth rates, overpaying for glamour stocks and abandoning beaten-down value stocks. Mean reversion in fundamentals then rewards patient value investors. Asness et al. (2013) show that value works alongside momentum across many markets, while the two are negatively correlated, suggesting a diversification benefit. The "intangibles adjustment" literature argues that standard B/M understates value in modern R&D-intensive firms.`,
    overfittingNote: `Value is the most contested major factor for out-of-sample survival. The 2007–2020 drawdown — the longest in the factor's recorded history — raises real questions. AQR, Research Affiliates, and others have argued the premium remains alive and the period is an unusually long value winter. Critics note that rising intangible capital makes B/M increasingly stale as a cheapness measure. The lesson for researchers: a long pre-publication IS Sharpe does not guarantee OOS survival when the macro regime or market structure changes materially.`,
    characteristics: {
      typicalISSharpe: '0.4 – 0.8',
      typicalOOSSharpe: '0.1 – 0.4',
      turnover: 'low',
      capacity: 'large',
      decayHalfLifeMonths: 36,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Fama, E. F., & French, K. R.',
        year: 1992,
        title: 'The Cross-Section of Expected Stock Returns',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1992.tb04398.x',
      },
      {
        authors: 'Fama, E. F., & French, K. R.',
        year: 1993,
        title: 'Common Risk Factors in the Returns on Stocks and Bonds',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/0304-405X(93)90023-5',
      },
      {
        authors: 'Asness, C., Moskowitz, T. J., & Pedersen, L. H.',
        year: 2013,
        title: 'Value and Momentum Everywhere',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/jofi.12021',
      },
      {
        authors: 'Lakonishok, J., Shleifer, A., & Vishny, R. W.',
        year: 1994,
        title: 'Contrarian Investment, Extrapolation, and Risk',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1994.tb04772.x',
      },
    ],
    furtherReading: [
      {
        authors: 'Israel, R., Laursen, K., & Richardson, S.',
        year: 2021,
        title: 'Is (Systematic) Value Investing Dead?',
        journal: 'Journal of Portfolio Management',
      },
      {
        authors: 'Lev, B., & Srivastava, A.',
        year: 2019,
        title: 'Explaining the Recent Failure of Value Investing',
        journal: 'NYU Stern Working Paper',
      },
    ],
    alsoKnownAs: ['HML (High Minus Low)', 'Book-to-market', 'Price-to-book inverse', 'Earnings yield', 'Cash flow yield'],
    relatedMissions: [
      { label: 'Mission 3: Alpha Discovery', href: '/getting-started' },
    ],
    relatedAnomalies: ['Book-to-Market', 'Earnings-to-Price', 'Sales-to-Price'],
  },

  {
    slug: 'quality',
    name: 'Quality / Profitability',
    tagline: 'Profitable, conservatively financed firms earn persistently higher returns.',
    category: 'quality',
    oasSurvival: 'strong',
    overview: `Quality encompasses a cluster of accounting signals that distinguish resilient, fundamentally sound firms from fragile, overleveraged, or aggressively accounting firms. The core finding — that highly profitable firms earn higher future returns, controlling for price — was elegantly documented by Novy-Marx (2013), who showed gross profitability (gross profit / total assets) has roughly the same predictive power as book-to-market, with the important twist that profitability and value identify different stocks, creating complementary diversification. Fama and French (2015) formalized this into a five-factor model adding profitability (RMW) and investment (CMA) to their three-factor model.`,
    economicIntuition: `Risk-based: profitable firms with conservative investment policies are actually less risky in states of distress, but their higher quality earns a premium because aggregate risk appetite for quality varies over time. Behavioral: investors underestimate the persistence of profitability, failing to appreciate that competitive advantages erode more slowly than they predict. Sloan's (1996) accruals anomaly — the finding that high accruals predict lower returns — is a quality-adjacent effect: firms that report earnings well above their cash flows tend to underperform as earnings revert. The "quality minus junk" (QMJ) factor from AQR combines profitability, growth, safety, and payout into a composite quality score.`,
    overfittingNote: `Quality is one of the better-behaved factors post-publication. Unlike value, it did not suffer a catastrophic decade-long drawdown. Profitability signals show meaningful OOS survival, though the magnitude is lower than in the original samples. The main concern is factor zoo contamination: with 150+ quality signals in the literature, the best-performing ones in a given dataset almost certainly reflect some degree of data mining. The principle on this platform: a single well-motivated quality signal (e.g., gross profitability) is more credible than an optimized combination of twelve.`,
    characteristics: {
      typicalISSharpe: '0.5 – 0.9',
      typicalOOSSharpe: '0.3 – 0.6',
      turnover: 'low',
      capacity: 'large',
      decayHalfLifeMonths: 48,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Novy-Marx, R.',
        year: 2013,
        title: 'The Other Side of Value: The Gross Profitability Premium',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2013.01.003',
      },
      {
        authors: 'Fama, E. F., & French, K. R.',
        year: 2015,
        title: 'A Five-Factor Asset Pricing Model',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2014.10.010',
      },
      {
        authors: 'Sloan, R. G.',
        year: 1996,
        title: 'Do Stock Prices Fully Reflect Information in Accruals and Cash Flows About Future Earnings?',
        journal: 'Accounting Review',
      },
      {
        authors: 'Asness, C., Frazzini, A., & Pedersen, L. H.',
        year: 2019,
        title: 'Quality Minus Junk',
        journal: 'Review of Accounting Studies',
        url: 'https://doi.org/10.1007/s11142-018-9470-2',
      },
      {
        authors: 'Ball, R., Gerakos, J., Linnainmaa, J. T., & Nikolaev, V.',
        year: 2016,
        title: 'Accruals, Cash Flows, and Operating Profitability in the Cross Section of Stock Returns',
        journal: 'Journal of Financial Economics',
      },
    ],
    furtherReading: [
      {
        authors: 'Hou, K., Xue, C., & Zhang, L.',
        year: 2015,
        title: 'Digesting Anomalies: An Investment Approach',
        journal: 'Review of Financial Studies',
      },
    ],
    alsoKnownAs: ['RMW (Robust Minus Weak)', 'QMJ (Quality Minus Junk)', 'Gross profitability', 'Accruals anomaly', 'Investment anomaly (CMA)'],
    relatedMissions: [
      { label: 'Mission 3: Alpha Discovery', href: '/getting-started' },
    ],
    relatedAnomalies: ['Gross Profitability', 'Accruals', 'Asset Growth'],
  },

  {
    slug: 'low-volatility',
    name: 'Low Volatility',
    tagline: 'Boring stocks win. The high-volatility premium is inverted.',
    category: 'risk',
    oasSurvival: 'strong',
    overview: `The low-volatility anomaly is one of the most striking puzzles in asset pricing: stocks with low historical volatility or low market beta tend to earn higher risk-adjusted returns than high-volatility stocks, directly contradicting the CAPM's prediction that compensation should be proportional to systematic risk. Black, Jensen, and Scholes (1972) first observed that the Security Market Line is too flat. Ang et al. (2006, 2009) showed that high idiosyncratic volatility stocks dramatically underperform — a finding robust across international markets. Baker, Bradley, and Wurgler (2011) reframed this as a "volatility anomaly" and documented its persistence after institutional awareness.`,
    economicIntuition: `Several behavioral mechanisms: (1) Lottery preference — investors overpay for high-volatility stocks that offer lottery-like payoffs, suppressing their future returns. (2) Leverage constraints — institutional investors who cannot use leverage to boost returns instead tilt toward high-beta assets to hit return targets, bidding up risky stocks. Frazzini and Pedersen (2014) formalize this in their "Betting Against Beta" framework, showing that leverage-constrained investors drive excess demand for high-beta assets. (3) Benchmark hugging — active managers avoid low-volatility stocks that might cause benchmark-relative underperformance in bull markets, leaving the low-vol premium uncollected.`,
    overfittingNote: `Low volatility is one of the more robust anomalies in the factor zoo. The behavioral mechanisms are plausible and the effect persists in live implementations of min-variance and low-beta strategies. The main caveat: the factor has a persistent growth tilt (utilities, consumer staples dominate low-vol portfolios) and can suffer during growth rallies. Post-GFC, low-vol became crowded, compressing returns during 2017–2021. The OOS survival is strong but not immune to regime shifts.`,
    characteristics: {
      typicalISSharpe: '0.4 – 0.7',
      typicalOOSSharpe: '0.3 – 0.5',
      turnover: 'low',
      capacity: 'large',
      decayHalfLifeMonths: null,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Black, F., Jensen, M. C., & Scholes, M.',
        year: 1972,
        title: 'The Capital Asset Pricing Model: Some Empirical Tests',
        journal: 'Studies in the Theory of Capital Markets',
      },
      {
        authors: 'Ang, A., Hodrick, R. J., Xing, Y., & Zhang, X.',
        year: 2006,
        title: 'The Cross-Section of Volatility and Expected Returns',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.2006.00836.x',
      },
      {
        authors: 'Ang, A., Hodrick, R. J., Xing, Y., & Zhang, X.',
        year: 2009,
        title: 'High Idiosyncratic Volatility and Low Returns: International and Further U.S. Evidence',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2007.12.005',
      },
      {
        authors: 'Baker, M., Bradley, B., & Wurgler, J.',
        year: 2011,
        title: 'Benchmarks as Limits to Arbitrage: Understanding the Low-Volatility Anomaly',
        journal: 'Financial Analysts Journal',
      },
      {
        authors: 'Frazzini, A., & Pedersen, L. H.',
        year: 2014,
        title: 'Betting Against Beta',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2013.10.005',
      },
    ],
    furtherReading: [
      {
        authors: 'Clarke, R., de Silva, H., & Thorley, S.',
        year: 2006,
        title: 'Minimum-Variance Portfolios in the U.S. Equity Market',
        journal: 'Journal of Portfolio Management',
      },
    ],
    alsoKnownAs: ['BAB (Betting Against Beta)', 'Min-variance', 'Low-beta', 'Idiosyncratic volatility anomaly', 'Defensive equity'],
    relatedMissions: [
      { label: 'Mission 1: Overfitting (risk signals)', href: '/getting-started' },
    ],
    relatedAnomalies: ['Idiosyncratic Volatility', 'Betting Against Beta'],
  },

  {
    slug: 'size',
    name: 'Size',
    tagline: 'Small-cap stocks earn a premium — but it has nearly vanished.',
    category: 'structural',
    oasSurvival: 'weak',
    overview: `Banz (1981) first documented that small-cap stocks earn higher average returns than large-cap stocks, even after adjusting for CAPM beta. Fama and French (1992) incorporated size alongside book-to-market in their influential two-factor extension of the CAPM. For decades, the "small firm effect" anchored multi-factor models and justified small-cap investing as a distinct risk premia. However, the post-publication evidence has been disappointing: after adjusting for transaction costs, the size premium largely disappears in the US, and Hou and van Dijk (2019) show the premium has become statistically indistinguishable from zero in recent decades.`,
    economicIntuition: `Risk-based: small firms are more exposed to business cycle risk, have higher costs of distress, and are more vulnerable to credit tightening. Liquidity risk: small stocks are illiquid and require compensation for liquidity risk beyond what CAPM captures. Mispricing: small firms receive less analyst coverage, creating opportunities for informed trading. The modern consensus is that the pure size premium is largely an artifact of extreme microcaps (bottom decile by market cap) that are impossible to trade in size. Novy-Marx and Velikov (2015) and others show transaction costs eliminate the premium for anything other than the very smallest positions.`,
    overfittingNote: `Size is the canonical example of a factor that looked strong in the original sample but has failed decisively out-of-sample in its pure form. The lessons: (1) publication can accelerate arbitrage of a premium, (2) transaction costs must be modeled explicitly, (3) a large in-sample Sharpe ratio on a long-only factor may reflect illiquidity risk that is uncompensated net of costs. This is why the platform always reports gross-of-cost and net-of-cost metrics separately. The size interaction — small firms with high quality or high momentum — has better OOS survival than pure size.`,
    characteristics: {
      typicalISSharpe: '0.3 – 0.6',
      typicalOOSSharpe: '0.0 – 0.2',
      turnover: 'low',
      capacity: 'small',
      decayHalfLifeMonths: 12,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Banz, R. W.',
        year: 1981,
        title: 'The Relationship Between Return and Market Value of Common Stocks',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/0304-405X(81)90018-0',
      },
      {
        authors: 'Fama, E. F., & French, K. R.',
        year: 1992,
        title: 'The Cross-Section of Expected Stock Returns',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1992.tb04398.x',
      },
      {
        authors: 'Hou, K., & van Dijk, M. A.',
        year: 2019,
        title: 'Resurrecting the Size Effect: Firm Size, Profitability Shocks, and Expected Stock Returns',
        journal: 'Review of Financial Studies',
        url: 'https://doi.org/10.1093/rfs/hhy104',
      },
      {
        authors: 'Novy-Marx, R., & Velikov, M.',
        year: 2016,
        title: 'A Taxonomy of Anomalies and their Trading Costs',
        journal: 'Review of Financial Studies',
        url: 'https://doi.org/10.1093/rfs/hhv063',
      },
    ],
    furtherReading: [
      {
        authors: 'Asness, C., Frazzini, A., Israel, R., Moskowitz, T. J., & Pedersen, L. H.',
        year: 2018,
        title: 'Size Matters, if You Control Your Junk',
        journal: 'Journal of Financial Economics',
      },
    ],
    alsoKnownAs: ['SMB (Small Minus Big)', 'Small-cap premium', 'Small firm effect'],
    relatedMissions: [],
    relatedAnomalies: ['Market Cap'],
  },

  {
    slug: 'carry',
    name: 'Carry',
    tagline: 'High-yield assets outperform low-yield assets across almost every market.',
    category: 'value',
    oasSurvival: 'strong',
    overview: `Carry — earning the income embedded in an asset's current yield — is one of the oldest strategies in finance, dating to the covered interest parity literature and FX forward premium puzzles. Koijen, Moskowitz, Pedersen, and Vrugt (2018) showed that carry works not just in FX but in equities (dividend yield), fixed income (yield curve slope), commodities (futures roll yield), and credit. In equities, carry corresponds roughly to dividend yield or earnings yield, connecting it to the value literature. The universality of carry across markets and time periods makes it one of the most credible multi-asset risk premia.`,
    economicIntuition: `Carry earns a premium because it embodies compensation for bearing risk that materializes when carry unwinds suddenly — as in the 2008 FX carry crash or equity dividend cuts during recessions. The carry trade has known crash risk: high-carry assets underperform sharply during liquidity crises when investors flee to safety. This is consistent with a risk-based explanation. Behavioral explanations are also plausible: investors may underweight yield components relative to price appreciation, systematically underpricing yield-rich assets.`,
    overfittingNote: `Carry is one of the most robust premia across asset classes, and the theoretical motivation (compensation for crash risk) is well-specified enough to be credible out-of-sample. In equities, dividend yield as a factor has the advantage of being directly observable without accounting adjustments that create look-ahead bias. The main challenge for equity carry strategies is sector concentration: high-dividend-yield portfolios tend to overweight utilities and financials, creating unintended sector bets.`,
    characteristics: {
      typicalISSharpe: '0.4 – 0.7',
      typicalOOSSharpe: '0.3 – 0.6',
      turnover: 'low',
      capacity: 'large',
      decayHalfLifeMonths: null,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Koijen, R. S. J., Moskowitz, T. J., Pedersen, L. H., & Vrugt, E. B.',
        year: 2018,
        title: 'Carry',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2017.11.002',
      },
      {
        authors: 'Asness, C., Moskowitz, T. J., & Pedersen, L. H.',
        year: 2013,
        title: 'Value and Momentum Everywhere',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/jofi.12021',
      },
    ],
    furtherReading: [
      {
        authors: 'Lustig, H., Roussanov, N., & Verdelhan, A.',
        year: 2011,
        title: 'Common Risk Factors in Currency Markets',
        journal: 'Review of Financial Studies',
      },
    ],
    alsoKnownAs: ['Dividend yield', 'High yield factor', 'Income factor', 'FX carry', 'Roll yield (commodities)'],
    relatedMissions: [],
    relatedAnomalies: ['Dividend Yield'],
  },

  {
    slug: 'earnings-revisions',
    name: 'Earnings Revisions & SUE',
    tagline: 'Markets underreact to earnings news. Drift persists for months.',
    category: 'momentum',
    oasSurvival: 'moderate',
    overview: `Post-earnings announcement drift (PEAD) is the finding that stock prices continue moving in the direction of earnings surprises for weeks to months after the announcement. Ball and Brown (1968) first documented this inefficiency; Bernard and Thomas (1989) showed the drift is too large to explain by transaction costs alone, making it a genuine anomaly. Standardized Unexpected Earnings (SUE) — earnings growth relative to analyst expectations — is the most common signal. Chan, Jegadeesh, and Lakonishok (1996) showed that earnings momentum and price momentum are related but not identical, and combining them improves predictive power.`,
    economicIntuition: `The dominant explanation is behavioral: investors anchor on prior earnings levels and update too slowly to earnings surprises, causing prices to drift toward the full-information value over subsequent quarters. The effect is stronger for firms with less analyst coverage and greater information uncertainty, consistent with a slow diffusion of information story. Risk-based explanations struggle to account for the predictability's direction — firms with positive earnings surprises should be less risky post-announcement, yet they earn higher returns.`,
    overfittingNote: `PEAD has shown meaningful OOS survival since its first documentation, but the magnitude has declined. Regulatory changes (Reg FD in 2001, faster information dissemination) have compressed the window over which drift occurs. The signal works best at short horizons (1–3 months) and in smaller, less-covered stocks. In a highly efficient large-cap universe, the effect is nearly zero. This illustrates a general principle: anomalies that survive most robustly tend to be concentrated in segments where limits to arbitrage are highest.`,
    characteristics: {
      typicalISSharpe: '0.5 – 0.8',
      typicalOOSSharpe: '0.2 – 0.5',
      turnover: 'very-high',
      capacity: 'small',
      decayHalfLifeMonths: 3,
      longOnly: false,
    },
    keyPapers: [
      {
        authors: 'Ball, R., & Brown, P.',
        year: 1968,
        title: 'An Empirical Evaluation of Accounting Income Numbers',
        journal: 'Journal of Accounting Research',
      },
      {
        authors: 'Bernard, V. L., & Thomas, J. K.',
        year: 1989,
        title: 'Post-Earnings-Announcement Drift: Delayed Price Response or Risk Premium?',
        journal: 'Journal of Accounting Research',
      },
      {
        authors: 'Chan, L. K. C., Jegadeesh, N., & Lakonishok, J.',
        year: 1996,
        title: 'Momentum Strategies',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.1996.tb05222.x',
      },
    ],
    furtherReading: [
      {
        authors: 'Hou, K., Xiong, W., & Peng, L.',
        year: 2009,
        title: 'A Tale of Two Anomalies: The Implications of Investor Attention for Price and Earnings Momentum',
        journal: 'Working Paper',
      },
    ],
    alsoKnownAs: ['PEAD (Post-Earnings Announcement Drift)', 'SUE (Standardized Unexpected Earnings)', 'Earnings momentum', 'Analyst revision momentum'],
    relatedMissions: [
      { label: 'Mission 3: Alpha Discovery', href: '/getting-started' },
    ],
    relatedAnomalies: ['Earnings Surprise'],
  },

  {
    slug: 'liquidity',
    name: 'Liquidity',
    tagline: 'Illiquid stocks earn a premium for being hard to trade.',
    category: 'structural',
    oasSurvival: 'moderate',
    overview: `Investors demand compensation for holding illiquid assets because illiquidity increases transaction costs and the risk of not being able to exit a position in adverse conditions. Amihud (2002) proposed a simple illiquidity measure — average daily |return|/volume — that predicts cross-sectional and time-series stock returns. Pastor and Stambaugh (2003) showed that stocks with high sensitivity to aggregate liquidity shocks earn a premium of about 7.5% per year. Liu (2006) constructed a multi-period measure of trading continuity that also predicts returns. Together, these papers establish that liquidity risk is a priced factor distinct from size.`,
    economicIntuition: `The risk-based story is clean: liquidity risk is systematic because it spikes in market downturns when investors most need to sell. Assets with high liquidity betas lose value precisely when the marginal investor's wealth and risk tolerance are lowest — a bad combination that warrants a risk premium. Transaction costs provide a direct economic mechanism: if trading an illiquid stock costs 1–3% round-trip, the gross return premium must exceed this threshold for net returns to be positive. This creates a natural floor on how much the liquidity premium can be arbitraged.`,
    overfittingNote: `The illiquidity premium is real but inherently hard to harvest for large investors. Transaction costs in illiquid stocks often consume the entire gross premium, leaving nothing net. The premium survives post-publication precisely because it is self-limiting: any large position in illiquid stocks destroys its own premium through market impact. For small accounts (as in this platform's simulation environment), liquidity signals are implementable, but the lesson is to always model transaction costs explicitly.`,
    characteristics: {
      typicalISSharpe: '0.4 – 0.7',
      typicalOOSSharpe: '0.2 – 0.4',
      turnover: 'medium',
      capacity: 'small',
      decayHalfLifeMonths: null,
      longOnly: true,
    },
    keyPapers: [
      {
        authors: 'Amihud, Y.',
        year: 2002,
        title: 'Illiquidity and Stock Returns: Cross-Section and Time-Series Effects',
        journal: 'Journal of Financial Markets',
        url: 'https://doi.org/10.1016/S1386-4181(01)00024-6',
      },
      {
        authors: 'Pastor, L., & Stambaugh, R. F.',
        year: 2003,
        title: 'Liquidity Risk and Expected Stock Returns',
        journal: 'Journal of Political Economy',
        url: 'https://doi.org/10.1086/374184',
      },
      {
        authors: 'Liu, W.',
        year: 2006,
        title: 'A Liquidity-Augmented Capital Asset Pricing Model',
        journal: 'Journal of Financial Economics',
        url: 'https://doi.org/10.1016/j.jfineco.2005.06.001',
      },
    ],
    furtherReading: [
      {
        authors: 'Sadka, R.',
        year: 2006,
        title: 'Momentum and Post-Earnings-Announcement Drift Anomalies: The Role of Liquidity Risk',
        journal: 'Journal of Financial Economics',
      },
    ],
    alsoKnownAs: ['Amihud illiquidity', 'Liquidity risk premium', 'Bid-ask spread factor', 'Trading cost factor'],
    relatedMissions: [],
    relatedAnomalies: ['Amihud Illiquidity'],
  },

  {
    slug: 'factor-zoo',
    name: 'The Factor Zoo & Replication Crisis',
    tagline: 'With 400+ published factors, most are likely false discoveries.',
    category: 'structural',
    oasSurvival: 'weak',
    overview: `Cochrane (2011) famously asked "which factors matter?" in his AFA Presidential Address, coining the "factor zoo" problem. Harvey, Liu, and Zhu (2016) documented 316 published factors by 2012 and argued that standard statistical significance thresholds (t > 2.0) are far too permissive given the scale of multiple testing. They proposed a t-statistic hurdle of 3.0 or higher for factor claims to survive a Bonferroni-corrected multiple testing framework. McLean and Pontiff (2016) showed that anomaly returns decay by 58% after publication — consistent with both rational learning and data-mining deterioration. Hou, Xue, and Zhang (2020) attempted to replicate 452 anomalies and found only 85 significant at conventional thresholds.`,
    economicIntuition: `The problem is fundamental to any empirical science that runs many regressions on the same dataset. Given enough variables and enough researchers, some combination will look significant by chance. In finance, the situation is especially acute because: (1) financial data is relatively short (70 years of reliable US data), (2) researchers share the same datasets (CRSP, Compustat), (3) publication bias favors positive results, and (4) t-statistics are often artificially inflated by data-mining procedures that were not fully disclosed. The result is that many "discoveries" reflect sample-specific noise rather than genuine risk premia.`,
    overfittingNote: `This is the core theme of ConvexPi. The platform is built around one question: does your strategy survive out-of-sample? The factor zoo literature shows that most do not. The right mental model: treat every in-sample result as a hypothesis, not a fact. The OOS Sharpe ratio on fresh data is the only credible evidence of real alpha. Strategies that use more parameters, more indicators, and longer lookback periods are more susceptible to the multiple testing problem — even if each individual test looks conservative. Simplicity is a form of robustness.`,
    characteristics: {
      typicalISSharpe: '0.3 – 0.9 (varies widely)',
      typicalOOSSharpe: '−0.1 – 0.3 (post-publication average)',
      turnover: 'high',
      capacity: 'small',
      decayHalfLifeMonths: 12,
      longOnly: false,
    },
    keyPapers: [
      {
        authors: 'Harvey, C. R., Liu, Y., & Zhu, H.',
        year: 2016,
        title: '… and the Cross-Section of Expected Returns',
        journal: 'Review of Financial Studies',
        url: 'https://doi.org/10.1093/rfs/hhv059',
      },
      {
        authors: 'McLean, R. D., & Pontiff, J.',
        year: 2016,
        title: 'Does Academic Research Destroy Stock Return Predictability?',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/jofi.12365',
      },
      {
        authors: 'Hou, K., Xue, C., & Zhang, L.',
        year: 2020,
        title: 'Replicating Anomalies',
        journal: 'Review of Financial Studies',
        url: 'https://doi.org/10.1093/rfs/hhy131',
      },
      {
        authors: 'Cochrane, J. H.',
        year: 2011,
        title: 'Presidential Address: Discount Rates',
        journal: 'Journal of Finance',
        url: 'https://doi.org/10.1111/j.1540-6261.2011.01671.x',
      },
    ],
    furtherReading: [
      {
        authors: 'Jensen, T. I., Kelly, B., & Pedersen, L. H.',
        year: 2023,
        title: 'Is There a Replication Crisis in Finance?',
        journal: 'Journal of Finance',
      },
      {
        authors: 'Linnainmaa, J. T., & Roberts, M. R.',
        year: 2018,
        title: 'The History of the Cross-Section of Stock Returns',
        journal: 'Review of Financial Studies',
      },
    ],
    alsoKnownAs: ['Multiple testing problem', 'Data snooping', 'P-hacking in finance', 'Replication crisis', 'Anomaly decay'],
    relatedMissions: [
      { label: 'Mission 1: Overfitting', href: '/getting-started' },
      { label: 'Mission 3: Alpha Discovery', href: '/getting-started' },
    ],
    relatedAnomalies: [],
  },
]

export const FACTOR_BY_SLUG = Object.fromEntries(FACTORS.map(f => [f.slug, f]))

export const CATEGORY_LABELS: Record<string, string> = {
  momentum: 'Momentum',
  value: 'Value / Carry',
  quality: 'Quality',
  risk: 'Risk-Based',
  structural: 'Structural',
}

export const OOS_SURVIVAL_LABELS: Record<string, { label: string; color: string }> = {
  strong:   { label: 'Strong OOS survival',   color: 'text-green-700 bg-green-50 border-green-200' },
  moderate: { label: 'Moderate OOS survival',  color: 'text-amber-700 bg-amber-50 border-amber-200' },
  mixed:    { label: 'Mixed OOS evidence',     color: 'text-orange-700 bg-orange-50 border-orange-200' },
  weak:     { label: 'Weak OOS survival',      color: 'text-red-700 bg-red-50 border-red-200' },
}

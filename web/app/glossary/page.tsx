import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glossary — ConvexPi',
  description: 'Key terms in quantitative finance and factor investing, with plain-language definitions.',
}

type Term = { term: string; definition: string; related?: string[] }
type Section = { letter: string; terms: Term[] }

const TERMS: Term[] = [
  { term: 'Alpha', definition: 'Return that cannot be explained by exposure to systematic risk factors. True alpha is persistent out-of-sample; in-sample alpha is easy to manufacture by overfitting.', related: ['OOS Sharpe', 'Factor exposure', 'Overfitting'] },
  { term: 'Adverse selection', definition: 'The risk a market maker faces when trading against a counterparty who has better information. A market maker who is adversely selected loses money to informed traders.', related: ['Bid-ask spread', 'Market impact'] },
  { term: 'Annualised return', definition: 'The compound annual growth rate implied by a sequence of daily returns. Computed as (∏(1+rₜ))^(252/T) − 1 for T trading days.' },
  { term: 'Bid-ask spread', definition: 'The difference between the lowest price a seller will accept (ask) and the highest price a buyer will pay (bid). Wider spreads indicate lower liquidity or higher adverse-selection risk.', related: ['Adverse selection', 'Market impact', 'Liquidity'] },
  { term: 'Capacity', definition: 'The maximum amount of capital a strategy can deploy before its own trading moves prices enough to erode returns. Small-cap strategies typically have lower capacity than large-cap ones.' },
  { term: 'Cross-sectional ranking', definition: 'Ranking securities against each other at a single point in time, rather than comparing a security\'s current value to its own history. Most factor signals are cross-sectional.' },
  { term: 'Factor exposure', definition: 'The sensitivity of a portfolio\'s returns to a systematic risk factor (e.g. market, size, value). A factor-neutral portfolio has zero net exposure to known factors.', related: ['Alpha', 'Factor zoo'] },
  { term: 'Factor zoo', definition: 'The large and growing collection of published equity factors, many of which fail to replicate out-of-sample. Named after Harvey, Liu, and Zhu (2016).', related: ['Multiple testing', 'OOS replication'] },
  { term: 'IC (Information coefficient)', definition: 'The Spearman rank correlation between a signal\'s predicted cross-sectional returns and actual realised returns. A mean IC near zero means the signal has no predictive value.', related: ['Rolling IC', 'Signal decay'] },
  { term: 'In-sample (IS)', definition: 'The historical period used to develop or fit a strategy. IS performance is always optimistic because the strategy was designed using the same data on which it is evaluated.', related: ['OOS (out-of-sample)', 'Overfitting'] },
  { term: 'Inventory risk', definition: 'The risk a market maker accumulates by holding a one-sided position while waiting for offsetting flow. Large inventory positions create mark-to-market risk.', related: ['Adverse selection', 'Market maker'] },
  { term: 'Limit-order book', definition: 'A record of outstanding buy and sell orders at specific prices. Orders in the book are passive (they provide liquidity); market orders are aggressive (they take liquidity).' },
  { term: 'Liquidity', definition: 'The ease with which an asset can be bought or sold without moving its price. Illiquid securities have wider spreads and greater market impact.', related: ['Bid-ask spread', 'Market impact', 'Capacity'] },
  { term: 'Look-ahead bias', definition: 'Using information in a backtest that would not have been available at the time of trading. A common source is using financial data before its actual publication date.', related: ['Survivorship bias', 'Walk-forward validation'] },
  { term: 'Market impact', definition: 'The price movement caused by a trade. Large orders move prices against the trader, raising costs. Market impact grows with order size and falls with liquidity.', related: ['Capacity', 'Liquidity', 'Slippage'] },
  { term: 'Market maker', definition: 'A trader who simultaneously quotes buy and sell prices, profiting from the bid-ask spread in exchange for providing liquidity. Market makers bear adverse selection and inventory risk.', related: ['Bid-ask spread', 'Adverse selection', 'Inventory risk'] },
  { term: 'Maximum drawdown', definition: 'The largest peak-to-trough decline in cumulative returns. A measure of tail risk; strategies with high Sharpe but very large drawdowns can be difficult to hold in practice.' },
  { term: 'Multiple testing', definition: 'The increase in false discovery rate when testing many hypotheses on the same dataset. A strategy that was selected from 1000 tested strategies needs a much higher t-statistic than one tested once.', related: ['Factor zoo', 'p-value', 'Signal decay'] },
  { term: 'OOS (out-of-sample)', definition: 'Data or periods not used in strategy development. OOS performance is the only honest estimate of future performance; IS performance is always optimistic.', related: ['In-sample (IS)', 'OOS Sharpe', 'Walk-forward validation'] },
  { term: 'OOS Sharpe', definition: 'The Sharpe ratio measured on data the strategy was not designed on. The primary metric on ConvexPi; a positive OOS Sharpe is evidence (not proof) that a signal generalises.', related: ['Sharpe ratio', 'OOS (out-of-sample)', 'Overfitting ratio'] },
  { term: 'Overfitting', definition: 'Constructing a model that captures noise rather than signal in the training data. An overfit strategy has high IS performance and near-zero or negative OOS performance.', related: ['In-sample (IS)', 'OOS (out-of-sample)', 'Overfitting ratio'] },
  { term: 'Overfitting ratio', definition: 'OOS Sharpe ÷ IS Sharpe. A ratio near 1.0 means the strategy generalised well; a ratio near 0 means it overfit. Target ≥ 0.7 as a rough guide.', related: ['OOS Sharpe', 'Overfitting'] },
  { term: 'p-value', definition: 'The probability of observing a test statistic at least as extreme as the one observed, under the null hypothesis of no effect. A low p-value is necessary but not sufficient evidence — especially after multiple tests.', related: ['Multiple testing', 'Signal decay'] },
  { term: 'Rolling IC', definition: 'The information coefficient computed over a rolling window of time, showing how predictive power evolves. Decaying rolling IC suggests the signal is weakening.', related: ['IC (Information coefficient)', 'Signal decay'] },
  { term: 'Sharpe ratio', definition: 'Annualised mean return divided by annualised return volatility. A dimensionless measure of risk-adjusted performance. A Sharpe of 1.0 is considered good; above 2.0 in live trading is exceptional.', related: ['OOS Sharpe', 'Maximum drawdown'] },
  { term: 'Signal decay', definition: 'The reduction in predictive power as the holding period lengthens. A signal that is strong at 1-day horizons may be worthless at 20-day horizons.', related: ['Rolling IC', 'Turnover'] },
  { term: 'Slippage', definition: 'The difference between the expected price of a trade and the price at which it executes. Caused by market impact and latency. Slippage erodes live performance relative to backtests.', related: ['Market impact', 'Bid-ask spread'] },
  { term: 'Survivorship bias', definition: 'The error of using only securities that survived to the present day in a historical analysis, excluding those that were delisted, went bankrupt, or were acquired. Leads to overstated backtests.', related: ['Look-ahead bias', 'Universe construction'] },
  { term: 'Turnover', definition: 'The fraction of the portfolio replaced per period, typically annualised. High-turnover strategies trade more and pay more in transaction costs; they require a stronger signal to be profitable.', related: ['Signal decay', 'Market impact'] },
  { term: 'Universe construction', definition: 'The rules that define which securities are eligible for trading at each point in time. A poorly constructed universe can introduce look-ahead or survivorship bias.', related: ['Survivorship bias', 'Look-ahead bias'] },
  { term: 'Walk-forward validation', definition: 'A backtesting protocol where the model is trained only on past data and evaluated on the immediately following period, then the window rolls forward. The correct way to avoid look-ahead bias.', related: ['Look-ahead bias', 'OOS (out-of-sample)'] },
]

function groupByLetter(terms: Term[]): Section[] {
  const map = new Map<string, Term[]>()
  for (const t of terms) {
    const letter = t.term[0].toUpperCase()
    if (!map.has(letter)) map.set(letter, [])
    map.get(letter)!.push(t)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, terms]) => ({ letter, terms }))
}

export default function GlossaryPage() {
  const sections = groupByLetter(TERMS)
  const letters = sections.map(s => s.letter)

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Glossary</h1>
        <p className="text-muted-foreground text-lg">
          Key terms in quantitative finance, factor investing, and market microstructure.
        </p>
      </div>

      {/* Letter index */}
      <div className="flex flex-wrap gap-1.5 mb-10 pb-8 border-b">
        {letters.map(l => (
          <a key={l} href={`#${l}`}
            className="w-8 h-8 flex items-center justify-center rounded-md text-sm font-mono font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {l}
          </a>
        ))}
      </div>

      {/* Terms */}
      <div className="flex flex-col gap-10">
        {sections.map(section => (
          <div key={section.letter} id={section.letter}>
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4 border-b pb-2">
              {section.letter}
            </h2>
            <dl className="flex flex-col gap-6">
              {section.terms.map(t => (
                <div key={t.term} id={t.term.toLowerCase().replace(/\s+/g, '-').replace(/[()\/]/g, '')}>
                  <dt className="font-semibold text-foreground mb-1">{t.term}</dt>
                  <dd className="text-sm text-muted-foreground leading-relaxed">{t.definition}</dd>
                  {t.related && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground/60">See also:</span>
                      {t.related.map(r => (
                        <a key={r}
                          href={`#${r.toLowerCase().replace(/\s+/g, '-').replace(/[()\/]/g, '')}`}
                          className="text-xs text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
                          {r}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

// Lecture metadata — short, self-contained explainers that sit behind the missions. The notebooks
// live in the missions repo (missions/lectures/*.ipynb); these pages present each one and cross-link
// to the missions it supports.

export type Lecture = {
  slug: string
  title: string
  summary: string
  duration: string
  notebook: string // file basename in missions/lectures/
  topics: string[]
  takeaways: string[]
  relatedMissions: number[]
}

export const colabForLecture = (notebook: string) =>
  `https://colab.research.google.com/github/convexpi/missions/blob/main/lectures/${notebook}.ipynb`

export const LECTURES: Lecture[] = [
  {
    slug: 'information-coefficient',
    title: 'Evaluating a Factor: the Information Coefficient',
    summary:
      'Before you ever run a backtest, you can measure whether a signal has any predictive power ' +
      'with the Information Coefficient (IC) — the rank correlation between today’s signal and ' +
      'tomorrow’s return across the cross-section. We build a real signal and a fake one and learn ' +
      'to tell them apart.',
    duration: '20–30 min',
    notebook: 'factor_evaluation',
    topics: ['Rank IC', 'IC information ratio', 'IC decay & horizon', 'Signal vs. noise'],
    takeaways: [
      'IC is the rank correlation of a signal vs. next-period return — a positive, persistent mean IC is a real edge.',
      'Judge the IC information ratio, not a single day; real equity ICs are small (≈ 0.02–0.05).',
      'IC decay sets your holding horizon and turnover.',
      'A noise signal has ≈ zero IC — the same lesson as p-hacking, seen cross-sectionally.',
    ],
    relatedMissions: [1, 3],
  },
  {
    slug: 'p-hacking',
    title: 'p-Hacking & the Multiple-Comparisons Trap',
    summary:
      'Test enough signals and some will look brilliant by pure chance. This is the single most ' +
      'important reason backtests lie — and exactly what the ConvexPi Lab’s out-of-sample grading is ' +
      'built to catch. We manufacture the illusion, measure it, and then fix it.',
    duration: '20–30 min',
    notebook: 'p_hacking',
    topics: ['Multiple comparisons', 'Bonferroni / FDR', 'Out-of-sample validation', 'Overfitting ratio'],
    takeaways: [
      'Searching many signals inflates false positives — ≈ 5% of pure-noise signals “work” at p < 0.05.',
      'Correct for the search (Bonferroni / FDR): your effective p-value depends on how many things you tried.',
      'Out-of-sample is the ultimate judge — a signal selected for in-sample fit reverts to noise OOS.',
      'This is why the Lab grades on hidden data and reports an overfitting ratio.',
    ],
    relatedMissions: [1, 3],
  },
  {
    slug: 'stylized-facts',
    title: 'Do Our Markets Look Real? Stylized Facts',
    summary:
      'Real returns aren’t Gaussian white noise — they have heavy tails, near-zero return ' +
      'autocorrelation but persistent volatility clustering, and gain/loss asymmetry. We generate ' +
      'returns with and without these stylized facts (via finmlsim) and measure the difference — the ' +
      'same GARCH engine behind the Lab’s realistic market mode.',
    duration: '20–30 min',
    notebook: 'stylized_facts',
    topics: ['Heavy tails', 'Volatility clustering', 'Return autocorrelation', 'GARCH / finmlsim'],
    takeaways: [
      'Gaussian is a lie for returns — real tails are heavy; size risk for 5-sigma days.',
      'Direction is ≈ unpredictable, but volatility is not — clustering is the exploitable fact.',
      'Measure, don’t assume: finmlsim’s stylized-facts summary tells you if a series is honest.',
    ],
    relatedMissions: [1, 8],
  },
  {
    slug: 'optimal-execution',
    title: 'Optimal Execution: the Almgren-Chriss Frontier',
    summary:
      'Unwind a big position too fast and you pay huge market impact; too slow and you carry price ' +
      'risk the whole time. Almgren-Chriss makes the trade-off precise, and we trace its efficient ' +
      'frontier (via finmlsim) — the per-order companion to Mission 8’s portfolio-level cost of trading.',
    duration: '20–30 min',
    notebook: 'optimal_execution',
    topics: ['Market impact', 'Timing risk', 'Efficient frontier', 'Almgren-Chriss'],
    takeaways: [
      'Impact vs. timing risk is the core execution trade-off — faster cuts risk but costs impact.',
      'Risk aversion (λ) picks your point on the frontier; there is no single optimal speed.',
      'Impact is convex in size — which is why capacity (Mission 8) is finite.',
    ],
    relatedMissions: [8],
  },
]

export const getLecture = (slug: string) => LECTURES.find((l) => l.slug === slug)

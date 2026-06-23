'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { PyodideRunner } from '@/components/pyodide-runner'

interface Example { name: string; blurb: string; code: string; colab: string }

const COLAB = 'https://colab.research.google.com/github/convexpi/lab/blob/main'

const EXAMPLES: Example[] = [
  {
    name: 'Value (HML)',
    blurb: 'Reconstruct the value factor from the 6 size×B/M building-block portfolios',
    colab: `${COLAB}/notebooks/factor_reconstruction.ipynb`,
    code: `# Value (HML) — RECONSTRUCTED from the building blocks, not read off a finished factor.
# Fama & French build HML from 6 portfolios sorted on size and book-to-market.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

p = pd.read_csv(open_url("/data/ff_6_size_bm_daily.csv"))
p["date"] = pd.to_datetime(p["date"], format="%Y%m%d")
p = (p.set_index("date") / 100).dropna()

# HML = (avg of the two VALUE corners) - (avg of the two GROWTH corners)
HML = 0.5*(p["SMALL HiBM"] + p["BIG HiBM"]) - 0.5*(p["SMALL LoBM"] + p["BIG LoBM"])

# Does our recomputed factor match the published one?
ff = pd.read_csv(open_url("/data/ff_factors_daily.csv"))
ff["date"] = pd.to_datetime(ff["date"], format="%Y%m%d"); ff = ff.set_index("date")/100
print("correlation with published HML:", round(HML.corr(ff["HML"]), 4))

# Out-of-sample test (published 1993):
pub = 1993; yrs = HML.index.year
ins, oos = HML[yrs < pub], HML[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"IS Sharpe (pre-{pub}): {sharpe(ins):.2f}    OOS Sharpe: {sharpe(oos):.2f}")
print(f"decay: {1 - sharpe(oos)/sharpe(ins):.0%}")

(1 + HML).cumprod().plot(logy=True, figsize=(8, 4), title="HML — recomputed from 6 portfolios")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="published")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
  {
    name: 'Size (SMB)',
    blurb: 'Reconstruct the size factor from the same 6 portfolios (small minus big)',
    colab: `${COLAB}/notebooks/factor_reconstruction.ipynb`,
    code: `# Size (SMB) — RECONSTRUCTED from the 6 size×B/M portfolios.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

p = pd.read_csv(open_url("/data/ff_6_size_bm_daily.csv"))
p["date"] = pd.to_datetime(p["date"], format="%Y%m%d")
p = (p.set_index("date") / 100).dropna()

# SMB = (avg of the 3 SMALL portfolios) - (avg of the 3 BIG portfolios)
small = p[["SMALL LoBM", "ME1 BM2", "SMALL HiBM"]].mean(axis=1)
big   = p[["BIG LoBM",   "ME2 BM2", "BIG HiBM"]].mean(axis=1)
SMB = small - big

ff = pd.read_csv(open_url("/data/ff_factors_daily.csv"))
ff["date"] = pd.to_datetime(ff["date"], format="%Y%m%d"); ff = ff.set_index("date")/100
print("correlation with published SMB:", round(SMB.corr(ff["SMB"]), 4))

pub = 1981; yrs = SMB.index.year
ins, oos = SMB[yrs < pub], SMB[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"IS Sharpe (pre-{pub}): {sharpe(ins):.2f}    OOS Sharpe: {sharpe(oos):.2f}")

(1 + SMB).cumprod().plot(logy=True, figsize=(8, 4), title="SMB — recomputed from 6 portfolios")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="Banz 1981")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
  {
    name: 'Momentum (WML)',
    blurb: 'Reconstruct momentum from the 6 size×prior-return portfolios (winners minus losers)',
    colab: `${COLAB}/notebooks/factor_reconstruction.ipynb`,
    code: `# Momentum (WML) — RECONSTRUCTED from the 6 size×prior-return portfolios.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

p = pd.read_csv(open_url("/data/ff_6_size_mom_daily.csv"))
p["date"] = pd.to_datetime(p["date"], format="%Y%m%d")
p = (p.set_index("date") / 100).dropna()

# WML = (avg of the two WINNER corners) - (avg of the two LOSER corners)
WML = 0.5*(p["SMALL HiPRIOR"] + p["BIG HiPRIOR"]) - 0.5*(p["SMALL LoPRIOR"] + p["BIG LoPRIOR"])

mm = pd.read_csv(open_url("/data/ff_momentum_daily.csv"))
mm["date"] = pd.to_datetime(mm["date"], format="%Y%m%d"); mm = mm.set_index("date")/100
print("correlation with published Mom:", round(WML.corr(mm["Mom"]), 4))

pub = 1993; yrs = WML.index.year
ins, oos = WML[yrs < pub], WML[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"IS Sharpe (pre-{pub}): {sharpe(ins):.2f}    OOS Sharpe: {sharpe(oos):.2f}")

(1 + WML).cumprod().plot(logy=True, figsize=(8, 4), title="WML — recomputed from 6 portfolios")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="Jegadeesh-Titman 1993")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
  {
    name: 'Industry momentum',
    blurb: 'FORM a long-short book by ranking the 12 industries each month (rebalanced)',
    colab: `${COLAB}/notebooks/single_name_momentum.ipynb`,
    code: `# Industry momentum — actually FORM the portfolio: rank, go long/short, rebalance.
# (Moskowitz & Grinblatt 1999, here on the 12 Ken-French industry portfolios.)
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

ind = pd.read_csv(open_url("/data/ff_12industry_daily.csv"))
ind["date"] = pd.to_datetime(ind["date"], format="%Y%m%d")
ind = (ind.set_index("date") / 100).dropna()

# Monthly returns, then a trailing 12-month signal that skips the most recent month.
m = (1 + ind).resample("ME").prod() - 1
sig = (1 + m).rolling(12).apply(np.prod, raw=True) / (1 + m).rolling(1).apply(np.prod, raw=True) - 1

# Each month: long the top-3 industries, short the bottom-3 (equal weight).
w = pd.DataFrame(0.0, index=sig.index, columns=sig.columns)
for dt, row in sig.dropna(how="all").iterrows():
    r = row.dropna()
    if len(r) < 6: continue
    order = r.sort_values()
    w.loc[dt, order.index[-3:]] =  1/3   # winners
    w.loc[dt, order.index[:3]]  = -1/3   # losers
w = w.shift(1)                            # hold last month's book this month (no look-ahead)

daily = ind.loc[ind.index >= w.index.min()]
strat = (daily * w.reindex(daily.index, method="ffill")).sum(axis=1)

pub = 1999; yrs = strat.index.year
ins, oos = strat[yrs < pub], strat[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"IS Sharpe (pre-{pub}): {sharpe(ins):.2f}    OOS Sharpe: {sharpe(oos):.2f}")

(1 + strat).cumprod().plot(logy=True, figsize=(8, 4), title="Industry momentum — formed from 12 industries")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="published")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
]

export function Playground() {
  const [idx, setIdx] = useState(0)
  const ex = EXAMPLES[idx]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.name}
            onClick={() => setIdx(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors text-left ${
              i === idx
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
            title={e.blurb}
          >
            {e.name}
          </button>
        ))}
      </div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">{ex.blurb}</p>
        <a
          href={ex.colab}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          <ExternalLink className="h-3 w-3" /> Open in Colab (full data)
        </a>
      </div>
      {/* key forces a fresh editor when switching examples */}
      <PyodideRunner key={idx} initialCode={ex.code} />
    </div>
  )
}

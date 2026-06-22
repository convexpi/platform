'use client'

import { useState } from 'react'
import { PyodideRunner } from '@/components/pyodide-runner'

interface Example { name: string; blurb: string; code: string }

const EXAMPLES: Example[] = [
  {
    name: 'Momentum',
    blurb: 'Jegadeesh & Titman (1993) — survives, but weakened',
    code: `# Momentum (Jegadeesh & Titman, 1993) — run it out of sample.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

df = pd.read_csv(open_url("/data/ff_momentum_daily.csv"))
df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")
r = (df.set_index("date")["Mom"] / 100).dropna()

pub = 1993                                  # <- change me
yrs = r.index.year
ins, oos = r[yrs < pub], r[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"In-sample  Sharpe (pre-{pub}):   {sharpe(ins):.2f}")
print(f"Out-of-sample Sharpe (>= {pub}):  {sharpe(oos):.2f}")
print(f"Decay: {1 - sharpe(oos)/sharpe(ins):.0%}")

(1 + r).cumprod().plot(logy=True, figsize=(8, 4), title="Momentum — growth of $1")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="published")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
  {
    name: 'Value (HML)',
    blurb: 'Fama & French (1993) — over half the edge gone, the value drought',
    code: `# Value / HML (Fama & French, 1993) — the post-1993 decay and 2007-2020 drought.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

df = pd.read_csv(open_url("/data/ff_factors_daily.csv"))
df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")
r = (df.set_index("date")["HML"] / 100).dropna()

pub = 1993
yrs = r.index.year
ins, oos = r[yrs < pub], r[yrs >= pub]
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()
print(f"In-sample  Sharpe (pre-{pub}):   {sharpe(ins):.2f}")
print(f"Out-of-sample Sharpe (>= {pub}):  {sharpe(oos):.2f}")
print(f"Decay: {1 - sharpe(oos)/sharpe(ins):.0%}")

(1 + r).cumprod().plot(logy=True, figsize=(8, 4), title="Value (HML) — growth of $1")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="published")
plt.legend(); plt.tight_layout(); plt.show()
`,
  },
  {
    name: 'Size (SMB)',
    blurb: 'Banz (1981) — dormant, negative over the last decade',
    code: `# Size / SMB (Banz, 1981) — compare the three factors side by side.
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pyodide.http import open_url

df = pd.read_csv(open_url("/data/ff_factors_daily.csv"))
df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")
df = df.set_index("date") / 100
sharpe = lambda x: np.sqrt(252) * x.mean() / x.std()

for col, pub in [("SMB", 1981), ("HML", 1993)]:
    r = df[col].dropna(); yrs = r.index.year
    ins, oos = r[yrs < pub], r[yrs >= pub]
    print(f"{col}: IS {sharpe(ins):+.2f}  ->  OOS {sharpe(oos):+.2f}   (pub {pub})")

((1 + df[["SMB", "HML"]].dropna()).cumprod()).plot(logy=True, figsize=(8, 4),
                                                   title="SMB vs HML — growth of $1")
plt.tight_layout(); plt.show()
`,
  },
]

export function Playground() {
  const [idx, setIdx] = useState(0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex.name}
            onClick={() => setIdx(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors text-left ${
              i === idx
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
            title={ex.blurb}
          >
            {ex.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{EXAMPLES[idx].blurb}</p>
      {/* key forces a fresh editor when switching examples */}
      <PyodideRunner key={idx} initialCode={EXAMPLES[idx].code} />
    </div>
  )
}

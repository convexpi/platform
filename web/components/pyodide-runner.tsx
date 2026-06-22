'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useCallback } from 'react'
import { Play, Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
      Loading editor…
    </div>
  ),
})

// Pyodide is loaded from the CDN on first run. Bump this to upgrade the runtime.
const PYODIDE_VERSION = 'v0.26.4'
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full`

// Minimal surface of the Pyodide API we use.
interface Pyodide {
  loadPackage: (names: string[]) => Promise<void>
  runPython: (code: string) => unknown
  runPythonAsync: (code: string) => Promise<unknown>
  setStdout: (opts: { batched: (s: string) => void }) => void
  setStderr: (opts: { batched: (s: string) => void }) => void
}
declare global {
  interface Window {
    loadPyodide?: (cfg: { indexURL: string }) => Promise<Pyodide>
  }
}

// Boot matplotlib headless and silence plt.show so user snippets "just work".
const SETUP = `
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as plt
plt.show = lambda *a, **k: None
`

// Collect every open figure as a base64 PNG, then clear them.
const CAPTURE = `
import io, base64, matplotlib.pyplot as _plt
_imgs = []
for _n in _plt.get_fignums():
    _b = io.BytesIO()
    _plt.figure(_n).savefig(_b, format="png", bbox_inches="tight", dpi=110)
    _imgs.append(base64.b64encode(_b.getvalue()).decode())
_plt.close("all")
_imgs
`

const DEFAULT_CODE = `# Momentum factor (Jegadeesh & Titman, 1993) — run it OUT OF SAMPLE.
# Split the return stream at the publication year (the McLean & Pontiff test)
# and ask the only honest question: did the edge survive?
import pandas as pd, numpy as np
import matplotlib.pyplot as plt
from pyodide.http import open_url

df = pd.read_csv(open_url("/data/ff_momentum_daily.csv"))
df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")
r = (df.set_index("date")["Mom"] / 100).dropna()   # Ken-French data is in percent

pub = 1993                                          # <- change me: try 1990, 2005, ...
yrs = r.index.year
ins, oos = r[yrs < pub], r[yrs >= pub]

def sharpe(x): return np.sqrt(252) * x.mean() / x.std()

print(f"In-sample  Sharpe (pre-{pub}):   {sharpe(ins):.2f}")
print(f"Out-of-sample Sharpe (>= {pub}):  {sharpe(oos):.2f}")
print(f"Decay: {1 - sharpe(oos)/sharpe(ins):.0%} of the edge lost after publication")

(1 + r).cumprod().plot(logy=True, figsize=(8, 4),
                       title="Momentum — growth of $1 (log scale)")
plt.axvline(pd.Timestamp(f"{pub}-01-01"), color="crimson", ls="--", label="published")
plt.legend(); plt.tight_layout(); plt.show()
`

export function PyodideRunner({ initialCode = DEFAULT_CODE }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode)
  const [output, setOutput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'booting' | 'running'>('idle')
  const [copied, setCopied] = useState(false)
  const pyRef = useRef<Pyodide | null>(null)
  const outRef = useRef('')

  const ensurePyodide = useCallback(async (): Promise<Pyodide> => {
    if (pyRef.current) return pyRef.current
    setStatus('booting')
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script')
        s.src = `${PYODIDE_CDN}/pyodide.js`
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Failed to load Pyodide from CDN'))
        document.head.appendChild(s)
      })
    }
    const py = await window.loadPyodide!({ indexURL: `${PYODIDE_CDN}/` })
    await py.loadPackage(['numpy', 'pandas', 'matplotlib'])
    py.setStdout({ batched: (s) => { outRef.current += s + '\n'; setOutput(outRef.current) } })
    py.setStderr({ batched: (s) => { outRef.current += s + '\n'; setOutput(outRef.current) } })
    py.runPython(SETUP)
    pyRef.current = py
    return py
  }, [])

  const run = useCallback(async () => {
    outRef.current = ''
    setOutput('')
    setImages([])
    try {
      const py = await ensurePyodide()
      setStatus('running')
      await py.runPythonAsync(code)
      const imgs = py.runPython(CAPTURE) as { toJs: () => string[] }
      setImages(imgs.toJs())
    } catch (err) {
      outRef.current += `\n${err instanceof Error ? err.message : String(err)}\n`
      setOutput(outRef.current)
    } finally {
      setStatus('idle')
    }
  }, [code, ensurePyodide])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [code])

  const busy = status !== 'idle'

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
        <span className="text-xs font-mono text-muted-foreground">Python · runs in your browser</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
          <Button size="sm" onClick={run} disabled={busy} className="h-7 px-3 text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            <span className="ml-1">
              {status === 'booting' ? 'Booting Python…' : status === 'running' ? 'Running…' : 'Run'}
            </span>
          </Button>
        </div>
      </div>

      <MonacoEditor
        height="340px"
        defaultLanguage="python"
        value={code}
        onChange={(v) => setCode(v ?? '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 10 },
        }}
      />

      {(output || images.length > 0 || busy) && (
        <div className="border-t bg-black/90 text-gray-100 text-xs font-mono p-3 space-y-3 max-h-[420px] overflow-auto">
          {status === 'booting' && (
            <p className="text-amber-300">First run downloads the Python runtime (~10–15 MB) — this
              takes a few seconds. After that it&apos;s instant.</p>
          )}
          {output && <pre className="whitespace-pre-wrap leading-relaxed">{output}</pre>}
          {images.map((b64, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`data:image/png;base64,${b64}`} alt="plot output"
                 className="max-w-full rounded bg-white" />
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-t text-[11px] text-muted-foreground flex items-center gap-1">
        <ExternalLink className="h-3 w-3" />
        <span>
          Everything runs client-side via Pyodide on real Ken-French data — nothing is sent to a
          server. Edit the code and re-run; prefer a full environment? Copy it into a Colab notebook.
        </span>
      </div>
    </div>
  )
}

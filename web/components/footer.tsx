import Link from 'next/link'

const NAV_COLS = [
  {
    label: 'Learn',
    links: [
      { href: '/getting-started', label: 'Getting started' },
      { href: '/research',        label: 'Research library' },
      { href: '/anomalies',       label: 'Anomaly tracker' },
      { href: '/community',       label: 'Community' },
    ],
  },
  {
    label: 'Platform',
    links: [
      { href: '/compete',       label: 'Open problems' },
      { href: '/classroom/new', label: 'Instructor cohorts' },
      { href: '/dashboard',     label: 'Dashboard' },
      { href: '/tutor',         label: 'AI tutor' },
    ],
  },
  {
    label: 'Open Source',
    links: [
      { href: 'https://github.com/openquantplatform/openquant', label: 'GitHub', external: true },
      { href: 'https://pypi.org/project/convexpi-lab/',         label: 'PyPI — convexpi-lab', external: true },
      { href: '/research/factor-zoo',                           label: 'Factor zoo & replication' },
    ],
  },
]

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t bg-secondary/30 mt-auto">
      <div className="container mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand column */}
          <div>
            <p className="font-serif text-lg text-foreground mb-2">ConvexPi</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
              A platform for learning quantitative finance through the experimental method.
              Build strategies. Test them on data you cannot see.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://github.com/openquantplatform/openquant"
                target="_blank" rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground hover:text-foreground transition-colors">
                <GitHubIcon className="w-4 h-4" />
              </a>
              <a href="https://pypi.org/project/convexpi-lab/"
                target="_blank" rel="noopener noreferrer"
                aria-label="PyPI"
                className="text-muted-foreground hover:text-foreground transition-colors">
                <PyPIIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLS.map(col => (
            <div key={col.label}>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
                {col.label}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(({ href, label, external }) => (
                  <li key={href}>
                    {external ? (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </a>
                    ) : (
                      <Link href={href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {year} ConvexPi. Open source under the{' '}
            <a href="https://github.com/openquantplatform/openquant/blob/main/LICENSE"
              target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors">
              MIT License
            </a>.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm text-right">
            For educational purposes only. Nothing on this platform constitutes investment advice.
          </p>
        </div>
      </div>
    </footer>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function PyPIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.001 0C5.928 0 6.31 2.578 6.31 2.578l.007 2.67h5.784v.803H3.96S0 5.595 0 11.74c0 6.146 3.403 5.927 3.403 5.927h2.031v-2.85s-.11-3.403 3.347-3.403h5.763s3.239.052 3.239-3.13V3.19S18.28 0 12.001 0zM8.85 1.843a1.01 1.01 0 110 2.022 1.01 1.01 0 010-2.022zM11.999 24c6.073 0 5.691-2.578 5.691-2.578l-.007-2.67h-5.784v-.803h8.141S24 18.405 24 12.26c0-6.146-3.403-5.927-3.403-5.927h-2.031v2.85s.11 3.403-3.347 3.403H9.456s-3.239-.052-3.239 3.13V20.81S5.72 24 12 24zm3.151-1.843a1.01 1.01 0 110-2.022 1.01 1.01 0 010 2.022z" />
    </svg>
  )
}

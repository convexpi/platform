import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'About — ConvexPi',
  description:
    'ConvexPi is an open platform for empirical finance — learn the methods, experiment against hidden holdouts and live markets, and contribute to a shared research commons. Join us.',
}

const ORG = 'https://github.com/convexpi'

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-14 max-w-3xl">

      {/* Mission */}
      <section className="mb-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#C9A34E] uppercase mb-3">Our mission</p>
        <h1 className="font-serif text-4xl lg:text-5xl text-foreground leading-tight mb-6">
          Make quantitative finance empirical again.
        </h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed text-lg">
          <p>
            Most of finance education — and a lot of finance research — rewards the wrong thing: a
            backtest that looks brilliant on the data it was fit to. ConvexPi is built around the only
            question that matters, <em>does it work on data you have never seen?</em>
          </p>
          <p>
            We teach the discipline of honest, out-of-sample evaluation, and we build the tools to
            practice it in the open: a simulation-first curriculum, a research library that is candid
            about which anomalies survive and which decayed after publication, an in-browser playground,
            a live market arena, and an open package of verified strategy replications. The grader, the
            data pipeline, the benchmark logic — all open, so students can inspect the machinery,
            instructors can adapt it, and researchers can extend it.
          </p>
        </div>
      </section>

      {/* Join us */}
      <section className="mb-14 rounded-xl border border-border bg-secondary/40 p-7">
        <h2 className="font-serif text-2xl text-foreground mb-3">Join us</h2>
        <p className="text-muted-foreground leading-relaxed mb-5">
          ConvexPi is built in the open, and it gets better with every contributor. However you like to
          work, there&apos;s a way in:
        </p>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            ['Learn', 'Start with Mission 1 and work through the curriculum, the research library, and the playground.', '/getting-started'],
            ['Compete', 'Submit a strategy or a live agent to the open ladder and rolling seasons — scored honestly out of sample.', '/compete'],
            ['Replicate', 'Add a reference replication of a canonical strategy (fork → PR → CI). Multiple takes welcome.', `${ORG}/replications`],
            ['Edit the wikis', 'Improve a paper wiki, or write one that does not exist yet. Earn reputation and badges.', '/papers'],
          ].map(([t, d, href]) => (
            <div key={t}>
              <p className="font-semibold text-foreground mb-0.5">{t}</p>
              <p className="text-muted-foreground leading-relaxed">
                {d}{' '}
                {href.startsWith('http')
                  ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#C9A34E] hover:text-[#b8922d] whitespace-nowrap">→</a>
                  : <Link href={href} className="text-[#C9A34E] hover:text-[#b8922d] whitespace-nowrap">→</Link>}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-5">
          See the whole open-source stack at{' '}
          <a href={ORG} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">github.com/convexpi</a>{' '}
          and the <Link href="/contributors" className="underline underline-offset-4 hover:text-foreground">contributors leaderboard</Link>.
        </p>
      </section>

      {/* Support */}
      <section className="mb-14">
        <h2 className="font-serif text-2xl text-foreground mb-3">Support the project</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          ConvexPi is free and open source. The best ways to support it:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="text-[#C9A34E]">★</span>
            <span><strong className="text-foreground">Star and share the repos</strong> on{' '}
              <a href={ORG} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">GitHub</a> — it genuinely helps others find the work.</span></li>
          <li className="flex gap-2"><span className="text-[#C9A34E]">✎</span>
            <span><strong className="text-foreground">Contribute</strong> a replication, a wiki, or a fix — the commons grows by hand.</span></li>
          <li className="flex gap-2"><span className="text-[#C9A34E]">🎓</span>
            <span><strong className="text-foreground">Teach with it</strong> — run a cohort for your course, or tell a colleague who might.</span></li>
          <li className="flex gap-2"><span className="text-[#C9A34E]">✉</span>
            <span><strong className="text-foreground">Get in touch</strong> if you&apos;d like to partner, sponsor, or help in another way — details below.</span></li>
        </ul>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20">
        <h2 className="font-serif text-2xl text-foreground mb-3">Get in touch</h2>
        <p className="text-muted-foreground leading-relaxed mb-5">
          Questions, ideas, feedback, or want to get involved? Send a note — it reaches us at{' '}
          <a href="mailto:hello@convexpi.ai" className="underline underline-offset-4 hover:text-foreground">hello@convexpi.ai</a>.
        </p>
        <ContactForm />
      </section>
    </div>
  )
}

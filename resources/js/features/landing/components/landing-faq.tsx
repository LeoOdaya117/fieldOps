import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ScrollReveal } from '@/components/scroll-reveal';
import { cn } from '@/lib/utils';
import { landingFaqs } from '../data';

export function LandingFaq() {
    const [openId, setOpenId] = useState<string | null>(
        landingFaqs[0]?.id ?? null,
    );

    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-20 border-t border-border bg-muted/20"
        >
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-24">
                <ScrollReveal className="max-w-md" direction="left">
                    <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                        Frequently asked questions
                    </p>
                    <h2
                        id="faq-heading"
                        className="mt-5 text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-4xl"
                    >
                        Everything you need to know before your first rollout.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        Still deciding? Our team can help you map FieldOps to
                        the way your crews, assets, and work already move.
                    </p>
                    <a
                        href="/resources#faqs"
                        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-extrabold text-brand transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brand/50 motion-reduce:transition-none"
                    >
                        Browse the resource center
                        <span aria-hidden="true">→</span>
                    </a>
                    <p className="mt-8 border-l-2 border-brand pl-4 text-sm leading-6 text-muted-foreground">
                        Start with one useful workflow. Expand when your team is
                        ready.
                    </p>
                </ScrollReveal>

                <ScrollReveal
                    className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm"
                    direction="right"
                    delay={100}
                >
                    {landingFaqs.map((faq) => {
                        const isOpen = openId === faq.id;
                        const panelId = `faq-panel-${faq.id}`;

                        return (
                            <div
                                key={faq.id}
                                className={cn(
                                    'relative px-5 transition-colors sm:px-6',
                                    isOpen && 'bg-brand/[0.04]',
                                )}
                            >
                                {isOpen && (
                                    <span className="absolute inset-y-0 left-0 w-1 bg-brand" />
                                )}
                                <button
                                    type="button"
                                    aria-controls={panelId}
                                    aria-expanded={isOpen}
                                    className="flex min-h-16 w-full items-center justify-between gap-5 py-5 text-left text-sm font-extrabold text-foreground transition-colors hover:text-brand focus-visible:text-brand"
                                    onClick={() =>
                                        setOpenId(isOpen ? null : faq.id)
                                    }
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        className={cn(
                                            'size-5 shrink-0 text-brand transition-transform duration-300 motion-reduce:transition-none',
                                            isOpen && 'rotate-180',
                                        )}
                                        aria-hidden="true"
                                    />
                                </button>
                                <div
                                    id={panelId}
                                    aria-hidden={!isOpen}
                                    className={cn(
                                        'grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none',
                                        isOpen
                                            ? 'grid-rows-[1fr] pb-5 opacity-100'
                                            : 'pointer-events-none grid-rows-[0fr] opacity-0',
                                    )}
                                >
                                    <div className="min-h-0 overflow-hidden">
                                        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </ScrollReveal>
            </div>
        </section>
    );
}

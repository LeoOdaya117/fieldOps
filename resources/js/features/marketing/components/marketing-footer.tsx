import { ArrowRight } from 'lucide-react';
import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

const footerLinkClass =
    'transition-colors hover:text-primary-foreground focus-visible:text-primary-foreground';

export function MarketingFooter() {
    return (
        <footer className="bg-primary text-primary-foreground">
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.1fr_2fr_1fr] lg:px-8">
                <div className="max-w-xs">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5"
                        aria-label="FieldOps home"
                    >
                        <span className="flex size-9 items-center justify-center">
                            <AppLogoIcon
                                className="size-8"
                                aria-hidden="true"
                            />
                        </span>
                        <span className="text-lg font-extrabold tracking-tight">
                            FIELDOPS
                        </span>
                    </Link>
                    <p className="mt-5 text-sm leading-6 text-primary-foreground/75">
                        The all-in-one platform for managing field operations,
                        assets, inspections, and issues.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs sm:grid-cols-4">
                    <div>
                        <h2 className="font-extrabold">Product</h2>
                        <div className="mt-4 grid gap-3 text-primary-foreground/70">
                            <Link href="/features" className={footerLinkClass}>
                                Features
                            </Link>
                            <Link href="/solutions" className={footerLinkClass}>
                                Solutions
                            </Link>
                            <Link
                                href="/industries"
                                className={footerLinkClass}
                            >
                                Industries
                            </Link>
                            <Link href="/pricing" className={footerLinkClass}>
                                Pricing
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-extrabold">Resources</h2>
                        <div className="mt-4 grid gap-3 text-primary-foreground/70">
                            <Link
                                href="/resources#documentation"
                                className={footerLinkClass}
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/resources#stories"
                                className={footerLinkClass}
                            >
                                Customer stories
                            </Link>
                            <Link
                                href="/resources#faqs"
                                className={footerLinkClass}
                            >
                                FAQs
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-extrabold">Company</h2>
                        <div className="mt-4 grid gap-3 text-primary-foreground/70">
                            <Link href="/about" className={footerLinkClass}>
                                About Us
                            </Link>
                            <Link
                                href="/about#careers"
                                className={footerLinkClass}
                            >
                                Careers
                            </Link>
                            <Link
                                href="/about#story"
                                className={footerLinkClass}
                            >
                                Our story
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-extrabold">Get started</h2>
                        <div className="mt-4 grid gap-3 text-primary-foreground/70">
                            <Link href="/register" className={footerLinkClass}>
                                Start free
                            </Link>
                            <Link href="/login" className={footerLinkClass}>
                                Log in
                            </Link>
                            <Link href="/about" className={footerLinkClass}>
                                Contact us
                            </Link>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="font-extrabold">Stay updated</h2>
                    <p className="mt-4 text-xs text-primary-foreground/75">
                        Get useful field operations ideas in your inbox.
                    </p>
                    <div className="mt-4 flex overflow-hidden rounded-md border border-primary-foreground/30">
                        <label
                            htmlFor="marketing-footer-email"
                            className="sr-only"
                        >
                            Email address
                        </label>
                        <input
                            id="marketing-footer-email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-primary-foreground outline-none placeholder:text-primary-foreground/55"
                        />
                        <button
                            type="button"
                            aria-label="Subscribe"
                            className="flex size-9 items-center justify-center bg-brand text-brand-foreground transition-[transform,background-color] hover:bg-brand/90 motion-reduce:transition-none"
                        >
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="border-t border-primary-foreground/15">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-4 text-[10px] text-primary-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>
                        © {new Date().getFullYear()} FieldOps. All rights
                        reserved.
                    </p>
                    <div className="flex gap-5">
                        <Link href="/about#privacy" className={footerLinkClass}>
                            Privacy Policy
                        </Link>
                        <Link href="/about#terms" className={footerLinkClass}>
                            Terms of Service
                        </Link>
                        <Link
                            href="/about#security"
                            className={footerLinkClass}
                        >
                            Security
                        </Link>
                    </div>
                    <p>Made for the teams keeping the world moving.</p>
                </div>
            </div>
        </footer>
    );
}

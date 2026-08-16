import type { LucideIcon } from 'lucide-react';

export type LandingNavItem = {
    label: string;
    href: string;
    hasDropdown?: boolean;
    children?: LandingNavChild[];
};

export type LandingNavChild = {
    label: string;
    href: string;
    description: string;
    icon: LucideIcon;
};

export type LandingFeature = {
    icon: LucideIcon;
    title: string;
    description: string;
};

export type LandingStat = {
    value: string;
    label: string;
};

export type LandingTestimonial = {
    quote: string;
    name: string;
    role: string;
    organization: string;
};

export type LandingPlan = {
    name: string;
    price: string;
    description: string;
    features: string[];
    actionLabel?: string;
    featured?: boolean;
};

export type LandingFaqItem = {
    id: string;
    question: string;
    answer: string;
};

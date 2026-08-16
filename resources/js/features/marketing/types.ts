import type { LucideIcon } from 'lucide-react';

export type MarketingCard = {
    icon: LucideIcon;
    title: string;
    description: string;
    href?: string;
};

export type MarketingSection = {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    cards: MarketingCard[];
    visual?: {
        icon: LucideIcon;
        label: string;
        title: string;
        detail: string;
    };
};

export type MarketingHeroVariant =
    'platform' | 'field' | 'industry' | 'pricing' | 'resources' | 'about';

export type MarketingHeroPanel = {
    eyebrow: string;
    title: string;
    description?: string;
    items: { label: string; detail: string }[];
};

export type MarketingPageConfig = {
    eyebrow: string;
    title: string;
    description: string;
    heroVariant: MarketingHeroVariant;
    heroPanel: MarketingHeroPanel;
    heroImage?: string;
    heroImageAlt?: string;
    stats: { value: string; label: string }[];
    sections: MarketingSection[];
    ctaTitle: string;
    ctaDescription: string;
};

import {
    BarChart3,
    BookOpen,
    ClipboardCheck,
    ClipboardList,
    CircleHelp,
    Construction,
    Droplets,
    HardHat,
    Landmark,
    MapPinned,
    Newspaper,
    PackageOpen,
    TriangleAlert,
} from 'lucide-react';
import type {
    LandingFeature,
    LandingFaqItem,
    LandingNavItem,
    LandingPlan,
    LandingStat,
    LandingTestimonial,
} from './types';

export const landingAssets = {
    heroBackground: '/images/landing/hero-background.png',
    midSectionBackground: '/images/landing/mid-section-background.png',
    footerBackground: '/images/landing/footer-background.png',
    heroDashboard: '/images/landing/laptop-dashboard-transparent.png',
    fieldWorkerTablet: '/images/landing/field-worker-tablet-hd.png',
    fieldWorkerServiceVan: '/images/landing/field-worker-service-van-hd.png',
    ctaMobileCard: '/images/landing/cta-mobile-card-hd.png',
} as const;

export const landingNavigation = [
    {
        label: 'Features',
        href: '/features',
        hasDropdown: true,
        children: [
            {
                label: 'Work Order Management',
                href: '/features#work-orders',
                description: 'Plan, assign, and close every job.',
                icon: ClipboardList,
            },
            {
                label: 'Asset Management',
                href: '/features#assets',
                description: 'Keep asset history and context connected.',
                icon: PackageOpen,
            },
            {
                label: 'Reports & Analytics',
                href: '/features#analytics',
                description: 'Turn field activity into better decisions.',
                icon: BarChart3,
            },
        ],
    },
    {
        label: 'Solutions',
        href: '/solutions',
        hasDropdown: true,
        children: [
            {
                label: 'Field Operations',
                href: '/solutions#field-operations',
                description: 'Give every crew a clear next step.',
                icon: ClipboardCheck,
            },
            {
                label: 'Facilities Management',
                href: '/solutions#facilities',
                description: 'Coordinate sites, requests, and vendors.',
                icon: Construction,
            },
            {
                label: 'Public Works',
                href: '/solutions#public-works',
                description: 'Keep essential services moving.',
                icon: Landmark,
            },
        ],
    },
    {
        label: 'Industries',
        href: '/industries',
        hasDropdown: true,
        children: [
            {
                label: 'Utilities',
                href: '/industries#utilities',
                description: 'Make every service call accountable.',
                icon: MapPinned,
            },
            {
                label: 'Construction',
                href: '/industries#construction',
                description: 'Connect field progress to project plans.',
                icon: HardHat,
            },
            {
                label: 'Water & Wastewater',
                href: '/industries#water',
                description: 'Protect critical infrastructure.',
                icon: Droplets,
            },
        ],
    },
    { label: 'Pricing', href: '/pricing' },
    {
        label: 'Resources',
        href: '/resources',
        hasDropdown: true,
        children: [
            {
                label: 'Documentation',
                href: '/resources#documentation',
                description: 'Get your team moving quickly.',
                icon: BookOpen,
            },
            {
                label: 'Customer Stories',
                href: '/resources#stories',
                description: 'See how teams use FieldOps every day.',
                icon: Newspaper,
            },
            {
                label: 'FAQs',
                href: '/resources#faqs',
                description: 'Find answers before you get started.',
                icon: CircleHelp,
            },
        ],
    },
    { label: 'About Us', href: '/about' },
] satisfies LandingNavItem[];

export const landingFeatures = [
    {
        icon: ClipboardList,
        title: 'Work Order Management',
        description:
            'Create, assign, and track work orders from start to finish.',
    },
    {
        icon: MapPinned,
        title: 'Interactive Map View',
        description:
            'Visualize assets, work orders, and team locations in real-time.',
    },
    {
        icon: PackageOpen,
        title: 'Asset Management',
        description:
            'Track asset details, location, maintenance, and service history.',
    },
    {
        icon: ClipboardCheck,
        title: 'Inspection Management',
        description: 'Conduct inspections with checklists and attachments.',
    },
    {
        icon: TriangleAlert,
        title: 'Issue Tracking',
        description:
            'Report issues, monitor statuses, and ensure timely resolution.',
    },
    {
        icon: BarChart3,
        title: 'Reports & Analytics',
        description:
            'Generate insights and export reports to make data-driven decisions.',
    },
] satisfies LandingFeature[];

export const landingStats = [
    { value: '500+', label: 'Organizations Trust Us' },
    { value: '50K+', label: 'Work Orders Completed' },
    { value: '10K+', label: 'Assets Managed' },
    { value: '98%', label: 'Customer Satisfaction' },
] satisfies LandingStat[];

export const landingTestimonials = [
    {
        quote: 'FieldOps has transformed how we manage our field operations. Our team is more productive and issues are resolved faster.',
        name: 'John D.',
        role: 'Operations Manager',
        organization: 'AquaTex',
    },
    {
        quote: 'The real-time visibility and easy-to-use mobile app make a huge difference for our technicians in the field.',
        name: 'Sarah M.',
        role: 'Facilities Director',
        organization: 'BuildCore',
    },
    {
        quote: 'We finally have one reliable source of truth for every crew, asset, and work order.',
        name: 'Maria R.',
        role: 'Public Works Lead',
        organization: 'GreenCity',
    },
] satisfies LandingTestimonial[];

export const landingPlans = [
    {
        name: 'Starter',
        price: '$29',
        description: 'For small teams building a reliable field rhythm.',
        features: [
            'Work order management',
            'Team activity timeline',
            'Mobile field access',
            'Email support',
        ],
        actionLabel: 'Get Started',
    },
    {
        name: 'Professional',
        price: '$59',
        description: 'For growing operations that need more control.',
        features: [
            'Everything in Starter',
            'Map and asset context',
            'Inspection workflows',
            'Reports and analytics',
        ],
        actionLabel: 'Get Started',
        featured: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        description: 'For complex operations with shared accountability.',
        features: [
            'Everything in Professional',
            'Advanced permissions',
            'Implementation guidance',
            'Dedicated support',
        ],
        actionLabel: 'Contact Sales',
    },
] satisfies LandingPlan[];

export const trustedOrganizations = [
    'AquaTex',
    'BuildCore',
    'GreenCity',
    'InfraWorks',
    'Metro Facilities',
];

export const landingFaqs = [
    {
        id: 'what-is-fieldops',
        question: 'What is FieldOps?',
        answer: 'FieldOps is an all-in-one platform for planning work, coordinating field teams, managing assets, and turning completed work into reliable operational insight.',
    },
    {
        id: 'who-is-fieldops-for',
        question: 'Who is FieldOps built for?',
        answer: 'FieldOps is built for operations leaders and field teams in utilities, facilities, construction, water, wastewater, public works, and other asset-heavy organizations.',
    },
    {
        id: 'mobile-access',
        question: 'Can teams use FieldOps from the field?',
        answer: 'Yes. Field teams can review assignments, update work orders, complete inspections, and capture notes from a mobile-ready experience designed for real-world connectivity.',
    },
    {
        id: 'implementation',
        question: 'How quickly can we get started?',
        answer: 'Most teams begin with a focused workflow, import their core assets and users, and expand from there. Our onboarding path keeps the first useful result close at hand.',
    },
    {
        id: 'pricing-change',
        question: 'Can we change plans as our team grows?',
        answer: 'Yes. Start with the plan that fits today and move up as your operation needs more automation, reporting, permissions, or support.',
    },
] satisfies LandingFaqItem[];

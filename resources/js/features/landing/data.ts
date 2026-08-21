import {
    BarChart3,
    BookOpen,
    ClipboardCheck,
    ClipboardList,
    CloudOff,
    CircleHelp,
    Camera,
    FileText,
    Construction,
    Droplets,
    HardHat,
    Landmark,
    MapPinned,
    Newspaper,
    PackageOpen,
    RefreshCw,
    Send,
    ShieldCheck,
    UsersRound,
    TriangleAlert,
} from 'lucide-react';
import type {
    LandingCapability,
    LandingNavItem,
    LandingMapJob,
    LandingMetric,
    LandingWorkflowStep,
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

export const landingJourneyNavigation = [
    { label: 'Platform', href: '#platform' },
    { label: 'Offline', href: '#offline' },
    { label: 'Mapping', href: '#mapping' },
    { label: 'Reporting', href: '#reporting' },
] as const;

export const landingWorkflowSteps = [
    {
        id: 'assign',
        label: '01 / Assign',
        title: 'Put the next job in motion.',
        description:
            'Dispatchers assign work with the right owner, priority, location, and context attached.',
        icon: Send,
        tone: 'brand',
    },
    {
        id: 'download',
        label: '02 / Download',
        title: 'Carry the work with you.',
        description:
            'Crews keep their assignments, forms, maps, and asset history available before they leave signal.',
        icon: CloudOff,
        tone: 'info',
    },
    {
        id: 'work',
        label: '03 / Work offline',
        title: 'Keep moving without a connection.',
        description:
            'Update status, complete checklists, and document the job even when the network drops away.',
        icon: ClipboardCheck,
        tone: 'warning',
    },
    {
        id: 'capture',
        label: '04 / Capture',
        title: 'Make the result verifiable.',
        description:
            'Attach notes, photos, signatures, and location-aware evidence while the work is happening.',
        icon: Camera,
        tone: 'success',
    },
    {
        id: 'sync',
        label: '05 / Sync',
        title: 'Reconnect without rework.',
        description:
            'Queued updates synchronize automatically when service returns, keeping the record complete.',
        icon: RefreshCw,
        tone: 'info',
    },
    {
        id: 'resolve',
        label: '06 / Resolve',
        title: 'Give the office a clear next move.',
        description:
            'Supervisors see what changed, what needs attention, and what is ready to close.',
        icon: ShieldCheck,
        tone: 'brand',
    },
] satisfies LandingWorkflowStep[];

export const landingCapabilities = [
    {
        icon: ClipboardList,
        title: 'Jobs with context',
        description: 'Create, prioritize, assign, and track every work order.',
        detail: 'Owners, locations, assets, due dates, and history stay connected from dispatch to closeout.',
    },
    {
        icon: TriangleAlert,
        title: 'Issues that move',
        description: 'Turn a field observation into an owned next step.',
        detail: 'Document the issue, route it to the right person, and keep resolution visible to everyone involved.',
    },
    {
        icon: FileText,
        title: 'Reports people trust',
        description:
            'Capture structured updates without slowing the crew down.',
        detail: 'Forms, checklists, notes, and signatures create a consistent record for review and follow-up.',
    },
    {
        icon: MapPinned,
        title: 'Location as context',
        description: 'See work, assets, and teams where they actually are.',
        detail: 'Map views help supervisors prioritize nearby work and give crews the context around each site.',
    },
    {
        icon: UsersRound,
        title: 'Teams in rhythm',
        description: 'Keep office and field handoffs unambiguous.',
        detail: 'Everyone works from the same activity trail, with clear ownership and fewer status-chasing calls.',
    },
    {
        icon: BarChart3,
        title: 'A clearer operating picture',
        description:
            'Turn daily activity into decisions that improve the next day.',
        detail: 'Track completion, response, issue trends, and evidence quality across the operation.',
    },
] satisfies LandingCapability[];

export const landingMapJobs = [
    {
        id: 'WO-0056-0128',
        title: 'Valve inspection',
        location: 'Main St. Pump Station',
        status: 'In progress',
        priority: 'High',
        top: '27%',
        left: '64%',
    },
    {
        id: 'WO-0056-0127',
        title: 'Catch basin clean',
        location: 'Coach Basin 15',
        status: 'Assigned',
        priority: 'Medium',
        top: '55%',
        left: '33%',
    },
    {
        id: 'WO-0056-0126',
        title: 'Meter assembly',
        location: 'Lift Station 4',
        status: 'Needs review',
        priority: 'Low',
        top: '70%',
        left: '72%',
    },
] satisfies LandingMapJob[];

export const landingMetrics = [
    { value: '128', label: 'active work orders', trend: '+12% from last week' },
    { value: '73', label: 'completed today', trend: '+8% from last week' },
    { value: '18', label: 'need attention', trend: '-3% from last week' },
] satisfies LandingMetric[];

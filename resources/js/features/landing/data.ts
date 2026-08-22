import {
    BarChart3,
    ClipboardCheck,
    ClipboardList,
    CloudOff,
    Camera,
    FileCheck2,
    MapPinned,
    RefreshCw,
    Send,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';
import type {
    LandingFaq,
    LandingOutcome,
    LandingTourStep,
    LandingWorkflowStep,
} from './types';

export const landingAssets = {
    heroBackground: '/images/landing/hero-background.png',
    heroDashboard: '/images/landing/laptop-dashboard-transparent.png',
    fieldWorkerTablet: '/images/landing/field-worker-tablet-hd.png',
    fieldWorkerServiceVan: '/images/landing/field-worker-service-van-hd.png',
    ctaMobileCard: '/images/landing/cta-mobile-card-hd.png',
} as const;

export const landingJourneyNavigation = [
    { label: 'Product tour', href: '#tour' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Offline', href: '#offline' },
    { label: 'Outcomes', href: '#outcomes' },
    { label: 'FAQ', href: '#faq' },
] as const;

export const landingTourSteps = [
    {
        id: 'dispatch',
        label: 'Dispatch',
        eyebrow: 'Office control',
        title: 'Turn incoming work into a clear plan.',
        description:
            'Prioritize requests, connect the right location and asset, then assign each job with the context the crew needs.',
        icon: Send,
        status: '24 active assignments',
        metric: '06',
        metricLabel: 'ready to dispatch',
    },
    {
        id: 'field',
        label: 'Field execution',
        eyebrow: 'Crew workspace',
        title: 'Give crews one dependable place to work.',
        description:
            'Technicians can review instructions, complete checklists, add evidence, and update status from the job site.',
        icon: ClipboardCheck,
        status: 'Work order in progress',
        metric: '12/12',
        metricLabel: 'checks completed',
    },
    {
        id: 'map',
        label: 'Map coordination',
        eyebrow: 'Location context',
        title: 'See where work is moving and where it is stuck.',
        description:
            'Use location, priority, and crew status together to coordinate nearby work and respond to urgent issues.',
        icon: MapPinned,
        status: '12 crews online',
        metric: '03',
        metricLabel: 'priority jobs nearby',
    },
    {
        id: 'reporting',
        label: 'Reporting',
        eyebrow: 'Operational clarity',
        title: 'Make every completion useful to the next decision.',
        description:
            'Structured field updates roll into a readable view of progress, exceptions, evidence, and team capacity.',
        icon: BarChart3,
        status: 'Operations updated just now',
        metric: '86%',
        metricLabel: 'team capacity on track',
    },
] satisfies LandingTourStep[];

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

export const landingOutcomes = [
    {
        icon: ClipboardList,
        title: 'Clear ownership',
        description:
            'Every job has an owner, priority, location, and next action that the whole team can see.',
    },
    {
        icon: CloudOff,
        title: 'Resilient field work',
        description:
            'Crews keep essential job context available when coverage is unreliable and sync when service returns.',
    },
    {
        icon: FileCheck2,
        title: 'Verifiable completion',
        description:
            'Checklists, notes, photos, and location context create a record supervisors can confidently review.',
    },
    {
        icon: UsersRound,
        title: 'Fewer status chases',
        description:
            'Office and field teams work from the same activity trail instead of reconstructing updates across calls and messages.',
    },
] satisfies LandingOutcome[];

export const landingFaqs = [
    {
        question: 'Can crews keep working without a reliable connection?',
        answer: 'FieldOps is designed around an offline-capable workflow. Crews can retain assigned work and capture updates in the field, then synchronize queued changes when connectivity returns.',
    },
    {
        question: 'What happens when a device reconnects?',
        answer: 'Queued field updates are synchronized back into the shared operating record so supervisors can review the latest status, evidence, and follow-up needs.',
    },
    {
        question: 'Who is FieldOps designed for?',
        answer: 'FieldOps connects the people coordinating work in the office with the technicians completing it in the field, while giving leaders a clear view of progress and exceptions.',
    },
    {
        question: 'Can technicians use it on mobile devices?',
        answer: 'Yes. The field experience is designed for mobile work, with focused job details, status updates, checklists, and evidence capture that remain usable at the job site.',
    },
    {
        question: 'How do we get started?',
        answer: 'Create an account, begin with the workflow that matters most to your team, and expand the operating context as your process takes shape.',
    },
] satisfies LandingFaq[];

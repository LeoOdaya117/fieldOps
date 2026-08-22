import type { LucideIcon } from 'lucide-react';

export type LandingWorkflowStep = {
    id: string;
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
    tone: 'brand' | 'info' | 'warning' | 'success';
};

export type LandingTourStep = {
    id: 'dispatch' | 'field' | 'map' | 'reporting';
    label: string;
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    status: string;
    metric: string;
    metricLabel: string;
};

export type LandingOutcome = {
    icon: LucideIcon;
    title: string;
    description: string;
};

export type LandingFaq = {
    question: string;
    answer: string;
};

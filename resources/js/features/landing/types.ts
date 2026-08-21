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

export type LandingWorkflowStep = {
    id: string;
    label: string;
    title: string;
    description: string;
    icon: LucideIcon;
    tone: 'brand' | 'info' | 'warning' | 'success';
};

export type LandingCapability = {
    icon: LucideIcon;
    title: string;
    description: string;
    detail: string;
};

export type LandingMapJob = {
    id: string;
    title: string;
    location: string;
    status: 'Assigned' | 'In progress' | 'Needs review';
    priority: 'High' | 'Medium' | 'Low';
    top: string;
    left: string;
};

export type LandingMetric = {
    value: string;
    label: string;
    trend: string;
};

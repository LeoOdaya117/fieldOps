import {
    BarChart3,
    BadgeCheck,
    BellRing,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    CalendarClock,
    CheckCircle2,
    CircleHelp,
    ClipboardCheck,
    ClipboardList,
    Compass,
    Droplets,
    Gauge,
    Handshake,
    HardHat,
    HeartHandshake,
    Landmark,
    LifeBuoy,
    LockKeyhole,
    MapPinned,
    Newspaper,
    PackageOpen,
    Presentation,
    ShieldCheck,
    Sparkles,
    UsersRound,
} from 'lucide-react';
import type { MarketingPageConfig } from './types';

export const marketingPages = {
    features: {
        eyebrow: 'The FieldOps platform',
        title: 'One connected system for every part of field operations.',
        description:
            'Bring work orders, assets, inspections, teams, and reporting into one clear operating picture built for work beyond the office.',
        heroVariant: 'platform',
        heroPanel: {
            eyebrow: 'One connected workspace',
            title: 'See the work at a glance.',
            description:
                'Keep the request, asset history, and completion record connected from the first assignment to the final report.',
            items: [
                { label: 'Work orders', detail: 'Plan, assign, and close' },
                { label: 'Assets', detail: 'Keep context beside the job' },
                { label: 'Reports', detail: 'Turn activity into insight' },
            ],
        },
        heroImage: '/images/landing/laptop-dashboard-transparent.png',
        heroImageAlt:
            'FieldOps dashboard on a laptop and mobile work order screen',
        stats: [
            { value: '50K+', label: 'Work orders completed' },
            { value: '10K+', label: 'Assets managed' },
            { value: '98%', label: 'Customer satisfaction' },
        ],
        sections: [
            {
                id: 'work-orders',
                eyebrow: 'Work order management',
                title: 'Move work from request to resolution without the handoffs.',
                description:
                    'Give dispatchers, supervisors, and technicians the same source of truth from assignment to final sign-off.',
                cards: [
                    {
                        icon: ClipboardList,
                        title: 'Plan and assign',
                        description:
                            'Create repeatable work, route it to the right crew, and keep priorities visible.',
                    },
                    {
                        icon: CalendarClock,
                        title: 'Keep schedules moving',
                        description:
                            'See capacity, due dates, and changes before they become missed commitments.',
                    },
                    {
                        icon: CheckCircle2,
                        title: 'Close the loop',
                        description:
                            'Capture completion details, notes, and history that stand up to the next question.',
                    },
                ],
            },
            {
                id: 'assets',
                eyebrow: 'Asset management',
                title: 'Put the context crews need next to the work.',
                description:
                    'Connect each request to the asset, location, maintenance history, and people responsible for it.',
                cards: [
                    {
                        icon: PackageOpen,
                        title: 'Complete asset records',
                        description:
                            'Keep service history, documents, specifications, and ownership in one place.',
                    },
                    {
                        icon: MapPinned,
                        title: 'Map the operation',
                        description:
                            'Turn locations into useful context for dispatch, inspections, and planning.',
                    },
                    {
                        icon: ShieldCheck,
                        title: 'Protect accountability',
                        description:
                            'Use permissions and activity history to keep every update trustworthy.',
                    },
                ],
            },
            {
                id: 'analytics',
                eyebrow: 'Reports and analytics',
                title: 'Make better decisions with the work you already complete.',
                description:
                    'Turn field activity into trends leaders can act on without waiting for another spreadsheet.',
                cards: [
                    {
                        icon: BarChart3,
                        title: 'Operational dashboards',
                        description:
                            'See volume, status, response time, and completion patterns at a glance.',
                    },
                    {
                        icon: Gauge,
                        title: 'Performance signals',
                        description:
                            'Spot bottlenecks and improvement opportunities across teams and sites.',
                    },
                    {
                        icon: BellRing,
                        title: 'Useful alerts',
                        description:
                            'Keep people informed when priorities, schedules, or risk change.',
                    },
                ],
            },
        ],
        ctaTitle: 'See FieldOps in action',
        ctaDescription:
            'Bring one workflow into focus and see how much clearer the rest of the operation becomes.',
    },
    solutions: {
        eyebrow: 'Solutions for connected teams',
        title: 'Give every crew a clear next move and every leader a clear view.',
        description:
            'FieldOps connects the people doing the work with the decisions that keep it moving, from dispatch to the executive team.',
        heroVariant: 'field',
        heroPanel: {
            eyebrow: 'One shared rhythm',
            title: 'From first call to final closeout.',
            description:
                'Give the field the detail it needs and the office the signal it needs without creating another handoff to manage.',
            items: [
                { label: 'Office', detail: 'Priorities stay clear' },
                { label: 'Field', detail: 'Context travels with the crew' },
                { label: 'Leadership', detail: 'Progress is easy to trust' },
            ],
        },
        heroImage: '/images/landing/field-worker-tablet-hd.png',
        heroImageAlt: 'Field worker using a tablet beside a city waterway',
        stats: [
            { value: '1', label: 'Shared source of truth' },
            { value: '24/7', label: 'Operational visibility' },
            { value: '1 day', label: 'To first useful workflow' },
        ],
        sections: [
            {
                id: 'field-operations',
                eyebrow: 'Field operations',
                title: 'Make the day easier to run.',
                description:
                    'Replace scattered calls, spreadsheets, and status checks with a workflow teams can use in the field.',
                cards: [
                    {
                        icon: UsersRound,
                        title: 'Crew coordination',
                        description:
                            'Give each person the assignments, context, and updates they need to keep moving.',
                    },
                    {
                        icon: ClipboardCheck,
                        title: 'Consistent execution',
                        description:
                            'Standardize inspections and closeouts without slowing down experienced teams.',
                    },
                    {
                        icon: LockKeyhole,
                        title: 'Reliable handoffs',
                        description:
                            'Preserve the details that matter when work changes hands or shifts change.',
                    },
                ],
            },
            {
                id: 'facilities',
                eyebrow: 'Facilities management',
                title: 'Keep every site ready for the people who rely on it.',
                description:
                    'Coordinate internal requests, vendors, preventive maintenance, and recurring inspections across every location.',
                cards: [
                    {
                        icon: Building2,
                        title: 'Portfolio context',
                        description:
                            'Understand what is happening at each site without losing the portfolio view.',
                    },
                    {
                        icon: BriefcaseBusiness,
                        title: 'Vendor accountability',
                        description:
                            'Keep outside work visible, assigned, and documented alongside internal work.',
                    },
                    {
                        icon: BadgeCheck,
                        title: 'Inspection readiness',
                        description:
                            'Build repeatable checks and retain a clear record of every result.',
                    },
                ],
            },
            {
                id: 'public-works',
                eyebrow: 'Public works',
                title: 'Keep essential services moving in every season.',
                description:
                    'Respond quickly, prioritize fairly, and show the work behind every community outcome.',
                cards: [
                    {
                        icon: Landmark,
                        title: 'Service response',
                        description:
                            'Triage requests and route the right response with less delay.',
                    },
                    {
                        icon: Compass,
                        title: 'Know the territory',
                        description:
                            'Put locations, assets, and history at the center of each decision.',
                    },
                    {
                        icon: HeartHandshake,
                        title: 'Show the impact',
                        description:
                            'Turn completed work into a transparent record for stakeholders and residents.',
                    },
                ],
            },
        ],
        ctaTitle: 'Build a clearer operating picture',
        ctaDescription:
            'Start with the team or workflow where better visibility will make the biggest difference.',
    },
    industries: {
        eyebrow: 'Built for the work behind the work',
        title: 'Flexible enough for your industry. Focused enough for your day.',
        description:
            'FieldOps adapts to the language, assets, service commitments, and compliance needs that make your operation unique.',
        heroVariant: 'industry',
        heroPanel: {
            eyebrow: 'Made to fit',
            title: 'Start with the reality of your operation.',
            description:
                'Use consistent workflows without forcing utilities, construction, and infrastructure teams into the same mold.',
            items: [
                { label: 'Utilities', detail: 'Service and reliability' },
                { label: 'Construction', detail: 'Sites and handoffs' },
                { label: 'Water', detail: 'Critical infrastructure' },
            ],
        },
        heroImage: '/images/landing/field-worker-service-van-hd.png',
        heroImageAlt:
            'Field worker reviewing a service van beside a water tower',
        stats: [
            { value: '6+', label: 'Industries supported' },
            { value: '100%', label: 'Configurable workflows' },
            { value: '1', label: 'Connected platform' },
        ],
        sections: [
            {
                id: 'utilities',
                eyebrow: 'Utilities',
                title: 'Make every service call accountable.',
                description:
                    'Coordinate crews, assets, outages, and preventive work across the places customers depend on.',
                visual: {
                    icon: MapPinned,
                    label: 'Example utility workflow',
                    title: 'Request → dispatch → service history',
                    detail: 'Keep the location, crew, and asset record connected through the full service call.',
                },
                cards: [
                    {
                        icon: Sparkles,
                        title: 'Maintenance programs',
                        description:
                            'Keep recurring work visible before reliability becomes a customer issue.',
                    },
                    {
                        icon: MapPinned,
                        title: 'Distributed assets',
                        description:
                            'Give crews the location and service history they need in the moment.',
                    },
                ],
            },
            {
                id: 'construction',
                eyebrow: 'Construction',
                title: 'Connect field progress to the project plan.',
                description:
                    'Keep inspections, punch lists, site issues, and closeout work moving with less rework.',
                visual: {
                    icon: HardHat,
                    label: 'Example construction workflow',
                    title: 'Site check → issue → handover',
                    detail: 'Make the next owner clear while the project is still moving across the site.',
                },
                cards: [
                    {
                        icon: HardHat,
                        title: 'Site execution',
                        description:
                            'Standardize daily checks and capture the details behind progress.',
                    },
                    {
                        icon: ClipboardList,
                        title: 'Punch list control',
                        description:
                            'Assign issues, track owners, and close gaps before handover.',
                    },
                ],
            },
            {
                id: 'water',
                eyebrow: 'Water and wastewater',
                title: 'Protect critical infrastructure with better context.',
                description:
                    'Bring inspections, maintenance, response, and documentation together for assets that cannot wait.',
                visual: {
                    icon: Droplets,
                    label: 'Example water workflow',
                    title: 'Inspect → maintain → verify',
                    detail: 'Retain the evidence and service context needed for critical infrastructure.',
                },
                cards: [
                    {
                        icon: Droplets,
                        title: 'Infrastructure health',
                        description:
                            'Track the work that protects treatment, distribution, and collection systems.',
                    },
                    {
                        icon: ShieldCheck,
                        title: 'Compliance confidence',
                        description:
                            'Keep required checks and evidence connected to the work record.',
                    },
                ],
            },
        ],
        ctaTitle: 'Make FieldOps fit your operation',
        ctaDescription:
            'Talk through your workflows, constraints, and first high-value use case with our team.',
    },
    pricing: {
        eyebrow: 'Simple, transparent pricing',
        title: 'Start focused. Scale when your operation is ready.',
        description:
            'Choose a clear starting point for your team, then add the depth and support your operation needs as it grows.',
        heroVariant: 'pricing',
        heroPanel: {
            eyebrow: 'Choose your starting point',
            title: 'The right amount of control for today.',
            description:
                'Start with the essentials, then add context, controls, and support as your team and workflow grow.',
            items: [
                { label: 'Starter', detail: '$29 per user / month' },
                { label: 'Professional', detail: '$59 per user / month' },
                { label: 'Enterprise', detail: 'Built around your operation' },
            ],
        },
        stats: [
            { value: '$29', label: 'Starter per user/month' },
            { value: '$59', label: 'Professional per user/month' },
            { value: 'Custom', label: 'Enterprise support' },
        ],
        sections: [
            {
                id: 'starter',
                eyebrow: 'Starter',
                title: 'A reliable foundation for small teams.',
                description:
                    'Get assignments, mobile access, and a shared activity timeline in place without a heavy rollout.',
                cards: [
                    {
                        icon: ClipboardList,
                        title: 'Work order basics',
                        description:
                            'Create, assign, prioritize, and complete work from one workspace.',
                    },
                    {
                        icon: UsersRound,
                        title: 'Team activity',
                        description:
                            'Give supervisors a simple view of what is moving and what needs attention.',
                    },
                ],
            },
            {
                id: 'professional',
                eyebrow: 'Professional',
                title: 'More control for growing operations.',
                description:
                    'Add asset context, inspections, map views, and reporting as your operation becomes more connected.',
                cards: [
                    {
                        icon: MapPinned,
                        title: 'Connected context',
                        description:
                            'Put the location, asset, and work history beside each assignment.',
                    },
                    {
                        icon: BarChart3,
                        title: 'Useful reporting',
                        description:
                            'Turn daily activity into a clear view of capacity, quality, and response.',
                    },
                ],
            },
            {
                id: 'enterprise',
                eyebrow: 'Enterprise',
                title: 'A thoughtful rollout for complex operations.',
                description:
                    'Bring more teams, permissions, integrations, and support into one accountable operating model.',
                cards: [
                    {
                        icon: ShieldCheck,
                        title: 'Shared accountability',
                        description:
                            'Set clear permissions and keep a dependable activity history across teams.',
                    },
                    {
                        icon: Handshake,
                        title: 'Guided adoption',
                        description:
                            'Work with a team that understands the practical side of field operations.',
                    },
                ],
            },
        ],
        ctaTitle: 'Choose a plan that fits the work',
        ctaDescription:
            'We can help you choose a starting point around your team size, workflows, and growth path.',
    },
    resources: {
        eyebrow: 'Resources for better rollouts',
        title: 'Make every rollout easier to understand, adopt, and improve.',
        description:
            'Find practical guidance for setting up people, assets, workflows, and the habits that make FieldOps stick.',
        heroVariant: 'resources',
        heroPanel: {
            eyebrow: 'A useful next step',
            title: 'Find the answer that moves you forward.',
            description:
                'Choose a practical path based on whether you are evaluating FieldOps, launching a workflow, or improving adoption.',
            items: [
                { label: 'Get started', detail: 'Set up the essentials' },
                { label: 'Learn', detail: 'See practical examples' },
                { label: 'Get answers', detail: 'Bring questions to the team' },
            ],
        },
        heroImage: '/images/landing/cta-mobile-card-hd.png',
        heroImageAlt:
            'FieldOps mobile work order screen and completed work card',
        stats: [
            { value: '1', label: 'Clear path to launch' },
            { value: '24/7', label: 'Support when you need it' },
            { value: '100%', label: 'Practical guidance' },
        ],
        sections: [
            {
                id: 'documentation',
                eyebrow: 'Documentation',
                title: 'Start with the answers your team needs first.',
                description:
                    'Use straightforward guides to shape your workspace and get the first useful workflow live.',
                cards: [
                    {
                        icon: BookOpen,
                        title: 'Getting started',
                        description:
                            'A clear path through your first workspace, users, assets, and work order.',
                    },
                    {
                        icon: Presentation,
                        title: 'Team enablement',
                        description:
                            'Give office and field teams shared language for the work they already do.',
                    },
                    {
                        icon: LifeBuoy,
                        title: 'Support when it matters',
                        description:
                            'Find practical answers as your operation expands into new workflows.',
                    },
                ],
            },
            {
                id: 'stories',
                eyebrow: 'Customer stories',
                title: 'See what a clearer operating rhythm looks like.',
                description:
                    'Learn how teams use one shared view to make service, maintenance, and accountability easier.',
                cards: [
                    {
                        icon: Newspaper,
                        title: 'The work behind the work',
                        description:
                            'See how operations leaders connect daily execution to better outcomes.',
                    },
                    {
                        icon: Handshake,
                        title: 'Built with the team',
                        description:
                            'Discover the small workflow choices that help adoption last.',
                    },
                ],
            },
            {
                id: 'faqs',
                eyebrow: 'FAQs',
                title: 'Get a direct answer before you get started.',
                description:
                    'Understand rollout, mobile access, pricing, and how FieldOps fits the way your teams work.',
                cards: [
                    {
                        icon: CircleHelp,
                        title: 'Common questions',
                        description:
                            'Get quick context on the platform, plans, and first steps.',
                    },
                    {
                        icon: CheckCircle2,
                        title: 'A practical first step',
                        description:
                            'Start with one high-value workflow and build from there.',
                    },
                ],
            },
        ],
        ctaTitle: 'Bring your questions to the team',
        ctaDescription:
            'We will help you connect the right resources to your operation and first workflow.',
    },
    about: {
        eyebrow: 'About FieldOps',
        title: 'The operating layer for teams that keep the world moving.',
        description:
            'FieldOps exists to make essential work easier to see, coordinate, and complete — for the people in the field and the people supporting them.',
        heroVariant: 'about',
        heroPanel: {
            eyebrow: 'Why FieldOps exists',
            title: 'Make important work easier to see and trust.',
            description:
                'FieldOps is built around the realities of essential work, not an abstract process diagram.',
            items: [
                { label: 'Clarity', detail: 'Know what matters next' },
                { label: 'Context', detail: 'Keep the right details close' },
                { label: 'Confidence', detail: 'Make every outcome visible' },
            ],
        },
        heroImage: '/images/landing/field-worker-tablet-hd.png',
        heroImageAlt: 'Field worker reviewing a work order on a tablet',
        stats: [
            { value: '1', label: 'Purpose-built platform' },
            { value: '6+', label: 'Industries in focus' },
            { value: '500+', label: 'Organizations served' },
        ],
        sections: [
            {
                id: 'story',
                eyebrow: 'Our story',
                title: 'Good operations start with a clear picture.',
                description:
                    'We are building the practical system teams need between a request and a result.',
                cards: [
                    {
                        icon: Compass,
                        title: 'Clarity first',
                        description:
                            'Make priorities, ownership, and progress easier to understand at every level.',
                    },
                    {
                        icon: UsersRound,
                        title: 'People-centered',
                        description:
                            'Design around the realities of field teams, dispatchers, supervisors, and leaders.',
                    },
                ],
            },
            {
                id: 'careers',
                eyebrow: 'Careers',
                title: 'Build tools that respect the work.',
                description:
                    'Join a team focused on making complex, important operations easier to run well.',
                cards: [
                    {
                        icon: Sparkles,
                        title: 'Useful by default',
                        description:
                            'Favor clear decisions and dependable workflows over unnecessary complexity.',
                    },
                    {
                        icon: HeartHandshake,
                        title: 'Work with empathy',
                        description:
                            'Listen carefully to the people who rely on the product every day.',
                    },
                ],
            },
            {
                id: 'security',
                eyebrow: 'Trust and security',
                title: 'Reliable software for work people count on.',
                description:
                    'Keep information protected, permissions clear, and operational history dependable.',
                cards: [
                    {
                        icon: ShieldCheck,
                        title: 'Responsible access',
                        description:
                            'Give the right people the right level of visibility and control.',
                    },
                    {
                        icon: BadgeCheck,
                        title: 'Accountable history',
                        description:
                            'Make updates easier to trust from the first assignment to the final closeout.',
                    },
                ],
            },
        ],
        ctaTitle: 'Let’s make the work clearer',
        ctaDescription:
            'Talk with the FieldOps team about your operation, your goals, and the next useful step.',
    },
} satisfies Record<string, MarketingPageConfig>;

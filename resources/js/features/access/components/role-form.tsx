import { Form } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    GripVertical,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ActionLink } from '@/components/action-link';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getNavigationIcon } from '@/lib/navigation';
import type { NavigationIconKey } from '@/types';

export type RolePermission = {
    id: number;
    name: string;
};

export type RoleNavigationItem = {
    key: string;
    title: string;
    group: string;
    href: string;
    permission: string | null;
    iconKey: NavigationIconKey;
    superAdminOnly: boolean;
};

export type RoleCustomNavigationItem = {
    key: string;
    title: string;
    group: string;
    url: string;
    iconKey: NavigationIconKey;
};

export type RoleRouteOption = {
    name: string;
    path: string;
};

export type EditableRole = {
    id?: number;
    name: string;
    displayName: string;
    description: string | null;
    permissions: string[];
    navigationItems: string[];
    navigationGroupOverrides?: Record<string, string>;
    customNavigationItems?: RoleCustomNavigationItem[];
};

type RoleFormProps = {
    action: string;
    method: 'post' | 'patch';
    permissions: RolePermission[];
    navigationItems: RoleNavigationItem[];
    customNavigationItems?: RoleCustomNavigationItem[];
    customNavigationIconKeys?: NavigationIconKey[];
    routeOptions?: RoleRouteOption[];
    defaultNavigationItems?: string[];
    role?: EditableRole;
    submitLabel: string;
};

const roleFormTabs = [
    { key: 'details', label: 'Details' },
    { key: 'navigation', label: 'Navigation' },
    { key: 'permissions', label: 'Permissions' },
] as const;

type RoleFormTab = (typeof roleFormTabs)[number]['key'];

function roleFormTabForError(field: string): RoleFormTab | null {
    if (
        field === 'navigation_items' ||
        field.startsWith('navigation_items.') ||
        field === 'navigation_group_overrides' ||
        field.startsWith('navigation_group_overrides.') ||
        field === 'custom_navigation_items' ||
        field.startsWith('custom_navigation_items.')
    ) {
        return 'navigation';
    }

    if (field === 'permissions' || field.startsWith('permissions.')) {
        return 'permissions';
    }

    if (['name', 'display_name', 'description'].includes(field)) {
        return 'details';
    }

    return null;
}

function permissionLabel(name: string): string {
    const [, ...actions] = name.split('.');

    const action = actions.join('_');
    const labels: Record<string, string> = {
        view: 'View',
        create: 'Create',
        update: 'Update',
        delete: 'Delete',
        invite: 'Invite',
        assign: 'Assign',
        suspend: 'Suspend',
        review_registrations: 'Review registrations',
        view_deleted: 'View Deleted',
        update_deleted: 'Update Deleted',
        manage_system: 'Manage system settings',
        manage: 'Manage',
    };

    if (action in labels) {
        return labels[action];
    }

    return action
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function permissionGroup(name: string): string {
    return name.split('.')[0] ?? name;
}

function groupLabel(value: string): string {
    return value
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function navigationIconLabel(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function permissionGroups(permissions: RolePermission[] | undefined) {
    const groups = new Map<string, RolePermission[]>();

    for (const permission of Array.isArray(permissions) ? permissions : []) {
        if (!permission || typeof permission.name !== 'string') {
            continue;
        }

        const group = permissionGroup(permission.name);
        const current = groups.get(group) ?? [];

        current.push(permission);
        groups.set(group, current);
    }

    return Array.from(groups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, groupPermissions]) => ({
            key,
            label: groupLabel(key),
            permissions: [...groupPermissions].sort((left, right) =>
                left.name.localeCompare(right.name),
            ),
        }));
}

function selectionState(names: string[], selectedPermissions: Set<string>) {
    const selectedCount = names.filter((name) =>
        selectedPermissions.has(name),
    ).length;

    return {
        checked: names.length > 0 && selectedCount === names.length,
        indeterminate: selectedCount > 0 && selectedCount < names.length,
    };
}

function navigationItemLabel(
    item: RoleNavigationItem | RoleCustomNavigationItem,
    selectedIndex: number,
): string {
    const position =
        selectedIndex < 0 ? 'not selected' : `position ${selectedIndex + 1}`;
    const restriction =
        'superAdminOnly' in item && item.superAdminOnly
            ? ', Super Admin only'
            : '';

    return `${item.title}, ${item.group}, ${position}${restriction}`;
}

function createCustomNavigationKey(): string {
    const uuid =
        globalThis.crypto?.randomUUID?.() ??
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
            const random = Math.floor(Math.random() * 16);
            const value = character === 'x' ? random : (random & 0x3) | 0x8;

            return value.toString(16);
        });

    return `custom_${uuid}`;
}

type CustomNavigationDraft = Pick<
    RoleCustomNavigationItem,
    'title' | 'group' | 'url' | 'iconKey'
>;

type CustomNavigationFocusTarget =
    { type: 'add' } | { type: 'edit'; key: string };

const emptyCustomNavigationDraft: CustomNavigationDraft = {
    title: '',
    group: '',
    url: '',
    iconKey: 'link',
};

export default function RoleForm({
    action,
    method,
    permissions = [],
    navigationItems = [],
    customNavigationItems: initialCustomNavigationItems = [],
    routeOptions = [],
    customNavigationIconKeys = [
        'bell',
        'layoutGrid',
        'users',
        'shieldCheck',
        'scrollText',
        'files',
        'globe2',
        'clock3',
        'settings2',
        'databaseBackup',
        'activity',
        'map',
        'folder',
        'link',
        'building',
        'barChart',
        'clipboard',
        'briefcase',
    ],
    defaultNavigationItems,
    role,
    submitLabel,
}: RoleFormProps) {
    const [activeTab, setActiveTab] = useState<RoleFormTab>('details');
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const groupedPermissions = permissionGroups(permissions);
    const [openPermissionGroup, setOpenPermissionGroup] = useState<
        string | null
    >(groupedPermissions[0]?.key ?? null);
    const allPermissionNames = groupedPermissions.flatMap((group) =>
        group.permissions.map((permission) => permission.name),
    );
    const availablePermissionNames = new Set(allPermissionNames);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        () =>
            new Set(
                (role?.permissions ?? []).filter((permission) =>
                    availablePermissionNames.has(permission),
                ),
            ),
    );
    const [roleKeyDraft, setRoleKeyDraft] = useState(role?.name ?? '');
    const [roleDisplayNameDraft, setRoleDisplayNameDraft] = useState(
        role?.displayName ?? '',
    );
    const [customItems, setCustomItems] = useState<RoleCustomNavigationItem[]>(
        () => role?.customNavigationItems ?? initialCustomNavigationItems,
    );
    const [navigationGroupOverrides, setNavigationGroupOverrides] = useState<
        Record<string, string>
    >(() => role?.navigationGroupOverrides ?? {});
    const [navigationGroupLabelDraft, setNavigationGroupLabelDraft] =
        useState('');
    const [navigationGroupTarget, setNavigationGroupTarget] = useState<
        string | null
    >(null);
    const [editingGroupLabel, setEditingGroupLabel] = useState<string | null>(
        null,
    );
    const [groupRenameDraft, setGroupRenameDraft] = useState('');
    const [groupToRemove, setGroupToRemove] = useState<string | null>(null);
    const [navigationSearch, setNavigationSearch] = useState('');
    const [navigationFilter, setNavigationFilter] = useState<
        'all' | 'selected' | 'available'
    >('all');
    const [routePickerOpen, setRoutePickerOpen] = useState(false);
    const [activeRouteIndex, setActiveRouteIndex] = useState(-1);
    const [customDraft, setCustomDraft] = useState<CustomNavigationDraft>(
        emptyCustomNavigationDraft,
    );
    const [customEditorOpen, setCustomEditorOpen] = useState(false);
    const [editingCustomKey, setEditingCustomKey] = useState<string | null>(
        null,
    );
    const [focusRestoreRequest, setFocusRestoreRequest] = useState(0);
    const customTitleInputRef = useRef<HTMLInputElement>(null);
    const addCustomButtonRef = useRef<HTMLButtonElement>(null);
    const editCustomButtonRefs = useRef(new Map<string, HTMLButtonElement>());
    const focusReturnTargetRef = useRef<CustomNavigationFocusTarget | null>(
        null,
    );
    const [navigationOrder, setNavigationOrder] = useState<string[]>(() => {
        const availableNavigation = new Set([
            ...navigationItems.map((item) => item.key),
            ...(
                role?.customNavigationItems ?? initialCustomNavigationItems
            ).map((item) => item.key),
        ]);
        const initialSelection = role
            ? role.navigationItems
            : (defaultNavigationItems ??
              navigationItems.map((item) => item.key));

        return initialSelection.filter((key) => availableNavigation.has(key));
    });
    const [draggedNavigationKey, setDraggedNavigationKey] = useState<
        string | null
    >(null);
    const [navigationReorderAnnouncement, setNavigationReorderAnnouncement] =
        useState('');
    const draggedNavigationKeyRef = useRef<string | null>(null);
    const selectedNavigation = new Set(navigationOrder);
    const navigationItemsByKey = new Map<
        string,
        RoleNavigationItem | RoleCustomNavigationItem
    >([
        ...navigationItems.map((item) => [item.key, item] as const),
        ...customItems.map((item) => [item.key, item] as const),
    ]);
    const allNavigationItems = [...navigationItems, ...customItems];
    const selectedNavigationItems = navigationOrder.flatMap((key) => {
        const item = navigationItemsByKey.get(key);

        return item ? [item] : [];
    });
    const assignedGroupFor = (
        item: RoleNavigationItem | RoleCustomNavigationItem,
    ) =>
        customItems.some((customItem) => customItem.key === item.key)
            ? item.group
            : (navigationGroupOverrides[item.key] ?? item.group);
    const navigationGroupLabels = Array.from(
        new Set(
            allNavigationItems
                .map(assignedGroupFor)
                .filter((label) => label.trim().length > 0),
        ),
    );
    const navigationGroupCounts = new Map<string, number>();

    for (const item of allNavigationItems) {
        const label = assignedGroupFor(item);
        navigationGroupCounts.set(
            label,
            (navigationGroupCounts.get(label) ?? 0) + 1,
        );
    }

    const selectedPermissionCount = allPermissionNames.filter((name) =>
        selectedPermissions.has(name),
    ).length;
    const allPermissions = selectionState(
        allPermissionNames,
        selectedPermissions,
    );
    const permissionGroupsWithSelection = groupedPermissions.map((group) => {
        const permissionNames = group.permissions.map(
            (permission) => permission.name,
        );

        return {
            ...group,
            permissionNames,
            selection: selectionState(permissionNames, selectedPermissions),
        };
    });
    const selectedNavigationKeys = selectedNavigationItems.map(
        (item) => item.key,
    );
    const isSuperAdminRole = roleKeyDraft === 'super_admin';
    const orderedNavigationItems = [
        ...selectedNavigationItems,
        ...allNavigationItems.filter(
            (item) => !selectedNavigation.has(item.key),
        ),
    ].map((item) => ({
        item,
        selectedIndex: navigationOrder.indexOf(item.key),
    }));
    const filteredNavigationItems = orderedNavigationItems.filter(
        ({ item, selectedIndex }) => {
            const isSelected = selectedIndex >= 0;
            const group = assignedGroupFor(item);
            const searchValue = navigationSearch.trim().toLocaleLowerCase();
            const matchesSearch =
                searchValue.length === 0 ||
                `${item.title} ${group} ${'url' in item ? item.url : item.href}`
                    .toLocaleLowerCase()
                    .includes(searchValue);
            const matchesFilter =
                navigationFilter === 'all' ||
                (navigationFilter === 'selected' && isSelected) ||
                (navigationFilter === 'available' && !isSelected);

            return matchesSearch && matchesFilter;
        },
    );
    const filteredRouteOptions = routeOptions.filter((option) => {
        const query = customDraft.url.trim().toLocaleLowerCase();

        return (
            query.length === 0 ||
            `${option.name} ${option.path}`.toLocaleLowerCase().includes(query)
        );
    });
    const selectedPreviewEntries = selectedNavigationItems.map((item) => {
        const previewItem =
            item.key === editingCustomKey && 'url' in item
                ? { ...item, ...customDraft }
                : item;
        const group = assignedGroupFor(previewItem);
        const blockedReason =
            'superAdminOnly' in previewItem &&
            previewItem.superAdminOnly &&
            !isSuperAdminRole
                ? 'Super Admin only'
                : 'permission' in previewItem &&
                    previewItem.permission &&
                    !isSuperAdminRole &&
                    !selectedPermissions.has(previewItem.permission)
                  ? `Requires ${previewItem.permission}`
                  : null;

        return { item: previewItem, group, blockedReason };
    });
    const previewGroups: Array<{
        group: string;
        items: (typeof selectedPreviewEntries)[number][];
    }> = [];

    for (const entry of selectedPreviewEntries.filter(
        ({ blockedReason }) => !blockedReason,
    )) {
        const lastGroup = previewGroups.at(-1);

        if (lastGroup?.group === entry.group) {
            lastGroup.items.push(entry);
        } else {
            previewGroups.push({ group: entry.group, items: [entry] });
        }
    }

    const editingCustomIndex = customItems.findIndex(
        (item) => item.key === editingCustomKey,
    );
    const CustomPreviewIcon = getNavigationIcon(customDraft.iconKey);
    const customItemKeys = new Set(customItems.map((item) => item.key));
    const canAddCustomItem =
        customDraft.title.trim().length > 0 &&
        customDraft.group.trim().length > 0 &&
        customDraft.url.trim().length > 0 &&
        customItems.length < 20 &&
        navigationOrder.length < 32;
    const canAddNavigationGroupLabel =
        navigationGroupTarget !== null &&
        navigationGroupLabelDraft.trim().length > 0 &&
        !allNavigationItems.some(
            (item) =>
                assignedGroupFor(item).toLocaleLowerCase() ===
                navigationGroupLabelDraft.trim().toLocaleLowerCase(),
        );
    const canRenameNavigationGroup =
        Boolean(editingGroupLabel) &&
        groupRenameDraft.trim().length > 0 &&
        (groupRenameDraft.trim().toLocaleLowerCase() ===
            editingGroupLabel?.toLocaleLowerCase() ||
            !allNavigationItems.some(
                (label) =>
                    assignedGroupFor(label).toLocaleLowerCase() ===
                    groupRenameDraft.trim().toLocaleLowerCase(),
            ));

    useEffect(() => {
        if (customEditorOpen) {
            customTitleInputRef.current?.focus();

            return;
        }

        const target = focusReturnTargetRef.current;
        const focusTarget =
            target?.type === 'edit'
                ? editCustomButtonRefs.current.get(target.key)
                : addCustomButtonRef.current;

        if (focusTarget) {
            focusTarget.focus();
        } else if (target) {
            addCustomButtonRef.current?.focus();
        }

        focusReturnTargetRef.current = null;
    }, [customEditorOpen, editingCustomKey, focusRestoreRequest]);

    function setNavigationSelected(keys: string[], selected: boolean) {
        setNavigationOrder((current) => {
            if (selected) {
                const currentKeys = new Set(current);
                const additions = keys
                    .filter(
                        (key) =>
                            navigationItemsByKey.has(key) &&
                            !currentKeys.has(key),
                    )
                    .slice(0, Math.max(0, 32 - current.length));

                return [...current, ...additions];
            }

            const removedKeys = new Set(keys);

            return current.filter((key) => !removedKeys.has(key));
        });
    }

    function moveNavigationItem(key: string, offset: -1 | 1) {
        setNavigationOrder((current) => {
            const currentIndex = current.indexOf(key);
            const nextIndex = currentIndex + offset;

            if (
                currentIndex < 0 ||
                nextIndex < 0 ||
                nextIndex >= current.length
            ) {
                return current;
            }

            const next = [...current];

            [next[currentIndex], next[nextIndex]] = [
                next[nextIndex],
                next[currentIndex],
            ];

            return next;
        });
    }

    function reorderNavigationItem(
        draggedKey: string,
        targetKey: string,
        placeAfter: boolean,
    ) {
        setNavigationOrder((current) => {
            const sourceIndex = current.indexOf(draggedKey);
            const targetIndex = current.indexOf(targetKey);

            if (
                sourceIndex < 0 ||
                targetIndex < 0 ||
                sourceIndex === targetIndex
            ) {
                return current;
            }

            const next = [...current];
            const [draggedKeyAtIndex] = next.splice(sourceIndex, 1);
            const insertionIndex = targetIndex + (placeAfter ? 1 : 0);
            const adjustedInsertionIndex =
                insertionIndex > sourceIndex
                    ? insertionIndex - 1
                    : insertionIndex;

            next.splice(adjustedInsertionIndex, 0, draggedKeyAtIndex);

            if (next.every((key, index) => key === current[index])) {
                return current;
            }

            return next;
        });
    }

    function openCustomDestinationEditor() {
        setEditingCustomKey(null);
        setCustomDraft(emptyCustomNavigationDraft);
        setCustomEditorOpen(true);
    }

    function addCustomNavigationItem() {
        const item: RoleCustomNavigationItem = {
            key: createCustomNavigationKey(),
            title: customDraft.title.trim(),
            group: customDraft.group.trim(),
            url: customDraft.url.trim(),
            iconKey: customDraft.iconKey,
        };

        setCustomItems((current) => [...current, item]);
        setNavigationOrder((current) => [...current, item.key]);
        closeCustomDestinationEditor(
            customItems.length + 1 >= 20 || navigationOrder.length + 1 >= 32
                ? { type: 'edit', key: item.key }
                : { type: 'add' },
        );
    }

    function editCustomNavigationItem(item: RoleCustomNavigationItem) {
        setEditingCustomKey(item.key);
        setCustomDraft({
            title: item.title,
            group: item.group,
            url: item.url,
            iconKey: item.iconKey,
        });
        setCustomEditorOpen(true);
    }

    function updateCustomDraft(
        field: keyof CustomNavigationDraft,
        value: string,
    ) {
        const nextValue =
            field === 'iconKey' ? (value as NavigationIconKey) : value;

        if (editingCustomKey) {
            setCustomItems((items) =>
                items.map((item) =>
                    item.key === editingCustomKey
                        ? { ...item, [field]: nextValue }
                        : item,
                ),
            );
        }

        setCustomDraft((current) => ({ ...current, [field]: nextValue }));
    }

    function chooseRoute(option: RoleRouteOption) {
        updateCustomDraft('url', option.path);
        setRoutePickerOpen(false);
        setActiveRouteIndex(-1);
    }

    function addNavigationGroupLabel() {
        const label = navigationGroupLabelDraft.trim();

        if (
            label.length === 0 ||
            allNavigationItems.some(
                (item) =>
                    assignedGroupFor(item).toLocaleLowerCase() ===
                    label.toLocaleLowerCase(),
            )
        ) {
            return;
        }

        if (navigationGroupTarget === '__custom_draft__') {
            updateCustomDraft('group', label);
        } else if (navigationGroupTarget) {
            setNavigationItemGroup(navigationGroupTarget, label);
        }

        setNavigationGroupLabelDraft('');
        setNavigationGroupTarget(null);
    }

    function renameNavigationGroupLabel() {
        const currentLabel = editingGroupLabel;
        const nextLabel = groupRenameDraft.trim();

        if (!currentLabel || !canRenameNavigationGroup) {
            return;
        }

        setNavigationGroupOverrides((current) => {
            const next = { ...current };

            for (const item of navigationItems) {
                if (assignedGroupFor(item) !== currentLabel) {
                    continue;
                }

                if (nextLabel === item.group) {
                    delete next[item.key];
                } else {
                    next[item.key] = nextLabel;
                }
            }

            return next;
        });
        setCustomItems((current) =>
            current.map((item) =>
                item.group === currentLabel
                    ? { ...item, group: nextLabel }
                    : item,
            ),
        );
        setCustomDraft((current) =>
            current.group === currentLabel
                ? { ...current, group: nextLabel }
                : current,
        );
        setEditingGroupLabel(null);
        setGroupRenameDraft('');
    }

    function removeNavigationGroupLabel() {
        if (!groupToRemove) {
            return;
        }

        const removedLabel = groupToRemove;
        const matchingBuiltInKeys = new Set(
            navigationItems
                .filter((item) => assignedGroupFor(item) === removedLabel)
                .map((item) => item.key),
        );
        const matchingCustomKeys = new Set(
            customItems
                .filter((item) => item.group === removedLabel)
                .map((item) => item.key),
        );

        if (editingCustomKey && matchingCustomKeys.has(editingCustomKey)) {
            closeCustomDestinationEditor({ type: 'add' });
        }

        setNavigationOrder((current) =>
            current.filter(
                (key) =>
                    !matchingBuiltInKeys.has(key) &&
                    !matchingCustomKeys.has(key),
            ),
        );
        setNavigationGroupOverrides((current) => {
            const next = { ...current };

            for (const key of matchingBuiltInKeys) {
                delete next[key];
            }

            return next;
        });
        setCustomItems((current) =>
            current.filter((item) => item.group !== removedLabel),
        );

        if (customDraft.group === removedLabel) {
            setCustomDraft((current) => ({ ...current, group: '' }));
        }

        if (editingGroupLabel === removedLabel) {
            setEditingGroupLabel(null);
            setGroupRenameDraft('');
        }

        setNavigationGroupTarget(null);
        setNavigationGroupLabelDraft('');
    }

    function setNavigationItemGroup(key: string, group: string) {
        const customItem = customItems.find((item) => item.key === key);

        if (customItem) {
            setCustomItems((items) =>
                items.map((item) =>
                    item.key === key ? { ...item, group } : item,
                ),
            );

            if (editingCustomKey === key) {
                setCustomDraft((current) => ({ ...current, group }));
            }

            return;
        }

        const builtInItem = navigationItems.find((item) => item.key === key);

        if (!builtInItem) {
            return;
        }

        setNavigationGroupOverrides((current) => {
            const next = { ...current };

            if (group === builtInItem.group) {
                delete next[key];
            } else {
                next[key] = group;
            }

            return next;
        });
    }

    function closeCustomDestinationEditor(
        returnFocusTo: CustomNavigationFocusTarget = editingCustomKey
            ? { type: 'edit', key: editingCustomKey }
            : { type: 'add' },
    ) {
        focusReturnTargetRef.current = returnFocusTo;
        setFocusRestoreRequest((request) => request + 1);
        setEditingCustomKey(null);
        setCustomDraft(emptyCustomNavigationDraft);
        setCustomEditorOpen(false);
    }

    function removeCustomNavigationItem(key: string) {
        const removedIndex = customItems.findIndex((item) => item.key === key);
        const adjacentItem =
            customItems[removedIndex + 1] ?? customItems[removedIndex - 1];

        setCustomItems((current) => current.filter((item) => item.key !== key));
        setNavigationOrder((current) => current.filter((item) => item !== key));
        closeCustomDestinationEditor(
            adjacentItem
                ? { type: 'edit', key: adjacentItem.key }
                : { type: 'add' },
        );
    }

    function setPermissionsSelected(names: string[], selected: boolean) {
        setSelectedPermissions((current) => {
            const next = new Set(current);

            names.forEach((name) => {
                if (selected) {
                    next.add(name);
                } else {
                    next.delete(name);
                }
            });

            return next;
        });
    }

    function handleTabKeyDown(
        event: KeyboardEvent<HTMLButtonElement>,
        currentIndex: number,
    ) {
        let nextIndex: number;

        switch (event.key) {
            case 'ArrowRight':
                nextIndex = (currentIndex + 1) % roleFormTabs.length;
                break;
            case 'ArrowLeft':
                nextIndex =
                    (currentIndex - 1 + roleFormTabs.length) %
                    roleFormTabs.length;
                break;
            case 'Home':
                nextIndex = 0;
                break;
            case 'End':
                nextIndex = roleFormTabs.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();

        const nextTab = roleFormTabs[nextIndex];

        if (nextTab) {
            setActiveTab(nextTab.key);
            tabRefs.current[nextIndex]?.focus();
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Role settings</CardTitle>
                <CardDescription>
                    Update role details, sidebar navigation, and permissions.
                </CardDescription>
            </CardHeader>
            <Form
                action={action}
                method={method}
                className="contents"
                transform={(data) => ({
                    ...data,
                    navigation_items: selectedNavigationKeys,
                    navigation_group_overrides: navigationGroupOverrides,
                    custom_navigation_items: customItems,
                })}
                onError={(errors) => {
                    const errorTab = Object.keys(errors)
                        .map(roleFormTabForError)
                        .find((tab): tab is RoleFormTab => tab !== null);

                    if (errorTab) {
                        setActiveTab(errorTab);
                    }
                }}
            >
                {({ processing, errors }) => (
                    <>
                        <div className="border-b border-border px-4 sm:px-6">
                            <div
                                aria-label="Role sections"
                                role="tablist"
                                className="flex gap-1 overflow-x-auto"
                            >
                                {roleFormTabs.map((tab, index) => (
                                    <button
                                        key={tab.key}
                                        ref={(element) => {
                                            tabRefs.current[index] = element;
                                        }}
                                        id={`role-tab-${tab.key}`}
                                        type="button"
                                        role="tab"
                                        aria-controls={`role-panel-${tab.key}`}
                                        aria-selected={activeTab === tab.key}
                                        tabIndex={
                                            activeTab === tab.key ? 0 : -1
                                        }
                                        onClick={() => setActiveTab(tab.key)}
                                        onKeyDown={(event) =>
                                            handleTabKeyDown(event, index)
                                        }
                                        className={`-mb-px inline-flex min-h-11 shrink-0 items-center justify-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none sm:px-4 ${
                                            activeTab === tab.key
                                                ? 'border-primary text-foreground'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <CardContent className="space-y-6">
                            <div
                                id="role-panel-details"
                                role="tabpanel"
                                aria-labelledby="role-tab-details"
                                tabIndex={0}
                                hidden={activeTab !== 'details'}
                                className={
                                    activeTab === 'details'
                                        ? 'grid gap-6'
                                        : 'hidden'
                                }
                            >
                                <div className="grid gap-1">
                                    <h2 className="text-sm font-medium text-foreground">
                                        Role details
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Give this role a clear name and
                                        description.
                                    </p>
                                </div>
                                <div
                                    data-slot="role-details-fields"
                                    className="grid items-start gap-5 md:grid-cols-2"
                                >
                                    <div className="grid gap-2">
                                        <Label htmlFor="role-name">
                                            Role key
                                        </Label>
                                        <Input
                                            id="role-name"
                                            name="name"
                                            placeholder="regional_manager"
                                            value={roleKeyDraft}
                                            onChange={(event) =>
                                                setRoleKeyDraft(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Use lowercase letters, numbers,
                                            dashes, or underscores.
                                        </p>
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role-display-name">
                                            Display name
                                        </Label>
                                        <Input
                                            id="role-display-name"
                                            name="display_name"
                                            placeholder="Regional manager"
                                            value={roleDisplayNameDraft}
                                            onChange={(event) =>
                                                setRoleDisplayNameDraft(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                        <InputError
                                            message={errors.display_name}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="role-description">
                                        Description
                                    </Label>
                                    <textarea
                                        id="role-description"
                                        name="description"
                                        rows={3}
                                        defaultValue={role?.description ?? ''}
                                        placeholder="What is this role responsible for?"
                                        className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    <InputError message={errors.description} />
                                </div>
                            </div>

                            <fieldset
                                id="role-panel-navigation"
                                role="tabpanel"
                                aria-labelledby="role-tab-navigation"
                                tabIndex={0}
                                hidden={activeTab !== 'navigation'}
                                className={
                                    activeTab === 'navigation'
                                        ? 'grid min-w-0 gap-3'
                                        : 'hidden'
                                }
                                aria-describedby={
                                    Object.keys(errors).some(
                                        (field) =>
                                            roleFormTabForError(field) ===
                                            'navigation',
                                    )
                                        ? 'navigation-items-help navigation-items-error custom-navigation-error navigation-group-overrides-error'
                                        : 'navigation-items-help'
                                }
                                aria-invalid={Object.keys(errors).some(
                                    (field) =>
                                        roleFormTabForError(field) ===
                                        'navigation',
                                )}
                            >
                                <legend className="text-sm font-medium">
                                    Navigation
                                </legend>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p
                                            id="navigation-items-help"
                                            className="max-w-2xl text-sm text-muted-foreground"
                                        >
                                            Choose, group, and order this role’s
                                            links. Permissions still control
                                            access.
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {selectedNavigationKeys.length} of{' '}
                                            {allNavigationItems.length} selected
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setNavigationSelected(
                                                    allNavigationItems.map(
                                                        (item) => item.key,
                                                    ),
                                                    true,
                                                )
                                            }
                                            disabled={
                                                allNavigationItems.length ===
                                                    0 ||
                                                selectedNavigationKeys.length ===
                                                    allNavigationItems.length
                                            }
                                        >
                                            Select all
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setNavigationSelected(
                                                    allNavigationItems.map(
                                                        (item) => item.key,
                                                    ),
                                                    false,
                                                )
                                            }
                                            disabled={
                                                selectedNavigationKeys.length ===
                                                0
                                            }
                                        >
                                            Clear all
                                        </Button>
                                    </div>
                                </div>
                                <section
                                    aria-label="Navigation group labels"
                                    className="grid gap-3 rounded-xl border border-border bg-muted/15 p-3 sm:p-4"
                                >
                                    <div>
                                        <h3 className="text-sm font-medium text-foreground">
                                            Groups
                                        </h3>
                                        <p
                                            id="navigation-group-label-help"
                                            className="text-xs text-muted-foreground"
                                        >
                                            Add a group from any destination.
                                            Labels appear here when in use.
                                        </p>
                                    </div>
                                    <ul
                                        aria-label="Groups in use"
                                        className="grid gap-2 sm:grid-cols-2"
                                    >
                                        {navigationGroupLabels.map((label) => (
                                            <li
                                                key={label}
                                                className="flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                                            >
                                                {editingGroupLabel === label ? (
                                                    <>
                                                        <Input
                                                            aria-label={`Rename ${label}`}
                                                            value={
                                                                groupRenameDraft
                                                            }
                                                            maxLength={60}
                                                            onChange={(event) =>
                                                                setGroupRenameDraft(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="h-8 min-w-24 flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={
                                                                renameNavigationGroupLabel
                                                            }
                                                            disabled={
                                                                !canRenameNavigationGroup
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingGroupLabel(
                                                                    null,
                                                                );
                                                                setGroupRenameDraft(
                                                                    '',
                                                                );
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                                            {label}
                                                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                                {navigationGroupCounts.get(
                                                                    label,
                                                                ) ?? 0}{' '}
                                                                destinations
                                                            </span>
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-label={`Rename group ${label}`}
                                                            onClick={() => {
                                                                setEditingGroupLabel(
                                                                    label,
                                                                );
                                                                setGroupRenameDraft(
                                                                    label,
                                                                );
                                                            }}
                                                        >
                                                            Rename
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Remove group ${label}`}
                                                            onClick={() =>
                                                                setGroupToRemove(
                                                                    label,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    {navigationGroupLabels.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            No groups in use.
                                        </p>
                                    )}
                                    <InputError
                                        id="navigation-group-overrides-error"
                                        message={
                                            errors.navigation_group_overrides ??
                                            Object.keys(errors)
                                                .filter((field) =>
                                                    field.startsWith(
                                                        'navigation_group_overrides.',
                                                    ),
                                                )
                                                .map((field) => errors[field])
                                                .find(Boolean)
                                        }
                                    />
                                </section>
                                <section
                                    aria-label="Custom destinations"
                                    className="grid gap-3 rounded-xl border border-border bg-muted/15 p-3 sm:p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium text-foreground">
                                                Custom destinations
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Add role-specific links with a
                                                title, group, URL, and icon.
                                            </p>
                                        </div>
                                        {!customEditorOpen && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                ref={addCustomButtonRef}
                                                onClick={
                                                    openCustomDestinationEditor
                                                }
                                                disabled={
                                                    customItems.length >= 20 ||
                                                    navigationOrder.length >= 32
                                                }
                                            >
                                                <Plus aria-hidden="true" />
                                                Add destination
                                            </Button>
                                        )}
                                    </div>
                                    {customEditorOpen && (
                                        <div
                                            data-slot="custom-navigation-editor"
                                            className="grid min-w-0 gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 sm:p-4"
                                        >
                                            <div className="grid gap-2">
                                                <Label htmlFor="custom-navigation-title">
                                                    Destination title
                                                </Label>
                                                <Input
                                                    id="custom-navigation-title"
                                                    ref={customTitleInputRef}
                                                    value={customDraft.title}
                                                    maxLength={80}
                                                    onChange={(event) =>
                                                        updateCustomDraft(
                                                            'title',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Regional reports"
                                                />
                                                {editingCustomIndex >= 0 && (
                                                    <InputError
                                                        message={
                                                            errors[
                                                                `custom_navigation_items.${editingCustomIndex}.title`
                                                            ]
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="custom-navigation-group">
                                                    Group label
                                                </Label>
                                                <select
                                                    id="custom-navigation-group"
                                                    value={customDraft.group}
                                                    aria-invalid={Boolean(
                                                        editingCustomIndex >=
                                                            0 &&
                                                        errors[
                                                            `custom_navigation_items.${editingCustomIndex}.group`
                                                        ],
                                                    )}
                                                    aria-describedby={
                                                        editingCustomIndex >=
                                                            0 &&
                                                        errors[
                                                            `custom_navigation_items.${editingCustomIndex}.group`
                                                        ]
                                                            ? 'custom-navigation-group-error'
                                                            : undefined
                                                    }
                                                    onChange={(event) =>
                                                        event.target.value ===
                                                        '__create_group__'
                                                            ? (setNavigationGroupTarget(
                                                                  '__custom_draft__',
                                                              ),
                                                              setNavigationGroupLabelDraft(
                                                                  '',
                                                              ))
                                                            : updateCustomDraft(
                                                                  'group',
                                                                  event.target
                                                                      .value,
                                                              )
                                                    }
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                >
                                                    <option value="">
                                                        Choose a group
                                                    </option>
                                                    {Array.from(
                                                        new Set([
                                                            ...navigationGroupLabels,
                                                            customDraft.group,
                                                        ]),
                                                    )
                                                        .filter(Boolean)
                                                        .map((label) => (
                                                            <option
                                                                key={label}
                                                                value={label}
                                                            >
                                                                {label}
                                                            </option>
                                                        ))}
                                                    <option value="__create_group__">
                                                        Create group…
                                                    </option>
                                                </select>
                                                {navigationGroupTarget ===
                                                    '__custom_draft__' && (
                                                    <div className="flex min-w-0 gap-2">
                                                        <Input
                                                            aria-label="New group label"
                                                            value={
                                                                navigationGroupLabelDraft
                                                            }
                                                            maxLength={60}
                                                            onChange={(event) =>
                                                                setNavigationGroupLabelDraft(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            onKeyDown={(
                                                                event,
                                                            ) => {
                                                                if (
                                                                    event.key ===
                                                                        'Enter' &&
                                                                    canAddNavigationGroupLabel
                                                                ) {
                                                                    event.preventDefault();
                                                                    addNavigationGroupLabel();
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={
                                                                addNavigationGroupLabel
                                                            }
                                                            disabled={
                                                                !canAddNavigationGroupLabel
                                                            }
                                                        >
                                                            Add
                                                        </Button>
                                                    </div>
                                                )}
                                                <InputError
                                                    id="custom-navigation-group-error"
                                                    message={
                                                        editingCustomIndex >= 0
                                                            ? errors[
                                                                  `custom_navigation_items.${editingCustomIndex}.group`
                                                              ]
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2 sm:col-span-2">
                                                <Label htmlFor="custom-navigation-url">
                                                    URL
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="custom-navigation-url"
                                                        role="combobox"
                                                        aria-autocomplete="list"
                                                        aria-expanded={
                                                            routePickerOpen &&
                                                            filteredRouteOptions.length >
                                                                0
                                                        }
                                                        aria-controls={
                                                            routePickerOpen &&
                                                            filteredRouteOptions.length >
                                                                0
                                                                ? 'custom-navigation-route-options'
                                                                : undefined
                                                        }
                                                        aria-activedescendant={
                                                            routePickerOpen &&
                                                            filteredRouteOptions[
                                                                activeRouteIndex
                                                            ]
                                                                ? `custom-route-option-${activeRouteIndex}`
                                                                : undefined
                                                        }
                                                        value={customDraft.url}
                                                        maxLength={2048}
                                                        onFocus={() =>
                                                            setRoutePickerOpen(
                                                                true,
                                                            )
                                                        }
                                                        onBlur={() =>
                                                            setRoutePickerOpen(
                                                                false,
                                                            )
                                                        }
                                                        onChange={(event) => {
                                                            updateCustomDraft(
                                                                'url',
                                                                event.target
                                                                    .value,
                                                            );
                                                            setRoutePickerOpen(
                                                                true,
                                                            );
                                                            setActiveRouteIndex(
                                                                -1,
                                                            );
                                                        }}
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.key ===
                                                                    'ArrowDown' &&
                                                                filteredRouteOptions.length >
                                                                    0
                                                            ) {
                                                                event.preventDefault();
                                                                setRoutePickerOpen(
                                                                    true,
                                                                );
                                                                setActiveRouteIndex(
                                                                    (index) =>
                                                                        routePickerOpen
                                                                            ? Math.min(
                                                                                  index <
                                                                                      0
                                                                                      ? 0
                                                                                      : index +
                                                                                            1,
                                                                                  filteredRouteOptions.length -
                                                                                      1,
                                                                              )
                                                                            : 0,
                                                                );
                                                            } else if (
                                                                event.key ===
                                                                    'ArrowUp' &&
                                                                filteredRouteOptions.length >
                                                                    0
                                                            ) {
                                                                event.preventDefault();
                                                                setActiveRouteIndex(
                                                                    (index) =>
                                                                        Math.max(
                                                                            0,
                                                                            index -
                                                                                1,
                                                                        ),
                                                                );
                                                            } else if (
                                                                event.key ===
                                                                    'Enter' &&
                                                                routePickerOpen &&
                                                                filteredRouteOptions[
                                                                    activeRouteIndex
                                                                ] &&
                                                                activeRouteIndex >=
                                                                    0
                                                            ) {
                                                                event.preventDefault();
                                                                chooseRoute(
                                                                    filteredRouteOptions[
                                                                        activeRouteIndex
                                                                    ],
                                                                );
                                                            } else if (
                                                                event.key ===
                                                                'Escape'
                                                            ) {
                                                                setRoutePickerOpen(
                                                                    false,
                                                                );
                                                            }
                                                        }}
                                                        placeholder="Search routes or enter a URL"
                                                    />
                                                    {routePickerOpen &&
                                                        filteredRouteOptions.length >
                                                            0 && (
                                                            <div
                                                                id="custom-navigation-route-options"
                                                                role="listbox"
                                                                aria-label="Available app routes"
                                                                className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                                                            >
                                                                {filteredRouteOptions.map(
                                                                    (
                                                                        option,
                                                                        index,
                                                                    ) => (
                                                                        <div
                                                                            key={`${option.name}:${option.path}`}
                                                                            id={`custom-route-option-${index}`}
                                                                            role="option"
                                                                            aria-selected={
                                                                                index ===
                                                                                activeRouteIndex
                                                                            }
                                                                            className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${index === activeRouteIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'}`}
                                                                            onMouseDown={(
                                                                                event,
                                                                            ) =>
                                                                                event.preventDefault()
                                                                            }
                                                                            onMouseEnter={() =>
                                                                                setActiveRouteIndex(
                                                                                    index,
                                                                                )
                                                                            }
                                                                            onClick={() =>
                                                                                chooseRoute(
                                                                                    option,
                                                                                )
                                                                            }
                                                                        >
                                                                            <span className="block font-medium">
                                                                                {
                                                                                    option.name
                                                                                }
                                                                            </span>
                                                                            <span className="block font-mono text-xs text-muted-foreground">
                                                                                {
                                                                                    option.path
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Choose a route or enter an
                                                    app path or HTTPS URL.
                                                </p>
                                                {editingCustomIndex >= 0 && (
                                                    <InputError
                                                        message={
                                                            errors[
                                                                `custom_navigation_items.${editingCustomIndex}.url`
                                                            ]
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="custom-navigation-icon">
                                                    Icon
                                                </Label>
                                                <select
                                                    id="custom-navigation-icon"
                                                    value={customDraft.iconKey}
                                                    onChange={(event) =>
                                                        updateCustomDraft(
                                                            'iconKey',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                >
                                                    {customNavigationIconKeys.map(
                                                        (iconKey) => (
                                                            <option
                                                                key={iconKey}
                                                                value={iconKey}
                                                            >
                                                                {navigationIconLabel(
                                                                    iconKey,
                                                                )}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                {editingCustomIndex >= 0 && (
                                                    <InputError
                                                        message={
                                                            errors[
                                                                `custom_navigation_items.${editingCustomIndex}.iconKey`
                                                            ]
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                                                <CustomPreviewIcon
                                                    aria-hidden="true"
                                                    className="size-5 shrink-0 text-muted-foreground"
                                                />
                                                <span className="min-w-0 truncate">
                                                    {customDraft.title.trim() ||
                                                        'Destination preview'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                                                {editingCustomKey ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            closeCustomDestinationEditor()
                                                        }
                                                    >
                                                        Done editing
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={
                                                                addCustomNavigationItem
                                                            }
                                                            disabled={
                                                                !canAddCustomItem
                                                            }
                                                        >
                                                            Add to navigation
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                closeCustomDestinationEditor(
                                                                    {
                                                                        type: 'add',
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            Cancel draft
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {customItems.length >= 20 && (
                                        <p className="text-xs text-muted-foreground">
                                            A role can have up to 20 custom
                                            destinations.
                                        </p>
                                    )}
                                    <InputError
                                        id="custom-navigation-error"
                                        message={
                                            errors.custom_navigation_items ??
                                            Object.keys(errors)
                                                .filter((field) =>
                                                    field.startsWith(
                                                        'custom_navigation_items.',
                                                    ),
                                                )
                                                .map((field) => errors[field])
                                                .find(Boolean)
                                        }
                                    />
                                </section>
                                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                                    <section className="grid min-w-0 gap-3">
                                        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="relative min-w-0 flex-1">
                                                <Search
                                                    aria-hidden="true"
                                                    className="absolute top-2.5 left-3 size-4 text-muted-foreground"
                                                />
                                                <Input
                                                    aria-label="Search destinations"
                                                    value={navigationSearch}
                                                    onChange={(event) =>
                                                        setNavigationSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Search destinations"
                                                    className="pl-9"
                                                />
                                            </div>
                                            <div
                                                role="group"
                                                aria-label="Filter destinations"
                                                className="flex shrink-0 rounded-md border border-border p-1"
                                            >
                                                {(
                                                    [
                                                        ['all', 'All'],
                                                        [
                                                            'selected',
                                                            'Selected',
                                                        ],
                                                        [
                                                            'available',
                                                            'Available',
                                                        ],
                                                    ] as const
                                                ).map(([filter, label]) => (
                                                    <Button
                                                        key={filter}
                                                        type="button"
                                                        size="sm"
                                                        variant={
                                                            navigationFilter ===
                                                            filter
                                                                ? 'secondary'
                                                                : 'ghost'
                                                        }
                                                        aria-pressed={
                                                            navigationFilter ===
                                                            filter
                                                        }
                                                        onClick={() =>
                                                            setNavigationFilter(
                                                                filter,
                                                            )
                                                        }
                                                    >
                                                        {label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Showing{' '}
                                            {filteredNavigationItems.length} of{' '}
                                            {allNavigationItems.length}
                                        </p>
                                        {allNavigationItems.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                                No destinations. Add one above.
                                            </div>
                                        ) : filteredNavigationItems.length ===
                                          0 ? (
                                            <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                                {navigationSearch.trim()
                                                    ? 'No destinations match this search.'
                                                    : navigationFilter ===
                                                        'selected'
                                                      ? 'No selected destinations.'
                                                      : navigationFilter ===
                                                          'available'
                                                        ? 'No available destinations.'
                                                        : 'No destinations found.'}
                                            </div>
                                        ) : (
                                            <ol
                                                aria-label="Navigation destinations"
                                                className="grid gap-2"
                                            >
                                                {filteredNavigationItems.map(
                                                    ({
                                                        item,
                                                        selectedIndex,
                                                    }) => {
                                                        const isCustom =
                                                            customItemKeys.has(
                                                                item.key,
                                                            );
                                                        const customIndex =
                                                            customItems.findIndex(
                                                                (customItem) =>
                                                                    customItem.key ===
                                                                    item.key,
                                                            );
                                                        const assignedGroup =
                                                            isCustom
                                                                ? item.group
                                                                : (navigationGroupOverrides[
                                                                      item.key
                                                                  ] ??
                                                                  item.group);
                                                        const groupError =
                                                            isCustom
                                                                ? errors[
                                                                      `custom_navigation_items.${customIndex}.group`
                                                                  ]
                                                                : errors[
                                                                      `navigation_group_overrides.${item.key}`
                                                                  ];
                                                        const rowError =
                                                            customIndex >= 0
                                                                ? [
                                                                      'title',
                                                                      'url',
                                                                      'iconKey',
                                                                  ]
                                                                      .map(
                                                                          (
                                                                              field,
                                                                          ) =>
                                                                              errors[
                                                                                  `custom_navigation_items.${customIndex}.${field}`
                                                                              ],
                                                                      )
                                                                      .find(
                                                                          Boolean,
                                                                      )
                                                                : undefined;
                                                        const Icon =
                                                            getNavigationIcon(
                                                                item.iconKey,
                                                            );

                                                        return (
                                                            <li
                                                                key={item.key}
                                                                data-navigation-key={
                                                                    item.key
                                                                }
                                                                aria-label={navigationItemLabel(
                                                                    {
                                                                        ...item,
                                                                        group: assignedGroup,
                                                                    },
                                                                    selectedIndex,
                                                                )}
                                                                className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                                                                onDragOver={(
                                                                    event,
                                                                ) => {
                                                                    const draggedKey =
                                                                        draggedNavigationKeyRef.current;

                                                                    if (
                                                                        !draggedKey ||
                                                                        selectedIndex <
                                                                            0 ||
                                                                        draggedKey ===
                                                                            item.key
                                                                    ) {
                                                                        return;
                                                                    }

                                                                    event.preventDefault();
                                                                    event.dataTransfer.dropEffect =
                                                                        'move';
                                                                    const bounds =
                                                                        event.currentTarget.getBoundingClientRect();

                                                                    reorderNavigationItem(
                                                                        draggedKey,
                                                                        item.key,
                                                                        event.clientY >=
                                                                            bounds.top +
                                                                                bounds.height /
                                                                                    2,
                                                                    );
                                                                }}
                                                                onDrop={(
                                                                    event,
                                                                ) => {
                                                                    const draggedKey =
                                                                        draggedNavigationKeyRef.current;

                                                                    if (
                                                                        !draggedKey ||
                                                                        selectedIndex <
                                                                            0
                                                                    ) {
                                                                        return;
                                                                    }

                                                                    event.preventDefault();
                                                                    const draggedItem =
                                                                        navigationItemsByKey.get(
                                                                            draggedKey,
                                                                        );
                                                                    setNavigationReorderAnnouncement(
                                                                        `${draggedItem?.title ?? 'Navigation item'} reordered. Save changes to keep this order.`,
                                                                    );
                                                                }}
                                                            >
                                                                {selectedIndex >=
                                                                    0 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        draggable
                                                                        aria-label={`Drag ${item.title} to reorder`}
                                                                        title="Drag to reorder"
                                                                        className="cursor-grab touch-pan-y text-muted-foreground active:cursor-grabbing"
                                                                        onDragStart={(
                                                                            event,
                                                                        ) => {
                                                                            draggedNavigationKeyRef.current =
                                                                                item.key;
                                                                            setDraggedNavigationKey(
                                                                                item.key,
                                                                            );
                                                                            setNavigationReorderAnnouncement(
                                                                                `Dragging ${item.title}. Drop it over another selected destination to reorder.`,
                                                                            );
                                                                            event.dataTransfer.effectAllowed =
                                                                                'move';
                                                                            event.dataTransfer.setData(
                                                                                'text/plain',
                                                                                item.key,
                                                                            );
                                                                        }}
                                                                        onDragEnd={() => {
                                                                            draggedNavigationKeyRef.current =
                                                                                null;
                                                                            setDraggedNavigationKey(
                                                                                null,
                                                                            );
                                                                            setNavigationReorderAnnouncement(
                                                                                (
                                                                                    current,
                                                                                ) =>
                                                                                    current.startsWith(
                                                                                        `Dragging ${item.title}.`,
                                                                                    )
                                                                                        ? `Reordering ${item.title} cancelled.`
                                                                                        : current,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <GripVertical aria-hidden="true" />
                                                                    </Button>
                                                                )}
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="w-7 shrink-0 text-center text-xs font-medium text-muted-foreground tabular-nums"
                                                                >
                                                                    {selectedIndex >=
                                                                    0
                                                                        ? selectedIndex +
                                                                          1
                                                                        : null}
                                                                </span>
                                                                <label
                                                                    htmlFor={`navigation-${item.key}`}
                                                                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
                                                                >
                                                                    <input
                                                                        id={`navigation-${item.key}`}
                                                                        type="checkbox"
                                                                        name="navigation_items[]"
                                                                        value={
                                                                            item.key
                                                                        }
                                                                        aria-label={
                                                                            item.title
                                                                        }
                                                                        checked={selectedNavigation.has(
                                                                            item.key,
                                                                        )}
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setNavigationSelected(
                                                                                [
                                                                                    item.key,
                                                                                ],
                                                                                event
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                                        disabled={
                                                                            !selectedNavigation.has(
                                                                                item.key,
                                                                            ) &&
                                                                            navigationOrder.length >=
                                                                                32
                                                                        }
                                                                    />
                                                                    <span className="min-w-0 text-sm font-medium text-foreground">
                                                                        <span className="block">
                                                                            {isCustom &&
                                                                                Icon && (
                                                                                    <Icon
                                                                                        aria-hidden="true"
                                                                                        className="mr-1.5 inline size-4 align-text-bottom text-muted-foreground"
                                                                                    />
                                                                                )}
                                                                            {
                                                                                item.title
                                                                            }
                                                                        </span>
                                                                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                                                            {
                                                                                assignedGroup
                                                                            }
                                                                        </span>
                                                                        {'superAdminOnly' in
                                                                            item &&
                                                                            item.superAdminOnly && (
                                                                                <span className="block text-xs font-normal text-muted-foreground">
                                                                                    Super
                                                                                    Admin
                                                                                    only
                                                                                </span>
                                                                            )}
                                                                    </span>
                                                                </label>
                                                                <div className="grid min-w-0 flex-1 gap-1 sm:max-w-48">
                                                                    <label
                                                                        htmlFor={`navigation-group-${item.key}`}
                                                                        className="sr-only"
                                                                    >
                                                                        Group
                                                                        for{' '}
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </label>
                                                                    <select
                                                                        id={`navigation-group-${item.key}`}
                                                                        value={
                                                                            assignedGroup
                                                                        }
                                                                        aria-invalid={Boolean(
                                                                            groupError,
                                                                        )}
                                                                        aria-describedby={
                                                                            groupError
                                                                                ? `navigation-group-error-${item.key}`
                                                                                : undefined
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) => {
                                                                            if (
                                                                                event
                                                                                    .target
                                                                                    .value ===
                                                                                '__create_group__'
                                                                            ) {
                                                                                setNavigationGroupTarget(
                                                                                    item.key,
                                                                                );
                                                                                setNavigationGroupLabelDraft(
                                                                                    '',
                                                                                );
                                                                            } else {
                                                                                setNavigationItemGroup(
                                                                                    item.key,
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                );
                                                                            }
                                                                        }}
                                                                        className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                                    >
                                                                        <option value="">
                                                                            Choose
                                                                            a
                                                                            group
                                                                        </option>
                                                                        {Array.from(
                                                                            new Set(
                                                                                [
                                                                                    assignedGroup,
                                                                                    ...navigationGroupLabels,
                                                                                ],
                                                                            ),
                                                                        )
                                                                            .filter(
                                                                                Boolean,
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    label,
                                                                                ) => (
                                                                                    <option
                                                                                        key={
                                                                                            label
                                                                                        }
                                                                                        value={
                                                                                            label
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            label
                                                                                        }
                                                                                    </option>
                                                                                ),
                                                                            )}
                                                                        <option value="__create_group__">
                                                                            Create
                                                                            group…
                                                                        </option>
                                                                    </select>
                                                                    {navigationGroupTarget ===
                                                                        item.key && (
                                                                        <div className="flex min-w-0 gap-2">
                                                                            <Input
                                                                                aria-label={`New group for ${item.title}`}
                                                                                value={
                                                                                    navigationGroupLabelDraft
                                                                                }
                                                                                maxLength={
                                                                                    60
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setNavigationGroupLabelDraft(
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                onKeyDown={(
                                                                                    event,
                                                                                ) => {
                                                                                    if (
                                                                                        event.key ===
                                                                                            'Enter' &&
                                                                                        canAddNavigationGroupLabel
                                                                                    ) {
                                                                                        event.preventDefault();
                                                                                        addNavigationGroupLabel();
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                onClick={
                                                                                    addNavigationGroupLabel
                                                                                }
                                                                                disabled={
                                                                                    !canAddNavigationGroupLabel
                                                                                }
                                                                            >
                                                                                Add
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                    <InputError
                                                                        id={`navigation-group-error-${item.key}`}
                                                                        message={
                                                                            groupError
                                                                        }
                                                                    />
                                                                </div>
                                                                {isCustom && (
                                                                    <div className="flex shrink-0 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            aria-label={`Edit ${item.title}`}
                                                                            ref={(
                                                                                element,
                                                                            ) => {
                                                                                if (
                                                                                    element
                                                                                ) {
                                                                                    editCustomButtonRefs.current.set(
                                                                                        item.key,
                                                                                        element,
                                                                                    );
                                                                                } else {
                                                                                    editCustomButtonRefs.current.delete(
                                                                                        item.key,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            onClick={() =>
                                                                                editCustomNavigationItem(
                                                                                    item as RoleCustomNavigationItem,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil aria-hidden="true" />
                                                                            <span className="sr-only sm:not-sr-only">
                                                                                Edit
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            aria-label={`Remove ${item.title}`}
                                                                            onClick={() =>
                                                                                removeCustomNavigationItem(
                                                                                    item.key,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 aria-hidden="true" />
                                                                            <span className="sr-only sm:not-sr-only">
                                                                                Remove
                                                                            </span>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                {rowError && (
                                                                    <p className="w-full text-xs text-destructive sm:pl-10">
                                                                        {
                                                                            rowError
                                                                        }
                                                                    </p>
                                                                )}
                                                                {selectedIndex >=
                                                                    0 && (
                                                                    <div className="ml-auto flex shrink-0 gap-2">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            aria-label={`Move ${item.title} up`}
                                                                            onClick={() =>
                                                                                moveNavigationItem(
                                                                                    item.key,
                                                                                    -1,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                selectedIndex ===
                                                                                0
                                                                            }
                                                                        >
                                                                            <ChevronUp aria-hidden="true" />
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            aria-label={`Move ${item.title} down`}
                                                                            onClick={() =>
                                                                                moveNavigationItem(
                                                                                    item.key,
                                                                                    1,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                selectedIndex ===
                                                                                selectedNavigationItems.length -
                                                                                    1
                                                                            }
                                                                        >
                                                                            <ChevronDown aria-hidden="true" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </li>
                                                        );
                                                    },
                                                )}
                                            </ol>
                                        )}
                                        <p
                                            className="sr-only"
                                            aria-live="polite"
                                        >
                                            {navigationReorderAnnouncement ||
                                                (draggedNavigationKey
                                                    ? `Dragging ${navigationItemsByKey.get(draggedNavigationKey)?.title ?? 'navigation item'}. Drop it over another selected destination to reorder.`
                                                    : '')}
                                        </p>
                                        <InputError
                                            id="navigation-items-error"
                                            message={errors.navigation_items}
                                        />
                                    </section>
                                    <aside
                                        aria-label="Sidebar preview"
                                        className="h-fit rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4"
                                    >
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Sidebar preview
                                        </h3>
                                        <p className="mt-1 mb-4 text-xs text-muted-foreground">
                                            {roleDisplayNameDraft || 'New role'}
                                        </p>
                                        <nav aria-label="Draft sidebar">
                                            {previewGroups.length > 0 ? (
                                                <div className="grid gap-4">
                                                    {previewGroups.map(
                                                        (group, index) => (
                                                            <section
                                                                key={`${group.group}-${index}`}
                                                                aria-label={
                                                                    group.group
                                                                }
                                                            >
                                                                <h4 className="mb-2 px-2 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
                                                                    {
                                                                        group.group
                                                                    }
                                                                </h4>
                                                                <ul className="grid gap-1">
                                                                    {group.items.map(
                                                                        ({
                                                                            item,
                                                                        }) => {
                                                                            const Icon =
                                                                                getNavigationIcon(
                                                                                    item.iconKey,
                                                                                );
                                                                            const href =
                                                                                'url' in
                                                                                item
                                                                                    ? item.url
                                                                                    : item.href;

                                                                            return (
                                                                                <li
                                                                                    key={
                                                                                        item.key
                                                                                    }
                                                                                    className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground"
                                                                                >
                                                                                    {Icon && (
                                                                                        <Icon
                                                                                            aria-hidden="true"
                                                                                            className="size-4 shrink-0 text-muted-foreground"
                                                                                        />
                                                                                    )}
                                                                                    <span className="truncate">
                                                                                        {
                                                                                            item.title
                                                                                        }
                                                                                        <span className="block truncate text-xs text-muted-foreground">
                                                                                            {
                                                                                                href
                                                                                            }
                                                                                        </span>
                                                                                    </span>
                                                                                </li>
                                                                            );
                                                                        },
                                                                    )}
                                                                </ul>
                                                            </section>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                                                    No visible destinations.
                                                </p>
                                            )}
                                        </nav>
                                        {selectedPreviewEntries.some(
                                            ({ blockedReason }) =>
                                                blockedReason,
                                        ) && (
                                            <section
                                                aria-label="Hidden by permissions"
                                                className="mt-4 border-t border-border pt-3"
                                            >
                                                <h4 className="mb-2 text-xs font-semibold text-foreground">
                                                    Hidden by permissions
                                                </h4>
                                                <ul className="grid gap-2">
                                                    {selectedPreviewEntries
                                                        .filter(
                                                            ({
                                                                blockedReason,
                                                            }) => blockedReason,
                                                        )
                                                        .map(
                                                            ({
                                                                item,
                                                                blockedReason,
                                                            }) => (
                                                                <li
                                                                    key={
                                                                        item.key
                                                                    }
                                                                    className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
                                                                >
                                                                    <span className="block font-medium text-foreground">
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </span>
                                                                    <span className="mt-1 block text-muted-foreground">
                                                                        {
                                                                            blockedReason
                                                                        }
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                </ul>
                                            </section>
                                        )}
                                    </aside>
                                </div>
                                <ConfirmDialog
                                    open={groupToRemove !== null}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setGroupToRemove(null);
                                        }
                                    }}
                                    destructive
                                    options={{
                                        title: `Remove ${groupToRemove ?? 'group'}?`,
                                        description:
                                            'This removes custom links in this group and deselects its built-in destinations for this role.',
                                        confirmLabel: 'Remove group',
                                    }}
                                    onConfirm={removeNavigationGroupLabel}
                                />
                            </fieldset>

                            <fieldset
                                id="role-panel-permissions"
                                role="tabpanel"
                                aria-labelledby="role-tab-permissions"
                                tabIndex={0}
                                hidden={activeTab !== 'permissions'}
                                className={
                                    activeTab === 'permissions'
                                        ? 'grid gap-3'
                                        : 'hidden'
                                }
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <legend className="text-sm font-medium">
                                            Permissions
                                        </legend>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Select the actions members of this
                                            role can perform.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {selectedPermissionCount} of{' '}
                                            {allPermissionNames.length} selected
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="select-all-permissions"
                                                aria-label="Select all permissions"
                                                disabled={
                                                    allPermissionNames.length ===
                                                    0
                                                }
                                                checked={
                                                    allPermissions.indeterminate
                                                        ? 'indeterminate'
                                                        : allPermissions.checked
                                                }
                                                onCheckedChange={(checked) =>
                                                    setPermissionsSelected(
                                                        allPermissionNames,
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="select-all-permissions"
                                                className="cursor-pointer text-sm text-foreground"
                                            >
                                                Select all
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                                {groupedPermissions.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                        No permissions are configured yet.
                                    </div>
                                ) : (
                                    <div
                                        data-slot="permission-groups"
                                        className="grid gap-4"
                                    >
                                        {permissionGroupsWithSelection.map(
                                            (group) => (
                                                <section
                                                    key={group.key}
                                                    aria-labelledby={`permission-group-${group.key}`}
                                                    className="overflow-hidden rounded-xl border border-border/80 bg-muted/15"
                                                >
                                                    <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
                                                        <button
                                                            type="button"
                                                            className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            aria-expanded={
                                                                openPermissionGroup ===
                                                                group.key
                                                            }
                                                            aria-controls={`permission-group-content-${group.key}`}
                                                            aria-label={`${openPermissionGroup === group.key ? 'Collapse' : 'Expand'} ${group.label} permissions`}
                                                            onClick={() =>
                                                                setOpenPermissionGroup(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        current ===
                                                                        group.key
                                                                            ? null
                                                                            : group.key,
                                                                )
                                                            }
                                                        >
                                                            <ChevronDown
                                                                aria-hidden="true"
                                                                className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${openPermissionGroup === group.key ? 'rotate-180' : ''}`}
                                                            />
                                                            <span className="min-w-0">
                                                                <h3
                                                                    id={`permission-group-${group.key}`}
                                                                    className="text-sm font-semibold text-foreground"
                                                                >
                                                                    {
                                                                        group.label
                                                                    }
                                                                </h3>
                                                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                                                    {
                                                                        group
                                                                            .permissions
                                                                            .length
                                                                    }{' '}
                                                                    {group
                                                                        .permissions
                                                                        .length ===
                                                                    1
                                                                        ? 'action'
                                                                        : 'actions'}
                                                                </span>
                                                            </span>
                                                        </button>
                                                        <div className="flex shrink-0 items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <Label
                                                                    htmlFor={`select-all-${group.key}`}
                                                                    className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Select all
                                                                </Label>
                                                                <Checkbox
                                                                    id={`select-all-${group.key}`}
                                                                    aria-label={`Select all ${group.label} permissions`}
                                                                    checked={
                                                                        group
                                                                            .selection
                                                                            .indeterminate
                                                                            ? 'indeterminate'
                                                                            : group
                                                                                  .selection
                                                                                  .checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        setPermissionsSelected(
                                                                            group.permissionNames,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                                                {
                                                                    group
                                                                        .permissions
                                                                        .length
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        id={`permission-group-content-${group.key}`}
                                                        hidden={
                                                            openPermissionGroup !==
                                                            group.key
                                                        }
                                                        className="grid gap-2 p-3 sm:grid-cols-2"
                                                    >
                                                        {group.permissions.map(
                                                            (permission) => (
                                                                <label
                                                                    key={
                                                                        permission.id
                                                                    }
                                                                    className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-link/40 hover:bg-link/5"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        name="permissions[]"
                                                                        value={
                                                                            permission.name
                                                                        }
                                                                        checked={selectedPermissions.has(
                                                                            permission.name,
                                                                        )}
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setPermissionsSelected(
                                                                                [
                                                                                    permission.name,
                                                                                ],
                                                                                event
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
                                                                        className="mt-0.5 size-4 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                    />
                                                                    <span className="min-w-0 text-sm font-medium text-foreground">
                                                                        <span className="block capitalize">
                                                                            {permissionLabel(
                                                                                permission.name,
                                                                            )}
                                                                        </span>
                                                                        <span className="mt-0.5 block truncate font-mono text-xs font-normal text-muted-foreground">
                                                                            {
                                                                                permission.name
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                </label>
                                                            ),
                                                        )}
                                                    </div>
                                                </section>
                                            ),
                                        )}
                                    </div>
                                )}
                                <InputError message={errors.permissions} />
                            </fieldset>
                        </CardContent>
                        <CardFooter className="sticky bottom-0 z-20 justify-between gap-3 border-t border-border bg-background/95 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_16px_-16px_hsl(var(--foreground)/0.4)] backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-6">
                            <ActionLink href="/access/roles" variant="ghost">
                                Cancel
                            </ActionLink>
                            <Button disabled={processing} type="submit">
                                {submitLabel}
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Form>
        </Card>
    );
}

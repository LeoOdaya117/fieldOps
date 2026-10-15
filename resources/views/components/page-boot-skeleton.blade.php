@php
    $component ??= '';

    $family = match (true) {
        $component === 'welcome' => 'landing',
        $component === 'dashboard' => 'dashboard',
        str_starts_with($component, 'auth/') => 'auth',
        str_starts_with($component, 'settings/') => 'settings',
        in_array($component, [
            'access/audit',
            'access/ip-blocks',
            'access/registrations',
            'access/roles',
            'access/users',
            'access/visit-logs',
            'notifications/index',
            'system/countries',
            'system/timezones',
        ], true) => 'list',
        str_ends_with($component, '-show') || $component === 'access/registration-review' => 'detail',
        preg_match('/-(create|edit|invite)$/', $component) === 1 => 'form',
        default => 'generic',
    };
@endphp

<div
    id="page-loading-fallback"
    class="page-boot-skeleton min-h-[100svh] bg-background text-foreground {{ in_array($family, ['landing', 'auth'], true) ? '' : 'px-4 py-6 sm:px-6 lg:px-8' }}"
    role="status"
    aria-label="Loading page"
    aria-busy="true"
    data-page-loading-family="{{ $family }}"
>
    <span class="sr-only">Loading page</span>

    @if ($family === 'landing')
        <div data-page-loading-content aria-hidden="true" class="p-4 sm:p-6 lg:p-8">
            <div class="mx-auto max-w-7xl">
            <div class="flex h-14 items-center justify-between">
                <div class="page-loading-skeleton-block h-8 w-36 rounded-md bg-muted animate-pulse"></div>
                <div class="hidden items-center gap-6 md:flex">
                    <div class="page-loading-skeleton-block h-4 w-16 rounded bg-muted animate-pulse"></div>
                    <div class="page-loading-skeleton-block h-4 w-20 rounded bg-muted animate-pulse"></div>
                    <div class="page-loading-skeleton-block h-9 w-24 rounded-md bg-muted animate-pulse"></div>
                </div>
            </div>
            <div class="grid min-h-[70svh] items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div class="space-y-6">
                    <div class="page-loading-skeleton-block h-5 w-40 rounded-full bg-muted animate-pulse"></div>
                    <div class="space-y-3">
                        <div class="page-loading-skeleton-block h-11 w-full max-w-xl rounded-md bg-muted animate-pulse"></div>
                        <div class="page-loading-skeleton-block h-11 w-4/5 max-w-lg rounded-md bg-muted animate-pulse"></div>
                    </div>
                    <div class="space-y-2">
                        <div class="page-loading-skeleton-block h-4 w-full max-w-lg rounded bg-muted animate-pulse"></div>
                        <div class="page-loading-skeleton-block h-4 w-5/6 max-w-md rounded bg-muted animate-pulse"></div>
                    </div>
                    <div class="page-loading-skeleton-block h-11 w-36 rounded-md bg-muted animate-pulse"></div>
                </div>
                <div class="page-loading-skeleton-block aspect-[4/3] rounded-2xl border border-border bg-muted animate-pulse"></div>
            </div>
            </div>
        </div>
    @elseif ($family === 'auth')
        <div data-page-loading-content aria-hidden="true" class="mx-auto flex min-h-[80svh] w-full max-w-md items-center p-4 sm:p-6 lg:p-8">
            <div class="w-full rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <div class="mx-auto mb-8 h-10 w-10 rounded-lg bg-muted animate-pulse"></div>
                <div class="mx-auto mb-2 h-7 w-48 rounded bg-muted animate-pulse"></div>
                <div class="mx-auto mb-8 h-4 w-64 max-w-full rounded bg-muted animate-pulse"></div>
                <div class="space-y-5">
                    <div class="space-y-2"><div class="h-4 w-20 rounded bg-muted animate-pulse"></div><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></div>
                    <div class="space-y-2"><div class="h-4 w-24 rounded bg-muted animate-pulse"></div><div class="h-10 w-full rounded-md bg-muted animate-pulse"></div></div>
                    <div class="h-10 w-full rounded-md bg-muted animate-pulse"></div>
                </div>
            </div>
        </div>
    @else
        <div aria-hidden="true" class="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[96rem] gap-6">
            <aside class="hidden w-60 shrink-0 space-y-6 rounded-xl border border-border bg-card p-5 lg:block">
                <div class="h-8 w-36 rounded bg-muted animate-pulse"></div>
                <div class="space-y-3 pt-4">
                    @foreach (range(1, 7) as $item)
                        <div class="h-9 rounded-md bg-muted animate-pulse"></div>
                    @endforeach
                </div>
            </aside>

            <main class="min-w-0 flex-1">
                <header class="flex h-12 items-center justify-between gap-4">
                    <div class="h-8 w-40 rounded bg-muted animate-pulse sm:w-56"></div>
                    <div class="flex items-center gap-3">
                        <div class="hidden h-9 w-48 rounded-md bg-muted animate-pulse sm:block"></div>
                        <div class="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
                    </div>
                </header>

                <div data-page-loading-content aria-hidden="true" class="space-y-6 p-4 sm:p-6 lg:p-8">
                    @if (in_array($family, ['dashboard', 'list', 'generic'], true))
                        @if (in_array($family, ['list', 'generic'], true))
                        <div class="flex flex-wrap items-center justify-between gap-4">
                            <div class="h-9 w-52 rounded bg-muted animate-pulse"></div>
                            <div class="h-10 w-32 rounded-md bg-muted animate-pulse"></div>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <div class="h-10 min-w-52 flex-1 rounded-md bg-muted animate-pulse"></div>
                            <div class="h-10 w-36 rounded-md bg-muted animate-pulse"></div>
                        </div>
                        @endif
                        @if ($family === 'dashboard')
                            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            @foreach (range(1, 4) as $item)
                                <div class="space-y-4 rounded-xl border border-border bg-card p-5">
                                    <div class="h-4 w-24 rounded bg-muted animate-pulse"></div>
                                    <div class="h-8 w-32 rounded bg-muted animate-pulse"></div>
                                </div>
                            @endforeach
                            </div>
                        @endif
                        <div class="overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-6">
                        <div class="mb-6 h-6 w-40 rounded bg-muted animate-pulse"></div>
                        <div class="space-y-4">
                            @foreach (range(1, $family === 'dashboard' ? 5 : 7) as $item)
                                <div class="flex gap-4">
                                    <div class="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse"></div>
                                    <div class="flex-1 space-y-2 py-1">
                                        <div class="h-4 w-2/5 rounded bg-muted animate-pulse"></div>
                                        <div class="h-3 w-3/5 rounded bg-muted animate-pulse"></div>
                                    </div>
                                    <div class="hidden h-8 w-24 rounded bg-muted animate-pulse sm:block"></div>
                                </div>
                            @endforeach
                        </div>
                        </div>
                    @elseif ($family === 'detail')
                        <div class="h-9 w-64 max-w-full rounded bg-muted animate-pulse"></div>
                        <div class="rounded-xl border border-border bg-card p-5 sm:p-7">
                        <div class="mb-7 h-6 w-48 rounded bg-muted animate-pulse"></div>
                        <div class="grid gap-6 sm:grid-cols-2">
                            @foreach (range(1, 6) as $item)
                                <div class="space-y-2"><div class="h-4 w-24 rounded bg-muted animate-pulse"></div><div class="h-5 w-3/4 rounded bg-muted animate-pulse"></div></div>
                            @endforeach
                        </div>
                        </div>
                    @elseif ($family === 'form' || $family === 'settings')
                        <div class="h-9 w-64 max-w-full rounded bg-muted animate-pulse"></div>
                        <div class="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
                        @foreach (range(1, $family === 'settings' ? 5 : 6) as $item)
                            <div class="space-y-2"><div class="h-4 w-28 rounded bg-muted animate-pulse"></div><div class="h-10 w-full max-w-2xl rounded-md bg-muted animate-pulse"></div></div>
                        @endforeach
                        <div class="h-10 w-32 rounded-md bg-muted animate-pulse"></div>
                        </div>
                    @endif
                </div>
            </main>
        </div>
    @endif
</div>

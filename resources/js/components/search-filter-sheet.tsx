import type { ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DEFAULT_PAGE_SIZE,
    PageSizeSelect,
} from '@/components/ui/page-size-select';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

type SearchFilterSheetProps = {
    action: string;
    title: string;
    description?: string;
    resetHref: string;
    activeFilterCount?: number;
    pageSize?: number;
    children: ReactNode;
};

export default function SearchFilterSheet({
    action,
    title,
    description,
    resetHref,
    activeFilterCount = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    children,
}: SearchFilterSheetProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button type="button" variant="outline">
                    <SlidersHorizontal />
                    Search &amp; filter
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
                <SheetHeader className="border-b border-border">
                    <SheetTitle className="flex items-center gap-2">
                        <Search className="size-4 text-muted-foreground" />
                        {title}
                    </SheetTitle>
                    {description && (
                        <SheetDescription>{description}</SheetDescription>
                    )}
                </SheetHeader>
                <form
                    method="get"
                    action={action}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex-1 space-y-5 overflow-y-auto p-4">
                        {children}
                        <div className="grid gap-2 border-t border-border pt-5">
                            <label
                                htmlFor="filter-page-size"
                                className="text-sm font-medium"
                            >
                                Rows per page
                            </label>
                            <PageSizeSelect
                                key={pageSize}
                                id="filter-page-size"
                                name="per_page"
                                pageSize={pageSize}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Choose how many records appear in each table
                                page.
                            </p>
                        </div>
                    </div>
                    <SheetFooter className="flex-row justify-end border-t border-border">
                        <SheetClose asChild>
                            <ActionLink href={resetHref} variant="outline">
                                Reset
                            </ActionLink>
                        </SheetClose>
                        <SheetClose asChild>
                            <Button type="submit">Apply filters</Button>
                        </SheetClose>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

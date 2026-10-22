import { Link } from '@inertiajs/react';
import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, ComponentProps } from 'react';
import { isExternalNavigationHref } from '@/lib/navigation';

type NavigationLinkProps = Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'href' | 'onProgress' | 'onCancel' | 'onSuccess' | 'onError'
> & {
    href: string;
    prefetch?: boolean;
};

export const NavigationLink = forwardRef<
    HTMLAnchorElement,
    NavigationLinkProps
>(function NavigationLink({ href, prefetch, ...props }, ref) {
    if (isExternalNavigationHref(href)) {
        return <a href={href} ref={ref} {...props} />;
    }

    const { onClick, ...anchorProps } = props;

    return (
        <Link
            href={href}
            prefetch={prefetch}
            ref={ref}
            {...anchorProps}
            onClick={
                onClick as ComponentProps<typeof Link>['onClick'] | undefined
            }
        />
    );
});

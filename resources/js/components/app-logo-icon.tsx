import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M20 2.5 36 11.75v16.5L20 37.5 4 28.25v-16.5L20 2.5Z"
                fill="currentColor"
                fillOpacity="0.18"
            />
            <path
                d="m20 2.5 16 9.25v16.5L20 37.5 4 28.25v-16.5L20 2.5Zm0 5.2-11.5 6.64v10.72L20 31.7l11.5-6.64V14.34L20 7.7Z"
                fill="currentColor"
            />
            <path
                d="m8.5 14.34 11.5 6.64v10.72L8.5 25.06V14.34Z"
                fill="currentColor"
                fillOpacity="0.72"
            />
            <path
                d="m20 20.98 11.5-6.64v10.72L20 31.7V20.98Z"
                fill="var(--success)"
            />
            <path
                d="m20 7.7 11.5 6.64L20 20.98 8.5 14.34 20 7.7Z"
                fill="currentColor"
                fillOpacity="0.92"
            />
        </svg>
    );
}

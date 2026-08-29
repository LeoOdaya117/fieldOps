export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    position?: string | null;
    department?: string | null;
    email_verified_at: string | null;
    /* @chisel-2fa */
    two_factor_enabled?: boolean;
    /* @end-chisel-2fa */
    created_at: string;
    updated_at: string;
    status: 'active' | 'suspended';
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    authorization: {
        role: {
            id: number;
            name: string;
            displayName: string;
            isSystem: boolean;
        } | null;
        permissions: string[];
        isOwner: boolean;
    };
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

/* @chisel-2fa */
export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
/* @end-chisel-2fa */

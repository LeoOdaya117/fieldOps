import { Form, Head } from '@inertiajs/react';
import { Building2, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Region = { code: string; name: string };
type Province = { code: string; region_code: string; name: string };
type Locality = {
    code: string;
    region_code: string;
    province_code: string | null;
    name: string;
    type: 'city' | 'municipality';
    is_independent: boolean;
};

type Props = {
    location: {
        region_code: string | null;
        province_code: string | null;
        locality_code: string | null;
    };
    regions: Region[];
    provinces: Province[];
    localities: Locality[];
};

export default function OrganizationAddress({
    location,
    regions,
    provinces,
    localities,
}: Props) {
    const initialLocality = localities.find(
        (item) => item.code === location.locality_code,
    );
    const [regionCode, setRegionCode] = useState(location.region_code ?? '');
    const [parentChoice, setParentChoice] = useState(
        location.province_code
            ? `province:${location.province_code}`
            : initialLocality
              ? `locality:${initialLocality.code}`
              : '',
    );
    const [localityCode, setLocalityCode] = useState(
        location.locality_code ?? '',
    );

    const regionProvinces = useMemo(
        () =>
            provinces.filter((province) => province.region_code === regionCode),
        [provinces, regionCode],
    );
    const independentLocalities = useMemo(
        () =>
            localities.filter(
                (locality) =>
                    locality.region_code === regionCode &&
                    locality.province_code === null,
            ),
        [localities, regionCode],
    );
    const provinceCode = parentChoice.startsWith('province:')
        ? parentChoice.slice('province:'.length)
        : '';
    const submittedLocalityCode = parentChoice.startsWith('locality:')
        ? parentChoice.slice('locality:'.length)
        : localityCode;
    const provinceLocalities = useMemo(
        () =>
            localities.filter(
                (locality) => locality.province_code === provinceCode,
            ),
        [localities, provinceCode],
    );

    return (
        <>
            <Head title="Organization address" />

            <div className="settings-workspace overflow-hidden border border-border bg-card text-card-foreground">
                <Form
                    action="/settings/system/address"
                    method="patch"
                    options={{ preserveScroll: true }}
                >
                    {({ errors, processing }) => (
                        <>
                            <section className="settings-section">
                                <div className="mb-7 flex items-start gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                        <MapPin
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="max-w-2xl">
                                        <h2 className="text-base font-semibold">
                                            Primary address
                                        </h2>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            Select the organization’s Philippine
                                            region and locality. This reference
                                            follows the Q2 2026 PSGC
                                            publication.
                                        </p>
                                    </div>
                                </div>

                                {regions.length === 0 ? (
                                    <div className="rounded-lg border border-border bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                                        Philippine address references are not
                                        loaded yet. Run the PSGC reference
                                        seeder, then return to this page.
                                    </div>
                                ) : (
                                    <div className="grid gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="region-code">
                                                Region
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="region_code"
                                                value={regionCode}
                                            />
                                            <Select
                                                value={regionCode}
                                                onValueChange={(value) => {
                                                    setRegionCode(value);
                                                    setParentChoice('');
                                                    setLocalityCode('');
                                                }}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="region-code"
                                                    className="min-h-11 w-full bg-background"
                                                    aria-invalid={Boolean(
                                                        errors.region_code,
                                                    )}
                                                    aria-describedby={
                                                        errors.region_code
                                                            ? 'region-code-error'
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue placeholder="Select a region" />
                                                </SelectTrigger>
                                                <SelectContent
                                                    position="popper"
                                                    align="start"
                                                    className="max-h-80"
                                                >
                                                    {regions.map((region) => (
                                                        <SelectItem
                                                            key={region.code}
                                                            value={region.code}
                                                        >
                                                            {region.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                id="region-code-error"
                                                message={errors.region_code}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="address-parent">
                                                Province or region-level
                                                locality
                                            </Label>
                                            <Select
                                                value={parentChoice}
                                                onValueChange={(value) => {
                                                    setParentChoice(value);
                                                    setLocalityCode(
                                                        value.startsWith(
                                                            'locality:',
                                                        )
                                                            ? value.slice(
                                                                  'locality:'
                                                                      .length,
                                                              )
                                                            : '',
                                                    );
                                                }}
                                                disabled={!regionCode}
                                                required
                                            >
                                                <SelectTrigger
                                                    id="address-parent"
                                                    className="min-h-11 w-full bg-background"
                                                    aria-invalid={Boolean(
                                                        errors.province_code,
                                                    )}
                                                    aria-describedby={
                                                        errors.province_code
                                                            ? 'province-code-error'
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue placeholder="Select a province or independent locality" />
                                                </SelectTrigger>
                                                <SelectContent
                                                    position="popper"
                                                    align="start"
                                                    className="max-h-80"
                                                >
                                                    {regionProvinces.length >
                                                        0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>
                                                                Provinces
                                                            </SelectLabel>
                                                            {regionProvinces.map(
                                                                (province) => (
                                                                    <SelectItem
                                                                        key={
                                                                            province.code
                                                                        }
                                                                        value={`province:${province.code}`}
                                                                    >
                                                                        {
                                                                            province.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectGroup>
                                                    )}
                                                    {independentLocalities.length >
                                                        0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>
                                                                Independent and
                                                                region-level
                                                                localities
                                                            </SelectLabel>
                                                            {independentLocalities.map(
                                                                (locality) => (
                                                                    <SelectItem
                                                                        key={
                                                                            locality.code
                                                                        }
                                                                        value={`locality:${locality.code}`}
                                                                    >
                                                                        {
                                                                            locality.name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectGroup>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <input
                                                type="hidden"
                                                name="province_code"
                                                value={provinceCode}
                                            />
                                            <InputError
                                                id="province-code-error"
                                                message={errors.province_code}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="locality-code">
                                                Municipality or city
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="locality_code"
                                                value={submittedLocalityCode}
                                            />
                                            <Select
                                                value={submittedLocalityCode}
                                                onValueChange={setLocalityCode}
                                                disabled={
                                                    !provinceCode ||
                                                    parentChoice.startsWith(
                                                        'locality:',
                                                    )
                                                }
                                                required={
                                                    !parentChoice.startsWith(
                                                        'locality:',
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="locality-code"
                                                    className="min-h-11 w-full bg-background"
                                                    aria-invalid={Boolean(
                                                        errors.locality_code,
                                                    )}
                                                    aria-describedby={
                                                        errors.locality_code
                                                            ? 'locality-code-error'
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue placeholder="Select a municipality or city" />
                                                </SelectTrigger>
                                                <SelectContent
                                                    position="popper"
                                                    align="start"
                                                    className="max-h-80"
                                                >
                                                    {parentChoice.startsWith(
                                                        'locality:',
                                                    ) ? (
                                                        <SelectItem
                                                            value={
                                                                submittedLocalityCode
                                                            }
                                                        >
                                                            {independentLocalities.find(
                                                                (item) =>
                                                                    item.code ===
                                                                    submittedLocalityCode,
                                                            )?.name ??
                                                                'Selected region-level locality'}
                                                        </SelectItem>
                                                    ) : (
                                                        provinceLocalities.map(
                                                            (locality) => (
                                                                <SelectItem
                                                                    key={
                                                                        locality.code
                                                                    }
                                                                    value={
                                                                        locality.code
                                                                    }
                                                                >
                                                                    {
                                                                        locality.name
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {locality.type ===
                                                                    'city'
                                                                        ? 'City'
                                                                        : 'Municipality'}
                                                                </SelectItem>
                                                            ),
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                id="locality-code-error"
                                                message={errors.locality_code}
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/35 px-5 py-4 sm:px-7">
                                <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                                    <Building2
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Map coordinates are managed separately.
                                </p>
                                <Button
                                    disabled={
                                        processing || regions.length === 0
                                    }
                                >
                                    {processing ? 'Saving…' : 'Save address'}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

OrganizationAddress.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'System settings', href: '/settings/system' },
        { title: 'Address', href: '/settings/system/address' },
    ],
};

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { schoolLogoUrl, useSchool } from "@/modules/core/api";
import type { School } from "@/modules/core/types";
import { useState, type FormEvent } from "react";
import { useSaveSchool } from "../api";

// Every time zone name the browser knows ("Africa/Harare", "Africa/Lusaka", ...).
const ZONES: string[] = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

/** The school's own details: its name, contacts, currency, time zone and logo. */
export function SchoolTab() {
  const school = useSchool();
  if (school.isLoading) return <Skeleton />;
  // The form is built once the school has loaded, so its boxes start from the saved values.
  return <Profile school={school.data ?? null} />;
}

function Profile({ school }: { school: School | null }) {
  const save = useSaveSchool();
  const [form, setForm] = useState({
    name: school?.name ?? "",
    motto: school?.motto ?? "",
    address: school?.address ?? "",
    phone: school?.phone ?? "",
    email: school?.email ?? "",
    currency: school?.currency ?? "USD",
    // A brand-new school starts in this computer's zone until someone chooses.
    time_zone: school?.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  // Make sure the saved zone is in the list even if this browser does not know it.
  const zones = ZONES.includes(form.time_zone) ? ZONES : [form.time_zone, ...ZONES];

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="School profile">
        <Button form="school-form" busy={save.isPending}>Save</Button>
      </PageHeader>
      {save.isSuccess && <p className="text-sm text-board">Saved.</p>}
      {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}

      <Card>
        {/* side: labels on the left, as the design's form layout asks for forms that sit on a page. */}
        <form id="school-form" onSubmit={onSubmit} className="max-w-2xl space-y-3">
          <Field side label="School name"><Input required value={form.name} onChange={set("name")} /></Field>
          <Field side label="Motto"><Input value={form.motto} onChange={set("motto")} /></Field>
          <Field side label="Address"><Textarea value={form.address} onChange={set("address")} /></Field>
          <Field side label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <Field side label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field side label="Currency">
            <Input className="!w-28 font-mono" required maxLength={3} placeholder="USD" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field side label="Time zone">
            <Select value={form.time_zone} onChange={set("time_zone")}>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          </Field>
          <p className="text-sm text-ink-muted">The currency is the three-letter code written before every amount (USD, ZWG, ZMW). The time zone sets the clock and "the period on now" for everyone, wherever their phone thinks it is.</p>
        </form>
      </Card>

      {school ? <Logo school={school} /> : <Card className="text-ink-muted">Save the school's name first; then you can add its logo.</Card>}
    </div>
  );
}

/** Upload, replace or remove the logo. It acts as soon as a file is chosen, separately from Save above. */
function Logo({ school }: { school: School }) {
  const save = useSaveSchool();

  function upload(file: File | undefined) {
    if (!file) return;
    const data = new FormData(); // FormData is how a browser sends files
    data.set("logo", file);
    save.mutate(data);
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Logo</h2>
      <div className="flex flex-wrap items-center gap-4">
        {school.has_logo
          ? <img src={schoolLogoUrl()} alt="The school's logo" className="size-16 rounded-md border border-line object-contain" />
          : <div className="grid size-16 place-items-center rounded-md border border-dashed border-line text-sm text-ink-muted">None</div>}
        <input type="file" accept="image/*" className="min-w-0 text-sm" disabled={save.isPending} onChange={(e) => upload(e.target.files?.[0])} />
        {school.has_logo && (
          <Button variant="default" busy={save.isPending} onClick={() => window.confirm("Remove the logo?") && save.mutate({ logo: null })}>Remove logo</Button>
        )}
      </div>
      <p className="text-sm text-ink-muted">A picture up to 2 MB. It shows in the sidebar. Choosing a new file replaces the old one.</p>
      {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
    </Card>
  );
}

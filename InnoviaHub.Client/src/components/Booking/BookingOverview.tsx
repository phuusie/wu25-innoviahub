import type {Resource} from "../../types/bookingTypes";
import type {LoginResponse} from "../../services/authService";
import {formatDuration, formatLongDate} from "../../utils/bookingUtils";
import {ResourceTypeIcon} from "../Icons";

type BookingOverviewProps = {
  selected: Resource;
  date: string;
  timeSlot: string;
  endTime: string;
  purpose: string;
  user: LoginResponse | null;
  bookingError: string | null;
  isBooking: boolean;

  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function BookingOverview(
  {
    selected,
    date,
    timeSlot,
    endTime,
    purpose,
    user,
    bookingError,
    isBooking,
    onBack,
    onCancel,
    onConfirm,
  }: BookingOverviewProps) {
  const rows = [
    {label: "Datum", value: formatLongDate(date), mono: false},
    {label: "Tid", value: `${timeSlot}–${endTime}`, mono: true},
    {label: "Längd", value: formatDuration(timeSlot, endTime), mono: false},
    {label: "Bokas av", value: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), mono: false},
    ...(purpose ? [{label: "Syfte", value: purpose, mono: false}] : []),
  ];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text"
      >
        <span aria-hidden="true">←</span> Tillbaka
      </button>

      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold text-text">Stämmer det här?</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Kontrollera bokningen innan du bekräftar.</p>

        <div className="mb-6 rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-4 border-b border-border pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <ResourceTypeIcon name={selected.type.name} className="h-6 w-6"/>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-text">{selected.label}</p>
              <p className="text-sm text-muted">{selected.type.name} · {selected.sub}</p>
            </div>
          </div>

          <dl>
            {rows.map((row) => (
              <div key={row.label}
                   className="flex items-start justify-between gap-6 border-b border-border py-3 last:border-b-0">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd
                  className={`max-w-xs text-right text-sm font-medium text-text first-letter:uppercase ${row.mono ? "mono" : ""}`}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mb-6 text-sm text-muted">
          Bokningen sparas direkt och syns under <span className="text-text">Din nästa bokning</span> på startsidan.
        </p>

        {bookingError && (
          <p role="alert" className="mb-6 text-sm text-rose">{bookingError}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 flex-1 rounded-xl border border-field font-display text-sm font-semibold text-muted transition-colors hover:text-text"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBooking}
            className="min-h-12 flex-1 rounded-xl bg-teal font-display text-sm font-semibold text-bg transition-opacity disabled:opacity-60"
          >
            {isBooking ? "Bokar…" : "Bekräfta bokning"}
          </button>
        </div>
      </div>
    </div>
  );
}

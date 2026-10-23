import type {Resource} from "../../types/bookingTypes";
import type {LoginResponse} from "../../services/authService";
import type {Booking} from "../../services/bookingApiService";
import {formatDuration, formatLongDate} from "../../utils/bookingUtils";
import {ResourceTypeIcon} from "../Icons";

type BookingConfirmationProps = {
  selected: Resource;
  createdBooking: Booking | null;
  date: string;
  timeSlot: string;
  endTime: string;
  user: LoginResponse | null;

  onBookAnother: () => void;
  onShowMyBookings: () => void;
};

export default function BookingConfirmation({
                                              selected,
                                              date,
                                              timeSlot,
                                              endTime,
                                              user,
                                              onBookAnother,
                                              onShowMyBookings,
                                            }: BookingConfirmationProps) {
  const rows = [
    {label: "Datum", value: formatLongDate(date), mono: false},
    {label: "Tid", value: `${timeSlot}–${endTime}`, mono: true},
    {label: "Längd", value: formatDuration(timeSlot, endTime), mono: false},
    {label: "Bokad av", value: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(), mono: false},
  ];

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal/40 bg-teal/10">
          <span aria-hidden="true" className="text-3xl text-teal">✓</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-text">Klart, det är bokat!</h1>
        <p className="mt-2 text-sm text-muted">
          {selected.label} är ditt {formatLongDate(date)}, {timeSlot}–{endTime}.
        </p>
      </div>

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
                 className="flex items-center justify-between gap-6 border-b border-border py-3 last:border-b-0">
              <dt className="text-sm text-muted">{row.label}</dt>
              <dd
                className={`text-right text-sm font-medium text-text first-letter:uppercase ${row.mono ? "mono" : ""}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onShowMyBookings}
          className="min-h-12 flex-1 rounded-xl border border-field font-display text-sm font-semibold text-text transition-colors hover:border-teal/60"
        >
          Mina bokningar
        </button>
        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-12 flex-1 rounded-xl bg-teal font-display text-sm font-semibold text-bg"
        >
          Boka något mer
        </button>
      </div>
    </div>
  );
}

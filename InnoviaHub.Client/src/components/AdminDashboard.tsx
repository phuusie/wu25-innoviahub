import Alert from "./Alert";
import type {Booking} from "../services/bookingApiService";

type AdminDashboardProps = {
  alerts: number;
  recentBookings: Booking[];
  bookingError: string | null;
  onDeleteBooking: (id: string) => void;
  onClearBookingError: () => void;
  activeBookingCount: number;
  newBookingCount: number;
  occupancyPercentage: number;
};

function formatDay(iso: string) {
  const text = new Date(iso).toLocaleDateString("sv-SE", {weekday: "short", day: "numeric", month: "short"});
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", {hour: "2-digit", minute: "2-digit"});
}

export default function AdminDashboard({
                                         alerts,
                                         recentBookings,
                                         bookingError,
                                         onDeleteBooking,
                                         onClearBookingError,
                                         activeBookingCount,
                                         newBookingCount,
                                         occupancyPercentage,
                                       }: AdminDashboardProps) {
  const kpis = [
    {label: "Beläggning", value: `${occupancyPercentage}%`, sub: "av alla resurser just nu", warn: false},
    {label: "Pågår nu", value: String(activeBookingCount), sub: "bokningar", warn: false},
    {
      label: "Larm",
      value: String(alerts),
      sub: alerts === 1 ? "sensor kräver åtgärd" : "sensorer kräver åtgärd",
      warn: alerts > 0
    },
    {label: "Nya idag", value: String(newBookingCount), sub: "skapade bokningar", warn: false},
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-text">Översikt</h1>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-surface p-5">
            <dt className="text-sm font-medium text-muted">{kpi.label}</dt>
            <dd className={`mono mt-1 text-3xl ${kpi.warn ? "text-rose" : "text-text"}`}>{kpi.value}</dd>
            <dd className="text-xs text-muted">{kpi.sub}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="upcoming-heading" className="rounded-xl border border-border bg-surface p-5">
        <h2 id="upcoming-heading" className="mb-4 font-display font-bold text-text">Kommande bokningar</h2>
        {bookingError && <Alert message={bookingError} type="error" onClose={onClearBookingError}/>}

        {recentBookings.length === 0 && (
          <p className="text-sm text-muted">Inga kommande bokningar.</p>
        )}

        <ul className="divide-y divide-border">
          {recentBookings.map((booking) => (
            <li key={booking.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{booking.resource.name}</p>
                <p className="text-sm text-muted">{booking.user.firstName} {booking.user.lastName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-text">{formatDay(booking.startTime)}</span>
                <span className="mono text-sm text-muted">
                  {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteBooking(booking.id)}
                  className="min-h-10 rounded-lg border border-rose/30 bg-rose/10 px-3 text-xs font-medium text-rose transition-colors hover:bg-rose/20 cursor-pointer"
                >
                  Ta bort
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

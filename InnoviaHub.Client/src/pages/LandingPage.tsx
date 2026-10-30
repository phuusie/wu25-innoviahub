import {useEffect, useState, type FormEvent} from "react";
import type {LoginResponse} from "../services/authService";
import AppHeader from "../components/AppHeader";
import {getAllUsers} from "../services/userService";
import {getAllBookings, type Booking} from "../services/bookingApiService";
import {getAllResources, type Resource} from "../services/resourceService";
import {connection, startNotificationConnection} from "../services/notificationService";
import {
  latestReadings,
  startTelemetryConnection,
  telemetryConnection,
  type Measurement,
} from "../services/telemetryService";
import ChatWidget from "../components/Chat/ChatWidget.tsx";
import {askAssistant, EXAMPLE_QUESTIONS} from "../utils/chatUtils";
import {
  IconArrowRight,
  IconCalendar,
  IconClock,
  IconSend,
  IconSparkles,
  IconThermometer,
  IconUsers,
  ResourceTypeIcon,
} from "../components/Icons";

type ResourceSummary = {
  label: string;
  total: number;
  available: number;
};

type LandingPageProps = {
  onBook: () => void;
  user: LoginResponse | null;
};

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 10) return "God morgon";
  if (hour < 18) return "Hej";
  return "God kväll";
}

function formatDay(date: Date) {
  const text = date.toLocaleDateString("sv-SE", {weekday: "short", day: "numeric", month: "short"});
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("sv-SE", {hour: "2-digit", minute: "2-digit"});
}

function relativeDay(start: Date, end: Date, now: Date) {
  if (start <= now && now < end) return "Pågår nu";

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return "Idag";
  if (days === 1) return "Imorgon";
  return `Om ${days} dagar`;
}

export default function LandingPage({onBook, user}: LandingPageProps) {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [resourceSummaries, setResourceSummaries] = useState<ResourceSummary[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [readings, setReadings] = useState<Record<string, Record<string, number>>>(
    () => ({...latestReadings})
  );
  const [question, setQuestion] = useState("");
  const [iotOffline, setIotOffline] = useState(false);

  useEffect(() => {
    async function loadOverview() {
      const [bookings, resources, users] = await Promise.all([
        getAllBookings(),
        getAllResources(),
        user?.isAdmin ? getAllUsers() : Promise.resolve(null),
      ]);

      if (users) {
        setMemberCount(users.length);
      }

      const now = new Date();

      setMyBookings(
        bookings
          .filter((booking) =>
            booking.user.id === user?.userId &&
            !booking.isCancelled &&
            new Date(booking.endTime) >= now)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      );

      const activeResources = resources.filter((resource) => resource.isActive);

      const occupiedResourceIds = new Set(
        bookings
          .filter((booking) =>
            !booking.isCancelled &&
            new Date(booking.startTime) <= now &&
            now < new Date(booking.endTime))
          .map((booking) => booking.resource.id)
      );

      const groupedResources = new Map<string, Resource[]>();
      activeResources.forEach((resource) => {
        const typeName = resource.resourceType.name;
        groupedResources.set(typeName, [...(groupedResources.get(typeName) ?? []), resource]);
      });

      setResourceSummaries(
        Array.from(groupedResources.entries()).map(([label, group]) => ({
          label,
          total: group.length,
          available: group.filter((resource) => !occupiedResourceIds.has(resource.id)).length,
        }))
      );

      setOccupancy(
        activeResources.length === 0
          ? 0
          : Math.round((occupiedResourceIds.size / activeResources.length) * 100)
      );
    }

    loadOverview().catch(console.error);
  }, [dataVersion, user?.isAdmin, user?.userId]);

  useEffect(() => {
    function handleBookingCreated() {
      setDataVersion((version) => version + 1);
    }

    connection.on("BookingCreated", handleBookingCreated);
    startNotificationConnection().catch((error) => {
      console.error("Kunde inte ansluta till signalR", error);
    });

    const id = window.setInterval(() => setDataVersion((version) => version + 1), 30_000);

    return () => {
      connection.off("BookingCreated", handleBookingCreated);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function handleMeasurement(measurement: Measurement) {
      setReadings((previous) => ({
        ...previous,
        [measurement.deviceId]: {
          ...previous[measurement.deviceId],
          [measurement.type]: measurement.value,
        },
      }));
    }

    telemetryConnection.on("measurementReceived", handleMeasurement);
    startTelemetryConnection().catch(() => setIotOffline(true));

    return () => {
      telemetryConnection.off("measurementReceived", handleMeasurement);
    };
  }, []);

  const temperatures = Object.values(readings)
    .map((reading) => reading.temperature)
    .filter((value): value is number => typeof value === "number");

  const averageTemperature = temperatures.length === 0
    ? null
    : temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length;

  const now = new Date();
  const nextBooking = myBookings[0];
  const laterBookings = myBookings.slice(1);

  function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;

    askAssistant(question);
    setQuestion("");
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader user={user}/>

      <main className="mx-auto max-w-6xl px-6 pb-36">
        <section className="grid gap-5 pt-10 lg:grid-cols-[1.6fr_1fr] lg:pt-14">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{background: "radial-gradient(ellipse 70% 60% at 0% 0%, rgba(0,212,170,0.10) 0%, transparent 70%)"}}
            />

            <div className="relative">
              <p className="mono text-xs uppercase tracking-wider text-teal">
                {greeting(now)}, {user?.firstName}
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold text-text md:text-4xl">
                Vad behöver du idag?
              </h1>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Skriv till assistenten så letar den upp lediga tider och föreslår en bokning.
                Du bekräftar alltid själv.
              </p>

              <form onSubmit={handleAsk} className="mt-6 flex gap-2">
                <label htmlFor="hero-question" className="sr-only">Fråga assistenten</label>
                <div
                  className="flex flex-1 items-center gap-3 rounded-xl border border-field bg-bg px-4 focus-within:border-teal">
                  <IconSparkles className="h-5 w-5 shrink-0 text-teal"/>
                  <input
                    id="hero-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="T.ex. ett rum för 4 imorgon eftermiddag"
                    maxLength={1000}
                    className="min-h-12 w-full bg-transparent text-sm text-text focus-visible:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Fråga assistenten"
                  disabled={!question.trim()}
                  className="flex min-w-12 items-center justify-center rounded-xl bg-teal text-bg transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  <IconSend className="h-5 w-5"/>
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => askAssistant(example)}
                    className="min-h-11 rounded-full border border-field px-4 text-xs text-muted transition-colors hover:border-teal hover:text-teal cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onBook}
                  className="min-h-11 px-2 text-xs text-muted underline-offset-4 hover:text-text hover:underline cursor-pointer"
                >
                  eller boka manuellt
                </button>
              </div>
            </div>
          </div>

          <aside aria-labelledby="next-booking-heading"
                 className="flex flex-col rounded-2xl border border-border bg-surface p-6">
            <h2 id="next-booking-heading" className="text-sm font-medium text-muted">
              Din nästa bokning
            </h2>

            {nextBooking ? (
              <>
                <div className="mt-4">
                  <span className="mono inline-block rounded-full bg-teal/10 px-2.5 py-1 text-xs text-teal">
                    {relativeDay(new Date(nextBooking.startTime), new Date(nextBooking.endTime), now)}
                  </span>
                  <p className="mt-3 font-display text-2xl font-semibold text-text">
                    {nextBooking.resource.name}
                  </p>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text">
                    <IconCalendar className="h-4 w-4 text-muted"/>
                    <dt className="sr-only">Datum</dt>
                    <dd>{formatDay(new Date(nextBooking.startTime))}</dd>
                  </div>
                  <div className="flex items-center gap-2 text-text">
                    <IconClock className="h-4 w-4 text-muted"/>
                    <dt className="sr-only">Tid</dt>
                    <dd className="mono">
                      {formatTime(new Date(nextBooking.startTime))}–{formatTime(new Date(nextBooking.endTime))}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Du har inga kommande bokningar.
              </p>
            )}

            <button
              type="button"
              onClick={onBook}
              className="mt-auto flex min-h-11 items-center gap-2 pt-6 text-sm font-medium text-teal hover:underline underline-offset-4 cursor-pointer"
            >
              Boka något nytt <IconArrowRight className="h-4 w-4"/>
            </button>
          </aside>
        </section>

        <section aria-labelledby="now-heading" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="now-heading" className="font-display text-xl font-bold text-text">
              Just nu i huset
            </h2>
            <span className="mono text-xs text-muted">Uppdateras löpande</span>
          </div>

          <div className="grid overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[1fr_2fr]">
            <dl
              className="grid grid-cols-2 divide-border border-b border-border md:grid-cols-1 md:divide-y md:border-r md:border-b-0">
              <div className="p-5">
                <dt className="text-xs text-muted">Beläggning</dt>
                <dd className="mono mt-1 text-3xl text-text">
                  {occupancy === null ? "–" : `${occupancy}%`}
                </dd>
              </div>
              <div className="p-5">
                <dt className="flex items-center gap-1.5 text-xs text-muted">
                  <IconThermometer className="h-3.5 w-3.5"/> Temperatur
                </dt>
                <dd className="mono mt-1 text-3xl text-text">
                  {averageTemperature === null ? "–" : `${averageTemperature.toFixed(1)}°`}
                </dd>
                {averageTemperature === null && (
                  <dd className="mt-1 text-xs text-muted">
                    {iotOffline ? "Sensorerna är offline" : "Väntar på sensordata"}
                  </dd>
                )}
              </div>
              {user?.isAdmin && (
                <div className="p-5">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <IconUsers className="h-3.5 w-3.5"/> Medlemmar
                  </dt>
                  <dd className="mono mt-1 text-3xl text-text">{memberCount ?? "–"}</dd>
                </div>
              )}
            </dl>

            <ul className="divide-y divide-border">
              {resourceSummaries.map((summary) => {
                const share = summary.total === 0 ? 0 : (summary.available / summary.total) * 100;

                return (
                  <li key={summary.label} className="flex items-center gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-panel text-muted">
                      <ResourceTypeIcon name={summary.label} className="h-5 w-5"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-text">{summary.label}</span>
                        <span className="mono text-sm text-muted">
                          <span className={summary.available > 0 ? "text-text" : "text-rose"}>
                            {summary.available}
                          </span>{" "}
                          av {summary.total} lediga
                        </span>
                      </div>
                      <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel">
                        <div
                          className="h-full rounded-full bg-teal/70 transition-all duration-700"
                          style={{width: `${share}%`}}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}

              {resourceSummaries.length === 0 && (
                <li className="p-5 text-sm text-muted">Inga resurser att visa ännu.</li>
              )}
            </ul>
          </div>
        </section>

        {laterBookings.length > 0 && (
          <section aria-labelledby="later-heading" className="mt-12">
            <h2 id="later-heading" className="mb-4 font-display text-xl font-bold text-text">
              Fler kommande bokningar
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {laterBookings.map((booking) => (
                <li key={booking.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4">
                  <span className="w-28 text-sm text-text">
                    {formatDay(new Date(booking.startTime))}
                  </span>
                  <span className="mono w-28 text-sm text-muted">
                    {formatTime(new Date(booking.startTime))}–{formatTime(new Date(booking.endTime))}
                  </span>
                  <span className="text-sm text-text">{booking.resource.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-8 pb-28">
        <span className="font-display text-sm text-muted">© 2026 Innovia Hub</span>
      </footer>

      <ChatWidget/>
    </div>
  );
}

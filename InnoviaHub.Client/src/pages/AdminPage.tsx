import {useEffect, useState} from "react";
import type {LoginResponse} from "../services/authService";
import Alert from "../components/Alert";
import UserAvatar from "../components/UserAvatar";
import AdminDashboard from "../components/AdminDashboard";
import AdminNavigation from "../components/AdminNavigation";
import AdminSensors from "../components/AdminSensors";
import MembersAdmin from "../components/MembersAdmin";
import ResourcesAdmin from "../components/ResourcesAdmin";
import {sensors, type AdminTab} from "../components/adminData";
import {deleteBooking, getAllBookings, type Booking} from "../services/bookingApiService";
import {getAllResources, type Resource} from "../services/resourceService";

export default function AdminPage({onBack, user}: { onBack: () => void; user: LoginResponse }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const alertCount = sensors.filter((sensor) => sensor.status !== "ok").length;

  useEffect(() => {
    async function loadBookings() {
      try {
        const [bookings, apiResources] = await Promise.all([getAllBookings(), getAllResources()]);
        setResources(apiResources.filter((resource) => resource.isActive));
        setRecentBookings(
          bookings
            .filter((booking) => !booking.isCancelled)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
        );
      } catch (error) {
        setBookingError(error instanceof Error ? error.message : "Kunde inte hämta bokningar");
      }
    }

    loadBookings();
  }, []);

  async function confirmDeleteBooking() {
    if (!bookingToDelete) return;

    try {
      await deleteBooking(bookingToDelete);
      setRecentBookings((currentBookings) => currentBookings.filter((booking) => booking.id !== bookingToDelete));
      setBookingError(null);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Kunde inte ta bort bokningen");
    } finally {
      setBookingToDelete(null);
    }
  }

  const now = new Date();
  const activeBookings = recentBookings.filter((booking) =>
    new Date(booking.startTime) <= now && new Date(booking.endTime) > now
  );
  // Pågående och framtida bokningar, gamla visas inte
  const upcomingBookings = recentBookings.filter((booking) => new Date(booking.endTime) > now);
  const today = now.toLocaleDateString("sv-SE");
  const newBookingCount = recentBookings.filter(
    (booking) => new Date(booking.createdAt).toLocaleDateString("sv-SE") === today,
  ).length;
  // Beläggning = andel resurser som är bokade just nu
  const occupiedResourceIds = new Set(activeBookings.map((booking) => booking.resource.id));
  const occupancyPercentage = resources.length === 0
    ? 0
    : Math.min(100, Math.round((occupiedResourceIds.size / resources.length) * 100));

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {bookingToDelete && (
        <Alert
          message="Vill du ta bort bokningen?"
          type="confirm"
          onClose={() => setBookingToDelete(null)}
          onConfirm={confirmDeleteBooking}
        />
      )}
      <AdminHeader onBack={onBack} user={user} alertCount={alertCount}/>
      <div className="flex flex-1">
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border px-3 pt-6 md:flex">
          <AdminNavigation tab={tab} onTabChange={setTab} alertCount={alertCount}/>
          <SystemStatus/>
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex gap-2 mb-6 md:hidden flex-wrap">
            <AdminNavigation tab={tab} onTabChange={setTab} alertCount={alertCount} mobile/>
          </div>
          {tab === "dashboard" && (
            <AdminDashboard
              alerts={alertCount}
              recentBookings={upcomingBookings}
              bookingError={bookingError}
              onDeleteBooking={setBookingToDelete}
              onClearBookingError={() => setBookingError(null)}
              activeBookingCount={activeBookings.length}
              newBookingCount={newBookingCount}
              occupancyPercentage={occupancyPercentage}
            />
          )}
          {tab === "sensors" && <AdminSensors/>}
          {tab === "resources" && <ResourcesAdmin/>}
          {tab === "members" && <MembersAdmin/>}
        </main>
      </div>
    </div>
  );
}

function AdminHeader({onBack, user, alertCount}: { onBack: () => void; user: LoginResponse; alertCount: number }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-lg sm:px-6 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Tillbaka till startsidan"
          className="flex min-h-11 items-center gap-1 text-sm text-muted hover:text-text"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">Tillbaka</span>
        </button>
        <span aria-hidden="true" className="h-4 w-px bg-border"/>
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{background: "linear-gradient(135deg, #00d4aa, #0070f3)"}}
          >
            ◈
          </div>
          <span className="font-display font-bold text-text">Admin</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {alertCount > 0 && (
          <div
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-rose/30 bg-rose/10 px-3 py-1.5">
            <span aria-hidden="true" className="pulse-dot h-2 w-2 rounded-full bg-rose"/>
            <span className="mono text-xs text-rose">
              {alertCount === 1 ? "1 aktivt larm" : `${alertCount} aktiva larm`}
            </span>
          </div>
        )}
        <UserAvatar user={user}/>
        <span className="hidden text-sm text-text md:block">{user.firstName} {user.lastName}</span>
      </div>
    </header>
  );
}

function SystemStatus() {
  return (
    <div className="mt-auto pb-6 px-3">
      <div className="rounded-xl border border-border bg-panel p-3">
        <div className="mono mb-1 text-xs text-muted">Systemstatus</div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="pulse-dot h-2 w-2 rounded-full bg-teal"/>
          <span className="text-xs text-teal">Alla system online</span>
        </div>
      </div>
    </div>
  );
}
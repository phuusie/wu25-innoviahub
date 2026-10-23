import {useEffect, useState} from "react";
import type {LoginResponse} from "../services/authService";
import {
  createBooking,
  getAllBookings,
  type Booking,
} from "../services/bookingApiService";
import {
  getAllResources,
  getAllResourceTypes,
  type Resource as ApiResource,
  type ResourceType,
} from "../services/resourceService";
import AppHeader from "../components/AppHeader";
import BookingNotification from "../components/Booking/BookingNotification.tsx";
import {
  connection,
  startNotificationConnection,
} from "../services/notificationService";
import {
  addDays,
  availableStartTimes,
  bookingOverlapsSelection,
  CLOSING_MINUTES,
  defaultEndTime,
  formatTime,
  generateTimeSlots,
  OPENING_MINUTES,
  STEP_MINUTES,
  toDateString,
  toDateTime,
  toMinutes,
} from "../utils/bookingUtils";
import {getAvailability} from "../services/availabilityService";
import BookingStepIndicator from "../components/Booking/BookingStepIndicator.tsx";
import ResourceTypeSelection from "../components/Booking/ResourceTypeSelection.tsx";
import BookingConfiguration from "../components/Booking/BookingConfiguration.tsx";
import BookingOverview from "../components/Booking/BookingOverview.tsx";
import type {Resource, Step} from "../types/bookingTypes.ts";
import BookingConfirmation from "../components/Booking/BookingConfirmation.tsx";

// Starttider från öppning till sista kvarten före stängning
const timeSlots = generateTimeSlots(OPENING_MINUTES, CLOSING_MINUTES - STEP_MINUTES, STEP_MINUTES);

// Idag om det finns tider kvar, annars imorgon
function initialBookingDate() {
  const today = toDateString(new Date());

  return availableStartTimes(timeSlots, today).length > 0
    ? today
    : addDays(today, 1);
}

function initialStartTime(date: string) {
  return availableStartTimes(timeSlots, date)[0] ?? "";
}

function mapApiResource(resource: ApiResource): Resource {
  return {
    id: resource.id,
    type: resource.resourceType,
    label: resource.name,
    sub: `${resource.capacity} ${resource.capacity === 1 ? "plats" : "platser"}`,
    status: "available",
    features: [],
    color: "#3b82f6",
    icon: "⬜",
  };
}

type BookingPageProps = {
  user: LoginResponse | null;
  onGoHome: () => void;
};

export default function BookingPage({user, onGoHome}: BookingPageProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [date, setDate] = useState(initialBookingDate);
  const [timeSlot, setTimeSlot] = useState(() => initialStartTime(initialBookingDate()));
  const [endTime, setEndTime] = useState(() => {
    const start = initialStartTime(initialBookingDate());
    return start ? defaultEndTime(start) : "";
  });
  const [dateNotice, setDateNotice] = useState<string | null>(
    () => initialBookingDate() !== toDateString(new Date())
      ? "Det finns inga fler tider idag, så vi visar imorgon."
      : null
  );
  const [freeRanges, setFreeRanges] = useState<Record<string, string[]>>({});
  const [purpose, setPurpose] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [latestBooking, setLatestBooking] = useState<Booking | null>(null);

  const startTimes = availableStartTimes(timeSlots, date);

  // Status räknas ut direkt från bokningarna, så den alltid stämmer med valt datum och tid
  const filtered: Resource[] = resources
    .filter((r) => r.type.id === selectedTypeId)
    .sort((a, b) =>
      a.label.localeCompare(b.label, "sv-SE", {numeric: true})
    )
    .map((resource) => ({
      ...resource,
      status: timeSlot && endTime && bookings.some((booking) =>
        bookingOverlapsSelection(booking, resource.id, date, timeSlot, endTime),
      )
        ? "booked"
        : "available",
    }));

  // Ny starttid nollställer sluttiden, så att nästa klick i tidsrutnätet väljer den
  function changeStartTime(newStart: string) {
    setTimeSlot(newStart);
    setEndTime("");
    setSelected(null);
  }

  function changeEndTime(newEnd: string) {
    setEndTime(newEnd);
    setSelected(null);
  }

  // Nytt datum: byt starttid om den valda har passerat den dagen
  function changeDate(newDate: string) {
    const times = availableStartTimes(timeSlots, newDate);

    setDate(newDate);
    setDateNotice(null);
    setSelected(null);

    if (times.includes(timeSlot)) return;

    const newStart = times[0] ?? "";
    setTimeSlot(newStart);
    if (newStart && (!endTime || toMinutes(endTime) <= toMinutes(newStart))) setEndTime(defaultEndTime(newStart));
  }

  function handleSelectResourceType(resourceTypeId: string) {
    setSelectedTypeId(resourceTypeId);
    setSelected(null);
    setStep("configure");
  }

  async function confirmBooking() {
    if (!selected) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      const booking = await createBooking({
        resourceId: selected.id,
        startTime: toDateTime(date, timeSlot).toISOString(),
        endTime: toDateTime(date, endTime).toISOString(),
      });

      setCreatedBooking(booking);
      setBookings((currentBookings) => [...currentBookings, booking]);
      setStep("confirmation");
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "Bokningen kunde inte skapas");
    } finally {
      setIsBooking(false);
    }
  }

  function reset() {
    setSelected(null);
    setStep("select");
    setPurpose("");
    setBookingError(null);
  }

  useEffect(() => {
    async function loadResources() {
      try {
        const [apiResources, bookings, resourceTypes] = await Promise.all([
          getAllResources(),
          getAllBookings(),
          getAllResourceTypes(),
        ]);
        setBookings(bookings);
        setResourceTypes(resourceTypes);

        setResources(
          apiResources
            .filter((resource) => resource.isActive)
            .map((resource) => ({
              ...mapApiResource(resource),
              status: "available",
            })),
        );
      } catch (error) {
        setBookingError(error instanceof Error ? error.message : "Kunde inte hämta resurser");
      }
    }

    loadResources();
  }, []);

  // Lediga intervall per resurs, från samma endpoint som AI-assistenten använder
  useEffect(() => {
    if (!selectedTypeId) return;

    let isCurrent = true;

    getAvailability(date, selectedTypeId)
      .then((availability) => {
        if (!isCurrent) return;

        setFreeRanges(Object.fromEntries(
          availability.map((resource) => [
            resource.resourceId,
            resource.freeSlots.map((slot) => `${formatTime(slot.startTime)}–${formatTime(slot.endTime)}`),
          ])
        ));
      })
      .catch(() => {
        if (isCurrent) setFreeRanges({});
      });

    return () => {
      isCurrent = false;
    };
  }, [date, selectedTypeId, bookings]);

  useEffect(() => {
    let isMounted = true;

    async function connectToNotifications() {
      try {
        connection.on("BookingCreated", (booking) => {
          // SignalR-eventet innehåller den bokade resursens databasID.
          const resourceId = booking.resource?.id;

          if (!resourceId) return;

          setLatestBooking(booking);

          setBookings((currentBookings) =>
            currentBookings.some((currentBooking) => currentBooking.id === booking.id)
              ? currentBookings
              : [...currentBookings, booking],
          );
        });

        await startNotificationConnection();

        if (!isMounted) return;
      } catch (error) {
        console.error("Kunde inte ansluta till SignalR:", error);
      }
    }

    connectToNotifications();

    return () => {
      isMounted = false;
      connection.off("BookingCreated");
    };
  }, []);

  useEffect(() => {
    if (!latestBooking) return;

    const timeoutId = window.setTimeout(() => setLatestBooking(null), 5000);

    return () => window.clearTimeout(timeoutId);
  }, [latestBooking]);


  return (
    <div className="min-h-screen bg-bg">
      {latestBooking && (
        <BookingNotification
          booking={latestBooking}
          onClose={() => setLatestBooking(null)}
        />
      )}
      <AppHeader user={user}/>

      <main className="max-w-6xl mx-auto px-6 pt-8 pb-32">
        <BookingStepIndicator step={step}/>

        {step === "select" && (
          <ResourceTypeSelection
            resourceTypes={resourceTypes}
            onSelectResourceType={handleSelectResourceType}
          />
        )}

        {step === "configure" && (
          <BookingConfiguration
            date={date}
            dateNotice={dateNotice}
            timeSlot={timeSlot}
            endTime={endTime}
            startTimes={startTimes}
            resources={filtered}
            freeRanges={freeRanges}
            selected={selected}
            purpose={purpose}
            onDateChange={changeDate}
            onTimeSlotChange={changeStartTime}
            onEndTimeChange={changeEndTime}
            onSelectResource={setSelected}
            onPurposeChange={setPurpose}
            onBack={() => setStep("select")}
            onContinue={() => setStep("overview")}
          />
        )}

        {step === "overview" && selected && (
          <BookingOverview
            selected={selected}
            date={date}
            timeSlot={timeSlot}
            endTime={endTime}
            purpose={purpose}
            user={user}
            bookingError={bookingError}
            isBooking={isBooking}
            onBack={() => setStep("configure")}
            onCancel={reset}
            onConfirm={confirmBooking}
          />
        )}

        {step === "confirmation" && selected && createdBooking && (
          <BookingConfirmation
            selected={selected}
            createdBooking={createdBooking}
            date={date}
            timeSlot={timeSlot}
            endTime={endTime}
            user={user}
            onShowMyBookings={onGoHome}
            onBookAnother={() => {
              const nextDate = initialBookingDate();
              const nextStart = initialStartTime(nextDate);

              setStep("select");
              setSelected(null);
              setDate(nextDate);
              setTimeSlot(nextStart);
              setEndTime(nextStart ? defaultEndTime(nextStart) : "");
              setPurpose("");
            }}
          />
        )}
      </main>
    </div>
  );
}

import {useState} from "react";
import BookingCalendar from "./BookingCalendar";
import type {Resource} from "../../types/bookingTypes.ts";
import {ResourceTypeIcon, IconArrowRight} from "../Icons.tsx";
import {
  addDays,
  CLOSING_MINUTES,
  formatDuration,
  formatLongDate,
  minutesToTime,
  toMinutes,
} from "../../utils/bookingUtils.ts";

const CLOSING_TIME = minutesToTime(CLOSING_MINUTES);

type BookingConfigurationProps = {
  date: string;
  dateNotice: string | null;
  timeSlot: string;
  endTime: string;
  startTimes: string[];
  resources: Resource[];
  freeRanges: Record<string, string[]>;
  selected: Resource | null;
  purpose: string;
  onDateChange: (date: string) => void;
  onTimeSlotChange: (timeSlot: string) => void;
  onEndTimeChange: (endTime: string) => void;
  onSelectResource: (resource: Resource) => void;
  onPurposeChange: (purpose: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

type ChipState = "edge" | "range" | "preview" | "idle";

function chipClass(state: ChipState) {
  const base = "mono min-h-11 rounded-lg border text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30";

  switch (state) {
    case "edge":
      return `${base} border-teal bg-teal font-semibold text-bg`;
    case "range":
      return `${base} border-teal/30 bg-teal/15 text-teal`;
    case "preview":
      return `${base} border-teal/20 bg-teal/5 text-teal/80`;
    default:
      return `${base} border-field text-muted hover:border-teal/60 hover:text-text`;
  }
}

export default function BookingConfiguration({
                                               date,
                                               dateNotice,
                                               timeSlot,
                                               endTime,
                                               startTimes,
                                               resources,
                                               freeRanges,
                                               selected,
                                               purpose,
                                               onDateChange,
                                               onTimeSlotChange,
                                               onEndTimeChange,
                                               onSelectResource,
                                               onPurposeChange,
                                               onBack,
                                               onContinue,
                                             }: BookingConfigurationProps) {
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);

  // Starttiderna plus stängningstiden, som bara kan vara en sluttid
  const times = startTimes.length > 0 ? [...startTimes, CLOSING_TIME] : [];
  const morning = times.filter((time) => toMinutes(time) < 12 * 60);
  const afternoon = times.filter((time) => toMinutes(time) >= 12 * 60);

  const hasTime = !!timeSlot && !!endTime;
  const choosingEnd = !!timeSlot && !endTime;
  const selectedRange = hasTime ? `${timeSlot}–${endTime}` : null;

  // Första klicket väljer start, andra klicket på en senare tid väljer slut.
  // En tidigare tid, eller ett klick när båda redan är valda, börjar om.
  function handleTimeClick(time: string) {
    if (choosingEnd && toMinutes(time) > toMinutes(timeSlot)) {
      onEndTimeChange(time);
      return;
    }

    if (time !== CLOSING_TIME) onTimeSlotChange(time);
  }

  function chipState(time: string): ChipState {
    const minutes = toMinutes(time);

    if (time === timeSlot || time === endTime) return "edge";
    if (hasTime && minutes > toMinutes(timeSlot) && minutes < toMinutes(endTime)) return "range";

    if (choosingEnd && hoveredTime && minutes > toMinutes(timeSlot) && minutes <= toMinutes(hoveredTime))
      return "preview";

    return "idle";
  }

  function chipLabel(time: string) {
    if (time === timeSlot) return `${time}, starttid`;
    if (time === endTime) return `${time}, sluttid`;
    return time;
  }

  function renderTimeGroup(label: string, groupTimes: string[]) {
    if (groupTimes.length === 0) return null;

    return (
      <div>
        <p className="mb-2 text-xs text-muted">{label}</p>
        <div className="grid grid-cols-4 gap-2">
          {groupTimes.map((time) => (
            <button
              key={time}
              type="button"
              aria-label={chipLabel(time)}
              aria-pressed={time === timeSlot || time === endTime}
              disabled={time === CLOSING_TIME && !choosingEnd}
              onClick={() => handleTimeClick(time)}
              onMouseEnter={() => setHoveredTime(time)}
              onMouseLeave={() => setHoveredTime(null)}
              onFocus={() => setHoveredTime(time)}
              onBlur={() => setHoveredTime(null)}
              className={chipClass(chipState(time))}
            >
              {time}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex min-h-11 items-center gap-2 text-sm text-muted hover:text-text"
      >
        <span aria-hidden="true">←</span> Tillbaka
      </button>

      <h1 className="font-display text-2xl font-bold text-text">Välj tid och resurs</h1>
      <p className="mt-1 mb-8 text-sm text-muted">
        Välj datum, när du vill börja och när du vill sluta. Till höger ser du vad som är ledigt.
      </p>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* När */}
        <div className="space-y-6 rounded-2xl border border-border bg-surface p-5">
          {dateNotice && (
            <p role="status" className="rounded-lg bg-teal/10 px-3 py-2 text-sm text-teal">
              {dateNotice}
            </p>
          )}

          <div role="group" aria-labelledby="booking-date-heading">
            <h2 id="booking-date-heading" className="mb-2 text-sm font-medium text-text">Datum</h2>
            <BookingCalendar key={date.slice(0, 7)} selectedDate={date} onSelectDate={onDateChange}/>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="booking-time-heading" className="text-sm font-medium text-text">Tid</h2>
              {hasTime && (
                <span className="mono text-xs text-teal">{formatDuration(timeSlot, endTime)}</span>
              )}
            </div>

            {times.length > 0 && (
              <p role="status" className="mb-3 text-xs text-muted">
                {choosingEnd
                  ? <>Start <span className="mono text-text">{timeSlot}</span>. Klicka på tiden då bokningen ska
                    sluta.</>
                  : hasTime
                    ? <>Vald tid <span className="mono text-text">{selectedRange}</span>. Klicka på en ny tid för att
                      börja om.</>
                    : "Klicka på en starttid och sedan på en sluttid."}
              </p>
            )}

            <div role="group" aria-labelledby="booking-time-heading" className="space-y-4">
              {renderTimeGroup("Förmiddag", morning)}
              {renderTimeGroup("Eftermiddag", afternoon)}
            </div>

            {startTimes.length === 0 && (
              <div className="rounded-lg border border-border p-4 text-sm text-muted">
                <p>Det finns inga starttider kvar den här dagen.</p>
                <button
                  type="button"
                  onClick={() => onDateChange(addDays(date, 1))}
                  className="mt-3 flex min-h-11 items-center gap-2 font-medium text-teal hover:underline underline-offset-4"
                >
                  Visa nästa dag <IconArrowRight className="h-4 w-4"/>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vad */}
        <div
          className="flex flex-col gap-6 self-start rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">Resurser</h2>
            <p className="mt-1 text-sm text-muted">
              {selectedRange
                ? <>Visar läget <span className="text-text">{formatLongDate(date)}, {selectedRange}</span></>
                : "Välj start- och sluttid för att se vilka resurser som är lediga."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {resources.map((r) => {
              const isFree = r.status === "available" && hasTime;
              const isSelected = selected?.id === r.id;
              const ranges = freeRanges[r.id];

              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => isFree && onSelectResource(r)}
                  disabled={!isFree}
                  className={[
                    "flex gap-3 rounded-xl border p-4 text-left transition-colors",
                    isSelected ? "border-teal bg-teal/10" : "border-border bg-panel",
                    isFree
                      ? "cursor-pointer hover:border-teal/60"
                      : hasTime ? "cursor-not-allowed opacity-60" : "cursor-not-allowed",
                  ].join(" ")}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-teal text-bg" : "bg-surface text-muted"}`}>
                    <ResourceTypeIcon name={r.type.name} className="h-5 w-5"/>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-text">{r.label}</span>
                      {hasTime && (
                        <span className={`text-xs ${isFree ? "text-teal" : "text-rose"}`}>
                          {isFree ? (isSelected ? "Vald" : "Ledig") : "Upptagen"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{r.sub}</p>

                    <p className="mono mt-2 text-xs leading-relaxed text-muted">
                      {ranges === undefined
                        ? "…"
                        : ranges.length === 0
                          ? "Inget ledigt denna dag"
                          : <>Ledigt {ranges.join(" · ")}</>}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {resources.length === 0 && (
            <p className="rounded-xl border border-border p-6 text-sm text-muted">
              Det finns inga resurser för den valda typen.
            </p>
          )}

          {selected && (
            <div>
              <label htmlFor="booking-purpose" className="mb-2 block text-sm font-medium text-text">
                Syfte (valfritt)
              </label>
              <textarea
                id="booking-purpose"
                rows={2}
                placeholder="T.ex. kundmöte eller designworkshop"
                value={purpose}
                onChange={(e) => onPurposeChange(e.target.value)}
                className="w-full resize-none rounded-xl border border-field bg-bg px-4 py-3 text-sm text-text"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={!selected}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal font-display font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selected
              ? <>Fortsätt med {selected.label} <IconArrowRight className="h-4 w-4"/></>
              : "Välj en ledig resurs för att fortsätta"}
          </button>
        </div>
      </div>
    </div>
  );
}

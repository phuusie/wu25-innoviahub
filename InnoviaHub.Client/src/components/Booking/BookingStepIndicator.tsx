import type {Step} from "../../types/bookingTypes.ts";

type StepProps = {
  step: Step;
};

const steps: Step[] = ["select", "configure", "overview", "confirmation"];
const labels: Record<Step, string> = {
  select: "Resurs",
  configure: "Tid",
  overview: "Översikt",
  confirmation: "Klart",
};

export default function BookingStepIndicator({step}: StepProps) {
  const stepIndex = steps.indexOf(step);

  return (
    <ol aria-label="Bokningssteg" className="mb-8 flex items-center gap-3">
      {steps.map((s, i) => {
        const isActive = s === step;
        const isDone = i < stepIndex;

        return (
          <li key={s} aria-current={isActive ? "step" : undefined} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${isDone || isActive ? "" : "opacity-50"}`}>
              <span
                className={[
                  "mono flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                  isDone || isActive ? "bg-teal text-bg" : "bg-panel text-muted",
                ].join(" ")}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span className={`hidden font-display text-sm sm:block ${isActive ? "text-text" : "text-muted"}`}>
                {labels[s]}
              </span>
            </div>

            {i < steps.length - 1 && (
              <span aria-hidden="true" className={`h-px w-8 ${i < stepIndex ? "bg-teal" : "bg-border"}`}/>
            )}
          </li>
        );
      })}
    </ol>
  );
}

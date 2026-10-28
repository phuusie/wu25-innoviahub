// Gemensamma klasser för adminformulären, så att alla fält och knappar ser likadana ut

export const labelClass = "mb-1.5 block text-sm font-medium text-text";

export const inputClass =
  "min-h-11 w-full rounded-xl border border-field bg-panel px-3.5 text-sm text-text placeholder:text-muted/70";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal px-4 font-display text-sm font-semibold text-bg transition-opacity disabled:opacity-50 cursor-pointer";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-field px-4 font-display text-sm font-semibold text-muted transition-colors hover:text-text cursor-pointer";

export const iconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel hover:text-text cursor-pointer";

export const dangerIconButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose/10 hover:text-rose cursor-pointer";

export function segmentClass(isActive: boolean) {
  return [
    "min-h-10 rounded-lg px-3 text-sm font-medium transition-colors cursor-pointer",
    isActive ? "bg-panel text-text shadow-sm" : "text-muted hover:text-text",
  ].join(" ");
}

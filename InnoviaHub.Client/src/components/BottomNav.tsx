export type View = "landing" | "booking" | "admin" | "login";

type BottomNavProps = {
  currentView: View;
  isAdmin: boolean;
  onNavigate: (view: View) => void;
  onLogout: () => void;
};

// Korta etiketter på mobil så att menyn får plats, längre på större skärmar
const items: { id: View; short: string; long: string; adminOnly?: boolean }[] = [
  {id: "landing", short: "Start", long: "Startsida"},
  {id: "booking", short: "Boka", long: "Boka"},
  {id: "admin", short: "Admin", long: "Adminpanel", adminOnly: true},
];

export default function BottomNav({currentView, isAdmin, onNavigate, onLogout}: BottomNavProps) {
  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 gap-1 rounded-full border border-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md sm:bottom-6"
    >
      {items
        .filter((item) => !item.adminOnly || isAdmin)
        .map(({id, short, long}) => {
          const isCurrent = currentView === id;

          return (
            <button
              key={id}
              type="button"
              aria-current={isCurrent ? "page" : undefined}
              onClick={() => onNavigate(id)}
              className={[
                "min-h-11 whitespace-nowrap rounded-full px-4 font-display text-sm font-medium transition-colors cursor-pointer",
                isCurrent ? "bg-teal text-bg" : "text-muted hover:text-text",
              ].join(" ")}
            >
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{long}</span>
            </button>
          );
        })}

      <span aria-hidden="true" className="my-2 w-px bg-border"/>

      <button
        type="button"
        onClick={onLogout}
        className="min-h-11 whitespace-nowrap rounded-full px-4 font-display text-sm font-medium text-muted transition-colors hover:text-rose cursor-pointer"
      >
        Logga ut
      </button>
    </nav>
  );
}

import type {LoginResponse} from "../services/authService";
import UserAvatar from "./UserAvatar";

// Gemensamt sidhuvud för kundsidorna, så att logga och användare alltid ligger på samma ställe
export default function AppHeader({user}: { user: LoginResponse | null }) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/90 px-6 py-4 backdrop-blur-lg">
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{background: "linear-gradient(135deg, #00d4aa, #0070f3)"}}
        >
          <span className="text-lg">◈</span>
        </div>
        <span className="font-display text-xl font-bold text-text">
          Innovia<span className="text-teal">Hub</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted sm:block">
          {user?.firstName} {user?.lastName}
        </span>
        <UserAvatar user={user}/>
      </div>
    </header>
  );
}

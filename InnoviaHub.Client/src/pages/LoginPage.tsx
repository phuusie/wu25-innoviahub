import {useState, type FormEvent} from "react";
import {login, type LoginResponse} from "../services/authService";

type LoginPageProps = {
  onLogin: (user: LoginResponse) => void;
};

export default function LoginPage({onLogin}: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await login({email, password});
      onLogin(user);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Inloggningen misslyckades"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/*========================================== HEADER START ==================================================*/}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        {/*========================================== LOGOTYP START ==================================================*/}
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
        {/*========================================== LOGOTYP END ==================================================*/}
      </header>
      {/*========================================== HEADER END ==================================================*/}

      {/*========================================== LOGIN-INNEHÅLL START ==================================================*/}
      <main className="flex min-h-[calc(100vh-77px)] items-center justify-center px-6">
        {/*========================================== LOGIN PANEL START ==================================================*/}
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
          {/*========================================== LOGIN RUBRIK START ==================================================*/}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-text">Logga in</h1>
            <p className="mt-2 text-sm text-muted">
              Boka mötesrum, skrivbord och utrustning, eller fråga assistenten vad som är ledigt.
            </p>
          </div>
          {/*========================================== LOGIN RUBRIK END ==================================================*/}

          {/*========================================== LOGIN FORMULÄR START ==================================================*/}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="mb-2 block font-display text-sm font-medium text-text">
                E-post
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="namn@exempel.se"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-field bg-panel px-4 py-3 text-sm text-text"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block font-display text-sm font-medium text-text">
                Lösenord
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Ditt lösenord"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-field bg-panel px-4 py-3 text-sm text-text"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-rose">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-12 w-full rounded-xl bg-teal font-display text-sm font-semibold text-bg transition-opacity disabled:opacity-60"
            >
              {isLoading ? "Loggar in…" : "Logga in"}
            </button>
          </form>
          {/*========================================== LOGIN-FORMULÄR END ==================================================*/}
        </section>
        {/*========================================== LOGIN-PANEL END ==================================================*/}
      </main>
      {/*========================================== LOGIN-INNEHÅLL END ==================================================*/}
    </div>
  );
}

import {useEffect, useRef, useState, type FormEvent} from "react";
import {changePassword} from "../services/authService";

type ChangePasswordModalProps = {
  onChanged: () => void;
  onLogout: () => void;
};

export default function ChangePasswordModal({onChanged, onLogout}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // showModal() låser fokus i dialogen och gör resten av sidan otillgänglig tills den stängs
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError("Det nya lösenordet måste vara minst 6 tecken och innehålla stor bokstav, liten bokstav, siffra och specialtecken.");
      return;
    }

    if (newPassword !== confirmation) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      onChanged();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Lösenordet kunde inte ändras.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="change-password-title"
      aria-describedby="change-password-description"
      // Lösenordsbytet är obligatoriskt, så Escape får inte stänga dialogen
      onCancel={(event) => event.preventDefault()}
      className="m-auto w-[calc(100%-3rem)] max-w-md bg-transparent p-0 backdrop:bg-black/70"
    >
      <section className="w-full rounded-xl p-8"
               style={{background: "#0d1824", border: "1px solid #1e3347", boxShadow: "0 16px 50px rgba(0,0,0,0.5)"}}>
        <p className="mono mb-3 text-xs uppercase" style={{color: "#00d4aa"}}>Första inloggningen</p>
        <h1 id="change-password-title" className="text-2xl font-bold"
            style={{color: "#e2eaf2", fontFamily: "Outfit, sans-serif"}}>Byt lösenord</h1>
        <p id="change-password-description" className="mt-2 text-sm" style={{color: "#7a94aa"}}>Du måste välja ett
          personligt lösenord innan du kan fortsätta.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input aria-label="Nuvarande lösenord" type="password" autoComplete="current-password"
                 placeholder="Nuvarande lösenord" value={currentPassword}
                 onChange={(event) => setCurrentPassword(event.target.value)} required
                 className="w-full rounded-xl px-4 py-3 text-sm"
                 style={{background: "#111e2d", border: "1px solid #527494", color: "#e2eaf2"}}/>
          <input aria-label="Nytt lösenord" aria-describedby="password-requirements" type="password"
                 autoComplete="new-password" placeholder="Nytt personligt lösenord" value={newPassword}
                 onChange={(event) => setNewPassword(event.target.value)} required
                 className="w-full rounded-xl px-4 py-3 text-sm"
                 style={{background: "#111e2d", border: "1px solid #527494", color: "#e2eaf2"}}/>
          <p id="password-requirements" className="text-xs" style={{color: "#7a94aa"}}>Minst 6 tecken, med stor och
            liten bokstav, siffra och specialtecken.</p>
          <input aria-label="Bekräfta nytt lösenord" type="password" autoComplete="new-password"
                 placeholder="Bekräfta nytt lösenord" value={confirmation}
                 onChange={(event) => setConfirmation(event.target.value)} required
                 className="w-full rounded-xl px-4 py-3 text-sm"
                 style={{background: "#111e2d", border: "1px solid #527494", color: "#e2eaf2"}}/>
          {error && <p role="alert" className="text-sm" style={{color: "#ff6b6b"}}>{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full rounded-lg py-3 text-sm font-semibold" style={{
            background: "#00d4aa",
            color: "#080e14",
            fontFamily: "Outfit, sans-serif"
          }}>{isLoading ? "Byter lösenord..." : "Spara nytt lösenord"}</button>
          <button type="button" onClick={onLogout} className="w-full py-3 text-sm" style={{color: "#7a94aa"}}>Logga ut
          </button>
        </form>
      </section>
    </dialog>
  );
}
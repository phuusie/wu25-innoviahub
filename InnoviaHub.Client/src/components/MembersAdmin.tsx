import {useEffect, useState} from "react";
import Alert from "./Alert";
import AdminDialog from "./Admin/AdminDialog";
import {
  dangerIconButtonClass, inputClass, labelClass,
  primaryButtonClass, secondaryButtonClass, segmentClass,
} from "./Admin/adminStyles";
import {IconPlus, IconSearch, IconTrash} from "./Icons";
import {
  createUser,
  deleteUser,
  getAllUsers,
  type UserSummary,
} from "../services/userService";

type MemberForm = {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
};
const emptyForm: MemberForm = {
  firstname: "",
  lastname: "",
  email: "",
  password: "",
};

type RoleFilter = "all" | "admin" | "member";

const roleFilters: { id: RoleFilter; label: string }[] = [
  {id: "all", label: "Alla"},
  {id: "admin", label: "Admin"},
  {id: "member", label: "Medlemmar"},
];

function fullName(member: UserSummary) {
  return `${member.firstname} ${member.lastname}`;
}

function initials(member: UserSummary) {
  return `${member.firstname.charAt(0)}${member.lastname.charAt(0)}`.toUpperCase();
}

function MemberModal({
                       form,
                       alert,
                       onChange,
                       onSubmit,
                       onClose,
                     }: {
  form: MemberForm;
  alert: string;
  onChange: (form: MemberForm) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <AdminDialog
      title="Ny medlem"
      description="Medlemmen loggar in med e-post och lösenordet du anger, och byter lösenord vid första inloggningen."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="member-firstname" className={labelClass}>Förnamn</label>
            <input
              id="member-firstname"
              required
              autoComplete="off"
              value={form.firstname}
              onChange={(event) => onChange({...form, firstname: event.target.value})}
              className={inputClass}
              placeholder="Anna"
            />
          </div>
          <div>
            <label htmlFor="member-lastname" className={labelClass}>Efternamn</label>
            <input
              id="member-lastname"
              required
              autoComplete="off"
              value={form.lastname}
              onChange={(event) => onChange({...form, lastname: event.target.value})}
              className={inputClass}
              placeholder="Svensson"
            />
          </div>
        </div>
        <div>
          <label htmlFor="member-email" className={labelClass}>E-post</label>
          <input
            id="member-email"
            required
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(event) => onChange({...form, email: event.target.value})}
            className={inputClass}
            placeholder="anna@exempel.se"
          />
        </div>
        <div>
          <label htmlFor="member-password" className={labelClass}>Tillfälligt lösenord</label>
          <input
            id="member-password"
            required
            type="password"
            autoComplete="new-password"
            aria-describedby="member-password-hint"
            value={form.password}
            onChange={(event) => onChange({...form, password: event.target.value})}
            className={inputClass}
          />
          <p id="member-password-hint" className="mt-1.5 text-xs text-muted">
            Minst 6 tecken med stor och liten bokstav, siffra och specialtecken.
          </p>
        </div>

        {alert && <p role="alert"
                     className="rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-sm text-rose">{alert}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>Avbryt</button>
          <button type="submit" className={primaryButtonClass}>Lägg till medlem</button>
        </div>
      </form>
    </AdminDialog>
  );
}

export default function MembersAdmin() {
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserSummary | null>(null);
  const [alert, setAlert] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  useEffect(() => {
    getAllUsers()
      .then(setMembers)
      .catch(() => setAlert("Kunde inte hämta användare"));
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
    setAlert("");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const hasValidPassword =
      form.password.length >= 6 &&
      /[A-Z]/.test(form.password) &&
      /[a-z]/.test(form.password) &&
      /\d/.test(form.password) &&
      /[^A-Za-z0-9]/.test(form.password);

    if (!hasValidPassword) {
      setAlert("Lösenordet måste ha minst 6 tecken, en stor bokstav, en liten bokstav, en siffra och ett specialtecken.");
      return;
    }

    try {
      const member = await createUser({
        firstName: form.firstname.trim(),
        lastName: form.lastname.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setMembers((current) => [member, ...current]);
      closeForm();
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "Kunde inte skapa medlem");
    }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteUser(deleting.id);
      setMembers((current) => current.filter((member) => member.id !== deleting.id));
    } catch {
      setAlert("Kunde inte ta bort medlem");
    } finally {
      setDeleting(null);
    }
  };

  // Sök på namn eller e-post, filtrera på roll och sortera i bokstavsordning
  const query = search.trim().toLowerCase();
  const visibleMembers = members
    .filter((member) =>
      (roleFilter === "all" || (roleFilter === "admin") === member.isAdmin) &&
      (!query || fullName(member).toLowerCase().includes(query) || member.email.toLowerCase().includes(query))
    )
    .sort((a, b) => fullName(a).localeCompare(fullName(b), "sv"));
  const adminCount = members.filter((member) => member.isAdmin).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Medlemmar</h1>
          <p className="mt-1 text-sm text-muted">
            {members.length} personer · {adminCount} {adminCount === 1 ? "administratör" : "administratörer"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAlert("");
            setForm(emptyForm);
            setFormOpen(true);
          }}
          className={primaryButtonClass}
        >
          <IconPlus className="h-4 w-4"/>
          Ny medlem
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"/>
          <input
            type="search"
            aria-label="Sök medlem"
            placeholder="Sök på namn eller e-post…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass + " pl-10"}
          />
        </div>
        <div role="group" aria-label="Filtrera på roll"
             className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {roleFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={roleFilter === filter.id}
              onClick={() => setRoleFilter(filter.id)}
              className={segmentClass(roleFilter === filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {alert && !formOpen && <Alert message={alert} type="error" onClose={() => setAlert("")}/>}

      {visibleMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {members.length === 0 ? "Inga medlemmar ännu." : "Ingen matchar sökningen."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {visibleMembers.map((member) => (
            <li key={member.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-panel/60">
              <span
                aria-hidden="true"
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold",
                  member.isAdmin ? "bg-teal/15 text-teal" : "bg-panel text-muted",
                ].join(" ")}
              >
                {initials(member)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-text">{fullName(member)}</span>
                  {member.isAdmin && (
                    <span
                      className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
                      Admin
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{member.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(member)}
                aria-label={`Ta bort ${fullName(member)}`}
                title="Ta bort"
                className={dangerIconButtonClass + " shrink-0"}
              >
                <IconTrash className="h-4 w-4"/>
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <MemberModal
          form={form}
          alert={alert}
          onChange={setForm}
          onSubmit={submit}
          onClose={closeForm}
        />
      )}
      {deleting && (
        <Alert
          message={`Vill du ta bort ${fullName(deleting)}?`}
          type="confirm"
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

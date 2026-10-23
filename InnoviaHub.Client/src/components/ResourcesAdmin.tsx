import {useEffect, useState} from "react";
import Alert from "./Alert";
import AdminDialog from "./Admin/AdminDialog";
import {
  dangerIconButtonClass, iconButtonClass, inputClass, labelClass,
  primaryButtonClass, secondaryButtonClass, segmentClass,
} from "./Admin/adminStyles";
import {IconPencil, IconPlus, IconSearch, IconTrash, ResourceTypeIcon} from "./Icons";
import {
  createResource, createResourceType, deleteResource, getAllResourceTypes, getAllResources,
  updateResource, type Resource, type ResourceType, type ResourceZone,
} from "../services/resourceService";

type ResourceForm = {
  name: string;
  resourceTypeId: string;
  zone: ResourceZone | "";
  capacity: number | "";
};

const emptyForm: ResourceForm = {
  name: "",
  resourceTypeId: "",
  zone: "",
  capacity: "",
};

function zoneLabel(zone: ResourceZone | null) {
  return zone === null ? "Ingen zon" : `Zon ${String.fromCharCode(65 + zone)}`;
}

// Sorterar "Mötesrum 2" före "Mötesrum 10"
function byName(a: Resource, b: Resource) {
  return a.name.localeCompare(b.name, "sv", {numeric: true});
}

function ResourceModal({
                         form,
                         types,
                         editing,
                         alert,
                         newTypeName,
                         creatingType,
                         onNewTypeNameChange,
                         onAddResourceType,
                         onChange,
                         onSubmit,
                         onClose,
                       }: {
  form: ResourceForm;
  types: ResourceType[];
  editing: boolean;
  alert: string;
  newTypeName: string;
  creatingType: boolean;
  onChange: (form: ResourceForm) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onNewTypeNameChange: (name: string) => void;
  onAddResourceType: () => void;
}) {
  const [showNewType, setShowNewType] = useState(false);

  return (
    <AdminDialog
      title={editing ? "Redigera resurs" : "Ny resurs"}
      description={editing ? undefined : "Resursen blir bokningsbar direkt för alla medlemmar."}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <div>
          <label htmlFor="resource-name" className={labelClass}>Namn</label>
          <input
            id="resource-name"
            required
            value={form.name}
            onChange={(event) => onChange({...form, name: event.target.value})}
            className={inputClass}
            placeholder="T.ex. Mötesrum 3"
          />
        </div>

        <div>
          <label htmlFor="resource-type" className={labelClass}>Typ</label>
          <select
            id="resource-type"
            required
            value={form.resourceTypeId}
            onChange={(event) => onChange({...form, resourceTypeId: event.target.value})}
            className={inputClass}
          >
            <option value="">Välj typ</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>

          {showNewType ? (
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Namn på ny typ"
                value={newTypeName}
                onChange={(event) => onNewTypeNameChange(event.target.value)}
                placeholder="T.ex. Projektor"
                className={inputClass}
              />
              <button
                type="button"
                onClick={onAddResourceType}
                disabled={creatingType}
                className={secondaryButtonClass + " shrink-0"}
              >
                {creatingType ? "Skapar…" : "Lägg till"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewType(true)}
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-teal hover:underline cursor-pointer"
            >
              <IconPlus className="h-4 w-4"/>
              Skapa ny typ
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="resource-zone" className={labelClass}>Zon</label>
            <select
              id="resource-zone"
              required
              value={form.zone}
              onChange={(event) =>
                onChange({
                  ...form,
                  zone: event.target.value === "" ? "" : (Number(event.target.value) as ResourceZone),
                })
              }
              className={inputClass}
            >
              <option value="">Välj zon</option>
              <option value={0}>Zon A</option>
              <option value={1}>Zon B</option>
              <option value={2}>Zon C</option>
            </select>
          </div>
          <div>
            <label htmlFor="resource-capacity" className={labelClass}>Platser</label>
            <input
              id="resource-capacity"
              required
              type="number"
              min="1"
              placeholder="T.ex. 8"
              value={form.capacity}
              onChange={(event) =>
                onChange({...form, capacity: event.target.value === "" ? "" : Number(event.target.value)})
              }
              className={inputClass}
            />
          </div>
        </div>

        {alert && <p role="alert"
                     className="rounded-xl border border-rose/30 bg-rose/10 px-3.5 py-2.5 text-sm text-rose">{alert}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>Avbryt</button>
          <button type="submit" className={primaryButtonClass}>
            {editing ? "Spara ändringar" : "Skapa resurs"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

export default function ResourcesAdmin() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [alert, setAlert] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    Promise.all([getAllResources(), getAllResourceTypes()])
      .then(([loadedResources, loadedTypes]) => {
        setResources(loadedResources);
        setTypes(loadedTypes);
      })
      .catch(() => setAlert("Kunde inte hämta resurser"));
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setNewTypeName("");
    setAlert("");
  };

  const openResourceForm = async () => {
    try {
      const loadedTypes = await getAllResourceTypes();
      setTypes(loadedTypes);
      setForm(emptyForm);
      setEditing(null);
      setAlert("");
      setFormOpen(true);
    } catch {
      setAlert("Kunde inte hämta resurstyper")
    }
  }

  const openEditForm = (resource: Resource) => {
    setEditing(resource);
    setForm({
      name: resource.name,
      resourceTypeId: resource.resourceType.id,
      zone: resource.zone ?? "",
      capacity: resource.capacity,
    });
    setAlert("");
    setFormOpen(true);
  };

  const addResourceType = async () => {
    const name = newTypeName.trim();

    if (!name) {
      setAlert("Ange ett namn på resurstypen");
      return;
    }

    try {
      setCreatingType(true);
      const createdType = await createResourceType(name, "");
      setTypes((current) => [...current, createdType]);
      setForm((current) => ({...current, resourceTypeId: createdType.id}));
      setNewTypeName("");
      setAlert("");
    } catch {
      setAlert("Kunde inte skapa resurstyp")
    } finally {
      setCreatingType(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.resourceTypeId ||
      form.zone === "" ||
      form.capacity === "" ||
      form.capacity < 1
    ) {
      setAlert("Fyll i alla fält");
      return;
    }
    const resourceData = {
      name: form.name.trim(),
      resourceTypeId: form.resourceTypeId,
      zone: form.zone as ResourceZone,
      capacity: form.capacity,
    };
    try {
      if (editing) {
        await updateResource(editing.id, {
          ...resourceData,
          isActive: editing.isActive,
        });
        const resourceType = types.find((type) => type.id === form.resourceTypeId);
        if (resourceType)
          setResources((current) =>
            current.map((resource) =>
              resource.id === editing.id ? {...resource, ...resourceData, resourceType} : resource,
            ),
          );
      } else {
        const createdResource = await createResource(resourceData);
        setResources((current) => [createdResource, ...current]);
      }
      closeForm();
    } catch {
      setAlert(editing ? "Kunde inte uppdatera resurs" : "Kunde inte skapa resurs");
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteResource(deleting.id);
      setResources((current) => current.filter((resource) => resource.id !== deleting.id));
    } catch {
      setAlert("Kunde inte ta bort resurs");
    } finally {
      setDeleting(null);
    }
  };

  // Filtrera på sök och typ, gruppera sedan per typ
  const query = search.trim().toLowerCase();
  const visibleResources = resources.filter((resource) =>
    (typeFilter === "all" || resource.resourceType.id === typeFilter) &&
    (!query || resource.name.toLowerCase().includes(query))
  );
  const groups = types
    .map((type) => ({
      type,
      items: visibleResources.filter((resource) => resource.resourceType.id === type.id).sort(byName),
    }))
    .filter((group) => group.items.length > 0);
  const totalSeats = resources.reduce((sum, resource) => sum + resource.capacity, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Resurser</h1>
          <p className="mt-1 text-sm text-muted">
            {resources.length} resurser · {types.length} typer · {totalSeats} platser totalt
          </p>
        </div>
        <button type="button" onClick={openResourceForm} className={primaryButtonClass}>
          <IconPlus className="h-4 w-4"/>
          Ny resurs
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"/>
          <input
            type="search"
            aria-label="Sök resurs"
            placeholder="Sök resurs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass + " pl-10"}
          />
        </div>
        <div role="group" aria-label="Filtrera på typ"
             className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          <button type="button" aria-pressed={typeFilter === "all"} onClick={() => setTypeFilter("all")}
                  className={segmentClass(typeFilter === "all")}>
            Alla
          </button>
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              aria-pressed={typeFilter === type.id}
              onClick={() => setTypeFilter(type.id)}
              className={segmentClass(typeFilter === type.id)}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {alert && !formOpen && <Alert message={alert} type="error" onClose={() => setAlert("")}/>}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {resources.length === 0 ? "Inga resurser ännu. Skapa den första." : "Inga resurser matchar sökningen."}
          </p>
        </div>
      )}

      {groups.map(({type, items}) => (
        <section key={type.id} aria-labelledby={`type-${type.id}`}>
          <div className="mb-2 flex items-center gap-2.5 px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
              <ResourceTypeIcon name={type.name} className="h-4 w-4"/>
            </span>
            <h2 id={`type-${type.id}`} className="font-display font-semibold text-text">{type.name}</h2>
            <span className="mono text-xs text-muted">{items.length}</span>
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {items.map((resource) => (
              <li key={resource.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-panel/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-text">{resource.name}</span>
                    {!resource.isActive && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">Inaktiv</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {zoneLabel(resource.zone)} · {resource.capacity} {resource.capacity === 1 ? "plats" : "platser"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEditForm(resource)}
                    aria-label={`Redigera ${resource.name}`}
                    title="Redigera"
                    className={iconButtonClass}
                  >
                    <IconPencil className="h-4 w-4"/>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(resource)}
                    aria-label={`Ta bort ${resource.name}`}
                    title="Ta bort"
                    className={dangerIconButtonClass}
                  >
                    <IconTrash className="h-4 w-4"/>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {formOpen && (
        <ResourceModal
          form={form}
          types={types}
          editing={Boolean(editing)}
          alert={alert}
          newTypeName={newTypeName}
          creatingType={creatingType}
          onNewTypeNameChange={setNewTypeName}
          onAddResourceType={addResourceType}
          onChange={setForm}
          onSubmit={submit}
          onClose={closeForm}
        />
      )}
      {deleting && (
        <Alert
          message={`Vill du ta bort resursen ${deleting.name}?`}
          type="confirm"
          onClose={() => setDeleting(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

import type {ResourceType} from '../../services/resourceService';
import {IconArrowRight, ResourceTypeIcon} from "../Icons";

type ResourceTypeSelectionProps = {
  resourceTypes: ResourceType[];
  onSelectResourceType: (resourceTypeId: string) => void;
};

export default function ResourceTypeSelection({
                                                resourceTypes,
                                                onSelectResourceType,
                                              }: ResourceTypeSelectionProps) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-text">Vad vill du boka?</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        Välj en typ av resurs för att se lediga tider.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resourceTypes.map((type) => {
          // Visa bara beskrivningen om den säger något mer än namnet
          const description = type.description && type.description.trim() !== type.name
            ? type.description
            : null;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelectResourceType(type.id)}
              className="group flex min-h-44 flex-col justify-between rounded-2xl border border-border bg-surface p-6 text-left transition-colors hover:border-teal/60 cursor-pointer"
            >
              <div>
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-panel text-muted transition-colors group-hover:bg-teal/10 group-hover:text-teal">
                  <ResourceTypeIcon name={type.name} className="h-6 w-6"/>
                </div>
                <h2 className="font-display text-xl font-semibold text-text">{type.name}</h2>
                {description && (
                  <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                )}
              </div>

              <span className="mt-6 flex items-center gap-2 text-sm font-medium text-teal">
                Se lediga tider <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

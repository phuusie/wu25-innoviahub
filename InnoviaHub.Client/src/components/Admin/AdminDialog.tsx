import {useEffect, useId, useRef, type ReactNode} from "react";

type AdminDialogProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

// Gemensam dialog för adminformulären. showModal() ger fokusfälla, Escape och mörk bakgrund.
export default function AdminDialog({title, description, onClose, children}: AdminDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Ett klick på själva bakgrunden (utanför innehållet) stänger dialogen
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-bold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="-mt-2 -mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-xl text-muted hover:text-text cursor-pointer"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {description && <p className="mb-5 text-sm text-muted">{description}</p>}
        {!description && <div className="mb-4"/>}
        {children}
      </div>
    </dialog>
  );
}

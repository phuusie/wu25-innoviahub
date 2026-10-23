import {useEffect, useId, useRef} from "react";

type AlertProps = {
  message: string;
  type?: "success" | "error" | "confirm";
  onClose: () => void;
  onConfirm?: () => void;
};

export default function Alert({
                                message,
                                type = "error",
                                onClose,
                                onConfirm,
                              }: AlertProps) {
  if (type === "confirm") {
    return <ConfirmDialog message={message} onClose={onClose} onConfirm={onConfirm}/>;
  }

  return (
    <div
      role="alert"
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3"
      style={{
        background: "#0d1824",
        border: `1px solid ${type === "error" ? "rgba(244, 63, 94, 0.45)" : "rgba(0,212,170,0.45)"}`,
        color: "#e2eaf2",
      }}
    >
      <span aria-hidden="true" style={{color: type === "error" ? "#f43f5e" : "#00d4aa"}}>
        {type === "error" ? "!" : "✓"}
      </span>
      <span className="text-sm">{message}</span>

      <button
        type="button"
        onClick={onClose}
        aria-label="Stäng meddelandet"
        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
        style={{color: "#7a94aa", cursor: "pointer"}}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

type ConfirmDialogProps = {
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
};

function ConfirmDialog({message, onClose, onConfirm}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageId = useId();

  // showModal() låser fokus i dialogen, och Escape utlöser onCancel
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-3rem)] max-w-md rounded-xl p-6 backdrop:bg-[rgba(8,14,20,0.7)]"
      style={{
        background: "#0d1824",
        border: "1px solid rgba(244, 63, 94, 0.45)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        color: "#e2eaf2",
      }}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" style={{color: "#f43f5e"}}>!</span>
        <span id={messageId} className="text-sm">{message}</span>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm"
          style={{
            border: "1px solid #527494",
            color: "#7a94aa",
            cursor: "pointer",
          }}
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90"
          style={{cursor: "pointer"}}
        >
          Ta bort
        </button>
      </div>
    </dialog>
  );
}

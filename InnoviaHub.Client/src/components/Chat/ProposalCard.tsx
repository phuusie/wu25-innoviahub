import type { BookingProposal } from "../../services/assistantService.ts";
import { formatProposalTime } from "../../utils/chatUtils.ts";

export type ProposalStatus = "pending" | "booking" | "booked" | "declined" | "failed" | "replaced";

type ProposalCardProps = {
    proposal: BookingProposal;
    status: ProposalStatus;
    onConfirm: () => void;
    onDecline: () => void;
}

export default function ProposalCard({ proposal, status, onConfirm, onDecline }: ProposalCardProps) {
    return (
        <div className="mt-2 max-w-[80%] rounded-xl border border-teal/40 bg-bg p-3">
            <div className="text-sm font-semibold text-text">{proposal.resourceName}</div>
            <div className="mono text-xs text-muted">{formatProposalTime(proposal)}</div>

            {status === "pending" && (
                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-bg cursor-pointer"
                    >
                        Ja, boka
                    </button>
                    <button
                        type="button"
                        onClick={onDecline}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted cursor-pointer"
                    >
                        Annan tid
                    </button>
                </div>
            )}

            {status === "booking" && <p className="mt-2 text-xs text-muted">Bokar…</p>}
            {status === "booked" && <p className="mt-2 text-xs text-teal">✓ Bokad</p>}
            {status === "declined" && <p className="mt-2 text-xs text-muted">Avböjt</p>}
            {status === "failed" && <p className="mt-2 text-xs text-rose">Kunde inte bokas</p>}
            {status === "replaced" && <p className="mt-2 text-xs text-muted">Ersatt av ett nytt förslag</p>}
        </div>
    );
}
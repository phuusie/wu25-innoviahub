import { type BookingProposal } from "../services/assistantService";

export function formatProposalTime(proposal: BookingProposal): string {
    const start = new Date(proposal.startTime);
    const end = new Date(proposal.endTime);

    const day = start.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
    const from = start.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    const to = end.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

    return `${day} ${from} - ${to}`;
}
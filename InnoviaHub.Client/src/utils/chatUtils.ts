import {type BookingProposal} from "../services/assistantService";

export const EXAMPLE_QUESTIONS = [
  "Ledigt just nu?",
  "Ledigt imorgon?",
];

// Andra delar av sidan kan skicka en fråga till chatten utan att känna till dess state
export const ASK_ASSISTANT_EVENT = "innovia:ask-assistant";

export function askAssistant(question: string) {
  window.dispatchEvent(new CustomEvent<string>(ASK_ASSISTANT_EVENT, {detail: question}));
}

export function formatProposalTime(proposal: BookingProposal): string {
  const start = new Date(proposal.startTime);
  const end = new Date(proposal.endTime);

  const day = start.toLocaleDateString("sv-SE", {weekday: "long", day: "numeric", month: "long"});
  const from = start.toLocaleTimeString("sv-SE", {hour: "2-digit", minute: "2-digit"});
  const to = end.toLocaleTimeString("sv-SE", {hour: "2-digit", minute: "2-digit"});

  return `${day} ${from}–${to}`;
}

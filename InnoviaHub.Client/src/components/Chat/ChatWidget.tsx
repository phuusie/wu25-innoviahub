import { useState, type FormEvent, useRef, useEffect } from "react";
import {
    sendChatMessage,
    type ChatMessage,
    type BookingProposal,
    confirmProposal
} from "../../services/assistantService.ts";
import ProposalCard, {
    type ProposalStatus
} from "./ProposalCard.tsx";
import { formatProposalTime } from "../../utils/chatUtils.ts";

type DisplayMessage = ChatMessage & { proposal?: BookingProposal | null };

const MAX_HISTORY = 30;
const ERROR_MESSAGES: Record<string, string> = {
    PROPOSAL_NOT_FOUND: "Förslaget har gått ut. Be assistenten om ett nytt.",
    RESOURCE_ALREADY_BOOKED: "Tiden hann bli bokad av någon annan. Be om en ny tid.",
    BOOKING_IN_PAST: "Tiden har redan passerat. Be om en ny tid.",
    OUTSIDE_OPENING_HOURS: "Tiden ligger utanför öppettiderna."
};

const EXAMPLE_QUESTIONS = [
    "Ledigt just nu?",
    "Rum för 4 personer imorgon?",
    "Skrivbord i veckan?"
];

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposalStatus, setProposalStatus] = useState<Record<string, ProposalStatus>>({});

    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const element = messagesRef.current;
        if (!element) return;

        element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }, [messages, isLoading, error, proposalStatus, isOpen]);

    useEffect(() => {
        if (isOpen && !isLoading) {
            inputRef.current?.focus();
        }
    }, [isOpen, isLoading]);

    async function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const next: DisplayMessage[] = [
            ...messages,
            {
                role: "user",
                content: trimmed
            }
        ];
        setMessages(next);
        setInput("");
        setError(null);
        setIsLoading(true);

        try {
            const history: ChatMessage[] = next
                .slice(-MAX_HISTORY)
                .map(({ role, content }) => ({ role, content }));

            const response = await sendChatMessage(history);

            if (response.proposal) {
                setProposalStatus((s) => {
                    const updated = { ...s };

                    for (const message of next) {
                        if (message.proposal && (updated[message.proposal.id] ?? "pending") === "pending")
                            updated[message.proposal.id] = "replaced";
                    }
                    return updated;
                });
            }

            setMessages([
                ...next,
                {
                    role: "assistant",
                    content: response.reply,
                    proposal: response.proposal
                }
            ]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ett okänt fel inträffade. Försök igen");
        } finally {
            setIsLoading(false);
        }
    }

    function handleSubmit(event: FormEvent)  {
        event.preventDefault();
        send(input);
    }

    async function handleConfirm(proposal: BookingProposal) {
        setProposalStatus((s) => ({ ...s, [proposal.id]: "booking" }));
        setError(null);

        try {
            await confirmProposal(proposal.id);
            setProposalStatus((s) => ({ ...s, [proposal.id]: "booked" }));
            setMessages((m) => [
                ...m,
                {
                    role: "assistant",
                    content: `Klart! ${proposal.resourceName} är bokat ${formatProposalTime(proposal)}.`,
                }
            ]);
        } catch (e) {
            const code = e instanceof Error ? e.message : "";
            setProposalStatus((s) => ({ ...s, [proposal.id]: "failed" }));
            setError(ERROR_MESSAGES[code] || "Kunde inte genomföra bokningen. Försök igen.");
        }
    }

    function handleDecline(proposal: BookingProposal) {
        setProposalStatus((s) => ({ ...s, [proposal.id]: "declined" }));
        send("Jag vill ha en annan tid.");
    }

    if (!isOpen) {
        return (<button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Öppna assistenten"
                className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-bg text-2xl shadow-lg animate-glow cursor-pointer"
            >
                💬
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-teal" />
                    <span className="font-display font-semibold text-text">Fråga assistenten</span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Stäng assistenten"
                    className="text-lg text-muted cursor-pointer"
                >
                    ×
                </button>
            </div>

            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                    <p className="text-sm text-muted">
                        Hej! Skriv vad du behöver, t.ex. "ett rum för 4 imorgon eftermiddag".
                    </p>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={message.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
                    >
                        <div
                            className={
                                message.role === "user"
                                    ? "max-w-[80%] rounded-xl bg-teal px-3 py-2 text-sm text-bg"
                                    : "max-w-[80%] whitespace-pre-line rounded-xl border border-border bg-panel px-3 py-2 text-sm text-text"
                            }
                        >
                            {message.content}
                        </div>

                        {message.proposal && (
                            <ProposalCard
                                proposal={message.proposal}
                                status={proposalStatus[message.proposal.id] ?? "pending"}
                                onConfirm={() => handleConfirm(message.proposal!)}
                                onDecline={() => handleDecline(message.proposal!)}
                            />
                        )}
                    </div>
                ))}

                {isLoading && <p className="text-xs text-muted">Assistenten skriver…</p>}
                {error && <p className="text-xs text-rose">{error}</p>}
            </div>
            <div className="border-t border-border">
                {!isLoading && (
                    <div className="flex flex-wrap gap-2 px-3 pt-3">
                        {EXAMPLE_QUESTIONS.map((question) => (
                            <button
                                key={question}
                                type="button"
                                onClick={() => send(question)}
                                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-teal hover:text-teal cursor-pointer"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-2 p-3">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Skriv en fråga…"
                        maxLength={1000}
                        disabled={isLoading}
                        className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="rounded-lg bg-teal px-3 text-bg font-semibold disabled:opacity-40 cursor-pointer"
                    >
                        ↑
                    </button>
                </form>
            </div>

        </div>
    );
}
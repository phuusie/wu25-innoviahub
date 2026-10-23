import {useCallback, useEffect, useRef, useState, type FormEvent} from "react";
import {
  sendChatMessage,
  type ChatMessage,
  type BookingProposal,
  confirmProposal
} from "../../services/assistantService.ts";
import ProposalCard, {
  type ProposalStatus
} from "./ProposalCard.tsx";
import MessageText from "./MessageText.tsx";
import {ASK_ASSISTANT_EVENT, EXAMPLE_QUESTIONS, formatProposalTime} from "../../utils/chatUtils.ts";
import {IconChat, IconSend, IconSparkles} from "../Icons.tsx";

type DisplayMessage = ChatMessage & { proposal?: BookingProposal | null };

const MAX_HISTORY = 30;
const ERROR_MESSAGES: Record<string, string> = {
  PROPOSAL_NOT_FOUND: "Förslaget har gått ut. Be assistenten om ett nytt.",
  RESOURCE_ALREADY_BOOKED: "Tiden hann bli bokad av någon annan. Be om en ny tid.",
  BOOKING_IN_PAST: "Tiden har redan passerat. Be om en ny tid.",
  OUTSIDE_OPENING_HOURS: "Tiden ligger utanför öppettiderna."
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalStatus, setProposalStatus] = useState<Record<string, ProposalStatus>>({});

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const returnFocusToBubble = useRef(false);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;

    element.scrollTo({top: element.scrollHeight, behavior: "smooth"});
  }, [messages, isLoading, error, proposalStatus, isOpen]);

  useEffect(() => {
    if (isOpen && !isLoading) {
      inputRef.current?.focus();
    }
  }, [isOpen, isLoading]);

  useEffect(() => {
    if (!isOpen && returnFocusToBubble.current) {
      bubbleRef.current?.focus();
      returnFocusToBubble.current = false;
    }
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
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
        .map(({role, content}) => ({role, content}));

      const response = await sendChatMessage(history);

      if (response.proposal) {
        setProposalStatus((s) => {
          const updated = {...s};

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
  }, [messages, isLoading]);

  // Frågor som skickas från andra delar av sidan, t.ex. frågerutan på startsidan
  useEffect(() => {
    function handleAsk(event: Event) {
      const question = (event as CustomEvent<string>).detail;
      setIsOpen(true);
      send(question);
    }

    window.addEventListener(ASK_ASSISTANT_EVENT, handleAsk);
    return () => window.removeEventListener(ASK_ASSISTANT_EVENT, handleAsk);
  }, [send]);

  function closeChat() {
    returnFocusToBubble.current = true;
    setIsOpen(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  async function handleConfirm(proposal: BookingProposal) {
    setProposalStatus((s) => ({...s, [proposal.id]: "booking"}));
    setError(null);

    try {
      await confirmProposal(proposal.id);
      setProposalStatus((s) => ({...s, [proposal.id]: "booked"}));
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Klart! ${proposal.resourceName} är bokat ${formatProposalTime(proposal)}.`,
        }
      ]);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setProposalStatus((s) => ({...s, [proposal.id]: "failed"}));
      setError(ERROR_MESSAGES[code] || "Kunde inte genomföra bokningen. Försök igen.");
    }
  }

  function handleDecline(proposal: BookingProposal) {
    setProposalStatus((s) => ({...s, [proposal.id]: "declined"}));
    send("Jag vill ha en annan tid.");
  }

  if (!isOpen) {
    return (
      <button
        ref={bubbleRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Öppna assistenten"
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-bg shadow-lg animate-glow cursor-pointer"
      >
        <IconChat className="h-6 w-6"/>
      </button>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div
      role="dialog"
      aria-labelledby="chat-title"
      onKeyDown={(e) => e.key === "Escape" && closeChat()}
      className="fixed bottom-24 right-6 z-50 flex h-140 max-h-[calc(100vh-11rem)] w-110 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-teal">
          <IconSparkles className="h-4 w-4"/>
          <h2 id="chat-title" className="font-display font-semibold text-text">Bokningsassistent</h2>
        </div>
        <button
          type="button"
          onClick={closeChat}
          aria-label="Stäng assistenten"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-muted hover:text-text cursor-pointer"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div
        ref={messagesRef}
        role="log"
        aria-live="polite"
        aria-label="Konversation med assistenten"
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {!hasMessages && (
          <div className="flex h-full flex-col justify-end gap-3 pb-2">
            <p className="text-sm text-text">
              Hej! Berätta vad du behöver, så letar jag upp lediga tider åt dig.
            </p>
            <p className="text-xs text-muted">
              Till exempel "ett rum för 4 imorgon eftermiddag". Du bekräftar alltid själv innan något bokas.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLE_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  className="min-h-11 rounded-full border border-field px-4 text-xs text-text transition-colors hover:border-teal hover:text-teal cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-teal px-3 py-2 text-sm text-bg"
                  : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-panel px-3 py-2 text-sm leading-relaxed text-text"
              }
            >
              {message.role === "assistant"
                ? <MessageText text={message.content}/>
                : message.content}
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
        {error && <p role="alert" className="text-xs text-rose">{error}</p>}
      </div>

      <div className="border-t border-border">
        {hasMessages && !isLoading && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {EXAMPLE_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => send(question)}
                className="rounded-full border border-field px-3 py-2 text-xs text-muted transition-colors hover:border-teal hover:text-teal cursor-pointer"
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
            aria-label="Meddelande till assistenten"
            placeholder="Skriv en fråga…"
            maxLength={1000}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-field bg-bg px-3 py-2 text-sm text-text focus:border-teal"
          />
          <button
            type="submit"
            aria-label="Skicka"
            disabled={isLoading || !input.trim()}
            className="flex min-w-11 items-center justify-center rounded-lg bg-teal px-3 text-bg disabled:opacity-40 cursor-pointer"
          >
            <IconSend className="h-4 w-4"/>
          </button>
        </form>
      </div>
    </div>
  );
}

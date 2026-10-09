import { BASE_API_URL } from "../config/api.ts";
import type { Booking } from "./bookingApiService";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export type BookingProposal = {
    id: string;
    resourceName: string;
    startTime: string;
    endTime: string;
};

export type AssistantResponse = {
    reply: string;
    proposal: BookingProposal | null;
};

const API_URL = `${BASE_API_URL}/api/Assistant`;

async function getApiError(response: Response, fallback: string): Promise<string> {
    if (response.status === 429)
        return "Du skickar för många meddelanden. Vänta en stund och försök igen.";

    try {
        const body = (await response.json()) as { title?: string };
        return body.title || fallback;
    } catch {
        return fallback;
    }
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<AssistantResponse> {
    const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ messages })
    });

    if (!response.ok)
        throw new Error(await getApiError(response, `Assistenten kunde inte svara (${response.status})`));

    return response.json() as Promise<AssistantResponse>;
}

export async function confirmProposal(proposalId: string) : Promise<Booking> {
    const response = await fetch(`${API_URL}/confirm/${proposalId}`, {
        method: "POST",
        credentials: "include",
    });

    if (!response.ok)
        throw new Error(await getApiError(response, `Kunde inte genomföra bokningen (${response.status})`));

    return response.json() as Promise<Booking>;
}
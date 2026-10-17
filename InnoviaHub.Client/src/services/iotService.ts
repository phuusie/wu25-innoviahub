import { BASE_API_URL} from "../config/api.ts";

export type Device = {
    id: string;
    roomId: string | null;
    model: string;
    serial: string;
    status: string;
}

const IOT_API_URL = `${BASE_API_URL}/api/Iot`;

export async function getDevices(): Promise<Device[]> {
    const response = await fetch(`${IOT_API_URL}/devices`, {
        credentials: "include"
    });
    
    if (!response.ok) 
        throw new Error("Kunde inte hämta enheterna");
    
    return response.json();
}
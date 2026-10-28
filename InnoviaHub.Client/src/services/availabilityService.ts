import {BASE_API_URL} from "../config/api.ts";

export type FreeSlot = {
  startTime: string;
  endTime: string;
};

export type ResourceAvailability = {
  resourceId: string;
  resourceName: string;
  resourceTypeName: string;
  capacity: number;
  freeSlots: FreeSlot[];
};

const API_URL = `${BASE_API_URL}/api/Availability`;

// Samma endpoint som AI-assistenten använder via verktyget get_availability
export async function getAvailability(date: string, resourceTypeId?: string): Promise<ResourceAvailability[]> {
  const params = new URLSearchParams({date});

  if (resourceTypeId)
    params.set("resourceTypeId", resourceTypeId);

  const response = await fetch(`${API_URL}?${params}`, {
    credentials: "include",
  });

  if (!response.ok)
    throw new Error("Kunde inte hämta lediga tider");

  return response.json() as Promise<ResourceAvailability[]>;
}

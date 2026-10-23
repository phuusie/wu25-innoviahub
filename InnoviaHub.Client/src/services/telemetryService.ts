import {
  HubConnectionBuilder,
  HubConnectionState,
} from "@microsoft/signalr";

export type Measurement = {
  tenantSlug: string;
  deviceId: string;
  type: string;
  value: number;
  time: string;
}

export const latestReadings: Record<string, Record<string, number>> = {};

const telemetryConnection = new HubConnectionBuilder()
  .withUrl(import.meta.env.VITE_IOT_HUB_URL)
  .withAutomaticReconnect()
  .build();

telemetryConnection.on("measurementReceived", (m: Measurement) => {
  latestReadings[m.deviceId] = {
    ...latestReadings[m.deviceId],
    [m.type]: m.value,
  };
});

telemetryConnection.onreconnected(() => {
  telemetryConnection.invoke("JoinTenant", "innovia");
});

export async function startTelemetryConnection() {
  if (telemetryConnection.state === HubConnectionState.Disconnected) {
    await telemetryConnection.start();
    await telemetryConnection.invoke("JoinTenant", "innovia");
  }

  return telemetryConnection;
}

export {telemetryConnection};

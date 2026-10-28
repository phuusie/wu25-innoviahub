import AdminStatusBadge from "./AdminStatusBadge";
import {useEffect, useState} from "react";
import {getDevices, type Device} from "../services/iotService";
import {latestReadings, startTelemetryConnection, telemetryConnection} from "../services/telemetryService.ts";
import {type Measurement} from "../services/telemetryService.ts";

export default function AdminSensors() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readings, setReadings] = useState<Record<string, Record<string, number>>>(
    () => ({...latestReadings})
  );

  useEffect(() => {
    getDevices()
      .then((data) => {
        setDevices(data);
      })
      .catch((e) => {
        setError(e.message);
      });
  }, [])

  useEffect(() => {
    const handleMeasurement = (m: Measurement) => {
      setReadings((prev) => ({
        ...prev,
        [m.deviceId]: {
          ...prev[m.deviceId],
          [m.type]: m.value,
        },
      }))
    };

    telemetryConnection.on("measurementReceived", handleMeasurement);
    startTelemetryConnection().catch(() => setError("Kunde inte ansluta till sensorerna"));

    return () => {
      telemetryConnection.off("measurementReceived", handleMeasurement);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{fontFamily: "Outfit, sans-serif", color: "#e2eaf2"}}>
          Sensorövervakning
        </h1>
        <span className="text-xs mono" style={{color: "#7a94aa"}}>Realtid · 5s uppdatering</span>
      </div>

      {error ? (
        <div className="rounded-xl p-6 text-center"
             style={{background: "#0d1824", border: "1px solid #1e3347"}}>
          <div className="text-sm font-semibold" style={{color: "#e2eaf2"}}>
            Sensorerna är offline just nu
          </div>
          <div className="text-xs mt-1" style={{color: "#7a94aa"}}>
            IoT-tjänsten svarar inte. Försök igen senare.
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {devices.map((sensor) => {
            const reading = readings[sensor.id];
            return (
              <div key={sensor.id} className="rounded-xl p-4"
                   style={{background: "#0d1824", border: "1px solid #1e3347"}}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg flex items-center justify-center text-xl"
                         style={{width: 40, height: 40, background: "rgba(0,212,170,0.1)"}}>
                      🌡
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{color: "#e2eaf2"}}>{sensor.serial}</div>
                      <div className="text-xs" style={{color: "#7a94aa"}}>{sensor.model}</div>
                    </div>
                  </div>
                  <AdminStatusBadge status={sensor.status}/>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="mono text-xl" style={{color: "#00d4aa"}}>
                    {reading
                      ? `${reading.temperature?.toFixed(1) ?? "–"}°C · ${reading.co2 ?? "–"} ppm`
                      : "–"}
                  </span>
                  <span className="text-xs" style={{color: "#7a94aa"}}>
                    {reading ? "Live" : "Väntar på data"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

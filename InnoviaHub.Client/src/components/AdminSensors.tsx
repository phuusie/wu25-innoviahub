import AdminStatusBadge from "./AdminStatusBadge";
import {useEffect, useState} from "react";
import {getDevices, type Device} from "../services/iotService";

export default function AdminSensors() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDevices()
      .then((data) => {
        setDevices(data);
      })
      .catch((e) => {
        setError(e.message);
      });
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{fontFamily: "Outfit, sans-serif", color: "#e2eaf2"}}>
          Sensorövervakning
        </h1>
        <span className="text-xs mono" style={{color: "#7a94aa"}}>Realtid · 5s uppdatering</span>
      </div>
      {error && <p className="text-sm" style={{ color: "#f43f5e" }}>{error}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {devices.map((sensor) => (
          <div key={sensor.id} className="rounded-xl p-4"
               style={{background: "#0d1824", border: "1px solid #1e3347"}}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg flex items-center justify-center text-xl"
                     style={{width: 40, height: 40, background: "rgba(0,212,170,0.1)"}}>
                  🌡
                </div>
                <div>
                  <div className="text-sm font-semibold"
                       style={{color: "#e2eaf2"}}>{sensor.serial}</div>
                  <div className="text-xs" style={{color: "#7a94aa"}}>{sensor.model}</div>
                </div>
              </div>
              <AdminStatusBadge status={sensor.status}/>
            </div>
            <div className="mt-3 flex items-center justify-between">
                            <span className="mono text-xl"
                                  style={{color: sensor.status === "warn" ? "#f59e0b" : "#00d4aa"}}>-</span>
              <span className="text-xs" style={{color: "#7a94aa"}}>Väntar på data</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { MapContainer, CircleMarker, Polyline, Tooltip, useMap, TileLayer } from "react-leaflet";
import { api } from "../api/client";

type Node = { id: string; lat: number; lng: number; name: string };
type Edge = { id: string; fromId: string; toId: string };

function ResizeOnReady() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function HomeMapSection() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.get("/public/routes/map");
        setNodes(data.data.nodes);
        setEdges(data.data.edges);
      } catch {
        /* empty */
      }
    })();
  }, []);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const center =
    nodes.length > 0
      ? [(nodes.reduce((s, n) => s + n.lat, 0) / nodes.length) as number, nodes.reduce((s, n) => s + n.lng, 0) / nodes.length]
      : [53.3577, 83.7596];

  const lines = edges
    .map((e) => {
      const a = nodeById[e.fromId];
      const b = nodeById[e.toId];
      if (!a || !b) return null;
      return (
        <Polyline key={e.id} positions={[[a.lat, a.lng], [b.lat, b.lng]]} pathOptions={{ color: "#059669", weight: 2, opacity: 0.62 }} />
      );
    })
    .filter(Boolean);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <h2 className="text-center text-2xl font-semibold md:text-3xl">Карта активных связей</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-400">
        Визуализация между городами (OpenStreetMap). Логистический маршрут может отличаться от линии на карте.
      </p>
      <div className="relative z-10 mt-8 h-[420px] overflow-hidden rounded-[32px] border border-slate-200 shadow-xl dark:border-slate-700">
        <MapContainer center={center as [number, number]} zoom={6.35} scrollWheelZoom className="z-10 h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ResizeOnReady />
          {lines}
          {nodes.map((n) => (
            <CircleMarker key={n.id} center={[n.lat, n.lng]} radius={6} pathOptions={{ color: "#047857", weight: 2, fillOpacity: 0.86, fillColor: "#10b981" }}>
              <Tooltip direction="top">{n.name}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../api/client";

type DashboardData = {
  shipmentsTotal: number;
  shipmentsLast30Days: number;
  revenuePaid: number;
  byStatus: Array<{ label?: string | null; count: number }>;
  topRoutes: Array<{ from: string; to: string; shipments: number; loadPercent: number }>;
};

export default function AdminPage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const shipChart = useMemo(() => {
    if (!dash) return [];
    return dash.byStatus.map((row) => ({
      label: row.label ?? "—",
      count: row.count,
    }));
  }, [dash]);

  useEffect(() => {
    void api.get("/admin/dashboard").then((r) => setDash(r.data));
  }, []);

  return (
    <>
      <Helmet><title>Администрирование — Avia Travel</title></Helmet>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Панель эффективности</h1>
        {!dash ? (
          <div className="mt-16 h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        ) : (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { label: 'Всего отправлений', v: dash.shipmentsTotal },
                { label: 'Выручка, ₽', v: dash.revenuePaid },
                { label: 'Отправления / 30 суток', v: dash.shipmentsLast30Days },
              ].map((c) => (
                <div key={c.label} className="glass rounded-[28px] p-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{c.label}</p>
                  <p className="mt-6 text-4xl font-semibold">{c.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="glass min-h-[360px] rounded-[32px] p-6">
                <h3 className="font-semibold">Распределение по статусам</h3>
                <div className="mt-10 h-[300px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={shipChart}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[14, 14, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-[32px] p-6">
                <h3 className="font-semibold mb-6">Наибольшая нагрузка</h3>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="pb-4">Линия</th>
                      <th className="pb-4 text-right">Рейсов</th>
                      <th className="pb-4 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.topRoutes.map((r, i: number) => (
                      <tr key={i} className="border-t border-white/70 dark:border-slate-700">
                        <td className="py-4">
                          {r.from} → {r.to}
                        </td>
                        <td className="py-4 text-right font-mono">{r.shipments}</td>
                        <td className="py-4 text-right text-emerald-600">{r.loadPercent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

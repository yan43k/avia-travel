import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";

const schema = z.object({
  tn: z.string().min(4).transform((x) => x.trim().toUpperCase()),
});

type FormVals = z.infer<typeof schema>;

type TrackData = {
  trackingNumber: string;
  status: { code: string; label: string };
  origin: string;
  destination: string;
  location: string;
  shippedAt: string | null;
  estimatedDeliveryAt: string | null;
  weightKg?: number;
  cargoType?: string;
  bus?: { plate: string; model: string } | null;
  history: Array<{ at: string; location: string | null; status: { code: string; label: string } | null; note: string | null }>;
};

const cargoLabel: Record<string, string> = {
  PARCEL: "Посылка",
  CARGO: "Малогабарит",
  FRAGILE: "Хрупкий",
  DOCUMENTS: "Документы",
};

export default function TrackPage() {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(v: FormVals) {
    setLoading(true);
    setData(null);
    try {
      const res = await api.get(`/public/tracking/${encodeURIComponent(v.tn)}`);
      setData(res.data as TrackData);
    } catch {
      toast.error("Отправление не найдено");
    }
    setLoading(false);
  }

  return (
    <>
      <Helmet>
        <title>Отследить отправление — Avia Travel</title>
        <meta
          name="description"
          content="Проверка статуса и истории отправлений Авиа-Тревел по треку в реальном времени."
        />
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Отследить посылку</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Введите трек‑номер, например{' '}
          <code className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs dark:bg-emerald-900">AV10293847</code>{' '}
          (рейс в пути) или{' '}
          <code className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs dark:bg-emerald-900">AV88776655</code>{' '}
          (выдано).
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="glass mt-8 flex gap-3 rounded-[24px] p-4 md:p-6">
          <input
            className="flex-1 rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
            placeholder="AV________"
            {...register("tn")}
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Найти
          </button>
        </form>

        {data && (
          <motion.div layout className="mt-10 rounded-[28px] border border-slate-100 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6 dark:border-slate-700">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-brand-700">Трек</p>
                <p className="font-mono text-2xl font-bold">{data.trackingNumber}</p>
              </div>
              <div className="rounded-2xl bg-emerald-100 px-5 py-2 text-sm font-semibold text-brand-950 dark:bg-emerald-950 dark:text-emerald-100">
                {data.status.label}
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 text-sm">
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase text-slate-500">Маршрут</div>
                <div className="font-medium">
                  {data.origin} → {data.destination}
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase text-slate-500">Местоположение</div>
                <div className="font-medium">{data.location}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase text-slate-500">Отгрузка</div>
                <div className="font-medium">{data.shippedAt ? new Date(data.shippedAt).toLocaleString('ru-RU') : '—'}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-xs uppercase text-slate-500">Целевая ETA</div>
                <div className="font-medium">
                  {data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt).toLocaleString('ru-RU') : '—'}
                </div>
              </div>
              {data.weightKg != null && (
                <div className="glass rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-500">Вес</div>
                  <div className="font-medium">{data.weightKg} кг</div>
                </div>
              )}
              {data.cargoType && (
                <div className="glass rounded-xl p-4">
                  <div className="text-xs uppercase text-slate-500">Тип груза</div>
                  <div className="font-medium">{cargoLabel[data.cargoType] ?? data.cargoType}</div>
                </div>
              )}
              {data.bus && (
                <div className="glass rounded-xl md:col-span-2 p-4">
                  <div className="text-xs uppercase text-slate-500">Автобус</div>
                  <div className="font-medium">
                    {data.bus.model} · {data.bus.plate}
                  </div>
                </div>
              )}
            </div>

            <h2 className="mt-12 text-lg font-semibold">История перемещений</h2>
            <ol className="relative mt-8 space-y-10 border-l-2 border-emerald-400/70 pl-6">
              {data.history.map((h, i) => (
                <li key={i} className="relative ms-[-4px]">
                  <motion.span layout className="absolute -left-[13px] top-2 h-3 w-3 rounded-full bg-emerald-500 ring-8 ring-emerald-100 dark:ring-emerald-950" />
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {new Date(h.at).toLocaleString('ru-RU')}
                      {h.status ? ` · ${h.status.label}` : ''}
                    </div>
                    <div className="mt-1 text-slate-600 dark:text-slate-400">{h.location}</div>
                    {h.note && <div className="mt-2 text-xs text-slate-500">{h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </div>
    </>
  );
}

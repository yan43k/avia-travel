import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Radar } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { api } from "../api/client";

const schema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  weightKg: z.number().positive().max(500),
  cargoType: z.enum(["PARCEL", "CARGO", "FRAGILE", "DOCUMENTS"]),
  urgency: z.enum(["STANDARD", "EXPRESS", "URGENT"]),
  insurance: z
    .any()
    .optional()
    .transform((v) => v === true || v === "on" || v === "true"),
});

type FormVals = z.output<typeof schema>;

type CityRow = { id: string; name: string };

export default function CalculatorPage() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CityRow[]>([]);

  useEffect(() => {
    void api.get("/public/cities").then(
      (r) => setCities(r.data.items as CityRow[]),
      () => undefined
    );
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormVals>({
    resolver: zodResolver(schema) as Resolver<FormVals>,
    defaultValues: {
      origin: "Барнаул",
      destination: "Бийск",
      weightKg: 10,
      cargoType: "PARCEL",
      urgency: "EXPRESS",
      insurance: false,
    },
  });

  async function onSubmit(data: FormVals) {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/public/quotes/calculate", data);
      setResult(res.data);
      toast.success("Расчёт обновлён");
    } catch {
      toast.error("Не удалось получить котировку");
    }
    setLoading(false);
  }

  return (
    <>
      <Helmet>
        <title>Калькулятор доставки — Avia Travel</title>
      </Helmet>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-brand-600/15 p-3">
            <Radar className="h-7 w-7 text-brand-700 dark:text-brand-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Мгновенный расчёт</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Профили ниже симулируют разные экономические режимы сети («быстрее», «дешевле», «баланс»).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="glass mt-8 grid gap-4 rounded-[28px] p-8 md:grid-cols-2">
          {cities.length > 0 && (
            <datalist id="avia-city-list">
              {cities.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          )}
          <label className="text-sm font-medium md:col-span-2">
            Откуда
            <input
              className="mt-2 w-full rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
              list={cities.length ? "avia-city-list" : undefined}
              autoComplete="off"
              {...register("origin")}
            />
            <p className="text-xs text-red-600">{errors.origin?.message}</p>
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Куда
            <input
              className="mt-2 w-full rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
              list={cities.length ? "avia-city-list" : undefined}
              autoComplete="off"
              {...register("destination")}
            />
            <p className="text-xs text-red-600">{errors.destination?.message}</p>
          </label>
          <label className="text-sm font-medium">
            Вес, кг
            <input
              type="number"
              step="0.1"
              className="mt-2 w-full rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
              {...register("weightKg", { valueAsNumber: true })}
            />
            <p className="text-xs text-red-600">{errors.weightKg?.message}</p>
          </label>
          <label className="text-sm font-medium">
            Тип груза
            <select className="mt-2 w-full rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900" {...register("cargoType")}>
              <option value="PARCEL">Посылка</option>
              <option value="CARGO">Малогабарит</option>
              <option value="FRAGILE">Хрупкий</option>
              <option value="DOCUMENTS">Документы</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Срочность
            <select className="mt-2 w-full rounded-xl border px-4 py-2 dark:border-slate-700 dark:bg-slate-900" {...register("urgency")}>
              <option value="STANDARD">Стандарт</option>
              <option value="EXPRESS">Экспресс</option>
              <option value="URGENT">Приоритет</option>
            </select>
          </label>
          <label className="text-sm font-medium md:col-span-2 flex items-start gap-2">
            <input type="checkbox" className="mt-1 rounded border-slate-300 dark:border-slate-600" {...register("insurance")} />
            Страхование стоимости
          </label>
          <div className="md:col-span-2 flex justify-end">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/35 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Рассчитать
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-10 rounded-[28px] border border-emerald-200/60 bg-emerald-50/80 p-8 dark:border-emerald-800 dark:bg-emerald-950/50"
            >
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-emerald-200/60 pb-6 dark:border-emerald-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand-900 dark:text-brand-300">Выбранный сценарий</p>
                  <p className="mt-2 text-5xl font-bold text-brand-900 dark:text-white">
                    {(result.price as number).toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">ETA ≈ {(result.estimatedHoursTotal as number)?.toFixed(1)} ч</p>
                </div>
                <div className="text-xs text-right text-slate-600 dark:text-slate-400 max-w-[220px]">
                  <div>
                    {(result.smartForecast as { delayProbabilityPercent: number }).delayProbabilityPercent}% вероятность задержки
                  </div>
                  <div>
                    загрузка маршрута{' '}
                    {(result.smartForecast as { routeLoadPercent: number }).routeLoadPercent}%
                  </div>
                  <div className="mt-2">{(result.smartForecast as { weatherImpact: string }).weatherImpact}</div>
                </div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {(result.profiles as Array<Record<string, unknown>>)?.map((p) => (
                  <motion.div
                    layout
                    key={String(p.code)}
                    whileHover={{ y: -6 }}
                    className="rounded-2xl border border-brand-900/15 bg-white/90 p-4 text-sm shadow-sm dark:border-white/15 dark:bg-slate-900"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-brand-700">{String(p.title)}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                      {(p.price as number).toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{Number(p.etaHours).toFixed(1)} ч · {String(p.urgency)}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

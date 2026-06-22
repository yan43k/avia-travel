import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, MapPin, Package, ShieldCheck, Sparkles } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "../api/client";

const HomeMapSection = lazy(() => import("../components/HomeMapSection"));

const cities = ["Барнаул", "Бийск", "Рубцовск", "Новоалтайск", "Алейск", "Заринск", "Белокуриха"];

export default function HomePage() {
  const [stats, setStats] = useState({
    shipmentsHandled: "—",
    routePairs: "—",
    activeClients: "—",
    onTimeRate: "—",
  });
  const [reviews, setReviews] = useState<
    Array<{ id: string; authorName: string; rating: number; comment?: string | null }>
  >([]);
  const [popular, setPopular] = useState<
    Array<{ id: string; from: string; to: string; distanceKm: number; loadPercent: number }>
  >([]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await api.get("/public/stats");
        setStats({
          shipmentsHandled: String(s.data.shipmentsHandled),
          routePairs: String(s.data.routePairs),
          activeClients: String(s.data.activeClients),
          onTimeRate: String(s.data.onTimeRate),
        });
        const r = await api.get("/public/reviews");
        setReviews(r.data.items.slice(0, 6));
        const pop = await api.get("/public/routes/popular");
        setPopular((pop.data.items as typeof popular).slice(0, 8));
      } catch {
        /* offline */
      }
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>Avia Travel — автобусная логистика Алтайского края и России</title>
      </Helmet>

      <section className="relative overflow-hidden bg-hero-soft dark:bg-hero-soft-dark">
        <div className="pointer-events-none absolute inset-x-0 -top-28 h-[420px] bg-[radial-gradient(circle_at_20%_-10%,rgba(16,185,129,0.35),transparent_52%),radial-gradient(circle_at_90%_-20%,rgba(59,130,246,0.12),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 dark:border-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              <Sparkles className="h-4 w-4" aria-hidden /> Между городами автобусом
            </p>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              Когда нужна{' '}
              <span className="bg-gradient-to-r from-brand-600 to-teal-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-emerald-400">
                реальная скорость
              </span>{' '}
              без дорогих пролётов
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-400">
              Авиа-Тревел соединяет населённые пункты Алтайского края расписанными рейсами: посылки
              и партии следуют вместе с пассажирскими маршрутами.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/track"
                className="inline-flex min-w-[200px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/35 transition hover:scale-[1.02] hover:bg-brand-700 active:scale-95 md:flex-none"
              >
                Отследить посылку <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/calculator"
                className="inline-flex min-w-[200px] flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900 dark:text-white md:flex-none"
              >
                Рассчитать стоимость
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="glass relative rounded-3xl p-8"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.19em] text-brand-700 dark:text-emerald-200">
                  Сеть рейсов
                </p>
                <p className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
                  Узловое покрытие Алтайского края
                </p>
              </div>
              <Package className="h-8 w-8 text-brand-600" aria-hidden />
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand-500/25 bg-brand-600/10 p-4 dark:bg-emerald-500/15">
                <p className="text-4xl font-bold text-brand-900 dark:text-emerald-100">{stats.onTimeRate}%</p>
                <p className="mt-2 text-xs text-brand-950/75 dark:text-emerald-100/80">
                  Совокупный показатель выхода из рейсов вовремя (скользящее окно)
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                {cities.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">Цифры, которые поддерживают доверие</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Отправления в учёте", value: stats.shipmentsHandled },
            { label: "Активных линков", value: stats.routePairs },
            { label: "Клиентов с кабинетом", value: stats.activeClients },
            { label: "Пункта вовремя по смыслу SLA", value: `${stats.onTimeRate}%` },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -6 }}
              className="rounded-3xl bg-white p-6 shadow-md shadow-slate-200/50 dark:bg-slate-900 dark:shadow-black/60"
            >
              <div className="text-3xl font-bold text-brand-600 dark:text-emerald-300">{s.value}</div>
              <div className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-slate-100/80 py-16 dark:bg-slate-900/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-3">
          {[
            {
              title: "Сетевая увязка",
              text: "Подбор рейса с промежуточными пунктами без лишней логистики «через хаб только ради SLA».",
              icon: MapPin,
            },
            {
              title: "Режимы грузов",
              text: "Тип упаковки влияет на перегрузочные ограничения — это прозрачно в калькуляторе.",
              icon: ShieldCheck,
            },
            {
              title: "Юридический контур",
              text: "Подписанное фискально значимое сопровождение и генерация PDF-квитанции.",
              icon: CheckCircle2,
            },
          ].map((item) => (
            <motion.div key={item.title} className="rounded-3xl bg-white p-8 dark:bg-slate-950">
              <item.icon className="mb-4 h-7 w-7 text-brand-600" aria-hidden />
              <p className="text-lg font-semibold">{item.title}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold md:text-3xl">Популярные направления</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(popular.length
            ? popular.map((x) => ({
                key: x.id,
                line: `${x.from} → ${x.to}`,
                sub: `${x.distanceKm} км · загрузка сети ${x.loadPercent}%`,
              }))
            : [
                { key: "f1", line: "Барнаул → Бийск", sub: "164 км" },
                { key: "f2", line: "Барнаул → Рубцовск", sub: "320 км" },
                { key: "f3", line: "Бийск → Белокуриха", sub: "70 км" },
                { key: "f4", line: "Новоалтайск → Бийск", sub: "148 км" },
              ]
          ).map((r) => (
            <div key={r.key} className="glass rounded-3xl px-6 py-4 text-sm">
              <div className="font-semibold">{r.line}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{r.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-semibold md:text-3xl">Отзывы</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(reviews.length
              ? reviews
              : [{ id: "x", authorName: "Подключите API", rating: 5, comment: "Данные появятся автоматически." }]
            ).map((rev) => (
              <motion.div key={rev.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="font-semibold">{rev.authorName}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-500">{'★'.repeat(rev.rating)}</div>
                {rev.comment && <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{rev.comment}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-center text-2xl font-semibold md:text-3xl">Как это работает</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ['01', 'Расчёт и бронь', 'Калькулятор фиксирует сценарий срочности, страховки и упаковки.'],
            ['02', 'Погрузка', 'Выдаём трек‑номер, QR‑метку и событие в ленту перемещений.'],
            ['03', 'Выдача', 'Уведомления в профиле, e-mail если подключены SMTP‑параметры.'],
          ].map(([step, title, txt]) => (
            <motion.div key={String(step)} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700 dark:text-brand-300">{step}</p>
              <p className="mt-4 text-xl font-semibold">{title}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{txt}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass mt-20 rounded-[32px] p-10">
          <h3 className="text-xl font-semibold">FAQ</h3>
          <div className="mt-8 space-y-6 text-sm text-slate-600 dark:text-slate-400">
            <details className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950">
              <summary className="cursor-pointer font-medium text-slate-900 marker:text-transparent dark:text-white">
                Работаете ли вы с маленькими посылками?
              </summary>
              <p className="mt-3">
                Да, формат отправлений — от офисной коробки до малогабаритных промышленных партий без отдельного фрахта.
              </p>
            </details>
            <details className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950">
              <summary className="cursor-pointer font-medium text-slate-900 marker:text-transparent dark:text-white">
                Насколько гибкая страховка?
              </summary>
              <p className="mt-3">
                Вы можете активировать финансовую защиту в калькуляторе; тариф включается в итоговую стоимость.
              </p>
            </details>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="mx-auto mb-24 h-96 max-w-6xl animate-pulse rounded-[32px] bg-slate-200 px-4 dark:bg-slate-800" />}>
        <HomeMapSection />
      </Suspense>
    </>
  );
}

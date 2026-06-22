import { Helmet } from "react-helmet-async";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import toast from "react-hot-toast";

const tabs = [
  ["Отправления", "ship"],
  ["Уведомления", "notes"],
  ["Профиль", "profile"],
  ["Маршруты", "routes"],
  ["Адреса", "addr"],
] as const;

type ShipmentLite = {
  id: string;
  trackingNumber: string;
  route: { originCity: { name: string }; destinationCity: { name: string } };
  currentStatus: { label: string; code: string };
  priceTotal: number;
  payments?: { id: string }[];
};

type NoteItem = { id: string; title: string; body: string; read: boolean };
type RouteItem = {
  id: string;
  label?: string | null;
  route?: { originCity: { name: string }; destinationCity: { name: string }; id: string };
};
type PopularRoute = { id: string; from: string; to: string };
type AddrItem = { id: string; label: string; city: string; addressLine?: string | null };

export default function CabinetPage() {
  const [tab, setTab] = useState<(typeof tabs)[number][1]>("ship");
  const [shipments, setShipments] = useState<ShipmentLite[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [addresses, setAddresses] = useState<AddrItem[]>([]);
  const [profile, setProfile] = useState<{
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [popular, setPopular] = useState<PopularRoute[]>([]);
  const [newRouteId, setNewRouteId] = useState("");
  const [newRouteLabel, setNewRouteLabel] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.get("/me");
        setProfile(me.data.user);
        const ships = await api.get("/me/shipments");
        setShipments(ships.data.items as ShipmentLite[]);
        const nt = await api.get("/me/notifications");
        setNotes(nt.data.items as NoteItem[]);
        const rt = await api.get("/me/saved-routes");
        setRoutes(rt.data.items as RouteItem[]);
        const adr = await api.get("/me/favorite-addresses");
        setAddresses(adr.data.items as AddrItem[]);
      } catch {
        toast.error("Не удалось загрузить кабинет — проверьте сеть и авторизацию");
      }
    })();
  }, []);

  useEffect(() => {
    if (tab !== "routes") return;
    void api.get("/public/routes/popular").then(
      (r) => setPopular((r.data.items as PopularRoute[]).slice(0, 24)),
      () => toast.error("Список маршрутов недоступен")
    );
  }, [tab]);

  async function saveProfile(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setBusy(true);
    const fd = new FormData(ev.currentTarget);
    try {
      const res = await api.put("/me", {
        firstName: fd.get("firstName") || undefined,
        lastName: fd.get("lastName") || undefined,
        phone: fd.get("phone") || undefined,
      });
      setProfile(res.data.user);
      toast.success("Профиль сохранён");
    } catch {
      toast.error("Не удалось сохранить профиль");
    } finally {
      setBusy(false);
    }
  }

  async function addSavedRoute(ev: FormEvent) {
    ev.preventDefault();
    if (!newRouteId) {
      toast.error("Выберите маршрут из списка");
      return;
    }
    try {
      await api.post("/me/saved-routes", { routeId: newRouteId, label: newRouteLabel.trim() || undefined });
      const rt = await api.get("/me/saved-routes");
      setRoutes(rt.data.items as RouteItem[]);
      setNewRouteLabel("");
      toast.success("Маршрут добавлен в избранное");
    } catch {
      toast.error("Не удалось сохранить маршрут");
    }
  }

  async function removeSavedRoute(routeId: string) {
    try {
      await api.delete(`/me/saved-routes/${encodeURIComponent(routeId)}`);
      setRoutes((prev) => prev.filter((r) => r.route?.id !== routeId));
      toast.success("Удалено из избранного");
    } catch {
      toast.error("Не удалось удалить");
    }
  }

  async function addAddress(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const label = String(fd.get("label") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    if (!label || !city) {
      toast.error("Укажите название и город");
      return;
    }
    try {
      await api.post("/me/favorite-addresses", {
        label,
        city,
        addressLine: String(fd.get("addressLine") ?? "").trim() || undefined,
        postalCode: String(fd.get("postalCode") ?? "").trim() || undefined,
      });
      const adr = await api.get("/me/favorite-addresses");
      setAddresses(adr.data.items as AddrItem[]);
      ev.currentTarget.reset();
      toast.success("Адрес сохранён");
    } catch {
      toast.error("Не удалось добавить адрес");
    }
  }

  async function removeAddress(id: string) {
    try {
      await api.delete(`/me/favorite-addresses/${encodeURIComponent(id)}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Адрес удалён");
    } catch {
      toast.error("Не удалось удалить адрес");
    }
  }

  async function markNotificationsReadAll() {
    try {
      await api.patch("/me/notifications/read-all");
      setNotes((n) => n.map((x) => ({ ...x, read: true })));
      toast.success("Все отмечены прочитанными");
    } catch {
      toast.error("Не удалось обновить уведомления");
    }
  }

  return (
    <>
      <Helmet>
        <title>Личный кабинет — Avia Travel</title>
      </Helmet>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold">Личный кабинет</h1>
        <div className="mt-6 flex flex-wrap gap-2 rounded-3xl bg-slate-100 p-2 text-sm dark:bg-slate-900">
          {tabs.map(([label, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-2xl px-4 py-2 font-semibold transition ${
                tab === key
                  ? "bg-brand-600 text-white shadow-lg"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "ship" && (
          <div className="mt-8 space-y-4">
            {shipments.length === 0 && <p className="text-sm text-slate-500">Пока нет отправлений.</p>}
            {shipments.map((s) => (
              <ShipmentCard key={s.id} s={s} />
            ))}
          </div>
        )}

        {tab === "notes" && (
          <div className="mt-8 space-y-4">
            <button type="button" onClick={() => void markNotificationsReadAll()} className="text-sm underline">
              Прочитать все
            </button>
            {notes.length === 0 && <p className="text-sm text-slate-500">Уведомлений пока нет.</p>}
            {notes.map((n) => (
              <div
                key={n.id}
                className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="font-semibold">{n.title}</div>
                <div className="text-xs uppercase text-emerald-600">{n.read ? "архив" : "новое"}</div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">{n.body}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && profile && (
          <form onSubmit={saveProfile} className="glass mt-8 max-w-xl space-y-4 rounded-[28px] p-8">
            <p className="text-sm text-slate-500">{profile.email}</p>
            <label className="block text-sm">
              Имя
              <input
                name="firstName"
                defaultValue={profile.firstName ?? ""}
                className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm">
              Фамилия
              <input
                name="lastName"
                defaultValue={profile.lastName ?? ""}
                className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="block text-sm">
              Телефон
              <input
                name="phone"
                defaultValue={profile.phone ?? ""}
                className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button disabled={busy} className="rounded-xl bg-brand-600 px-6 py-3 text-white">
              Сохранить
            </button>
          </form>
        )}

        {tab === "routes" && (
          <div className="mt-8 space-y-8">
            <form onSubmit={addSavedRoute} className="glass max-w-xl space-y-4 rounded-[28px] p-6">
              <p className="text-sm font-medium">Добавить маршрут</p>
              <label className="block text-sm">
                Направление
                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  value={newRouteId}
                  onChange={(e) => setNewRouteId(e.target.value)}
                >
                  <option value="">— выберите —</option>
                  {popular.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.from} → {p.to}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Подпись (необязательно)
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  value={newRouteLabel}
                  onChange={(e) => setNewRouteLabel(e.target.value)}
                  placeholder="Напр. «Склад → офис»"
                />
              </label>
              <button type="submit" className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-semibold text-white">
                Сохранить в избранное
              </button>
            </form>

            <div className="grid gap-3 md:grid-cols-2">
              {routes.length === 0 && <p className="text-sm text-slate-500">Нет сохранённых маршрутов.</p>}
              {routes.map((sr) => (
                <div
                  key={sr.id}
                  className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-100 p-6 dark:border-slate-700"
                >
                  {sr.route && (
                    <div>
                      <p className="font-semibold">
                        {sr.route.originCity.name} → {sr.route.destinationCity.name}
                      </p>
                      {sr.label && <p className="mt-1 text-xs text-slate-500">{sr.label}</p>}
                    </div>
                  )}
                  {sr.route && (
                    <button
                      type="button"
                      className="self-start text-sm text-red-600 underline dark:text-red-400"
                      onClick={() => void removeSavedRoute(sr.route!.id)}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "addr" && (
          <div className="mt-8 space-y-8">
            <form onSubmit={addAddress} className="glass max-w-xl space-y-4 rounded-[28px] p-6">
              <p className="text-sm font-medium">Новый адрес</p>
              <label className="block text-sm">
                Название
                <input name="label" className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" required />
              </label>
              <label className="block text-sm">
                Город
                <input name="city" className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" required />
              </label>
              <label className="block text-sm">
                Улица, дом
                <input name="addressLine" className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="block text-sm">
                Индекс
                <input name="postalCode" className="mt-2 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <button type="submit" className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-semibold text-white">
                Добавить
              </button>
            </form>

            <div className="space-y-4">
              {addresses.length === 0 && <p className="text-sm text-slate-500">Адресов пока нет.</p>}
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-white p-4 shadow dark:bg-slate-900"
                >
                  <div>
                    <div className="font-semibold">{a.label}</div>
                    <div className="text-sm">{a.city}</div>
                    {a.addressLine && <div className="text-xs text-slate-500">{a.addressLine}</div>}
                  </div>
                  <button
                    type="button"
                    className="text-sm text-red-600 underline dark:text-red-400"
                    onClick={() => void removeAddress(a.id)}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DeliveredReviewBlock({
  shipmentId,
  trackingNumber,
}: {
  shipmentId: string;
  trackingNumber: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setSending(true);
    try {
      await api.post(`/me/shipments/${shipmentId}/reviews`, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success("Отзыв отправлен на модерацию");
      setSent(true);
      setComment("");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(ax.response?.data?.error?.message ?? "Не удалось отправить отзыв");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">
        Спасибо за отзыв по {trackingNumber}. После модерации он может появиться на сайте.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-2xl border border-dashed border-emerald-400/50 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/25"
    >
      <p className="text-xs font-medium text-slate-800 dark:text-emerald-100">Отзыв о доставке</p>
      <label className="mt-3 block text-xs">
        Оценка
        <select
          className="mt-1 w-full rounded-lg border px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 block text-xs">
        Комментарий
        <textarea
          className="mt-1 w-full rounded-lg border px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900"
          rows={3}
          maxLength={600}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Как прошла выдача?"
        />
      </label>
      <button
        type="submit"
        disabled={sending}
        className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {sending ? "Отправка…" : "Отправить отзыв"}
      </button>
    </form>
  );
}

function QrThumb({ shipmentId }: { shipmentId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    void api.get(`/me/shipments/${shipmentId}/qr.png`, { responseType: "blob" }).then((r) => {
      objectUrl = URL.createObjectURL(r.data);
      setSrc(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shipmentId]);

  if (!src) {
    return <div className="mt-4 h-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />;
  }
  return <img className="mt-4 max-h-44 rounded-xl border" alt="QR отправления" src={src} />;
}

function ShipmentCard({ s }: { s: ShipmentLite }) {
  async function downloadReceipt(pid: string) {
    try {
      const r = await api.get(`/me/payments/${pid}/receipt.pdf`, { responseType: "blob" });
      const u = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = u;
      a.download = `avia-receipt-${pid}.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="glass rounded-3xl px-6 py-4 text-sm">
      <div className="flex flex-wrap justify-between gap-6">
        <span className="font-mono text-lg">{s.trackingNumber}</span>
        <span className="rounded-full bg-emerald-600/15 px-3 py-1 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-50">
          {s.currentStatus.label}
        </span>
      </div>
      <p className="mt-2">
        {s.route.originCity.name} → {s.route.destinationCity.name}
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400">{s.priceTotal} ₽</p>
      {s.payments?.[0] && (
        <button
          type="button"
          className="mt-3 inline-flex text-brand-700 underline dark:text-brand-400"
          onClick={() => void downloadReceipt(s.payments![0].id)}
        >
          Скачать квитанцию PDF
        </button>
      )}
      <QrThumb shipmentId={s.id} />
      {s.currentStatus.code === "DELIVERED" && (
        <DeliveredReviewBlock shipmentId={s.id} trackingNumber={s.trackingNumber} />
      )}
    </div>
  );
}

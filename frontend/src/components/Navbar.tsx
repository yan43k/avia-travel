import { Link, NavLink, useNavigate } from "react-router-dom";
import { Moon, Sun, Truck, Menu, X } from "lucide-react";
import clsx from "clsx";
import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore";
import { Logo } from "./Logo";
import { useState } from "react";
import { api } from "../api/client";

const navCls = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  );

export function Navbar() {
  const [open, setOpen] = useState(false);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const auth = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await api.post(
        "/auth/logout",
        { refreshToken: auth.refreshToken },
        { withCredentials: true }
      );
    } catch {
      /* ignore */
    }
    auth.logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
              Avia Travel
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Truck className="h-3 w-3" aria-hidden /> автобусная логистика
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/calculator" className={navCls}>
            Расчёт
          </NavLink>
          <NavLink to="/track" className={navCls}>
            Отследить
          </NavLink>
          {auth.user && (
            <NavLink to="/cabinet" className={navCls}>
              Кабинет
            </NavLink>
          )}
          {auth.user?.role === "ADMIN" && (
            <NavLink to="/admin" className={navCls}>
              Панель
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={dark ? "Светлая тема" : "Тёмная тема"}
            onClick={() => toggleTheme()}
            className="inline-flex rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {!auth.user ? (
            <NavLink
              to="/login"
              className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700 md:inline-flex"
            >
              Войти
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold md:inline-flex dark:border-slate-600"
            >
              Выйти
            </button>
          )}

          <button
            type="button"
            className="inline-flex rounded-xl border border-slate-200 p-2 md:hidden dark:border-slate-700"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Закрыть меню" : "Меню"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:hidden">
          <div className="flex flex-col gap-2">
            <NavLink to="/calculator" className={navCls} onClick={() => setOpen(false)}>
              Расчёт
            </NavLink>
            <NavLink to="/track" className={navCls} onClick={() => setOpen(false)}>
              Отследить
            </NavLink>
            {auth.user && (
              <NavLink to="/cabinet" className={navCls} onClick={() => setOpen(false)}>
                Кабинет
              </NavLink>
            )}
            {auth.user?.role === "ADMIN" && (
              <NavLink to="/admin" className={navCls} onClick={() => setOpen(false)}>
                Панель
              </NavLink>
            )}
            {!auth.user ? (
              <NavLink
                to="/login"
                className="mt-2 rounded-xl bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Войти
              </NavLink>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                  setOpen(false);
                }}
                className="mt-2 rounded-xl border border-slate-300 py-2 text-sm font-semibold dark:border-slate-600"
              >
                Выйти
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

import { Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white/80 py-12 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 md:flex-row md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Авиа-Тревел</p>
          <p className="mt-2 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            Регулярная автобусная доставка посылок и небольших грузов. Единые стандарты сроков и
            понятное отслеживание.
          </p>
        </div>
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0" /> info@avia-travel.local
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" /> +7 (3852) 000-00-00
          </div>
          <div>Барнаул, офис отправлений при автовокзале</div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-4 text-xs text-slate-500">
        © {new Date().getFullYear()} Avia Travel · Безопасные перевозки и обработка персональных
        данных в соответствии с политикой конфиденциальности.
      </div>
    </footer>
  );
}

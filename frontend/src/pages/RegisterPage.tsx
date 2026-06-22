import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../api/client";

const schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirm: z.string().min(8),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm, { message: "Пароли не совпадают", path: ["confirm"] });

type FormVals = z.infer<typeof schema>;

export default function RegisterPage() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormVals) {
    try {
      await api.post("/auth/register", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      toast.success("Учётная запись создана — войдите");
      nav("/login");
    } catch {
      toast.error("Регистрация не выполнена");
    }
  }

  return (
    <>
      <Helmet><title>Регистрация — Avia Travel</title></Helmet>
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-center text-3xl font-bold">Создайте аккаунт</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="glass mt-8 rounded-[26px] p-8 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              Имя
              <input className="mt-2 w-full rounded-xl border px-3 py-2 dark:bg-slate-900 dark:border-slate-700" {...register("firstName")} />
            </label>
            <label className="text-sm font-medium">
              Фамилия
              <input className="mt-2 w-full rounded-xl border px-3 py-2 dark:bg-slate-900 dark:border-slate-700" {...register("lastName")} />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Email
            <input type="email" className="mt-2 w-full rounded-xl border px-4 py-2 dark:bg-slate-900 dark:border-slate-700" {...register("email")} />
            <p className="text-xs text-red-600">{errors.email?.message}</p>
          </label>
          <label className="block text-sm font-medium">
            Пароль
            <input type="password" className="mt-2 w-full rounded-xl border px-4 py-2 dark:bg-slate-900 dark:border-slate-700" {...register("password")} />
            <p className="text-xs text-red-600">{errors.password?.message}</p>
          </label>
          <label className="block text-sm font-medium">
            Повтор пароля
            <input type="password" className="mt-2 w-full rounded-xl border px-4 py-2 dark:bg-slate-900 dark:border-slate-700" {...register("confirm")} />
            <p className="text-xs text-red-600">{errors.confirm?.message}</p>
          </label>
          <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white">
            Зарегистрироваться
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Уже есть аккаунт? <Link className="text-brand-700 underline dark:text-brand-400" to="/login">Войти</Link>
        </p>
      </div>
    </>
  );
}

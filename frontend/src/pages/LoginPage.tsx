import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormVals = z.infer<typeof schema>;

export default function LoginPage() {
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormVals) {
    try {
      const res = await api.post("/auth/login", data);
      setAuth({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });
      toast.success("Вы в системе");
      nav(res.data.user.role === "ADMIN" ? "/admin" : "/cabinet");
    } catch {
      toast.error("Проверьте данные аккаунта");
    }
  }

  return (
    <>
      <Helmet><title>Вход — Avia Travel</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-center text-3xl font-bold">Вход в кабинет</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="glass mt-8 rounded-[26px] p-8 space-y-4">
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
          <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white">Продолжить</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Нет аккаунта? <Link className="text-brand-700 underline dark:text-brand-400" to="/register">Зарегистрируйтесь</Link>
        </p>
      </div>
    </>
  );
}

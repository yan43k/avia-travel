import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeStore = {
  dark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
};

function applyCls(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () =>
        set((s) => {
          const dark = !s.dark;
          applyCls(dark);
          return { dark };
        }),
      setDark: (dark) => {
        applyCls(dark);
        set({ dark });
      },
    }),
    {
      name: "avia-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyCls(state.dark);
      },
    }
  )
);

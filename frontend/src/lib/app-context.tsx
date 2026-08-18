"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, clearTokens, getSessionKey, saveTokens } from "./api";
import type { Cart, User } from "./types";

type AppState = {
  user: User | null;
  loading: boolean;
  cart: Cart | null;
  cartCount: number;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: number, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
};

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="fixed top-20 right-1/2 z-50 translate-x-1/2 rounded-xl bg-bg-raised px-4 py-2 text-sm text-gold ring-1 ring-gold/40 shadow-lg">
      {toast}
    </div>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem("yk9_access_token"))
  );
  const [cart, setCart] = useState<Cart | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshCart = async () => {
    try {
      const c = await api<Cart>("/api/cart/", { guest: true, auth: true });
      setCart(c);
    } catch {
      /* backend not reachable */
    }
  };

  useEffect(() => {
    getSessionKey();
  }, []);

  useEffect(() => {
    if (!loading) return;
    api<User>("/api/auth/me/", { auth: true })
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, [loading]);

  useEffect(() => {
    // setState happens after network await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCart();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await api<{ access: string; refresh: string; user: User }>(
      "/api/auth/login/",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
    saveTokens(data.access, data.refresh);
    setUser(data.user);
    await refreshCart();
    return data.user;
  };

  const register = async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    await api("/api/auth/register/", { method: "POST", body: JSON.stringify(data) });
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setCart(null);
  };

  const addToCart = async (variantId: number, quantity = 1) => {
    await api("/api/cart/", {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity }),
      guest: true,
      auth: true,
    });
    await refreshCart();
  };

  const updateCartItem = async (itemId: number, quantity: number) => {
    await api(`/api/cart/items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
      guest: true,
      auth: true,
    });
    await refreshCart();
  };

  const removeCartItem = async (itemId: number) => {
    await api(`/api/cart/items/${itemId}/`, {
      method: "DELETE",
      guest: true,
      auth: true,
    });
    await refreshCart();
  };

  const clearCart = async () => {
    await api("/api/cart/clear/", { method: "DELETE", guest: true, auth: true });
    await refreshCart();
  };

  const cartCount = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        cart,
        cartCount,
        login,
        register,
        logout,
        refreshCart,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

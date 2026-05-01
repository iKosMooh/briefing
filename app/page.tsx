"use client";

import { useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { useUserData } from "@/components/useUserData";
import { AccessGuard } from "@/components/tabs/AccessGuard";
import LoginCard from "@/components/LoginCard";
import HojeTab from "@/components/tabs/HojeTab";
import HistoricoTab from "@/components/tabs/HistoricoTab";
import MetasTab from "@/components/tabs/MetasTab";
import CustosTab from "@/components/tabs/CustosTab";
import EstoqueTab from "@/components/tabs/EstoqueTab";
import AccessControlTab from "@/components/tabs/AccessControlTab";

type Tab = "hoje" | "historico" | "metas" | "custos" | "estoque" | "acesso";

const TABS: { id: Tab; label: string }[] = [
  { id: "hoje", label: "⚡ Hoje" },
  { id: "historico", label: "🗂 Histórico" },
  { id: "metas", label: "🎯 Metas" },
  { id: "custos", label: "💸 Custos" },
  { id: "estoque", label: "📦 Estoque" },
  { id: "acesso", label: "🔐 Acesso" },
];

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          color: "var(--muted)",
          fontSize: ".9rem",
        }}
      >
        ⏳ Carregando…
      </div>
    );
  }

  if (!user) return <LoginCard />;

  return (
    <AccessGuard>
      <AppShell />
    </AccessGuard>
  );
}

function AppShell() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("hoje");
  const [dateLabel] = useState(() => {
    if (typeof window === "undefined") return "";
    const s = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return "📆 " + s.charAt(0).toUpperCase() + s.slice(1);
  });

  const data = useUserData(user?.uid);

  if (!user) return null;

  return (
    <div className="container">
      <header>
        <h1><span className="logo-emoji">📊</span> <span className="logo-text">Controle de Lucro Diário</span></h1>
        <p>Mercado Livre · Múltiplos Anúncios</p>
        <div className="date-badge">{dateLabel || "📆 Carregando..."}</div>
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
          gap: 8,
          alignItems: "center",
        }}
      >
        <span className="user-chip">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="" />
          ) : null}
          {user.displayName || user.email}
        </span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={signOut}>
          Sair
        </button>
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {!data.ready ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--muted)",
            fontSize: ".9rem",
          }}
        >
          ⏳ Carregando dados…
        </div>
      ) : (
        <>
          {tab === "hoje" && <HojeTab uid={user.uid} data={data} />}
          {tab === "historico" && <HistoricoTab uid={user.uid} data={data} />}
          {tab === "metas" && <MetasTab uid={user.uid} data={data} />}
          {tab === "custos" && <CustosTab uid={user.uid} data={data} />}
          {tab === "estoque" && <EstoqueTab uid={user.uid} data={data} />}
          {tab === "acesso" && (
            <AccessControlTab uid={user.uid} data={data} />
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import LoginCard from "@/components/LoginCard";
import HojeTab from "@/components/tabs/HojeTab";
import MetasTab from "@/components/tabs/MetasTab";
import CustosTab from "@/components/tabs/CustosTab";
import HistoricoTab from "@/components/tabs/HistoricoTab";
import { useUserData } from "@/components/useUserData";
import { useAuth } from "@/lib/firebase/auth-context";

type TabKey = "hoje" | "metas" | "custos" | "historico";

export default function Page() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<TabKey>("hoje");
  const data = useUserData(user?.uid);

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>
          Carregando…
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginCard />;
  }

  return (
    <div className="container">
      <Header />
      <UserBar />
      <nav className="tabs">
        {(
          [
            ["hoje", "📋 Hoje"],
            ["metas", "🎯 Metas"],
            ["custos", "💸 Custos"],
            ["historico", "🗂 Histórico"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tab-btn ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "hoje" && <HojeTab uid={user.uid} data={data} />}
      {tab === "metas" && <MetasTab uid={user.uid} data={data} />}
      {tab === "custos" && <CustosTab uid={user.uid} data={data} />}
      {tab === "historico" && <HistoricoTab uid={user.uid} data={data} />}
    </div>
  );
}

function Header() {
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const s = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    setDateLabel("📆 " + s.charAt(0).toUpperCase() + s.slice(1));
  }, []);
  return (
    <header>
      <h1>📊 Controle de Lucro Diário</h1>
      <p>Mercado Livre · Múltiplos Anúncios</p>
      <div className="date-badge">{dateLabel || "📆 Carregando..."}</div>
    </header>
  );
}

function UserBar() {
  const { user, signOut } = useAuth();
  if (!user) return null;
  return (
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
  );
}

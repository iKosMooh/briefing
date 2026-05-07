"use client";

import { useMemo, useState } from "react";
import {
  computeSummary,
  fmtBRL,
  mesAtual,
  todayStr,
  totalCustosDia,
  totalCustosMes,
} from "@/lib/domain/calc";
import type { UserData } from "@/components/useUserData";
import KpiCard from "./KpiCard";
import RevenueLineChart from "./RevenueLineChart";
import ExpensesDoughnut from "./ExpensesDoughnut";
import GoalsProgressBars from "./GoalsProgressBars";
import TopAdsTable from "./TopAdsTable";
import YesterdayVsToday from "./YesterdayVsToday";

type Props = {
  data: UserData;
};

export default function Dashboard({ data }: Props) {
  const [chartWindow, setChartWindow] = useState<7 | 15 | 30>(15);

  // Today's draft summary
  const todaySummary = useMemo(
    () => computeSummary(data.draft?.ads ?? []),
    [data.draft]
  );

  const custosDia = useMemo(
    () => totalCustosDia(data.costs, todayStr()),
    [data.costs]
  );

  const custosMes = useMemo(
    () => totalCustosMes(data.costs, mesAtual()),
    [data.costs]
  );

  // Lucro Liquido Real = sum of all per-ad (retorno_unit * vendas - ads) minus daily operational cost
  const lucroLiquidoFinal = todaySummary.totalLiquido - custosDia;

  // Total revenue = faturamento from draft
  const faturamentoBruto = todaySummary.totalFaturamento;

  // Total gastos = CMV + Ads + custos do dia. `retorno` ja eh liquido por
  // unidade (preco - custo), entao taxas ML nao entram aqui.
  const totalGastos =
    todaySummary.totalCMV + todaySummary.totalAds + custosDia;

  const margemLiquida =
    faturamentoBruto > 0 ? (lucroLiquidoFinal / faturamentoBruto) * 100 : 0;

  // Goals — use active entry or legacy
  const mes = mesAtual();
  const activeGoalEntry = data.goalEntries.find((e) => e.mes === mes) ?? data.goalEntries[0] ?? null;
  const goals = activeGoalEntry
    ? {
        mes: activeGoalEntry.mes,
        meta1: activeGoalEntry.meta1,
        meta2: activeGoalEntry.meta2,
        meta3: activeGoalEntry.meta3,
        metaDiaria: activeGoalEntry.metaDiaria,
        meta2Diaria: activeGoalEntry.meta2Diaria,
        meta3Diaria: activeGoalEntry.meta3Diaria,
        label: activeGoalEntry.label,
      }
    : data.goals;

  // Doughnut nao mostra taxas ML separado pois retorno ja vem liquido.
  const taxasML = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Row 1: 4 KPI Cards ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <KpiCard
          label="Faturamento Bruto"
          value={faturamentoBruto}
          isCurrency
          colorOverride="positive"
        />
        <KpiCard
          label="Gastos Totais"
          value={totalGastos}
          isCurrency
          colorOverride="negative"
        />
        <KpiCard
          label="Lucro Liquido Real"
          value={lucroLiquidoFinal}
          isCurrency
          colorOverride={lucroLiquidoFinal >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Margem Liquida"
          value={margemLiquida}
          isPercent
          colorOverride="margin"
          percentValue={margemLiquida}
        />
      </div>

      {/* ── Row 2: Ontem vs Hoje ── */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            fontSize: ".78rem",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--muted)",
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          Ontem vs Hoje
        </div>
        <YesterdayVsToday days={data.days} todayLiquido={lucroLiquidoFinal} />
      </section>

      {/* ── Row 3: Line Chart + Top 3 Ads ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="dashboard-main-grid"
      >
        {/* Line Chart */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: ".78rem",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "var(--muted)",
                fontWeight: 700,
              }}
            >
              Faturamento & Lucro
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {([7, 15, 30] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`btn btn-xs ${chartWindow === w ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setChartWindow(w)}
                >
                  {w}d
                </button>
              ))}
            </div>
          </div>
          <RevenueLineChart days={data.days} windowDays={chartWindow} />
        </section>

        {/* Top 3 Ads */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: ".78rem",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--muted)",
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Top 3 Anuncios (lucro hoje)
          </div>
          <TopAdsTable ads={todaySummary.ads} />

          {/* Custos breakdown */}
          {custosDia > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(239,68,68,.07)",
                border: "1px solid rgba(239,68,68,.25)",
                borderRadius: 8,
                fontSize: ".78rem",
                color: "var(--red)",
              }}
            >
              Custos operacionais hoje: <strong>{fmtBRL(custosDia)}</strong>
              {custosMes > 0 && (
                <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                  | Mes: {fmtBRL(custosMes)}
                </span>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Row 4: Doughnut + Metas ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
          gap: 16,
          alignItems: "start",
        }}
        className="dashboard-bottom-grid"
      >
        {/* Expenses Doughnut */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: ".78rem",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--muted)",
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            Composicao dos Gastos (hoje)
          </div>
          <ExpensesDoughnut
            produto={todaySummary.totalCMV}
            taxasML={Math.max(taxasML, 0)}
            ads={todaySummary.totalAds}
            operacional={custosDia}
          />
        </section>

        {/* Goals progress bars */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: ".78rem",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--muted)",
              marginBottom: 14,
              fontWeight: 700,
            }}
          >
            Progresso das Metas
          </div>
          <GoalsProgressBars
            goals={goals}
            days={data.days}
            liveRevenue={faturamentoBruto}
          />
        </section>
      </div>
    </div>
  );
}

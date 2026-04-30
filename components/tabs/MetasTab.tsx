"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import {
  clamp,
  colorClass,
  computeSummary,
  diaAtualNoMes,
  diasNoMes,
  fmtBRL,
  formatMesBR,
  mesAtual,
} from "@/lib/domain/calc";
import type { Goals } from "@/lib/domain/types";
import { saveGoals } from "@/lib/firebase/data";
import type { UserData } from "@/components/useUserData";

export default function MetasTab({
  uid,
  data,
}: {
  uid: string;
  data: UserData;
}) {
  const [open, setOpen] = useState(false);

  // Live faturamento de hoje a partir do draft
  const liveFat = useMemo(() => {
    if (!data.draft?.ads) return 0;
    return computeSummary(data.draft.ads).totalFaturamento;
  }, [data.draft]);

  return (
    <>
      <div className="metas-header">
        <h2>🎯 Metas do Mês</h2>
        <button
          type="button"
          className="btn btn-purple btn-sm"
          onClick={() => setOpen(true)}
        >
          ⚙️ Configurar Metas
        </button>
      </div>
      <MetasContent goals={data.goals} days={data.days} liveFat={liveFat} />
      <ConfigMetasModal
        uid={uid}
        goals={data.goals}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function MetasContent({
  goals,
  days,
  liveFat,
}: {
  goals: Goals | null;
  days: UserData["days"];
  liveFat: number;
}) {
  if (!goals?.meta1) {
    return (
      <div className="history-empty">
        <div className="empty-icon">🎯</div>
        <p>
          Nenhuma meta configurada.
          <br />
          Clique em <strong>⚙️ Configurar Metas</strong>.
        </p>
      </div>
    );
  }
  const mes = goals.mes || mesAtual();
  const totalDias = diasNoMes(mes);
  const diaHoje = mes === mesAtual() ? diaAtualNoMes() : totalDias;
  const fatHist = days
    .filter((d) => d.date.startsWith(mes))
    .reduce((s, d) => s + d.totalFaturamento, 0);
  const faturado = fatHist + (mes === mesAtual() ? liveFat : 0);

  const projecaoFinal = diaHoje > 0 ? (faturado / diaHoje) * totalDias : 0;
  const expectedHoje = (goals.meta1 / totalDias) * diaHoje;
  const diffReais = faturado - expectedHoje;
  const diffPct = expectedHoje > 0 ? (diffReais / expectedHoje) * 100 : 0;
  const pctEsperado = (expectedHoje / goals.meta1) * 100;

  const meta1ok = faturado >= goals.meta1;
  const meta2ok = !!goals.meta2 && faturado >= goals.meta2;
  const meta3ok = !!goals.meta3 && faturado >= goals.meta3;

  const mesLabel = formatMesBR(mes);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>
          📅 {mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}
        </div>
        <div style={{ fontSize: ".85rem", color: "var(--muted)" }}>
          Faturamento acumulado:{" "}
          <strong style={{ color: "var(--text)" }}>{fmtBRL(faturado)}</strong>
        </div>
      </div>
      <div className="meta-cards-grid">
        <MetaCard
          num={1}
          alvo={goals.meta1}
          atual={faturado}
          desbloqueada={true}
          atingida={meta1ok}
          fillCls="fill-blue"
          label="Objetivo Principal"
          totalDias={totalDias}
          diaHoje={diaHoje}
          pctEsperado={pctEsperado}
          projecaoFinal={projecaoFinal}
          diffReais={diffReais}
          diffPct={diffPct}
        />
        {goals.meta2 ? (
          <MetaCard
            num={2}
            alvo={goals.meta2}
            atual={faturado}
            desbloqueada={meta1ok}
            atingida={meta2ok}
            fillCls="fill-yellow"
            label="Desbloqueada"
            totalDias={totalDias}
            diaHoje={diaHoje}
            pctEsperado={0}
            projecaoFinal={projecaoFinal}
            diffReais={diffReais}
            diffPct={diffPct}
          />
        ) : null}
        {goals.meta3 ? (
          <MetaCard
            num={3}
            alvo={goals.meta3}
            atual={faturado}
            desbloqueada={meta2ok}
            atingida={meta3ok}
            fillCls="fill-purple"
            label="Desbloqueada"
            totalDias={totalDias}
            diaHoje={diaHoje}
            pctEsperado={0}
            projecaoFinal={projecaoFinal}
            diffReais={diffReais}
            diffPct={diffPct}
          />
        ) : null}
      </div>
    </>
  );
}

function MetaCard({
  num,
  alvo,
  atual,
  desbloqueada,
  atingida,
  fillCls,
  label,
  totalDias,
  diaHoje,
  pctEsperado,
  projecaoFinal,
  diffReais,
  diffPct,
}: {
  num: 1 | 2 | 3;
  alvo: number;
  atual: number;
  desbloqueada: boolean;
  atingida: boolean;
  fillCls: string;
  label: string;
  totalDias: number;
  diaHoje: number;
  pctEsperado: number;
  projecaoFinal: number;
  diffReais: number;
  diffPct: number;
}) {
  const pct = clamp((atual / alvo) * 100, 0, 100);
  const pctExp = num === 1 ? clamp(pctEsperado, 0, 100) : 0;
  const falta = Math.max(alvo - atual, 0);
  const cor = atingida ? "fill-green" : fillCls;
  const icons = ["🥇", "🥈", "🥉"];
  const badgeCls = ["meta-badge-1", "meta-badge-2", "meta-badge-3"][num - 1];

  return (
    <div
      className={`meta-card meta-card-${num} ${desbloqueada ? "" : "locked"} ${atingida ? "achieved" : ""}`}
    >
      <div className="meta-card-top">
        <span className={`meta-badge ${badgeCls}`}>
          {icons[num - 1]} Meta {num} — {label}
        </span>
        {!desbloqueada && (
          <span className="meta-locked-badge">🔒 Bloqueada</span>
        )}
        {atingida && (
          <span className="meta-locked-badge" style={{ color: "var(--green)" }}>
            🏆 Atingida
          </span>
        )}
      </div>
      <div className="meta-valores">
        <span className={`meta-atual ${colorClass(atual)}`}>{fmtBRL(atual)}</span>
        <span className="meta-sep">/</span>
        <span className="meta-alvo">{fmtBRL(alvo)}</span>
      </div>
      {desbloqueada && (
        <>
          <div style={{ marginBottom: 4 }}>
            <div className="pbar-wrap" style={{ height: 14 }}>
              {num === 1 && !atingida && (
                <div
                  className="pbar-ghost"
                  style={{ width: `${pctExp}%` }}
                />
              )}
              <div className={`pbar-fill ${cor}`} style={{ width: `${pct}%` }} />
              <div
                className="pbar-label"
                style={{ left: `${clamp(pct, 2, 80)}%`, paddingLeft: 5 }}
              >
                {pct.toFixed(1)}%
              </div>
              {num === 1 && !atingida && pctExp > pct + 5 && (
                <div
                  className="pbar-label"
                  style={{
                    left: `${clamp(pctExp, pct + 6, 94)}%`,
                    paddingLeft: 5,
                    color: "rgba(255,255,255,.5)",
                  }}
                >
                  {pctExp.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          <div className="meta-stats">
            <div className="meta-stat">
              <div className="meta-stat-label">Faturado</div>
              <div className="meta-stat-value positive">{fmtBRL(atual)}</div>
            </div>
            <div className="meta-stat">
              <div className="meta-stat-label">Faltam</div>
              <div
                className={`meta-stat-value ${atingida ? "positive" : "negative"}`}
              >
                {atingida ? "✅ Batida!" : fmtBRL(falta)}
              </div>
            </div>
            <div className="meta-stat">
              <div className="meta-stat-label">Dias no mês</div>
              <div className="meta-stat-value">
                {diaHoje} / {totalDias}
              </div>
            </div>
            <div className="meta-stat">
              <div className="meta-stat-label">Média/dia necessária</div>
              <div className="meta-stat-value">
                {atingida
                  ? "—"
                  : fmtBRL(falta / Math.max(totalDias - diaHoje, 1))}
              </div>
            </div>
          </div>
          {!atingida && num === 1 && (
            <div
              className={`meta-projecao ${diffReais >= 0 ? "projecao-frente" : "projecao-atras"}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: ".68rem",
                    opacity: 0.7,
                    marginBottom: 2,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}
                >
                  Diferença da projeção
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                  {diffReais >= 0 ? "📈" : "📉"}{" "}
                  {diffReais >= 0 ? "+" : "−"}
                  {fmtBRL(Math.abs(diffReais))}
                </div>
                <div style={{ fontSize: ".72rem", opacity: 0.75 }}>
                  {diffReais >= 0 ? "+" : ""}
                  {diffPct.toFixed(1)}% vs esperado
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: ".68rem",
                    opacity: 0.7,
                    marginBottom: 2,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}
                >
                  Projeção de fechamento
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>
                  {fmtBRL(projecaoFinal)}
                </div>
                <div style={{ fontSize: ".72rem", opacity: 0.75 }}>
                  {projecaoFinal >= alvo ? "✅ No ritmo" : "⚠️ Abaixo da meta"}
                </div>
              </div>
            </div>
          )}
          {!atingida && num !== 1 && (
            <div
              className={`meta-projecao ${projecaoFinal >= alvo ? "projecao-frente" : "projecao-atras"}`}
            >
              Projeção de fechamento: <strong>{fmtBRL(projecaoFinal)}</strong>{" "}
              —{" "}
              {projecaoFinal >= alvo
                ? "✅ no ritmo para bater"
                : "⚠️ abaixo desta meta"}
            </div>
          )}
          {atingida && (
            <div className="meta-achieved-banner">
              🏆 Meta {num} atingida! Parabéns!
            </div>
          )}
        </>
      )}
      {!desbloqueada && (
        <div
          style={{
            textAlign: "center",
            padding: "16px 0",
            color: "var(--muted)",
            fontSize: ".85rem",
          }}
        >
          🔒 Bata a Meta {num - 1} para desbloquear
        </div>
      )}
    </div>
  );
}

function ConfigMetasModal({
  uid,
  goals,
  open,
  onClose,
}: {
  uid: string;
  goals: Goals | null;
  open: boolean;
  onClose: () => void;
}) {
  const [mes, setMes] = useState("");
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [m3, setM3] = useState("");
  const [md1, setMd1] = useState("");
  const [md2, setMd2] = useState("");
  const [md3, setMd3] = useState("");

  useEffect(() => {
    if (!open) return;
    setMes(goals?.mes || mesAtual());
    setM1(goals?.meta1 ? String(goals.meta1) : "");
    setM2(goals?.meta2 ? String(goals.meta2) : "");
    setM3(goals?.meta3 ? String(goals.meta3) : "");
    setMd1(goals?.metaDiaria ? String(goals.metaDiaria) : "");
    setMd2(goals?.meta2Diaria ? String(goals.meta2Diaria) : "");
    setMd3(goals?.meta3Diaria ? String(goals.meta3Diaria) : "");
  }, [open, goals]);

  async function onSave() {
    const v1 = parseFloat(m1) || 0;
    if (!v1) {
      alert("Informe pelo menos a Meta 1.");
      return;
    }
    await saveGoals(uid, {
      mes: mes || mesAtual(),
      meta1: v1,
      meta2: parseFloat(m2) || null,
      meta3: parseFloat(m3) || null,
      metaDiaria: parseFloat(md1) || null,
      meta2Diaria: parseFloat(md2) || null,
      meta3Diaria: parseFloat(md3) || null,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-icon">🎯</div>
      <div className="modal-title">Configurar Metas</div>
      <p className="modal-sub">
        {goals?.mes ? `Configurando: ${formatMesBR(goals.mes)}` : "Nenhuma meta configurada ainda"}
      </p>
      <div className="config-section-title">📅 Mês de Referência</div>
      <div className="config-field">
        <label>Mês / Ano</label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </div>
      <hr className="config-sep" />
      <div className="config-section-title">🎯 Metas Mensais de Faturamento</div>
      <div className="config-field">
        <label>🥇 Meta 1 — Objetivo Principal (R$)</label>
        <input
          type="number"
          min="0"
          step="100"
          placeholder="Ex: 15000"
          value={m1}
          onChange={(e) => setM1(e.target.value)}
        />
      </div>
      <div className="config-field">
        <label>🥈 Meta 2 — Desbloqueada ao bater Meta 1 (R$)</label>
        <input
          type="number"
          min="0"
          step="100"
          placeholder="Ex: 20000"
          value={m2}
          onChange={(e) => setM2(e.target.value)}
        />
        <div className="hint">Opcional</div>
      </div>
      <div className="config-field">
        <label>🥉 Meta 3 — Desbloqueada ao bater Meta 2 (R$)</label>
        <input
          type="number"
          min="0"
          step="100"
          placeholder="Ex: 25000"
          value={m3}
          onChange={(e) => setM3(e.target.value)}
        />
        <div className="hint">Opcional</div>
      </div>
      <hr className="config-sep" />
      <div className="config-section-title">📆 Metas Diárias de Faturamento</div>
      <div className="config-field">
        <label>🥇 Meta Diária 1 — Objetivo (R$)</label>
        <input
          type="number"
          min="0"
          step="10"
          placeholder="Ex: 500"
          value={md1}
          onChange={(e) => setMd1(e.target.value)}
        />
      </div>
      <div className="config-field">
        <label>🥈 Meta Diária 2 — Bônus (R$)</label>
        <input
          type="number"
          min="0"
          step="10"
          placeholder="Ex: 700"
          value={md2}
          onChange={(e) => setMd2(e.target.value)}
        />
        <div className="hint">Opcional</div>
      </div>
      <div className="config-field">
        <label>🥉 Meta Diária 3 — Super Bônus (R$)</label>
        <input
          type="number"
          min="0"
          step="10"
          placeholder="Ex: 1000"
          value={md3}
          onChange={(e) => setMd3(e.target.value)}
        />
        <div className="hint">Opcional</div>
      </div>
      <div className="modal-btns">
        <button type="button" className="btn btn-success" onClick={onSave}>
          💾 Salvar Metas
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          ✕ Cancelar
        </button>
      </div>
    </Modal>
  );
}

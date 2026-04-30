"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  archiveDay,
  clearDraft,
  saveDraft,
} from "@/lib/firebase/data";
import {
  colorClass,
  computeAd,
  computeSummary,
  emptyListing,
  fmtBRL,
  formatDateBR,
  todayStr,
  totalCustosDia,
} from "@/lib/domain/calc";
import type { Listing } from "@/lib/domain/types";
import MetaDiaria from "@/components/MetaDiaria";
import Modal from "@/components/Modal";
import type { UserData } from "@/components/useUserData";

const DEFAULT_AD: Listing = {
  name: "Tênis Nike Preto",
  preco: "78.00",
  retorno: "59.00",
  custo: "54.00",
  vendas: "10",
  ads: "12.00",
};

export default function HojeTab({
  uid,
  data,
}: {
  uid: string;
  data: UserData;
}) {
  const [ads, setAds] = useState<Listing[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showOntem, setShowOntem] = useState(false);
  const [ontemDate, setOntemDate] = useState<string | null>(null);
  const [showFechar, setShowFechar] = useState(false);
  const [fecharDate, setFecharDate] = useState(todayStr());
  const lastSavedRef = useRef<string>("");

  // Hydrate from Firestore draft on first load
  useEffect(() => {
    if (!data.ready || hydrated) return;
    if (data.draft && data.draft.ads?.length) {
      setAds(data.draft.ads);
      if (data.draft.date && data.draft.date !== todayStr()) {
        setOntemDate(data.draft.date);
        setShowOntem(true);
      }
    } else {
      setAds([{ ...DEFAULT_AD }]);
    }
    setHydrated(true);
  }, [data.ready, data.draft, hydrated]);

  // Auto-save draft (debounced via signature)
  useEffect(() => {
    if (!hydrated) return;
    const sig = JSON.stringify(ads);
    if (sig === lastSavedRef.current) return;
    lastSavedRef.current = sig;
    const handle = setTimeout(() => {
      saveDraft(uid, { date: todayStr(), ads }).catch(() => {});
    }, 350);
    return () => clearTimeout(handle);
  }, [ads, hydrated, uid]);

  const summary = useMemo(() => computeSummary(ads), [ads]);
  const custosDia = useMemo(
    () => totalCustosDia(data.costs, todayStr()),
    [data.costs],
  );
  const lLiqFinal = summary.totalLiquido - custosDia;
  const margemFinal =
    summary.totalFaturamento > 0
      ? (lLiqFinal / summary.totalFaturamento) * 100
      : 0;

  function updateAd(idx: number, patch: Partial<Listing>) {
    setAds((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function addAd() {
    setAds((prev) => [...prev, emptyListing()]);
  }
  function removeAd(idx: number) {
    setAds((prev) => prev.filter((_, i) => i !== idx));
  }

  function onCalculate() {
    if (!ads.length) {
      alert("Adicione pelo menos um anúncio.");
      return;
    }
    setShowResults(true);
    setTimeout(() => {
      document
        .getElementById("results-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function onClearAll() {
    if (!confirm("Apagar dados de hoje? O histórico é mantido.")) return;
    setAds([{ ...DEFAULT_AD }]);
    setShowResults(false);
    clearDraft(uid).catch(() => {});
  }

  async function onArchiveOntem() {
    if (!data.draft) {
      setShowOntem(false);
      return;
    }
    const day = computeSummary(data.draft.ads || []);
    await archiveDay(uid, {
      date: data.draft.date,
      ...day,
      raw: data.draft.ads || [],
    });
    await clearDraft(uid);
    setAds([{ ...DEFAULT_AD }]);
    setShowResults(false);
    setShowOntem(false);
    setOntemDate(null);
  }

  function onKeepOntem() {
    setShowOntem(false);
    setOntemDate(null);
  }

  async function onConfirmarFechar() {
    if (!fecharDate) {
      alert("Selecione uma data.");
      return;
    }
    if (!ads.length) {
      alert("Sem dados para arquivar.");
      return;
    }
    const exists = data.days.some((d) => d.date === fecharDate);
    if (
      exists &&
      !confirm(
        `Já existe um registro para ${formatDateBR(fecharDate)}. Deseja substituir?`,
      )
    ) {
      return;
    }
    const s = computeSummary(ads);
    await archiveDay(uid, { date: fecharDate, ...s, raw: ads });
    await clearDraft(uid);
    setAds([{ ...DEFAULT_AD }]);
    setShowResults(false);
    setShowFechar(false);
  }

  return (
    <>
      <MetaDiaria goals={data.goals} fat={summary.totalFaturamento} />

      <div className="top-actions">
        <div className="left-btns">
          <button type="button" className="btn btn-primary" onClick={addAd}>
            ＋ Adicionar Anúncio
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={onCalculate}
          >
            ⚡ Calcular Tudo
          </button>
        </div>
        <button
          type="button"
          className="btn btn-warning"
          onClick={() => {
            if (!ads.length) {
              alert("Adicione pelo menos um anúncio antes de fechar o dia.");
              return;
            }
            setFecharDate(todayStr());
            setShowFechar(true);
          }}
        >
          📁 Fechar o Dia
        </button>
        <button type="button" className="btn btn-danger" onClick={onClearAll}>
          🗑 Limpar Tudo
        </button>
      </div>

      <div>
        {ads.map((a, idx) => (
          <AdCard
            key={idx}
            num={idx + 1}
            ad={a}
            onChange={(p) => updateAd(idx, p)}
            onRemove={() => removeAd(idx)}
          />
        ))}
      </div>

      {showResults && (
        <section id="results-section" className="results-section">
          <h2>📊 Resultado por Anúncio</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Faturamento</th>
                  <th>CMV</th>
                  <th>L. Bruto</th>
                  <th>Ads</th>
                  <th>L. Líquido</th>
                  <th>Margem</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((raw, i) => {
                  const r = computeAd(raw);
                  const roasTxt =
                    r.roas !== null ? `${r.roas.toFixed(2)}x` : "—";
                  const roasCls =
                    r.roas !== null
                      ? r.roas >= 1
                        ? "positive"
                        : "negative"
                      : "neutral";
                  return (
                    <tr key={i}>
                      <td className="td-name">{r.name}</td>
                      <td className="positive">{fmtBRL(r.faturamento)}</td>
                      <td className="negative">{fmtBRL(r.cmv)}</td>
                      <td className={colorClass(r.bruto)}>{fmtBRL(r.bruto)}</td>
                      <td className="negative">{fmtBRL(r.ads)}</td>
                      <td className={colorClass(r.liquido)}>
                        {fmtBRL(r.liquido)}
                      </td>
                      <td
                        className={
                          r.margem >= 10
                            ? "positive"
                            : r.margem > 0
                              ? "neutral"
                              : "negative"
                        }
                      >
                        {r.margem.toFixed(1)}%
                      </td>
                      <td className={roasCls}>{roasTxt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {custosDia > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "rgba(239,68,68,.07)",
                border: "1px solid rgba(239,68,68,.25)",
                borderRadius: 10,
                fontSize: ".85rem",
                color: "#ef4444",
              }}
            >
              💸 <strong>Custos Operacionais do Dia:</strong>{" "}
              {data.costs
                .filter(
                  (c) =>
                    c.freq === "diario" ||
                    (c.freq === "avulso" && c.data === todayStr()),
                )
                .map((c) => `${c.nome}: ${fmtBRL(parseFloat(c.valor) || 0)}`)
                .join(" · ")}{" "}
              &nbsp;→&nbsp; <strong>Total: −{fmtBRL(custosDia)}</strong>
            </div>
          )}

          <div className="summary-grid">
            <div className="summary-card card-receita">
              <div className="card-label">💵 Faturamento Total</div>
              <div className="card-value positive">
                {fmtBRL(summary.totalFaturamento)}
              </div>
              <div className="card-sub">CMV: {fmtBRL(summary.totalCMV)}</div>
            </div>
            <div className="summary-card card-bruto">
              <div className="card-label">💼 Lucro Bruto</div>
              <div className={`card-value ${colorClass(summary.totalBruto)}`}>
                {fmtBRL(summary.totalBruto)}
              </div>
              <div className="card-sub">Antes dos Ads</div>
            </div>
            <div className="summary-card card-liquido">
              <div className="card-label">✅ Lucro Líquido</div>
              <div className={`card-value ${colorClass(lLiqFinal)}`}>
                {fmtBRL(lLiqFinal)}
              </div>
              <div className="card-sub">
                Margem: {margemFinal.toFixed(1)}%
                {custosDia > 0 ? ` · Custos op: −${fmtBRL(custosDia)}` : ""}
              </div>
            </div>
            <div className="summary-card card-roas">
              <div className="card-label">📢 ROAS Total</div>
              <div
                className={`card-value ${
                  summary.totalRoas !== null
                    ? summary.totalRoas >= 1
                      ? "positive"
                      : "negative"
                    : "neutral"
                }`}
              >
                {summary.totalRoas !== null
                  ? `${summary.totalRoas.toFixed(2)}x`
                  : "—"}
              </div>
              <div className="card-sub">Faturamento ÷ Ads</div>
            </div>
          </div>
        </section>
      )}

      <Modal open={showOntem} onClose={onKeepOntem}>
        <div className="modal-icon">📅</div>
        <div className="modal-title">Dados de ontem detectados</div>
        <p className="modal-sub">
          Os dados são de{" "}
          <strong>{ontemDate ? formatDateBR(ontemDate) : ""}</strong>. Deseja
          arquivar no histórico e começar hoje?
        </p>
        <div className="modal-btns">
          <button
            type="button"
            className="btn btn-success"
            onClick={onArchiveOntem}
          >
            ✅ Arquivar e limpar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onKeepOntem}
          >
            📂 Manter
          </button>
        </div>
      </Modal>

      <Modal open={showFechar} onClose={() => setShowFechar(false)}>
        <div className="modal-icon">📁</div>
        <div className="modal-title">Fechar o Dia</div>
        <p className="modal-sub">
          Arquiva os dados atuais no histórico para a data escolhida.
        </p>
        <div className="config-field">
          <label>📅 Data do dia</label>
          <input
            type="date"
            value={fecharDate}
            onChange={(e) => setFecharDate(e.target.value)}
          />
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: ".82rem",
            color: "var(--muted)",
          }}
        >
          {fecharDate ? (
            <>
              Arquivar: <strong>{formatDateBR(fecharDate)}</strong> ·
              Faturamento:{" "}
              <strong>{fmtBRL(summary.totalFaturamento)}</strong> · L.Líquido:{" "}
              <strong>{fmtBRL(summary.totalLiquido)}</strong>
            </>
          ) : null}
        </div>
        <div className="modal-btns">
          <button
            type="button"
            className="btn btn-success"
            onClick={onConfirmarFechar}
          >
            ✅ Arquivar e Limpar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowFechar(false)}
          >
            ✕ Cancelar
          </button>
        </div>
      </Modal>
    </>
  );
}

function AdCard({
  num,
  ad,
  onChange,
  onRemove,
}: {
  num: number;
  ad: Listing;
  onChange: (p: Partial<Listing>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <span className="ad-number">{num}</span>
        <input
          className="ad-title-input"
          type="text"
          placeholder="Nome do anúncio"
          value={ad.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onRemove}
        >
          ✕ Remover
        </button>
      </div>
      <div className="fields-grid">
        <Field
          label="🏷️ Preço de venda (R$)"
          value={ad.preco}
          onChange={(v) => onChange({ preco: v })}
        />
        <Field
          label="📥 Retorno líquido/unidade (R$)"
          value={ad.retorno}
          onChange={(v) => onChange({ retorno: v })}
        />
        <Field
          label="💰 Custo/unidade (R$)"
          value={ad.custo}
          onChange={(v) => onChange({ custo: v })}
        />
        <Field
          label="🛒 Nº de vendas"
          value={ad.vendas}
          onChange={(v) => onChange({ vendas: v })}
          step="1"
        />
        <Field
          label="📢 Gasto com Ads (R$)"
          value={ad.ads}
          onChange={(v) => onChange({ ads: v })}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="field-group">
      <label>{label}</label>
      <input
        type="number"
        min="0"
        step={step ?? "0.01"}
        placeholder="0,00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

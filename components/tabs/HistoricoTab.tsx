"use client";

import { useEffect, useRef, useState } from "react";
import {
  colorClass,
  computeSummary,
  emptyListing,
  fmtBRL,
  formatDateBR,
  formatDateLong,
} from "@/lib/domain/calc";
import type { ArchivedDay, Listing } from "@/lib/domain/types";
import { archiveDay, deleteDay } from "@/lib/firebase/data";
import Modal from "@/components/Modal";
import type { UserData } from "@/components/useUserData";

export default function HistoricoTab({
  uid,
  data,
}: {
  uid: string;
  data: UserData;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  if (data.days.length === 0) {
    return (
      <>
        <div className="history-header">
          <h2>🗂 Histórico de Dias</h2>
        </div>
        <div className="history-empty">
          <div className="empty-icon">📭</div>
          <p>Nenhum dia arquivado ainda.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Chart days={data.days} />
      <div className="history-header">
        <h2>🗂 Histórico de Dias</h2>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => {
            if (!confirm("Apagar TODO o histórico?")) return;
            data.days.forEach((d) =>
              deleteDay(uid, d.date).catch(() => {}),
            );
          }}
        >
          🗑 Limpar Histórico
        </button>
      </div>
      <div>
        {data.days.map((day, idx) => (
          <DayCard
            key={day.date}
            day={day}
            open={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
            onEdit={() => setEditIdx(idx)}
            onDelete={() => {
              if (!confirm("Remover este dia?")) return;
              deleteDay(uid, day.date).catch(() => {});
            }}
          />
        ))}
      </div>
      {editIdx !== null && data.days[editIdx] && (
        <EditModal
          uid={uid}
          day={data.days[editIdx]}
          onClose={() => setEditIdx(null)}
        />
      )}
    </>
  );
}

function DayCard({
  day,
  open,
  onToggle,
  onEdit,
  onDelete,
}: {
  day: ArchivedDay;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`history-day ${open ? "open" : ""}`}>
      <div
        className="history-day-header"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onToggle();
        }}
        role="button"
        tabIndex={0}
      >
        <div className="history-day-date">
          <span>📅</span>
          <span>{formatDateLong(day.date)}</span>
        </div>
        <div className="history-day-pills">
          <span className="pill pill-green">
            💵 {fmtBRL(day.totalFaturamento || 0)}
          </span>
          <span
            className={`pill ${day.totalLiquido >= 0 ? "pill-green" : "pill-red"}`}
          >
            ✅ {fmtBRL(day.totalLiquido)}
          </span>
          {day.totalRoas !== null ? (
            <span className="pill pill-yellow">
              📢 {day.totalRoas.toFixed(2)}x
            </span>
          ) : (
            <span className="pill">📢 —</span>
          )}
          <span className="pill">{(day.ads || []).length} anúncios</span>
        </div>
        <div className="history-day-actions">
          <button
            type="button"
            className="btn btn-warning btn-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            ✏️ Editar
          </button>
          <button
            type="button"
            className="btn btn-danger btn-xs"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑
          </button>
          <span className="chevron">▼</span>
        </div>
      </div>
      {open && (
        <div className="history-day-body">
          <div className="table-wrapper" style={{ marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Faturamento</th>
                  <th>CMV</th>
                  <th>L.Bruto</th>
                  <th>Ads</th>
                  <th>L.Líquido</th>
                  <th>Margem</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {(day.ads || []).map((a, i) => (
                  <tr key={i}>
                    <td className="td-name">{a.name}</td>
                    <td className="positive">{fmtBRL(a.faturamento || 0)}</td>
                    <td className="negative">{fmtBRL(a.cmv || 0)}</td>
                    <td className={colorClass(a.bruto)}>{fmtBRL(a.bruto)}</td>
                    <td className="negative">{fmtBRL(a.ads)}</td>
                    <td className={colorClass(a.liquido)}>
                      {fmtBRL(a.liquido)}
                    </td>
                    <td
                      className={
                        (a.margem || 0) >= 10
                          ? "positive"
                          : (a.margem || 0) > 0
                            ? "neutral"
                            : "negative"
                      }
                    >
                      {(a.margem || 0).toFixed(1)}%
                    </td>
                    <td
                      className={
                        a.roas !== null
                          ? a.roas >= 1
                            ? "positive"
                            : "negative"
                          : "neutral"
                      }
                    >
                      {a.roas !== null ? `${a.roas.toFixed(2)}x` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="summary-grid" style={{ marginTop: 0 }}>
            <div className="summary-card card-receita">
              <div className="card-label">💵 Faturamento</div>
              <div className="card-value positive">
                {fmtBRL(day.totalFaturamento || 0)}
              </div>
            </div>
            <div className="summary-card card-bruto">
              <div className="card-label">💼 L.Bruto</div>
              <div className={`card-value ${colorClass(day.totalBruto)}`}>
                {fmtBRL(day.totalBruto)}
              </div>
            </div>
            <div className="summary-card card-liquido">
              <div className="card-label">✅ L.Líquido</div>
              <div className={`card-value ${colorClass(day.totalLiquido)}`}>
                {fmtBRL(day.totalLiquido)}
              </div>
              <div className="card-sub">
                Margem: {(day.totalMargem || 0).toFixed(1)}%
              </div>
            </div>
            <div className="summary-card card-roas">
              <div className="card-label">📢 ROAS</div>
              <div
                className={`card-value ${
                  day.totalRoas !== null
                    ? day.totalRoas >= 1
                      ? "positive"
                      : "negative"
                    : "neutral"
                }`}
              >
                {day.totalRoas !== null ? `${day.totalRoas.toFixed(2)}x` : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditModal({
  uid,
  day,
  onClose,
}: {
  uid: string;
  day: ArchivedDay;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Listing[]>(() =>
    day.raw && day.raw.length
      ? day.raw.map((a) => ({ ...a }))
      : (day.ads || []).map((a) => ({
          name: a.name || "",
          preco: "",
          retorno: "",
          custo: "",
          vendas: "",
          ads: "",
        })),
  );

  function update(i: number, p: Partial<Listing>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }

  async function onSave() {
    if (!items.length) {
      alert("Adicione pelo menos um anúncio.");
      return;
    }
    const s = computeSummary(items);
    await archiveDay(uid, { date: day.date, ...s, raw: items });
    onClose();
  }

  return (
    <Modal open onClose={onClose} wide>
      <div className="modal-icon">✏️</div>
      <div className="modal-title">Editar dia do histórico</div>
      <p className="modal-sub">📅 {formatDateLong(day.date)}</p>
      <div>
        {items.map((a, i) => (
          <div key={i} className="edit-ad-card">
            <div className="edit-ad-title">
              <span>📦 Anúncio {i + 1}</span>
              <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={() =>
                  setItems((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                ✕
              </button>
            </div>
            <input
              className="edit-name-input"
              type="text"
              placeholder="Nome"
              value={a.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <div className="edit-fields">
              <EditField
                label="🏷️ Preço venda"
                value={a.preco}
                onChange={(v) => update(i, { preco: v })}
              />
              <EditField
                label="📥 Retorno líq."
                value={a.retorno}
                onChange={(v) => update(i, { retorno: v })}
              />
              <EditField
                label="💰 Custo"
                value={a.custo}
                onChange={(v) => update(i, { custo: v })}
              />
              <EditField
                label="🛒 Vendas"
                value={a.vendas}
                onChange={(v) => update(i, { vendas: v })}
                step="1"
              />
              <EditField
                label="📢 Ads"
                value={a.ads}
                onChange={(v) => update(i, { ads: v })}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          borderTop: "1px solid var(--border)",
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setItems((prev) => [...prev, emptyListing()])}
        >
          ＋ Adicionar anúncio
        </button>
      </div>
      <div className="modal-btns">
        <button type="button" className="btn btn-success" onClick={onSave}>
          💾 Salvar alterações
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          ✕ Cancelar
        </button>
      </div>
    </Modal>
  );
}

function EditField({
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
    <div className="edit-field">
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

function Chart({ days }: { days: ArchivedDay[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth || 800;
    const H = 220;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const dataAsc = [...days].reverse();
    const labels = dataAsc.map((d) => formatDateBR(d.date));
    const values = dataAsc.map((d) => d.totalFaturamento || 0);
    if (!values.length) return;
    const PAD = { top: 20, right: 20, bottom: 40, left: 82 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 0);
    const range = maxV - minV || 1;
    const xStep = values.length > 1 ? cW / (values.length - 1) : cW / 2;
    const xPos = (i: number) =>
      PAD.left + (values.length > 1 ? i * xStep : cW / 2);
    const yPos = (v: number) => PAD.top + cH - ((v - minV) / range) * cH;

    ctx.strokeStyle = "#2e3350";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = PAD.top + (cH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + cW, y);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Segoe UI,sans-serif";
      ctx.textAlign = "right";
      const v = maxV - (range / 4) * g;
      ctx.fillText(
        `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        PAD.left - 6,
        y + 4,
      );
    }

    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + cH);
    grad.addColorStop(0, "rgba(79,142,247,.3)");
    grad.addColorStop(1, "rgba(79,142,247,.02)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(values[0]));
    for (let i = 1; i < values.length; i++) ctx.lineTo(xPos(i), yPos(values[i]));
    ctx.lineTo(xPos(values.length - 1), PAD.top + cH);
    ctx.lineTo(xPos(0), PAD.top + cH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#4f8ef7";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(values[0]));
    for (let i = 1; i < values.length; i++) ctx.lineTo(xPos(i), yPos(values[i]));
    ctx.stroke();

    values.forEach((v, i) => {
      const x = xPos(i),
        y = yPos(v);
      ctx.fillStyle = "#4f8ef7";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "10px Segoe UI,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x, H - PAD.bottom + 18);
    });
  }, [days]);

  return (
    <div className="chart-section">
      <h3>📈 Evolução do Faturamento</h3>
      <div className="chart-canvas-wrap">
        <canvas ref={ref} className="chart-canvas" />
      </div>
    </div>
  );
}

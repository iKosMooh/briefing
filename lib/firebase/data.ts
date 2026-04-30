"use client";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import type {
  ArchivedDay,
  Cost,
  DraftToday,
  Goals,
} from "@/lib/domain/types";
import { getFirebase } from "./client";

function userPath(uid: string) {
  return `usuarios/${uid}`;
}

// ── Draft (Hoje) ──────────────────────────────────────────────
export function draftRef(uid: string) {
  const { db } = getFirebase();
  return doc(db, `${userPath(uid)}/rascunho/hoje`);
}
export async function saveDraft(uid: string, draft: DraftToday) {
  await setDoc(draftRef(uid), { ...draft, updatedAt: Date.now() });
}
export async function clearDraft(uid: string) {
  await deleteDoc(draftRef(uid));
}
export function watchDraft(
  uid: string,
  cb: (d: DraftToday | null) => void,
): () => void {
  return onSnapshot(draftRef(uid), (snap) => {
    cb(snap.exists() ? (snap.data() as DraftToday) : null);
  });
}

// ── Archived days ─────────────────────────────────────────────
export function dayRef(uid: string, date: string) {
  const { db } = getFirebase();
  return doc(db, `${userPath(uid)}/dias/${date}`);
}
export function daysCol(uid: string) {
  const { db } = getFirebase();
  return collection(db, `${userPath(uid)}/dias`);
}
export async function archiveDay(uid: string, day: ArchivedDay) {
  await setDoc(dayRef(uid, day.date), day);
}
export async function deleteDay(uid: string, date: string) {
  await deleteDoc(dayRef(uid, date));
}
export function watchDays(
  uid: string,
  cb: (days: ArchivedDay[]) => void,
): () => void {
  const q = query(daysCol(uid), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as ArchivedDay));
  });
}

// ── Goals ─────────────────────────────────────────────────────
export function goalsRef(uid: string) {
  const { db } = getFirebase();
  return doc(db, `${userPath(uid)}/metas/config`);
}
export async function saveGoals(uid: string, g: Goals) {
  await setDoc(goalsRef(uid), g);
}
export function watchGoals(
  uid: string,
  cb: (g: Goals | null) => void,
): () => void {
  return onSnapshot(goalsRef(uid), (snap) => {
    cb(snap.exists() ? (snap.data() as Goals) : null);
  });
}

// ── Costs ─────────────────────────────────────────────────────
export function costsCol(uid: string) {
  const { db } = getFirebase();
  return collection(db, `${userPath(uid)}/custos`);
}
export async function upsertCost(uid: string, cost: Cost) {
  const { db } = getFirebase();
  await setDoc(doc(db, `${userPath(uid)}/custos/${cost.id}`), cost);
}
export async function deleteCost(uid: string, id: string) {
  const { db } = getFirebase();
  await deleteDoc(doc(db, `${userPath(uid)}/custos/${id}`));
}
export function watchCosts(
  uid: string,
  cb: (costs: Cost[]) => void,
): () => void {
  return onSnapshot(costsCol(uid), (snap) => {
    cb(snap.docs.map((d) => d.data() as Cost));
  });
}

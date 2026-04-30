"use client";

import { useEffect, useState } from "react";
import {
  watchCosts,
  watchDays,
  watchDraft,
  watchGoals,
} from "@/lib/firebase/data";
import type {
  ArchivedDay,
  Cost,
  DraftToday,
  Goals,
} from "@/lib/domain/types";

export type UserData = {
  draft: DraftToday | null;
  days: ArchivedDay[];
  goals: Goals | null;
  costs: Cost[];
  ready: boolean;
};

export function useUserData(uid: string | undefined): UserData {
  const [draft, setDraft] = useState<DraftToday | null>(null);
  const [days, setDays] = useState<ArchivedDay[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setDraft(null);
      setDays([]);
      setGoals(null);
      setCosts([]);
      setReady(false);
      return;
    }
    let loaded = 0;
    const markReady = () => {
      loaded += 1;
      if (loaded >= 4) setReady(true);
    };
    let firstDraft = true,
      firstDays = true,
      firstGoals = true,
      firstCosts = true;

    const unsubDraft = watchDraft(uid, (d) => {
      setDraft(d);
      if (firstDraft) {
        firstDraft = false;
        markReady();
      }
    });
    const unsubDays = watchDays(uid, (ds) => {
      setDays(ds);
      if (firstDays) {
        firstDays = false;
        markReady();
      }
    });
    const unsubGoals = watchGoals(uid, (g) => {
      setGoals(g);
      if (firstGoals) {
        firstGoals = false;
        markReady();
      }
    });
    const unsubCosts = watchCosts(uid, (c) => {
      setCosts(c);
      if (firstCosts) {
        firstCosts = false;
        markReady();
      }
    });

    return () => {
      unsubDraft();
      unsubDays();
      unsubGoals();
      unsubCosts();
    };
  }, [uid]);

  return { draft, days, goals, costs, ready };
}

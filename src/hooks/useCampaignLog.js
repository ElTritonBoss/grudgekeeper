import { useEffect, useRef, useState } from "react";
import { parseCampaignLog } from "../utils/campaignLog";

const POLL_MS = 4000;

// Watches the campaign logs written by the logger mod. Picks `campaignId` if
// given, otherwise the most recently played campaign, and re-reads it while it
// changes (i.e. while the game is running).
export function useCampaignLog(campaignId) {
    const [campaigns, setCampaigns] = useState([]);
    const [log, setLog] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | none | ready | unavailable
    const lastRead = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function poll() {
            try {
                const res = await fetch("/local/campaign-logs", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const list = await res.json();
                if (cancelled) return;
                setCampaigns(list);
                const pick = list.find((c) => c.id === campaignId) ?? (campaignId ? null : list[0]);
                if (!pick) { setLog(null); setStatus("none"); lastRead.current = null; return; }
                const stamp = `${pick.id}:${pick.modified}:${pick.size}`;
                if (lastRead.current === stamp) return;
                const text = await fetch(`/local/campaign-logs/${encodeURIComponent(pick.id)}`, { cache: "no-store" }).then((r) => r.text());
                if (cancelled) return;
                lastRead.current = stamp;
                setLog({ ...parseCampaignLog(text), modified: pick.modified });
                setStatus("ready");
            } catch (_) {
                if (!cancelled) setStatus("unavailable");
            }
        }

        poll();
        const timer = setInterval(poll, POLL_MS);
        return () => { cancelled = true; clearInterval(timer); };
    }, [campaignId]);

    return { log, campaigns, status };
}

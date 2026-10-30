import { useState, useEffect, useMemo } from "react";
import "./App.css";

// Internet / API na chale to ye saved (approx) rates use hote hain
const FALLBACK = { USD: 1, PKR: 280, EUR: 0.86, GBP: 0.75, AED: 3.6725, SAR: 3.75, INR: 88, JPY: 150, CAD: 1.38, AUD: 1.53, CNY: 7.1, CHF: 0.8, TRY: 42 };
const QUICK = ["USD", "EUR", "GBP", "AED", "SAR", "PKR", "INR"];

async function getJson(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Live rates: pehle main API, fail ho to backup API
async function loadRates() {
  try {
    const d = await getJson("https://open.er-api.com/v6/latest/USD");
    if (d.result !== "success") throw new Error("bad response");
    return { rates: d.rates, updated: d.time_last_update_utc, live: true };
  } catch {
    const d = await getJson("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
    const rates = {};
    Object.entries(d.usd).forEach(([k, v]) => (rates[k.toUpperCase()] = v));
    return { rates, updated: d.date, live: true };
  }
}

const money = (n, c) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2) + " " + c;
  }
};

export default function App() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("PKR");
  const [data, setData] = useState({ rates: FALLBACK, updated: null, live: false });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0); // refresh button ke liye

  useEffect(() => {
    setLoading(true);
    loadRates()
      .then(setData)
      .catch(() => setData((d) => ({ ...d, live: false })))
      .finally(() => setLoading(false));
  }, [tick]);

  const { rates } = data;

  const codes = useMemo(() => {
    let valid = null;
    try { valid = new Set(Intl.supportedValuesOf("currency")); } catch {}
    return Object.keys(rates).filter((c) => !valid || valid.has(c)).sort();
  }, [rates]);

  const names = useMemo(() => {
    let dn = null;
    try { dn = new Intl.DisplayNames(["en"], { type: "currency" }); } catch {}
    const m = {};
    codes.forEach((c) => { try { m[c] = dn ? dn.of(c) : c; } catch { m[c] = c; } });
    return m;
  }, [codes]);

  const value = parseFloat(amount) || 0;
  const rate = rates[to] / rates[from];
  const result = value * rate;
  const when = data.updated && !isNaN(new Date(data.updated)) ? new Date(data.updated).toLocaleString() : data.updated;

  const swap = () => { setFrom(to); setTo(from); };

  const Select = ({ val, set }) => (
    <select value={val} onChange={(e) => set(e.target.value)}>
      {codes.map((c) => <option key={c} value={c}>{c} - {names[c]}</option>)}
    </select>
  );

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Currency Converter</h1>
          <p className="sub">Live exchange rates, {codes.length} currencies</p>
        </div>
        <div className={"pill " + (data.live ? "live" : "off")}>
          <span className="dot" />
          {loading ? "Updating..." : data.live ? "Live rates" : "Saved rates (offline)"}
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <label>Amount</label>
          <input className="amount" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" />

          <div className="pair">
            <div><label>From</label><Select val={from} set={setFrom} /></div>
            <button className="swap" onClick={swap} aria-label="Swap currencies">&#8644;</button>
            <div><label>To</label><Select val={to} set={setTo} /></div>
          </div>

          <div className="result">
            <span className="small">{money(value, from)} =</span>
            <strong>{money(result, to)}</strong>
            <span className="small">1 {from} = {rate.toLocaleString("en-US", { maximumSignificantDigits: 6 })} {to}</span>
          </div>

          <div className="foot">
            <span>{when ? "Updated: " + when : "Approximate rates"}</span>
            <button className="refresh" onClick={() => setTick((t) => t + 1)} disabled={loading}>
              {loading ? "Loading..." : "Refresh rates"}
            </button>
          </div>
        </section>

        <aside className="card">
          <h2>{money(value, from)} in other currencies</h2>
          <ul className="list">
            {QUICK.filter((c) => c !== from && rates[c]).map((c) => (
              <li key={c} onClick={() => setTo(c)}>
                <b>{c}</b>
                <span>{names[c]}</span>
                <em>{money((value * rates[c]) / rates[from], c)}</em>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}

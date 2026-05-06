"use client";



import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart, Area, CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts";
import { CSSProperties } from "react";

// --- Sub-Komponen StatCard ---
const StatCard = ({ title, value, color = "#111" }: { title: string, value: string, color?: string }) => (
  <div style={{
  background: "#fff",
      padding: "16px 20px",
      borderRadius: "12px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "180px",
      flex: 1
    }}>
      <span style={{ 
        fontSize: "11px", 
        fontWeight: "600", 
        color: "#64748b", 
        textTransform: "uppercase",
        letterSpacing: "0.05em" 
      }}>
        {title}
      </span>
      <div style={{ 
        fontSize: "12px", 
        fontWeight: "700", 
        color: color 
      }}>
        {value}
      </div>
    </div>
  );

// --- Sub-Komponen FilterSelect ---
const FilterSelect = ({ label, value, options, onChange }: any) => (
  <div style={{ flex: 1 }}>
    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>{label}</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
    >
      <option value="All">All {label}</option>
      {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary"); 
  const [tahun, setTahun] = useState("2026");
  const [jenisDana, setJenisDana] = useState("1. Regular");
  const [selectedBulan, setSelectedBulan] = useState<string[]>([]);
  const [showBulan, setShowBulan] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUMModal, setShowUMModal] = useState(false);
  const [expandedDD, setExpandedDD] = useState<string | null>(null);
  const [expandedProg, setExpandedProg] = useState<string | null>(null);
  const [expandedDiv, setExpandedDiv] = useState<string | null>(null);
  const [isPrint, setIsPrint] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    fetch("/api/sheets")
      .then(res => res.json())
      .then(res => {
        setData(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const [printKey, setPrintKey] = useState(0);

  useEffect(() => {
  const beforePrint = () => {
      setIsPrint(true);
      setPrintKey(prev => prev + 1);

      setTimeout(() => {
        window.dispatchEvent(new Event("resize")); // 🔥 penting banget
      }, 100);
    };

    const afterPrint = () => {
      setIsPrint(false);

      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 300);
    };

    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  const parse = (v: any) => {
    if (!v) return 0;
    const clean = String(v).replace(/\./g, "").replace(/,/g, ".");
    return Number(clean) || 0;
  };

  const format = (n: number) => "Rp " + Math.floor(n).toLocaleString("id-ID");
  const getSerapan = (t: number, a: number) => (a > 0 ? ((t / a) * 100).toFixed(1) + "%" : "0.0%");

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
      <p style={{ fontSize: "18px", color: "#006837", fontWeight: "bold" }}>Mempersiapkan Data Financial...</p>
    </div>
  );

  const listTahun = [...new Set(data.map(d => String(d.Tahun)))].filter(Boolean).sort();
  const listBulan = [...new Set(data.map(d => String(d.Bulan)))].filter(Boolean).sort((a,b) => Number(a)-Number(b));
  const listJenisDana = [...new Set(data.map(d => String(d["Jenis Dana"])))].filter(Boolean);
  
  // ==============================
// FILTER SECTION
// ==============================

// ✅ FILTER TABLE & CHART (multi select bebas)
const filtered = data.filter(d =>
  (tahun === "All" || String(d.Tahun) === tahun) &&
  (jenisDana === "All" || d["Jenis Dana"] === jenisDana) &&
  (selectedBulan.length === 0 || selectedBulan.includes(String(d.Bulan)))
);
const trendBulanan = Object.values(
  filtered.reduce((acc: any, d: any) => {
    const bulan = Number(d.Bulan);
    if (!bulan) return acc;

    if (!acc[bulan]) {
      acc[bulan] = {
        name: `Bulan ${bulan}`, // Label untuk sumbu X grafik
        bulan,
        anggaran: 0,
        realisasi: 0
      };
    }

    // Pastikan nama field sesuai dengan data Anda
    const nilaiAnggaran = parse(d["Anggaran Bulanan"] || d["Anggaran"]);
    const nilaiRealisasi = parse(d["UM Bulan"]) + parse(d["Beban Bulan"]);

    acc[bulan].anggaran += nilaiAnggaran;
    acc[bulan].realisasi += nilaiRealisasi;

    return acc;
  }, {})
).sort((a: any, b: any) => a.bulan - b.bulan);
// ==============================
// KPI LOGIC (YTD)
// ==============================

// ambil bulan terbesar untuk YTD
const maxBulan = selectedBulan.length > 0
  ? Math.max(...selectedBulan.map(Number))
  : 12;

// ✅ FILTER YTD (Jan → bulan terakhir)
const filteredYTD = data.filter(d =>
  (tahun === "All" || String(d.Tahun) === tahun) &&
  (jenisDana === "All" || d["Jenis Dana"] === jenisDana) &&
  Number(d.Bulan) <= maxBulan
);

// ✅ FILTER FULL YEAR (khusus ambil anggaran tahunan)
const filteredFullYear = data.filter(d =>
  (tahun === "All" || String(d.Tahun) === tahun) &&
  (jenisDana === "All" || d["Jenis Dana"] === jenisDana)
);

// ==============================
// KPI TAHUNAN (YTD)
// ==============================

// ⚠️ NOTE: pakai Anggaran Tahunan, bukan Anggaran Bulanan
const totalAnggaranTahunan = filteredFullYear.reduce(
  (acc, d) => acc + parse(d["Anggaran Tahunan"]),
  0
);

// transaksi YTD (UM + Beban dari bulan 1 → maxBulan)
const totalTransaksiTahunan = filteredYTD.reduce(
  (acc, d) => acc + parse(d["UM Bulan"]) + parse(d["Beban Bulan"]),
  0
);

// saldo
const totalSaldoTahunan = totalAnggaranTahunan - totalTransaksiTahunan;

// serapan
const serapanTahunan =
  totalAnggaranTahunan > 0
    ? (totalTransaksiTahunan / totalAnggaranTahunan) * 100
    : 0;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const agingUMList = filtered
  .filter(d => {
    const bulan = Number(d.Bulan);
    const tahunData = Number(d.Tahun);
    const selisihBulan = (currentYear - tahunData) * 12 + (currentMonth - bulan);
    return parse(d["UM Bulan"]) > 0 && selisihBulan >= 1;
  })
  .reduce((acc: any, curr) => {
    const sub = curr["Sub Program"] || "N/A";
    const bulan = Number(curr.Bulan);
    const tahunData = Number(curr.Tahun);
    const selisihBulan = (currentYear - tahunData) * 12 + (currentMonth - bulan);
    if (!acc[sub]) acc[sub] = { total: 0, aging: selisihBulan };
    acc[sub].total += parse(curr["UM Bulan"]);
    acc[sub].aging = Math.max(acc[sub].aging, selisihBulan);
    return acc;

    const maxBulan = selectedBulan.length > 0
      ? Math.max(...selectedBulan.map(Number))
      : 12;

    const filteredYTD = data.filter(d =>
      (tahun === "All" || String(d.Tahun) === tahun) &&
      (jenisDana === "All" || d["Jenis Dana"] === jenisDana) &&
      Number(d.Bulan) <= maxBulan
    );
  }, {});

  // ✅ Anggaran Berjalan (ikut bulan)
    const anggaranBerjalan = filtered.reduce(
    (acc: number, d: any) => acc + parse(d["Anggaran"]),
    0
  );

  console.log("SAMPLE DATA:", filtered[0]);

// ==============================
// TYPE
// ==============================
type AkunType = { a: number; um: number; b: number; t: number };
type SubType = { a: number; um: number; b: number; t: number; akuns: Record<string, AkunType> };
type OrganType = { a: number; um: number; b: number; t: number; subs: Record<string, SubType> };
type DivType = { a: number; um: number; b: number; t: number; organs: Record<string, OrganType> };

// ==============================
// TREE BUILDING
// ==============================
const tree: Record<string, DivType> = {};

filtered.forEach((d: any) => {
  const div = (d["Divisi2"] || "Lainnya").trim();
  const org = (d["Organ / Departemen"] || "Tanpa Organ").trim();
  const sub = (d["Sub Program"] || "Tanpa Sub").trim();
  const akun = (d["Akun Budget"] || "Tanpa Akun").trim();

  // 🔥 PENTING: ini biar ga double
  const a = parse(d["Anggaran Tahunan"] || d["Anggaran"]); // FIXED (bukan Anggaran bulanan)
  const um = parse(d["UM Bulan"]);
  const b = parse(d["Beban Bulan"]);
  const t = um + b;

  // INIT
  if (!tree[div]) {
    tree[div] = { a: 0, um: 0, b: 0, t: 0, organs: {} };
  }

  if (!tree[div].organs[org]) {
    tree[div].organs[org] = { a: 0, um: 0, b: 0, t: 0, subs: {} };
  }

  if (!tree[div].organs[org].subs[sub]) {
    tree[div].organs[org].subs[sub] = { a: 0, um: 0, b: 0, t: 0, akuns: {} };
  }

  if (!tree[div].organs[org].subs[sub].akuns[akun]) {
    tree[div].organs[org].subs[sub].akuns[akun] = { a: 0, um: 0, b: 0, t: 0 };
  }

  // UPDATE FUNCTION
  const up = (obj: { a: number; um: number; b: number; t: number }) => {
    obj.a += a;
    obj.um += um;
    obj.b += b;
    obj.t += t;
  };

  // APPLY KE SEMUA LEVEL
  up(tree[div]);
  up(tree[div].organs[org]);
  up(tree[div].organs[org].subs[sub]);
  up(tree[div].organs[org].subs[sub].akuns[akun]);
});


// ==============================
// GRAND TOTAL
// ==============================
const totalAll = Object.values(tree).reduce(
  (acc, d) => {
    acc.a += d.a;
    acc.um += d.um;
    acc.b += d.b;
    acc.t += d.t;
    return acc;
  },
  { a: 0, um: 0, b: 0, t: 0 }
);
const grandTotal = totalAll;

// ==============================
// SERAPAN TOTAL
// ==============================
const totalSerapan =
  totalAll.a > 0 ? (totalAll.t / totalAll.a) * 100 : 0;
  const pieData = [
    { name: "Program", value: filtered.filter(d => (d["Program/Operasional"] || "").toLowerCase().includes("program")).reduce((a, b) => a + (parse(b["UM Bulan"]) + parse(b["Beban Bulan"])), 0) },
    { name: "Operasional", value: filtered.filter(d => (d["Program/Operasional"] || "").toLowerCase().includes("operasional")).reduce((a, b) => a + (parse(b["UM Bulan"]) + parse(b["Beban Bulan"])), 0) }
  ];

  const treeDD: any = {};
  filtered.forEach(d => {
    const akunDD = d["Nama Akun DD"] || "Tanpa Akun DD";
    const programDD = d["Program DD"] || "Tanpa Program";
    const akun = d["Akun Budget"] || "Tanpa Akun";
    const a = parse(d["Anggaran"] || d["Anggaran Tahunan"]);
    const um = parse(d["UM Bulan"]);
    const b = parse(d["Beban Bulan"]);
    const t = um + b;

    if (!treeDD[akunDD]) treeDD[akunDD] = { a: 0, um: 0, b: 0, t: 0, programsDD: {} };
    if (!treeDD[akunDD].programsDD[programDD]) treeDD[akunDD].programsDD[programDD] = { a: 0, um: 0, b: 0, t: 0, akunBudget: {} };
    if (!treeDD[akunDD].programsDD[programDD].akunBudget[akun]) treeDD[akunDD].programsDD[programDD].akunBudget[akun] = { a: 0, um: 0, b: 0, t: 0 };

    const up = (obj: any) => { obj.a += a; obj.um += um; obj.b += b; obj.t += t; };
    up(treeDD[akunDD]); up(treeDD[akunDD].programsDD[programDD]); up(treeDD[akunDD].programsDD[programDD].akunBudget[akun]);
  });

  const asnafMap: any = {};
  filtered.forEach(d => {
    const asnaf = d["Asnaf"];
    const val = (parse(d["UM Bulan"]) + parse(d["Beban Bulan"])) || 0;
    if (val > 0 && asnaf) {
      if (!asnafMap[asnaf]) asnafMap[asnaf] = 0;
      asnafMap[asnaf] += val;
    }
  });

  const thStyle: React.CSSProperties = {
  background: "#f9fafb",
  color: "#374151",
  padding: "10px 8px",
  fontSize: "10.5px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "right"
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "11px",
  borderBottom: "1px solid #f1f5f9",
  lineHeight: "1.4"
};

const rowHover = (base: string, hover: string, extraStyle: any = {}) => ({
  style: {
    background: base,
    transition: "0.2s",
    ...extraStyle
  },
  onMouseEnter: (e: any) => {
    e.currentTarget.style.background = hover;
  },
  onMouseLeave: (e: any) => {
    e.currentTarget.style.background = base;
  }
});

const handlePrint = () => {
  setIsPrint(true);
  setPrintKey(prev => prev + 1);

  setTimeout(() => {
    window.print();
  }, 300); // 🔥 kasih waktu render ulang
};


  return (
    <div style={{ padding: "20px", background: "#f8fafc", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <style>{`
        @media print {

        .no-print {
          display: none !important;
        }

        body {
          background: #fff !important;
          margin: 0 !important;
        }

        .dashboard-content {
          width: 100% !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        /* Layout */
        .charts-wrapper {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 12px !important;
        }

        .chart-box {
          border: 1px solid #e2e8f0 !important;
          page-break-inside: avoid !important;
        }

        .trend-chart {
          grid-column: span 2 !important;
        }

        /* Size */
        .chart-container {
          width: 100% !important;
          height: 180px !important;
        }

        .trend-container {
          width: 100% !important;
          height: 250px !important;
          overflow: hidden !important;
          position: relative !important;
        }

        /* Font kecil */
        .recharts-cartesian-axis-tick-value {
          font-size: 8px !important;
        }

        .recharts-legend-item-text {
          font-size: 8px !important;
        }

        /* Dot kecil */
        .recharts-dot {
          r: 2 !important;
        }

        .recharts-active-dot {
          r: 2 !important;
        }

        @page {
          size: landscape;
          margin: 0.5cm;
        }
      }

        /* tab tetap */
        .tab-btn {
          padding: 10px 20px;
          font-weight: bold;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          border: none;
          font-size: 14px;
          transition: 0.3s;
        }
        .tab-active { background: #006837; color: white; }
        .tab-inactive { background: #e2e8f0; color: #64748b; }
      `}</style>

      {showUMModal && (
        <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", width: "450px", maxWidth: "90%" }}>
            <h3 style={{ fontSize: "16px", color: "#b91c1c", marginBottom: "15px" }}>Detail UM Menggantung</h3>
            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              {Object.entries(agingUMList).map(([sub, info]: any) => (
                <div key={sub} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold" }}>{sub}</div>
                    <div style={{ fontSize: "10px", color: "#ef4444" }}>Keterlambatan: {info.aging} bulan</div>
                  </div>
                  <span style={{ fontWeight: "bold", marginLeft: "10px" }}>{format(info.total)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowUMModal(false)} style={{ width: "100%", marginTop: "20px", padding: "10px", background: "#006837", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Tutup</button>
          </div>
        </div>
      )}

      <div className="dashboard-header" style={{ marginBottom: "15px", borderBottom: "2px solid #006837", paddingBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ color: "#006837", margin: 0, fontSize: "20px" }}>Executive Financial Dashboard</h1>
            <p style={{ color: "#64748b", margin: 0, fontSize: "11px" }}>Great Edunesia • {tahun} • {jenisDana}</p>
          </div>
          <button className="no-print" onClick={() => window.print()} style={{ padding: "10px 20px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>🖨️ Cetak</button>
        </div>
      </div>

      <div className="no-print" style={{ background: "#fff", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}>
          <FilterSelect label="Tahun" value={tahun} options={listTahun} onChange={setTahun} />
          <FilterSelect label="Jenis Dana" value={jenisDana} options={listJenisDana} onChange={setJenisDana} />
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#475569", marginBottom: "4px" }}>Periode Bulan</label>
            <button onClick={() => setShowBulan(!showBulan)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "12px", minWidth: "140px", textAlign: "left" }}>
              {selectedBulan.length === 0 ? "Sepanjang Tahun" : `${selectedBulan.length} Bulan`} ▼
            </button>
            {showBulan && (
              <div style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #cbd5e1", padding: "10px", width: "200px", borderRadius: "8px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", marginTop: "5px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {listBulan.map(b => (
                    <label key={b} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                      <input type="checkbox" checked={selectedBulan.includes(b)} onChange={() => setSelectedBulan(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])} /> Bln {b}
                    </label>
                  ))}
                </div>
                <button onClick={() => setShowBulan(false)} style={{ width: "100%", marginTop: "12px", background: "#006837", color: "#fff", border: "none", padding: "6px", borderRadius: "4px" }}>Tutup</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", gap: "5px" }}>
        <button onClick={() => setActiveTab("summary")} className={`tab-btn ${activeTab === "summary" ? "tab-active" : "tab-inactive"}`}>📊 Summary</button>
        <button onClick={() => setActiveTab("detail")} className={`tab-btn ${activeTab === "detail" ? "tab-active" : "tab-inactive"}`}>📝 Detail</button>
        <button onClick={() => setActiveTab("reportDD")} className={`tab-btn ${activeTab === "reportDD" ? "tab-active" : "tab-inactive"}`}>📊 Report DD</button>
      </div>

      <div className="dashboard-content" style={{ background: "#fff", padding: "20px", borderRadius: "0 12px 12px 12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        
        {activeTab === "summary" && (
          <div>
            {Object.keys(agingUMList).length > 0 && (
              <div className="warning-um no-print" onClick={() => setShowUMModal(true)} style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", borderLeft: "4px solid #ef4444", marginBottom: "15px", cursor: "pointer" }}>
                <h4 style={{ margin: 0, color: "#b91c1c", fontSize: "12px" }}>⚠️ {Object.keys(agingUMList).length} Sub Program memiliki UM Menggantung {">"} 1 Bulan. Klik untuk detail.</h4>
              </div>
            )}

            <div className="kpi-container" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "15px" }}>
              <StatCard title="Anggaran" value={format(grandTotal.a)} color="#0284c7" />
              <StatCard title="UM" value={format(grandTotal.um)} color="#0284c7" />
              <StatCard title="Beban" value={format(grandTotal.b)} color="#0284c7" />
              <StatCard title="Total Trx" value={format(grandTotal.t)} color="#0284c7" />
              <StatCard title="Saldo" value={format(grandTotal.a - grandTotal.t)} color="#0284c7" />
              <StatCard title="Serapan" value={getSerapan(grandTotal.t, grandTotal.a)} color="#0284c7" />
            </div>

            <div className="kpi-container" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
              <StatCard title="Anggaran Tahunan" value={format(totalAnggaranTahunan)} />
              <StatCard title={`Transaksi YTD (s.d Bln ${maxBulan})`} value={format(totalTransaksiTahunan)} />
              <StatCard title="Saldo YTD" value={format(totalSaldoTahunan)} color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"} />
              <StatCard title="Serapan YTD" value={`${serapanTahunan.toFixed(1)}%`} color={serapanTahunan > 100 ? "#dc2626" : serapanTahunan < 70 ? "#f59e0b" : "#006837"} />
            </div>

            <div className="charts-wrapper" style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
              <div className="chart-box" style={{ flex: 1.5, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>Serapan per Divisi</h4>
                <div className="chart-container"style={{ width: "100%", height: "300px" }}>
                <ResponsiveContainer key={printKey} width="100%" height="100%">
                    <BarChart data={Object.entries(tree).map(([name, d]: any) => ({ name, a: d.a, t: d.t }))} margin={{ top: 5, right: 20, left: 25, bottom: 45 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={0} textAnchor="middle" />
                      <YAxis tick={{ fontSize: 8 }} tickFormatter={(v) => `${v/1000000}M`} />
                      <Tooltip formatter={(v:any) => format(v)} />
                      <Legend wrapperStyle={{ fontSize: "9px" }} />
                      <Bar name="Budget" dataKey="a" fill="#006837" isAnimationActive={false} />
                      <Bar name="Real" dataKey="t" fill="#f59e0b" isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="chart-box" style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>Prog vs Ops</h4>
                <div style={{ height: "200px", width: "100%" }}>
                  <ResponsiveContainer key={printKey} width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} isAnimationActive={false} label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}>
                        <Cell fill="#006837" /><Cell fill="#f59e0b" />
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: "9px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* ✅ TARUH DI SINI */}
            {activeTab === "summary" && (
              <div className="chart-box trend-chart" style={{ 
                background: "#fff",
                border: "1px solid #e2e8f0", 
                borderRadius: "12px", 
                padding: "20px",
                marginBottom: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: 0 }}>
                    Tren Bulanan: Budget vs Actual
                  </h4>
                  <div style={{ fontSize: "11px", color: "#006837" }}>
                    <span style={{ marginRight: "8px" }}>● Anggaran</span>
                    <span>● Realisasi (UM+Beban)</span>
                  </div>
                </div>

                <div className="chart-container trend-container" style={{ width: "100%", height: "380px" }}>
                  <ResponsiveContainer key={printKey} width="100%" height="100%">
                    <ComposedChart
                        data={trendBulanan}
                        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                        barCategoryGap="60%"
                      >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#006837" />
                      <XAxis 
                        dataKey="bulan"
                        scale="point"
                        padding={{ left: 20, right: 20}}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#006837" }}
                        tickFormatter={(b) => ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][b-1]}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#006837" }}
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} // Persingkat ke Juta/Miliar agar tidak sesak
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        formatter={(v: any) => format(v)} 
                      />
                      <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                      
                      {/* Anggaran sebagai Area/Line (Target) */}
                      <Area 
                        type="monotone" 
                        dataKey="anggaran" 
                        fill="#f1f5f9" 
                        stroke="#94a3b8" 
                        name="Target Anggaran" 
                        strokeWidth={2}
                        dot={isPrint ? false : { r: 2 }}
                        activeDot={isPrint ? false : { r: 2 }}  
                      />
                      
                      {/* Realisasi sebagai Bar (Actual) */}
                      <Bar 
                        dataKey="realisasi" 
                        fill="#f59e0b" 
                        name="Realisasi Actual" 
                        radius={[1, 1, 0, 0]} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center" }}>Struktur Divisi / Organ</th>
                  <th style={thStyle}>Anggaran</th>
                  <th style={thStyle}>UM</th>
                  <th style={thStyle}>Beban</th>
                  <th style={thStyle}>Total Transaksi</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>%</th>
                  </tr>
              </thead>
              <tbody>
                {Object.entries(tree).map(([div, d]: any) => {
                  const serapan = d.a > 0 ? (d.t / d.a) * 100 : 0;
                  const isOpen = expandedDiv === div;
                  return (
                    <React.Fragment key={div}>
                      <tr
                        onClick={() => setExpandedDiv(isOpen ? null : div)}
                        style={{
                          borderBottom: "1px solid #eee",
                          fontSize: "12px",
                          cursor: "pointer",
                          background: "#fafafa",
                          transition: "0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#e0f2fe";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fafafa";
                        }}>
                        <td style={{ padding: "6px" }}>{isOpen ? "▼" : "▶"} {div}</td>
                        <td style={{ textAlign: "right" }}>{format(d.a)}</td>
                        <td style={{ textAlign: "right" }}>{format(d.um)}</td>
                        <td style={{ textAlign: "right" }}>{format(d.b)}</td>
                        <td style={{ textAlign: "right" }}>{format(d.t)}</td>
                        <td style={{ textAlign: "right" }}>{format(d.a - d.t)}</td>
                        <td style={{ textAlign: "right", color: serapan < 70 ? "red" : "#006837", fontWeight: 600 }}>{serapan.toFixed(1)}%</td>
                      </tr>
                      {isOpen && Object.entries(d.organs || {}).map(([org, o]: any) => {
                        const serapanOrg = o.a > 0 ? (o.t / o.a) * 100 : 0;
                        return (
                          <tr
                            key={org}
                            style={{
                             fontSize: "12px",
                             background: "#ffffff",
                             borderTop: "1px solid #eee",
                             transition: "0.2s"
                            }}
                            onMouseEnter={(e) => {
                             e.currentTarget.style.background = "#e0f2fe"; // beda dikit biar hierarki keliatan
                            }}
                            onMouseLeave={(e) => {
                             e.currentTarget.style.background = "#fafafa";
                            }}
                          >
                            <td style={{ paddingLeft: "25px" }}>↳ {org}</td>
                            <td style={{ textAlign: "right" }}>{format(o.a)}</td>
                            <td style={{ textAlign: "right" }}>{format(o.um)}</td>
                            <td style={{ textAlign: "right" }}>{format(o.b)}</td>
                            <td style={{ textAlign: "right" }}>{format(o.t)}</td>
                            <td style={{ textAlign: "right" }}>{format(o.a - o.t)}</td>
                            <td style={{ textAlign: "right", color: serapanOrg < 70 ? "red" : "#006837", fontWeight: 600 }}>{serapanOrg.toFixed(1)}%</td>
                          </tr>
                        );                        
                      })}
                    </React.Fragment>
                  );
                })}
                {/* BARIS GRAND TOTAL */}
                          <tr style={{ 
                            background: "#6c9b6f", 
                            fontWeight: "800", 
                            borderTop: "2px solid #cbd5e1",
                            fontSize: "12px" 
                          }}>
                          <td style={{ padding: "10px 6px" }}>GRAND TOTAL</td>
                          <td style={{ textAlign: "right" }}>{format(grandTotal.a)}</td>
                          <td style={{ textAlign: "right" }}>{format(grandTotal.um)}</td>
                          <td style={{ textAlign: "right" }}>{format(grandTotal.b)}</td>
                          <td style={{ textAlign: "right" }}>{format(grandTotal.t)}</td>
                          <td style={{ textAlign: "right" }}>{format(grandTotal.a - grandTotal.t)}</td>
                          <td style={{ 
                            textAlign: "right", 
                            color: totalSerapan < 70 ? "red" : "#006837" 
                          }}>
                            {totalSerapan.toFixed(1)}%
                          </td>
                        </tr>
              </tbody>
            </table>
          </div>
        )}
{activeTab === "detail" && (
  <div>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "15px",
      }}
      className="no-print"
    >
      <h3 style={{ fontSize: "14px", color: "#006837" }}>
        Rincian Akun
      </h3>
      <input
        type="text"
        placeholder="Cari..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid #cbe1cf",
          fontSize: "12px",
        }}
      />
    </div>

    {(() => {
      // 🔹 HEADER STYLE (dibuat lebih halus)
      const thStyle = {
        padding: "6px 8px",
        border: "1px solid #e2e8f0",   // 👈 lebih tipis dari sebelumnya
        background: "#f8fafc",
        fontWeight: 600,
        fontSize: "12px",
      };

      // 🔹 BODY CELL
      const tdStyle = {
        border: "1px solid #e2e8f0",
        padding: "4px 6px",
        fontSize: "11px",
      };

      // 🔹 ALIGNMENT
      const tdRight: CSSProperties = {
        textAlign: "right",
        padding: "4px 6px",
        border: "1px solid #e5e7eb",
        fontSize: "11px"
      };

      const tdCenter: CSSProperties = {
        ...tdStyle,
        textAlign: "center",
      };

      // 🔹 INDENT HELPER (fix error paddingLeft)
      const tdIndent = (left: number) => ({
        ...tdStyle,
        padding: `4px 6px 4px ${left}px`,
      });

      return (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            border: "1px solid #cbd5e1", // outer border halus
          }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "center", width: "30%" }}>
                Struktur
              </th>
              <th style={thStyle}>Anggaran</th>
              <th style={thStyle}>UM</th>
              <th style={thStyle}>Beban</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Saldo</th>
              <th style={{ ...thStyle, textAlign: "center", width: "10%" }}>
                %
              </th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(tree).map(([div, d]: any) => {
              const serapanDiv = d.a > 0 ? (d.t / d.a) * 100 : 0;

              return (
                <React.Fragment key={div}>
                  {/* LEVEL 1 */}
                  <tr style={{ background: "#f1f5f9", fontWeight: 700 }}>
                    <td style={tdStyle}>{div}</td>
                    <td style={tdRight}>{format(d.a)}</td>
                    <td style={tdRight}>{format(d.um)}</td>
                    <td style={tdRight}>{format(d.b)}</td>
                    <td style={tdRight}>{format(d.t)}</td>
                    <td style={tdRight}>{format(d.a - d.t)}</td>
                    <td style={tdCenter}>
                      {serapanDiv.toFixed(1)}%
                    </td>
                  </tr>

                  {/* LEVEL 2 */}
                  {Object.entries(d.organs).map(([org, o]: any) => {
                    const serapanOrg = o.a > 0 ? (o.t / o.a) * 100 : 0;

                    return (
                      <React.Fragment key={org}>
                        <tr
                          {...rowHover("#ffffff", "#dcfce7")}
                          style={{ fontWeight: 600 }}
                        >
                          <td style={tdIndent(20)}>📁 {org}</td>
                          <td style={tdRight}>{format(o.a)}</td>
                          <td style={tdRight}>{format(o.um)}</td>
                          <td style={tdRight}>{format(o.b)}</td>
                          <td style={tdRight}>{format(o.t)}</td>
                          <td style={tdRight}>{format(o.a - o.t)}</td>
                          <td style={tdCenter}>
                            {serapanOrg.toFixed(1)}%
                          </td>
                        </tr>

                        {/* LEVEL 3 */}
                        {Object.entries(o.subs).map(([sub, s]: any) => {
                          const isOpen = expandedSub[sub];
                          const serapanSub =
                            s.a > 0 ? (s.t / s.a) * 100 : 0;

                          return (
                            <React.Fragment key={sub}>
                              <tr
                                onClick={() =>
                                  setExpandedSub((prev) => ({
                                    ...prev,
                                    [sub]: !prev[sub],
                                  }))
                                }
                                style={{
                                  background: "#fafafa",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "#dcfce7")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    "#fafafa")
                                }
                              >
                                <td style={tdIndent(32)}>
                                  <span style={{ marginRight: "6px" }}>
                                    {isOpen ? "▼" : "▶"}
                                  </span>
                                  {sub}
                                </td>
                                <td style={tdRight}>{format(s.a)}</td>
                                <td style={tdRight}>{format(s.um)}</td>
                                <td style={tdRight}>{format(s.b)}</td>
                                <td style={tdRight}>{format(s.t)}</td>
                                <td style={tdRight}>{format(s.a - s.t)}</td>
                                <td style={tdCenter}>
                                  {serapanSub.toFixed(1)}%
                                </td>
                              </tr>

                              {/* LEVEL 4 */}
                              {isOpen &&
                                Object.entries(s.akuns).map(
                                  ([akun, a]: any) => {
                                    const serapanAkun =
                                      a.a > 0
                                        ? (a.t / a.a) * 100
                                        : 0;

                                    return (
                                      <tr
                                        key={akun}
                                        {...rowHover(
                                          "#ffffff",
                                          "#dcfce7"
                                        )}
                                      >
                                        <td style={tdIndent(52)}>
                                          <span
                                            style={{
                                              marginRight: "6px",
                                              color: "#9ca3af",
                                            }}
                                          >
                                            └─
                                          </span>
                                          {akun}
                                        </td>
                                        <td style={tdRight}>
                                          {format(a.a)}
                                        </td>
                                        <td style={tdRight}>
                                          {format(a.um)}
                                        </td>
                                        <td style={tdRight}>
                                          {format(a.b)}
                                        </td>
                                        <td style={tdRight}>
                                          {format(a.t)}
                                        </td>
                                        <td style={tdRight}>
                                          {format(a.a - a.t)}
                                        </td>
                                        <td style={tdCenter}>
                                          {serapanAkun.toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* GRAND TOTAL */}
            <tr
              style={{
                background: "#6c9b6f",
                color: "#fff",
                fontWeight: "bold",
                borderTop: "2px solid #475569",
              }}
            >
              <td style={{ ...tdStyle, padding: "10px 20px" }}>
                GRAND TOTAL SELURUH DIVISI
              </td>
              <td style={tdRight}>{format(grandTotal.a)}</td>
              <td style={tdRight}>{format(grandTotal.um)}</td>
              <td style={tdRight}>{format(grandTotal.b)}</td>
              <td style={tdRight}>{format(grandTotal.t)}</td>
              <td style={tdRight}>
                {format(grandTotal.a - grandTotal.t)}
              </td>
              <td style={tdCenter}>
                {totalSerapan.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      );
    })()}
  </div>
)}

        {activeTab === "reportDD" && (
          <div style={{ overflowX: "auto" }}>
            <h3 style={{ fontSize: "16px", color: "#006837", marginBottom: "20px", fontWeight: '800' }}>Report Dompet Dhuafa</h3>
            
            {/* BARIS 1: KPI UTAMA (6 Kolom) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "10px" }}>
              <StatCard title="Anggaran" value={format(grandTotal.a)} />
              <StatCard title="UM" value={format(grandTotal.um)} color="#0284c7" />
              <StatCard title="Beban" value={format(grandTotal.b)} color="#f59e0b" />
              <StatCard title="Total Trx" value={format(grandTotal.t)} />
              <StatCard title="Saldo" value={format(grandTotal.a - grandTotal.t)} color="#dc2626" />
              <StatCard title="Serapan" value={getSerapan(grandTotal.t, grandTotal.a)} color="#006837" />
            </div>

            {/* BARIS 2: KPI TAHUNAN (4 Kolom) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "25px" }}>
              <StatCard title="Anggaran Tahunan" value={format(totalAnggaranTahunan)} />
              <StatCard title="Transaksi Tahunan" value={format(totalTransaksiTahunan)} color="#0284c7" />
              <StatCard title="Saldo Tahunan" value={format(totalSaldoTahunan)} color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"} />
              <StatCard title="Serapan Tahunan" value={`${serapanTahunan.toFixed(1)}%`} color={serapanTahunan > 100 ? "#dc2626" : "#006837"} />
            </div>

            {/* BARIS 3: ASNAF & PIE CHART (Side-by-Side) */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "30px", alignItems: 'flex-start' }}>
              <div style={{ flex: 2 }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Distribusi Asnaf</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  {Object.entries(asnafMap).map(([k, v]: any) => (
                    <StatCard key={k} title={k} value={format(v)} color="#10b981" />
                  ))}
                </div>
              </div>
              
              <div style={{ flex: 1, background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase' }}>Prog vs Ops</p>
                <div style={{ height: "140px", width: "100%" }}>
                  <ResponsiveContainer key={printKey} width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} isAnimationActive={false} label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}>
                        <Cell fill="#006837" /><Cell fill="#f59e0b" />
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "left" }}>Akun DD</th>
          <th style={thStyle}>Anggaran</th>
          <th style={thStyle}>UM</th>
          <th style={thStyle}>Beban</th>
          <th style={thStyle}>Total</th>
          <th style={thStyle}>Saldo</th>
          <th style={{ ...thStyle, textAlign: "center" }}>%</th>
        </tr>
      </thead>

      <tbody>
        {Object.entries(treeDD).map(([akunDD, d]: any) => {
          const openDD = expandedDD === akunDD;
          const serapanDD = d.a > 0 ? (d.t / d.a) * 100 : 0;

          return (
            <React.Fragment key={akunDD}>
              
              {/* LEVEL 1: AKUN DD */}
              <tr
                onClick={() => {
                  setExpandedDD(openDD ? null : akunDD);
                  setExpandedProg(null);
                }}
                {...rowHover("#f1f5f9", "#95bba0", {
                  cursor: "pointer",
                  fontWeight: 700
                })}
              >
                <td style={{ ...tdStyle }}>
                  {openDD ? "▼" : "▶"} {akunDD}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{format(d.a)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{format(d.um)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{format(d.b)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{format(d.t)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{format(d.a - d.t)}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: serapanDD < 70 ? "#dc2626" : "#006837", fontWeight: 700 }}>
                  {serapanDD.toFixed(1)}%
                </td>
              </tr>

              {/* LEVEL 2: PROGRAM DD */}
              {openDD &&
                Object.entries(d.programsDD).map(([prog, p]: any) => {
                  const openProg = expandedProg === prog;
                  const serapanProg = p.a > 0 ? (p.t / p.a) * 100 : 0;

                  return (
                    <React.Fragment key={prog}>
                      <tr
                        onClick={() => setExpandedProg(openProg ? null : prog)}
                        {...rowHover("#ffffff", "#95bba0", {
                          cursor: "pointer"
                        })}
                      >
                        <td style={{ ...tdStyle, paddingLeft: "20px" }}>
                          {openProg ? "▼" : "▶"} {prog}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{format(p.a)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{format(p.um)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{format(p.b)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{format(p.t)}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{format(p.a - p.t)}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{serapanProg.toFixed(1)}%</td>
                      </tr>

                      {/* LEVEL 3: AKUN BUDGET */}
                      {openProg &&
                        Object.entries(p.akunBudget).map(([akun, a]: any) => {
                          const serapanAkun = a.a > 0 ? (a.t / a.a) * 100 : 0;

                          return (
                            <tr
                              key={akun}
                              {...rowHover("#fafafa", "#95bba0")}
                            >
                              <td style={{ ...tdStyle, paddingLeft: "40px" }}>• {akun}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{format(a.a)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{format(a.um)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{format(a.b)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{format(a.t)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{format(a.a - a.t)}</td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>{serapanAkun.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          );
        })}
        {/* --- BARIS GRAND TOTAL --- */}
          <tr style={{ 
            background: "#6c9b6f", 
            color: "#ffffff", 
            fontWeight: "bold", 
            fontSize: "12px" 
          }}>
            <td style={{ ...tdStyle, padding: "10px" }}>GRAND TOTAL</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{format(grandTotal.a)}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{format(grandTotal.um)}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{format(grandTotal.b)}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{format(grandTotal.t)}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>{format(grandTotal.a - grandTotal.t)}</td>
            <td style={{ ...tdStyle, textAlign: "center" }}>{totalSerapan.toFixed(1)}%</td>
          </tr>
      </tbody>
    </table>
  </div>
  )}
  </div>
  </div>
  );
}
  

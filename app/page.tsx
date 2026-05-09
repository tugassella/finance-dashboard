"use client";



import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ComposedChart, Area, CartesianGrid, Legend, PieChart, Pie, Cell
} from "recharts";
import { CSSProperties } from "react";
import { throwForMissingRequestStore } from "next/dist/server/app-render/work-unit-async-storage.external";

// --- Sub-Komponen StatCard ---
const THEME = {
  primary: "#006837",
  primarySoft: "#edf7f1",
  primaryHover: "#dff1e6",

  text: "#1e293b",
  textSoft: "#64748b",

  border: "#dbe4dc",
  bg: "#f6fbf8",
  white: "#ffffff",

  warning: "#f59e0b",
  danger: "#dc2626",
  shadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const StatCard = ({ title, value, color = "#111" }: { title: string, value: string, color?: string }) => (
  <div style={{
      background: THEME.bg,
      padding: "18px",
      borderRadius: "12px",
      border: `1px solid ${THEME.border}`,
      boxShadow: THEME.shadow,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "180px",
      flex: 1,
      fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      color: THEME.text
    }}>
      <span style={{ 
        fontSize: "11px", 
        fontWeight: "600", 
        color: THEME.textSoft, 
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
  // CEK LOGIN
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  if (!isLoggedIn) {
    window.location.href = "/login";
    return;
  }

  // FETCH DATA
  fetch("/api/sheets")
    .then(res => res.json())
    .then(res => {
      setData(Array.isArray(res) ? res : res?.data ?? []);
      setLoading(false);
    })
    .catch(() => setLoading(false));

}, []);
  const safeData = Array.isArray(data) ? data : [];
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

  const listTahun = [...new Set(safeData.map(d => String(d.Tahun)))].filter(Boolean).sort();
  const listBulan = [...new Set(safeData.map(d => String(d.Bulan)))].filter(Boolean).sort((a,b) => Number(a)-Number(b));
  const listJenisDana = [...new Set(safeData.map(d => String(d["Jenis Dana"])))].filter(Boolean);
  
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

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  minWidth: "1200px",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: "12px",
  color: THEME.text,
  background: THEME.white
};

 const thStyle: CSSProperties = {
  background: THEME.primarySoft,
  color: THEME.primary,
  padding: "10px 8px",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
  borderBottom: `1px solid ${THEME.border}`,
  textAlign: "center",
 };

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: "6px 8px",
  fontSize: "12px",
  fontWeight: 500,
  color: THEME.text
};

const tdRight: CSSProperties = {
  ...tdStyle,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums" // 🔥 angka jadi rapi sejajar
};

const tdCenter: CSSProperties = {
  ...tdStyle,
  textAlign: "center"
};

const tdIndent = (left: number): CSSProperties => ({
  ...tdStyle,
  padding: `4px 6px 4px ${left}px`,
});

const firstColStyle: CSSProperties = {
  position: "sticky",
  left: 0,
  background: "#fff",
  zIndex: 4,
  borderRight: "1px solid #e2e8f0"
};

const stickyLeft = (left: number, bg: string = "#fff"): CSSProperties => ({
  position: "sticky",
  left,
  background: bg,
  zIndex: 3,
  borderRight: "1px solid #e2e8f0"
});

const thStickyStyle: CSSProperties = {
  ...thStyle,
  position: "sticky",
  top: 0,
  background: THEME.primarySoft,
  zIndex: 10
};

const rowHover = (base: string, hover: string) => ({
  style: {
    background: base,
    transition: "0.2s",
  } as CSSProperties,

  onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => {
    (e.currentTarget as HTMLTableRowElement).style.background = hover;
  },

  onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => {
    (e.currentTarget as HTMLTableRowElement).style.background = base;
  },
});

const handlePrint = () => {
  setIsPrint(true);
  setPrintKey(prev => prev + 1);

  setTimeout(() => {
    window.print();
  }, 300); // 🔥 kasih waktu render ulang
};

const stickyCol = (left: number): CSSProperties => ({
  position: "sticky",
  left,
  background: "#f9fafb",
  zIndex: 3,
  borderRight: "1px solid #e2e8f0"
});



  return (
    <div
  className="dashboard-root"
  style={{
    padding: "20px",
    background: THEME.bg,
    minHeight: "100vh",
    fontFamily:
      "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    color: THEME.text
  }}
>
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
      /* =========================
        MOBILE RESPONSIVE
      ========================= */

      @media (max-width: 768px) {

        .dashboard-root {
          padding: 10px !important;
        }

        .dashboard-header-inner {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }

        .filter-wrapper {
          flex-direction: column !important;
          align-items: stretch !important;
        }

        .kpi-container {
          grid-template-columns: 1fr !important;
        }

        .charts-wrapper {
          flex-direction: column !important;
        }

        .chart-container {
          height: 260px !important;
        }

        .trend-container {
          height: 300px !important;
        }

        .tab-wrapper {
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 6px;
        }

        .table-wrapper {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }

        .table-wrapper table {
          min-width: 1100px;
          width: max-content;
        }

        table {
          min-width: 900px;
        }

        .dashboard-content {
          padding: 12px !important;
        }

        h1 {
          font-size: 16px !important;
        }
      }
        /* tab tetap */
        .tab-btn {
        padding: 10px 18px;
        font-weight: 600;
        border-radius: 10px 10px 0 0;
        cursor: pointer;
        border: 1px solid transparent;
        font-size: 13px;
        transition: all 0.2s ease;
      }

        .tab-inactive {
        background: transparent;
        color: #64748b;
        border: 1px solid transparent;
      }

      .tab-inactive:hover {
        background: #edf7f1;
        color: #006837;
        border: 1px solid #dbe4dc;
      }

          /* =========================
            SCROLL FIX
          ========================= */

          .charts-scroll {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .charts-scroll > div {
            width: max-content;
          }
          .table-scroll,
          .table-wrapper {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
            .chart-box {
            background: #fff;
            transition: all 0.2s ease;
          }
            display: grid;
            grid-template-columns: 2fr 1fr;
            
            @media (max-width: 768px) {
              grid-template-columns: 1fr;
            }
          
          .kpi-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none; /* Firefox */
          }

          .kpi-scroll::-webkit-scrollbar {
            display: none; /* Chrome */
          }

          th {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: THEME.text;
          }

          td {
            font-size: 12px;
            font-weight: 500;
          }
      `}</style>
      
      {showUMModal && (
        <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", width: "450px", maxWidth: "90%" }}>
            <h3 style={{ fontSize: "16px", color: "#b91c1c", marginBottom: "15px" }}>Detail UM Menggantung</h3>
            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              {Object.entries(agingUMList).map(([sub, info]: any) => (
                <div key={sub} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.primarySoft}`, fontSize: "12px" }}>
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
        <div 
          className="dashboard-header-inner"
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}
        >
         <div>
          <h1 style={{ color: "#006837", margin: 0, fontSize: "20px" }}>
            Executive Financial Dashboard
          </h1>

          <p
            style={{
              color: THEME.textSoft,
              margin: 0,
              fontSize: "11px"
            }}
          >
            Great Edunesia • {tahun} • {jenisDana}
          </p>
        </div>

        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center"
          }}
        >
          {/* PRINT */}
          <button
            onClick={() => window.print()}
            title="Print"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              border: "none",
              background: "#f59e0b",
              color: "#fff",
              cursor: "pointer",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "0.2s"
            }}
          >
            🖨
          </button>

          {/* LOGOUT */}
          <button
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              window.location.href = "/login";
            }}
            title="Logout"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "0.2s"
            }}
          >
            ↪
          </button>
        </div>
      </div>
    </div>
      <div className="no-print" style={{ background: "#fff", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
        <div 
          className="filter-wrapper"
          style={{ 
            display: "flex", 
            gap: "15px", 
            alignItems: "flex-end" 
          }}
        >
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

      <div 
        className="no-print tab-wrapper" 
        style={{ display: "flex", gap: "5px" }}
      >
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

            <div
                className="kpi-scroll"
                style={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  paddingBottom: "8px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    minWidth: "max-content",
                    paddingRight: "10px"
                  }}
                >
              <StatCard title="Anggaran" value={format(grandTotal.a)} color="#0284c7" />
              <StatCard title="UM" value={format(grandTotal.um)} color="#0284c7" />
              <StatCard title="Beban" value={format(grandTotal.b)} color="#0284c7" />
              <StatCard title="Total Trx" value={format(grandTotal.t)} color="#0284c7" />
              <StatCard title="Saldo" value={format(grandTotal.a - grandTotal.t)} color="#0284c7" />
              <StatCard title="Serapan" value={getSerapan(grandTotal.t, grandTotal.a)} color="#0284c7" />
              </div>
            </div> 

            <div
              className="kpi-scroll"
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                paddingBottom: "8px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  minWidth: "max-content",
                  paddingRight: "10px"
                }}
              >
              <StatCard title="Anggaran Tahunan" value={format(totalAnggaranTahunan)} />
              <StatCard title={`Transaksi YTD (s.d Bln ${maxBulan})`} value={format(totalTransaksiTahunan)} />
              <StatCard title="Saldo YTD" value={format(totalSaldoTahunan)} color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"} />
              <StatCard title="Serapan YTD" value={`${serapanTahunan.toFixed(1)}%`} color={serapanTahunan > 100 ? "#dc2626" : serapanTahunan < 70 ? "#f59e0b" : "#006837"} />
              </div>
            </div>

            <div className="charts-scroll">
              <div
                style={{
                  display: "flex",
                  gap: "15px",
                  width: "100%",
                  flexWrap: "wrap"
                }}
              >

                {/* BAR CHART */}
                <div
                  className="chart-box"
                  style={{
                    flex: 2,
                    minWidth: "320px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px"
                  }}
                >
                  <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>
                    Serapan per Divisi
                  </h4>

                  <div style={{ width: "100%", height: "300px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(tree).map(([name, d]: any) => ({
                          name,
                          a: d.a,
                          t: d.t
                        }))}
                        margin={{ top: 5, right: 20, left: 10, bottom: 45 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(v: any) => format(v)} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="a" fill="#006837" />
                        <Bar dataKey="t" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PIE CHART */}
                <div
                  className="chart-box"
                  style={{
                    flex: 1,
                    minWidth: "260px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px"
                  }}
                >
                  <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>
                    Prog vs Ops
                  </h4>

                  <div style={{ width: "100%", height: "300px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#006837" />
                          <Cell fill="#f59e0b" />
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            
            {/* ✅ TARUH DI SINI */}
            {activeTab === "summary" && (
            <div
              className="chart-box trend-chart"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
              }}
            >
              {/* ================= HEADER (KPI STYLE) ================= */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginBottom: "12px"
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: THEME.text,
                    margin: 0
                  }}
                >
                  Tren Bulanan: Budget vs Actual
                </h4>

                <div
                  style={{
                    fontSize: "10px",
                    color: "#006837",
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap"
                  }}
                >
                  <span>● Anggaran</span>
                  <span>● Realisasi (UM+Beban)</span>
                </div>
              </div>

              {/* ================= CHART ================= */}
              <div
                className="chart-container trend-container"
                style={{
                  width: "100%",
                  height: "320px"
                }}
              >
                <ResponsiveContainer key={printKey} width="100%" height="100%">
                  <ComposedChart
                    data={trendBulanan}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    barCategoryGap="60%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#d7e8dd"
                    />

                    <XAxis
                      dataKey="bulan"
                      scale="point"
                      padding={{ left: 10, right: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#006837" }}
                      tickFormatter={(b) =>
                        ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][b - 1]
                      }
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#006837" }}
                      tickFormatter={(value) =>
                        `${(value / 1000000).toFixed(0)}M`
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                      }}
                      formatter={(v: any) => format(v)}
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      height={30}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "10px" }}
                    />

                    {/* ================= AREA (ANGGARAN) ================= */}
                    <Area
                      type="monotone"
                      dataKey="anggaran"
                      fill="#f1f5f9"
                      stroke="#94a3b8"
                      name="Target Anggaran"
                      strokeWidth={2}
                      dot={isPrint ? false : { r: 2 }}
                      activeDot={isPrint ? false : { r: 3 }}
                    />

                    {/* ================= BAR (REALISASI) ================= */}
                    <Bar
                      dataKey="realisasi"
                      fill="#f59e0b"
                      name="Realisasi Actual"
                      radius={[2, 2, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div
            className="table-wrapper"
            style={{
              width: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
            >
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                minWidth: "800px",
                fontSize: "11px"
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center" }}>
                    Struktur Divisi / Organ
                  </th>
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
                          background: THEME.primarySoft,
                          transition: "0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = THEME.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#transparent";
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
                             e.currentTarget.style.background = THEME.primaryHover; // beda dikit biar hierarki keliatan
                            }}
                            onMouseLeave={(e) => {
                             e.currentTarget.style.background = "#dde7e2";
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
                            background: THEME.primary,
                            color: "#fff", 
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
        </div>
  )}
{activeTab === "detail" && (
  <div
    className="table-wrapper"
    style={{
      width: "100%",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch"
    }}
  >
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        minWidth: "900px", // lebih ringan dari 1200
        fontSize: "11px"
      }}
    >
      <thead>
        <tr>
          <th style={thStickyStyle}>Struktur Detail</th>
          <th style={thStyle}>Anggaran</th>
          <th style={thStyle}>UM</th>
          <th style={thStyle}>Beban</th>
          <th style={thStyle}>Total</th>
          <th style={thStyle}>Saldo</th>
          <th style={{ ...thStyle, textAlign: "center" }}>%</th>
        </tr>
      </thead>

      <tbody>
        {Object.entries(tree).map(([div, d]: any) => {
          const openDiv = expandedDiv === div;
          const serapanDiv = d.a > 0 ? (d.t / d.a) * 100 : 0;

          return (
            <React.Fragment key={div}>

              {/* ================= DIVISI LEVEL 1 ================= */}
              <tr
                onClick={() => setExpandedDiv(openDiv ? null : div)}
                style={{
                  background: "#f1f5f9",
                  fontWeight: 800,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#dde7e2";
                }}
              >
                <td style={tdStyle}>
                  {openDiv ? "▼" : "▶"} {div}
                </td>
                <td style={tdRight}>{format(d.a)}</td>
                <td style={tdRight}>{format(d.um)}</td>
                <td style={tdRight}>{format(d.b)}</td>
                <td style={tdRight}>{format(d.t)}</td>
                <td style={tdRight}>{format(d.a - d.t)}</td>
                <td style={{ ...tdCenter, color: serapanDiv < 70 ? "#dc2626" : "#006837" }}>
                  {serapanDiv.toFixed(1)}%
                </td>
              </tr>

              {/* ================= ORGAN LEVEL 2 ================= */}
              {openDiv &&
                Object.entries(d.organs || {}).map(([org, o]: any) => {
                  const serapanOrg = o.a > 0 ? (o.t / o.a) * 100 : 0;

                  return (
                    <React.Fragment key={org}>

                      <tr
                        style={{ background: "#ffffff", fontWeight: 500, color: "#334155", cursor: "default" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = THEME.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#dde7e2";
                        }}
                      >
                        <td style={{ ...tdStyle, paddingLeft: "20px" }}>
                          ↳ {org}
                        </td>
                        <td style={tdRight}>{format(o.a)}</td>
                        <td style={tdRight}>{format(o.um)}</td>
                        <td style={tdRight}>{format(o.b)}</td>
                        <td style={tdRight}>{format(o.t)}</td>
                        <td style={tdRight}>{format(o.a - o.t)}</td>
                        <td style={tdCenter}>
                          {serapanOrg.toFixed(1)}%
                        </td>
                      </tr>

                      {/* ================= SUB PROGRAM LEVEL 3 ================= */}
                      {Object.entries(o.subs || {}).map(([sub, s]: any) => {
                        const serapanSub = s.a > 0 ? (s.t / s.a) * 100 : 0;

                        return (
                          <React.Fragment key={sub}>
                          <tr
                            onClick={() =>
                              setExpandedSub(prev => ({
                                ...prev,
                                [sub]: !prev[sub]
                              }))
                            }
                            style={{
                              background: "#fcfcfd",
                              cursor: "pointer",
                              fontWeight: 500
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = THEME.primaryHover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "#dde7e2")}>
                          
                            <td style={{ ...tdStyle, paddingLeft: "40px" }}>
                              {expandedSub[sub] ? "▼" : "▶"} {sub}
                            </td>
                            <td style={tdRight}>{format(s.a)}</td>
                            <td style={tdRight}>{format(s.um)}</td>
                            <td style={tdRight}>{format(s.b)}</td>
                            <td style={tdRight}>{format(s.t)}</td>
                            <td style={tdRight}>{format(s.a - s.t)}</td>
                            <td style={tdCenter}>{serapanSub.toFixed(1)}%</td>
                          </tr>
                            {/* ================= AKUN BUDGET LEVEL 4 ================= */}
                            {expandedSub[sub] &&
                              Object.entries(s.akuns || {}).map(([akun, a]: any) => {
                                const serapanAkun = a.a > 0 ? (a.t / a.a) * 100 : 0;

                                return (
                                  <tr
                                    key={akun}
                                    style={{
                                      background: "#ffffff", fontWeight: 400, color: THEME.textSoft, cursor: "default"
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background = THEME.primaryHover)
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = "#dde7e2")
                                    }
                                  >
                                    <td style={{ ...tdStyle, paddingLeft: "60px", color: THEME.textSoft }}>
                                      ▸ {akun}
                                    </td>
                                    <td style={tdRight}>{format(a.a)}</td>
                                    <td style={tdRight}>{format(a.um)}</td>
                                    <td style={tdRight}>{format(a.b)}</td>
                                    <td style={tdRight}>{format(a.t)}</td>
                                    <td style={tdRight}>{format(a.a - a.t)}</td>
                                    <td style={tdCenter}>{serapanAkun.toFixed(1)}%</td>
                                  </tr>
                                );
                              })}
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
            background: THEME.primary,
            color: "#fff",
            fontWeight: 800,
            borderTop: "2px solid #334155"
          }}
        >
          <td style={{ ...tdStyle, fontWeight: 600 }}>
            GRAND TOTAL
          </td>

          <td style={tdRight}>{format(grandTotal.a)}</td>
          <td style={tdRight}>{format(grandTotal.um)}</td>
          <td style={tdRight}>{format(grandTotal.b)}</td>
          <td style={tdRight}>{format(grandTotal.t)}</td>
          <td style={tdRight}>{format(grandTotal.a - grandTotal.t)}</td>

          <td style={{ ...tdCenter, fontWeight: 800 }}>
            {totalSerapan.toFixed(1)}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)}

{activeTab === "reportDD" && (
  <div style={{ width: "100%", overflowX: "auto" }}>
    <h3 style={{ fontSize: "16px", color: "#006837", marginBottom: "20px", fontWeight: "700" }}>
      Report Dompet Dhuafa
    </h3>

    {/* ================= KPI ================= */}
    <div
      style={{
        display: "flex",
        gap: "10px",
        minWidth: "max-content",
        marginBottom: "15px"
      }}
    >
      <StatCard title="Anggaran" value={format(grandTotal.a)} />
      <StatCard title="UM" value={format(grandTotal.um)} color="#0284c7" />
      <StatCard title="Beban" value={format(grandTotal.b)} color="#f59e0b" />
      <StatCard title="Total Trx" value={format(grandTotal.t)} />
      <StatCard title="Saldo" value={format(grandTotal.a - grandTotal.t)} color="#dc2626" />
      <StatCard title="Serapan" value={getSerapan(grandTotal.t, grandTotal.a)} color="#006837" />
    </div>

    {/* ================= KPI TAHUNAN ================= */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        marginBottom: "25px"
      }}
    >
      <StatCard title="Anggaran Tahunan" value={format(totalAnggaranTahunan)} />
      <StatCard title="Transaksi Tahunan" value={format(totalTransaksiTahunan)} color="#0284c7" />
      <StatCard
        title="Saldo Tahunan"
        value={format(totalSaldoTahunan)}
        color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"}
      />
      <StatCard
        title="Serapan Tahunan"
        value={`${serapanTahunan.toFixed(1)}%`}
        color={serapanTahunan > 100 ? "#dc2626" : "#006837"}
      />
    </div>

    {/* ================= ASNAF + PIE ================= */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "20px",
        marginBottom: "30px"
      }}
    >
      <div style={{ flex: 2 }}>
        <p style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "8px" }}>
          Distribusi Asnaf
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
          {Object.entries(asnafMap).map(([k, v]: any) => (
            <StatCard key={k} title={k} value={format(v)} color="#10b981" />
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: "#fff",
          padding: "15px",
          borderRadius: "12px",
          border: "1px solid #f1f5f9"
        }}
      >
        <p style={{ fontSize: "11px", fontWeight: "bold", textAlign: "center" }}>
          Prog vs Ops
        </p>

        <div style={{ width: "100%", height: "200px", minWidth: "220px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                label={(entry: any) => `${(entry.percent * 100).toFixed(0)}%`}
              >
                <Cell fill="#006837" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* ================= TABLE ================= */}
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ minWidth: "900px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px"
          }}
        >
          <thead>
            <tr>
              <th style={thStickyStyle}>Struktur / Akun DD</th>
              <th style={thStickyStyle}>Anggaran</th>
              <th style={thStickyStyle}>UM</th>
              <th style={thStickyStyle}>Beban</th>
              <th style={thStickyStyle}>Total</th>
              <th style={thStickyStyle}>Saldo</th>
              <th style={{ ...thStickyStyle, textAlign: "center" }}>%</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(treeDD).map(([akunDD, d]: any) => {
              const openDD = expandedDD === akunDD;
              const serapanDD = d.a > 0 ? (d.t / d.a) * 100 : 0;

              return (
                <React.Fragment key={akunDD}>
                  {/* LEVEL 1 */}
                  <tr
                    onClick={() => {
                      setExpandedDD(openDD ? null : akunDD);
                      setExpandedProg(null);
                    }}
                    style={{ background: "#f1f5f9", fontWeight: 700, cursor: "pointer" }}
                  >
                   <td style={{ ...tdStyle, ...stickyCol(0), background: "#f1f5f9" }}>
                      {openDD ? "▼" : "▶"} {akunDD}
                    </td>
                    <td style={tdRight}>{format(d.a)}</td>
                    <td style={tdRight}>{format(d.um)}</td>
                    <td style={tdRight}>{format(d.b)}</td>
                    <td style={tdRight}>{format(d.t)}</td>
                    <td style={tdRight}>{format(d.a - d.t)}</td>
                    <td style={{ ...tdCenter, color: serapanDD < 70 ? "#dc2626" : "#006837" }}>
                      {serapanDD.toFixed(1)}%
                    </td>
                  </tr>

                  {/* LEVEL 2 */}
                  {openDD &&
                    Object.entries(d.programsDD).map(([prog, p]: any) => {
                      const openProg = expandedProg === prog;
                      const serapanProg = p.a > 0 ? (p.t / p.a) * 100 : 0;

                      return (
                        <React.Fragment key={prog}>
                          <tr
                            onClick={() => setExpandedProg(openProg ? null : prog)}
                            style={{ cursor: "pointer" }}
                          >
                            <td style={{ ...tdStyle, ...stickyCol(0), paddingLeft: "20px" }}>
                              {openProg ? "▼" : "▶"} {prog}
                            </td>
                            <td style={tdRight}>{format(p.a)}</td>
                            <td style={tdRight}>{format(p.um)}</td>
                            <td style={tdRight}>{format(p.b)}</td>
                            <td style={tdRight}>{format(p.t)}</td>
                            <td style={tdRight}>{format(p.a - p.t)}</td>
                            <td style={tdCenter}>{serapanProg.toFixed(1)}%</td>
                          </tr>

                          {/* LEVEL 3 */}
                          {openProg &&
                            Object.entries(p.akunBudget).map(([akun, a]: any) => {
                              const serapanAkun = a.a > 0 ? (a.t / a.a) * 100 : 0;

                              return (
                                <tr key={akun}>
                                  <td style={{ ...tdStyle, paddingLeft: "40px" }}>• {akun}</td>
                                  <td style={tdRight}>{format(a.a)}</td>
                                  <td style={tdRight}>{format(a.um)}</td>
                                  <td style={tdRight}>{format(a.b)}</td>
                                  <td style={tdRight}>{format(a.t)}</td>
                                  <td style={tdRight}>{format(a.a - a.t)}</td>
                                  <td style={tdCenter}>{serapanAkun.toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* GRAND TOTAL */}
            <tr style={{ background: THEME.primary,
            color: "#fff", fontWeight: "bold" }}>
              <td style={tdStyle}>GRAND TOTAL</td>
              <td style={tdRight}>{format(grandTotal.a)}</td>
              <td style={tdRight}>{format(grandTotal.um)}</td>
              <td style={tdRight}>{format(grandTotal.b)}</td>
              <td style={tdRight}>{format(grandTotal.t)}</td>
              <td style={tdRight}>{format(grandTotal.a - grandTotal.t)}</td>
              <td style={tdCenter}>{totalSerapan.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
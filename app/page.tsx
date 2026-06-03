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
  <div
    className="stat-card hoverable"
    style={{
      background: THEME.bg,
      padding: "18px",
      borderRadius: "12px",
      border: `1px solid ${THEME.border}`,
      boxShadow: THEME.shadow,
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      minWidth: "120px",
      flex: "1",
      fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      color: THEME.text
    }}
  >
    <span style={{ fontSize: "11px", fontWeight: 600 }}>{title}</span>
    <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
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
  const [jenisDana, setJenisDana] = useState<string[]>([]);
  const [showJenisDana, setShowJenisDana] = useState(false);
  const [selectedBulan, setSelectedBulan] = useState<string[]>([]);
  const [showBulan, setShowBulan] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUMModal, setShowUMModal] = useState(false);
  const [expandedDD, setExpandedDD] = useState<string[]>([]);
  const [expandedProg, setExpandedProg] = useState<string[]>([]);
  const [expandedDiv, setExpandedDiv] = useState<string | null>(null);
  const [isPrint, setIsPrint] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>({});
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [monitoringUM, setMonitoringUM] = useState<any[]>([]);
  // const dataQuery = data?.data?.dataQuery || [];
  const [dataQuery, setDataQuery] = useState<any[]>([]);
  const cleanMonitoringUM = monitoringUM.filter((row: any) => {
  const noDesi = String(row["No Desi"] || "").trim();

  const outstanding =
    Number(String(row["Outstanding"] || "0").replace(/[^\d.-]/g, "")) || 0;

  return noDesi !== "" && outstanding > 0;
});

const filteredMonitoringUM = cleanMonitoringUM.filter((row: any) =>
  jenisDana.length === 0 ||
  jenisDana.includes(
    String(row["Jenis Dana"] || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
  )
);

const overdueMonitoringUM = filteredMonitoringUM.filter((row: any) =>
  String(row["Status"] || "").toLowerCase().includes("terlambat")
);

  


useEffect(() => {
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  if (!isLoggedIn) {
    window.location.href = "/login";
    return;
  }

  fetch("/api/sheets")
    .then((res) => res.json())
    .then((res) => {
      setData(res?.dataQuery ?? []);
      setDataQuery(res?.dataQuery ?? []);
      setMonitoringUM(res?.monitoringUM ?? []);
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

// ✅ NORMALIZE TEXT
const cleanText = (val: any) =>
  String(val || "")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const formatLabel = (text: string) =>
  text.replace(/\b\w/g, (c) =>
    c.toUpperCase()
  );

// ==============================
// MULTI SELECT JENIS DANA
// ==============================

// ✅ HANDLE CHECKBOX
const handleJenisDanaChange = (value: string) => {
  setJenisDana((prev) =>
    prev.includes(value)
      ? prev.filter((v) => v !== value)
      : [...prev, value]
  );
};


// ==============================
// DETEKSI DATA INVALID
// ==============================

const invalidJenisDana = dataQuery.filter(
  (d: any) => {
    const val = cleanText(d["Jenis Dana"]).toLowerCase();

    return (
      !val ||
      val === "-" ||
      val === "*" ||
      val === "#n/a" ||
      val === "0" ||
      val === "na" ||
      val === "null"
    );
  }
);
const totalInvalidJenisDana =
  invalidJenisDana.length;

  

// ==============================
// FILTER TABLE & CHART
// ==============================

const filtered = dataQuery.filter((d: any) =>
  (tahun === "All" ||
    String(d.Tahun) === tahun) &&

  (
    jenisDana.length === 0 ||
    jenisDana.includes(
      cleanText(d["Jenis Dana"])
    )
  ) &&

  (
    selectedBulan.length === 0 ||
    selectedBulan.includes(
      String(d.Bulan)
    )
  )
);

// ==============================
// UNIQUE JENIS DANA
// ==============================

const uniqueJenisDana = Array.from(
  new Map(
    dataQuery
      .filter((d: any) => {
        const total =
          parse(d["Anggaran Tahunan"]) +
          parse(d["UM Bulan"]) +
          parse(d["Beban Bulan"]);

        return total > 0;
      })

      .map((d: any) => {
        const original = String(
          d["Jenis Dana"] || ""
        ).trim();

        const clean = original
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        return [clean, original] as const;
      })

      .filter(([clean]) =>
        clean &&
        clean !== "-" &&
        clean !== "*" &&
        clean !== "#n/a" &&
        clean !== "0" &&
        clean !== "na" &&
        clean !== "null"
      )
  ).values()
).sort();
// ==============================
// TREND BULANAN
// ==============================

const trendBulanan = Object.values(
  filtered.reduce((acc: any, d: any) => {
    const bulan = Number(d.Bulan);

    if (!bulan) return acc;

    if (!acc[bulan]) {
      acc[bulan] = {
        name: `Bulan ${bulan}`,
        bulan,
        anggaran: 0,
        realisasi: 0,
      };
    }

    // ✅ ANGGARAN
    const nilaiAnggaran =
      parse(
        d["Anggaran Bulanan"] ||
        d["Anggaran"]
      );

    // ✅ REALISASI
    const nilaiRealisasi =
      parse(d["UM Bulan"]) +
      parse(d["Beban Bulan"]);

    acc[bulan].anggaran += nilaiAnggaran;
    acc[bulan].realisasi += nilaiRealisasi;

    return acc;
  }, {})
).sort(
  (a: any, b: any) =>
    a.bulan - b.bulan
);

// ==============================
// KPI LOGIC (YTD)
// ==============================

// ambil bulan terbesar
const maxBulan =
  selectedBulan.length > 0
    ? Math.max(
        ...selectedBulan.map(Number)
      )
    : 12;

// ==============================
// FILTER YTD
// ==============================

const filteredYTD = dataQuery.filter((d: any) =>
  (tahun === "All" ||
    String(d.Tahun) === tahun) &&

  (
      jenisDana.includes(
    String(d["Jenis Dana"] || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
    )
  ) &&

  Number(d.Bulan) <= maxBulan
);

// ==============================
// FILTER FULL YEAR
// ==============================

const filteredFullYear = dataQuery.filter((d: any) =>
  (tahun === "All" ||
    String(d.Tahun) === tahun) &&

  (
    jenisDana.length === 0 ||
    jenisDana.includes(
  String(d["Jenis Dana"] || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
)
  )
);

// ==============================
// KPI TAHUNAN (YTD)
// ==============================

// total anggaran tahunan
const totalAnggaranTahunan =
  filteredFullYear.reduce(
    (acc, d) =>
      acc +
      parse(d["Anggaran Tahunan"]),
    0
  );

// total transaksi
const totalTransaksiTahunan =
  filteredYTD.reduce(
    (acc, d) =>
      acc +
      parse(d["UM Bulan"]) +
      parse(d["Beban Bulan"]),
    0
  );

// saldo
const totalSaldoTahunan =
  totalAnggaranTahunan -
  totalTransaksiTahunan;

// serapan
const serapanTahunan =
  totalAnggaranTahunan > 0
    ? (
        totalTransaksiTahunan /
        totalAnggaranTahunan
      ) * 100
    : 0;

// ==============================
// DROPDOWN UI
// ==============================

<div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    
  }}
>
  {/* CHECKBOX LIST */}
  {uniqueJenisDana.map((item: any) => {
  const cleanValue = item
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const formattedItem = item.replace(/^(\d+\.)\s*/, "$1   ");

  return (
    <label
        key={cleanValue}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "11.5px",
          fontWeight: 400,
          color: "#334155",
          lineHeight: "1",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
      <input
        type="checkbox"
        checked={jenisDana.includes(cleanValue)}
        onChange={() =>
          handleJenisDanaChange(cleanValue)
        }
        style={{ 
            cursor: "pointer",
            margin: 0,
            transform: "scale(0.95)" // ✨ Mengecilkan sedikit ukuran kotak ceklis agar proporsional dengan font
          }}
      />
      {/* 💡 Menggunakan teks yang sudah diformat spasinya */}
        <span style={{ display: "inline-block" }}>
          {formattedItem}
        </span>
      </label>
  );
})}
</div>

  {/* WARNING INVALID */}
  {totalInvalidJenisDana > 0 && (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 10,
        background: "#FEF3C7",
        color: "#92400E",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      ⚠ {totalInvalidJenisDana} data tanpa jenis dana
    </div>
  )}

    const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const agingUMList = overdueMonitoringUM.reduce((acc: any, curr: any) => {
  const sub = String(curr["Sub Program"] || "N/A").trim();

  const outstanding =
    Number(String(curr["Outstanding"] || "0").replace(/[^\d.-]/g, "")) || 0;

  const umurText = String(curr["Umur UM (Bulan)"] || "0");
  const aging = Number(umurText.replace(/[^\d.-]/g, "")) || 0;

  if (!acc[sub]) {
    acc[sub] = {
      total: 0,
      aging,
    };
  }

  acc[sub].total += outstanding;
  acc[sub].aging = Math.max(acc[sub].aging, aging);

  return acc;
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

const totalSerapan =
  totalAll.a > 0
    ? (totalAll.t / totalAll.a) * 100
    : 0;
// ==============================
// SERAPAN TOTAL
// ==============================

// PARSER ANGKA
const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === "") return 0;

  // kalau sudah number
  if (typeof val === "number") return val;

  // ubah ke string
  let str = String(val).trim();

  // hapus Rp dan spasi
  str = str.replace(/Rp/gi, "").replace(/\s/g, "");

  // format indo: 1.234.567,89
  str = str.replace(/\./g, "").replace(/,/g, ".");

  const num = Number(str);

  return isNaN(num) ? 0 : num;
};

// DEBUG
console.log("filtered", filtered);
console.log("sample row", filtered?.[0]);

console.log(
  "keys:",
  filtered?.[0] ? Object.keys(filtered[0]) : []
);

console.log(
  "preview:",
  filtered?.slice(0, 5).map((d: any) => ({
    kategori: d["Program/Operasional"],
    um: d["UM Bulan"],
    beban: d["Beban Bulan"],
    umParsed: parseNumber(d["UM Bulan"]),
    bebanParsed: parseNumber(d["Beban Bulan"]),
  }))
);

// ==============================
// PIE DATA
// ==============================

const pieData = [
  {
    name: "Program",
    value: filtered
      .filter((d: any) =>
        String(d["Program/Operasional"] || "")
          .toLowerCase()
          .includes("program")
      )
      .reduce((sum: number, d: any) => {
        return (
          sum +
          parseNumber(d["UM Bulan"]) +
          parseNumber(d["Beban Bulan"])
        );
      }, 0),
  },

  {
    name: "Operasional",
    value: filtered
      .filter((d: any) =>
        String(d["Program/Operasional"] || "")
          .toLowerCase()
          .includes("operasional")
      )
      .reduce((sum: number, d: any) => {
        return (
          sum +
          parseNumber(d["UM Bulan"]) +
          parseNumber(d["Beban Bulan"])
        );
      }, 0),
  },
];

console.log("PIE DATA =", pieData);

// ==============================
// TOTAL PIE
// ==============================

const totalPie = pieData.reduce(
  (sum, item) => sum + item.value,
  0
);

// ==============================
// FORMAT RUPIAH
// ==============================

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
};

<>
  {/* PIE CHART */}
  <div
    style={{
      width: "100%",
      display: "flex",
      justifyContent: "center",
    }}
  >
    <PieChart width={420} height={320}>
      <Pie
        data={pieData}
        dataKey="value"
        cx="50%"
        cy="45%"
        innerRadius={45}
        outerRadius={75}
        paddingAngle={5}
        label={({ value }: any) => {
          const percentage =
            totalPie > 0
              ? ((value / totalPie) * 100).toFixed(1)
              : "0";

          return `${percentage}%`;
        }}
      >
        {pieData.map((entry, index) => (
          <Cell
            key={`cell-${index}`}
            fill={index === 0 ? "#00873E" : "#F59E0B"}
          />
        ))}
      </Pie>

      <Tooltip
        formatter={(value: any) =>
          formatRupiah(Number(value))
        }
      />
    </PieChart>
  </div>

  {/* LEGEND */}
  <div
    style={{
      background: "#F3F4F6",
      borderRadius: 16,
      padding: "16px 20px",
      marginTop: 16,
    }}
  >
    {pieData.map((item, index) => {
      const percentage =
        totalPie > 0
          ? ((item.value / totalPie) * 100).toFixed(1)
          : "0";

      return (
        <div
          key={item.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background:
                  index === 0
                    ? "#00873E"
                    : "#F59E0B",
              }}
            />

            <div
              style={{
                fontWeight: 600,
                color: "#334155",
              }}
            >
              {item.name}

              <span
                style={{
                  marginLeft: 8,
                  color: "#94A3B8",
                  fontWeight: 500,
                }}
              >
                ({percentage}%)
              </span>
            </div>
          </div>

          <div
            style={{
              fontWeight: 700,
              color:
                index === 0
                  ? "#00873E"
                  : "#F59E0B",
            }}
          >
            {formatRupiah(item.value)}
          </div>
        </div>
      );
    })}
  </div>
</>

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

const stickyLeft = (left: number): CSSProperties => ({
  position: "sticky",
  left,
  background: "inherit",
  zIndex: 3,
  borderRight: "1px solid #e2e8f0"
});

const thStickyStyle: CSSProperties = {
  ...thStyle,
  position: "sticky",
  top: 0,
  background: THEME.primarySoft,
  zIndex: 2, // turunin dari 10
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

const stickyCol = (left: number, enabled: boolean = true): CSSProperties => {
  if (!enabled) {
    return {
      position: "static",
      left: "auto",
      background: "#f9fafb",
      zIndex: "auto",
      borderRight: "1px solid #e2e8f0"
    };
  }

  return {
    position: "sticky",
    left,
    background: "#f9fafb",
    zIndex: 3,
    borderRight: "1px solid #e2e8f0"
  };
};

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
          position: relative;
          z-index: 1;
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

        .table-wrapper-summary {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: #fff;
          border-radius: 8px;
        }

        .table-wrapper-detail {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: #fff;
          border-radius: 8px;
        }

        .table-wrapper-report {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          background: #fff;
          border-radius: 8px;
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
        transition: all 0.15s ease;
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

      .table-hover-row {
        transition: background 0.15s ease;
      }

      .table-hover-row:hover {
        background: #eefaf3 !important;
      }
      
      .table-wrapper-report table {
        position: relative;
        z-index: 100;
      }

      .table-row {
        transition: background 0.15s ease, transform 0.1s ease;
      }
      
      .table-row td {
        background: transparent;
      }

      .table-row:hover {
        background: #e6f4ea;
        transition: 0.15s ease;
      }

      :root {
        --primary-hover: #e6f4ea;
      }
      
      .card:hover {
        background: #10b981;
      }

      .kpi-wrapper {
        display: flex;
        gap: 10px;
        flex-wrap: wrap; /* ini kunci */
      }

      /* mobile */
      @media (max-width: 768px) {
        .kpi-wrapper {
          flex-direction: column;
          gap: 8px;
        }

        .kpi-wrapper > div {
          width: 100%;
        }
      
        .stat-card {
          flex: 1;
          min-width: 160px;
        }

        @media (max-width: 768px) {
          .stat-card {
            width: 100%;
            min-width: 100%;
          }
        }
        
        .kpi-container {
          display: flex;
          gap: 12px;
          flex-wrap: nowrap;   /* penting: jangan turun ke bawah */
          overflow-x: auto;    /* kalau sempit, bisa scroll samping */
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
          
          .asnaf-wrapper {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: nowrap;
            align-items: flex-start;
          }

          /* PIE */
          .asnaf-left {
            flex: 1;
            min-width: 280px;
          }

          /* KPI / GRID */
          .asnaf-right {
            flex: 2;
            min-width: 300px;
          }

          .asnaf-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          /* GRID CARD */
          .asnaf-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
          }

          /* MOBILE RESPONSIVE */
          @media (max-width: 768px) {
            .asnaf-wrapper {
              flex-direction: column;
            }

            .asnaf-left,
            .asnaf-right {
              width: 100%;
            }
          }
            /* =========================
              FIXED KPI LAYOUT
            ========================= */
            .genesis-kpi {
              display: flex;
              gap: 12px;
              flex-direction: row; /* Paksa horizontal di desktop */
              flex-wrap: nowrap;   /* Jangan turun di desktop */
              overflow-x: auto;    /* Bisa scroll jika layar tanggung */
              margin-bottom: 20px;
            }

            .genesis-kpi > div {
              flex: 1;             /* Biar lebar kartu sama rata */
              min-width: 150px;    /* Batas minimum agar teks tidak kepotong */
            }

            /* RESPONSIVE: Hanya aktif di layar HP */
            @media (max-width: 768px) {
              .genesis-kpi {
                flex-direction: column; /* Menurun di mobile */
                flex-wrap: nowrap;
                overflow-x: hidden;
              }

              .genesis-kpi > div {
                width: 100%;       /* Full width di mobile */
                min-width: 100%;
                flex: none;
              }
            }
              body {
              cursor: default;
            }

            .clickable {
              cursor: pointer;
            }

            .hoverable {
              transition: all 0.15s ease;
            }

            .hoverable:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }

            .stat-card {
              transition: all 0.15s ease;
              cursor: pointer;
            }

            .stat-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 6px 18px rgba(0,0,0,0.08);
            }

           .table-wrapper-report {
            position: relative !important;
            z-index: 99999 !important;
            isolation: isolate;
          }
            
           .table-wrapper-report tbody tr:hover td {
            background: #e6f4ea !important;
          }

          .kpi-container {
            pointer-events: none !important;
          }
        
          .recharts-wrapper {
            pointer-events: none !important;
          }

          .table-wrapper-report tbody tr:hover td {
            background: #e6f4ea !important;
          }
 

            
      `}</style>
      
      {showUMModal && (
  <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
    <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", width: "560px", maxWidth: "92%" }}>
      <h3 style={{ fontSize: "16px", color: "#b91c1c", marginBottom: "15px" }}>
        Detail UM Menggantung
      </h3>

      <div style={{ maxHeight: "420px", overflowY: "auto" }}>
        {Object.entries(agingUMList).map(([sub, info]: any) => {
          const cleanText = (v: any) =>
            String(v || "")
              .toLowerCase()
              .replace(/\s+/g, " ")
              .trim();

          const details = overdueMonitoringUM.filter((row: any) =>
            cleanText(row["Sub Program"]) === cleanText(sub)
          );

          const isOpen = expandedSub[sub];

          return (
            <div key={sub} style={{ borderBottom: `1px solid ${THEME.primarySoft}`, padding: "8px 0" }}>
              <div
                onClick={() =>
                  setExpandedSub((prev) => ({
                    ...prev,
                    [sub]: !prev[sub],
                  }))
                }
                style={{ display: "flex", justifyContent: "space-between", gap: "10px", cursor: "pointer", fontSize: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold" }}>
                    {isOpen ? "▼" : "▶"} {sub}
                  </div>
                  <div style={{ fontSize: "10px", color: "#ef4444" }}>
                    Keterlambatan: {info.aging} bulan • {details.length} transaksi
                  </div>
                </div>

                <span style={{ fontWeight: "bold", marginLeft: "10px", whiteSpace: "nowrap" }}>
                  {format(info.total)}
                </span>
              </div>

              {isOpen && (
                <div style={{ marginTop: "8px", background: "#f8fafc", borderRadius: "8px", padding: "8px" }}>
                  {details.length === 0 ? (
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Detail No Desi belum ditemukan.
                    </div>
                  ) : (
                    details.map((row: any, idx: number) => (
                      <div
                        key={`${row["No Desi"]}-${idx}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 1fr 100px 70px",
                          gap: "6px",
                          padding: "6px 0",
                          borderBottom: idx === details.length - 1 ? "none" : "1px solid #e2e8f0",
                          fontSize: "11px",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{row["No Desi"]}</div>
                        <div>{row["PIC"]}</div>
                        <div style={{ textAlign: "right", fontWeight: 700 }}>
                          {format(Number(String(row["Outstanding"] || "0").replace(/[^\d.-]/g, "")) || 0)}
                        </div>
                        <div style={{ textAlign: "right", color: "#ef4444" }}>
                          {row["Umur UM (Bulan)"]}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowUMModal(false)} style={{ width: "100%", marginTop: "20px", padding: "10px", background: "#006837", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
        Tutup
      </button>
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
          <div style={{ position: "relative" }}>
  <label
    style={{
      display: "block",
      fontSize: "11px",
      fontWeight: "bold",
      color: "#475569",
      marginBottom: "4px"
    }}
  >
    Jenis Dana
  </label>

  <button
    onClick={() => setShowJenisDana(!showJenisDana)}
    style={{
      padding: "8px 12px",
      borderRadius: "6px",
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontSize: "12px",
      minWidth: "180px",
      textAlign: "left"
    }}
  >
    {jenisDana.length === 0
      ? "Semua Jenis Dana"
      : `${jenisDana.length} Jenis Dana`} ▼
  </button>

  {showJenisDana && (
    <div
      style={{
        position: "absolute",
        zIndex: 10,
        background: "#fff",
        border: "1px solid #cbd5e1",
        padding: "10px",
        width: "240px",
        borderRadius: "8px",
        boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
        marginTop: "5px"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        {uniqueJenisDana.map((item: any) => {
          const cleanValue = item
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();

          return (
            <label key={cleanValue}>
              <input
                type="checkbox"
                checked={jenisDana.includes(cleanValue)}
                onChange={() =>
                  handleJenisDanaChange(cleanValue)
                }
              />

              {item}
            </label>
          );
        })}
      </div>

      <button
        onClick={() => setShowJenisDana(false)}
        style={{
          width: "100%",
          marginTop: "12px",
          background: "#006837",
          color: "#fff",
          border: "none",
          padding: "6px",
          borderRadius: "4px"
        }}
      >
        Tutup
      </button>
    </div>
  )}
</div>
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
        style={{ 
          display: "flex", 
          gap: "5px", 
          borderBottom: "2px solid #e2e8f0", // Garis dasar tab
          padding: "0 10px",
          marginTop: "20px"
        }}
      >
        {[
          { id: "summary", label: "Summary", icon: "📊" },
          { id: "detail", label: "Detail", icon: "📝" },
          { id: "reportDD", label: "Report DD", icon: "📊" }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`tab-btn ${activeTab === tab.id ? "tab-active" : "tab-inactive"}`}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              border: "none",
              outline: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "600",
              fontSize: "13px",
              transition: "all 0.2s ease",
              borderRadius: "8px 8px 0 0", // Efek melengkung atas (Folder Look)
              position: "relative",
              bottom: "-2px", // Biar nutupin garis border-bottom pas aktif
              
              
              // --- LOGIKA STYLE AKTIF ---
              backgroundColor: activeTab === tab.id ? "#fff" : "transparent",
              color: activeTab === tab.id ? "#006837" : "#64748b",
              borderTop: activeTab === tab.id ? "3px solid #006837" : "3px solid transparent",
              borderLeft: activeTab === tab.id ? "2px solid #e2e8f0" : "none",
              borderRight: activeTab === tab.id ? "2px solid #e2e8f0" : "none",
              borderBottom: activeTab === tab.id ? "2px solid #fff" : "none",
              boxShadow: activeTab === tab.id ? "0 -4px 6px -1px rgba(0, 0, 0, 0.05)" : "none"
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div className="dashboard-content" style={{ background: "#fff", padding: "20px", borderRadius: "0 12px 12px 12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        
       {activeTab === "summary" && (
  <div className="tab-content-wrapper">
    {/* 1. WARNING SECTION */}
    {Object.keys(agingUMList).length > 0 && (
      <div
        className="warning-um no-print"
        onClick={() => setShowUMModal(true)}
        style={{
          background: "#fef2f2",
          padding: "12px",
          borderRadius: "8px",
          borderLeft: "4px solid #ef4444",
          marginBottom: "15px",
          cursor: "pointer",
        }}
      >
        <h4 style={{ margin: 0, color: "#b91c1c", fontSize: "12px" }}>
          ⚠️ {Object.keys(agingUMList).length} Sub Program memiliki UM Menggantung {">"} 1 Bulan
        </h4>
      </div>
    )}

    {/* 2. KPI SECTION (KOTAK-KOTAK ATAS) */}
    <div className="genesis-kpi" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
      <StatCard title="Anggaran" value={format(grandTotal.a)} color="#0284c7" />
      <StatCard title="UM" value={format(grandTotal.um)} color="#0284c7" />
      <StatCard title="Beban" value={format(grandTotal.b)} color="#0284c7" />
      <StatCard title="Total Trx" value={format(grandTotal.t)} color="#0284c7" />
      <StatCard title="Saldo" value={format(grandTotal.a - grandTotal.t)} color="#0284c7" />
      <StatCard title="Serapan" value={getSerapan(grandTotal.t, grandTotal.a)} color="#0284c7" />
    </div>

        <div
      className="genesis-kpi"
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        marginBottom: "20px",
      }}
    >
      <StatCard
        title="Anggaran Tahunan"
        value={format(totalAnggaranTahunan)}
      />

      <StatCard
        title={`Transaksi YTD (s.d Bln ${maxBulan})`}
        value={format(totalTransaksiTahunan)}
      />

      <StatCard
        title="Saldo YTD"
        value={format(totalSaldoTahunan)}
        color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"}
      />

      <StatCard
        title="Serapan YTD"
        value={`${serapanTahunan.toFixed(1)}%`}
        color={
          "#070707"
        }
      />

      {/* KPI BARU — TARGET SERAPAN TAHUNAN */}
      <StatCard
        title={`Target Serapan s.d Bln ${maxBulan} (${(
          (maxBulan / 12) *
          100
        ).toFixed(1)}%)`}
        value={format((maxBulan / 12) * totalAnggaranTahunan)}
        color="#f59e0b"
      />

    </div>

    {/* 3. CHARTS SECTION (BAR & PIE) */}
    <div className="charts-container" style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "20px" }}>
      {/* BAR CHART */}
      <div className="chart-box" style={{ flex: 2, minWidth: "320px", background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>Serapan per Divisi</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.entries(tree).map(([name, d]: any) => ({ name, a: d.a, t: d.t }))}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: any) => format(v)} />
            <Bar dataKey="a" fill="#006837" name="Anggaran" />
            <Bar dataKey="t" fill="#f59e0b" name="Realisasi" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* PIE CHART */}
      <div className="chart-box" style={{ flex: 1, minWidth: "260px", background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "10px" }}>Prog vs Ops</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              label={(e: any) => !e.percent || isNaN(e.percent) ? "0%" : `${(e.percent * 100).toFixed(0)}%`}
            >
              <Cell fill="#006837" />
              <Cell fill="#f59e0b" />
            </Pie>
            <Legend iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* 4. TREND CHART SECTION */}
    <div className="chart-box trend-chart" style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
      <h4 style={{ fontSize: "11px", textAlign: "center", marginBottom: "15px" }}>Trend Anggaran vs Realisasi Bulanan</h4>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={trendBulanan}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: any) => format(v)} />
          <Legend wrapperStyle={{ fontSize: "10px" }} />
          <Area type="monotone" dataKey="realisasi" stroke="#f59e0b" fill="#fef3c7" name="Realisasi" />
          <Bar dataKey="anggaran" barSize={20} fill="#006837" name="Anggaran" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    {/* 5. TABLE SUMMARY SECTION */}
<div className="table-wrapper-summary">
  <table
    style={{
      width: "100%",
      minWidth: "900px",
      borderCollapse: "collapse",
      fontSize: "11px"
    }}
  >
    <thead>
      <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
        <th style={{ ...thStickyStyle, textAlign: "left", padding: "12px" }}>Struktur</th>
        <th style={thStickyStyle}>Anggaran</th>
        <th style={thStickyStyle}>UM</th>
        <th style={thStickyStyle}>Beban</th>
        <th style={thStickyStyle}>Total</th>
        <th style={thStickyStyle}>Saldo</th>
        <th style={{ ...thStickyStyle, textAlign: "center" }}>%</th>
      </tr>
    </thead>

    <tbody>
      {/* LOOPING DATA DIVISI */}
      {Object.entries(tree).map(([div, d]: any) => {
        const isExpanded = expandedDiv === div;
        const serapanDiv = d.a > 0 ? (d.t / d.a) * 100 : 0;

        return (
          <React.Fragment key={div}>

            {/* ================= DIVISI ROW ================= */}
            <tr
              onClick={() => setExpandedDiv(isExpanded ? null : div)}
                style={{
                background: "#f1f5f9",
                fontWeight: 800,
                cursor: "pointer",
                borderBottom: "1px solid #e2e8f0"
              }}
            >
              <td style={{ ...tdStyle, padding: "10px" }}>
                {isExpanded ? "▼" : "▶"} {div}
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

            {/* ================= ORGAN ROW ================= */}
            {isExpanded &&
              Object.entries(d.organs || {}).map(([org, o]: any) => (
                <tr
                  key={org}
                  {...rowHover("#ffffff", "#eefaf3")}
                  style={{
                    borderBottom: "1px solid #f1f5f9"
                  }}
                >
                  <td style={{ ...tdStyle, paddingLeft: "30px", color: "#64748b" }}>
                    ↳ {org}
                  </td>
                  <td style={tdRight}>{format(o.a)}</td>
                  <td style={tdRight}>{format(o.um)}</td>
                  <td style={tdRight}>{format(o.b)}</td>
                  <td style={tdRight}>{format(o.t)}</td>
                  <td style={tdRight}>{format(o.a - o.t)}</td>
                  <td style={tdCenter}>
                    {(o.a > 0 ? (o.t / o.a) * 100 : 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
          </React.Fragment>
        );
      })}

      {/* ================= GRAND TOTAL ================= */}
      <tr
        {...rowHover("#006837", "#0a7a45")}
        style={{
          background: "#006837",
          color: "#fff",
          fontWeight: 800
        }}
      >
        <td style={{ ...tdStyle, padding: "12px" }}>GRAND TOTAL</td>
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
)}
{activeTab === "detail" && (
  <div className="table-wrapper-detail">
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        minWidth: "900px",
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
                        {...rowHover("#ffffff", "#eefaf3")}
                        style={{
                          background: "#ffffff",
                          fontWeight: 500,
                          color: "#334155",
                          cursor: "default"
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
                              {...rowHover("#fcfcfd", "#f0fdf4")}
                              style={{
                                background: "#fcfcfd",
                                cursor: "pointer",
                                fontWeight: 500
                              }}
                            >
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
                                    {...rowHover("#ffffff", "#f8fafc")}
                                    style={{
                                      background: "#ffffff",
                                      fontWeight: 400,
                                      color: THEME.textSoft,
                                      cursor: "default"
                                    }}
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

        {/* ================= GRAND TOTAL ================= */}
        <tr
          {...rowHover(THEME.primary, "#0a7a45")}
          style={{
            background: THEME.primary,
            color: "#fff",
            fontWeight: 800,
            borderTop: "2px solid #cbd5e1",
            fontSize: "12px"
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
  <div className="report-dd-wrapper" style={{ width: "100%", padding: "10px" }}>

    <h3 style={{ fontSize: "18px", color: "#006837", marginBottom: "20px", fontWeight: "700" }}>
      Report Dompet Dhuafa
    </h3>

    {/* ================= KPI BULANAN ================= */}
<div className="kpi-responsive-wrapper" style={{ width: "100%", marginBottom: "25px" }}>
  <div
    className="kpi-container"
    style={{
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      width: "100%"
    }}
  >
    {[
      { t: "ANGGARAN", v: grandTotal.a, c: "#0284c7" },

      { t: "UM", v: grandTotal.um, c: "#0284c7" },

      { t: "BEBAN", v: grandTotal.b, c: "#0284c7" },

      { t: "TOTAL TRX", v: grandTotal.t, c: "#0284c7" },

      {
        t: "SALDO",
        v: grandTotal.a - grandTotal.t,
        c: "#0284c7"
      },

      {
        t: "SERAPAN",
        v: getSerapan(grandTotal.t, grandTotal.a),
        c: "#0284c7",
        isPct: true
      }
    ].map((item: any, idx: number) => (
      <div
        key={idx}
        onMouseEnter={() => setHoveredKpi(idx)}
        onMouseLeave={() => setHoveredKpi(null)}
        style={{
          flex: "1 1 calc(16.66% - 12px)",
          minWidth: "160px",
          background: hoveredKpi === idx ? "#f0fdf4" : "#fff",
          padding: "15px",
          borderRadius: "12px",
          border: hoveredKpi === idx ? "1px solid #006837" : "1px solid #e2e8f0",
          boxShadow: hoveredKpi === idx
            ? "0 8px 20px rgba(0,104,55,0.15)"
            : "0 1px 2px rgba(0,0,0,0.05)",
          transform: hoveredKpi === idx ? "scale(1.03)" : "scale(1)",
          transition: "all 0.2s ease-in-out",
          cursor: "pointer"
        }}
      >
        <p
          style={{
            fontSize: "10px",
            color: "#64748b",
            fontWeight: "bold",
            marginBottom: "5px",
            textTransform: "uppercase"
          }}
        >
          {item.t}
        </p>

        <p
          style={{
            fontSize: "14px",
            fontWeight: "800",
            color: item.c,
            margin: 0
          }}
        >
          {item.isPct ? item.v : format(Number(item.v))}
        </p>
      </div>
    ))}
  </div>
</div>

{/* ================= KPI TAHUNAN ================= */}
<div
  className="genesis-kpi"
  style={{
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  }}
>
  <StatCard
    title="Anggaran Tahunan"
    value={format(totalAnggaranTahunan)}
  />

  <StatCard
    title={`Transaksi YTD (s.d Bln ${maxBulan})`}
    value={format(totalTransaksiTahunan)}
  />

  <StatCard
    title="Saldo YTD"
    value={format(totalSaldoTahunan)}
    color={totalSaldoTahunan < 0 ? "#dc2626" : "#111"}
  />

  <StatCard
    title="Serapan YTD"
    value={`${serapanTahunan.toFixed(1)}%`}
    color= { "#111"}
    
  />

  <StatCard
    title={`Target Serapan s.d Bln ${maxBulan} (${(
      (maxBulan / 12) *
      100
    ).toFixed(1)}%)`}
    value={format((maxBulan / 12) * totalAnggaranTahunan)}
    color="#111"
  />
</div>

    {/* ================= ASNAF & CHART ================= */}
    <div className="asnaf-chart-row" style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "25px" }}>

      <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
        <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "15px", color: "#334155" }}>
          Distribusi Asnaf
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(asnafMap).map(([k, v]: any) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 15px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #f1f5f9"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                {k}
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#10b981" }}>
                {format(v)}
              </span>
            </div>
          ))}
        </div>
      </div>

        <div style={{
          flex: "1 1 400px",
          minWidth: "300px",
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <p style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "15px", color: "#334155" }}>
            Proporsi Program vs Operasional
          </p>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Chart Utama */}
            <PieChart width={400} height={250}>
          <Pie
            data={pieData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            // Perbaikan: gunakan props: any untuk menghindari error merah di 'percent'
            label={(props: any) => `${(props.percent * 100).toFixed(0)}%`}
          >
            <Cell fill="#006837" />
            <Cell fill="#f59e0b" />
          </Pie>
          {/* Perbaikan: pastikan value diconvert ke Number sebelum masuk ke format() */}
          <Tooltip formatter={(value: any) => format(Number(value))} />
        </PieChart>

            {/* ================= LEGEND BARU (RAPI & RUPIAH PENUH) ================= */}
            <div style={{
              width: "100%",
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              padding: "15px",
              background: "#f8fafc",
              borderRadius: "10px"
            }}>
              {pieData.map((entry: any, index: number) => {
                const total = pieData[0].value + pieData[1].value;
                const percentage = ((entry.value / total) * 100).toFixed(1);
                const color = index === 0 ? "#006837" : "#f59e0b";

                return (
                  <div key={index} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    fontSize: "12px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: color }} />
                      <span style={{ fontWeight: "700", color: "#475569" }}>{entry.name}</span>
                      <span style={{ color: "#94a3b8" }}>({percentage}%)</span>
                    </div>
                    <div style={{ fontWeight: "800", color: color }}>
                      {format(entry.value)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    {/* ================= TABLE ================= */}
<div className="table-wrapper-report">
  <table
    style={{
      width: "100%",
      minWidth: "900px",
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
        const openDD = expandedDD.includes(akunDD);
        const serapanDD = d.a > 0 ? (d.t / d.a) * 100 : 0;

        return (
          <React.Fragment key={akunDD}>

            <tr
              onClick={() => {
                setExpandedDD(prev =>
                  prev.includes(akunDD)
                    ? prev.filter(item => item !== akunDD)
                    : [...prev, akunDD]
                );
              }}
              style={{
                background: "#f1f5f9",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <td style={tdStyle}>
                {openDD ? "▼" : "▶"} {akunDD}
              </td>

              <td style={tdRight}>{format(d.a)}</td>
              <td style={tdRight}>{format(d.um)}</td>
              <td style={tdRight}>{format(d.b)}</td>
              <td style={tdRight}>{format(d.t)}</td>
              <td style={tdRight}>{format(d.a - d.t)}</td>

              <td
                style={{
                  ...tdCenter,
                  color: serapanDD < 70 ? "#dc2626" : "#006837"
                }}
              >
                {serapanDD.toFixed(1)}%
              </td>
            </tr>

            {openDD &&
              Object.entries(d.programsDD).map(([prog, p]: any) => {
                const openProg = expandedProg.includes(prog);
                const serapanProg = p.a > 0 ? (p.t / p.a) * 100 : 0;

                return (
                  <React.Fragment key={prog}>

                    <tr
                      onClick={() => {
                        setExpandedProg(prev =>
                          prev.includes(prog)
                            ? prev.filter(item => item !== prog)
                            : [...prev, prog]
                        );
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{
                          ...tdStyle,
                          paddingLeft: "20px"
                        }}
                      >
                        {openProg ? "▼" : "▶"} {prog}
                      </td>

                      <td style={tdRight}>{format(p.a)}</td>
                      <td style={tdRight}>{format(p.um)}</td>
                      <td style={tdRight}>{format(p.b)}</td>
                      <td style={tdRight}>{format(p.t)}</td>
                      <td style={tdRight}>{format(p.a - p.t)}</td>

                      <td style={tdCenter}>
                        {serapanProg.toFixed(1)}%
                      </td>
                    </tr>

                    {openProg &&
                      Object.entries(p.akunBudget).map(([akun, a]: any) => (
                        <tr key={akun}>
                          <td
                            style={{
                              ...tdStyle,
                              paddingLeft: "40px"
                            }}
                          >
                            • {akun}
                          </td>

                          <td style={tdRight}>{format(a.a)}</td>
                          <td style={tdRight}>{format(a.um)}</td>
                          <td style={tdRight}>{format(a.b)}</td>
                          <td style={tdRight}>{format(a.t)}</td>
                          <td style={tdRight}>{format(a.a - a.t)}</td>

                          <td style={tdCenter}>
                            {(a.a > 0 ? (a.t / a.a) * 100 : 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
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
          fontWeight: 800
        }}
      >
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
)}
</div>
</div>
)}
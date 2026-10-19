import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";

const STATUS_COLORS = {
  Done: "#10b981",
  Progress: "#f59e0b",
  Belum: "#94a3b8",
  Total: "#3b82f6",
};

const TICK_STYLE = { fontSize: 12, fill: "#94a3b8" };

export default function MonitoringCharts({ data }) {
  const statusData = useMemo(
    () =>
      ["DONE", "PROGRESS", "BELUM"]
        .map((s) => ({
          name: s === "DONE" ? "Done" : s === "PROGRESS" ? "Progress" : "Belum",
          value: data.filter((t) => t.status === s).length,
        }))
        .filter((d) => d.value > 0),
    [data]
  );

  const byPetugas = useMemo(() => {
    const codes = [...new Set(data.map((t) => t.petugas_kode).filter(Boolean))];
    return codes
      .map((kode) => {
        const items = data.filter((t) => t.petugas_kode === kode);
        return {
          name: (items[0]?.petugas_nama || kode).split(" ")[0],
          Done: items.filter((t) => t.status === "DONE").length,
          Progress: items.filter((t) => t.status === "PROGRESS").length,
          Belum: items.filter((t) => t.status === "BELUM").length,
        };
      })
      .filter((p) => p.Done + p.Progress + p.Belum > 0);
  }, [data]);

  const byDate = useMemo(() => {
    const dates = [...new Set(data.map((t) => t.tanggal).filter(Boolean))].sort().slice(-7);
    return dates.map((d) => {
      const items = data.filter((t) => t.tanggal === d);
      return {
        tanggal: d.slice(5),
        Done: items.filter((t) => t.status === "DONE").length,
        Total: items.length,
      };
    });
  }, [data]);

  if (!data.length) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div className="bg-card rounded-xl shadow p-4">
        <p className="font-semibold text-sm mb-2">Distribusi Status</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={0}
            >
              {statusData.map((d) => (
                <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl shadow p-4">
        <p className="font-semibold text-sm mb-2">Performa per Petugas</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={byPetugas}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.3)" />
            <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} width={28} tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Done" stackId="a" fill={STATUS_COLORS.Done} />
            <Bar dataKey="Progress" stackId="a" fill={STATUS_COLORS.Progress} />
            <Bar dataKey="Belum" stackId="a" fill={STATUS_COLORS.Belum} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl shadow p-4 md:col-span-2">
        <p className="font-semibold text-sm mb-2">Tren Laporan (7 Hari Terakhir)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={byDate}>
            <defs>
              <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={STATUS_COLORS.Total} stopOpacity={0.35} />
                <stop offset="100%" stopColor={STATUS_COLORS.Total} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="doneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={STATUS_COLORS.Done} stopOpacity={0.35} />
                <stop offset="100%" stopColor={STATUS_COLORS.Done} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.3)" />
            <XAxis dataKey="tanggal" tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} width={28} tick={TICK_STYLE} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Total"
              stroke={STATUS_COLORS.Total}
              fill="url(#totalFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Done"
              stroke={STATUS_COLORS.Done}
              fill="url(#doneFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

function bookFormatter(value: ValueType | undefined): [string, string] {
  const n = Number(value ?? 0);
  return [`${n} book${n !== 1 ? "s" : ""}`, ""];
}

interface MonthlyData {
  month: string;
  books: number;
}

interface GenreData {
  genre: string;
  count: number;
}

interface ReadingStatsChartsProps {
  monthlyData: MonthlyData[];
  genreData: GenreData[];
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

export function ReadingStatsCharts({ monthlyData, genreData }: ReadingStatsChartsProps) {
  return (
    <div className="space-y-6">
      {monthlyData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Books per Month</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                formatter={bookFormatter}
              />
              <Bar dataKey="books" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {genreData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Genres Read</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={genreData}
                dataKey="count"
                nameKey="genre"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={35}
              >
                {genreData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                formatter={bookFormatter}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

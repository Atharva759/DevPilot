"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function CoverageChart({
  coverage,
  indexedFiles,
  totalFiles,
}: {
  coverage: number;
  indexedFiles: number;
  totalFiles: number;
}) {
  const rounded = Math.min(100, Math.max(0, Math.round(coverage * 10) / 10));
  const remaining = Math.max(0, 100 - rounded);

  const data = [
    { name: "Indexed", value: rounded },
    { name: "Unindexed", value: remaining },
  ];

  const COLORS = ["#10b981", "#33415525"];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Embedding Coverage</CardTitle>
        <CardDescription>
          Percentage of codebase parsed and stored in pgvector
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="relative size-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={78}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight">{rounded}%</span>
            <span className="text-xs text-muted-foreground mt-0.5">Coverage</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span>Indexed ({indexedFiles})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span>Total ({totalFiles})</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

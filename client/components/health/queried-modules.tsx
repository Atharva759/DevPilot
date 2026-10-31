"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MessageSquare, FolderCode } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueriedModule } from "@/lib/api";

export function QueriedModulesChart({
  modules,
}: {
  modules: QueriedModule[];
}) {
  const chartData = modules.map((m) => ({
    name: m.modulePath.length > 24 ? "…" + m.modulePath.slice(-22) : m.modulePath,
    fullPath: m.modulePath,
    queries: m.queryCount,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Most-Queried Modules</CardTitle>
        <CardDescription>
          Codebase packages most frequently referenced by developers in chat
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center p-4">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageSquare className="size-8 text-muted-foreground/40" />
            <p className="font-medium">No chat citation data yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              As developers ask questions about this repository, frequently consulted modules will appear here.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { fullPath: string; queries: number };
                      return (
                        <div className="rounded-lg border bg-popover p-2 shadow-md text-xs text-popover-foreground">
                          <p className="font-mono font-medium">{data.fullPath}</p>
                          <p className="text-muted-foreground mt-0.5">{data.queries} citations</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="queries" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

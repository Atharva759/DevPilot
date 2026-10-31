"use client";

import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DocGap } from "@/lib/api";

function formatGapType(type: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  switch (type) {
    case "MISSING_README":
      return { label: "Missing README", variant: "destructive" };
    case "MISSING_LICENSE":
      return { label: "Missing License", variant: "destructive" };
    case "MISSING_CONTRIBUTING":
      return { label: "No Contributing Guide", variant: "secondary" };
    case "MISSING_DOCS_DIR":
      return { label: "No Docs Directory", variant: "secondary" };
    case "MODULE_DOC_GAP":
      return { label: "Module Gap", variant: "outline" };
    default:
      return { label: type, variant: "outline" };
  }
}

export function DocGapsTable({ docGaps }: { docGaps: DocGap[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Documentation Gaps</CardTitle>
            <CardDescription>
              Missing documents, setup guides, and undocumented packages
            </CardDescription>
          </div>
          <Badge variant={docGaps.length === 0 ? "secondary" : "destructive"}>
            {docGaps.length} {docGaps.length === 1 ? "gap" : "gaps"} identified
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {docGaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="font-medium">All key documentation present</p>
            <p className="text-xs text-muted-foreground">
              Repository has README, License, Contributing guidelines, and module documentation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">File / Path</TableHead>
                  <TableHead className="w-[160px]">Gap Type</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docGaps.map((gap, idx) => {
                  const badge = formatGapType(gap.gapType);
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{gap.filePath}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant} className="text-[11px] font-normal">
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {gap.description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

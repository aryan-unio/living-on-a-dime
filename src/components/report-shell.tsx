import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ReportShell({
  title, subtitle, rows, filename, children,
}: {
  title: string; subtitle?: string;
  rows: Record<string, unknown>[];
  filename: string;
  children: ReactNode;
}) {
  const exportCSV = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
  };
  const exportXLSX = () => {
    if (!rows.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };
  return (
    <div className="mx-auto max-w-7xl">
      <Button variant="ghost" className="-ml-2 mb-2" asChild>
        <Link to="/reports"><ArrowLeft size={16} /> Back to reports</Link>
      </Button>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={exportCSV}><Download size={14} /> CSV</Button>
          <Button variant="outline" size="sm" disabled={!rows.length} onClick={exportXLSX}><Download size={14} /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
        </div>
      </div>
      <Card><CardContent className="p-0">{children}</CardContent></Card>
    </div>
  );
}

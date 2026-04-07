"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  PackageX,
  Wallet,
  AlertCircle,
  Loader2,
  Search,
  Columns,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ScrollArea } from "@/components/ui/scroll-area";

import { usePermissions } from "@/hooks/use-permissions";
import OrbitDotMotion from "@/components/pixel-perfect/orbit-dot-motion";

// --- TYPES ---
type PredictionData = {
  date: string;
  actual: number | null;
  predicted: number;
};
type InventoryItem = {
  _id: string;
  name: string;
  stock: number;
  unit: string;
  low_stock_threshold: number;
  supplier: string;
};
type InsightsData = {
  top_products: { name: string; sold_last_7_days: number }[];
  predicted_products: { name: string; qty: number }[];
  prep_list: { ingredient: string; qty: number; unit: string }[];
};

export default function DashboardPage() {
  const [chartData, setChartData] = useState<PredictionData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7" | "30">("30");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { hasPermission } = usePermissions();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [predictRes, invRes, insightsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/predict/all`, {
          headers,
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, {
          headers,
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/predict/insights`, {
          headers,
        }),
      ]);

      if (predictRes.status === 401 || invRes.status === 401) {
        toast.error("Session expired. Please log in again");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      if (predictRes.ok && invRes.ok && insightsRes.ok) {
        const pData = await predictRes.json();
        const iData = await invRes.json();
        const insData = await insightsRes.json();

        setChartData(pData);
        setInsights(insData);

        const depleted = iData.filter(
          (item: InventoryItem) =>
            item.stock <= (item.low_stock_threshold || 10),
        );
        setLowStockItems(depleted);
      }
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToCSV = (filename: string, headers: string[], data: any[][]) => {
    if (!data || data.length === 0) return;
    const csvRows = [headers, ...data]
      .map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} downloaded successfully`);
  };

  const handleExportRestock = () => {
    const headers = [
      "Ingredient",
      "Current Stock",
      "Unit",
      "Threshold Limit",
      "Supplier",
      "Status",
    ];
    const data = lowStockItems.map((item) => [
      item.name,
      item.stock,
      item.unit,
      item.low_stock_threshold || 10,
      item.supplier || "Unassigned",
      "Reorder Required",
    ]);
    exportToCSV(
      `Smart_Restock_Alerts_${new Date().toISOString().split("T")[0]}`,
      headers,
      data,
    );
  };

  const handleExportOrders = () => {
    const headers = ["Predicted Product", "Expected Order Quantity"];
    const data =
      insights?.predicted_products?.map((prod) => [prod.name, prod.qty]) || [];
    exportToCSV(
      `Tomorrows_Expected_Orders_${new Date().toISOString().split("T")[0]}`,
      headers,
      data,
    );
  };

  const handleExportPrepList = () => {
    const headers = ["Ingredient Required", "Total Quantity Needed", "Unit"];
    const data =
      insights?.prep_list?.map((ing) => [ing.ingredient, ing.qty, ing.unit]) ||
      [];
    exportToCSV(
      `Tomorrows_Master_Prep_List_${new Date().toISOString().split("T")[0]}`,
      headers,
      data,
    );
  };

  // --- SUMMARY METRICS ---
  const past7DaysActual = chartData
    .filter((d) => d.actual !== null)
    .slice(-7)
    .reduce((sum, d) => sum + (d.actual || 0), 0);
  const next7DaysPredicted = chartData
    .filter((d) => d.actual === null)
    .reduce((sum, d) => sum + d.predicted, 0);
  const growth =
    past7DaysActual > 0
      ? ((next7DaysPredicted - past7DaysActual) / past7DaysActual) * 100
      : 0;

  // =========================================================================
  // --- THE FIX: BULLETPROOF CALENDAR-BASED DAILY INSIGHTS MATH ---
  // =========================================================================

  // 1. Get real-world calendar time from your computer
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayTime = todayDate.getTime();

  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowTime = tomorrowDate.getTime();

  // 2. Search the AI's data for the exact matching calendar days
  const todayData =
    chartData.find((d) => {
      const [year, month, day] = d.date.split("-");
      const dTime = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      ).getTime();
      return dTime === todayTime;
    }) || null;

  const tomorrowData =
    chartData.find((d) => {
      const [year, month, day] = d.date.split("-");
      const dTime = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      ).getTime();
      return dTime === tomorrowTime;
    }) || null;

  // 3. Do the math safely
  const todayActual = todayData?.actual || 0;
  const todayPredicted = todayData?.predicted || 0;
  const tomorrowPredicted = tomorrowData?.predicted || 0;
  const dailyVariance = todayActual - todayPredicted;
  const variancePercentage =
    todayPredicted > 0 ? (dailyVariance / todayPredicted) * 100 : 0;
  const tomorrowTrend = tomorrowPredicted - todayPredicted;

  const PROFIT_MARGIN = 0.65;
  const past7DaysProfit = past7DaysActual * PROFIT_MARGIN;
  const todayProfit = todayActual * PROFIT_MARGIN;

  const filteredChartData =
    timeRange === "7" ? chartData.slice(-14) : chartData;
  // =========================================================================

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: LKR. {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "name",
      header: "Ingredient",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      id: "stock",
      header: "Current Stock",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <span className="text-red-500 font-bold">
              {item.stock.toFixed(2)}
            </span>
            <span className="text-muted-foreground ml-1 text-xs">
              {item.unit}
            </span>
          </div>
        );
      },
    },
    {
      id: "threshold",
      header: "Threshold",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-muted-foreground">
            {item.low_stock_threshold || 10} {item.unit}
          </div>
        );
      },
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.getValue("supplier") || "Unassigned"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right pr-4">Action Required</div>,
      cell: () => (
        <div className="text-right pr-4">
          <Badge variant="destructive" className="font-normal">
            Reorder
          </Badge>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: lowStockItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 5 } },
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <OrbitDotMotion />
          <p>Running AI Forecasting Models...</p>
          <p>(This may take a few moments)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 1. TOP METRICS */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Past 7 Days Revenue
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              LKR.{past7DaysActual.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded historical sales
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cyan-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Past 7 Days Profit
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-500">
              LKR.{past7DaysProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated at 65% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Forecast Revenue (Next 7 Days)
            </CardTitle>
            {growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              LKR.{next7DaysPredicted.toFixed(2)}
            </div>
            <p className="text-xs mt-1 flex items-center gap-1 font-medium">
              <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                {growth >= 0 ? "+" : ""}
                {growth.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal ml-1">
                vs past 7 days
              </span>
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            lowStockItems.length > 0 ? "border-red-500/50 bg-red-500/5" : ""
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Stock Alerts
            </CardTitle>
            {lowStockItems.length > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <PackageX className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingredients require immediate restock
            </p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card className="bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Revenue
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              LKR.{todayActual.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-cyan-500/10 border-cyan-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Profit
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-500">
              LKR.{todayProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated Gross Profit
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Forecast Revenue
            </CardTitle>
            {variancePercentage >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
              LKR.{todayPredicted.toFixed(2)}
            </div>
            <p className="text-xs mt-1 flex items-center gap-1 font-medium">
              <span
                className={
                  variancePercentage >= 0 ? "text-green-500" : "text-amber-500"
                }
              >
                Variance: {variancePercentage >= 0 ? "+" : ""}
                {variancePercentage.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal ml-1">
                accuracy check
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tomorrow's Forecast Revenue
            </CardTitle>
            {tomorrowTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              LKR.{tomorrowPredicted.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tomorrowDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. MAIN CONTENT SPLIT */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div>
                <CardTitle>Revenue Forecast (Facebook Prophet)</CardTitle>
                <CardDescription>
                  {timeRange === "7"
                    ? "Recent 7-day historical trend combined with a 7-day predictive forward-look."
                    : "Comprehensive 30-day historical analysis for weekly seasonality."}
                </CardDescription>
              </div>
              <div className="flex bg-muted/50 p-1 rounded-md border">
                <button
                  onClick={() => setTimeRange("7")}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${timeRange === "7" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTimeRange("30")}
                  className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${timeRange === "30" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  30 Days
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={filteredChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#333"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `LKR. ${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="Actual Revenue"
                      stroke="teal"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                      connectNulls={true}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      name="AI Prediction"
                      stroke="#FF5252"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* SMART RESTOCK LIST + EXPORT BUTTON */}
          <Card className="flex flex-col flex-1">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Smart Restock List</CardTitle>
                <CardDescription>
                  Automated alerts for depleted ingredients based on your custom
                  thresholds.
                </CardDescription>
              </div>
              {hasPermission("download_sales_files") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportRestock}
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex items-center justify-between pb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search alerts..."
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-8 w-[250px]"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Columns className="mr-2 h-4 w-4" /> Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id === "name" ? "Ingredient" : column.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="hover:bg-transparent"
                      >
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="text-muted-foreground font-medium h-10"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="py-3">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Inventory is healthy. No items currently require
                          restocking.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 mt-auto">
                <div>
                  Showing {table.getRowModel().rows.length} of{" "}
                  {lowStockItems.length} alerts.
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-(--primary)">
                Top 3 Trending (Past 7 Days)
              </CardTitle>
              <CardDescription>
                Most popular items ordered this week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights?.top_products?.map((prod, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-2 border-b last:border-0 last:pb-0"
                >
                  <span className="font-semibold text-sm">{prod.name}</span>
                  <span className="text-sm font-medium bg-muted px-2 py-0.5 rounded">
                    {prod.sold_last_7_days} sold
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* EXPECTED ORDERS + EXPORT BUTTON */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-orange-500">
                  Tomorrow's Expected Orders
                </CardTitle>
                <CardDescription className="mt-1">
                  AI prediction for all products expected to sell
                </CardDescription>
              </div>
              {hasPermission("download_sales_files") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={handleExportOrders}
                  title="Export to Excel/CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {insights?.predicted_products?.map((prod, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-muted last:border-0"
                    >
                      <span className="font-medium text-foreground">
                        {prod.name}
                      </span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                        {prod.qty} orders
                      </span>
                    </div>
                  ))}
                  {!insights?.predicted_products?.length && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No significant sales predicted.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* MASTER PREP LIST + EXPORT BUTTON */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  Tomorrow's Master Prep List
                </CardTitle>
                <CardDescription className="mt-1">
                  Total ingredients needed to fulfill the entire forecast
                </CardDescription>
              </div>
              {hasPermission("download_sales_files") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary hover:bg-primary/20"
                  onClick={handleExportPrepList}
                  title="Export to Excel/CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {insights?.prep_list?.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-primary/10 last:border-0"
                    >
                      <span className="font-medium text-foreground">
                        {ing.ingredient}
                      </span>
                      <span className="font-bold text-primary">
                        {ing.qty}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {ing.unit}
                        </span>
                      </span>
                    </div>
                  ))}
                  {!insights?.prep_list?.length && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No prep required.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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
  ChevronsLeft,
  ChevronsRight,
  Banknote,
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

export default function DashboardPage() {
  const [chartData, setChartData] = useState<PredictionData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7" | "30">("30");

  // --- TABLE STATES ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [predictRes, invRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/predict/all`, {
          headers,
        }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, {
          headers,
        }),
      ]);

      if (predictRes.status === 401 || invRes.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("email");
        localStorage.removeItem("name");
        window.location.href = "/login";
        return;
      }

      if (predictRes.ok && invRes.ok) {
        const pData = await predictRes.json();
        const iData = await invRes.json();

        setChartData(pData);

        const depleted = iData.filter(
          (item: InventoryItem) =>
            item.stock <= (item.low_stock_threshold || 10),
        );
        setLowStockItems(depleted);
      }
    } catch (error) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // --- DAILY INSIGHTS MATH ---
  const actualsList = chartData.filter((d) => d.actual !== null);
  const todayData =
    actualsList.length > 0 ? actualsList[actualsList.length - 1] : null;
  const todayIndex = todayData
    ? chartData.findIndex((d) => d.date === todayData.date)
    : -1;
  const tomorrowData =
    todayIndex !== -1 && todayIndex + 1 < chartData.length
      ? chartData[todayIndex + 1]
      : null;

  const todayActual = todayData?.actual || 0;
  const todayPredicted = todayData?.predicted || 0;
  const tomorrowPredicted = tomorrowData?.predicted || 0;
  const dailyVariance = todayActual - todayPredicted;
  const variancePercentage =
    todayPredicted > 0 ? (dailyVariance / todayPredicted) * 100 : 0;
  const tomorrowTrend = tomorrowPredicted - todayPredicted;

  // ROFIT MATH
  const PROFIT_MARGIN = 0.65; // 65% Standard Restaurant Gross Profit Margin
  const past7DaysProfit = past7DaysActual * PROFIT_MARGIN;
  const todayProfit = todayActual * PROFIT_MARGIN;

  const filteredChartData =
    timeRange === "7" ? chartData.slice(-14) : chartData;

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

  // --- COLUMNS DEFINITION ---
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

        const thresholdLimit = item.low_stock_threshold || 10;

        return (
          <div className="text-muted-foreground">
            {thresholdLimit} {item.unit}
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

  // --- TABLE INITIALIZATION ---
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
    initialState: {
      pagination: { pageSize: 5 }, // Keep it small so it doesn't take over the whole dashboard
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Running AI Forecasting Models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* TOP CARDS (Now 4 Columns) */}
      <div className="grid gap-4 md:grid-cols-4">
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

        {/* NEW CARD: PAST 7 DAYS PROFIT */}
        <Card className="bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Past 7 Days Profit
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
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
              <span className="text-muted-foreground font-normal">
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
      </div>

      {/* DAILY PERFORMANCE INSIGHTS (Now 4 Columns) */}
      <div className="grid gap-4 md:grid-cols-4">
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
              {todayData
                ? new Date(todayData.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                : "No data"}
            </p>
          </CardContent>
        </Card>

        {/* NEW CARD: TODAY'S PROFIT */}
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Profit
            </CardTitle>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
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
              <TrendingDown className="h-4 w-4 text-amber-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-500">
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
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              LKR.{tomorrowPredicted.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tomorrowData
                ? new Date(tomorrowData.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })
                : "Pending..."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* THE ML PREDICTION CHART */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle>Revenue Forecast</CardTitle>
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
                  // Changed $ to Rs.
                  tickFormatter={(value) => `LKR. ${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />

                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Revenue"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls={true}
                />

                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="AI Prediction"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SMART RESTOCK LIST (TANSTACK TABLE) */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Restock List</CardTitle>
          <CardDescription>
            Automated alerts for depleted ingredients based on your custom
            thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* SEARCH & COLUMNS TOOLBAR */}
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

          {/* DATA TABLE */}
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

          {/* PAGINATION */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-4">
            <div>
              Showing {table.getRowModel().rows.length} of{" "}
              {lowStockItems.length} alerts.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <select
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2"
                >
                  {[5, 10, 20].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount() || 1}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
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
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

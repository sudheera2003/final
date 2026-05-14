"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getFilteredRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel
} from "@tanstack/react-table";
import { 
  Search, 
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Package,
  Upload,
  Loader2,
  X
} from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileUpload } from "@/components/file-upload";

// import permissions hook
import { usePermissions } from "@/hooks/use-permissions";

// types
export type Ingredient = { _id: string; name: string; unit: string; unit_price: number; };
export type RecipeItem = { ingredient_id: string; qty: number; };
export type Product = { _id: string; name: string; category: string; price: number; recipe: RecipeItem[]; };
export type Sale = { _id: string; product_id: string; product_name: string; category: string; quantity: number; total_price: number; timestamp: string; };

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // mini pos states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // upload states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // initialize permission hook
  const { hasPermission } = usePermissions();

  // fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
         window.location.href = "/"; 
         return;
      }
      const headers = { "Authorization": `Bearer ${token}` };
      
      const [salesRes, prodRes, invRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sales`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, { headers })
      ]);

      if (salesRes.ok && prodRes.ok && invRes.ok) {
        setSales(await salesRes.json());
        setProducts(await prodRes.json());
        setInventory(await invRes.json());
      } else if (salesRes.status === 401) {
         localStorage.removeItem("token");
         window.location.href = "/"; 
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // calculate cost
  const getProductCost = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.recipe) return 0;
    
    return product.recipe.reduce((total, rItem) => {
      const invItem = inventory.find(i => i._id === rItem.ingredient_id);
      return total + (invItem ? invItem.unit_price * rItem.qty : 0);
    }, 0);
  };

  // today summary
  const today = new Date().setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.timestamp).setHours(0, 0, 0, 0) === today);
  
  const totalRevenueToday = todaySales.reduce((sum, sale) => sum + sale.total_price, 0);
  const itemsSoldToday = todaySales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalProfitToday = todaySales.reduce((sum, sale) => {
    const costToMakeOne = getProductCost(sale.product_id);
    const totalCost = costToMakeOne * sale.quantity;
    return sum + (sale.total_price - totalCost);
  }, 0);

  // handlers
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || saleQuantity < 1) return toast.error("Select a product and valid quantity");

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ product_id: selectedProductId, quantity: saleQuantity }),
      });
      
      if (res.ok) {
        toast.success("Sale recorded & inventory deducted");
        setSelectedProductId("");
        setSaleQuantity(1);
        fetchData(); 
      } else {
        toast.error("Failed to record sale");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    toast.info("Processing daily sales...");
    
    try {
      const token = localStorage.getItem("token"); 
      const formData = new FormData();
      formData.append("file", files[0]);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sales/bulk-import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      if (res.ok) {
        toast.success("Sales imported & inventory perfectly synced");
        setIsUploadDialogOpen(false); 
        setFiles([]); 
        fetchData(); 
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Failed to process Excel file");
    } finally {
      setUploading(false); 
    }
  };

  // column definitions
  const columns: ColumnDef<Sale>[] = [
    {
      accessorKey: "timestamp",
      header: "Date & Time",
      cell: ({ row }) => {
        const date = new Date(row.getValue("timestamp"));
        return <div className="text-muted-foreground">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>;
      },
    },
    {
      accessorKey: "product_name",
      header: "Item Sold",
      cell: ({ row }) => <div className="font-medium">{row.getValue("product_name")}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="secondary" className="font-normal">{row.getValue("category")}</Badge>,
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <div className="font-semibold">{row.getValue("quantity")}</div>,
    },
    {
      accessorKey: "total_price",
      header: "Revenue",
      cell: ({ row }) => <div className="font-bold text-foreground">LKR.{Number(row.getValue("total_price")).toFixed(2)}</div>,
    },
    ...(hasPermission("show_profit_margins") ? [{
      id: "profit",
      header: "Est. Profit",
      cell: ({ row }: { row: any }) => {
        const sale = row.original;
        const costToMakeOne = getProductCost(sale.product_id);
        const totalCost = costToMakeOne * sale.quantity;
        const profit = sale.total_price - totalCost;
        const isGood = profit > 0;

        return (
          <div className={`font-medium ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isGood ? "+" : ""}LKR.{profit.toFixed(2)}
          </div>
        );
      },
    }] : []),
  ];

  // table initialization
  const table = useReactTable({
    data: sales,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* top dashboard cards */}
      {/* dynamically adjust the grid columns based on how many cards visible */}
      <div className={`grid gap-4 ${hasPermission("show_revenue") || hasPermission("show_profit_margins") ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
        
        {/* revenue card */}
        {hasPermission("show_revenue") && (
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col justify-between">
            <div className="flex flex-row items-center justify-between pb-2 space-y-0">
              <h3 className="tracking-tight text-sm font-medium">Total Revenue Today</h3>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">LKR.{totalRevenueToday.toFixed(2)}</div>
          </div>
        )}
        
        {/* always visible */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium">Items Sold Today</h3>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{itemsSoldToday} items</div>
        </div>

        {/* profit card */}
        {hasPermission("show_profit_margins") && (
          <div className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col justify-between">
            <div className="flex flex-row items-center justify-between pb-2 space-y-0">
              <h3 className="tracking-tight text-sm font-medium">Estimated Profit Today</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +LKR.{totalProfitToday.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* mini pos and upload */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-muted/20">
        
        {/* mini pos */}
        <form onSubmit={handleRecordSale} className="flex flex-1 items-center gap-3 w-full">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex items-center gap-1 w-full max-w-[340px]">
            <select 
              required
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>Select Menu Item...</option>
              {products.map(prod => (
                <option key={prod._id} value={prod._id}>{prod.name} (LKR.{prod.price.toFixed(2)})</option>
              ))}
            </select>

            {selectedProductId && (
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedProductId("")}
                className="h-10 w-10 text-muted-foreground hover:text-red-500 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Input 
            type="number" min="1" required
            value={saleQuantity || ""} 
            onChange={e => setSaleQuantity(parseInt(e.target.value) || 1)}
            className="w-20 h-10 shrink-0"
          />
          <Button type="submit" disabled={isProcessing} className="shrink-0">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ring up Sale"}
          </Button>
        </form>

        {/* bulk upload button */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <Upload className="mr-2 h-4 w-4" /> End of Day Excel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Daily Sales</DialogTitle>
              <DialogDescription>
                Upload your End of Day Excel file. Columns must be: product_name, quantity.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FileUpload onFilesChange={setFiles} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmUpload} disabled={files.length === 0 || uploading}>
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Sync Sales & Inventory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* data table header */}
      <div className="flex items-center justify-between pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sales history..."
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
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id} className="capitalize"
                  checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id === "product_name" ? "Item Sold" : column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* data table*/}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-muted-foreground font-medium h-10">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {isLoading ? "Loading sales..." : "No sales recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <div>
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} sale(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
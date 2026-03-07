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
  Plus, 
  Search, 
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
  Utensils,
  Upload,
  Loader2
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Shadcn UI Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileUpload } from "@/components/file-upload";

// --- TYPES ---
export type Ingredient = { _id: string; name: string; unit: string; unit_price: number; };
export type RecipeItem = { ingredient_id: string; qty: number; tempId?: number };
export type Product = { _id: string; name: string; category: string; price: number; recipe: RecipeItem[]; };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- TABLE STATES ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // --- DIALOG STATES ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- FORM STATES (Shared for Add and Edit) ---
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Burgers");
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);

  // --- UPLOAD STATES ---
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
         window.location.href = "/"; 
         return;
      }
      const headers = { "Authorization": `Bearer ${token}` };
      
      const [prodRes, invRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, { headers })
      ]);

      if (prodRes.ok && invRes.ok) {
        setProducts(await prodRes.json());
        setInventory(await invRes.json());
      } else if (prodRes.status === 401 || invRes.status === 401) {
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

  // --- FORM HANDLERS ---
  const resetForm = () => {
    setProductName(""); setCategory("General"); setSellingPrice(0); setRecipe([]); setEditingId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (item: Product) => {
    setProductName(item.name);
    setCategory(item.category);
    setSellingPrice(item.price);
    setRecipe(item.recipe || []);
    setEditingId(item._id);
    setIsEditDialogOpen(true);
  };

  const addRecipeRow = () => setRecipe([...recipe, { ingredient_id: "", qty: 1, tempId: Date.now() }]);
  const removeRecipeRow = (index: number) => setRecipe(recipe.filter((_, i) => i !== index));
  const updateRecipeRow = (index: number, field: string, value: string | number) => {
    const updated = [...recipe];
    updated[index] = { ...updated[index], [field]: value };
    setRecipe(updated);
  };

  // --- THE MATH: LIVE COST CALCULATION ---
  const costToMake = recipe.reduce((total, item) => {
    const invItem = inventory.find(i => i._id === item.ingredient_id);
    return total + (invItem ? invItem.unit_price * item.qty : 0);
  }, 0);
  const profit = sellingPrice - costToMake;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  // --- CRUD HANDLERS ---
  const handleSaveProduct = async (e: React.FormEvent, isEdit: boolean = false) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const cleanRecipe = recipe.filter(r => r.ingredient_id !== "");

      const url = isEdit 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products/${editingId}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products`;
        
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name: productName, category, price: sellingPrice, recipe: cleanRecipe }),
      });
      
      if (res.ok) {
        toast.success(`Product ${isEdit ? "updated" : "created"}!`);
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        fetchData(); 
      } else {
        const err = await res.json();
        toast.error(err.error || "Operation failed.");
      }
    } catch (err) {
      toast.error("Network error.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Product deleted");
        fetchData(); 
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleConfirmUpload = async () => {
    if (files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    toast.info("Uploading Excel file...");
    
    try {
      const token = localStorage.getItem("token"); 

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/products/bulk-import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      if (res.ok) {
        toast.success("Menu products updated successfully!");
        setIsUploadDialogOpen(false); 
        setFiles([]); 
        fetchData(); 
      } else {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Failed to process Excel file.");
    } finally {
      setUploading(false); 
    }
  };

  // --- COLUMNS DEFINITION ---
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="secondary" className="font-normal">{row.getValue("category")}</Badge>,
    },
    {
      accessorKey: "price",
      header: "Selling Price",
      cell: ({ row }) => <div className="font-semibold text-foreground">LKR.{Number(row.getValue("price")).toFixed(2)}</div>,
    },
    {
      id: "cost",
      header: "Cost to Make",
      cell: ({ row }) => {
        const itemRecipe = row.original.recipe || [];
        const itemCost = itemRecipe.reduce((total, rItem) => {
          const invItem = inventory.find(i => i._id === rItem.ingredient_id);
          return total + (invItem ? invItem.unit_price * rItem.qty : 0);
        }, 0);
        return <div className="text-muted-foreground">LKR.{itemCost.toFixed(2)}</div>;
      },
    },
    {
      id: "profit",
      header: "Profit Margin",
      cell: ({ row }) => {
        const price = row.original.price;
        const itemRecipe = row.original.recipe || [];
        const itemCost = itemRecipe.reduce((total, rItem) => {
          const invItem = inventory.find(i => i._id === rItem.ingredient_id);
          return total + (invItem ? invItem.unit_price * rItem.qty : 0);
        }, 0);
        
        const itemProfit = price - itemCost;
        const itemMargin = price > 0 ? (itemProfit / price) * 100 : 0;
        const isGood = itemProfit > 0;

        return (
          <Badge variant="outline" className={`font-normal ${isGood ? 'text-green-600 dark:text-green-400 bg-green-500/10' : 'text-red-600 dark:text-red-400 bg-red-500/10'}`}>
            {isGood ? "+" : ""}{itemMargin.toFixed(1)}%
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2 justify-center">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-muted">
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <span className="font-semibold text-foreground">{item.name}</span> from your menu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(item._id)} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  // --- TABLE INITIALIZATION ---
  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  // Shared form JSX for both Add and Edit Dialogs
  const renderProductForm = (isEdit: boolean) => (
    <form onSubmit={(e) => handleSaveProduct(e, isEdit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Product Name</label>
          <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Classic Cheeseburger" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Mains" required />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium flex justify-between items-center">
          <span>Ingredients (Recipe)</span>
          <Button type="button" variant="outline" size="sm" onClick={addRecipeRow}>
            <Plus className="h-3 w-3 mr-1" /> Add Ingredient
          </Button>
        </label>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {recipe.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No ingredients added yet.</p>}
          
          {recipe.map((row, index) => (
            <div key={row.tempId || index} className="flex gap-2 items-center bg-muted/50 p-2 rounded-md border border-border">
              <select 
                required
                value={row.ingredient_id} 
                onChange={e => updateRecipeRow(index, "ingredient_id", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="" disabled>Select Ingredient...</option>
                {inventory.map(inv => (
                  <option key={inv._id} value={inv._id}>{inv.name} (LKR.{inv.unit_price} / {inv.unit})</option>
                ))}
              </select>
              
              <Input 
                type="number" step="0.01" min="0" required
                value={row.qty || ""} 
                onChange={e => updateRecipeRow(index, "qty", parseFloat(e.target.value) || 0)}
                className="w-24 h-9"
              />
              <span className="text-xs text-muted-foreground w-12 truncate">
                {inventory.find(i => i._id === row.ingredient_id)?.unit || "unit"}
              </span>
              
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipeRow(index)} className="text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Total Cost to Make:</span>
          <span className="text-lg font-bold text-foreground">LKR.{costToMake.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Selling Price</label>
            <Input 
              type="number" step="0.01" required
              value={sellingPrice || ""} 
              onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold h-12"
            />
          </div>
          
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Projected Profit</label>
            <div className={`flex items-center h-12 px-4 rounded-md border ${profit > 0 ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
              <span className="text-lg font-bold mr-2">LKR.{profit.toFixed(2)}</span>
              <span className="text-sm font-medium">({margin.toFixed(1)}% margin)</span>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full">{isEdit ? "Update Product" : "Save Product & Recipe"}</Button>
    </form>
  );

  return (
    <div className="p-6 space-y-4">
      {/* HEADER ACTIONS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
            {/* UPLOAD DIALOG */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Menu & Recipes</DialogTitle>
                <DialogDescription>
                  Drag and drop your Excel file. Ensure columns match: product_name, category, price, ingredient_name, qty.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FileUpload onFilesChange={setFiles} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmUpload} disabled={files.length === 0 || uploading}>
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Confirm Upload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          

          {/* ADD DIALOG */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}><Plus className="mr-2 h-4 w-4" /> Create Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Recipe & Pricing Builder</DialogTitle></DialogHeader>
              {renderProductForm(false)}
            </DialogContent>
          </Dialog>


          {/* EDIT DIALOG */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Edit Product Recipe</DialogTitle></DialogHeader>
              {renderProductForm(true)}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      

      {/* DATA TABLE */}
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
                  {isLoading ? "Loading menu..." : "No products found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <div>
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
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
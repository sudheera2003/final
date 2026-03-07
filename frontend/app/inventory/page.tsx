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
  Upload, 
  Search, 
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Trash2,
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
export type Ingredient = {
  _id: string;
  name: string;
  category: string;
  status: string;
  stock: number;
  unit: string;
  unit_price: number;
  supplier: string;
  low_stock_threshold?: number;
};

export default function InventoryPage() {
  const [data, setData] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  
  // --- DIALOG & UPLOAD STATES ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        setData(await res.json());
      } else if (res.status === 401) {
         localStorage.removeItem("token");
         window.location.href = "/"; 
      } else {
        toast.error("Failed to load inventory");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- HANDLERS ---
  const handleConfirmUpload = async () => {
    if (files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    toast.info("Uploading Excel file...");
    
    try {
      const token = localStorage.getItem("token"); 

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/bulk-import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      
      if (res.ok) {
        toast.success("Inventory updated successfully");
        setIsUploadDialogOpen(false); 
        setFiles([]); 
        fetchData(); 
      } else if (res.status === 401) {
         toast.error("Session expired. Please log in again.");
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      toast.error("Failed to process Excel file.");
    } finally {
      setUploading(false); 
    }
  };

  const handleAddIngredient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem = Object.fromEntries(formData.entries());

    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("You must be logged in to add items.");

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(newItem),
      });
      
      if (res.ok) {
        toast.success("Ingredient added");
        setIsAddDialogOpen(false);
        fetchData(); 
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to add ingredient.");
      }
    } catch (err) {
      toast.error("Network error while adding ingredient.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Item deleted successfully");
        fetchData(); 
      } else {
        toast.error("Failed to delete item");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleEdit = (item: Ingredient) => {
    setEditingItem(item); 
    setIsEditDialogOpen(true); 
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);
    const updatedItem = Object.fromEntries(formData.entries());

    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("You must be logged in to edit items.");

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/inventory/${editingItem._id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedItem),
      });
      
      if (res.ok) {
        toast.success("Ingredient updated");
        setIsEditDialogOpen(false);
        fetchData(); 
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to update ingredient.");
      }
    } catch (err) {
      toast.error("Network error while updating ingredient.");
    }
  };

  // --- COLUMNS DEFINITION ---
  const columns: ColumnDef<Ingredient>[] = [
    {
      accessorKey: "name",
      header: "Header (Ingredient)",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "category",
      header: "Section Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-normal">
          {row.getValue("category")}
        </Badge>
      ),
    },
{
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const stock = row.getValue("stock") as number;
        const threshold = row.original.low_stock_threshold || 20; 
        
        let statusText = "In Stock";
        let badgeColor = "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20";
        let dotColor = "bg-green-500";

        if (stock <= 0) {
          statusText = "Out of Stock";
          badgeColor = "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
          dotColor = "bg-red-500";
        } else if (stock <= threshold) {
          statusText = "Low Stock";
          badgeColor = "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
          dotColor = "bg-yellow-500";
        }

        return (
          <Badge variant="outline" className={`font-normal gap-1.5 ${badgeColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            {statusText}
          </Badge>
        );
      },
    },
    {
      accessorKey: "stock",
      header: "Target (Stock)",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue("stock")} <span className="text-muted-foreground text-xs ml-1">{row.original.unit}</span>
        </div>
      ),
    },
    {
      accessorKey: "unit_price",
      header: "Limit (Price)",
      cell: ({ row }) => <div>LKR.{Number(row.getValue("unit_price")).toFixed(2)}</div>,
    },
    {
      accessorKey: "supplier",
      header: "Reviewer (Supplier)",
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2 justify-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleEdit(item)}
              className="text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete 
                    <span className="font-semibold text-foreground"> {item.name} </span> 
                    from your inventory and servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDelete(item._id)}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
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
    data,
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
    <div className="p-6 space-y-4">
      {/* HEADER ACTIONS */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter ingredients..."
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
                <DialogTitle>Upload Excel Data</DialogTitle>
                <DialogDescription>
                  Drag and drop your Excel file here to update the inventory stock.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FileUpload onFilesChange={setFiles} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                
                <Button 
                  onClick={handleConfirmUpload} 
                  disabled={files.length === 0 || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Confirm Upload"
                  )}
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
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Ingredient</DialogTitle>
                <DialogDescription>Manually add a new item to the inventory.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddIngredient} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <Input name="name" placeholder="Ingredient Name" required />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <Input name="category" placeholder="Category (e.g., Meat, Dairy)" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Initial Stock</label>
                    <Input name="stock" type="number" step="0.01" placeholder="Current Stock" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Unit</label>
                    <Input name="unit" placeholder="Unit (e.g., kg, pcs)" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Unit Price (LKR)</label>
                    <Input name="unit_price" type="number" step="0.01" placeholder="Unit Price (LKR)" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Low Stock Alert</label>
                    <Input name="low_stock_threshold" type="number" step="0.01" placeholder="Alert if stock falls below..." required defaultValue="20" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Supplier</label>
                  <Input name="supplier" placeholder="Supplier Name" required />
                </div>

                <Button type="submit" className="w-full mt-2">Save Item</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* EDIT DIALOG */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Ingredient</DialogTitle>
                <DialogDescription>Update details for {editingItem?.name}.</DialogDescription>
              </DialogHeader>
              {editingItem && (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Name</label>
                    <Input name="name" defaultValue={editingItem.name} placeholder="Ingredient Name" required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <Input name="category" defaultValue={editingItem.category} placeholder="Category" required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Current Stock</label>
                      <Input name="stock" type="number" step="0.01" defaultValue={editingItem.stock} placeholder="Stock Quantity" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Unit</label>
                      <Input name="unit" defaultValue={editingItem.unit} placeholder="Unit (e.g., kg, pcs)" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Unit Price (LKR)</label>
                      <Input name="unit_price" type="number" step="0.01" defaultValue={editingItem.unit_price} placeholder="Unit Price" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Low Stock Alert</label>
                      <Input name="low_stock_threshold" type="number" step="0.01" defaultValue={editingItem.low_stock_threshold || 20} placeholder="Alert if stock falls below..." required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Supplier</label>
                    <Input name="supplier" defaultValue={editingItem.supplier} placeholder="Supplier Name" required />
                  </div>

                  <Button type="submit" className="w-full mt-2">Update Item</Button>
                </form>
              )}
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
                  {isLoading ? "Loading inventory..." : "No results found."}
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
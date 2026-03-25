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
  Ticket,
  Loader2,
  Trash2
} from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// --- NEW IMPORTS FOR ALERT DIALOG ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SupportTicket = {
  _id: string;
  user_email: string;
  issue_type: string;
  description: string;
  status: string;
  timestamp: string;
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // --- Modal States ---
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- NEW: Delete Alert States ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      if (res.ok) {
        setTickets(await res.json());
      } else {
        toast.error("Failed to load tickets");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Ticket marked as ${newStatus}`);
        setTickets(prev => prev.map(t => t._id === ticketId ? { ...t, status: newStatus } : t));
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  // --- UPDATED: Delete Handler for the Alert Dialog ---
  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tickets/${ticketToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Ticket deleted successfully");
        setTickets(prev => prev.filter(t => t._id !== ticketToDelete));
        setIsDeleteAlertOpen(false);
        setTicketToDelete(null);
      } else {
        toast.error("Failed to delete ticket");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const columns: ColumnDef<SupportTicket>[] = [
    {
      accessorKey: "timestamp",
      header: "Date Submitted",
      cell: ({ row }) => {
        const date = new Date(row.getValue("timestamp"));
        return <div className="text-muted-foreground whitespace-nowrap">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>;
      },
    },
    {
      accessorKey: "issue_type",
      header: "Issue Type",
      cell: ({ row }) => <Badge variant="secondary" className="font-normal whitespace-nowrap">{row.getValue("issue_type")}</Badge>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="max-w-[300px] truncate" title={row.getValue("description")}>{row.getValue("description")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const ticket = row.original;
        
        let colorClass = "text-yellow-600 bg-yellow-500/10 border-yellow-500/20"; 
        if (ticket.status === "In Progress") colorClass = "text-blue-600 bg-blue-500/10 border-blue-500/20";
        if (ticket.status === "Resolved") colorClass = "text-green-600 bg-green-500/10 border-green-500/20";

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select 
              defaultValue={ticket.status} 
              onValueChange={(val) => handleStatusChange(ticket._id, val)}
            >
              <SelectTrigger className={`h-8 w-[130px] border ${colorClass}`}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      id: "delete",
      header: () => <div className="">Action</div>,
      cell: ({ row }) => {
        return (
          <div className="">
            {/* --- UPDATED: Trigger the Alert Dialog State --- */}
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation(); 
                setTicketToDelete(row.original._id);
                setIsDeleteAlertOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }
  ];

  const table = useReactTable({
    data: tickets,
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
    <div className="p-6 space-y-6 w-full mx-auto">
      
      <div className="flex items-center gap-3 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage and resolve issues submitted by your team.</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 w-[250px]"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline"><Columns className="mr-2 h-4 w-4" /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => {
              return (
                <DropdownMenuCheckboxItem
                  key={column.id} className="capitalize"
                  checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace('_', ' ')}
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                <TableRow 
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedTicket(row.original);
                    setIsModalOpen(true);
                  }}
                >
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
                  {isLoading ? <span className="flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading tickets...</span> : "No tickets found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
        <div>{table.getFilteredRowModel().rows.length} total ticket(s).</div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- Ticket Details Modal --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl border-b pb-4">Ticket Details</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-6 mt-2">
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Date Submitted</p>
                  <p className="font-semibold">
                    {new Date(selectedTicket.timestamp).toLocaleString(undefined, { 
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Issue Type</p>
                  <Badge variant="secondary" className="font-normal">{selectedTicket.issue_type}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Current Status</p>
                  <Badge variant="outline" className="font-normal">{selectedTicket.status}</Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-muted-foreground font-medium text-sm mb-2">Description</p>
                <div className="p-4 bg-muted/30 border rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- NEW: Delete Alert Dialog --- */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the ticket from the system database. Make sure its resolved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTicketToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
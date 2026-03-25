"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  Save, 
  Info, 
  Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// --- TYPES ---
type Permission = {
  id: string;
  label: string;
  description?: string;
  children?: Permission[];
};

// --- ALIGNED PERMISSIONS STRUCTURE ---
// These IDs match your database strictly
const permissions: Permission[] = [
  {
    id: "view_dashboard",
    label: "Dashboard Access",
    description: "View and interact with the main dashboard",
    children: [
      {
        id: "download_sales_files",
        label: "Download Sales Files",
        description: "Export and download sales reports as files",
      },
    ],
  },
  {
    id: "view_sales",
    label: "Sales Access",
    description: "Access the sales module and related data",
    children: [
      {
        id: "show_revenue",
        label: "Show Revenue Data",
        description: "View detailed revenue figures and trends",
      },
      {
        id: "show_profit_margins",
        label: "Show Profit Margins",
        description: "View profit margin breakdowns per product",
      },
    ],
  },
  {
    id: "view_inventory",
    label: "Inventory Access",
    description: "View and manage inventory records",
    children: [
      { id: "add_inventory", label: "Add Items", description: "Create new inventory entries" },
      { id: "edit_inventory", label: "Edit Items", description: "Modify existing inventory details" },
      { id: "delete_inventory", label: "Delete Items", description: "Remove inventory entries permanently" },
    ],
  },
  {
    id: "view_products",
    label: "Products Access",
    description: "View and manage the products catalog",
    children: [
      { id: "add_products", label: "Add Products", description: "Create new product listings" },
      { id: "edit_products", label: "Edit Products", description: "Update existing product information" },
      { id: "delete_products", label: "Delete Products", description: "Remove products from the catalog" },
    ],
  },
  {
    id: "user_management",
    label: "User Management",
    description: "Invite, suspend, and remove users",
  },
  {
    id: "manage_roles",
    label: "Permission Management",
    description: "Configure role-based access control settings",
  },
];

export default function AccessControlPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Default all sections to be open
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(permissions.map(p => p.id))
  );

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/roles_full`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && Array.isArray(data)) {
        setRoles(data);
      } else {
        toast.error(data.error || "You do not have permission to view roles.");
        setRoles([]);
      }
    } catch (error) {
      toast.error("Network error while loading roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- SMART TOGGLE LOGIC ---
  const togglePermission = (
    roleName: string,
    permId: string,
    parentId: string | null = null,
    allChildIds: string[] = []
  ) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.role_name === roleName) {
          let newPerms = new Set(role.permissions || []);

          if (newPerms.has(permId)) {
            // TURN OFF
            newPerms.delete(permId);
            // If turning off parent, turn off all children
            allChildIds.forEach((child) => newPerms.delete(child));
          } else {
            // TURN ON
            newPerms.add(permId);
            // If turning on child, automatically turn on parent
            if (parentId) newPerms.add(parentId);
          }

          return { ...role, permissions: Array.from(newPerms) };
        }
        return role;
      })
    );
  };

  const savePermissions = async (roleName: string, rolePermissions: string[]) => {
    setSaving(roleName);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/roles/${roleName}/permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ permissions: rolePermissions }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(`Permissions for ${roleName} updated!`);
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSaving(null);
    }
  };

  // --- HELPERS FOR UI ---
  const isIndeterminate = (role: any, perm: Permission): boolean => {
    if (!perm.children) return false;
    const rolePerms = role.permissions || [];
    const checkedCount = perm.children.filter((c) => rolePerms.includes(c.id)).length;
    return checkedCount > 0 && checkedCount < perm.children.length;
  };

  const getRoleColor = (roleName: string) => {
    if (roleName === "super_admin") return "text-amber-500";
    if (roleName === "admin") return "text-red-500";
    if (roleName === "user") return "text-green-500";
    return "text-muted-foreground";
  };

  // Calculate dynamic grid columns based on how many roles come from the DB
  const gridStyle = {
    gridTemplateColumns: `minmax(250px, 1fr) repeat(${Math.max(roles.length, 1)}, 120px)`,
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        
        {/* Page Header */}
        <div className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    Roles and permissions
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Manage what each role can access across your organization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-5xl mx-auto px-6 py-6">
          
          {/* Column headers */}
          <div className="grid gap-0 mb-1" style={gridStyle}>
            <div />
            {roles.map((role) => (
              <div key={role.role_name} className="text-center">
                <span className={cn("text-xs font-semibold uppercase tracking-wider", getRoleColor(role.role_name))}>
                  {role.label}
                </span>
              </div>
            ))}
          </div>

          <Separator className="mb-4" />

          {/* Permission rows */}
          <div className="space-y-0 rounded-md border border-border overflow-hidden">
            {permissions.map((perm, permIdx) => {
              const hasChildren = !!perm.children?.length;
              const isOpen = openSections.has(perm.id);

              return (
                <div key={perm.id}>
                  {/* Section row */}
                  <Collapsible open={isOpen}>
                    <div
                      className={cn(
                        "grid items-center px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors",
                        permIdx !== 0 && "border-t border-border"
                      )}
                      style={gridStyle}
                    >
                      {/* Label */}
                      <div className="flex items-center gap-2 min-w-0">
                        {hasChildren ? (
                          <CollapsibleTrigger asChild>
                            <button
                              onClick={() => toggleSection(perm.id)}
                              className="flex items-center gap-2 text-left group focus:outline-none"
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm font-semibold text-foreground group-hover:text-foreground">
                                {perm.label}
                              </span>
                            </button>
                          </CollapsibleTrigger>
                        ) : (
                          <div className="flex items-center gap-2 ml-6">
                            <span className="text-sm font-semibold text-foreground">
                              {perm.label}
                            </span>
                          </div>
                        )}
                        {perm.description && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs">
                              {perm.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Checkboxes per role (Parent) */}
                      {roles.map((role) => (
                        <div key={`${role.role_name}-${perm.id}`} className="flex justify-center">
                          <Checkbox
                            checked={(role.permissions || []).includes(perm.id)}
                            data-indeterminate={isIndeterminate(role, perm)}
                            onCheckedChange={() =>
                              togglePermission(
                                role.role_name,
                                perm.id,
                                null,
                                perm.children?.map((c) => c.id) || []
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>

                    {/* Children rows */}
                    {hasChildren && (
                      <CollapsibleContent>
                        {perm.children!.map((child) => (
                          <div
                            key={child.id}
                            className="grid items-center px-4 py-2.5 border-t border-border/60 hover:bg-muted/20 transition-colors bg-background"
                            style={gridStyle}
                          >
                            <div className="flex items-center gap-2 ml-10">
                              <span className="text-sm text-muted-foreground">
                                {child.label}
                              </span>
                              {child.description && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-xs">
                                    {child.description}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>

                            {/* Checkboxes per role (Child) */}
                            {roles.map((role) => (
                              <div key={`${role.role_name}-${child.id}`} className="flex justify-center">
                                <Checkbox
                                  checked={(role.permissions || []).includes(child.id)}
                                  onCheckedChange={() =>
                                    togglePermission(role.role_name, child.id, perm.id)
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              );
            })}

            {/* Fallback for unauthorized/empty states */}
            {roles.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No roles available or access denied.
              </div>
            )}
          </div>

          {/* Footer actions */}
          {roles.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately for all users in that role.
              </p>
              <div className="flex gap-2">
                {roles.map((role) => (
                  <Button
                    key={`save-${role.role_name}`}
                    size="sm"
                    variant={role.role_name === "super_admin" ? "default" : "outline"}
                    onClick={() => savePermissions(role.role_name, role.permissions || [])}
                    disabled={saving === role.role_name}
                    className="gap-1.5 text-xs w-32"
                  >
                    {saving === role.role_name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saving === role.role_name ? "Saving..." : `Save ${role.label}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  );
}
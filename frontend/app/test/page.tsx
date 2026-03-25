"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronRight, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

type Role = "superAdmin" | "admin" | "staff";

type Permission = {
  id: string;
  label: string;
  description?: string;
  children?: Permission[];
};

const permissions: Permission[] = [
  {
    id: "dashboard",
    label: "Dashboard Access",
    description: "View and interact with the main dashboard",
    children: [
      {
        id: "dashboard.download_sales",
        label: "Download Sales Files",
        description: "Export and download sales reports as files",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales Access",
    description: "Access the sales module and related data",
    children: [
      {
        id: "sales.revenue",
        label: "Show Revenue Data",
        description: "View detailed revenue figures and trends",
      },
      {
        id: "sales.margins",
        label: "Show Profit Margins",
        description: "View profit margin breakdowns per product",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Access",
    description: "View and manage inventory records",
    children: [
      {
        id: "inventory.add",
        label: "Add Items",
        description: "Create new inventory entries",
      },
      {
        id: "inventory.edit",
        label: "Edit Items",
        description: "Modify existing inventory details",
      },
      {
        id: "inventory.delete",
        label: "Delete Items",
        description: "Remove inventory entries permanently",
      },
    ],
  },
  {
    id: "products",
    label: "Products Access",
    description: "View and manage the products catalog",
    children: [
      {
        id: "products.add",
        label: "Add Products",
        description: "Create new product listings",
      },
      {
        id: "products.edit",
        label: "Edit Products",
        description: "Update existing product information",
      },
      {
        id: "products.delete",
        label: "Delete Products",
        description: "Remove products from the catalog",
      },
    ],
  },
  {
    id: "user_management",
    label: "User Management",
    description: "Invite, suspend, and remove users",
  },
  {
    id: "permission_management",
    label: "Permission Management",
    description: "Configure role-based access control settings",
  },
];

const defaultPermissions: Record<Role, Set<string>> = {
  superAdmin: new Set([
    "dashboard",
    "dashboard.download_sales",
    "sales",
    "sales.revenue",
    "sales.margins",
    "inventory",
    "inventory.add",
    "inventory.edit",
    "inventory.delete",
    "products",
    "products.add",
    "products.edit",
    "products.delete",
    "user_management",
    "permission_management",
  ]),
  admin: new Set([
    "dashboard",
    "dashboard.download_sales",
    "sales",
    "sales.revenue",
    "sales.margins",
    "inventory",
    "inventory.add",
    "inventory.edit",
    "inventory.delete",
    "products",
    "products.add",
    "products.edit",
    "products.delete",
  ]),
  staff: new Set(["sales", "inventory", "products"]),
};

const roles: { key: Role; label: string; color: string; badgeVariant: "default" | "secondary" | "outline" }[] = [
  { key: "superAdmin", label: "Super Admin", color: "text-amber-500", badgeVariant: "default" },
  { key: "admin", label: "Admin", color: "text-blue-500", badgeVariant: "secondary" },
  { key: "staff", label: "Staff", color: "text-muted-foreground", badgeVariant: "outline" },
];

export default function AccessControlPage() {
  const [rolePermissions, setRolePermissions] = useState<
    Record<Role, Set<string>>
  >({
    superAdmin: new Set(defaultPermissions.superAdmin),
    admin: new Set(defaultPermissions.admin),
    staff: new Set(defaultPermissions.staff),
  });

  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["dashboard", "sales", "inventory", "products"])
  );

  const [savedStates, setSavedStates] = useState<Record<Role, boolean>>({
    superAdmin: false,
    admin: false,
    staff: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePermission = (role: Role, permId: string, children?: Permission[]) => {
    setRolePermissions((prev) => {
      const next = new Set(prev[role]);
      const allChildIds = children?.map((c) => c.id) ?? [];

      if (next.has(permId)) {
        next.delete(permId);
        allChildIds.forEach((id) => next.delete(id));
      } else {
        next.add(permId);
        allChildIds.forEach((id) => next.add(id));
      }
      return { ...prev, [role]: next };
    });
  };

  const handleSave = (role: Role) => {
    setSavedStates((prev) => ({ ...prev, [role]: true }));
    setTimeout(() => setSavedStates((prev) => ({ ...prev, [role]: false })), 2000);
  };

  const isIndeterminate = (role: Role, perm: Permission): boolean => {
    if (!perm.children) return false;
    const checkedCount = perm.children.filter((c) =>
      rolePermissions[role].has(c.id)
    ).length;
    return checkedCount > 0 && checkedCount < perm.children.length;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Page Header — GitHub-style flat header */}
        <div className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
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
          <div className="grid grid-cols-[1fr_120px_120px_120px] gap-0 mb-1">
            <div />
            {roles.map((role) => (
              <div key={role.key} className="text-center">
                <span className={cn("text-xs font-semibold uppercase tracking-wider", role.color)}>
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
                        "grid grid-cols-[1fr_120px_120px_120px] items-center px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors",
                        permIdx !== 0 && "border-t border-border"
                      )}
                    >
                      {/* Label */}
                      <div className="flex items-center gap-2 min-w-0">
                        {hasChildren ? (
                          <CollapsibleTrigger asChild>
                            <button
                              onClick={() => toggleSection(perm.id)}
                              className="flex items-center gap-2 text-left group"
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

                      {/* Checkboxes per role */}
                      {roles.map((role) => (
                        <div key={role.key} className="flex justify-center">
                          <Checkbox
                            checked={rolePermissions[role.key].has(perm.id)}
                            // @ts-ignore - shadcn Checkbox doesn't natively have indeterminate but we handle visual via className
                            data-indeterminate={isIndeterminate(role.key, perm)}
                            onCheckedChange={() =>
                              togglePermission(role.key, perm.id, perm.children)
                            }
                            className={cn(
                              "h-4 w-4",
                              role.key === "superAdmin" && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                              role.key === "admin" && "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
                            )}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Children rows */}
                    {hasChildren && (
                      <CollapsibleContent>
                        {perm.children!.map((child, childIdx) => (
                          <div
                            key={child.id}
                            className={cn(
                              "grid grid-cols-[1fr_120px_120px_120px] items-center px-4 py-2.5 border-t border-border/60 hover:bg-muted/20 transition-colors bg-background"
                            )}
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

                            {roles.map((role) => (
                              <div key={role.key} className="flex justify-center">
                                <Checkbox
                                  checked={rolePermissions[role.key].has(child.id)}
                                  onCheckedChange={() =>
                                    togglePermission(role.key, child.id)
                                  }
                                  className={cn(
                                    "h-4 w-4",
                                    role.key === "superAdmin" && "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                                    role.key === "admin" && "data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500",
                                  )}
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
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Changes take effect immediately for all users in that role.
            </p>
            <div className="flex gap-2">
              {roles.map((role) => (
                <Button
                  key={role.key}
                  size="sm"
                  variant={role.key === "superAdmin" ? "default" : "outline"}
                  onClick={() => handleSave(role.key)}
                  className="gap-1.5 text-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savedStates[role.key] ? "Saved!" : `Save ${role.label}`}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
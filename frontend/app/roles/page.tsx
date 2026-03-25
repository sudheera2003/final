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

type Permission = {
  id: string;
  label: string;
  description?: string;
  children?: Permission[];
};

export default function AccessControlPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Permission[]>([]);
  
  const [loading, setLoading] = useState(true);
  // --- UPDATED: Single loading state for saving ---
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [rolesRes, blueprintRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/roles_full`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/permissions_blueprint`, { headers })
      ]);

      if (rolesRes.status === 401 || blueprintRes.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.clear(); // Clears token, permissions, role, etc.
        window.location.href = "/login"; // Redirect to your login page
        return;
      }

      const rolesData = await rolesRes.json();
      const blueprintData = await blueprintRes.json();

      if (rolesRes.ok && blueprintRes.ok && Array.isArray(rolesData) && Array.isArray(blueprintData)) {
        setRoles(rolesData);
        
        const groups: Permission[] = [];
        const parents = blueprintData.filter((p: any) => !p.parent_id);
        
        parents.forEach((parent: any) => {
          const children = blueprintData
            .filter((c: any) => c.parent_id === parent.id)
            .map((c: any) => ({ id: c.id, label: c.label, description: c.description }));
            
          groups.push({
            id: parent.id,
            label: parent.label,
            description: parent.description,
            children: children.length > 0 ? children : undefined
          });
        });

        setPermissionGroups(groups);
        setOpenSections(new Set(groups.map(g => g.id)));

      } else {
        toast.error("You do not have permission to view this page.");
        setRoles([]);
      }
    } catch (error) {
      toast.error("Network error while loading data");
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

  const togglePermission = (roleName: string, permId: string, parentId: string | null = null, allChildIds: string[] = []) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.role_name === roleName) {
          let newPerms = new Set(role.permissions || []);

          if (newPerms.has(permId)) {
            newPerms.delete(permId);
            allChildIds.forEach((child) => newPerms.delete(child));
          } else {
            newPerms.add(permId);
            if (parentId) newPerms.add(parentId);
          }
          return { ...role, permissions: Array.from(newPerms) };
        }
        return role;
      })
    );
  };

  // --- UPDATED: SINGLE SAVE FUNCTION ---
  const saveAllPermissions = async () => {
    setIsSavingAll(true);
    try {
      const token = localStorage.getItem("token");
      
      // Create an array of HTTP requests (one for each role)
      const savePromises = roles.map(role => 
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/roles/${role.role_name}/permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ permissions: role.permissions || [] }),
        })
      );

      // Fire all requests at the exact same time and wait for them to finish
      const results = await Promise.all(savePromises);
      
      // Check if any of the requests failed
      const hasErrors = results.some(res => !res.ok);

      if (hasErrors) {
        toast.error("Some roles failed to update. Please try again.");
      } else {
        toast.success("All role permissions updated successfully!");
      }
    } catch (error) {
      toast.error("Network error while saving permissions.");
    } finally {
      setIsSavingAll(false);
    }
  };

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

  const getCheckboxColor = (roleName: string) => {
    if (roleName === "super_admin") return "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500";
    if (roleName === "admin") return "data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500";
    if (roleName === "user") return "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500";
    return "";
  };

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
        
        <div className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Roles and permissions</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Manage what each role can access across your organization.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
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

          <div className="space-y-0 rounded-md border border-border overflow-hidden">
            {permissionGroups.map((perm, permIdx) => {
              const hasChildren = !!perm.children?.length;
              const isOpen = openSections.has(perm.id);

              return (
                <div key={perm.id}>
                  <Collapsible open={isOpen}>
                    <div className={cn("grid items-center px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors", permIdx !== 0 && "border-t border-border")} style={gridStyle}>
                      <div className="flex items-center gap-2 min-w-0">
                        {hasChildren ? (
                          <CollapsibleTrigger asChild>
                            <button onClick={() => toggleSection(perm.id)} className="flex items-center gap-2 text-left group focus:outline-none">
                              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <span className="text-sm font-semibold text-foreground group-hover:text-foreground">{perm.label}</span>
                            </button>
                          </CollapsibleTrigger>
                        ) : (
                          <div className="flex items-center gap-2 ml-6">
                            <span className="text-sm font-semibold text-foreground">{perm.label}</span>
                          </div>
                        )}
                        {perm.description && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground shrink-0 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs">{perm.description}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {roles.map((role) => (
                        <div key={`${role.role_name}-${perm.id}`} className="flex justify-center">
                          <Checkbox
                            checked={(role.permissions || []).includes(perm.id)}
                            data-indeterminate={isIndeterminate(role, perm)}
                            onCheckedChange={() => togglePermission(role.role_name, perm.id, null, perm.children?.map((c) => c.id) || [])}
                            className={cn("h-4 w-4", getCheckboxColor(role.role_name))}
                          />
                        </div>
                      ))}
                    </div>

                    {hasChildren && (
                      <CollapsibleContent>
                        {perm.children!.map((child) => (
                          <div key={child.id} className="grid items-center px-4 py-2.5 border-t border-border/60 hover:bg-muted/20 transition-colors bg-background" style={gridStyle}>
                            <div className="flex items-center gap-2 ml-10">
                              <span className="text-sm text-muted-foreground">{child.label}</span>
                              {child.description && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-xs">{child.description}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {roles.map((role) => (
                              <div key={`${role.role_name}-${child.id}`} className="flex justify-center">
                                <Checkbox
                                  checked={(role.permissions || []).includes(child.id)}
                                  onCheckedChange={() => togglePermission(role.role_name, child.id, perm.id)}
                                  className={cn("h-4 w-4", getCheckboxColor(role.role_name))}
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

            {roles.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No roles available or access denied.</div>
            )}
          </div>

          {roles.length > 0 && (
            <div className="mt-6 flex items-center justify-between bg-muted/20 p-4 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Save Configurations</p>
                <p className="text-xs text-muted-foreground">Changes will take effect immediately for all users in these roles.</p>
              </div>
              <Button
                onClick={saveAllPermissions}
                disabled={isSavingAll}
                className="gap-2 w-40"
              >
                {isSavingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSavingAll ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
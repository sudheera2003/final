"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Icons (Added User icon)
import { Mail, Shield, Copy, Check, CalendarDays, Key, Edit3, User, X, User2 } from "lucide-react";

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmPassword: z.string().min(1, "Please confirm your new password."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name) return "US";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  admin: "default",
  editor: "secondary",
  user: "outline",
};

export default function ProfilePage() {
  // State
  const [userData, setUserData] = useState({ name: "", email: "", role: "user", joinedAt: "Recently" });
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  
  // UI States
  const [isEditingProfile, setIsEditingProfile] = useState(false); // Controls inline editing
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forms
  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // ─── FETCH USER DATA ON LOAD ────────────────────────────────────────────────
  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          console.warn("No token found. Redirecting to login...");
          window.location.href = "/";
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/me`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        if (response.ok) {
           const currentUser = await response.json();
           
           // --- NEW DATE FORMATTING LOGIC ---
           // Look for the date from the database, fallback to "Recently" if missing
           const rawDate = currentUser.joinedAt || currentUser.createdAt || currentUser.created_at;
           
           let formattedDate = "Recently";
           if (rawDate) {
             const dateObj = new Date(rawDate);
             formattedDate = new Intl.DateTimeFormat('en-US', { 
               month: 'long', 
               day: 'numeric', 
               year: 'numeric' 
             }).format(dateObj);
           }
           // ----------------------------------

           setUserData({
               name: currentUser.name || "Unknown",
               email: currentUser.email || "No Email",
               role: currentUser.role || "user",
               joinedAt: formattedDate
           });
           
           profileForm.reset({ 
               name: currentUser.name || "", 
               email: currentUser.email || "" 
           });
        } else if (response.status === 401) {
           console.error("Token invalid or expired. Please log in again.");
           localStorage.removeItem("token");
           localStorage.removeItem("userEmail");
           window.location.href = "/";
        } else {
           console.error("Failed to fetch user. Status:", response.status);
        }
      } catch (error) {
        console.error("Network error while fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [profileForm]);


  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const copyEmail = () => {
    navigator.clipboard.writeText(userData.email);
    setIsCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCancelEdit = () => {
    profileForm.reset({ name: userData.name, email: userData.email });
    setIsEditingProfile(false);
  };

  async function onProfileSubmit(data: ProfileValues) {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update profile");

      if (result.token) localStorage.setItem("token", result.token);
      if (result.email) localStorage.setItem("userEmail", result.email);

      setUserData(prev => ({ ...prev, name: data.name, email: data.email }));
      toast.success("Profile updated!");
      setIsEditingProfile(false); // Close edit mode on success
    } catch (error: any) {
      toast.error(error.message || "Could not update profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function onPasswordSubmit(data: PasswordValues) {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to change password");

      toast.success("Password changed successfully!");
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error: any) {
      toast.error(error.message || "Could not change password");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">Loading profile...</div>;

  return (
    <TooltipProvider>
      <div className="p-6 max-w-5xl mx-auto space-y-8 h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar">
        
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal profile and security preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* ── LEFT COLUMN: Identity Card ───────────────────────────────── */}
          <Card className="md:col-span-1 overflow-hidden border-primary/10 shadow-sm">
            <div className="h-24 w-full bg-gradient-to-br from-emerald-500/80 to-teal-700"></div>
            
            <CardContent className="pt-0 relative flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-md -mt-12 mb-4 transition-all">
                <AvatarFallback className="text-3xl font-semibold bg-primary text-primary-foreground">
                  {getInitials(userData.name)}
                </AvatarFallback>
              </Avatar>

              <CardTitle className="text-2xl tracking-tight mb-2">{userData.name}</CardTitle>
              <Badge variant={roleBadgeVariant[userData.role?.toLowerCase()] ?? "outline"} className="capitalize mb-6">
                <Shield className="mr-1 h-3 w-3" />
                {userData.role} Account
              </Badge>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm p-3 bg-muted/30 rounded-lg border">
                  <span className="flex items-center text-muted-foreground">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Joined
                  </span>
                  <span className="font-medium">{userData.joinedAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── RIGHT COLUMN: Details & Settings ────────────────────────── */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Personal Information Section (INLINE EDITING) */}
            <Card className="shadow-sm transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User2 className="h-5 w-5 text-muted-foreground" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Your contact details and identity.</CardDescription>
                </div>
                {!isEditingProfile && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="py-6">
                {isEditingProfile ? (
                  // --- EDIT MODE ---
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <Controller
                      name="name" control={profileForm.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                          <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name="email" control={profileForm.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
                          <Input {...field} id={field.name} type="email" aria-invalid={fieldState.invalid} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  // --- VIEW MODE ---
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-full shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Full Name</p>
                          <p className="text-sm font-medium truncate">{userData.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-full shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Email address</p>
                          <p className="text-sm font-medium truncate">{userData.email}</p>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyEmail}>
                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                            <span className="sr-only">Copy email</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isCopied ? "Copied!" : "Copy email"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Section (UNCHANGED) */}
            <Card className="shadow-sm border-destructive/10">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your password and authentication.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="py-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Account Password</p>
                  <p className="text-xs text-muted-foreground mt-1">Ensure your account is using a long, random password to stay secure.</p>
                </div>
                <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(true)}>
                  Change Password
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* ── Dialogs ─────────────────────────── */}
        
        {/* Profile Dialog REMOVED */}

        {/* Change Password Dialog REMAINS */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
            </DialogHeader>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 mt-4">
              <Controller
                name="currentPassword" control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Current Password</FieldLabel>
                    <Input {...field} id={field.name} type="password" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="newPassword" control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                    <Input {...field} id={field.name} type="password" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="confirmPassword" control={passwordForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Confirm New Password</FieldLabel>
                    <Input {...field} id={field.name} type="password" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
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

// Icons
import { Mail, Shield, Copy, Check } from "lucide-react";

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
  
  // Dialog States
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
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
        
        // If there's no token at all, they shouldn't be on this page.
        if (!token) {
          console.warn("No token found. Redirecting to login...");
          window.location.href = "/"; // Change this if your login page is somewhere else
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
           
           setUserData({
               name: currentUser.name || "Unknown",
               email: currentUser.email || "No Email",
               role: currentUser.role || "user",
               joinedAt: currentUser.joinedAt || "Recently" // Fallback if joinedAt isn't in DB
           });
           
           profileForm.reset({ 
               name: currentUser.name || "", 
               email: currentUser.email || "" 
           });
        } else if (response.status === 401) {
           // Token is invalid or expired
           console.error("Token invalid or expired. Please log in again.");
           localStorage.removeItem("token");
           localStorage.removeItem("userEmail");
           window.location.href = "/"; // Redirect to login
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
  }, [profileForm]); // Note: profileForm is in the dependency array


  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const copyEmail = () => {
    navigator.clipboard.writeText(userData.email);
    setIsCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
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
      setIsProfileDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Could not update profile.");
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
      toast.error(error.message || "Could not change password.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;

  return (
    <TooltipProvider>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">

          {/* ── Main profile card ─────────────────────────────────────────── */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-col items-center gap-4 pt-8 pb-4">
              
              {/* Avatar (Initials Only) */}
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                <AvatarFallback className="text-3xl font-semibold bg-primary text-primary-foreground">
                  {getInitials(userData.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name & Role */}
              <div className="flex flex-col items-center gap-2">
                <CardTitle className="text-2xl tracking-tight">{userData.name}</CardTitle>
                <Badge variant={roleBadgeVariant[userData.role?.toLowerCase()] ?? "outline"} className="capitalize">
                  <Shield className="mr-1 h-3 w-3" />
                  {userData.role}
                </Badge>
              </div>
            </CardHeader>

            <Separator />

            {/* ── Detail rows ─────────────────────────────────────────────── */}
            <CardContent className="py-6 space-y-4">
              {/* Email row */}
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Email address</p>
                    <p className="text-sm font-medium truncate">{userData.email}</p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyEmail}>
                      {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="sr-only">Copy email</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isCopied ? "Copied!" : "Copy email"}</TooltipContent>
                </Tooltip>
              </div>

              {/* Role row */}
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Account Role</p>
                  <p className="text-sm font-medium capitalize">{userData.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Action buttons & Dialogs ────────────────────────────────────────────── */}
          <div className="flex gap-3">
            
            {/* EDIT PROFILE DIALOG */}
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
              <Button className="flex-1" variant="default" onClick={() => setIsProfileDialogOpen(true)}>
                Edit Profile
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your personal information.</DialogDescription>
                </DialogHeader>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 mt-4">
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
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input {...field} id={field.name} type="email" aria-invalid={fieldState.invalid} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* CHANGE PASSWORD DIALOG */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <Button className="flex-1" variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
                Change Password
              </Button>
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
        </div>
      </div>
    </TooltipProvider>
  );
}
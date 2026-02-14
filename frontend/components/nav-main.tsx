"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CirclePlusIcon, Loader2 } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (files.length === 0) return
    
    setUploading(true)
    const toastId = toast.loading("Processing sales data...")

    const formData = new FormData()
    formData.append("file", files[0])

    try {
      const response = await fetch("http://127.0.0.1:5000/api/upload-sales", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Inventory Updated", {
          id: toastId,
        })
        setFiles([])
        setOpen(false) 
      } else {
        toast.error("Upload Failed", {
          id: toastId,
          description: data.error || "Something went wrong."
        })
      }
    } catch (error) {
      toast.error("Connection Error", {
        id: toastId,
        description: "Could not connect to the backend server."
      })
    } finally {
      setUploading(false)
    }
  }

  // Handle dialog state to clear files when closed
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) setFiles([])
  }

  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Statistics</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <SidebarMenuItem className="flex items-center gap-2">
              <DialogTrigger asChild>
                <SidebarMenuButton
                  tooltip="Quick Create"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear cursor-pointer"
                >
                  <CirclePlusIcon />
                  <span>Upload Sales Data</span>
                </SidebarMenuButton>
              </DialogTrigger>
            </SidebarMenuItem>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upload Sales Data</DialogTitle>
                <DialogDescription>
                  Drag and drop your daily Excel file here to update inventory.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FileUpload onFilesChange={setFiles} />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                
                <Button 
                  onClick={handleUpload} 
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

        </SidebarMenu>

        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                <Link href={item.url}>
                   {item.icon}
                   <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
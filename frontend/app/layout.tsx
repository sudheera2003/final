import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import the Sidebar parts
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resto App",
  description: "Sales & Inventory Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            {/* The Sidebar Component we just built */}
            <AppSidebar />

            {/* The Main Content Area */}
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" /> {/* sidebar toggle */}
                <div className="h-4 w-[1px] bg-gray-200" />
                <h1 className="font-semibold text-sm">Dashboard</h1>
                <div className="ml-auto">
                  <ModeToggle />
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
  HelpCircle, 
  BookOpen, 
  Cpu, 
  Mail, 
  ShieldAlert, 
  TrendingUp, 
  MessageSquare,
  Loader2
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function HelpPage() {
  // --- FORM STATES ---
  const [issueType, setIssueType] = useState("Bug Report");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- SUBMIT HANDLER ---
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error("Please enter a description for your issue.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to submit a ticket.");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issue_type: issueType,
          description: description,
        }),
      });

      if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const data = await res.json();

      if (res.ok) {
        toast.success("Ticket submitted! The administrator has been notified.");
        setDescription(""); // Clear the text area on success
        setIssueType("Bug Report"); // Reset dropdown
      } else {
        toast.error(data.error || "Failed to submit ticket.");
      }
    } catch (error) {
      toast.error("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex items-center gap-3 border-b pb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Learn how RestoAI predicts your sales, tracks inventory, and assists your management.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: FAQ & How it works */}
        <div className="md:col-span-2 space-y-8">
          
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              How RestoAI Works
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-muted/10">
                <CardHeader className="pb-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
                  <CardTitle className="text-md">Prophet Forecasting</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  The dashboard utilizes Facebook Prophet, an advanced machine learning model, to analyze your past sales data and identify weekly seasonality. It requires at least 5 days of data to generate highly accurate 7-day future predictions.
                </CardContent>
              </Card>
              <Card className="bg-muted/10">
                <CardHeader className="pb-2">
                  <MessageSquare className="h-5 w-5 text-blue-500 mb-2" />
                  <CardTitle className="text-md">Context-Aware AI</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  The Chat-Bot is powered by Google Gemini. Unlike standard bots, it dynamically injects your live database metrics (like current low stock and recent revenue) into its memory before answering, acting as a true restaurant manager.
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="w-full bg-card border rounded-lg px-4">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-primary">
                  How are the "Smart Restock" alerts triggered?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  The system constantly monitors your MongoDB inventory collection. If any ingredient's `stock` level falls equal to or below its designated `low_stock_threshold`, it immediately appears on the Smart Restock list.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-primary">
                  Why isn't a specific menu item showing up in tomorrow's forecast?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  To ensure statistical accuracy, the Prophet model filters out items that do not have enough historical data. A product must be sold on at least 5 distinct days before the AI will attempt to forecast its future performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-primary">
                  How is the "Tomorrow's Master Prep List" calculated?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  When the AI predicts tomorrow's total orders, it cross-references those products with your recipe database. It multiplies the predicted order quantities by the recipe requirements and aggregates them into one master list of raw ingredients.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-primary">
                  Can the RestoAI Chatbot make mistakes?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  Yes. While the Gemini AI is highly advanced and reads your live data, it is a generative model and can occasionally misinterpret complex queries. Always cross-verify critical financial or purchasing decisions with the main dashboard charts.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>

        {/* RIGHT COLUMN: Contact & System Info */}
        <div className="space-y-6 mt-5">
          
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldAlert className="h-5 w-5 text-primary" />
                System Information
              </CardTitle>
              <CardDescription>Current deployment status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-primary/10 pb-2">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0 (Release Candidate)</span>
              </div>
              <div className="flex justify-between border-b border-primary/10 pb-2">
                <span className="text-muted-foreground">Core Module</span>
                <span className="font-medium text-right">Sales Prediction &<br/>Inventory Tracking</span>
              </div>
              <div className="flex justify-between border-primary/10 pb-2">
                <span className="text-muted-foreground">ML Engine</span>
                <span className="font-medium">Prophet / Gemini</span>
              </div>
            </CardContent>
          </Card>

          {/* SUPPORT TICKET FORM */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Contact Administrator
              </CardTitle>
              <CardDescription>Submit a bug report or feature request.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Issue Type</label>
                  <select 
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Bug Report">Bug Report</option>
                    <option value="Inventory Discrepancy">Inventory Discrepancy</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Description</label>
                  <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..." 
                    className="resize-none h-24"
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Ticket"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
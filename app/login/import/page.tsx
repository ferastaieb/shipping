"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type ImportResult = {
  message: string;
  inserted?: Record<string, number>;
  counters?: Record<string, number>;
};

export default function ImportSqlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".sql")) {
      toast({ title: "Invalid file", description: "Please upload a .sql file.", variant: "destructive" });
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "No file", description: "Please select a SQL backup file.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-sql", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Import failed.");
      }
      setResult(data);
      toast({ title: "Import complete", description: "SQL data imported to DynamoDB." });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Import SQL Backup</CardTitle>
          <CardDescription>Upload your MySQL .sql backup to migrate data into DynamoDB.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-md p-6 bg-white text-center text-sm text-gray-600"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0] || null);
              }}
            >
              Drag & drop your `.sql` file here, or select it below.
            </div>
            <div className="space-y-2">
              <Label htmlFor="sqlFile">SQL File</Label>
              <Input
                id="sqlFile"
                type="file"
                accept=".sql"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-gray-500">Selected: {file.name}</p>}
            </div>
            {result && (
              <div className="text-sm text-gray-700 space-y-2">
                <div>{result.message}</div>
                {result.inserted && (
                  <div>
                    <div className="font-medium">Inserted records:</div>
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
{JSON.stringify(result.inserted, null, 2)}
                    </pre>
                  </div>
                )}
                {result.counters && (
                  <div>
                    <div className="font-medium">Counters updated:</div>
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
{JSON.stringify(result.counters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import SQL"
              )}
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

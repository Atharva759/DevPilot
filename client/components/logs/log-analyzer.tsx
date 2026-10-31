"use client";

import { useState, useRef } from "react";
import { Terminal, Upload, FileText, Sparkles, RefreshCw, StopCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogAnalyzer } from "@/hooks/use-log-analyzer";
import { LogResult } from "@/components/logs/log-result";

export function LogAnalyzer() {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [logText, setLogText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    analysisText,
    isAnalyzing,
    error,
    analyzeText,
    analyzeFile,
    stopAnalysis,
    reset,
  } = useLogAnalyzer();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (activeTab === "paste") {
      if (!logText.trim()) return;
      await analyzeText(logText.trim());
    } else {
      if (!selectedFile) return;
      await analyzeFile(selectedFile);
    }
  };

  const isInputEmpty =
    activeTab === "paste" ? !logText.trim() : !selectedFile;
  const hasResult = Boolean(analysisText || isAnalyzing || error);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">CI/CD Failure Log Explainer</h1>
        <p className="text-sm text-muted-foreground">
          Instantly identify the root cause of build, test, and pipeline errors with step-by-step resolution advice.
        </p>
      </div>

      {!hasResult ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Submit Build or CI Log</CardTitle>
            <CardDescription>
              Paste the console output from GitHub Actions, GitLab CI, Docker, or your local terminal, or upload a log file.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "paste" | "upload")}>
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                <TabsTrigger value="paste" className="gap-2">
                  <Terminal className="size-4" />
                  Paste Log
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="size-4" />
                  Upload File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <label htmlFor="log-content" className="text-sm font-medium">
                    Raw Console Output
                  </label>
                  <Textarea
                    id="log-content"
                    rows={14}
                    className="font-mono text-xs"
                    placeholder="[ERROR] Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin:3.11.0:compile...&#10;npm ERR! code ELIFECYCLE&#10;npm ERR! errno 1..."
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 pt-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".log,.txt,text/plain"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <FileText className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : "Click to select or drag and drop your log file"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : "Supports .log and .txt build logs"}
                    </p>
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    <span className="font-mono truncate">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleStartAnalysis}
                disabled={isInputEmpty || isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Analyzing Log…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Explain Failure
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Source: {activeTab === "paste" ? "Pasted Console Log" : selectedFile?.name}
            </span>
            {isAnalyzing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopAnalysis}
                className="gap-1.5"
              >
                <StopCircle className="size-4" />
                Stop
              </Button>
            )}
          </div>

          <LogResult
            content={analysisText}
            isStreaming={isAnalyzing}
            error={error}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}

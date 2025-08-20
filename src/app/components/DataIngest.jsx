"use client";

import { useState } from "react";
import UploadButton from "./UploadButton";

export default function DataIngest() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [textContent, setTextContent] = useState("");
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' or 'text'

  const handleFileUpload = async (files) => {
    setIsProcessing(true);
    setMessage("Processing documents...");

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process documents");
      }

      const result = await response.json();
      setMessage(
        `✅ Successfully processed ${result.documentsProcessed} documents with ${result.totalChunks} chunks`
      );
      setUploadedFiles((prev) => [
        ...prev,
        ...Array.from(files).map((f) => f.name),
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error processing documents. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setMessage("❌ Please enter some text content");
      return;
    }

    setIsProcessing(true);
    setMessage("Processing text content...");

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textContent: textContent.trim(),
          filename: `Text_${Date.now()}.txt`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process text");
      }

      const result = await response.json();
      setMessage(
        `✅ Successfully processed text content with ${result.totalChunks} chunks`
      );
      setUploadedFiles((prev) => [
        ...prev,
        `Text Content (${new Date().toLocaleTimeString()})`,
      ]);
      setTextContent("");
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error processing text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "upload"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📁 Upload Files
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "text"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📝 Add Text
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[200px]">
        {activeTab === "upload" ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
            <UploadButton
              onFileUpload={handleFileUpload}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className="mt-6 flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-slate-600 font-medium">
                  Processing files...
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your text content here... This could be notes, articles, documentation, or any text you want to chat with."
                className="w-full h-40 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white/80 backdrop-blur-sm"
                disabled={isProcessing}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {textContent.length} characters
              </div>
            </div>

            <button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textContent.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </span>
              ) : (
                "✨ Process Text Content"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border ${
            message.includes("❌")
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-green-50 text-green-800 border-green-200"
          }`}
        >
          <div className="flex items-start space-x-2">
            <div className="font-medium">{message}</div>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center space-x-2">
            <span>📚 Knowledge Base Content</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-full text-xs">
              {uploadedFiles.length} items
            </span>
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map((filename, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-slate-700 flex-1 truncate">
                  {filename}
                </span>
                <span className="text-slate-500 text-xs">Added</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

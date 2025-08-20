"use client";

import { useState, useEffect } from "react";
import { useClientOnly } from "@/hooks/useClientSafe";
import UploadButton from "./UploadButton";

export default function DataIngest() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [textContent, setTextContent] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [activeTab, setActiveTab] = useState("upload"); // 'upload', 'text', or 'url'
  const isClient = useClientOnly();

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
        `Text Content (${
          isClient ? new Date().toLocaleTimeString() : "Added"
        })`,
      ]);
      setTextContent("");
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error processing text. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!websiteUrl.trim()) {
      setMessage("❌ Please enter a website URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(websiteUrl);
    } catch {
      setMessage("❌ Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsProcessing(true);
    setMessage("Scraping website content...");

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process website");
      }

      const result = await response.json();
      setMessage(
        `✅ Successfully processed website content with ${result.totalChunks} chunks`
      );
      setUploadedFiles((prev) => [
        ...prev,
        `Website: ${new URL(websiteUrl).hostname} (${
          isClient ? new Date().toLocaleTimeString() : "Added"
        })`,
      ]);
      setWebsiteUrl("");
    } catch (error) {
      console.error("Error:", error);
      setMessage(
        "❌ Error processing website. Please check the URL and try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "upload"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📁 Upload Files
        </button>
        <button
          onClick={() => setActiveTab("text")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📝 Add Text
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "url"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🌐 Website URL
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[200px]">
        {activeTab === "upload" ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors duration-200">
            <UploadButton
              onFileUpload={handleFileUpload}
              disabled={isProcessing}
            />

            {isProcessing && (
              <div className="mt-6 flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="text-gray-600 font-medium">
                  Processing files...
                </span>
              </div>
            )}
          </div>
        ) : activeTab === "text" ? (
          <div className="space-y-4">
            <div className="relative">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your text content here... This could be notes, articles, documentation, or any text you want to chat with."
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white/80 backdrop-blur-sm text-black placeholder-gray-500"
                disabled={isProcessing}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                {textContent.length} characters
              </div>
            </div>

            <button
              onClick={handleTextSubmit}
              disabled={isProcessing || !textContent.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
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
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700">
                  Scrape Website Content
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Enter a website URL to scrape and process its content
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="Enter website URL (e.g., https://www.w3schools.com/html/)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-black placeholder-gray-500"
                  disabled={isProcessing}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleUrlSubmit}
                disabled={isProcessing || !websiteUrl.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Scraping Website...</span>
                  </span>
                ) : (
                  "🌐 Scrape & Process Website"
                )}
              </button>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Scrapes text content from the website</li>
                      <li>
                        • Processes and chunks the content for better search
                      </li>
                      <li>• Creates embeddings for semantic search</li>
                      <li>• Enables you to chat with the website content</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
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
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center space-x-2">
            <span>📚 Knowledge Base Content</span>
            <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
              {uploadedFiles.length} items
            </span>
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {uploadedFiles.map((filename, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-700 flex-1 truncate">
                  {filename}
                </span>
                <span className="text-gray-500 text-xs">Added</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

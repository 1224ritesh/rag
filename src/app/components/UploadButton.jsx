"use client";

import { useRef, useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export default function UploadButton({ onFileUpload, disabled = false }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFiles = (files) => {
    const validFiles = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Maximum size is 5MB.`
        );
      } else {
        validFiles.push(file);
      }
    });

    return { validFiles, errors };
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const { validFiles, errors } = validateFiles(files);

      if (errors.length > 0) {
        alert(`File size errors:\n\n${errors.join("\n")}`);
      }

      if (validFiles.length > 0) {
        onFileUpload(validFiles);
      }
    }

    // Reset input
    e.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const { validFiles, errors } = validateFiles(files);

      if (errors.length > 0) {
        alert(`File size errors:\n\n${errors.join("\n")}`);
      }

      if (validFiles.length > 0) {
        onFileUpload(validFiles);
      }
    }
  };

  return (
    <div
      className={`relative transition-all duration-200 ${
        dragOver ? "scale-105" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.docx"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        className={`p-8 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : disabled
            ? "border-slate-300 bg-slate-100 cursor-not-allowed"
            : "border-slate-400 hover:border-blue-500 hover:bg-blue-50"
        }`}
        onClick={handleClick}
      >
        <div className="text-center space-y-4">
          {/* Upload Icon */}
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              dragOver
                ? "bg-blue-100"
                : disabled
                ? "bg-slate-200"
                : "bg-slate-100"
            }`}
          >
            <svg
              className={`w-8 h-8 ${
                dragOver
                  ? "text-blue-600"
                  : disabled
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div>
            <h3
              className={`text-lg font-semibold ${
                disabled ? "text-slate-400" : "text-slate-700"
              }`}
            >
              {dragOver ? "Drop files here" : "Upload Documents"}
            </h3>
            <p
              className={`text-sm mt-1 ${
                disabled ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {dragOver
                ? "Release to upload files"
                : "Click to browse or drag and drop files here"}
            </p>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            disabled={disabled}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              disabled
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {disabled ? "Processing..." : "📁 Choose Files"}
          </button>

          {/* File Info */}
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Supported formats: PDF, TXT, MD, DOCX
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Maximum file size: 5MB per file
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    FileUp,
    FileText,
    ArrowLeft,
    Maximize2,
    Minimize2,
    ExternalLink,
    Download,
    X,
    RefreshCw,
    AlertCircle,
    Eye,
} from "lucide-react";

interface PdfViewerPageProps {
    onNavigate?: (path: string) => void;
}

export default function PdfViewerPage({ onNavigate }: PdfViewerPageProps) {
    const [file, setFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Clean up Object URL when file changes or component unmounts
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    // Track browser fullscreen changes (e.g. Esc key)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    const handleSelectFile = (selectedFile: File) => {
        setError(null);
        const isPdf =
            selectedFile.type === "application/pdf" ||
            selectedFile.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
            setError("Tệp không đúng định dạng. Vui lòng chọn tệp .pdf");
            return;
        }

        // Revoke previous object URL if any
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }

        const url = URL.createObjectURL(selectedFile);
        setFile(selectedFile);
        setPdfUrl(url);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleSelectFile(files[0]);
        }
        // Reset input value so the same file can be re-selected if needed
        e.target.value = "";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            handleSelectFile(droppedFiles[0]);
        }
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await containerRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    };

    const handleClose = () => {
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        setFile(null);
        setError(null);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div
            ref={containerRef}
            className={`w-full flex-1 flex flex-col font-sans transition-colors duration-200 ${
                isFullscreen
                    ? "fixed inset-0 z-50 bg-[#F4F7F5] dark:bg-[#1E2B3E] p-2 sm:p-4"
                    : "p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto"
            }`}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileInputChange}
            />

            <AnimatePresence mode="wait">
                {!pdfUrl ? (
                    /* 1. UPLOAD VIEW (MINIMALIST & CLEAN) */
                    <motion.div
                        key="upload-zone"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 flex flex-col items-center justify-center min-h-[65vh] py-8"
                    >
                        {/* Header bar / Breadcrumb */}
                        {onNavigate && (
                            <div className="w-full max-w-2xl mb-4 flex items-center justify-between">
                                <button
                                    onClick={() => onNavigate("/")}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-300 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Về trang chủ</span>
                                </button>
                                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                                    /pdf
                                </span>
                            </div>
                        )}

                        <div className="w-full max-w-2xl">
                            {/* Card Container */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative group cursor-pointer rounded-3xl border-2 border-dashed p-8 sm:p-12 transition-all duration-300 flex flex-col items-center text-center bg-white dark:bg-[#27374D] shadow-xs ${
                                    isDragging
                                        ? "border-brand-500 bg-brand-50/40 dark:bg-brand-500/10 scale-[1.01]"
                                        : "border-slate-200 dark:border-slate-700/70 hover:border-brand-400 dark:hover:border-brand-300 hover:shadow-md"
                                }`}
                            >
                                {/* Floating Badge / Icon */}
                                <div
                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105 ${
                                        isDragging
                                            ? "bg-brand-500 text-white"
                                            : "bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300"
                                    }`}
                                >
                                    <FileUp className="w-8 h-8 sm:w-10 sm:h-10" />
                                </div>

                                {/* Main Titles */}
                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                                    Tải lên tài liệu PDF
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
                                    Kéo thả tệp PDF vào đây, hoặc nhấn để duyệt tệp từ thiết bị của bạn.
                                </p>

                                {/* Action Button */}
                                <button
                                    type="button"
                                    className="px-5 py-2.5 sm:px-6 sm:py-3 bg-brand-500 hover:bg-brand-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer shadow-sm flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Chọn tệp PDF</span>
                                </button>

                                {/* Subtle Feature Highlights */}
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60 w-full flex items-center justify-center gap-6 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-brand-500/80" />
                                        Xem tức thì
                                    </span>
                                    <span>&bull;</span>
                                    <span>Tối giản & tối ưu</span>
                                    <span>&bull;</span>
                                    <span>Không lưu trên server</span>
                                </div>
                            </div>

                            {/* Error notification */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold"
                                    >
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                ) : (
                    /* 2. PDF VIEWER (FULL-FEATURED & STREAMLINED) */
                    <motion.div
                        key="viewing-pdf"
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 flex flex-col h-full min-h-0"
                    >
                        {/* Minimalist Toolbar */}
                        <div className="bg-white dark:bg-[#27374D] border border-slate-200/80 dark:border-slate-700/70 rounded-2xl px-3.5 py-2.5 mb-3 flex items-center justify-between gap-3 shadow-xs flex-wrap sm:flex-nowrap">
                            {/* Left: File Info & Back button */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    onClick={handleClose}
                                    title="Quay lại chọn tệp"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>

                                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                                    PDF
                                </div>

                                <div className="min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                                    <span
                                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md"
                                        title={file?.name}
                                    >
                                        {file?.name || "Tài liệu.pdf"}
                                    </span>
                                    {file?.size ? (
                                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                            {formatFileSize(file.size)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                                {/* Change File Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Tải lên tệp khác"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Đổi tệp</span>
                                </button>

                                {/* Open in New Tab */}
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Mở tab mới"
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Tab mới</span>
                                </a>

                                {/* Download */}
                                <a
                                    href={pdfUrl}
                                    download={file?.name || "tai-lieu.pdf"}
                                    title="Tải về máy"
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Tải về</span>
                                </a>

                                {/* Fullscreen */}
                                <button
                                    onClick={toggleFullscreen}
                                    title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                                    className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    {isFullscreen ? (
                                        <Minimize2 className="w-3.5 h-3.5" />
                                    ) : (
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    )}
                                    <span className="hidden lg:inline">
                                        {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                                    </span>
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={handleClose}
                                    title="Đóng tệp"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* PDF Native View Container */}
                        <div className="flex-1 w-full min-h-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E2B3E] shadow-sm relative flex flex-col">
                            <object
                                data={`${pdfUrl}#toolbar=1&navpanes=1`}
                                type="application/pdf"
                                className="w-full flex-1 h-[78vh] sm:h-[82vh] lg:h-[85vh] rounded-2xl"
                            >
                                <iframe
                                    src={`${pdfUrl}#toolbar=1`}
                                    title={file?.name || "Tài liệu PDF"}
                                    className="w-full h-full border-none"
                                >
                                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                            Trình duyệt không hỗ trợ xem trực tiếp tệp PDF này.
                                        </p>
                                        <a
                                            href={pdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold"
                                        >
                                            Mở tệp trong thẻ mới
                                        </a>
                                    </div>
                                </iframe>
                            </object>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

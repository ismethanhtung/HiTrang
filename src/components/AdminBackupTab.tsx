import React, { useState, useEffect, useId } from "react";
import {
    Database,
    Download,
    Upload,
    Trash2,
    RotateCcw,
    Shield,
    Clock,
    HardDrive,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Search,
    Lock,
    Eye,
    EyeOff,
    FileArchive,
    Check,
    X,
    Users,
    FileText,
    Award,
    Bug,
} from "lucide-react";
import {
    getBackupList,
    createManualBackup,
    downloadBackupFile,
    deleteBackupFile,
    restoreBackupFile,
    uploadAndRestoreBackup,
    BackupSnapshot,
    BackupListResponse,
} from "../lib/supabaseService";

export default function AdminBackupTab() {
    const fileUploadId = useId();
    const [backups, setBackups] = useState<BackupSnapshot[]>([]);
    const [meta, setMeta] = useState<BackupListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error" | "info";
        text: string;
    } | null>(null);

    // Modal States
    // 1. Passkey Modal (for Download & Delete)
    const [passkeyModal, setPasskeyModal] = useState<{
        isOpen: boolean;
        action: "download" | "delete";
        snapshot: BackupSnapshot | null;
    }>({
        isOpen: false,
        action: "download",
        snapshot: null,
    });
    const [passkeyInput, setPasskeyInput] = useState("");
    const [showPasskey, setShowPasskey] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string | null>(null);

    // 2. Restore Modal
    const [restoreModal, setRestoreModal] = useState<{
        isOpen: boolean;
        snapshot: BackupSnapshot | null;
    }>({
        isOpen: false,
        snapshot: null,
    });
    const [restorePasskey, setRestorePasskey] = useState("");
    const [showRestorePasskey, setShowRestorePasskey] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

    // 3. Upload & Restore Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPasskey, setUploadPasskey] = useState("");
    const [showUploadPasskey, setShowUploadPasskey] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const loadBackups = async () => {
        setLoading(true);
        try {
            const data = await getBackupList();
            setBackups(data.backups || []);
            setMeta(data);
        } catch (err: any) {
            console.error("Lỗi khi tải danh sách sao lưu:", err);
            setStatusMessage({
                type: "error",
                text: err.message || "Không thể tải danh sách bản sao lưu",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    // Create manual backup immediately
    const handleCreateManual = async () => {
        setCreatingBackup(true);
        setStatusMessage(null);
        try {
            const res = await createManualBackup();
            setStatusMessage({
                type: "success",
                text: res.message || "Đã tạo bản sao lưu thủ công thành công!",
            });
            await loadBackups();
        } catch (err: any) {
            setStatusMessage({
                type: "error",
                text: `Lỗi tạo sao lưu: ${err.message}`,
            });
        } finally {
            setCreatingBackup(false);
        }
    };

    // Open Passkey Modal
    const openPasskeyModal = (
        action: "download" | "delete",
        snapshot: BackupSnapshot,
    ) => {
        setPasskeyModal({ isOpen: true, action, snapshot });
        setPasskeyInput("");
        setPasskeyError(null);
        setShowPasskey(false);
    };

    const handlePasskeySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passkeyModal.snapshot || !passkeyInput.trim()) {
            setPasskeyError("Vui lòng nhập mật khẩu cấp 2");
            return;
        }

        setPasskeyLoading(true);
        setPasskeyError(null);

        try {
            if (passkeyModal.action === "download") {
                const blob = await downloadBackupFile(
                    passkeyModal.snapshot.filename,
                    passkeyInput,
                );
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = passkeyModal.snapshot.filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                setPasskeyModal({ isOpen: false, action: "download", snapshot: null });
                setStatusMessage({
                    type: "success",
                    text: `Đã tải xuống thành công bản sao lưu "${passkeyModal.snapshot.filename}"`,
                });
            } else if (passkeyModal.action === "delete") {
                const res = await deleteBackupFile(
                    passkeyModal.snapshot.filename,
                    passkeyInput,
                );
                setPasskeyModal({ isOpen: false, action: "delete", snapshot: null });
                setStatusMessage({
                    type: "success",
                    text: res.message || "Đã xoá bản sao lưu thành công",
                });
                await loadBackups();
            }
        } catch (err: any) {
            setPasskeyError(err.message || "Mật khẩu cấp 2 không chính xác!");
        } finally {
            setPasskeyLoading(false);
        }
    };

    // Open Restore Modal
    const openRestoreModal = (snapshot: BackupSnapshot) => {
        setRestoreModal({ isOpen: true, snapshot });
        setRestorePasskey("");
        setRestoreError(null);
        setRestoreSuccess(null);
        setShowRestorePasskey(false);
    };

    const handleRestoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restoreModal.snapshot || !restorePasskey.trim()) {
            setRestoreError("Vui lòng nhập mật khẩu cấp 2 để xác nhận");
            return;
        }

        setRestoreLoading(true);
        setRestoreError(null);

        try {
            const res = await restoreBackupFile(
                restoreModal.snapshot.filename,
                restorePasskey,
            );
            setRestoreSuccess(
                res.message || "Hệ thống đã phục hồi dữ liệu thành công!",
            );
            setTimeout(() => {
                setRestoreModal({ isOpen: false, snapshot: null });
                loadBackups();
            }, 1800);
        } catch (err: any) {
            setRestoreError(err.message || "Phục hồi dữ liệu thất bại!");
        } finally {
            setRestoreLoading(false);
        }
    };

    // Handle Upload & Restore
    const handleUploadRestoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) {
            setUploadError("Vui lòng chọn file backup (.zip)");
            return;
        }
        if (!uploadPasskey.trim()) {
            setUploadError("Vui lòng nhập mật khẩu cấp 2");
            return;
        }

        setUploadLoading(true);
        setUploadError(null);

        try {
            const res = await uploadAndRestoreBackup(uploadFile, uploadPasskey);
            setStatusMessage({
                type: "success",
                text: res.message || "Đã phục hồi dữ liệu từ file tải lên thành công!",
            });
            setUploadModalOpen(false);
            setUploadFile(null);
            setUploadPasskey("");
            await loadBackups();
        } catch (err: any) {
            setUploadError(err.message || "Khôi phục dữ liệu thất bại");
        } finally {
            setUploadLoading(false);
        }
    };

    const formatDateTime = (isoString: string) => {
        if (!isoString) return "-";
        try {
            const d = new Date(isoString);
            return d.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return isoString;
        }
    };

    const filteredBackups = backups.filter((b) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            b.filename.toLowerCase().includes(q) ||
            b.createdAt.toLowerCase().includes(q) ||
            (b.type === "auto" ? "tự động" : "thủ công").includes(q)
        );
    });

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                Quản Lý Sao Lưu & Phục Hồi Dữ Liệu
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Tự động sao lưu mỗi 1 giờ, lưu giữ tối đa 50 bản
                                snapshot an toàn với mật khẩu cấp 2.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={loadBackups}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                        />
                        <span>Làm mới</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setUploadModalOpen(true);
                            setUploadError(null);
                            setUploadFile(null);
                            setUploadPasskey("");
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tải lên file (.zip)</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCreateManual}
                        disabled={creatingBackup}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-98 rounded-xl transition-all shadow-sm shadow-brand-500/20 cursor-pointer disabled:opacity-60"
                    >
                        {creatingBackup ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang tạo bản sao lưu...</span>
                            </>
                        ) : (
                            <>
                                <Database className="w-3.5 h-3.5" />
                                <span>Tạo bản sao lưu ngay</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Alert Status Banner */}
            {statusMessage && (
                <div
                    className={`p-3.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                        statusMessage.type === "success"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40"
                            : statusMessage.type === "error"
                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40"
                              : "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/40"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {statusMessage.type === "success" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {statusMessage.type === "error" && (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span className="font-medium">{statusMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStatusMessage(null)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Retention Count */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Bản sao lưu đang giữ
                        </span>
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <FileArchive className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                            {meta?.totalCount ?? backups.length}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                            / {meta?.maxLimit ?? 50} bản tối đa
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(
                                    100,
                                    ((meta?.totalCount ?? backups.length) /
                                        (meta?.maxLimit ?? 50)) *
                                        100,
                                )}%`,
                            }}
                        />
                    </div>
                </div>

                {/* 2. Auto Interval */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Lịch tự động sao lưu
                        </span>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                            1 Giờ / Lần
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Đang chạy nền tự động</span>
                    </div>
                </div>

                {/* 3. Total Storage */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Tổng dung lượng snapshot
                        </span>
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                            <HardDrive className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                            {meta?.totalSizeFormatted ?? "0 B"}
                        </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                        Bao gồm CSDL & thư mục uploads
                    </p>
                </div>

                {/* 4. Security Level */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Bảo mật thao tác
                        </span>
                        <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Shield className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                            Mật khẩu cấp 2
                        </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                        Bắt buộc khi Tải về, Xóa & Phục hồi
                    </p>
                </div>
            </div>

            {/* List & Search Container */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs overflow-hidden">
                {/* Search / Filter bar */}
                <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm file backup theo tên hoặc ngày..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
                        />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-center">
                        Hiển thị {filteredBackups.length} / {backups.length} bản
                        sao lưu
                    </div>
                </div>

                {/* Table / List */}
                {loading ? (
                    <div className="py-16 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-600 dark:text-brand-400 mb-3" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Đang tải danh sách bản sao lưu...
                        </p>
                    </div>
                ) : filteredBackups.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            Chưa có bản sao lưu nào
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Hệ thống sẽ tự động tạo sao lưu mỗi 1 giờ hoặc bạn có
                            thể nhấn nút &ldquo;Tạo bản sao lưu ngay&rdquo; ở góc trên.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredBackups.map((snapshot) => (
                            <div
                                key={snapshot.filename}
                                className="p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                            >
                                {/* Left: Info */}
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <div
                                        className={`p-2.5 rounded-xl shrink-0 ${
                                            snapshot.type === "auto"
                                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                                : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400"
                                        }`}
                                    >
                                        <FileArchive className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate font-mono">
                                                {snapshot.filename}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                                    snapshot.type === "auto"
                                                        ? "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                                        : "bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                                                }`}
                                            >
                                                {snapshot.type === "auto"
                                                    ? "Tự động"
                                                    : "Thủ công"}
                                            </span>
                                            {snapshot.isValid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Check className="w-3 h-3" />
                                                    Nguyên vẹn
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Lỗi cấu trúc
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                            <span>
                                                Thời gian:{" "}
                                                <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                                                    {formatDateTime(
                                                        snapshot.createdAt,
                                                    )}
                                                </strong>
                                            </span>
                                            <span>•</span>
                                            <span>
                                                Kích thước:{" "}
                                                <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                                                    {snapshot.sizeFormatted}
                                                </strong>
                                            </span>
                                        </div>

                                        {/* Snapshot Data Counts summary */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                                <Users className="w-3 h-3 text-slate-500" />
                                                {snapshot.totalUsers} người dùng
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                                <FileText className="w-3 h-3 text-slate-500" />
                                                {snapshot.totalQuizzes} đề thi
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                                <Award className="w-3 h-3 text-slate-500" />
                                                {snapshot.totalSubmissions} bài làm
                                            </span>
                                            {snapshot.totalBugReports > 0 && (
                                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                                    <Bug className="w-3 h-3 text-slate-500" />
                                                    {snapshot.totalBugReports} báo cáo
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                                    {/* Download */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openPasskeyModal("download", snapshot)
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                                        title="Tải về file snapshot này (Cần mật khẩu cấp 2)"
                                    >
                                        <Download className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Tải về</span>
                                    </button>

                                    {/* Restore */}
                                    <button
                                        type="button"
                                        onClick={() => openRestoreModal(snapshot)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/50 rounded-lg transition-all cursor-pointer"
                                        title="Khôi phục toàn bộ hệ thống từ bản này"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <span>Khôi phục</span>
                                    </button>

                                    {/* Delete */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openPasskeyModal("delete", snapshot)
                                        }
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/40 rounded-lg transition-all cursor-pointer"
                                        title="Xoá bản sao lưu này"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ================= MODAL 1: PASSKEY (Download / Delete) ================= */}
            {passkeyModal.isOpen && passkeyModal.snapshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {passkeyModal.action === "download"
                                        ? "Tải Xuống Bản Sao Lưu"
                                        : "Xác Nhận Xoá Bản Sao Lưu"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setPasskeyModal({
                                        isOpen: false,
                                        action: "download",
                                        snapshot: null,
                                    })
                                }
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {passkeyModal.action === "download"
                                ? "File sao lưu chứa toàn bộ cơ sở dữ liệu và bảo mật. Vui lòng nhập mật khẩu cấp 2 để tải xuống:"
                                : "Hành động này sẽ xóa vĩnh viễn bản sao lưu này khỏi server. Vui lòng nhập mật khẩu cấp 2 để xác nhận:"}
                        </p>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                            {passkeyModal.snapshot.filename} (
                            {passkeyModal.snapshot.sizeFormatted})
                        </div>

                        <form onSubmit={handlePasskeySubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Mật khẩu cấp 2:
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasskey ? "text" : "password"}
                                        value={passkeyInput}
                                        onChange={(e) =>
                                            setPasskeyInput(e.target.value)
                                        }
                                        placeholder="Nhập mật khẩu cấp 2..."
                                        autoFocus
                                        className="w-full pl-3.5 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPasskey(!showPasskey)
                                        }
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showPasskey ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {passkeyError && (
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>{passkeyError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPasskeyModal({
                                            isOpen: false,
                                            action: "download",
                                            snapshot: null,
                                        })
                                    }
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={passkeyLoading || !passkeyInput}
                                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                                        passkeyModal.action === "delete"
                                            ? "bg-rose-600 hover:bg-rose-700"
                                            : "bg-brand-600 hover:bg-brand-700"
                                    }`}
                                >
                                    {passkeyLoading
                                        ? "Đang xử lý..."
                                        : passkeyModal.action === "download"
                                          ? "Tải Xuống File"
                                          : "Xác Nhận Xoá"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 2: RESTORE CONFIRMATION ================= */}
            {restoreModal.isOpen && restoreModal.snapshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Khôi Phục Toàn Bộ Hệ Thống
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Thao tác cực kỳ quan trọng & ảnh hưởng toàn hệ thống
                                    </p>
                                </div>
                            </div>
                            {!restoreLoading && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setRestoreModal({
                                            isOpen: false,
                                            snapshot: null,
                                        })
                                    }
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Dangerous warning banner */}
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
                            <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>CẢNH BÁO: GHI ĐÈ DỮ LIỆU</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300/90">
                                Hành động này sẽ thay thế toàn bộ dữ liệu hiện tại
                                (Users, Đề thi, Lịch sử làm bài, Điểm số, Uploads)
                                bằng dữ liệu chính xác tại thời điểm sao lưu của file
                                này!
                            </p>
                        </div>

                        {/* Snapshot details card */}
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">File sao lưu:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {restoreModal.snapshot.filename}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Thời gian tạo:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {formatDateTime(restoreModal.snapshot.createdAt)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Dữ liệu phục hồi:</span>
                                <span className="font-semibold text-brand-600 dark:text-brand-400">
                                    {restoreModal.snapshot.totalUsers} người dùng •{" "}
                                    {restoreModal.snapshot.totalQuizzes} đề thi •{" "}
                                    {restoreModal.snapshot.totalSubmissions} bài làm
                                </span>
                            </div>
                        </div>

                        {restoreSuccess ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                    {restoreSuccess}
                                </h4>
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    Đang tải lại dữ liệu hệ thống...
                                </p>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleRestoreSubmit}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Nhập mật khẩu cấp 2 để xác nhận:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={
                                                showRestorePasskey
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={restorePasskey}
                                            onChange={(e) =>
                                                setRestorePasskey(e.target.value)
                                            }
                                            placeholder="Nhập mật khẩu cấp 2..."
                                            autoFocus
                                            disabled={restoreLoading}
                                            className="w-full pl-3.5 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowRestorePasskey(
                                                    !showRestorePasskey,
                                                )
                                            }
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                        >
                                            {showRestorePasskey ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {restoreError && (
                                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                        <span>{restoreError}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        disabled={restoreLoading}
                                        onClick={() =>
                                            setRestoreModal({
                                                isOpen: false,
                                                snapshot: null,
                                            })
                                        }
                                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            restoreLoading ||
                                            !restorePasskey.trim()
                                        }
                                        className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-sm shadow-amber-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                                    >
                                        {restoreLoading ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Đang kiểm tra & Khôi phục...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Bắt đầu khôi phục</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ================= MODAL 3: UPLOAD & RESTORE ================= */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                        Tải Lên File & Khôi Phục
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Khôi phục hệ thống từ file .zip máy tính của bạn
                                    </p>
                                </div>
                            </div>
                            {!uploadLoading && (
                                <button
                                    type="button"
                                    onClick={() => setUploadModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* File Selector */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Chọn file sao lưu (.zip):
                            </label>
                            <label
                                htmlFor={fileUploadId}
                                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-4 text-center block cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30"
                            >
                                <input
                                    id={fileUploadId}
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => {
                                        if (
                                            e.target.files &&
                                            e.target.files.length > 0
                                        ) {
                                            setUploadFile(e.target.files[0]);
                                        }
                                    }}
                                    className="hidden"
                                />
                                {uploadFile ? (
                                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                                        <FileArchive className="w-4 h-4" />
                                        <span>{uploadFile.name}</span>
                                        <span className="text-slate-400 text-[10px]">
                                            (
                                            {(
                                                uploadFile.size /
                                                (1024 * 1024)
                                            ).toFixed(2)}{" "}
                                            MB)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Nhấn để chọn file sao lưu (.zip)
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            Chỉ chấp nhận file định dạng .zip chuẩn do hệ thống tạo
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <form
                            onSubmit={handleUploadRestoreSubmit}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Mật khẩu cấp 2:
                                </label>
                                <div className="relative">
                                    <input
                                        type={
                                            showUploadPasskey
                                                ? "text"
                                                : "password"
                                        }
                                        value={uploadPasskey}
                                        onChange={(e) =>
                                            setUploadPasskey(e.target.value)
                                        }
                                        placeholder="Nhập mật khẩu cấp 2..."
                                        disabled={uploadLoading}
                                        className="w-full pl-3.5 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowUploadPasskey(
                                                !showUploadPasskey,
                                            )
                                        }
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showUploadPasskey ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    disabled={uploadLoading}
                                    onClick={() => setUploadModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        uploadLoading ||
                                        !uploadFile ||
                                        !uploadPasskey.trim()
                                    }
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {uploadLoading ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Đang tải lên & Phục hồi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Khôi phục dữ liệu</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

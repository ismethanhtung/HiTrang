import React, { useState, useEffect, useId, useMemo } from "react";
import {
    Database,
    Download,
    Upload,
    Trash2,
    RotateCcw,
    RefreshCw,
    Search,
    Lock,
    Eye,
    EyeOff,
    FileArchive,
    Check,
    X,
    AlertCircle,
    CheckCircle2,
    Users,
    FileText,
    Award,
    Bug,
    Clock,
    AlertTriangle,
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
    const [filterType, setFilterType] = useState<"all" | "auto" | "manual">("all");
    const [statusMessage, setStatusMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    // Modal 1: Passkey (Download / Delete)
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

    // Modal 2: Restore from existing snapshot
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

    // Modal 3: Upload from local file & restore
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

    // Passkey submit (Download or Delete)
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
                    text: `Đã tải xuống thành công "${passkeyModal.snapshot.filename}"`,
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

    // Restore existing snapshot submit
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
            setRestoreSuccess(res.message || "Phục hồi dữ liệu hệ thống thành công!");
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

    // Upload & restore submit
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

    const formatDate = (isoStr: string) => {
        if (!isoStr) return "—";
        try {
            const d = new Date(isoStr);
            return d.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return isoStr;
        }
    };

    const filteredBackups = useMemo(() => {
        return backups.filter((b) => {
            if (filterType !== "all" && b.type !== filterType) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                b.filename.toLowerCase().includes(q) ||
                b.createdAt.toLowerCase().includes(q) ||
                (b.type === "auto" ? "tự động" : "thủ công").includes(q)
            );
        });
    }, [backups, filterType, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-primary/60">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Quản Lý Sao Lưu & Phục Hồi
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                        Tự động sao lưu định kỳ 1 giờ, lưu trữ tối đa 50 bản snapshot database và tệp tin tải lên.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadBackups}
                        disabled={loading}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Làm mới danh sách"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Tải lên (.zip)</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCreateManual}
                        disabled={creatingBackup}
                        className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        {creatingBackup ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang tạo sao lưu...</span>
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

            {/* Notification alert banner */}
            {statusMessage && (
                <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between transition-all ${
                        statusMessage.type === "success"
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                            : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {statusMessage.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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

            {/* Filter Bar & Quick Stats */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search & Status Badges */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm file hoặc ngày..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200"
                        />
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap bg-brand-50/80 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/40 rounded-lg px-2.5 py-1">
                            <Database className="w-3 h-3 text-brand-500" />
                            Bản lưu: {meta?.totalCount ?? backups.length}/{meta?.maxLimit ?? 50}
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-lg px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Tự động: 1h/lần
                        </span>

                        {meta?.totalSizeFormatted && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1">
                                Dung lượng: {meta.totalSizeFormatted}
                            </span>
                        )}
                    </div>
                </div>

                {/* Type Filter dropdown */}
                <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <option value="all">Tất cả loại sao lưu</option>
                        <option value="auto">Tự động (Auto)</option>
                        <option value="manual">Thủ công (Manual)</option>
                    </select>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-bg-card overflow-hidden shadow-2xs">
                <table className="w-full text-left border-1 border-slate-100">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30 dark:bg-slate-800/20">
                            <th className="py-2.5 px-4 text-center w-12">STT</th>
                            <th className="py-2.5 px-4">Tên bản sao lưu</th>
                            <th className="py-2.5 px-4 w-44">Thời gian tạo</th>
                            <th className="py-2.5 px-4 w-28">Dung lượng</th>
                            <th className="py-2.5 px-4">Dữ liệu chứa</th>
                            <th className="py-2.5 px-4 text-right w-44">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40 text-xs text-slate-650">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-slate-400">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-2" />
                                    <span className="text-xs font-semibold">Đang tải danh sách bản sao lưu...</span>
                                </td>
                            </tr>
                        ) : filteredBackups.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                    <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                                    <span>Không tìm thấy bản sao lưu nào.</span>
                                </td>
                            </tr>
                        ) : (
                            filteredBackups.map((snapshot, index) => (
                                <tr
                                    key={snapshot.filename}
                                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                                >
                                    {/* STT */}
                                    <td className="py-3 px-4 text-center text-slate-400 font-bold">
                                        {index + 1}
                                    </td>

                                    {/* Filename & Badges */}
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <FileArchive className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                {snapshot.filename}
                                            </span>
                                            <span
                                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                                    snapshot.type === "auto"
                                                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40"
                                                        : "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40"
                                                }`}
                                            >
                                                {snapshot.type === "auto" ? "Tự động" : "Thủ công"}
                                            </span>
                                            {snapshot.isValid ? (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                    <Check className="w-3 h-3" />
                                                    Nguyên vẹn
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Lỗi
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Created Time */}
                                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>{formatDate(snapshot.createdAt)}</span>
                                        </div>
                                    </td>

                                    {/* Size */}
                                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {snapshot.sizeFormatted}
                                    </td>

                                    {/* Counts summary */}
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
                                                <Users className="w-3 h-3 text-slate-400" />
                                                {snapshot.totalUsers} người dùng
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
                                                <FileText className="w-3 h-3 text-slate-400" />
                                                {snapshot.totalQuizzes} đề
                                            </span>
                                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
                                                <Award className="w-3 h-3 text-slate-400" />
                                                {snapshot.totalSubmissions} bài nộp
                                            </span>
                                            {snapshot.totalBugReports > 0 && (
                                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
                                                    <Bug className="w-3 h-3 text-slate-400" />
                                                    {snapshot.totalBugReports} lỗi
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 text-right">
                                        <div className="inline-flex items-center justify-end gap-1">
                                            {/* Download */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPasskeyModal({
                                                        isOpen: true,
                                                        action: "download",
                                                        snapshot,
                                                    });
                                                    setPasskeyInput("");
                                                    setPasskeyError(null);
                                                    setShowPasskey(false);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                                title="Tải về file snapshot (Mật khẩu cấp 2)"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Restore */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRestoreModal({ isOpen: true, snapshot });
                                                    setRestorePasskey("");
                                                    setRestoreError(null);
                                                    setRestoreSuccess(null);
                                                    setShowRestorePasskey(false);
                                                }}
                                                className="p-1.5 text-amber-600 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                                                title="Khôi phục toàn bộ hệ thống từ bản này"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPasskeyModal({
                                                        isOpen: true,
                                                        action: "delete",
                                                        snapshot,
                                                    });
                                                    setPasskeyInput("");
                                                    setPasskeyError(null);
                                                    setShowPasskey(false);
                                                }}
                                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                                title="Xóa bản sao lưu này"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ================= MODAL 1: PASSKEY (Download / Delete) ================= */}
            {passkeyModal.isOpen && passkeyModal.snapshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-bg-card rounded-2xl border border-border-primary shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
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
                                ? "Vui lòng nhập mật khẩu cấp 2 để tải file dữ liệu về máy:"
                                : "Hành động này sẽ xóa vĩnh viễn file sao lưu khỏi server. Nhập mật khẩu cấp 2 để tiếp tục:"}
                        </p>

                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                            {passkeyModal.snapshot.filename} ({passkeyModal.snapshot.sizeFormatted})
                        </div>

                        <form onSubmit={handlePasskeySubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Mật khẩu cấp 2:
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasskey ? "text" : "password"}
                                        value={passkeyInput}
                                        onChange={(e) => setPasskeyInput(e.target.value)}
                                        placeholder="Nhập mật khẩu cấp 2..."
                                        autoFocus
                                        className="w-full px-3 py-2 pr-10 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasskey(!showPasskey)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {passkeyError && (
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>{passkeyError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPasskeyModal({
                                            isOpen: false,
                                            action: "download",
                                            snapshot: null,
                                        })
                                    }
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={passkeyLoading || !passkeyInput}
                                    className={`px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                                        passkeyModal.action === "delete"
                                            ? "bg-rose-600 hover:bg-rose-700"
                                            : "bg-brand-600 hover:bg-brand-700"
                                    }`}
                                >
                                    {passkeyLoading
                                        ? "Đang xử lý..."
                                        : passkeyModal.action === "download"
                                          ? "Tải Xuống"
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
                    <div className="bg-bg-card rounded-2xl border border-border-primary shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Khôi Phục Dữ Liệu Hệ Thống
                                </h3>
                            </div>
                            {!restoreLoading && (
                                <button
                                    type="button"
                                    onClick={() => setRestoreModal({ isOpen: false, snapshot: null })}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                            <span className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                Cảnh báo: Ghi đè toàn bộ dữ liệu
                            </span>
                            <p className="text-[11px] leading-relaxed opacity-90">
                                Toàn bộ dữ liệu hiện tại trên database sẽ được thay thế bằng dữ liệu tại thời điểm của bản sao lưu này.
                            </p>
                        </div>

                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-400">File:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {restoreModal.snapshot.filename}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Dữ liệu:</span>
                                <span className="font-semibold text-brand-600 dark:text-brand-400">
                                    {restoreModal.snapshot.totalUsers} người dùng • {restoreModal.snapshot.totalQuizzes} đề • {restoreModal.snapshot.totalSubmissions} bài làm
                                </span>
                            </div>
                        </div>

                        {restoreSuccess ? (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center space-y-1">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                    {restoreSuccess}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleRestoreSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Mật khẩu cấp 2:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showRestorePasskey ? "text" : "password"}
                                            value={restorePasskey}
                                            onChange={(e) => setRestorePasskey(e.target.value)}
                                            placeholder="Nhập mật khẩu cấp 2..."
                                            autoFocus
                                            disabled={restoreLoading}
                                            className="w-full px-3 py-2 pr-10 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRestorePasskey(!showRestorePasskey)}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                        >
                                            {showRestorePasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {restoreError && (
                                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                        <span>{restoreError}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        disabled={restoreLoading}
                                        onClick={() => setRestoreModal({ isOpen: false, snapshot: null })}
                                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={restoreLoading || !restorePasskey.trim()}
                                        className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        {restoreLoading ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                <span>Đang khôi phục...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                <span>Khôi phục ngay</span>
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
                    <div className="bg-bg-card rounded-2xl border border-border-primary shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Tải Lên File & Phục Hồi
                                </h3>
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
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Chọn file sao lưu (.zip):
                            </label>
                            <label
                                htmlFor={fileUploadId}
                                className="border border-dashed border-border-primary hover:border-brand-500 rounded-xl p-4 text-center block cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30"
                            >
                                <input
                                    id={fileUploadId}
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
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
                                            ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Chọn tệp .zip từ máy tính
                                        </p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <form onSubmit={handleUploadRestoreSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Mật khẩu cấp 2:
                                </label>
                                <div className="relative">
                                    <input
                                        type={showUploadPasskey ? "text" : "password"}
                                        value={uploadPasskey}
                                        onChange={(e) => setUploadPasskey(e.target.value)}
                                        placeholder="Nhập mật khẩu cấp 2..."
                                        disabled={uploadLoading}
                                        className="w-full px-3 py-2 pr-10 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-200 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadPasskey(!showUploadPasskey)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        {showUploadPasskey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={uploadLoading}
                                    onClick={() => setUploadModalOpen(false)}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadLoading || !uploadFile || !uploadPasskey.trim()}
                                    className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                                >
                                    {uploadLoading ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Đang tải lên & Phục hồi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Khôi phục</span>
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

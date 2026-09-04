import React, { useState, useEffect, useCallback } from "react";
import {
    HardDrive,
    Cpu,
    Activity,
    Server,
    Wifi,
    Database,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Terminal,
    Copy,
    Check,
    AlertCircle,
    Zap,
    ShieldCheck,
    Layers,
} from "lucide-react";
import {
    getSystemMetrics,
    SystemMetricsResponse,
    SystemMaintenanceTip,
} from "../lib/supabaseService";

export default function AdminSystemTab() {
    const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // seconds (0 = off)
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchMetrics = useCallback(async (isManual = false) => {
        if (isManual) {
            setRefreshing(true);
        }
        try {
            const data = await getSystemMetrics();
            setMetrics(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err: any) {
            console.error("Lỗi khi tải thông số máy chủ EC2:", err);
            setError(
                err.message || "Không thể kết nối đến API giám sát hệ thống.",
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchMetrics(false);
    }, [fetchMetrics]);

    // Auto-refresh interval
    useEffect(() => {
        if (autoRefreshInterval <= 0) return;
        const timer = setInterval(() => {
            fetchMetrics(false);
        }, autoRefreshInterval * 1000);
        return () => clearInterval(timer);
    }, [autoRefreshInterval, fetchMetrics]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(text);
        setTimeout(() => {
            setCopiedCmd(null);
        }, 2000);
    };

    const getStatusColorClass = (
        status: "healthy" | "warning" | "critical" | "error" | string,
    ) => {
        switch (status) {
            case "healthy":
                return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40";
            case "warning":
                return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40";
            case "critical":
            case "error":
                return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40";
            default:
                return "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
        }
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 90) return "bg-rose-500";
        if (percent >= 75) return "bg-amber-500";
        return "bg-brand-500";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-primary/60">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                Hạ Tầng Máy Chủ & Hệ Thống
                                {metrics && (
                                    <span
                                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColorClass(
                                            metrics.overallHealth,
                                        )}`}
                                    >
                                        {metrics.overallHealth === "healthy"
                                            ? "Hoạt động tốt"
                                            : metrics.overallHealth ===
                                                "warning"
                                              ? "Cảnh báo"
                                              : "Cần chú ý"}
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                Giám sát trực tiếp dung lượng ổ đĩa, RAM, CPU,
                                mạng I/O, MySQL và tình trạng container trên máy
                                chủ.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions & Auto-refresh */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 text-xs">
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 px-2 font-medium">
                            Tự động cập nhật:
                        </span>
                        <select
                            value={autoRefreshInterval}
                            onChange={(e) =>
                                setAutoRefreshInterval(Number(e.target.value))
                            }
                            aria-label="Tần suất tự động cập nhật"
                            className="bg-transparent text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                        >
                            <option value={0}>Tắt</option>
                            <option value={5}>5 giây</option>
                            <option value={10}>10 giây</option>
                            <option value={30}>30 giây</option>
                            <option value={60}>1 phút</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => fetchMetrics(true)}
                        disabled={refreshing}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Làm mới thông số ngay"
                    >
                        <RefreshCw
                            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                        />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-bold">
                            Không thể tải thông số hệ thống
                        </div>
                        <div className="mt-0.5 text-rose-600 dark:text-rose-400">
                            {error}
                        </div>
                    </div>
                </div>
            )}

            {/* System Alerts Banner (if any) */}
            {metrics && metrics.alerts && metrics.alerts.length > 0 && (
                <div className="space-y-2">
                    {metrics.alerts.map((alert, idx) => (
                        <div
                            key={idx}
                            className="p-3.5 rounded-xl text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5"
                        >
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 font-medium">{alert}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Overview Quick Metric Cards */}
            {metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Ổ đĩa (Disk) */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <HardDrive className="w-4 h-4 text-brand-500" />
                                Ổ đĩa máy chủ
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColorClass(
                                    metrics.disk.status,
                                )}`}
                            >
                                {metrics.disk.usedPercent}% ĐÃ DÙNG
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                {metrics.disk.usedFormatted}
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">
                                    / {metrics.disk.totalFormatted}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                        metrics.disk.usedPercent,
                                    )}`}
                                    style={{
                                        width: `${Math.min(metrics.disk.usedPercent, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                                <span>Trống: {metrics.disk.freeFormatted}</span>
                                <span>Gắn tại: {metrics.disk.mountPoint}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Bộ nhớ RAM */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                Bộ nhớ RAM
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColorClass(
                                    metrics.memory.status,
                                )}`}
                            >
                                {metrics.memory.usedPercent}% ĐÃ DÙNG
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                {metrics.memory.usedFormatted}
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">
                                    / {metrics.memory.totalFormatted}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                        metrics.memory.usedPercent,
                                    )}`}
                                    style={{
                                        width: `${Math.min(metrics.memory.usedPercent, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                                <span>
                                    Khả dụng: {metrics.memory.freeFormatted}
                                </span>
                                <span>
                                    Go Heap: {metrics.memory.heapAllocFormatted}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: CPU & Tải xử lý */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Cpu className="w-4 h-4 text-indigo-500" />
                                Tải CPU ({metrics.cpu.cores} Cores)
                            </span>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColorClass(
                                    metrics.cpu.status,
                                )}`}
                            >
                                {metrics.cpu.usagePercent}%
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                {metrics.cpu.load1.toFixed(2)}
                                <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1.5">
                                    (Load 1m)
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                                        metrics.cpu.usagePercent,
                                    )}`}
                                    style={{
                                        width: `${Math.min(metrics.cpu.usagePercent, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                                <span>5m: {metrics.cpu.load5.toFixed(2)}</span>
                                <span>
                                    15m: {metrics.cpu.load15.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Uptime & Hoạt động */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-teal-500" />
                                Thời gian máy chủ chạy
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40">
                                99.99% ONLINE
                            </span>
                        </div>
                        <div className="mt-3">
                            <div className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                                {metrics.uptime.systemUptimeFormatted}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                                Backend: {metrics.uptime.processUptimeFormatted}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                Khởi động: {metrics.uptime.bootTimeFormatted}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Panels Grid */}
            {metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Panel 1: Chi tiết Ổ đĩa & Inodes */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-brand-500" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Chi Tiết Dung Lượng Ổ Cứng (Disk Storage)
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                Mount: {metrics.disk.mountPoint}
                            </span>
                        </div>

                        {/* Storage breakdown table */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Tổng Dung Lượng
                                </div>
                                <div className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">
                                    {metrics.disk.totalFormatted}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Đã Sử Dụng
                                </div>
                                <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1">
                                    {metrics.disk.usedFormatted} (
                                    {metrics.disk.usedPercent}%)
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Còn Trống
                                </div>
                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    {metrics.disk.freeFormatted}
                                </div>
                            </div>
                        </div>

                        {/* Inode stats */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                            <div className="flex items-center justify-between font-medium">
                                <span className="text-slate-600 dark:text-slate-300">
                                    Số lượng tệp tin (Inodes) đã dùng:
                                </span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {metrics.disk.inodesUsed.toLocaleString()} /{" "}
                                    {metrics.disk.inodesTotal.toLocaleString()}{" "}
                                    ({metrics.disk.inodesUsedPercent}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${getProgressColor(metrics.disk.inodesUsedPercent)}`}
                                    style={{
                                        width: `${Math.min(metrics.disk.inodesUsedPercent, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                * Lưu ý: Khi Inodes hoặc Dung lượng đạt 100%,
                                Docker build sẽ gặp lỗi{" "}
                                <code>no space left on device</code>.
                            </div>
                        </div>
                    </div>

                    {/* Panel 2: Chi tiết Bộ nhớ RAM & Go Runtime */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Bộ Nhớ RAM & Go Runtime Engine
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                                {metrics.goVersion}
                            </span>
                        </div>

                        {/* RAM metrics breakdown */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Tổng RAM
                                </div>
                                <div className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">
                                    {metrics.memory.totalFormatted}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Đang Dùng
                                </div>
                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    {metrics.memory.usedFormatted} (
                                    {metrics.memory.usedPercent}%)
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Khả Dụng
                                </div>
                                <div className="text-sm font-black text-slate-700 dark:text-slate-200 mt-1">
                                    {metrics.memory.freeFormatted}
                                </div>
                            </div>
                        </div>

                        {/* Go Runtime memory specifics */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                    Bộ nhớ Heap Backend cấp phát:
                                </span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {metrics.memory.heapAllocFormatted}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                    Bộ nhớ Sys yêu cầu từ OS:
                                </span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {metrics.memory.sysFormatted}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                    Goroutines đang hoạt động:
                                </span>
                                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                                    {metrics.memory.goroutinesCount} threads
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 dark:text-slate-400">
                                    Số lần thu dọn rác (GC Count):
                                </span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                    {metrics.memory.numGc.toLocaleString()} lần
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Panel 3: Cơ sở dữ liệu MySQL & Mạng */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                                <Database className="w-4 h-4 text-sky-500" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Cơ Sở Dữ Liệu MySQL & Mạng I/O
                                </h3>
                            </div>
                            <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColorClass(
                                    metrics.database.status,
                                )}`}
                            >
                                {metrics.database.status === "healthy"
                                    ? "ĐÃ KẾT NỐI"
                                    : "LỖI KẾT NỐI"}
                            </span>
                        </div>

                        {/* Database metrics */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                        Độ trễ Ping DB
                                    </div>
                                    <div className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {metrics.database.pingLatencyMs} ms
                                    </div>
                                </div>
                                <Zap className="w-5 h-5 text-amber-500/80" />
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                        Connection Pool
                                    </div>
                                    <div className="text-base font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {metrics.database.inUseConnections}{" "}
                                        in-use /{" "}
                                        {metrics.database.openConnections} open
                                    </div>
                                </div>
                                <Database className="w-5 h-5 text-sky-500/80" />
                            </div>
                        </div>

                        {/* Network Stats */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                            <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-200">
                                <span className="flex items-center gap-1.5">
                                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                                    Lưu lượng truyền tải qua mạng (Network
                                    Traffic):
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                    <div className="text-slate-400 text-[10px]">
                                        Tải xuống (RX Received)
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-100 font-bold mt-0.5">
                                        {metrics.network.totalRxFormatted}
                                    </div>
                                </div>
                                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                                    <div className="text-slate-400 text-[10px]">
                                        Tải lên (TX Sent)
                                    </div>
                                    <div className="text-slate-800 dark:text-slate-100 font-bold mt-0.5">
                                        {metrics.network.totalTxFormatted}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel 4: Thông tin Node EC2 & Hệ thống */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-primary/40 dark:border-slate-800/60">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-teal-500" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Thông Tin Máy Chủ EC2 & Môi Trường
                                </h3>
                            </div>
                            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {metrics.uptime.availabilityStatus}
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">
                                    Tên Máy Chủ (Hostname):
                                </span>
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                                    {metrics.hostname}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">
                                    Kiến trúc & Hệ điều hành:
                                </span>
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 uppercase">
                                    {metrics.cpu.os} / {metrics.cpu.arch}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">
                                    Phiên bản Core Backend:
                                </span>
                                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                                    v{metrics.appVersion}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">
                                    Thời gian bắt đầu Backend:
                                </span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                    {metrics.uptime.processStartTime}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-slate-400">
                                    Cập nhật lần cuối lúc:
                                </span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                    {lastUpdated.toLocaleTimeString("vi-VN")}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance & Docker Cleanup Commands */}
            {metrics &&
                metrics.maintenanceTips &&
                metrics.maintenanceTips.length > 0 && (
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-border-primary/60 dark:border-slate-800/80 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-border-primary/40 dark:border-slate-800/60">
                            <Terminal className="w-4 h-4 text-brand-500" />
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Lệnh Dọn Dẹp & Tối Ưu Hóa Ổ Đĩa Docker Trên
                                    EC2
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    Sao chép và chạy các lệnh này qua SSH vào
                                    máy chủ EC2 khi ổ đĩa báo đầy hoặc Docker
                                    build lỗi.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {metrics.maintenanceTips.map(
                                (tip: SystemMaintenanceTip, index: number) => (
                                    <div
                                        key={index}
                                        className={`p-3.5 rounded-xl border transition-all ${
                                            tip.severity === "urgent"
                                                ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
                                                : tip.severity === "warning"
                                                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50"
                                                  : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                {tip.title}
                                            </span>
                                            {tip.severity === "urgent" && (
                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded">
                                                    Cấp bách
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                                            {tip.description}
                                        </p>
                                        <div className="flex items-center justify-between bg-slate-900 dark:bg-black/80 rounded-lg p-2 font-mono text-[11px] text-emerald-400">
                                            <span className="truncate mr-2">
                                                $ {tip.command}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleCopy(tip.command)
                                                }
                                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                                title="Sao chép lệnh"
                                            >
                                                {copiedCmd === tip.command ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
}

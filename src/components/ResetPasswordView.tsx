import React, { useState, useEffect } from "react";
import {
    verifyPasswordResetToken,
    resetPasswordWithToken,
} from "../lib/supabaseService";
import {
    KeyRound,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

interface ResetPasswordViewProps {
    onNavigate: (path: string) => void;
    onOpenAuth?: (mode: "login" | "register", prefillUsername?: string) => void;
}

export default function ResetPasswordView({
    onNavigate,
    onOpenAuth,
}: ResetPasswordViewProps) {
    const [token, setToken] = useState<string>("");
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [userInfo, setUserInfo] = useState<{
        name?: string;
        username?: string;
    } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form states
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Extract token on mount & verify
    useEffect(() => {
        // Prevent Referer leakage
        const existingMeta = document.querySelector('meta[name="referrer"]');
        if (!existingMeta) {
            const meta = document.createElement("meta");
            meta.name = "referrer";
            meta.content = "no-referrer";
            document.head.appendChild(meta);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("token") || "";

        if (!urlToken.trim()) {
            setVerifying(false);
            setTokenValid(false);
            setErrorMessage(
                "Không tìm thấy mã xác nhận đặt lại mật khẩu. Vui lòng kiểm tra lại liên kết hoặc nhắn giáo viên cấp lại."
            );
            return;
        }

        setToken(urlToken.trim());

        const checkToken = async () => {
            try {
                const res = await verifyPasswordResetToken(urlToken.trim());
                if (res.valid) {
                    setTokenValid(true);
                    setUserInfo({
                        name: res.name,
                        username: res.username,
                    });
                } else {
                    setTokenValid(false);
                    setErrorMessage(
                        res.error ||
                            "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ giáo viên để nhận liên kết mới."
                    );
                }
            } catch (err: any) {
                setTokenValid(false);
                setErrorMessage(
                    err.message ||
                        "Không thể xác thực liên kết. Vui lòng thử lại sau hoặc liên hệ giáo viên."
                );
            } finally {
                setVerifying(false);
            }
        };

        checkToken();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (password.length < 6) {
            setFormError("Mật khẩu mới phải có ít nhất 6 ký tự");
            return;
        }

        if (password !== confirmPassword) {
            setFormError("Mật khẩu xác nhận không khớp");
            return;
        }

        setSubmitting(true);
        try {
            await resetPasswordWithToken(token, password);
            setSubmitSuccess(true);
        } catch (err: any) {
            setFormError(err.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 bg-bg-base font-sans">
            <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm transition-all animate-in fade-in duration-300">
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Đặt Lại Mật Khẩu
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Hệ thống luyện thi & học tập trực tuyến
                    </p>
                </div>

                {/* State 1: Verifying */}
                {verifying && (
                    <div className="py-12 text-center space-y-3">
                        <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">
                            Đang xác thực liên kết bảo mật...
                        </p>
                    </div>
                )}

                {/* State 2: Invalid or Expired Token */}
                {!verifying && !tokenValid && (
                    <div className="space-y-5">
                        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
                                {errorMessage}
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-[11px] text-slate-400">
                                Link đặt lại mật khẩu chỉ có hiệu lực trong 30 phút và chỉ sử dụng được một lần duy nhất vì lý do an toàn.
                            </p>
                            <button
                                onClick={() => onNavigate("/")}
                                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Về Trang chủ
                            </button>
                        </div>
                    </div>
                )}

                {/* State 3: Success State */}
                {!verifying && tokenValid && submitSuccess && (
                    <div className="space-y-6 text-center py-4">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto animate-in zoom-in-90 duration-300">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Đổi mật khẩu thành công!
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                Mật khẩu mới cho tài khoản{" "}
                                <span className="font-bold text-slate-800">
                                    @{userInfo?.username}
                                </span>{" "}
                                đã được cập nhật thành công.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                if (onOpenAuth) {
                                    onOpenAuth("login", userInfo?.username);
                                } else {
                                    onNavigate("/");
                                }
                            }}
                            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <Lock className="w-4 h-4" />
                            Đăng nhập ngay
                        </button>
                    </div>
                )}

                {/* State 4: Reset Password Form */}
                {!verifying && tokenValid && !submitSuccess && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Student Greeting */}
                        <div className="p-3 bg-brand-50/60 border border-brand-100/80 rounded-2xl flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {(userInfo?.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                    {userInfo?.name || "Học sinh"}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">
                                    @{userInfo?.username}
                                </p>
                            </div>
                            <div className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <ShieldCheck className="w-3 h-3" />
                                Xác thực
                            </div>
                        </div>

                        {formError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        {/* Password input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Mật khẩu mới
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Nhập ít nhất 6 ký tự..."
                                    required
                                    minLength={6}
                                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Xác nhận mật khẩu mới
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="Nhập lại mật khẩu mới..."
                                    required
                                    minLength={6}
                                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                    }
                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium">
                            * Lưu ý: Mật khẩu nên kết hợp chữ cái và số để đảm bảo an toàn.
                        </p>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 mt-2"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Đang lưu mật khẩu...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-3.5 h-3.5" />
                                    Cập nhật mật khẩu mới
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

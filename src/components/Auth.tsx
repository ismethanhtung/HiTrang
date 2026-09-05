import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    Lock,
    User,
    UserCheck,
    Flower,
    Eye,
    EyeOff,
    GraduationCap,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Shield,
    ShieldCheck,
    ShieldAlert,
    KeyRound,
    CheckCircle2,
    HelpCircle,
    MessageCircle,
    X,
    Mail,
    Smartphone,
    RefreshCw,
} from "lucide-react";
import { User as UserType } from "../types";
import {
    signUpUser,
    signInUser,
    signInWithGoogle,
    checkForgotPassword,
    sendForgotPasswordEmailOTP,
    resetPasswordWithEmailOTP,
    resetPasswordWithTOTP,
} from "../lib/supabaseService";

interface AuthProps {
    onLogin: (user: UserType) => void;
    initialRole?: "admin" | "student";
    initialUsername?: string;
    onOpenContactModal?: () => void;
}

export default function Auth({
    onLogin,
    initialRole = "student",
    initialUsername = "",
    onOpenContactModal,
}: AuthProps) {
    const [authMode, setAuthMode] = useState<
        "login" | "register" | "forgot" | "2fa_login"
    >("login");
    const [role, setRole] = useState<"admin" | "student">("student");

    // Fields
    const [name, setName] = useState("");
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [grade, setGrade] = useState("10");
    const [showPassword, setShowPassword] = useState(false);

    // 2FA login state
    const [loginTOTPCode, setLoginTOTPCode] = useState("");

    // Forgot Password states
    const [forgotStep, setForgotStep] = useState<
        | "enter_user"
        | "choose_method"
        | "email_otp"
        | "has_2fa"
        | "no_method"
        | "success"
    >("enter_user");
    const [forgotUserData, setForgotUserData] = useState<{
        name?: string;
        username?: string;
        has2FA?: boolean;
        hasEmail?: boolean;
        maskedEmail?: string;
    } | null>(null);
    const [forgotTOTPCode, setForgotTOTPCode] = useState("");
    const [forgotEmailOTP, setForgotEmailOTP] = useState("");
    const [forgotResendTimer, setForgotResendTimer] = useState(0);
    const [forgotNewPassword, setForgotNewPassword] = useState("");
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);

    const handleOpenContact = () => {
        if (onOpenContactModal) {
            onOpenContactModal();
        } else {
            setShowContactModal(true);
        }
    };

    // Feedback states
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (initialUsername) {
            setUsername(initialUsername);
            setAuthMode("login");
        }
    }, [initialUsername]);

    const handleGoogleSignIn = async () => {
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            setError(err.message || "Không thể đăng nhập bằng Google.");
            setLoading(false);
        }
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!username.trim() || !password.trim()) {
            setError("Vui lòng điền đầy đủ thông tin đăng nhập.");
            return;
        }

        setLoading(true);
        try {
            const res = await signInUser(
                username.trim(),
                password,
                loginTOTPCode.trim(),
            );
            if (res.require2FA) {
                setAuthMode("2fa_login");
                setLoading(false);
                return;
            }

            if (res.user) {
                setSuccess("Đăng nhập thành công!");
                setTimeout(() => {
                    onLogin(res.user!);
                }, 800);
            }
        } catch (err: any) {
            setError(err.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!name.trim()) {
            setError("Vui lòng nhập họ và tên.");
            return;
        }
        const cleanUser = username.trim().toLowerCase();
        if (cleanUser.length < 4 || cleanUser.length > 30) {
            setError("Tên đăng nhập phải từ 4 đến 30 ký tự.");
            return;
        }
        if (/\s/.test(cleanUser)) {
            setError("Tên đăng nhập không được chứa khoảng trắng.");
            return;
        }
        if (cleanUser.includes("@")) {
            setError(
                "Tên đăng nhập không được chứa ký tự '@' (vui lòng không nhập địa chỉ email).",
            );
            return;
        }
        if (!/^[a-z0-9_.]+$/.test(cleanUser)) {
            setError(
                "Tên đăng nhập chỉ gồm chữ cái không dấu (a-z), số (0-9), dấu gạch dưới (_) hoặc dấu chấm (.).",
            );
            return;
        }
        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không trùng khớp.");
            return;
        }
        if (password.length < 6) {
            setError("Mật khẩu phải chứa ít nhất 6 ký tự.");
            return;
        }

        setLoading(true);
        try {
            const newUser = await signUpUser(
                name.trim(),
                cleanUser,
                password,
                role,
                grade,
            );
            setSuccess(
                "Đăng ký tài khoản thành công! Đang tự động đăng nhập...",
            );
            setTimeout(() => {
                onLogin(newUser);
            }, 1200);
        } catch (err: any) {
            setError(
                err.message || "Đã có lỗi xảy ra trong quá trình đăng ký.",
            );
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        let timer: any;
        if (forgotResendTimer > 0) {
            timer = setInterval(() => {
                setForgotResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [forgotResendTimer]);

    const handleForgotCheckSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!username.trim()) {
            setError("Vui lòng nhập tên đăng nhập.");
            return;
        }

        setLoading(true);
        try {
            const res = await checkForgotPassword(username.trim());
            if (!res.exists) {
                setError(
                    res.message ||
                        "Không tìm thấy tài khoản với tên đăng nhập này.",
                );
                return;
            }

            const userData = {
                name: res.name,
                username: res.username || username.trim(),
                has2FA: res.has2FA,
                hasEmail: res.hasEmail,
                maskedEmail: res.maskedEmail,
            };
            setForgotUserData(userData);
            setForgotTOTPCode("");
            setForgotEmailOTP("");
            setForgotNewPassword("");
            setForgotConfirmPassword("");

            if (res.has2FA && res.hasEmail) {
                setForgotStep("choose_method");
            } else if (res.hasEmail) {
                // Auto send email OTP
                await sendForgotPasswordEmailOTP(userData.username);
                setForgotResendTimer(60);
                setForgotStep("email_otp");
                setSuccess(
                    `Mã xác thực đã được gửi tới ${res.maskedEmail || "email của bạn"}.`,
                );
            } else if (res.has2FA) {
                setForgotStep("has_2fa");
            } else {
                setForgotStep("no_method");
            }
        } catch (err: any) {
            setError(
                err.message ||
                    "Không thể kiểm tra tài khoản. Vui lòng thử lại.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEmailMethod = async () => {
        if (!forgotUserData?.username) return;
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            await sendForgotPasswordEmailOTP(forgotUserData.username);
            setForgotResendTimer(60);
            setForgotStep("email_otp");
            setSuccess(
                `Mã xác thực đã được gửi tới ${forgotUserData.maskedEmail || "email của bạn"}.`,
            );
        } catch (err: any) {
            setError(
                err.message ||
                    "Không thể gửi mã xác thực qua email. Vui lòng thử lại.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResendForgotEmailOTP = async () => {
        if (forgotResendTimer > 0 || !forgotUserData?.username || loading)
            return;
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            await sendForgotPasswordEmailOTP(forgotUserData.username);
            setForgotResendTimer(60);
            setSuccess(
                `Đã gửi lại mã xác thực tới ${forgotUserData.maskedEmail || "email của bạn"}!`,
            );
        } catch (err: any) {
            setError(err.message || "Không thể gửi lại mã xác thực.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResetWithEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (forgotEmailOTP.trim().length !== 6) {
            setError("Mã xác thực Email phải có đúng 6 chữ số.");
            return;
        }

        if (forgotNewPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (forgotNewPassword !== forgotConfirmPassword) {
            setError("Mật khẩu xác nhận không trùng khớp.");
            return;
        }

        setLoading(true);
        try {
            await resetPasswordWithEmailOTP(
                forgotUserData?.username || username.trim(),
                forgotEmailOTP.trim(),
                forgotNewPassword,
            );
            setForgotStep("success");
            setSuccess("Đổi mật khẩu thành công!");
        } catch (err: any) {
            setError(
                err.message ||
                    "Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã OTP.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotResetWithTOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (forgotTOTPCode.trim().length !== 6) {
            setError("Mã xác thực Google Authenticator phải có đúng 6 chữ số.");
            return;
        }

        if (forgotNewPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (forgotNewPassword !== forgotConfirmPassword) {
            setError("Mật khẩu xác nhận không trùng khớp.");
            return;
        }

        setLoading(true);
        try {
            await resetPasswordWithTOTP(
                forgotUserData?.username || username.trim(),
                forgotTOTPCode.trim(),
                forgotNewPassword,
            );
            setForgotStep("success");
            setSuccess("Đổi mật khẩu thành công!");
        } catch (err: any) {
            setError(
                err.message ||
                    "Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại mã OTP.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            id="auth-container"
            className="w-full bg-white p-6 sm:p-8 font-sans"
        >
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full"
            >
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <h1 className="font-calligraphy text-4xl text-brand-500 select-none tracking-wide drop-shadow-xs">
                        HiTrang
                    </h1>
                    <p className="text-xs text-slate-400 mt-2 italic font-medium flex items-center justify-center gap-1.5">
                        <img
                            src="/icons/sakura.png"
                            alt=""
                            className="w-3.5 h-3.5 object-contain inline-block"
                        />
                        <span>Học hành như cá kho tiêu</span>
                    </p>
                </div>

                {/* ---------------------------------------------------- */}
                {/* CASE 1: 2FA LOGIN PROMPT                            */}
                {/* ---------------------------------------------------- */}
                {authMode === "2fa_login" && (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="p-4 bg-brand-50/70 border border-brand-100 rounded-2xl text-center space-y-2">
                            <div className="w-10 h-10 text-brand-600 rounded-xl flex items-center justify-center mx-auto">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800">
                                Xác Thực 2 Bước (2FA)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Nhập mã 6 chữ số từ ứng dụng{" "}
                                <b>Google Authenticator</b> trên điện thoại của
                                bạn.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Mã xác thực 6 số
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                autoFocus
                                placeholder="000000"
                                value={loginTOTPCode}
                                onChange={(e) =>
                                    setLoginTOTPCode(
                                        e.target.value.replace(/\D/g, ""),
                                    )
                                }
                                className="w-full py-3 px-4 text-center font-mono text-xl tracking-[0.4em] font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-400 focus:bg-white transition-all text-slate-800"
                            />
                        </div>

                        {error && (
                            <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={
                                loading || loginTOTPCode.trim().length !== 6
                            }
                            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang kiểm tra...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Xác nhận & Đăng nhập</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode("login");
                                setLoginTOTPCode("");
                                setError("");
                            }}
                            className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Quay lại nhập mật khẩu</span>
                        </button>
                    </form>
                )}

                {/* ---------------------------------------------------- */}
                {/* CASE 2: FORGOT PASSWORD FLOW                         */}
                {/* ---------------------------------------------------- */}
                {authMode === "forgot" && (
                    <div className="space-y-4">
                        {/* Step 1: Enter username */}
                        {forgotStep === "enter_user" && (
                            <form
                                onSubmit={handleForgotCheckSubmit}
                                className="space-y-4"
                            >
                                <div className="text-center space-y-1 pb-1">
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Khôi Phục Mật Khẩu
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Nhập tên đăng nhập để kiểm tra phương
                                        thức khôi phục.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600">
                                        Tên đăng nhập (username)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                            <User className="w-4 h-4" />
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Nhập username của bạn"
                                            value={username}
                                            onChange={(e) =>
                                                setUsername(e.target.value)
                                            }
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !username.trim()}
                                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>
                                                Đang kiểm tra tài khoản...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Tiếp tục</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode("login");
                                        setError("");
                                    }}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Quay lại đăng nhập</span>
                                </button>
                            </form>
                        )}

                        {/* Step 1.2: Choose Method (When user has BOTH Email and Google Authenticator) */}
                        {forgotStep === "choose_method" && (
                            <div className="space-y-4">
                                <div className="text-center space-y-1 py-1">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Chọn phương thức xác thực
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Chọn cách bạn muốn nhận mã để đặt lại
                                        mật khẩu:
                                    </p>
                                </div>

                                <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                                    {/* Option 1: Email OTP */}
                                    <button
                                        type="button"
                                        onClick={handleSelectEmailMethod}
                                        disabled={loading}
                                        className="w-full py-3 px-2 hover:bg-slate-50/80 flex items-center gap-3 transition-colors text-left group cursor-pointer disabled:opacity-50"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                                                Xác thực qua Email
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                Gửi mã OTP đến{" "}
                                                {forgotUserData?.maskedEmail ||
                                                    "email đã liên kết"}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0" />
                                    </button>

                                    {/* Option 2: Google Authenticator TOTP */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setSuccess("");
                                            setForgotStep("has_2fa");
                                        }}
                                        disabled={loading}
                                        className="w-full py-3 px-2 hover:bg-slate-50/80 flex items-center gap-3 transition-colors text-left group cursor-pointer disabled:opacity-50"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                                                Google Authenticator
                                            </p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                Nhập mã 6 số từ ứng dụng xác
                                                thực
                                            </p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors shrink-0" />
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotStep("enter_user");
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Chọn tài khoản khác</span>
                                </button>
                            </div>
                        )}

                        {/* Step 2A: Email OTP -> Enter OTP & New Password */}
                        {forgotStep === "email_otp" && (
                            <form
                                onSubmit={handleForgotResetWithEmail}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700">
                                            Mã OTP (6 chữ số)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleResendForgotEmailOTP}
                                            disabled={
                                                forgotResendTimer > 0 || loading
                                            }
                                            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                                        >
                                            <RefreshCw
                                                className={`w-3 h-3 ${
                                                    loading
                                                        ? "animate-spin"
                                                        : ""
                                                }`}
                                            />
                                            {forgotResendTimer > 0
                                                ? `Gửi lại sau (${forgotResendTimer}s)`
                                                : "Gửi lại mã"}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        autoFocus
                                        placeholder="000000"
                                        value={forgotEmailOTP}
                                        onChange={(e) =>
                                            setForgotEmailOTP(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        className="w-full py-2 px-3 text-center font-mono text-lg tracking-[0.3em] font-bold bg-slate-50/70 border border-slate-200/80 focus:outline-none focus:border-brand-400 focus:bg-white text-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        Kiểm tra hộp thư đến (hoặc thư rác/Spam)
                                        của bạn để lấy mã OTP.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={
                                                showForgotNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Tối thiểu 6 ký tự"
                                            value={forgotNewPassword}
                                            onChange={(e) =>
                                                setForgotNewPassword(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowForgotNewPassword(
                                                    !showForgotNewPassword,
                                                )
                                            }
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showForgotNewPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <input
                                        type={
                                            showForgotNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={forgotConfirmPassword}
                                        onChange={(e) =>
                                            setForgotConfirmPassword(
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white"
                                    />
                                </div>

                                {error && (
                                    <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="p-2 text-xs text-emerald-600  font-medium">
                                        {success}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        forgotEmailOTP.trim().length !== 6
                                    }
                                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>
                                                Đang đặt lại mật khẩu...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Đặt lại mật khẩu</span>
                                        </>
                                    )}
                                </button>

                                {forgotUserData?.has2FA && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setSuccess("");
                                            setForgotStep("has_2fa");
                                        }}
                                        className="w-full py-1 text-xs text-brand-600 hover:underline font-medium text-center cursor-pointer"
                                    >
                                        Dùng mã Google Authenticator thay thế
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotStep(
                                            forgotUserData?.has2FA
                                                ? "choose_method"
                                                : "enter_user",
                                        );
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Quay lại</span>
                                </button>
                            </form>
                        )}

                        {/* Step 2B: Account has 2FA -> Enter TOTP code & new password */}
                        {forgotStep === "has_2fa" && (
                            <form
                                onSubmit={handleForgotResetWithTOTP}
                                className="space-y-4"
                            >
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">
                                        Mã Google Authenticator (6 số)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        autoFocus
                                        placeholder="000000"
                                        value={forgotTOTPCode}
                                        onChange={(e) =>
                                            setForgotTOTPCode(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        className="w-full py-2 px-3 text-center font-mono text-lg tracking-[0.3em] font-bold bg-slate-50/70 border border-slate-100 focus:outline-none focus:border-brand-400 focus:bg-white text-slate-800"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        Mở app Authenticator trên điện thoại để
                                        lấy mã này.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">
                                        Mật khẩu mới
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={
                                                showForgotNewPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Tối thiểu 6 ký tự"
                                            value={forgotNewPassword}
                                            onChange={(e) =>
                                                setForgotNewPassword(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowForgotNewPassword(
                                                    !showForgotNewPassword,
                                                )
                                            }
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showForgotNewPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700">
                                        Xác nhận mật khẩu mới
                                    </label>
                                    <input
                                        type={
                                            showForgotNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        placeholder="Nhập lại mật khẩu mới"
                                        value={forgotConfirmPassword}
                                        onChange={(e) =>
                                            setForgotConfirmPassword(
                                                e.target.value,
                                            )
                                        }
                                        className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-brand-400 focus:bg-white"
                                    />
                                </div>

                                {error && (
                                    <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="p-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl font-medium">
                                        {success}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        loading ||
                                        forgotTOTPCode.trim().length !== 6
                                    }
                                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>
                                                Đang đặt lại mật khẩu...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Đặt lại mật khẩu</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotStep(
                                            forgotUserData?.hasEmail
                                                ? "choose_method"
                                                : "enter_user",
                                        );
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Quay lại</span>
                                </button>
                            </form>
                        )}

                        {/* Step 1.5: Account exists but NO Email AND NO 2FA -> Contact Teacher */}
                        {forgotStep === "no_method" && (
                            <div className="space-y-4">
                                <div className="p-4 bg-amber-50/80 border border-amber-200/60 rounded-2xl space-y-3">
                                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>
                                            Chưa thiết lập phương thức khôi phục
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        Tài khoản{" "}
                                        <b>@{forgotUserData?.username}</b> chưa
                                        liên kết Email hoặc Google Authenticator
                                        nên không thể tự đặt lại mật khẩu trực
                                        tuyến.
                                    </p>
                                    <div className="p-3 bg-white/80 rounded-xl border border-amber-200/50 text-xs text-slate-700 space-y-1.5">
                                        <p className="font-bold text-slate-800 flex items-center gap-1">
                                            <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
                                            Cách giải quyết:
                                        </p>
                                        <p className="text-slate-600 leading-relaxed">
                                            Bạn vui lòng{" "}
                                            <button
                                                type="button"
                                                onClick={handleOpenContact}
                                                className="font-bold text-brand-600 hover:text-brand-700 underline underline-offset-2 cursor-pointer transition-colors inline"
                                            >
                                                nhắn tin trực tiếp
                                            </button>{" "}
                                            cho <b>cô Trang</b> để được hỗ trợ
                                            cấp lại mật khẩu nhé!
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode("login");
                                        setForgotStep("enter_user");
                                        setError("");
                                    }}
                                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Quay lại Trang Đăng nhập</span>
                                </button>
                            </div>
                        )}

                        {/* Step 3: Success */}
                        {forgotStep === "success" && (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-12 h-12 text-emerald-600 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">
                                        Đổi Mật Khẩu Thành Công!
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Tài khoản{" "}
                                        <b>@{forgotUserData?.username}</b> đã
                                        được cập nhật mật khẩu mới.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode("login");
                                        setForgotStep("enter_user");
                                        setPassword("");
                                        setError("");
                                    }}
                                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                                >
                                    <Lock className="w-4 h-4" />
                                    <span>Đăng nhập ngay</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* CASE 3: STANDARD LOGIN & REGISTER FORMS             */}
                {/* ---------------------------------------------------- */}
                {(authMode === "login" || authMode === "register") && (
                    <>
                        <form
                            onSubmit={
                                authMode === "register"
                                    ? handleRegisterSubmit
                                    : handleLoginSubmit
                            }
                            className="space-y-4"
                        >
                            <AnimatePresence>
                                {authMode === "register" && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            height: 0,
                                            marginTop: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            height: "auto",
                                            marginTop: 6,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            height: 0,
                                            marginTop: 0,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                            ease: "easeInOut",
                                        }}
                                        className="space-y-1.5 overflow-hidden"
                                    >
                                        <label className="text-xs font-medium text-gray-600">
                                            Họ và tên
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                                <UserCheck className="w-4 h-4" />
                                            </span>
                                            <input
                                                type="text"
                                                id="reg-name-input"
                                                placeholder="Nhập họ và tên đầy đủ"
                                                value={name}
                                                onChange={(e) =>
                                                    setName(e.target.value)
                                                }
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors placeholder:text-gray-400"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">
                                    Tên đăng nhập (username)
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                        <User className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="text"
                                        id="login-username-input"
                                        placeholder={
                                            authMode === "register"
                                                ? "Nhập tên đăng nhập"
                                                : "Tên đăng nhập"
                                        }
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-600">
                                        Mật khẩu
                                    </label>
                                    {authMode === "login" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAuthMode("forgot");
                                                setForgotStep("enter_user");
                                                setError("");
                                                setSuccess("");
                                            }}
                                            className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold cursor-pointer transition-colors"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                        <Lock className="w-4 h-4" />
                                    </span>
                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        id="login-password-input"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors placeholder:text-gray-400"
                                    />
                                    <button
                                        type="button"
                                        id="btn-toggle-password"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {authMode === "register" && (
                                    <motion.div
                                        initial={{
                                            opacity: 0,
                                            height: 0,
                                            marginTop: 0,
                                        }}
                                        animate={{
                                            opacity: 1,
                                            height: "auto",
                                            marginTop: 16,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            height: 0,
                                            marginTop: 0,
                                        }}
                                        transition={{
                                            duration: 0.2,
                                            ease: "easeInOut",
                                        }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">
                                                Xác nhận mật khẩu
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                                    <Lock className="w-4 h-4" />
                                                </span>
                                                <input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    id="reg-confirm-password-input"
                                                    placeholder="Nhập lại mật khẩu"
                                                    value={confirmPassword}
                                                    onChange={(e) =>
                                                        setConfirmPassword(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors placeholder:text-gray-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-600">
                                                Khối lớp học
                                            </label>
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                                                    <GraduationCap className="w-4 h-4" />
                                                </span>
                                                <select
                                                    id="reg-grade-select"
                                                    value={grade}
                                                    onChange={(e) =>
                                                        setGrade(e.target.value)
                                                    }
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors text-gray-700 cursor-pointer"
                                                >
                                                    <option value="10">
                                                        Khối 10
                                                    </option>
                                                    <option value="11">
                                                        Khối 11
                                                    </option>
                                                    <option value="12">
                                                        Khối 12
                                                    </option>
                                                    <option value="9">
                                                        Khối 9
                                                    </option>
                                                    <option value="8">
                                                        Khối 8
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && (
                                <div className="p-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-medium">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-2 text-xs text-brand-600 bg-brand-50 border border-brand-100 rounded-xl font-medium animate-pulse">
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                id="btn-submit-auth"
                                disabled={loading}
                                className={`w-full py-3 px-4 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm mt-2 flex items-center justify-center gap-2 cursor-pointer ${
                                    loading
                                        ? "bg-brand-200 cursor-not-allowed text-slate-500"
                                        : "bg-gradient-to-r from-brand-300 to-brand-400 text-white font-medium hover:opacity-95 shadow-xs transition-all active:scale-[0.98]"
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>
                                            {authMode === "register"
                                                ? "Đăng ký tài khoản"
                                                : "Đăng nhập"}
                                        </span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider & Google OAuth */}
                        <div className="my-4 flex items-center justify-between">
                            <span className="w-1/5 border-b border-gray-100"></span>
                            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                                Hoặc tiếp tục với
                            </span>
                            <span className="w-1/5 border-b border-gray-100"></span>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.99] flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.49 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.22A12 12 0 0 0 12 24z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.45 14.33a7.22 7.22 0 0 1 0-4.66V6.45H1.31a12 12 0 0 0 0 11.1l4.14-3.22z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A12 12 0 0 0 1.31 6.45l4.14 3.22c.92-2.77 3.5-4.83 6.55-4.83z"
                                />
                            </svg>
                            <span>Đăng nhập bằng Google</span>
                        </button>

                        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-500">
                                {authMode === "register"
                                    ? "Đã có tài khoản?"
                                    : "Chưa có tài khoản?"}
                                <button
                                    type="button"
                                    id="btn-switch-auth-mode"
                                    onClick={() => {
                                        setAuthMode(
                                            authMode === "register"
                                                ? "login"
                                                : "register",
                                        );
                                        setError("");
                                        setSuccess("");
                                    }}
                                    className="ml-1.5 text-brand-600 font-medium underline focus:outline-none cursor-pointer"
                                >
                                    {authMode === "register"
                                        ? "Đăng nhập ngay"
                                        : "Đăng ký ngay"}
                                </button>
                            </p>
                        </div>
                    </>
                )}
            </motion.div>

            {/* Local Contact Modal Fallback */}
            {showContactModal && (
                <div
                    onClick={() => setShowContactModal(false)}
                    className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200 cursor-pointer"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl p-6 w-full max-w-xs border border-slate-100 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150 relative cursor-default"
                    >
                        <button
                            type="button"
                            onClick={() => setShowContactModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 hover:bg-slate-100 p-1 rounded-full transition-all cursor-pointer flex items-center justify-center"
                            title="Đóng"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mt-2">
                            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg relative z-10 bg-amber-50">
                                <img
                                    src="/images/trang.jpg"
                                    alt="Cô Trang"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Liên hệ cô Trang
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Chọn phương thức liên hệ thuận tiện nhất:
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-1 text-left">
                            <a
                                href="https://zalo.me/0914765601"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Zalo (Cô Trang)</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Mở Zalo →
                                </span>
                            </a>
                            <a
                                href="https://m.me/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Messenger</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Mở chat →
                                </span>
                            </a>
                            <a
                                href="https://www.facebook.com/nguyen.trang.724265"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Facebook Cô Trang</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Ghé thăm →
                                </span>
                            </a>
                            <a
                                href="tel:0914765601"
                                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
                            >
                                <span>Phone / SĐT</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Gọi ngay →
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { User as UserType } from "../types";

interface GoogleCallbackProps {
    onLogin: (user: UserType) => void;
    navigateTo: (path: string) => void;
}

export default function GoogleCallback({
    onLogin,
    navigateTo,
}: GoogleCallbackProps) {
    const [error, setError] = useState("");
    const [status, setStatus] = useState(
        "Đang liên kết với tài khoản Google của bạn...",
    );

    const hasStartedRef = useRef(false);
    const hasSucceededRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const exchangeCode = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            if (!code) {
                setError("Không tìm thấy mã xác thực Google.");
                return;
            }

            try {
                const apiUrl = import.meta.env.VITE_API_URL || "/api";
                const redirectUri = `${window.location.origin}/auth/google/callback`;

                setStatus("Đang xác thực thông tin tài khoản...");
                const response = await fetch(`${apiUrl}/auth/google`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ code, redirectUri }),
                });

                const data = await response.json();
                if (!response.ok) {
                    if (hasSucceededRef.current) return;
                    throw new Error(data.error || "Đăng nhập Google thất bại.");
                }

                hasSucceededRef.current = true;
                setStatus("Đăng nhập thành công! Đang chuyển hướng...");
                localStorage.setItem("hitrang_token", data.token);

                // Clean URL search query to prevent re-exchange on refresh/navigation
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(
                        {},
                        document.title,
                        window.location.pathname,
                    );
                }

                onLogin(data.user);
                navigateTo("/");
            } catch (err: any) {
                if (!hasSucceededRef.current) {
                    setError(err.message || "Lỗi kết nối đến máy chủ.");
                }
            }
        };

        exchangeCode();
    }, [onLogin, navigateTo]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base p-6 text-text-primary">
            <div className="w-full max-w-md bg-bg-card p-8 flex flex-col items-center text-center">
                {error ? (
                    <div className="space-y-4 w-full">
                        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            Thử lại đăng nhập
                        </h2>
                        <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigateTo("/")}
                            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Quay lại trang chủ</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="w-12 h-12 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                            {status}
                        </h2>
                        <p className="text-xs text-text-tertiary">
                            Vui lòng không đóng trình duyệt trong giây lát
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

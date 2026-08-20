import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { User as UserType } from "../types";

interface GoogleCallbackProps {
    onLogin: (user: UserType) => void;
    navigateTo: (path: string) => void;
}

export default function GoogleCallback({ onLogin, navigateTo }: GoogleCallbackProps) {
    const [error, setError] = useState("");
    const [status, setStatus] = useState("Đang liên kết với tài khoản Google của bạn...");

    useEffect(() => {
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
                    throw new Error(data.error || "Đăng nhập Google thất bại.");
                }

                setStatus("Đăng nhập thành công! Đang chuyển hướng...");
                localStorage.setItem("hitrang_token", data.token);
                onLogin(data.user);
                navigateTo("/");
            } catch (err: any) {
                setError(err.message || "Lỗi kết nối đến máy chủ.");
            }
        };

        exchangeCode();
    }, [onLogin, navigateTo]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base p-6 text-primary">
            <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-sm border border-border-primary/40 flex flex-col items-center text-center">
                {error ? (
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 text-2xl font-bold">
                            !
                        </div>
                        <h2 className="text-xl font-semibold">Đăng nhập thất bại</h2>
                        <p className="text-sm text-secondary leading-relaxed">{error}</p>
                        <button
                            onClick={() => navigateTo("/auth")}
                            className="w-full py-2.5 px-4 bg-base hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-border-primary rounded-xl font-medium text-sm transition-colors mt-2"
                        >
                            Quay lại trang đăng nhập
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                        <h2 className="text-lg font-medium">{status}</h2>
                        <p className="text-xs text-secondary">Vui lòng không đóng màn hình này</p>
                    </div>
                )}
            </div>
        </div>
    );
}

import React, { useState, useEffect } from "react";
import { User, Quiz, Submission, UserPlan } from "../types";
import {
    getAllProfiles,
    updateUserPlan,
    createQuiz,
    deleteQuiz,
    verifyAdminPasswordWithEdgeFunction,
} from "../lib/supabaseService";
import WordImporter from "./WordImporter";
import {
    Shield,
    Lock,
    Users,
    Crown,
    Zap,
    FileText,
    CheckCircle,
    Trash2,
    Plus,
    Sparkles,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

interface AdminPanelProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onAddQuiz: (newQuiz: Quiz) => void;
    onDeleteQuiz: (quizId: string) => void;
}

export default function AdminPanel({
    quizzes,
    submissions,
    onAddQuiz,
    onDeleteQuiz,
}: AdminPanelProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const [activeTab, setActiveTab] = useState<
        "plans" | "create-quiz" | "quizzes"
    >("plans");
    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // New Quiz Form state
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizSubject, setQuizSubject] = useState("Toán Học");
    const [quizGrade, setQuizGrade] = useState("10");
    const [quizDuration, setQuizDuration] = useState(45);
    const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
    const [showWordImporter, setShowWordImporter] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Password verification via Supabase Edge Function 'verify-admin'
    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setVerifying(true);

        try {
            const isValid =
                await verifyAdminPasswordWithEdgeFunction(passwordInput);
            if (isValid) {
                setIsAuthenticated(true);
                fetchProfiles();
            } else {
                setAuthError(
                    "Xác thực thất bại qua Supabase Edge Function 'verify-admin'. Mật khẩu không đúng.",
                );
            }
        } catch (err: any) {
            setAuthError(`Lỗi xác thực Edge Function: ${err.message}`);
        } finally {
            setVerifying(false);
        }
    };

    // Load profiles from Supabase
    const fetchProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const data = await getAllProfiles();
            setUserProfiles(data);
        } catch (err) {
            console.error("Lỗi khi tải danh sách hồ sơ:", err);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const handlePlanChange = async (userId: string, newPlan: UserPlan) => {
        setUpdatingUserId(userId);
        try {
            await updateUserPlan(userId, newPlan);
            setUserProfiles((prev) =>
                prev.map((u) =>
                    u.id === userId ? { ...u, plan: newPlan } : u,
                ),
            );
        } catch (err: any) {
            alert(`Lỗi cập nhật Plan: ${err.message}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleSaveNewQuiz = async () => {
        if (!quizTitle.trim()) {
            alert("Vui lòng nhập tên đề thi.");
            return;
        }
        if (importedQuestions.length === 0) {
            alert("Vui lòng thêm hoặc import ít nhất 1 câu hỏi.");
            return;
        }

        const newQuiz: Quiz = {
            id: `quiz_${Date.now()}`,
            title: quizTitle.trim(),
            description:
                quizDescription.trim() || "Bài kiểm tra chất lượng cao HiTrang",
            subject: quizSubject,
            grade: quizGrade,
            duration: quizDuration,
            questions: importedQuestions,
            createdAt: new Date().toISOString().split("T")[0],
        };

        try {
            await createQuiz(newQuiz);
            onAddQuiz(newQuiz);
            setSaveStatus("Lưu đề thi mới thành công!");
            setQuizTitle("");
            setQuizDescription("");
            setImportedQuestions([]);
            setShowWordImporter(false);
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err: any) {
            alert(`Lỗi khi tạo đề thi: ${err.message}`);
        }
    };

    // 1. UNAUTHENTICATED PASSWORD PROMPT
    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto border border-brand-200">
                    <Shield className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Trang Quản Trị Hệ Thống (Admin)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Yêu cầu xác thực qua Supabase Edge Function
                        'verify-admin' (ví dụ: admin123).
                    </p>
                </div>

                <form
                    onSubmit={handleVerifyPassword}
                    className="space-y-4 text-left"
                >
                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                            Mật khẩu Admin:
                        </label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) =>
                                    setPasswordInput(e.target.value)
                                }
                                placeholder="Nhập mật khẩu"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {authError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{authError}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                        {verifying
                            ? "Đang xác thực qua Edge Function..."
                            : "Xác Nhận Truy Cập Admin"}
                    </button>
                </form>
            </div>
        );
    }

    // 2. AUTHENTICATED ADMIN DASHBOARD
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* ADMIN HEADER & TAB SELECTOR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-600">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            Bảng Điều Khiển Admin & Giáo Viên
                        </h1>
                        <p className="text-xs text-slate-500">
                            Quản lý toàn bộ gói học viên (Plan) và khởi tạo bài
                            tập trắc nghiệm.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab("plans")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "plans"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600"
                        }`}
                    >
                        Quản Lý Plan Học Viên
                    </button>
                    <button
                        onClick={() => setActiveTab("create-quiz")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "create-quiz"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600"
                        }`}
                    >
                        Tạo Bài Tập / Import Word
                    </button>
                    <button
                        onClick={() => setActiveTab("quizzes")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "quizzes"
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-600"
                        }`}
                    >
                        Danh Sách Đề Thi ({quizzes.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: USER PLAN MANAGER */}
            {activeTab === "plans" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-brand-600" />
                                Quản Lý Gói Tài Khoản Học Viên (Plans)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Đổi plan trực tiếp cho tất cả tài khoản trong hệ
                                thống (Nothing, Basic, VIP).
                            </p>
                        </div>

                        <button
                            onClick={fetchProfiles}
                            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Tải lại danh sách"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${loadingProfiles ? "animate-spin" : ""}`}
                            />
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">
                                        Tên Người Dùng
                                    </th>
                                    <th className="py-3 px-4">Username</th>
                                    <th className="py-3 px-4">Vai Trò</th>
                                    <th className="py-3 px-4">
                                        Gói Hiện Tại (Plan)
                                    </th>
                                    <th className="py-3 px-4">
                                        Hành Động Đổi Plan
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {userProfiles.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-8 text-center text-slate-400"
                                        >
                                            Chưa tìm thấy người dùng nào trong
                                            cơ sở dữ liệu.
                                        </td>
                                    </tr>
                                ) : (
                                    userProfiles.map((prof) => (
                                        <tr
                                            key={prof.id}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {prof.name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                @{prof.username}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                                        prof.role === "teacher"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-sky-100 text-sky-800"
                                                    }`}
                                                >
                                                    {prof.role === "teacher"
                                                        ? "Giáo viên"
                                                        : "Học sinh"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                                        prof.plan === "vip"
                                                            ? "bg-amber-200 text-amber-900 border border-amber-300"
                                                            : prof.plan ===
                                                                "basic"
                                                              ? "bg-sky-200 text-sky-900 border border-sky-300"
                                                              : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}
                                                >
                                                    {prof.plan
                                                        ? prof.plan.toUpperCase()
                                                        : "NOTHING"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <select
                                                    disabled={
                                                        updatingUserId ===
                                                        prof.id
                                                    }
                                                    value={
                                                        prof.plan || "nothing"
                                                    }
                                                    onChange={(e) =>
                                                        handlePlanChange(
                                                            prof.id,
                                                            e.target
                                                                .value as UserPlan,
                                                        )
                                                    }
                                                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500 cursor-pointer shadow-2xs"
                                                >
                                                    <option value="nothing">
                                                        Plan Nothing (Free)
                                                    </option>
                                                    <option value="basic">
                                                        Plan Basic
                                                    </option>
                                                    <option value="vip">
                                                        Plan VIP (Premium)
                                                    </option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: CREATE QUIZ & WORD IMPORTER */}
            {activeTab === "create-quiz" && (
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-brand-600" />
                                Thông Tin Bài Tập Mới
                            </h3>
                            <button
                                onClick={() =>
                                    setShowWordImporter(!showWordImporter)
                                }
                                className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4 text-brand-600" />
                                {showWordImporter
                                    ? "Đóng Công Cụ Import Word"
                                    : "Import Đề Từ File Word (.docx)"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">
                                    Tên bài kiểm tra:
                                </label>
                                <input
                                    type="text"
                                    value={quizTitle}
                                    onChange={(e) =>
                                        setQuizTitle(e.target.value)
                                    }
                                    placeholder="VD: Kiểm Tra Đại Số Lớp 10"
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-400 focus:bg-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">
                                    Môn học:
                                </label>
                                <select
                                    value={quizSubject}
                                    onChange={(e) =>
                                        setQuizSubject(e.target.value)
                                    }
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-400 focus:bg-white"
                                >
                                    <option value="Toán Học">Toán Học</option>
                                    <option value="Vật Lý">Vật Lý</option>
                                    <option value="Hóa Học">Hóa Học</option>
                                    <option value="Tiếng Anh">Tiếng Anh</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">
                                    Dành cho Lớp:
                                </label>
                                <select
                                    value={quizGrade}
                                    onChange={(e) =>
                                        setQuizGrade(e.target.value)
                                    }
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-400 focus:bg-white"
                                >
                                    <option value="8">Lớp 8</option>
                                    <option value="9">Lớp 9</option>
                                    <option value="10">Lớp 10</option>
                                    <option value="11">Lớp 11</option>
                                    <option value="12">Lớp 12</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 mb-1 block">
                                    Thời gian làm bài (Phút):
                                </label>
                                <input
                                    type="number"
                                    value={quizDuration}
                                    onChange={(e) =>
                                        setQuizDuration(Number(e.target.value))
                                    }
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-400 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 mb-1 block">
                                Mô tả tóm tắt:
                            </label>
                            <input
                                type="text"
                                value={quizDescription}
                                onChange={(e) =>
                                    setQuizDescription(e.target.value)
                                }
                                placeholder="VD: Bài kiểm tra đánh giá kiến thức cơ bản..."
                                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-400 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* EMBEDDED WORD IMPORTER */}
                    {showWordImporter && (
                        <WordImporter
                            onQuestionsParsed={(questions) => {
                                setImportedQuestions(questions);
                                alert(
                                    `Đã nhập thành công ${questions.length} câu hỏi từ Word!`,
                                );
                            }}
                        />
                    )}

                    {saveStatus && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>{saveStatus}</span>
                        </div>
                    )}

                    <button
                        onClick={handleSaveNewQuiz}
                        className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-98"
                    >
                        Lưu Đề Thi Này Vào Hệ Thống
                    </button>
                </div>
            )}

            {/* TAB 3: QUIZZES CATALOG & DELETE */}
            {activeTab === "quizzes" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900">
                        Danh Sách Các Đề Thi Đang Mở
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quizzes.map((q) => (
                            <div
                                key={q.id}
                                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-md">
                                            {q.subject} - Lớp {q.grade || "10"}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {q.duration} phút
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-900 mt-2">
                                        {q.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        {q.questions.length} câu hỏi
                                    </p>
                                </div>

                                <button
                                    onClick={() => onDeleteQuiz(q.id)}
                                    className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Xóa Đề Thi
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

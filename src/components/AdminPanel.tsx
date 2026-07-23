import React, { useState } from "react";
import { User, Quiz, Submission, UserPlan } from "../types";
import {
    getAllProfiles,
    updateUserPlan,
    createQuiz,
    deleteQuiz,
    verifyAdminPasswordWithEdgeFunction,
    updateQuiz,
    signUpUser,
    updateUserProfile,
    deleteUserProfile,
} from "../lib/supabaseService";
import WordImporter from "./WordImporter";
import { renderMathHtml } from "../lib/math";
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
    Edit,
    Search,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    BookOpen,
    Clock,
    UserCheck,
    CheckCircle2,
    X,
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
    // Persist admin verification across reloads
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem("admin_verified") === "true";
    });
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const [activeTab, setActiveTab] = useState<
        "plans" | "create-quiz" | "quizzes" | "stats-quizzes" | "stats-students"
    >("plans");

    const [antiCheatEnabled, setAntiCheatEnabled] = useState<boolean>(() => {
        return localStorage.getItem("hitrang_anti_cheat_enabled") !== "false";
    });

    const handleToggleAntiCheat = (val: boolean) => {
        setAntiCheatEnabled(val);
        localStorage.setItem(
            "hitrang_anti_cheat_enabled",
            val ? "true" : "false",
        );
    };

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
    };

    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(
            /<table[^>]*>([\s\S]*?)<\/table>/gi,
            (match) => {
                if (
                    match.includes("Khẳng định") ||
                    match.includes("Đúng") ||
                    match.includes("Sai")
                ) {
                    return "";
                }
                return match;
            },
        );

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = clean;

        const items = Array.from(tempDiv.querySelectorAll("p, li, div"));
        items.forEach((item) => {
            const text = item.textContent?.trim() || "";
            if (/^[a-f][\)\.\:\-]/i.test(text)) {
                item.remove();
            }
        });

        return tempDiv.innerHTML;
    };

    const renderSubmissionReview = (sub: Submission, onBack: () => void) => {
        const quiz = quizzes.find((q) => q.id === sub.quizId);

        // Determine number of correct questions
        const correctAnswersCount = quiz
            ? quiz.questions.filter((q) => {
                  const chosen = sub.answers[q.id];
                  if (!q.type || q.type === "single_choice") {
                      return (
                          chosen !== undefined &&
                          chosen === q.correctAnswerIndex
                      );
                  } else if (q.type === "true_false") {
                      const correctTf = q.correctAnswers || [
                          false,
                          false,
                          false,
                          false,
                      ];
                      const studentTf = (chosen as (boolean | null)[]) || [
                          null,
                          null,
                          null,
                          null,
                      ];
                      return q.options.every(
                          (_, oIdx) => studentTf[oIdx] === correctTf[oIdx],
                      );
                  } else if (q.type === "short_answer") {
                      return (
                          String(chosen || "").trim().toLowerCase() ===
                          String(q.shortAnswerKey || "").trim().toLowerCase()
                      );
                  }
                  return false;
              }).length
            : 0;

        if (!quiz) {
            return (
                <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
                    Không tìm thấy dữ liệu đề thi tương ứng.
                </div>
            );
        }

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold bg-[#2B5467]/10 text-[#2B5467] px-2 py-0.5 rounded uppercase tracking-wider">
                                Xem bài làm học sinh
                            </span>
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                {sub.studentName}
                            </span>
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 mt-2">
                            {sub.quizTitle}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Nộp bài lúc: {sub.submittedAt}
                        </p>
                    </div>
                    <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center bg-brand-50 text-[#2B5467] w-14 h-14 rounded-full border border-brand-200 shadow-2xs">
                                <span className="text-base font-extrabold leading-none">
                                    {sub.score}
                                </span>
                                <span className="text-[7px] font-bold text-slate-400 mt-0.5">
                                    ĐIỂM
                                </span>
                            </div>
                            <div className="text-xs">
                                <div className="font-bold text-slate-800">
                                    Kết quả làm bài
                                </div>
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                    {correctAnswersCount} / {quiz.questions.length} câu đúng
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1 flex-shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Quay lại</span>
                        </button>
                    </div>
                </div>

                {/* Question Reviews */}
                <div className="space-y-6">
                    {quiz.questions.map((q, qIndex) => {
                        const chosen = sub.answers[q.id];

                        // Determine grading accuracy
                        let isQCorrect = false;
                        let isQPartial = false;
                        let tfStatusList: {
                            text: string;
                            correct: boolean;
                            studentVal: boolean | null;
                            correctVal: boolean;
                        }[] = [];

                        if (!q.type || q.type === "single_choice") {
                            isQCorrect =
                                chosen !== undefined &&
                                chosen === q.correctAnswerIndex;
                        } else if (q.type === "true_false") {
                            const correctTf = q.correctAnswers || [
                                false,
                                false,
                                false,
                                false,
                            ];
                            const studentTf = (chosen as (
                                | boolean
                                | null
                            )[]) || [null, null, null, null];

                            let matchCount = 0;
                            tfStatusList = q.options.map((opt, oIdx) => {
                                const sVal = studentTf[oIdx];
                                const cVal = correctTf[oIdx];
                                const match = sVal === cVal;
                                if (match) matchCount++;
                                return {
                                    text: opt,
                                    correct: match,
                                    studentVal: sVal,
                                    correctVal: cVal,
                                };
                            });

                            isQCorrect = matchCount === 4;
                            isQPartial = matchCount > 0 && matchCount < 4;
                        } else if (q.type === "short_answer") {
                            const cKey = (q.shortAnswerKey || "")
                                .trim()
                                .toLowerCase();
                            const sKey = String(chosen || "")
                                .trim()
                                .toLowerCase();
                            isQCorrect = cKey && sKey === cKey;
                        }

                        // Determine card border accent style
                        let cardAccentClass = "border-l-4 border-l-rose-500";
                        let statusBadgeClass =
                            "bg-rose-50 text-rose-700 border-rose-200";
                        let statusText = "Sai";

                        if (isQCorrect) {
                            cardAccentClass = "border-l-4 border-l-emerald-500";
                            statusBadgeClass =
                                "bg-emerald-50 text-emerald-700 border-emerald-200";
                            statusText = "Đúng";
                        } else if (isQPartial) {
                            cardAccentClass = "border-l-4 border-l-amber-500";
                            statusBadgeClass =
                                "bg-amber-50 text-amber-700 border-amber-200";
                            statusText = "Đúng một phần";
                        }

                        const displayQuestionText =
                            q.type === "true_false"
                                ? cleanTrueFalseQuestionText(q.text)
                                : q.text;

                        return (
                            <div
                                key={q.id}
                                className={`bg-white border-y border-r border-slate-200 ${cardAccentClass} rounded-xl p-5 space-y-4 shadow-3xs`}
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                                            Câu {qIndex + 1}
                                        </span>
                                        <span
                                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                q.type === "true_false"
                                                    ? "bg-amber-50 text-amber-800 border-amber-250"
                                                    : q.type === "short_answer"
                                                      ? "bg-purple-50 text-purple-800 border-purple-250"
                                                      : "bg-sky-50 text-sky-800 border-sky-250"
                                            }`}
                                        >
                                            {q.type === "true_false"
                                                ? "Đúng / Sai"
                                                : q.type === "short_answer"
                                                  ? "Điền đáp án"
                                                  : "Trắc nghiệm"}
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}
                                    >
                                        {statusText}
                                    </span>
                                </div>

                                <div
                                    className="text-[13px] font-semibold text-slate-800 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                    dangerouslySetInnerHTML={{
                                        __html: renderMathHtml(
                                            displayQuestionText,
                                        ),
                                    }}
                                />

                                {/* Options rendering */}
                                {(!q.type || q.type === "single_choice") && (
                                    <div className="space-y-2.5">
                                        {q.options.map((opt, oIdx) => {
                                            const isChosen = chosen === oIdx;
                                            const isCorrectOpt =
                                                q.correctAnswerIndex === oIdx;
                                            const cleanedOpt = opt.replace(
                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                "",
                                            );

                                            let cardStyle =
                                                "border-slate-200 text-slate-700";
                                            let badge = null;

                                            if (isCorrectOpt) {
                                                cardStyle =
                                                    "border-emerald-300 bg-emerald-50/20 text-emerald-800";
                                                badge = (
                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                        Đáp án đúng
                                                    </span>
                                                );
                                            } else if (
                                                isChosen &&
                                                !isCorrectOpt
                                            ) {
                                                cardStyle =
                                                    "border-rose-300 bg-rose-50/20 text-rose-800";
                                                badge = (
                                                    <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">
                                                        Lựa chọn của bạn
                                                    </span>
                                                );
                                            } else if (isChosen) {
                                                badge = (
                                                    <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                        Lựa chọn của bạn
                                                    </span>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={oIdx}
                                                    className={`flex items-center gap-3 p-3 border rounded-lg text-xs font-medium ${cardStyle}`}
                                                >
                                                    <span
                                                        className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                            isCorrectOpt
                                                                ? "bg-emerald-500 text-white"
                                                                : isChosen
                                                                  ? "bg-rose-55 text-white"
                                                                  : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        {String.fromCharCode(
                                                            65 + oIdx,
                                                        )}
                                                    </span>
                                                    <span
                                                        className="[&_img]:mx-auto [&_img]:block [&_img]:my-2"
                                                        dangerouslySetInnerHTML={{
                                                            __html: renderMathHtml(
                                                                cleanedOpt,
                                                            ),
                                                        }}
                                                    />
                                                    {badge}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {q.type === "true_false" && (
                                    <div className="space-y-2.5">
                                        {tfStatusList.map((item, oIdx) => {
                                            const sText =
                                                item.studentVal === null
                                                    ? "Chưa chọn"
                                                    : item.studentVal
                                                      ? "Đúng"
                                                      : "Sai";
                                            const cText = item.correctVal
                                                ? "Đúng"
                                                : "Sai";
                                            const cleanedOpt = item.text.replace(
                                                /^\s*[a-f][\)\.\:\-]\s*/i,
                                                "",
                                            );

                                            return (
                                                <div
                                                    key={oIdx}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs"
                                                >
                                                    <div className="font-medium text-slate-800 flex gap-2 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                        <span className="font-extrabold text-slate-500">
                                                            {String.fromCharCode(
                                                                97 + oIdx,
                                                            )}
                                                            )
                                                        </span>
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: renderMathHtml(
                                                                    cleanedOpt,
                                                                ),
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                                        <span
                                                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                                item.studentVal ===
                                                                null
                                                                    ? "bg-slate-200 text-slate-600 border border-slate-300"
                                                                    : item.correct
                                                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                                      : "bg-rose-100 text-rose-800 border border-rose-255"
                                                            }`}
                                                        >
                                                            Bạn chọn: {sText}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-255">
                                                            Đáp án: {cText}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {q.type === "short_answer" && (
                                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-lg flex flex-wrap gap-4 text-xs font-semibold">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500">
                                                Đáp án của bạn:
                                            </span>
                                            <span
                                                className={`px-2.5 py-0.5 rounded font-extrabold ${
                                                    isQCorrect
                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                        : "bg-rose-100 text-rose-800 border border-rose-255"
                                                }`}
                                            >
                                                {chosen !== undefined &&
                                                chosen !== ""
                                                    ? String(chosen)
                                                    : "(Để trống)"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                            <span className="text-slate-500">
                                                Đáp án đúng:
                                            </span>
                                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-255 px-2.5 py-0.5 rounded font-extrabold">
                                                {q.shortAnswerKey}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {q.explanation && (
                                    <div className="bg-slate-55 border border-slate-200 rounded-lg p-4 text-xs space-y-2 mt-4">
                                        <div className="flex items-center gap-1.5 text-[#2B5467] font-extrabold">
                                            <BookOpen className="w-4 h-4 text-[#2B5467]" />
                                            <span>Lời giải chi tiết:</span>
                                        </div>
                                        <div
                                            className="text-slate-705 overflow-x-auto leading-relaxed pl-5 border-l-2 border-[#2B5467]/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                            dangerouslySetInnerHTML={{
                                                __html: renderMathHtml(
                                                    q.explanation,
                                                ),
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    // User Management filters, search and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "teacher" | "student">(
        "all",
    );
    const [filterPlan, setFilterPlan] = useState<"all" | UserPlan>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Create User state
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserUsername, setNewUserUsername] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"teacher" | "student">(
        "student",
    );
    const [newUserPlan, setNewUserPlan] = useState<UserPlan>("nothing");

    // Edit User state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState("");
    const [editUserUsername, setEditUserUsername] = useState("");
    const [editUserRole, setEditUserRole] = useState<"teacher" | "student">(
        "student",
    );
    const [editUserPlan, setEditUserPlan] = useState<UserPlan>("nothing");

    // Statistics & Analytics state
    const [statsQuizSortBy, setStatsQuizSortBy] = useState<
        "submissions" | "avgScore" | "highestScore"
    >("submissions");
    const [statsStudentQuery, setStatsStudentQuery] = useState("");
    const [selectedStatsStudentId, setSelectedStatsStudentId] = useState<
        string | null
    >(null);
    const [adminReviewSubmission, setAdminReviewSubmission] =
        useState<Submission | null>(null);
    const [selectedQuizForDetails, setSelectedQuizForDetails] =
        useState<Quiz | null>(null);

    // Fetch profiles on mount if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            fetchProfiles();
        }
    }, [isAuthenticated]);

    // New Quiz Form state
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizSubject, setQuizSubject] = useState("Toán Học");
    const [quizGrade, setQuizGrade] = useState("10");
    const [quizDuration, setQuizDuration] = useState(45);
    const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
    const [showWordImporter, setShowWordImporter] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Editing quiz state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editIsPublic, setEditIsPublic] = useState<boolean>(true);

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
                sessionStorage.setItem("admin_verified", "true");
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
            await fetchProfiles();
        } catch (err: any) {
            console.error("Lỗi cập nhật plan:", err);
        } finally {
            setUpdatingUserId(null);
        }
    };

    // Add new account
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !newUserName.trim() ||
            !newUserUsername.trim() ||
            !newUserPassword.trim()
        ) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        try {
            // Regiter user via signUpUser
            const createdUser = await signUpUser(
                newUserName.trim(),
                newUserUsername.trim(),
                newUserPassword,
                newUserRole,
            );
            // If plan is not 'nothing', we need to update it
            if (newUserPlan !== "nothing") {
                await updateUserPlan(createdUser.id, newUserPlan);
            }
            alert("Tạo tài khoản thành công!");
            setIsCreateUserOpen(false);
            setNewUserName("");
            setNewUserUsername("");
            setNewUserPassword("");
            setNewUserRole("student");
            setNewUserPlan("nothing");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi tạo tài khoản: ${err.message}`);
        }
    };

    // Edit user handlers
    const startEditUser = (user: User) => {
        setEditingUser(user);
        setEditUserName(user.name);
        setEditUserUsername(user.username);
        setEditUserRole(user.role);
        setEditUserPlan(user.plan || "nothing");
    };

    const handleSaveEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (!editUserName.trim() || !editUserUsername.trim()) {
            alert("Vui lòng điền đầy đủ họ tên và username.");
            return;
        }
        try {
            await updateUserProfile(editingUser.id, {
                name: editUserName.trim(),
                username: editUserUsername.trim(),
                role: editUserRole,
                plan: editUserPlan,
            });
            alert("Cập nhật tài khoản thành công!");
            setEditingUser(null);
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi cập nhật tài khoản: ${err.message}`);
        }
    };

    // Delete user account
    const handleDeleteUser = async (userId: string) => {
        if (
            !confirm(
                "Bạn có chắc chắn muốn xóa tài khoản này? Thao tác này không thể hoàn tác.",
            )
        ) {
            return;
        }
        try {
            await deleteUserProfile(userId);
            alert("Đã xóa tài khoản thành công!");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi xóa tài khoản: ${err.message}`);
        }
    };

    // Save new quiz (including isPublic flag)
    const handleSaveNewQuiz = async () => {
        if (!quizTitle.trim() || !quizSubject.trim()) {
            alert("Vui lòng nhập tiêu đề và môn học.");
            return;
        }
        const newQuiz: Quiz = {
            id: crypto.randomUUID(),
            title: quizTitle.trim(),
            description:
                quizDescription.trim() || "Bài kiểm tra chất lượng cao HiTrang",
            subject: quizSubject,
            grade: quizGrade,
            duration: quizDuration,
            questions: importedQuestions,
            createdAt: new Date().toISOString().split("T")[0],
            isPublic: true,
        };
        try {
            await createQuiz(newQuiz);
            onAddQuiz(newQuiz);
            setSaveStatus("Lưu đề thi thành công!");
            setQuizTitle("");
            setQuizDescription("");
            setImportedQuestions([]);
            setShowWordImporter(false);
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err: any) {
            alert(`Lỗi khi lưu đề thi: ${err.message}`);
        }
    };

    // Edit quiz handling
    const startEditQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setEditTitle(quiz.title);
        setEditDescription(quiz.description);
        setEditIsPublic(quiz.isPublic !== undefined ? quiz.isPublic : true);
    };

    const cancelEdit = () => {
        setEditingQuiz(null);
    };

    const saveEditQuiz = async () => {
        if (!editingQuiz) return;
        const updated: Partial<Quiz> = {
            title: editTitle,
            description: editDescription,
            isPublic: editIsPublic,
        };
        try {
            await updateQuiz(editingQuiz.id, updated);
            onDeleteQuiz(editingQuiz.id);
            onAddQuiz({ ...editingQuiz, ...updated } as Quiz);
            setEditingQuiz(null);
        } catch (err: any) {
            alert(`Lỗi khi cập nhật đề thi: ${err.message}`);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto border border-brand-200">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                    Trang Quản Trị Hệ Thống (Admin)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Yêu cầu xác thực qua Supabase Edge Function 'verify-admin'
                    (ví dụ: admin123).
                </p>
                <form
                    onSubmit={handleVerifyPassword}
                    className="space-y-4 text-left"
                >
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Mật khẩu Admin:
                    </label>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                        />
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
                            ? "Đang xác thực..."
                            : "Xác Nhận Truy Cập Admin"}
                    </button>
                </form>
            </div>
        );
    }

    // Authenticated dashboard with left sidebar
    const filteredUsers = userProfiles.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" || u.role === filterRole;
        const matchesPlan =
            filterPlan === "all" || (u.plan || "nothing") === filterPlan;
        return matchesSearch && matchesRole && matchesPlan;
    });

    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    return (
        <div className="flex" style={{ minHeight: "100vh" }}>
            {/* LEFT SIDEBAR */}
            <aside className="w-56 bg-white border-r border-slate-100 p-6 flex flex-col justify-between">
                <div className="space-y-10">
                    {/* Logo */}
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-sm font-bold tracking-widest text-slate-900 uppercase">
                            HITRANG
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col space-y-6">
                        {/* Section 1: Tài khoản */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-4 select-none">
                                Tài khoản
                            </span>
                            <div className="space-y-1.5">
                                <button
                                    onClick={() => setActiveTab("plans")}
                                    className={`w-full text-left transition-all cursor-pointer text-xs py-1.5 ${
                                        activeTab === "plans"
                                            ? "border-l-2 border-slate-900 pl-4 text-slate-900 font-bold"
                                            : "border-l-2 border-transparent pl-4 text-slate-500 hover:text-slate-800 font-medium"
                                    }`}
                                >
                                    Quản lý Account
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Đề thi */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-4 select-none">
                                Đề thi
                            </span>
                            <div className="space-y-1.5">
                                <button
                                    onClick={() => setActiveTab("create-quiz")}
                                    className={`w-full text-left transition-all cursor-pointer text-xs py-1.5 ${
                                        activeTab === "create-quiz"
                                            ? "border-l-2 border-slate-900 pl-4 text-slate-900 font-bold"
                                            : "border-l-2 border-transparent pl-4 text-slate-500 hover:text-slate-800 font-medium"
                                    }`}
                                >
                                    Tạo / Sửa Đề Thi
                                </button>
                                <button
                                    onClick={() => setActiveTab("quizzes")}
                                    className={`w-full text-left transition-all cursor-pointer text-xs py-1.5 ${
                                        activeTab === "quizzes"
                                            ? "border-l-2 border-slate-900 pl-4 text-slate-900 font-bold"
                                            : "border-l-2 border-transparent pl-4 text-slate-500 hover:text-slate-800 font-medium"
                                    }`}
                                >
                                    Danh Sách Đề Thi
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Kết quả làm bài */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-4 select-none">
                                Kết quả làm bài
                            </span>
                            <div className="space-y-1.5">
                                <button
                                    onClick={() =>
                                        setActiveTab("stats-quizzes")
                                    }
                                    className={`w-full text-left transition-all cursor-pointer text-xs py-1.5 ${
                                        activeTab === "stats-quizzes"
                                            ? "border-l-2 border-slate-900 pl-4 text-slate-900 font-bold"
                                            : "border-l-2 border-transparent pl-4 text-slate-500 hover:text-slate-800 font-medium"
                                    }`}
                                >
                                    Thống kê đề thi
                                </button>
                                <button
                                    onClick={() =>
                                        setActiveTab("stats-students")
                                    }
                                    className={`w-full text-left transition-all cursor-pointer text-xs py-1.5 ${
                                        activeTab === "stats-students"
                                            ? "border-l-2 border-slate-900 pl-4 text-slate-900 font-bold"
                                            : "border-l-2 border-transparent pl-4 text-slate-500 hover:text-slate-800 font-medium"
                                    }`}
                                >
                                    Thống kê học sinh
                                </button>
                            </div>
                        </div>
                    </nav>
                </div>

                {/* Anti-cheat Control */}
                <div className="pt-6 border-t border-slate-100 px-1 mt-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-700 block">
                                Chống gian lận
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 leading-snug">
                                Cảnh báo học sinh khi chuyển tab hoặc đổi trang.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                handleToggleAntiCheat(!antiCheatEnabled)
                            }
                            className={`w-8 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative flex-shrink-0 ${
                                antiCheatEnabled
                                    ? "bg-[#2B5467]"
                                    : "bg-slate-200"
                            }`}
                        >
                            <div
                                className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform transform ${
                                    antiCheatEnabled
                                        ? "translate-x-3"
                                        : "translate-x-0"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-1">
                    <span className="text-[10px] text-slate-355 font-semibold tracking-wide uppercase">
                        Admin Controls
                    </span>
                </div>
            </aside>
            <section className="flex-1 p-6 overflow-y-auto">
                {adminReviewSubmission ? (
                    renderSubmissionReview(adminReviewSubmission, () => setAdminReviewSubmission(null))
                ) : (
                    <>
                        {activeTab === "plans" && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">
                                    Gói Người Dùng
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Quản lý phân quyền, tìm kiếm và phân cấp gói
                                    dịch vụ học viên.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsCreateUserOpen(true)}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                Tạo tài khoản
                            </button>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            {/* Search */}
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Tìm tên hoặc username..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <select
                                    value={filterRole}
                                    onChange={(e) => {
                                        setFilterRole(e.target.value as any);
                                        setCurrentPage(1);
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                >
                                    <option value="all">Tất cả vai trò</option>
                                    <option value="teacher">Giáo viên</option>
                                    <option value="student">Học sinh</option>
                                </select>

                                <select
                                    value={filterPlan}
                                    onChange={(e) => {
                                        setFilterPlan(e.target.value as any);
                                        setCurrentPage(1);
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer"
                                >
                                    <option value="all">Tất cả gói</option>
                                    <option value="nothing">
                                        Free (Nothing)
                                    </option>
                                    <option value="basic">Basic</option>
                                    <option value="vip">VIP</option>
                                </select>
                            </div>
                        </div>

                        {/* User List */}
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                                        <th className="py-2.5 px-4">
                                            Tên Người Dùng
                                        </th>
                                        <th className="py-2.5 px-4">
                                            Username
                                        </th>
                                        <th className="py-2.5 px-4">Vai Trò</th>
                                        <th className="py-2.5 px-4">Plan</th>
                                        <th className="py-2.5 px-4 text-right">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                                    {loadingProfiles ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-8 text-center text-slate-400"
                                            >
                                                Đang tải danh sách...
                                            </td>
                                        </tr>
                                    ) : paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-8 text-center text-slate-400"
                                            >
                                                Không tìm thấy tài khoản nào.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUsers.map((prof) => (
                                            <tr
                                                key={prof.id}
                                                className="hover:bg-slate-50/40 transition-colors"
                                            >
                                                <td className="py-3 px-4 font-medium text-slate-800">
                                                    {prof.name}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">
                                                    @{prof.username}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${prof.role === "teacher" ? "bg-amber-50/80 text-amber-700 border-amber-100" : "bg-sky-50/80 text-sky-700 border-sky-100"}`}
                                                    >
                                                        {prof.role === "teacher"
                                                            ? "Giáo viên"
                                                            : "Học sinh"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <select
                                                        disabled={
                                                            updatingUserId ===
                                                            prof.id
                                                        }
                                                        value={
                                                            prof.plan ||
                                                            "nothing"
                                                        }
                                                        onChange={(e) =>
                                                            handlePlanChange(
                                                                prof.id,
                                                                e.target
                                                                    .value as UserPlan,
                                                            )
                                                        }
                                                        className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                                            prof.plan === "vip"
                                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                : prof.plan ===
                                                                    "basic"
                                                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                                                  : "bg-slate-50 text-slate-600 border-slate-200"
                                                        }`}
                                                    >
                                                        <option value="nothing">
                                                            FREE
                                                        </option>
                                                        <option value="basic">
                                                            BASIC
                                                        </option>
                                                        <option value="vip">
                                                            VIP
                                                        </option>
                                                    </select>
                                                </td>
                                                <td className="py-3 px-4 text-right space-x-1.5">
                                                    <button
                                                        onClick={() =>
                                                            startEditUser(prof)
                                                        }
                                                        className="inline-flex items-center px-2 py-1 hover:bg-slate-100 text-slate-500 rounded transition-colors cursor-pointer text-[11px] font-medium"
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        disabled={
                                                            updatingUserId ===
                                                            prof.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteUser(
                                                                prof.id,
                                                            )
                                                        }
                                                        className="inline-flex items-center px-2 py-1 hover:bg-rose-50 text-rose-600 rounded transition-colors cursor-pointer text-[11px] font-medium"
                                                    >
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-[11px] text-slate-400">
                                    Hiển thị {(currentPage - 1) * pageSize + 1}{" "}
                                    -{" "}
                                    {Math.min(
                                        currentPage * pageSize,
                                        filteredUsers.length,
                                    )}{" "}
                                    / {filteredUsers.length} tài khoản
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="p-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-500 rounded-md transition-colors cursor-pointer"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[11px] font-semibold text-slate-600 px-2">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="p-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-500 rounded-md transition-colors cursor-pointer"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CREATE USER MODAL */}
                        {isCreateUserOpen && (
                            <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                    <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                        Tạo tài khoản mới
                                    </h3>
                                    <form
                                        onSubmit={handleCreateUser}
                                        className="space-y-3.5"
                                    >
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                Họ Tên
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Nguyễn Văn A"
                                                value={newUserName}
                                                onChange={(e) =>
                                                    setNewUserName(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                Tên đăng nhập
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="nguyenvana"
                                                value={newUserUsername}
                                                onChange={(e) =>
                                                    setNewUserUsername(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                Mật khẩu
                                            </label>
                                            <input
                                                type="password"
                                                required
                                                placeholder="Nhập mật khẩu"
                                                value={newUserPassword}
                                                onChange={(e) =>
                                                    setNewUserPassword(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                    Vai trò
                                                </label>
                                                <select
                                                    value={newUserRole}
                                                    onChange={(e) =>
                                                        setNewUserRole(
                                                            e.target
                                                                .value as any,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                >
                                                    <option value="student">
                                                        Học sinh
                                                    </option>
                                                    <option value="teacher">
                                                        Giáo viên
                                                    </option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                    Plan
                                                </label>
                                                <select
                                                    value={newUserPlan}
                                                    onChange={(e) =>
                                                        setNewUserPlan(
                                                            e.target
                                                                .value as any,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                >
                                                    <option value="nothing">
                                                        Free (Nothing)
                                                    </option>
                                                    <option value="basic">
                                                        Basic
                                                    </option>
                                                    <option value="vip">
                                                        VIP
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIsCreateUserOpen(false)
                                                }
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
                                            >
                                                Tạo
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* EDIT USER MODAL */}
                        {editingUser && (
                            <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                    <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                                        Chỉnh sửa tài khoản
                                    </h3>
                                    <form
                                        onSubmit={handleSaveEditUser}
                                        className="space-y-3.5"
                                    >
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                Họ Tên
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={editUserName}
                                                onChange={(e) =>
                                                    setEditUserName(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                Tên đăng nhập
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={editUserUsername}
                                                onChange={(e) =>
                                                    setEditUserUsername(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-normal focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/10"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                    Vai trò
                                                </label>
                                                <select
                                                    value={editUserRole}
                                                    onChange={(e) =>
                                                        setEditUserRole(
                                                            e.target
                                                                .value as any,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                >
                                                    <option value="student">
                                                        Học sinh
                                                    </option>
                                                    <option value="teacher">
                                                        Giáo viên
                                                    </option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase">
                                                    Plan
                                                </label>
                                                <select
                                                    value={editUserPlan}
                                                    onChange={(e) =>
                                                        setEditUserPlan(
                                                            e.target
                                                                .value as any,
                                                        )
                                                    }
                                                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                                >
                                                    <option value="nothing">
                                                        Free (Nothing)
                                                    </option>
                                                    <option value="basic">
                                                        Basic
                                                    </option>
                                                    <option value="vip">
                                                        VIP
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditingUser(null)
                                                }
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
                                            >
                                                Lưu thay đổi
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === "create-quiz" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Tạo Đề Thi</h2>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-brand-600" />{" "}
                                    Thông Tin Bài Tập Mới
                                </h3>
                                <button
                                    onClick={() =>
                                        setShowWordImporter(!showWordImporter)
                                    }
                                    className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-2"
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
                                        <option value="Toán Học">
                                            Toán Học
                                        </option>
                                        <option value="Vật Lý">Vật Lý</option>
                                        <option value="Hóa Học">Hóa Học</option>
                                        <option value="Tiếng Anh">
                                            Tiếng Anh
                                        </option>
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
                                            setQuizDuration(
                                                Number(e.target.value),
                                            )
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
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium"
                            >
                                Lưu Đề Thi
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === "quizzes" && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900">
                            Danh Sách Các Đề Thi
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {quizzes.map((q) => (
                                <div
                                    key={q.id}
                                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold bg-brand-100 px-2 py-0.5 rounded-md text-brand-700">
                                                {q.subject} - Lớp{" "}
                                                {q.grade || "10"}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {q.duration} phút
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold mt-2">
                                            {q.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            {q.questions.length} câu hỏi
                                        </p>
                                        <p className="text-xs mt-1">
                                            {q.isPublic === false
                                                ? "Riêng tư"
                                                : "Công khai"}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2 mt-2">
                                        <button
                                            onClick={() => onDeleteQuiz(q.id)}
                                            className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center justify-center"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />{" "}
                                            Xóa
                                        </button>
                                        <button
                                            onClick={() => startEditQuiz(q)}
                                            className="flex-1 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-[11px] font-bold flex items-center justify-center"
                                        >
                                            <Edit className="w-3.5 h-3.5" /> Sửa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "stats-quizzes" &&
                    (() => {
                        const statsQuizzesData = quizzes.map((quiz) => {
                            const quizSubmissions = submissions.filter(
                                (s) => s.quizId === quiz.id,
                            );
                            const count = quizSubmissions.length;
                            const avg =
                                count > 0
                                    ? Number(
                                          (
                                              quizSubmissions.reduce(
                                                  (acc, curr) =>
                                                      acc + curr.score,
                                                  0,
                                              ) / count
                                          ).toFixed(1),
                                      )
                                    : 0;

                            let maxScore = 0;
                            let maxScorer = "-";
                            if (count > 0) {
                                const sortedSubs = [...quizSubmissions].sort(
                                    (a, b) => b.score - a.score,
                                );
                                maxScore = sortedSubs[0].score;
                                maxScorer = sortedSubs[0].studentName;
                            }

                            return {
                                id: quiz.id,
                                title: quiz.title,
                                subject: quiz.subject,
                                questionsCount: quiz.questions.length,
                                submissionsCount: count,
                                avgScore: avg,
                                highestScore: maxScore,
                                highestScorerName: maxScorer,
                            };
                        });

                        const sortedStatsQuizzes = [...statsQuizzesData].sort(
                            (a, b) => {
                                if (statsQuizSortBy === "submissions") {
                                    return (
                                        b.submissionsCount - a.submissionsCount
                                    );
                                } else if (statsQuizSortBy === "avgScore") {
                                    return b.avgScore - a.avgScore;
                                } else if (statsQuizSortBy === "highestScore") {
                                    return b.highestScore - a.highestScore;
                                }
                                return 0;
                            },
                        );

                        return (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800">
                                            Thống Kê Đề Thi
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Thống kê điểm số trung bình, cao
                                            nhất và số lượng người tham gia từng
                                            đề thi.
                                        </p>
                                    </div>
                                    {/* Sort Dropdown */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-500">
                                            Sắp xếp theo:
                                        </span>
                                        <select
                                            value={statsQuizSortBy}
                                            onChange={(e) =>
                                                setStatsQuizSortBy(
                                                    e.target.value as any,
                                                )
                                            }
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-400"
                                        >
                                            <option value="submissions">
                                                Số lượt làm bài
                                            </option>
                                            <option value="avgScore">
                                                Điểm trung bình
                                            </option>
                                            <option value="highestScore">
                                                Điểm cao nhất
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                {/* Visual Chart Card */}
                                {statsQuizzesData.length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs space-y-4">
                                        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <BarChart3 className="w-4 h-4 text-brand-600" />
                                            <span>
                                                Biểu đồ điểm trung bình các đề
                                                thi (Top 5)
                                            </span>
                                        </h3>
                                        <div className="space-y-3 pt-2">
                                            {statsQuizzesData
                                                .slice(0, 5)
                                                .map((qData) => {
                                                    const percentage =
                                                        (qData.avgScore / 10) *
                                                        100;
                                                    return (
                                                        <div
                                                            key={qData.id}
                                                            className="space-y-1"
                                                        >
                                                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                                                                <span className="truncate max-w-[200px] sm:max-w-xs">
                                                                    {
                                                                        qData.title
                                                                    }
                                                                </span>
                                                                <span>
                                                                    {
                                                                        qData.avgScore
                                                                    }{" "}
                                                                    / 10 (
                                                                    {
                                                                        qData.submissionsCount
                                                                    }{" "}
                                                                    lượt)
                                                                </span>
                                                            </div>
                                                            <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                                                                <div
                                                                    className="h-full bg-brand-350 dark:bg-brand-500 rounded-lg transition-all duration-500 flex items-center px-2"
                                                                    style={{
                                                                        width: `${Math.max(percentage, 5)}%`,
                                                                    }}
                                                                >
                                                                    <span className="text-[9px] font-extrabold text-white">
                                                                        {percentage.toFixed(
                                                                            0,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Table of Quizzes */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider">
                                                    <th className="p-4">
                                                        Đề thi
                                                    </th>
                                                    <th className="p-4">
                                                        Môn học
                                                    </th>
                                                    <th className="p-4 text-center">
                                                        Số câu hỏi
                                                    </th>
                                                    <th className="p-4 text-center">
                                                        Lượt làm
                                                    </th>
                                                    <th className="p-4 text-center">
                                                        Điểm TB
                                                    </th>
                                                    <th className="p-4 text-center">
                                                        Điểm cao nhất
                                                    </th>
                                                    <th className="p-4">
                                                        Người cao nhất
                                                    </th>
                                                    <th className="p-4 text-center">
                                                        Hành động
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                {sortedStatsQuizzes.map(
                                                    (quizData) => (
                                                        <tr
                                                            key={quizData.id}
                                                            className="hover:bg-slate-50/50"
                                                        >
                                                            <td className="p-4 font-bold text-slate-900">
                                                                {quizData.title}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                                                                    {
                                                                        quizData.subject
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {
                                                                    quizData.questionsCount
                                                                }
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {
                                                                    quizData.submissionsCount
                                                                }
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        quizData.avgScore >=
                                                                        8
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : quizData.avgScore >=
                                                                                5
                                                                              ? "bg-amber-50 text-amber-700"
                                                                              : quizData.submissionsCount >
                                                                                  0
                                                                                ? "bg-rose-50 text-rose-700"
                                                                                : "bg-slate-50 text-slate-400"
                                                                    }`}
                                                                >
                                                                    {quizData.avgScore >
                                                                    0
                                                                        ? quizData.avgScore
                                                                        : "-"}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center font-bold text-slate-900">
                                                                {quizData.submissionsCount >
                                                                0
                                                                    ? quizData.highestScore
                                                                    : "-"}
                                                            </td>
                                                            <td className="p-4 text-slate-600 font-medium">
                                                                {quizData.submissionsCount >
                                                                0
                                                                    ? quizData.highestScorerName
                                                                    : "-"}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const originalQuiz = quizzes.find(q => q.id === quizData.id);
                                                                        if (originalQuiz) {
                                                                            setSelectedQuizForDetails(originalQuiz);
                                                                        }
                                                                    }}
                                                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                                                >
                                                                    Chi tiết
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                                {sortedStatsQuizzes.length ===
                                                    0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={8}
                                                            className="p-8 text-center text-slate-400 italic"
                                                        >
                                                            Không có dữ liệu đề
                                                            thi tương ứng.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {selectedQuizForDetails && (
                                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-45 p-4 select-none">
                                        <div className="bg-white rounded-xl w-full max-w-3xl flex flex-col max-h-[85vh] shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                                            {/* Modal Header */}
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                                                <div>
                                                    <span className="text-[10px] font-extrabold text-[#2B5467] bg-[#2B5467]/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                                        Danh sách học sinh làm bài
                                                    </span>
                                                    <h3 className="text-sm font-bold text-slate-800 mt-1.5">
                                                        {selectedQuizForDetails.title}
                                                    </h3>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedQuizForDetails(null)}
                                                    className="p-1.5 hover:bg-slate-105 text-slate-400 hover:text-slate-600 rounded-lg transition-all cursor-pointer"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Modal Content */}
                                            <div className="p-6 overflow-y-auto min-h-0 flex-1">
                                                {(() => {
                                                    const quizSubs = submissions
                                                        .filter(s => s.quizId === selectedQuizForDetails.id)
                                                        .sort((a, b) => b.score - a.score);

                                                    if (quizSubs.length === 0) {
                                                        return (
                                                            <div className="text-center py-12 text-slate-400 italic">
                                                                Chưa có học sinh nào thực hiện bài thi này.
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="border border-slate-150 rounded-xl overflow-hidden">
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse text-xs">
                                                                    <thead>
                                                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider">
                                                                            <th className="p-3.5 text-center w-12">Hạng</th>
                                                                            <th className="p-3.5">Học sinh</th>
                                                                            <th className="p-3.5 text-center">Điểm số</th>
                                                                            <th className="p-3.5 text-center">Thời gian làm</th>
                                                                            <th className="p-3.5">Thời điểm nộp</th>
                                                                            <th className="p-3.5 text-center">Hành động</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                                                        {quizSubs.map((sub, index) => {
                                                                            let scoreColor = "bg-rose-50 text-rose-700 border border-rose-200";
                                                                            if (sub.score >= 8) {
                                                                                scoreColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                                                            } else if (sub.score >= 5) {
                                                                                scoreColor = "bg-amber-50 text-amber-700 border border-amber-200";
                                                                            }

                                                                            return (
                                                                                <tr key={sub.id} className="hover:bg-slate-50/50">
                                                                                    <td className="p-3.5 text-center font-extrabold text-slate-450">
                                                                                        #{index + 1}
                                                                                    </td>
                                                                                    <td className="p-3.5">
                                                                                        <div className="font-bold text-slate-800">{sub.studentName}</div>
                                                                                        <div className="text-[10px] text-slate-400 font-medium">@{sub.studentUsername || "unknown"}</div>
                                                                                    </td>
                                                                                    <td className="p-3.5 text-center">
                                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${scoreColor}`}>
                                                                                            {sub.score} / 10
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="p-3.5 text-center text-slate-500">
                                                                                        {sub.timeSpent !== undefined ? formatTime(sub.timeSpent) : "-"}
                                                                                    </td>
                                                                                    <td className="p-3.5 text-slate-500 font-medium">
                                                                                        {sub.submittedAt}
                                                                                    </td>
                                                                                    <td className="p-3.5 text-center">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setAdminReviewSubmission(sub)}
                                                                                            className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded text-[10px] font-bold transition-all active:scale-[0.98] cursor-pointer"
                                                                                        >
                                                                                            Xem
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Modal Footer */}
                                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
                                                <button
                                                    onClick={() => setSelectedQuizForDetails(null)}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all active:scale-[0.98] cursor-pointer"
                                                >
                                                    Đóng
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                {activeTab === "stats-students" && (
                    <div className="space-y-6">
                        {adminReviewSubmission ? (
                            <div className="space-y-6">
                                {(() => {
                                    const quiz = quizzes.find(
                                        (q) =>
                                            q.id ===
                                            adminReviewSubmission.quizId,
                                    );

                                    // Determine number of correct questions
                                    const correctAnswersCount = quiz
                                        ? quiz.questions.filter((q) => {
                                              const chosen =
                                                  adminReviewSubmission.answers[
                                                      q.id
                                                  ];
                                              if (
                                                  !q.type ||
                                                  q.type === "single_choice"
                                              ) {
                                                  return (
                                                      chosen !== undefined &&
                                                      chosen ===
                                                          q.correctAnswerIndex
                                                  );
                                              } else if (
                                                  q.type === "true_false"
                                              ) {
                                                  const correctTf =
                                                      q.correctAnswers || [
                                                          false,
                                                          false,
                                                          false,
                                                          false,
                                                      ];
                                                  const studentTf = (chosen as (
                                                      | boolean
                                                      | null
                                                  )[]) || [
                                                      null,
                                                      null,
                                                      null,
                                                      null,
                                                  ];
                                                  return q.options.every(
                                                      (_, oIdx) =>
                                                          studentTf[oIdx] ===
                                                          correctTf[oIdx],
                                                  );
                                              } else if (
                                                  q.type === "short_answer"
                                              ) {
                                                  return (
                                                      String(chosen || "")
                                                          .trim()
                                                          .toLowerCase() ===
                                                      String(
                                                          q.shortAnswerKey ||
                                                              "",
                                                      )
                                                          .trim()
                                                          .toLowerCase()
                                                  );
                                              }
                                              return false;
                                          }).length
                                        : 0;

                                    if (!quiz) {
                                        return (
                                            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-gray-400 italic">
                                                Không tìm thấy dữ liệu đề thi
                                                tương ứng.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="max-w-4xl mx-auto space-y-6">
                                            {/* Header */}
                                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold bg-[#2B5467]/10 text-[#2B5467] px-2 py-0.5 rounded uppercase tracking-wider">
                                                            Xem bài làm học sinh
                                                        </span>
                                                        <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">
                                                            {
                                                                adminReviewSubmission.studentName
                                                            }
                                                        </span>
                                                    </div>
                                                    <h2 className="text-sm font-bold text-slate-900 mt-2">
                                                        {
                                                            adminReviewSubmission.quizTitle
                                                        }
                                                    </h2>
                                                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        Nộp bài lúc:{" "}
                                                        {
                                                            adminReviewSubmission.submittedAt
                                                        }
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-6 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-center justify-center bg-brand-50 text-[#2B5467] w-14 h-14 rounded-full border border-brand-200 shadow-2xs">
                                                            <span className="text-base font-extrabold leading-none">
                                                                {
                                                                    adminReviewSubmission.score
                                                                }
                                                            </span>
                                                            <span className="text-[7px] font-bold text-slate-400 mt-0.5">
                                                                ĐIỂM
                                                            </span>
                                                        </div>
                                                        <div className="text-xs">
                                                            <div className="font-bold text-slate-800">
                                                                Kết quả làm bài
                                                            </div>
                                                            <div className="text-slate-500 text-[11px] mt-0.5">
                                                                {
                                                                    correctAnswersCount
                                                                }{" "}
                                                                /{" "}
                                                                {
                                                                    quiz
                                                                        .questions
                                                                        .length
                                                                }{" "}
                                                                câu đúng
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setAdminReviewSubmission(
                                                                null,
                                                            )
                                                        }
                                                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all shadow-3xs cursor-pointer active:scale-95 flex items-center gap-1 flex-shrink-0"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                        <span>Quay lại</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Reviews */}
                                            <div className="space-y-6">
                                                {quiz.questions.map(
                                                    (q, qIndex) => {
                                                        const chosen =
                                                            adminReviewSubmission
                                                                .answers[q.id];

                                                        // Determine grading accuracy
                                                        let isQCorrect = false;
                                                        let isQPartial = false;
                                                        let tfStatusList: {
                                                            text: string;
                                                            correct: boolean;
                                                            studentVal:
                                                                | boolean
                                                                | null;
                                                            correctVal: boolean;
                                                        }[] = [];

                                                        if (
                                                            !q.type ||
                                                            q.type ===
                                                                "single_choice"
                                                        ) {
                                                            isQCorrect =
                                                                chosen !==
                                                                    undefined &&
                                                                chosen ===
                                                                    q.correctAnswerIndex;
                                                        } else if (
                                                            q.type ===
                                                            "true_false"
                                                        ) {
                                                            const correctTf =
                                                                q.correctAnswers || [
                                                                    false,
                                                                    false,
                                                                    false,
                                                                    false,
                                                                ];
                                                            const studentTf =
                                                                (chosen as (
                                                                    | boolean
                                                                    | null
                                                                )[]) || [
                                                                    null,
                                                                    null,
                                                                    null,
                                                                    null,
                                                                ];

                                                            let matchCount = 0;
                                                            tfStatusList =
                                                                q.options.map(
                                                                    (
                                                                        opt,
                                                                        oIdx,
                                                                    ) => {
                                                                        const sVal =
                                                                            studentTf[
                                                                                oIdx
                                                                            ];
                                                                        const cVal =
                                                                            correctTf[
                                                                                oIdx
                                                                            ];
                                                                        const match =
                                                                            sVal ===
                                                                            cVal;
                                                                        if (
                                                                            match
                                                                        )
                                                                            matchCount++;
                                                                        return {
                                                                            text: opt,
                                                                            correct:
                                                                                match,
                                                                            studentVal:
                                                                                sVal,
                                                                            correctVal:
                                                                                cVal,
                                                                        };
                                                                    },
                                                                );

                                                            isQCorrect =
                                                                matchCount ===
                                                                4;
                                                            isQPartial =
                                                                matchCount >
                                                                    0 &&
                                                                matchCount < 4;
                                                        } else if (
                                                            q.type ===
                                                            "short_answer"
                                                        ) {
                                                            const cKey = (
                                                                q.shortAnswerKey ||
                                                                ""
                                                            )
                                                                .trim()
                                                                .toLowerCase();
                                                            const sKey = String(
                                                                chosen || "",
                                                            )
                                                                .trim()
                                                                .toLowerCase();
                                                            isQCorrect =
                                                                cKey &&
                                                                sKey === cKey;
                                                        }

                                                        // Determine card border accent style
                                                        let cardAccentClass =
                                                            "border-l-4 border-l-rose-500";
                                                        let statusBadgeClass =
                                                            "bg-rose-50 text-rose-700 border-rose-200";
                                                        let statusText = "Sai";

                                                        if (isQCorrect) {
                                                            cardAccentClass =
                                                                "border-l-4 border-l-emerald-500";
                                                            statusBadgeClass =
                                                                "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                            statusText = "Đúng";
                                                        } else if (isQPartial) {
                                                            cardAccentClass =
                                                                "border-l-4 border-l-amber-500";
                                                            statusBadgeClass =
                                                                "bg-amber-50 text-amber-700 border-amber-200";
                                                            statusText =
                                                                "Đúng một phần";
                                                        }

                                                        const displayQuestionText =
                                                            q.type ===
                                                            "true_false"
                                                                ? cleanTrueFalseQuestionText(
                                                                      q.text,
                                                                  )
                                                                : q.text;

                                                        return (
                                                            <div
                                                                key={q.id}
                                                                className={`bg-white border-y border-r border-slate-200 ${cardAccentClass} rounded-xl p-5 space-y-4 shadow-3xs`}
                                                            >
                                                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                                                                            Câu{" "}
                                                                            {qIndex +
                                                                                1}
                                                                        </span>
                                                                        <span
                                                                            className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                                                                q.type ===
                                                                                "true_false"
                                                                                    ? "bg-amber-50 text-amber-800 border-amber-250"
                                                                                    : q.type ===
                                                                                        "short_answer"
                                                                                      ? "bg-purple-50 text-purple-800 border-purple-250"
                                                                                      : "bg-sky-50 text-sky-800 border-sky-250"
                                                                            }`}
                                                                        >
                                                                            {q.type ===
                                                                            "true_false"
                                                                                ? "Đúng / Sai"
                                                                                : q.type ===
                                                                                    "short_answer"
                                                                                  ? "Điền đáp án"
                                                                                  : "Trắc nghiệm"}
                                                                        </span>
                                                                    </div>
                                                                    <span
                                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeClass}`}
                                                                    >
                                                                        {
                                                                            statusText
                                                                        }
                                                                    </span>
                                                                </div>

                                                                <div
                                                                    className="text-[13px] font-semibold text-slate-800 leading-relaxed overflow-x-auto [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: renderMathHtml(
                                                                            displayQuestionText,
                                                                        ),
                                                                    }}
                                                                />

                                                                {/* Options rendering */}
                                                                {(!q.type ||
                                                                    q.type ===
                                                                        "single_choice") && (
                                                                    <div className="space-y-2.5">
                                                                        {q.options.map(
                                                                            (
                                                                                opt,
                                                                                oIdx,
                                                                            ) => {
                                                                                const isChosen =
                                                                                    chosen ===
                                                                                    oIdx;
                                                                                const isCorrectOpt =
                                                                                    q.correctAnswerIndex ===
                                                                                    oIdx;
                                                                                const cleanedOpt =
                                                                                    opt.replace(
                                                                                        /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                        "",
                                                                                    );

                                                                                let cardStyle =
                                                                                    "border-slate-200 text-slate-700";
                                                                                let badge =
                                                                                    null;

                                                                                if (
                                                                                    isCorrectOpt
                                                                                ) {
                                                                                    cardStyle =
                                                                                        "border-emerald-300 bg-emerald-50/20 text-emerald-800";
                                                                                    badge =
                                                                                        (
                                                                                            <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                Đáp
                                                                                                án
                                                                                                đúng
                                                                                            </span>
                                                                                        );
                                                                                } else if (
                                                                                    isChosen &&
                                                                                    !isCorrectOpt
                                                                                ) {
                                                                                    cardStyle =
                                                                                        "border-rose-300 bg-rose-50/20 text-rose-800";
                                                                                    badge =
                                                                                        (
                                                                                            <span className="text-[9px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                Lựa
                                                                                                chọn
                                                                                                của
                                                                                                bạn
                                                                                            </span>
                                                                                        );
                                                                                } else if (
                                                                                    isChosen
                                                                                ) {
                                                                                    badge =
                                                                                        (
                                                                                            <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded ml-auto">
                                                                                                Lựa
                                                                                                chọn
                                                                                                của
                                                                                                bạn
                                                                                            </span>
                                                                                        );
                                                                                }

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            oIdx
                                                                                        }
                                                                                        className={`flex items-center gap-3 p-3 border rounded-lg text-xs font-medium ${cardStyle}`}
                                                                                    >
                                                                                        <span
                                                                                            className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                                                                isCorrectOpt
                                                                                                    ? "bg-emerald-500 text-white"
                                                                                                    : isChosen
                                                                                                      ? "bg-rose-50 text-white"
                                                                                                      : "bg-slate-100 text-slate-500"
                                                                                            }`}
                                                                                        >
                                                                                            {String.fromCharCode(
                                                                                                65 +
                                                                                                    oIdx,
                                                                                            )}
                                                                                        </span>
                                                                                        <span
                                                                                            className="[&_img]:mx-auto [&_img]:block [&_img]:my-2"
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: renderMathHtml(
                                                                                                    cleanedOpt,
                                                                                                ),
                                                                                            }}
                                                                                        />
                                                                                        {
                                                                                            badge
                                                                                        }
                                                                                    </div>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {q.type ===
                                                                    "true_false" && (
                                                                    <div className="space-y-2.5">
                                                                        {tfStatusList.map(
                                                                            (
                                                                                item,
                                                                                oIdx,
                                                                            ) => {
                                                                                const sText =
                                                                                    item.studentVal ===
                                                                                    null
                                                                                        ? "Chưa chọn"
                                                                                        : item.studentVal
                                                                                          ? "Đúng"
                                                                                          : "Sai";
                                                                                const cText =
                                                                                    item.correctVal
                                                                                        ? "Đúng"
                                                                                        : "Sai";
                                                                                const cleanedOpt =
                                                                                    item.text.replace(
                                                                                        /^\s*[a-f][\)\.\:\-]\s*/i,
                                                                                        "",
                                                                                    );

                                                                                return (
                                                                                    <div
                                                                                        key={
                                                                                            oIdx
                                                                                        }
                                                                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs"
                                                                                    >
                                                                                        <div className="font-medium text-slate-800 flex gap-2 [&_img]:mx-auto [&_img]:block [&_img]:my-2">
                                                                                            <span className="font-extrabold text-slate-500">
                                                                                                {String.fromCharCode(
                                                                                                    97 +
                                                                                                        oIdx,
                                                                                                )}
                                                                                                )
                                                                                            </span>
                                                                                            <span
                                                                                                dangerouslySetInnerHTML={{
                                                                                                    __html: renderMathHtml(
                                                                                                        cleanedOpt,
                                                                                                    ),
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                                                                            <span
                                                                                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                                                                    item.studentVal ===
                                                                                                    null
                                                                                                        ? "bg-slate-200 text-slate-600 border border-slate-300"
                                                                                                        : item.correct
                                                                                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                                                                          : "bg-rose-100 text-rose-800 border border-rose-255"
                                                                                                }`}
                                                                                            >
                                                                                                Bạn
                                                                                                chọn:{" "}
                                                                                                {
                                                                                                    sText
                                                                                                }
                                                                                            </span>
                                                                                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-255">
                                                                                                Đáp
                                                                                                án:{" "}
                                                                                                {
                                                                                                    cText
                                                                                                }
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {q.type ===
                                                                    "short_answer" && (
                                                                    <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-lg flex flex-wrap gap-4 text-xs font-semibold">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-slate-500">
                                                                                Đáp
                                                                                án
                                                                                của
                                                                                bạn:
                                                                            </span>
                                                                            <span
                                                                                className={`px-2.5 py-0.5 rounded font-extrabold ${
                                                                                    isQCorrect
                                                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-255"
                                                                                        : "bg-rose-100 text-rose-800 border border-rose-255"
                                                                                }`}
                                                                            >
                                                                                {chosen !==
                                                                                    undefined &&
                                                                                chosen !==
                                                                                    ""
                                                                                    ? String(
                                                                                          chosen,
                                                                                      )
                                                                                    : "(Để trống)"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                                                            <span className="text-slate-500">
                                                                                Đáp
                                                                                án
                                                                                đúng:
                                                                            </span>
                                                                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-255 px-2.5 py-0.5 rounded font-extrabold">
                                                                                {
                                                                                    q.shortAnswerKey
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {q.explanation && (
                                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2 mt-4">
                                                                        <div className="flex items-center gap-1.5 text-[#2B5467] font-extrabold">
                                                                            <BookOpen className="w-4 h-4 text-[#2B5467]" />
                                                                            <span>
                                                                                Lời
                                                                                giải
                                                                                chi
                                                                                tiết:
                                                                            </span>
                                                                        </div>
                                                                        <div
                                                                            className="text-slate-700 overflow-x-auto leading-relaxed pl-5 border-l-2 border-[#2B5467]/30 [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: renderMathHtml(
                                                                                    q.explanation,
                                                                                ),
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="pb-4 border-b border-slate-100">
                                    <h2 className="text-lg font-bold text-slate-800">
                                        Thống Kê Học Sinh
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Quan sát lịch sử thi thử, điểm số và
                                        thời gian làm bài của từng học sinh.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                    {/* Left Column: List of Students */}
                                    <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-3xs h-[calc(100vh-220px)] flex flex-col min-h-0">
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                            <input
                                                type="text"
                                                placeholder="Tìm học sinh..."
                                                value={statsStudentQuery}
                                                onChange={(e) =>
                                                    setStatsStudentQuery(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-400 focus:bg-white"
                                            />
                                        </div>

                                        {/* Student list container */}
                                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 mt-3">
                                            {(() => {
                                                const studentsList =
                                                    userProfiles.filter(
                                                        (u) =>
                                                            u.role ===
                                                                "student" &&
                                                            (u.name
                                                                .toLowerCase()
                                                                .includes(
                                                                    statsStudentQuery.toLowerCase(),
                                                                ) ||
                                                                u.username
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        statsStudentQuery.toLowerCase(),
                                                                    )),
                                                    );

                                                if (studentsList.length === 0) {
                                                    return (
                                                        <p className="text-xs text-slate-400 italic text-center py-6">
                                                            Không tìm thấy học
                                                            sinh nào.
                                                        </p>
                                                    );
                                                }

                                                return studentsList.map(
                                                    (student) => {
                                                        const isSelected =
                                                            selectedStatsStudentId ===
                                                            student.id;
                                                        const studentSubs =
                                                            submissions.filter(
                                                                (s) =>
                                                                    s.studentId ===
                                                                    student.id,
                                                            );

                                                        return (
                                                            <button
                                                                key={student.id}
                                                                onClick={() =>
                                                                    setSelectedStatsStudentId(
                                                                        student.id,
                                                                    )
                                                                }
                                                                className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                                                                    isSelected
                                                                        ? "bg-slate-900 border-slate-900 text-white"
                                                                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                                                }`}
                                                            >
                                                                <div
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                                        isSelected
                                                                            ? "bg-slate-800 text-white border border-slate-700"
                                                                            : "bg-brand-50 text-brand-600"
                                                                    }`}
                                                                >
                                                                    {student.name
                                                                        ? student.name
                                                                              .charAt(
                                                                                  0,
                                                                              )
                                                                              .toUpperCase()
                                                                        : "U"}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div
                                                                        className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}
                                                                    >
                                                                        {
                                                                            student.name
                                                                        }
                                                                    </div>
                                                                    <div
                                                                        className={`text-[10px] truncate ${isSelected ? "text-slate-400" : "text-slate-400"}`}
                                                                    >
                                                                        @
                                                                        {
                                                                            student.username
                                                                        }{" "}
                                                                        •{" "}
                                                                        {
                                                                            studentSubs.length
                                                                        }{" "}
                                                                        bài
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    },
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Right Column: Detailed student analytics */}
                                    <div className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-3xs h-[calc(100vh-220px)] overflow-y-auto">
                                        {(() => {
                                            if (!selectedStatsStudentId) {
                                                return (
                                                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 italic space-y-2 py-12">
                                                        <Users className="w-8 h-8 text-slate-300" />
                                                        <p className="text-xs">
                                                            Hãy chọn một học
                                                            sinh từ danh sách
                                                            bên trái để quan sát
                                                            kết quả chi tiết.
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            const student = userProfiles.find(
                                                (u) =>
                                                    u.id ===
                                                    selectedStatsStudentId,
                                            );
                                            if (!student) {
                                                return (
                                                    <p className="text-xs text-slate-400 italic">
                                                        Không tìm thấy thông tin
                                                        học sinh.
                                                    </p>
                                                );
                                            }

                                            const studentSubs = submissions
                                                .filter(
                                                    (s) =>
                                                        s.studentId ===
                                                        student.id,
                                                )
                                                .sort(
                                                    (a, b) =>
                                                        new Date(
                                                            b.submittedAt,
                                                        ).getTime() -
                                                        new Date(
                                                            a.submittedAt,
                                                        ).getTime(),
                                                );

                                            const completedCount =
                                                studentSubs.length;
                                            const avgScore =
                                                completedCount > 0
                                                    ? (
                                                          studentSubs.reduce(
                                                              (acc, curr) =>
                                                                  acc +
                                                                  curr.score,
                                                              0,
                                                          ) / completedCount
                                                      ).toFixed(1)
                                                    : "0.0";

                                            return (
                                                <div className="space-y-6">
                                                    {/* Student Header */}
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                                                                {student.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-900">
                                                                    {
                                                                        student.name
                                                                    }
                                                                </h3>
                                                                <p className="text-[11px] text-slate-455">
                                                                    Tài khoản: @
                                                                    {
                                                                        student.username
                                                                    }
                                                                </p>
                                                                {student.plan && (
                                                                    <span
                                                                        className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 border uppercase tracking-wider ${
                                                                            student.plan ===
                                                                            "vip"
                                                                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                                                                : student.plan ===
                                                                                    "basic"
                                                                                  ? "bg-sky-100 text-sky-800 border-sky-200"
                                                                                  : "bg-slate-100 text-slate-600 border-slate-200"
                                                                        }`}
                                                                    >
                                                                        {
                                                                            student.plan
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="text-center bg-white border border-slate-100 p-2.5 rounded-lg min-w-[70px] shadow-3xs">
                                                                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                                                                    Lượt làm
                                                                </span>
                                                                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                                                                    {
                                                                        completedCount
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="text-center bg-white border border-slate-100 p-2.5 rounded-lg min-w-[70px] shadow-3xs">
                                                                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                                                                    Điểm TB
                                                                </span>
                                                                <span className="text-sm font-extrabold text-[#2B5467] mt-0.5 block">
                                                                    {avgScore}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Submission list */}
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold text-slate-800">
                                                            Nhật ký bài thi đã
                                                            làm
                                                        </h4>
                                                        <div className="space-y-2.5">
                                                            {studentSubs.map(
                                                                (sub) => {
                                                                    let scoreColor =
                                                                        "bg-rose-50 text-rose-700 border border-rose-200";
                                                                    if (
                                                                        sub.score >=
                                                                        8
                                                                    ) {
                                                                        scoreColor =
                                                                            "bg-emerald-50 text-emerald-700 border border-emerald-200";
                                                                    } else if (
                                                                        sub.score >=
                                                                        5
                                                                    ) {
                                                                        scoreColor =
                                                                            "bg-amber-50 text-amber-700 border border-amber-200";
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                sub.id
                                                                            }
                                                                            className="border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:border-slate-350 shadow-3xs bg-white"
                                                                        >
                                                                            <div className="space-y-1">
                                                                                <div className="text-xs font-bold text-slate-850 truncate max-w-sm sm:max-w-md">
                                                                                    {
                                                                                        sub.quizTitle
                                                                                    }
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-450 font-medium">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock className="w-3 h-3 text-slate-450" />
                                                                                        {
                                                                                            sub.submittedAt
                                                                                        }
                                                                                    </span>
                                                                                    {sub.timeSpent !==
                                                                                        undefined && (
                                                                                        <span className="flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3 text-slate-450" />
                                                                                            Thời
                                                                                            gian:{" "}
                                                                                            {formatTime(
                                                                                                sub.timeSpent,
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                                                                                <span
                                                                                    className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${scoreColor}`}
                                                                                >
                                                                                    {
                                                                                        sub.score
                                                                                    }{" "}
                                                                                    /
                                                                                    10
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setAdminReviewSubmission(
                                                                                            sub,
                                                                                        )
                                                                                    }
                                                                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-all active:scale-[0.98] cursor-pointer"
                                                                                >
                                                                                    Xem
                                                                                    chi
                                                                                    tiết
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                },
                                                            )}

                                                            {completedCount ===
                                                                0 && (
                                                                <p className="text-xs text-slate-400 italic text-center py-6">
                                                                    Học sinh này
                                                                    chưa thực
                                                                    hiện bài thi
                                                                    nào.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                    </>
                )}
                {editingQuiz && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
                            <h2 className="text-lg font-bold mb-4">
                                Sửa Đề Thi
                            </h2>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    placeholder="Tiêu đề"
                                    className="w-full border border-slate-300 rounded p-2"
                                />
                                <textarea
                                    value={editDescription}
                                    onChange={(e) =>
                                        setEditDescription(e.target.value)
                                    }
                                    placeholder="Mô tả"
                                    className="w-full border border-slate-300 rounded p-2"
                                />
                                <label className="inline-flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={editIsPublic}
                                        onChange={(e) =>
                                            setEditIsPublic(e.target.checked)
                                        }
                                        className="form-checkbox"
                                    />
                                    <span>Công khai</span>
                                </label>
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-2 bg-gray-200 rounded"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={saveEditQuiz}
                                        className="px-4 py-2 bg-brand-600 text-white rounded"
                                    >
                                        Lưu
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

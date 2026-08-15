import React, { useState, useEffect } from "react";
import { Quiz, Submission, Question, QuestionType } from "../types";
import { updateQuiz, deleteQuiz } from "../lib/supabaseService";
import { renderMathHtml } from "../lib/math";
import {
    Search,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    BookOpen,
    Clock,
    X,
    Plus,
    ArrowUp,
    ArrowDown,
    CheckCircle,
} from "lucide-react";

const GRADE_CATEGORIES: Record<string, string[]> = {
    "8": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "9": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi vào 10"],
    "10": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "11": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "12": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi thử"],
};

interface AdminQuizzesTabProps {
    quizzes: Quiz[];
    submissions: Submission[];
    onDeleteQuiz: (quizId: string) => void;
    onUpdateQuiz: (updatedQuiz: Quiz) => void;
}

export default function AdminQuizzesTab({
    quizzes,
    submissions,
    onDeleteQuiz,
    onUpdateQuiz,
}: AdminQuizzesTabProps) {
    // Quiz list search, filter, sorting, and pagination states
    const [quizSearchQuery, setQuizSearchQuery] = useState("");
    const [quizFilterSubject, setQuizFilterSubject] = useState<string>("all");
    const [quizFilterGrade, setQuizFilterGrade] = useState<string>("all");
    const [quizFilterVisibility, setQuizFilterVisibility] = useState<"all" | "public" | "private">("all");
    const [quizSortBy, setQuizSortBy] = useState<"newest" | "oldest" | "title" | "questions" | "duration">("newest");
    const [quizPage, setQuizPage] = useState(1);
    const [quizPageSize] = useState(10);

    // Editing quiz state
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editIsPublic, setEditIsPublic] = useState<boolean>(true);
    const [editSubject, setEditSubject] = useState("");
    const [editGrade, setEditGrade] = useState("");
    const [editDuration, setEditDuration] = useState(45);
    const [editQuestions, setEditQuestions] = useState<Question[]>([]);
    const [editScoringMode, setEditScoringMode] = useState<"EQUAL_WEIGHT" | "SECTION_BASED" | "THPT_QG">("EQUAL_WEIGHT");
    const [editSectionPoints, setEditSectionPoints] = useState<Record<string, number>>({});
    const [editDurationOption, setEditDurationOption] = useState<string>("45");

    // Quiz visibility toggle state & helper
    const [togglingQuizId, setTogglingQuizId] = useState<string | null>(null);

    // Question player state inside edit modal
    const [editModalTab, setEditModalTab] = useState<"questions" | "settings">("questions");
    const [editCurrentQuestionIdx, setEditCurrentQuestionIdx] = useState(0);
    const [editExpandedHtmlQuestions, setEditExpandedHtmlQuestions] = useState<Record<string, boolean>>({});
    const [editFontSize, setEditFontSize] = useState(14);

    // Helper functions
    const cleanTrueFalseQuestionText = (html: string) => {
        if (!html) return "";
        let clean = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match) => {
            if (match.includes("Khẳng định") || match.includes("Đúng") || match.includes("Sai")) {
                return "";
            }
            return match;
        });

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

    const handleToggleQuizVisibility = async (quizId: string, makePublic: boolean) => {
        const quizObj = quizzes.find((q) => q.id === quizId);
        if (!quizObj) return;
        setTogglingQuizId(quizId);
        try {
            await updateQuiz(quizId, { isPublic: makePublic });
            onUpdateQuiz({
                ...quizObj,
                isPublic: makePublic,
            });
        } catch (err: any) {
            alert(`Lỗi khi cập nhật trạng thái hiển thị: ${err.message}`);
        } finally {
            setTogglingQuizId(null);
        }
    };

    const startEditQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz);
        setEditTitle(quiz.title);
        setEditDescription(quiz.description);
        setEditIsPublic(quiz.isPublic !== undefined ? quiz.isPublic : true);
        setEditSubject(quiz.subject || "Toán Học");
        setEditGrade(quiz.grade || "12");
        setEditDuration(quiz.duration || 45);
        setEditQuestions(quiz.questions || []);
        setEditModalTab("questions");
        setEditCurrentQuestionIdx(0);
        setEditExpandedHtmlQuestions({});
        setEditFontSize(14);

        const durationStr = quiz.duration ? String(quiz.duration) : "45";
        if (["15", "30", "45", "60", "90"].includes(durationStr)) {
            setEditDurationOption(durationStr);
        } else {
            setEditDurationOption("other");
        }

        const scoringType = quiz.scoringConfig?.type || "EQUAL_WEIGHT";
        setEditScoringMode(scoringType);

        const secPts: Record<string, number> = {};
        if (scoringType === "SECTION_BASED" && quiz.scoringConfig?.sections) {
            quiz.scoringConfig.sections.forEach((sec) => {
                secPts[sec.section_id] = sec.total_points;
            });
        }
        setEditSectionPoints(secPts);
    };

    const handleUpdateQuestionText = (index: number, text: string) => {
        const updated = [...editQuestions];
        updated[index] = { ...updated[index], text };
        setEditQuestions(updated);
    };

    const handleUpdateOption = (qIndex: number, oIndex: number, val: string) => {
        const updated = [...editQuestions];
        const opts = [...(updated[qIndex].options || [])];
        while (opts.length <= oIndex) {
            opts.push("");
        }
        opts[oIndex] = val;
        updated[qIndex] = { ...updated[qIndex], options: opts };
        setEditQuestions(updated);
    };

    const handleUpdateCorrectAnswer = (qIndex: number, ansIdx: number) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], correctAnswerIndex: ansIdx };
        setEditQuestions(updated);
    };

    const handleToggleTF = (qIndex: number, oIndex: number, val: boolean) => {
        const updated = [...editQuestions];
        if (!updated[qIndex].correctAnswers) {
            updated[qIndex].correctAnswers = [false, false, false, false];
        }
        const ans = [...updated[qIndex].correctAnswers!];
        ans[oIndex] = val;
        updated[qIndex] = { ...updated[qIndex], correctAnswers: ans };
        setEditQuestions(updated);
    };

    const handleUpdateShortAnswer = (qIndex: number, key: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], shortAnswerKey: key };
        setEditQuestions(updated);
    };

    const handleUpdateExplanation = (qIndex: number, explanation: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], explanation };
        setEditQuestions(updated);
    };

    const handleUpdateSectionTitle = (qIndex: number, sectionTitle: string) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], sectionTitle };
        setEditQuestions(updated);
    };

    const handleUpdateQuestionPoints = (qIndex: number, points: number) => {
        const updated = [...editQuestions];
        updated[qIndex] = { ...updated[qIndex], points: Number(points) };
        setEditQuestions(updated);
    };

    const handleUpdateQuestionType = (qIndex: number, type: QuestionType) => {
        const updated = [...editQuestions];
        const currentQ = updated[qIndex];

        let opts = currentQ.options || [];
        if (type === "single_choice" && opts.length !== 4) {
            opts = ["Phương án A", "Phương án B", "Phương án C", "Phương án D"];
        } else if (type === "true_false" && opts.length !== 4) {
            opts = ["Phát biểu A", "Phát biểu B", "Phát biểu C", "Phát biểu D"];
        } else if (type === "short_answer") {
            opts = [];
        }

        updated[qIndex] = {
            ...currentQ,
            type,
            options: opts,
            correctAnswerIndex: type === "single_choice" ? 0 : currentQ.correctAnswerIndex || 0,
            correctAnswers: type === "true_false" ? currentQ.correctAnswers || [false, false, false, false] : undefined,
            shortAnswerKey: type === "short_answer" ? currentQ.shortAnswerKey || "" : undefined,
        };
        setEditQuestions(updated);
    };

    const handleAddNewQuestionToEdit = () => {
        const newQ: Question = {
            id: "question_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            text: "Nhập nội dung câu hỏi mới...",
            options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
            correctAnswerIndex: 0,
            type: "single_choice",
            sectionTitle: "Phần I",
            points: 0.25,
        };
        const updated = [...editQuestions, newQ];
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(updated.length - 1);
    };

    const handleDeleteQuestionFromEdit = (index: number) => {
        const updated = editQuestions.filter((_, idx) => idx !== index);
        setEditQuestions(updated);
        setEditCurrentQuestionIdx((prev) => Math.max(0, Math.min(updated.length - 2, prev)));
    };

    const handleMoveQuestionUp = (index: number) => {
        if (index === 0) return;
        const updated = [...editQuestions];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(index - 1);
    };

    const handleMoveQuestionDown = (index: number) => {
        if (index === editQuestions.length - 1) return;
        const updated = [...editQuestions];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setEditQuestions(updated);
        setEditCurrentQuestionIdx(index + 1);
    };

    const saveEditQuiz = async () => {
        if (!editingQuiz) return;
        if (!editTitle.trim() || !editSubject.trim()) {
            alert("Vui lòng nhập tên đề thi và môn học.");
            return;
        }

        let scoringConfigObj: any = { type: editScoringMode };
        if (editScoringMode === "SECTION_BASED") {
            scoringConfigObj.sections = Object.keys(editSectionPoints).map((sec) => ({
                section_id: sec,
                total_points: editSectionPoints[sec] || 0,
            }));
        } else if (editScoringMode === "THPT_QG") {
            scoringConfigObj.sections = [
                { section_id: "Phần I", total_points: 3.0 },
                { section_id: "Phần II", total_points: 4.0 },
                { section_id: "Phần III", total_points: 3.0 },
            ];
            scoringConfigObj.true_false_rules = {
                "1_correct": 0.1,
                "2_correct": 0.25,
                "3_correct": 0.5,
                "4_correct": 1.0,
            };
        }

        const updated: Partial<Quiz> = {
            title: editTitle.trim(),
            description: editDescription.trim() || "Bài kiểm tra chất lượng cao HiTrang",
            subject: editSubject,
            grade: editGrade,
            duration: Number(editDuration),
            questions: editQuestions,
            isPublic: editIsPublic,
            scoringConfig: scoringConfigObj,
        };

        try {
            await updateQuiz(editingQuiz.id, updated);
            onUpdateQuiz({ ...editingQuiz, ...updated } as Quiz);
            setEditingQuiz(null);
        } catch (err: any) {
            alert(`Lỗi khi cập nhật đề thi: ${err.message}`);
        }
    };

    const handleDeleteQuiz = async (quizId: string) => {
        try {
            await deleteQuiz(quizId);
            onDeleteQuiz(quizId);
            alert("Đã xóa đề thi thành công!");
        } catch (err: any) {
            alert(`Lỗi khi xóa đề thi: ${err.message}`);
        }
    };

    // Filter and Sort Quizzes
    const filteredQuizzes = quizzes
        .filter((q) => {
            const matchesSearch =
                q.title.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                q.subject.toLowerCase().includes(quizSearchQuery.toLowerCase());
            const matchesSubject = quizFilterSubject === "all" || q.subject === quizFilterSubject;
            const matchesGrade = quizFilterGrade === "all" || q.grade === quizFilterGrade;
            const matchesVis =
                quizFilterVisibility === "all" ||
                (quizFilterVisibility === "public" && q.isPublic !== false) ||
                (quizFilterVisibility === "private" && q.isPublic === false);
            return matchesSearch && matchesSubject && matchesGrade && matchesVis;
        })
        .sort((a, b) => {
            if (quizSortBy === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            if (quizSortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            if (quizSortBy === "title") return a.title.localeCompare(b.title);
            if (quizSortBy === "questions") return b.questions.length - a.questions.length;
            if (quizSortBy === "duration") return b.duration - a.duration;
            return 0;
        });

    const quizTotalPages = Math.ceil(filteredQuizzes.length / quizPageSize);
    const paginatedQuizzes = filteredQuizzes.slice((quizPage - 1) * quizPageSize, quizPage * quizPageSize);

    // Sync default subject when editing grade changes
    useEffect(() => {
        if (editingQuiz) {
            const cats = GRADE_CATEGORIES[editGrade] || [];
            if (cats.length > 0 && !cats.includes(editSubject)) {
                setEditSubject(cats[0]);
            }
        }
    }, [editGrade, editingQuiz]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Danh Sách Đề Thi</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Xem danh sách, tìm kiếm, lọc và quản lý trạng thái công khai/riêng tư các đề thi hiện có.
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full xl:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Tìm tiêu đề, môn học..."
                        value={quizSearchQuery}
                        onChange={(e) => {
                            setQuizSearchQuery(e.target.value);
                            setQuizPage(1);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <select
                        value={quizFilterSubject}
                        onChange={(e) => {
                            setQuizFilterSubject(e.target.value);
                            setQuizPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 border-0 rounded-lg text-xs text-slate-600 focus:outline-none cursor-pointer"
                    >
                        <option value="all">Tất cả môn học</option>
                        <option value="Toán Học">Toán Học</option>
                        <option value="Vật Lý">Vật Lý</option>
                        <option value="Hóa Học">Hóa Học</option>
                        <option value="Tiếng Anh">Tiếng Anh</option>
                    </select>

                    <select
                        value={quizFilterGrade}
                        onChange={(e) => {
                            setQuizFilterGrade(e.target.value);
                            setQuizPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 border-0 rounded-lg text-xs text-slate-600 focus:outline-none cursor-pointer"
                    >
                        <option value="all">Tất cả khối lớp</option>
                        <option value="8">Lớp 8</option>
                        <option value="9">Lớp 9</option>
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                    </select>

                    <select
                        value={quizFilterVisibility}
                        onChange={(e) => {
                            setQuizFilterVisibility(e.target.value as any);
                            setQuizPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 border-0 rounded-lg text-xs text-slate-600 focus:outline-none cursor-pointer"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="public">Công khai</option>
                        <option value="private">Riêng tư</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-450 font-bold whitespace-nowrap">Sắp xếp:</span>
                        <select
                            value={quizSortBy}
                            onChange={(e) => {
                                setQuizSortBy(e.target.value as any);
                                setQuizPage(1);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 border-0 rounded-lg text-xs text-slate-600 focus:outline-none cursor-pointer"
                        >
                            <option value="newest">Mới đăng trước</option>
                            <option value="oldest">Cũ đăng trước</option>
                            <option value="title">Tên A-Z</option>
                            <option value="questions">Số câu hỏi giảm dần</option>
                            <option value="duration">Thời gian giảm dần</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Quiz List Table */}
            <div className="bg-bg-card rounded-lg overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30">
                            <th className="py-2.5 px-4 w-1/3">Tiêu đề đề thi</th>
                            <th className="py-2.5 px-4">Môn Học</th>
                            <th className="py-2.5 px-4 text-center">Khối Lớp</th>
                            <th className="py-2.5 px-4 text-center">Số câu hỏi</th>
                            <th className="py-2.5 px-4 text-center">Thời gian</th>
                            <th className="py-2.5 px-4 text-center">Ngày đăng</th>
                            <th className="py-2.5 px-4 text-center">Hiển thị</th>
                            <th className="py-2.5 px-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 text-xs text-slate-655">
                        {paginatedQuizzes.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-8 text-center text-slate-450 font-bold">
                                    Không tìm thấy đề thi nào.
                                </td>
                            </tr>
                        ) : (
                            paginatedQuizzes.map((q) => (
                                <tr key={q.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="py-3 px-4 font-bold text-slate-800 max-w-xs truncate">
                                        {q.title}
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 font-semibold">{q.subject}</td>
                                    <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                                        Lớp {q.grade || "10"}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-[#3B6D85]">
                                        {q.questions.length} câu
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                                        {q.duration} phút
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                                        {q.createdAt
                                            ? (() => {
                                                  const dateParts = q.createdAt.split("-");
                                                  if (dateParts.length === 3) {
                                                      return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                  }
                                                  return q.createdAt;
                                              })()
                                            : "-"}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <select
                                            disabled={togglingQuizId === q.id}
                                            value={q.isPublic !== false ? "public" : "private"}
                                            onChange={(e) =>
                                                handleToggleQuizVisibility(q.id, e.target.value === "public")
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-0 focus:outline-none cursor-pointer transition-colors ${
                                                q.isPublic !== false
                                                    ? "bg-emerald-50 text-emerald-800"
                                                    : "bg-rose-50 text-rose-800"
                                            }`}
                                        >
                                            <option value="public">Công khai</option>
                                            <option value="private">Riêng tư</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => startEditQuiz(q)}
                                                className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                                title="Sửa"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Bạn chắc chắn muốn xóa đề thi: ${q.title}?`)) {
                                                        handleDeleteQuiz(q.id);
                                                    }
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                                title="Xóa"
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

            {/* Pagination */}
            {quizTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border-primary/60">
                    <span className="text-[11px] text-slate-400 font-semibold">
                        Trang {quizPage} / {quizTotalPages} (Tổng số {filteredQuizzes.length} đề thi)
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={quizPage === 1}
                            onClick={() => setQuizPage((prev) => prev - 1)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            disabled={quizPage === quizTotalPages}
                            onClick={() => setQuizPage((prev) => prev + 1)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* EDIT QUIZ MODAL */}
            {editingQuiz && (
                <div className="fixed inset-0 bg-slate-955/20 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                    <div
                        className={`bg-bg-card rounded-2xl w-full shadow-xl overflow-hidden border-0 flex flex-col max-h-[90vh] transition-all duration-300 ${
                            editModalTab === "questions" ? "max-w-5xl" : "max-w-lg"
                        }`}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4.5 border-b border-border-primary/60 flex items-center justify-between bg-slate-50/30 flex-shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                    {editModalTab === "questions" ? (
                                        <>
                                            <BookOpen className="w-5 h-5 text-brand-500" />
                                            <span>Xem Trước & Chỉnh Sửa Câu Hỏi</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 text-brand-500" />
                                            <span>Cấu Hình Chi Tiết Đề Thi</span>
                                        </>
                                    )}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {editModalTab === "questions"
                                        ? `Đề thi có ${editQuestions.length} câu hỏi. Dùng mũi tên Trái/Phải để chuyển câu nhanh.`
                                        : "Cấu hình tên đề thi, khối lớp, môn học, thời gian và barem điểm số."}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingQuiz(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        {editModalTab === "questions" ? (
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                                {/* Left Side: Question List Sidebar */}
                                <div className="w-full lg:w-64 border-r border-border-primary/60 flex flex-col bg-slate-50/10 flex-shrink-0">
                                    <div className="p-3.5 border-b border-border-primary/60 flex items-center justify-between bg-slate-50/20">
                                        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                            Danh sách câu hỏi
                                        </span>
                                        <button
                                            onClick={handleAddNewQuestionToEdit}
                                            className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                        >
                                            + Thêm câu
                                        </button>
                                    </div>

                                    {/* Question navigation sidebar list */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[25vh] lg:max-h-none">
                                        {editQuestions.map((q, qIndex) => {
                                            const isSelected = editCurrentQuestionIdx === qIndex;
                                            const displayTxt = cleanTrueFalseQuestionText(q.text)
                                                .replace(/<[^>]*>/g, "")
                                                .trim();

                                            return (
                                                <div
                                                    key={q.id}
                                                    className={`group w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-all select-none ${
                                                        isSelected
                                                            ? "bg-brand-50 text-brand-600"
                                                            : "text-slate-655 hover:bg-slate-100"
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() => setEditCurrentQuestionIdx(qIndex)}
                                                        className="flex-1 text-left truncate mr-2 cursor-pointer"
                                                    >
                                                        <span className="font-bold mr-1.5 text-[10px] bg-slate-200/60 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-500">
                                                            C{qIndex + 1}
                                                        </span>
                                                        <span className="text-[11px] font-medium">
                                                            {displayTxt || "(Câu hỏi trống)"}
                                                        </span>
                                                    </button>
                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                                                        <button
                                                            disabled={qIndex === 0}
                                                            onClick={() => handleMoveQuestionUp(qIndex)}
                                                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                        >
                                                            <ArrowUp className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            disabled={qIndex === editQuestions.length - 1}
                                                            onClick={() => handleMoveQuestionDown(qIndex)}
                                                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                        >
                                                            <ArrowDown className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            disabled={editQuestions.length <= 1}
                                                            onClick={() => handleDeleteQuestionFromEdit(qIndex)}
                                                            className="p-0.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Question Detail and Editor */}
                                {editQuestions.length > 0 && editCurrentQuestionIdx < editQuestions.length ? (
                                    <div className="flex-1 flex flex-col overflow-hidden bg-white">
                                        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
                                            {/* Preview header */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-3 rounded-lg border-0 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700">
                                                        Câu hỏi {editCurrentQuestionIdx + 1} / {editQuestions.length}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                        ({editQuestions[editCurrentQuestionIdx].type || "single_choice"})
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Loại câu:</span>
                                                        <select
                                                            value={editQuestions[editCurrentQuestionIdx].type || "single_choice"}
                                                            onChange={(e) =>
                                                                handleUpdateQuestionType(
                                                                    editCurrentQuestionIdx,
                                                                    e.target.value as QuestionType,
                                                                )
                                                            }
                                                            className="px-2.5 py-1 bg-slate-100 border-0 rounded-lg text-[11px] font-bold focus:outline-none cursor-pointer"
                                                        >
                                                            <option value="single_choice">Trắc nghiệm</option>
                                                            <option value="true_false">Đúng / Sai</option>
                                                            <option value="short_answer">Điền đáp án</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Phần:</span>
                                                        <input
                                                            type="text"
                                                            value={editQuestions[editCurrentQuestionIdx].sectionTitle || ""}
                                                            onChange={(e) =>
                                                                handleUpdateSectionTitle(
                                                                    editCurrentQuestionIdx,
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Phần I..."
                                                            className="w-16 px-2 py-0.5 bg-slate-100 border-0 rounded-lg text-[11px] text-center font-bold focus:outline-none"
                                                        />
                                                    </div>

                                                    {editScoringMode === "SECTION_BASED" && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Điểm:</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={editQuestions[editCurrentQuestionIdx].points || 0}
                                                                onChange={(e) =>
                                                                    handleUpdateQuestionPoints(
                                                                        editCurrentQuestionIdx,
                                                                        Number(e.target.value),
                                                                    )
                                                                }
                                                                className="w-12 px-2 py-0.5 bg-slate-100 border-0 rounded-lg text-[11px] text-center font-bold focus:outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Preview HTML */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                                        Xem trước câu hỏi (Hiển thị thực tế)
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            setEditExpandedHtmlQuestions((prev) => ({
                                                                ...prev,
                                                                [editQuestions[editCurrentQuestionIdx].id]:
                                                                    !prev[editQuestions[editCurrentQuestionIdx].id],
                                                            }))
                                                        }
                                                        className="text-[10px] text-blue-500 font-bold hover:underline cursor-pointer"
                                                    >
                                                        {editExpandedHtmlQuestions[editQuestions[editCurrentQuestionIdx].id]
                                                            ? "Thu nhỏ code HTML"
                                                            : "Chỉnh sửa HTML trực tiếp"}
                                                    </button>
                                                </div>

                                                <div
                                                    className="p-4 border-0 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 overflow-x-auto leading-relaxed select-none [&_img]:mx-auto [&_img]:block [&_img]:my-3"
                                                    style={{ fontSize: `${editFontSize}px` }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: renderMathHtml(
                                                            editQuestions[editCurrentQuestionIdx].type === "true_false"
                                                                ? cleanTrueFalseQuestionText(
                                                                      editQuestions[editCurrentQuestionIdx].text,
                                                                    )
                                                                : editQuestions[editCurrentQuestionIdx].text,
                                                        ),
                                                    }}
                                                />
                                            </div>

                                            {/* HTML text editor */}
                                            {editExpandedHtmlQuestions[editQuestions[editCurrentQuestionIdx].id] && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                                                        Mã nguồn HTML câu hỏi:
                                                    </span>
                                                    <textarea
                                                        rows={4}
                                                        value={editQuestions[editCurrentQuestionIdx].text}
                                                        onChange={(e) =>
                                                            handleUpdateQuestionText(
                                                                editCurrentQuestionIdx,
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="w-full p-3 font-mono text-[11px] bg-slate-900 text-slate-100 border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                                    />
                                                </div>
                                            )}

                                            {/* Type 1 & 2: Single Choice and True/False Options Edit */}
                                            {(editQuestions[editCurrentQuestionIdx].type === "single_choice" ||
                                                !editQuestions[editCurrentQuestionIdx].type ||
                                                editQuestions[editCurrentQuestionIdx].type === "true_false") && (
                                                <div className="space-y-3.5 border-t border-gray-100 pt-4">
                                                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                                                        Các phương án lựa chọn và đáp án đúng:
                                                    </span>
                                                    <div className="space-y-3">
                                                        {(editQuestions[editCurrentQuestionIdx].options || []).map(
                                                            (opt, oIdx) => {
                                                                const isCorrect =
                                                                    editQuestions[editCurrentQuestionIdx].type ===
                                                                    "true_false"
                                                                        ? editQuestions[editCurrentQuestionIdx]
                                                                              .correctAnswers?.[oIdx] === true
                                                                        : editQuestions[editCurrentQuestionIdx]
                                                                              .correctAnswerIndex === oIdx;

                                                                return (
                                                                    <div
                                                                        key={oIdx}
                                                                        className="flex items-start gap-3 bg-slate-100 dark:bg-slate-850 p-2.5 rounded-lg border-0"
                                                                    >
                                                                        {/* Mark Correct Trigger */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (
                                                                                    editQuestions[
                                                                                        editCurrentQuestionIdx
                                                                                    ].type === "true_false"
                                                                                ) {
                                                                                    handleToggleTF(
                                                                                        editCurrentQuestionIdx,
                                                                                        oIdx,
                                                                                        !isCorrect,
                                                                                    );
                                                                                } else {
                                                                                    handleUpdateCorrectAnswer(
                                                                                        editCurrentQuestionIdx,
                                                                                        oIdx,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-0 flex-shrink-0 cursor-pointer ${
                                                                                isCorrect
                                                                                    ? "bg-emerald-500 text-white shadow-2xs"
                                                                                    : "bg-slate-200 text-slate-500 hover:bg-slate-350"
                                                                            }`}
                                                                        >
                                                                            {editQuestions[editCurrentQuestionIdx]
                                                                                .type === "true_false" ? (
                                                                                isCorrect ? (
                                                                                    "Đ"
                                                                                ) : (
                                                                                    "S"
                                                                                )
                                                                            ) : (
                                                                                String.fromCharCode(65 + oIdx)
                                                                            )}
                                                                        </button>

                                                                        {/* Text area for option */}
                                                                        <textarea
                                                                            rows={1}
                                                                            value={opt}
                                                                            onChange={(e) =>
                                                                                handleUpdateOption(
                                                                                    editCurrentQuestionIdx,
                                                                                    oIdx,
                                                                                    e.target.value,
                                                                                )
                                                                            }
                                                                            className="flex-1 px-3 py-1 bg-white dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none resize-none"
                                                                        />
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Type 3: Short Answer Edit */}
                                            {editQuestions[editCurrentQuestionIdx].type === "short_answer" && (
                                                <div className="space-y-2 border-t border-gray-100 pt-4">
                                                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                                                        Đáp án đúng (Kết quả số / chuỗi ngắn):
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            editQuestions[editCurrentQuestionIdx].shortAnswerKey || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleUpdateShortAnswer(
                                                                editCurrentQuestionIdx,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Nhập kết quả số học hoặc ký tự viết liền không dấu..."
                                                        className="w-full max-w-sm px-3.5 py-2 bg-slate-100 border-0 rounded-lg text-xs font-semibold focus:outline-none"
                                                    />
                                                </div>
                                            )}

                                            {/* Question Explanation */}
                                            <div className="space-y-1.5 border-t border-gray-100 pt-4">
                                                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                                                    Lời giải chi tiết (Giải thích đáp án):
                                                </span>
                                                <textarea
                                                    rows={3}
                                                    value={editQuestions[editCurrentQuestionIdx].explanation || ""}
                                                    onChange={(e) =>
                                                        handleUpdateExplanation(
                                                            editCurrentQuestionIdx,
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="VD: Áp dụng công thức tính đạo hàm y' = ... từ đó tìm nghiệm x = 2..."
                                                    className="w-full p-3 bg-slate-100 border-0 rounded-lg text-xs font-semibold focus:outline-none resize-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Footer controls for Question player */}
                                        <div className="px-6 py-4.5 border-t border-border-primary/60 bg-slate-50/30 flex items-center justify-between flex-shrink-0">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    disabled={editCurrentQuestionIdx === 0}
                                                    onClick={() => setEditCurrentQuestionIdx((prev) => prev - 1)}
                                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border-0 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40 cursor-pointer"
                                                >
                                                    Câu trước
                                                </button>
                                                <button
                                                    disabled={editCurrentQuestionIdx === editQuestions.length - 1}
                                                    onClick={() => setEditCurrentQuestionIdx((prev) => prev + 1)}
                                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border-0 rounded-lg text-xs font-semibold text-slate-600 disabled:opacity-40 cursor-pointer"
                                                >
                                                    Câu sau
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => setEditModalTab("settings")}
                                                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                                            >
                                                Tiếp tục cấu hình đề thi ➜
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center p-12 text-slate-400 italic text-xs">
                                        Không có câu hỏi nào để hiển thị.
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Settings Tab Modal Body */
                            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                                {/* Title */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Tên bài kiểm tra / Đề thi: <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="VD: Kiểm tra cuối kì I Giải Tích lớp 11"
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold focus:outline-none"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Mô tả ngắn:
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="VD: Đề thi thử tự luyện tập giúp củng cố kiến thức..."
                                        className="w-full px-3.5 py-2 bg-slate-100 border-0 rounded-lg text-xs font-semibold focus:outline-none resize-none"
                                    />
                                </div>

                                {/* Subject and Grade */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Khối lớp:
                                        </label>
                                        <select
                                            value={editGrade}
                                            onChange={(e) => setEditGrade(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                            <option value="8">Lớp 8</option>
                                            <option value="9">Lớp 9</option>
                                            <option value="10">Lớp 10</option>
                                            <option value="11">Lớp 11</option>
                                            <option value="12">Lớp 12</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Phân loại (Danh mục):
                                        </label>
                                        <select
                                            value={editSubject}
                                            onChange={(e) => setEditSubject(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                            {(GRADE_CATEGORIES[editGrade] || []).map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Thời gian làm bài (Phút):
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {["15", "30", "45", "60", "90"].map((time) => (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    setEditDurationOption(time);
                                                    setEditDuration(Number(time));
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    editDurationOption === time
                                                        ? "bg-brand-50 text-brand-600"
                                                        : "bg-slate-100 border-0 text-slate-650 hover:bg-slate-200/60"
                                                }`}
                                            >
                                                {time} phút
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setEditDurationOption("other")}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                editDurationOption === "other"
                                                    ? "bg-brand-50 text-brand-600"
                                                    : "bg-slate-100 border-0 text-slate-655 hover:bg-slate-200/60"
                                            }`}
                                        >
                                            Khác...
                                        </button>
                                    </div>

                                    {editDurationOption === "other" && (
                                        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <input
                                                type="number"
                                                value={editDuration}
                                                onChange={(e) => setEditDuration(Number(e.target.value))}
                                                placeholder="Nhập số phút..."
                                                min={5}
                                                className="w-32 px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-bold focus:outline-none"
                                            />
                                            <span className="text-xs text-slate-500 font-semibold">phút</span>
                                        </div>
                                    )}
                                </div>

                                {/* Scoring Mode */}
                                <div className="border-t border-border-primary/60 pt-3.5 space-y-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                            Chế độ chấm điểm (Bareme):
                                        </label>
                                        <select
                                            value={editScoringMode}
                                            onChange={(e) => setEditScoringMode(e.target.value as any)}
                                            className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                        >
                                            <option value="EQUAL_WEIGHT">
                                                Chia đều điểm (Tổng 10đ cho tất cả câu)
                                            </option>
                                            <option value="SECTION_BASED">
                                                Chia điểm theo Phần (Tự cấu hình điểm mỗi phần)
                                            </option>
                                            <option value="THPT_QG">
                                                Thang điểm chuẩn thi THPT Quốc Gia (3 - 4 - 3)
                                            </option>
                                        </select>
                                    </div>

                                    {editScoringMode === "SECTION_BASED" && (
                                        <div className="bg-slate-50 rounded-xl p-3 border-0 space-y-3 text-xs">
                                            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                                Cấu hình điểm số cho từng phần:
                                            </div>
                                            {(() => {
                                                const sections = Array.from(
                                                    new Set(editQuestions.map((q) => q.sectionTitle).filter(Boolean)),
                                                ) as string[];
                                                if (sections.length === 0) {
                                                    return (
                                                        <p className="text-slate-450 italic text-[11px]">
                                                            Cần phân loại sectionTitle cho câu hỏi để dùng chế độ này.
                                                        </p>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-2">
                                                        {sections.map((sec) => (
                                                            <div key={sec} className="flex items-center justify-between gap-3">
                                                                <span className="font-semibold text-slate-600 truncate max-w-[200px]">
                                                                    {sec}:
                                                                </span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max="10"
                                                                        value={editSectionPoints[sec] || 0}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            setEditSectionPoints((prev) => ({
                                                                                ...prev,
                                                                                [sec]: val,
                                                                            }));
                                                                        }}
                                                                        className="w-20 px-2 py-1 bg-slate-100 border-0 rounded-lg text-xs font-bold text-center"
                                                                    />
                                                                    <span className="text-slate-400">điểm</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {editScoringMode === "THPT_QG" && (
                                        <div className="bg-brand-50/40 rounded-xl p-3 border-0 text-[11px] text-slate-655 leading-normal space-y-1.5 animate-in fade-in duration-150">
                                            <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                                                Cấu hình chuẩn THPT Quốc Gia (Bộ Giáo Dục):
                                            </div>
                                            <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                                <li>Phần I: 3.0 điểm (12 câu, mỗi câu 0.25đ)</li>
                                                <li>Phần II: 4.0 điểm (4 câu. Đúng 1 ý được 0.1đ, 2 ý 0.25đ, 3 ý 0.5đ, 4 ý 1.0đ)</li>
                                                <li>Phần III: 3.0 điểm (6 câu, mỗi câu 0.5đ)</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Public Checkbox */}
                                <div className="flex items-center gap-2.5 py-2 select-none border-t border-border-primary/60 mt-2">
                                    <input
                                        type="checkbox"
                                        id="edit-modal-checkbox-is-public"
                                        checked={editIsPublic}
                                        onChange={(e) => setEditIsPublic(e.target.checked)}
                                        className="h-4 w-4 text-brand-600 border-border-secondary rounded focus:ring-brand-500 cursor-pointer"
                                    />
                                    <label
                                        htmlFor="edit-modal-checkbox-is-public"
                                        className="text-xs font-semibold text-slate-700 cursor-pointer"
                                    >
                                        Công khai đề thi này (Học sinh có thể thi ngay)
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Modal Footer */}
                        {editModalTab === "settings" && (
                            <div className="px-6 py-4.5 border-t border-border-primary/60 bg-slate-50/30 flex items-center justify-end gap-3 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setEditModalTab("questions")}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                                >
                                    Quay lại chỉnh sửa câu hỏi
                                </button>
                                <button
                                    onClick={saveEditQuiz}
                                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Lưu thay đổi Đề thi</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

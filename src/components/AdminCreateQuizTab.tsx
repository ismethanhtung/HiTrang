import React, { useState, useCallback, useEffect } from "react";
import { Quiz } from "../types";
import { createQuiz } from "../lib/supabaseService";
import WordImporter from "./WordImporter";
import { CheckCircle2, CheckCircle } from "lucide-react";

const GRADE_CATEGORIES: Record<string, string[]> = {
    "8": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "9": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi vào 10"],
    "10": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "11": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2"],
    "12": ["Giữa kì 1", "Cuối kì 1", "Giữa kì 2", "Cuối kì 2", "Thi thử"],
};

interface AdminCreateQuizTabProps {
    onAddQuiz: (newQuiz: Quiz) => void;
    setActiveTab: (
        tab:
            | "plans"
            | "create-quiz"
            | "quizzes"
            | "stats-quizzes"
            | "stats-students",
    ) => void;
}

export default function AdminCreateQuizTab({
    onAddQuiz,
    setActiveTab,
}: AdminCreateQuizTabProps) {
    const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
    const [isSaveQuizModalOpen, setIsSaveQuizModalOpen] = useState(false);

    // Save quiz configurations
    const [quizTitle, setQuizTitle] = useState("");
    const [quizDescription, setQuizDescription] = useState("");
    const [quizSubject, setQuizSubject] = useState("Giữa kì 1");
    const [quizGrade, setQuizGrade] = useState("10");
    const [quizDuration, setQuizDuration] = useState(45);
    const [durationOption, setDurationOption] = useState<string>("45");
    const [quizIsPublic, setQuizIsPublic] = useState(false);

    // Scoring config
    const [scoringMode, setScoringMode] = useState<string>("EQUAL_WEIGHT");
    const [sectionPoints, setSectionPoints] = useState<Record<string, number>>(
        {},
    );
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Sync section titles on questions load
    useEffect(() => {
        if (isSaveQuizModalOpen && importedQuestions.length > 0) {
            const sections = Array.from(
                new Set(
                    importedQuestions
                        .map((q) => q.sectionTitle)
                        .filter(Boolean),
                ),
            ) as string[];
            const initPts: Record<string, number> = {};
            sections.forEach((sec) => {
                initPts[sec] = 0;
            });
            setSectionPoints(initPts);
        }
    }, [importedQuestions, isSaveQuizModalOpen]);

    // Sync default subject when grade changes
    useEffect(() => {
        const cats = GRADE_CATEGORIES[quizGrade] || [];
        if (cats.length > 0 && !cats.includes(quizSubject)) {
            setQuizSubject(cats[0]);
        }
    }, [quizGrade]);

    const handleQuestionsParsed = useCallback(
        (questions: any[], suggestedTitle?: string) => {
            setImportedQuestions(questions);
            if (suggestedTitle) {
                setQuizTitle(suggestedTitle);
            } else {
                setQuizTitle("");
            }
            setIsSaveQuizModalOpen(true);
        },
        [],
    );

    const handleSaveNewQuiz = async () => {
        if (!quizTitle.trim() || !quizSubject.trim()) {
            alert("Vui lòng nhập tiêu đề và môn học.");
            return;
        }

        let scoringConfigObj: any = { type: scoringMode };
        if (scoringMode === "SECTION_BASED") {
            scoringConfigObj.sections = Object.keys(sectionPoints).map(
                (sec) => ({
                    section_id: sec,
                    total_points: sectionPoints[sec] || 0,
                }),
            );
        } else if (scoringMode === "THPT_QG") {
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

        const newQuiz: Quiz = {
            id: crypto.randomUUID(),
            title: quizTitle.trim(),
            description:
                quizDescription.trim() ||
                `Đề thi ${quizSubject} Lớp ${quizGrade} ${quizDuration} phút.`,
            subject: quizSubject,
            grade: quizGrade,
            duration: quizDuration,
            questions: importedQuestions,
            createdAt: new Date().toISOString().split("T")[0],
            isPublic: quizIsPublic,
            scoringConfig: scoringConfigObj,
        };

        try {
            await createQuiz(newQuiz);
            onAddQuiz(newQuiz);
            setSaveStatus("Lưu đề thi thành công!");
            setQuizTitle("");
            setQuizDescription("");
            setImportedQuestions([]);
            setQuizIsPublic(false);
            setScoringMode("EQUAL_WEIGHT");
            setSectionPoints({});
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err: any) {
            alert(`Lỗi khi lưu đề thi: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">
                        Import Đề Thi
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Trích xuất câu hỏi trắc nghiệm 3 Phần, hình vẽ đồ thị và
                        công thức MathType/Math XML từ file Word (.docx).
                    </p>
                </div>
            </div>

            {/* Importer Component */}
            <WordImporter onQuestionsParsed={handleQuestionsParsed} />

            {/* SAVE QUIZ MODAL */}
            {isSaveQuizModalOpen && (
                <div className="fixed inset-0 bg-slate-955/20 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                    <div className="bg-bg-card rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border-0 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4.5 border-b border-border-primary/60 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-brand-500" />
                                    <span>Thiết Lập Đề Thi Mới</span>
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Đã nhận {importedQuestions.length} câu hỏi.
                                    Vui lòng cấu hình các thông số dưới đây.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSaveQuizModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                            {/* Title */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Tên bài kiểm tra / Đề thi:{" "}
                                    <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={quizTitle}
                                    onChange={(e) =>
                                        setQuizTitle(e.target.value)
                                    }
                                    placeholder="VD: Kiểm tra cuối kì I Giải Tích lớp 11"
                                    className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold focus:outline-none transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Mô tả ngắn:
                                </label>
                                <textarea
                                    rows={2}
                                    value={quizDescription}
                                    onChange={(e) =>
                                        setQuizDescription(e.target.value)
                                    }
                                    placeholder="VD: Đề thi thử tự luyện tập giúp củng cố kiến thức nâng cao..."
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
                                        value={quizGrade}
                                        onChange={(e) =>
                                            setQuizGrade(e.target.value)
                                        }
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
                                        value={quizSubject}
                                        onChange={(e) =>
                                            setQuizSubject(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                    >
                                        {(
                                            GRADE_CATEGORIES[quizGrade] || []
                                        ).map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Duration Option */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Thời gian làm bài (Phút):
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {["15", "30", "45", "60", "90"].map(
                                        (time) => (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => {
                                                    setDurationOption(time);
                                                    setQuizDuration(
                                                        Number(time),
                                                    );
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    durationOption === time
                                                        ? "bg-brand-50 text-brand-600"
                                                        : "bg-slate-100 border-0 text-slate-650 hover:bg-slate-200/60"
                                                }`}
                                            >
                                                {time} phút
                                            </button>
                                        ),
                                    )}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDurationOption("other")
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            durationOption === "other"
                                                ? "bg-brand-50 text-brand-600"
                                                : "bg-slate-100 border-0 text-slate-650 hover:bg-slate-200/60"
                                        }`}
                                    >
                                        Khác...
                                    </button>
                                </div>

                                {durationOption === "other" && (
                                    <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <input
                                            type="number"
                                            value={quizDuration}
                                            onChange={(e) =>
                                                setQuizDuration(
                                                    Number(e.target.value),
                                                )
                                            }
                                            placeholder="Nhập số phút..."
                                            min={5}
                                            className="w-32 px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-bold focus:outline-none"
                                        />
                                        <span className="text-xs text-slate-500 font-semibold">
                                            phút
                                        </span>
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
                                        value={scoringMode}
                                        onChange={(e) =>
                                            setScoringMode(e.target.value)
                                        }
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border-0 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value="EQUAL_WEIGHT">
                                            Mode 1: Chia đều điểm (Tổng 10đ cho
                                            tất cả câu)
                                        </option>
                                        <option value="SECTION_BASED">
                                            Mode 2: Chia điểm theo Phần (Tự cấu
                                            hình điểm mỗi phần)
                                        </option>
                                        <option value="THPT_QG">
                                            Mode 3: Thang điểm chuẩn thi THPT
                                            Quốc Gia (3 - 4 - 3)
                                        </option>
                                    </select>
                                </div>

                                {scoringMode === "SECTION_BASED" && (
                                    <div className="bg-slate-50 rounded-xl p-3 border-0 space-y-3 animate-in fade-in duration-150 text-xs">
                                        <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                            Cấu hình điểm số cho từng phần:
                                        </div>
                                        {Object.keys(sectionPoints).length ===
                                        0 ? (
                                            <p className="text-slate-450 italic text-[11px]">
                                                Không tìm thấy phân chia phần
                                                trong câu hỏi đã tải lên (Cần có
                                                trường sectionTitle).
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {Object.keys(sectionPoints).map(
                                                    (sec) => (
                                                        <div
                                                            key={sec}
                                                            className="flex items-center justify-between gap-3"
                                                        >
                                                            <span className="font-semibold text-slate-600 truncate max-w-[200px]">
                                                                {sec}:
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    max="10"
                                                                    value={
                                                                        sectionPoints[
                                                                            sec
                                                                        ] ?? ""
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const val =
                                                                            Number(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            );
                                                                        setSectionPoints(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [sec]: val,
                                                                            }),
                                                                        );
                                                                    }}
                                                                    className="w-20 px-2 py-1 bg-slate-100 border-0 rounded-lg text-xs font-bold focus:outline-none text-center"
                                                                />
                                                                <span className="text-slate-400 font-medium">
                                                                    điểm
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                                <div className="pt-1.5 border-t border-border-primary/40 flex justify-between font-bold text-slate-700 text-[11px]">
                                                    <span>TỔNG ĐIỂM:</span>
                                                    <span
                                                        className={
                                                            Math.abs(
                                                                (
                                                                    Object.values(
                                                                        sectionPoints,
                                                                    ) as number[]
                                                                ).reduce(
                                                                    (a, b) =>
                                                                        a + b,
                                                                    0,
                                                                ) - 10,
                                                            ) < 0.01
                                                                ? "text-emerald-600"
                                                                : "text-rose-500"
                                                        }
                                                    >
                                                        {(
                                                            Object.values(
                                                                sectionPoints,
                                                            ) as number[]
                                                        )
                                                            .reduce(
                                                                (a, b) => a + b,
                                                                0,
                                                            )
                                                            .toFixed(1)}{" "}
                                                        / 10.0đ
                                                    </span>
                                                </div>
                                                {Math.abs(
                                                    (
                                                        Object.values(
                                                            sectionPoints,
                                                        ) as number[]
                                                    ).reduce(
                                                        (a, b) => a + b,
                                                        0,
                                                    ) - 10,
                                                ) > 0.01 && (
                                                    <p className="text-rose-550 text-[10px] italic leading-normal">
                                                        * Lưu ý: Tổng điểm các
                                                        phần nên bằng 10.0 để
                                                        khớp thang điểm chuẩn.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {scoringMode === "THPT_QG" && (
                                    <div className="bg-brand-50/40 rounded-xl p-3 border-0 text-[11px] text-slate-650 leading-normal space-y-1.5 animate-in fade-in duration-150">
                                        <div className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                                            Cấu hình chuẩn THPT Quốc Gia (Bộ
                                            Giáo Dục):
                                        </div>
                                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                                            <li>
                                                <strong className="text-slate-805">
                                                    Phần I (Trắc nghiệm nhiều
                                                    lựa chọn):
                                                </strong>{" "}
                                                3.0 điểm (12 câu, mỗi câu 0.25đ)
                                            </li>
                                            <li>
                                                <strong className="text-slate-805">
                                                    Phần II (Trắc nghiệm
                                                    Đúng/Sai):
                                                </strong>{" "}
                                                4.0 điểm (4 câu. Đúng 1 ý được
                                                0.1đ, 2 ý 0.25đ, 3 ý 0.5đ, 4 ý
                                                1.0đ)
                                            </li>
                                            <li>
                                                <strong className="text-slate-805">
                                                    Phần III (Trắc nghiệm trả
                                                    lời ngắn):
                                                </strong>{" "}
                                                3.0 điểm (6 câu, mỗi câu 0.5đ)
                                            </li>
                                        </ul>
                                        <p className="text-[10px] text-slate-400 italic font-medium pt-1">
                                            * Hệ thống tự nhận diện các câu hỏi
                                            dựa theo trường{" "}
                                            <code className="bg-slate-100 px-1 rounded">
                                                sectionTitle
                                            </code>{" "}
                                            (Phần I, II, III).
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Public checkbox */}
                            <div className="flex items-center gap-2.5 py-2 select-none border-t border-border-primary/60 mt-2">
                                <input
                                    type="checkbox"
                                    id="modal-checkbox-is-public"
                                    checked={quizIsPublic}
                                    onChange={(e) =>
                                        setQuizIsPublic(e.target.checked)
                                    }
                                    className="h-4 w-4 text-brand-600 border-border-secondary rounded focus:ring-brand-500 cursor-pointer"
                                />
                                <label
                                    htmlFor="modal-checkbox-is-public"
                                    className="text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                    Công khai đề thi này (Học sinh có thể thi
                                    ngay)
                                </label>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-border-primary/60 bg-slate-50/30 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsSaveQuizModalOpen(false)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                            >
                                Quay lại chỉnh sửa
                            </button>
                            <button
                                onClick={async () => {
                                    if (!quizTitle.trim()) {
                                        alert(
                                            "Vui lòng nhập tên bài kiểm tra.",
                                        );
                                        return;
                                    }
                                    await handleSaveNewQuiz();
                                    setIsSaveQuizModalOpen(false);
                                    setActiveTab("quizzes");
                                }}
                                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Xác nhận & Lưu đề thi</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

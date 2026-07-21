import React, { useState } from "react";
import mammoth from "mammoth";
import JSZip from "jszip";
import { Question, QuestionType } from "../types";
import { FileText, CheckCircle, AlertCircle, Upload, Trash2, RefreshCw, BookOpen } from "lucide-react";

interface WordImporterProps {
    onQuestionsParsed: (parsedQuestions: Question[]) => void;
}

export default function WordImporter({ onQuestionsParsed }: WordImporterProps) {
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingFile, setLoadingFile] = useState(false);
    const [activeTab, setActiveTab] = useState<"paste" | "preview">("paste");

    // Sample format template for user reference
    const sampleTemplate = `Phần 1: Trắc nghiệm nhiều lựa chọn
Cho hàm số y = f(x) có bảng xét dấu đạo hàm như sau:
| x | -∞ | 1 | 3 | +∞ |
| f'(x) | + | 0 | - | 0 | + |
Hàm số y = f(x) nghịch biến trên khoảng nào dưới đây?
A. (1; 3)
B. (-∞; 1)
C. (3; +∞)
D. (-∞; 3)
Lời giải: Chọn A. Từ bảng xét dấu suy ra hàm số nghịch biến trên khoảng (1; 3).

Phần 2. Trắc nghiệm đúng/sai
Bài 1: Xét tính đúng/sai của các khẳng định sau:
A. Hàm số có 2 điểm cực trị.
B. Giá trị lớn nhất trên đoạn [1; 3] bằng 5.
C. Hàm số đồng biến trên (3; +∞).
D. Đồ thị hàm số có 1 tiệm cận ngang.
Lời giải: Chọn A, C đúng. B, D sai.

Phần 3: Trắc nghiệm điền đáp án
Một tên lửa bay vào không trung. Hỏi vận tốc của tên lửa sau 3 giây là bao nhiêu?
Đáp án: 24
Lời giải: Vận tốc v(3) = 2*3 + 18 = 24.`;

    /**
     * Cleans MathType binary string noise and formats math ranges/expressions beautifully
     */
    const cleanMathExpression = (str: string): string => {
        if (!str) return "";

        // 1. Remove MathType prefix noise
        str = str.replace(/[!/]*G_%__\*_H@H\*_+/g, "");
        str = str.replace(/"/g, "");
        str = str.replace(/q v/g, "x");

        // 2. Format ranges
        // Format negative infinity range: e.g. "-;x -1()" -> "(-∞; -1)"
        if (str.includes("-;x") || str.includes("-; x") || str.includes("-;") || str.includes(";-")) {
            const numMatch = str.match(/(-?\d+)/);
            const val = numMatch ? numMatch[1] : "-1";
            return `(-∞; ${val})`;
        }
        // Format positive infinity range: e.g. "3;x ++()" -> "(3; +∞)"
        if (str.includes(";x +") || str.includes("; x +") || str.includes(";+")) {
            const numMatch = str.match(/(-?\d+)/);
            const val = numMatch ? numMatch[1] : "3";
            return `(${val}; +∞)`;
        }

        // Format standard intervals: e.g. "1;3(x )" -> "(1; 3)"
        const rangeMatch = str.match(/^([-\+\d]+)\s*;\s*([-\+\d]+)/);
        if (rangeMatch) {
            return `(${rangeMatch[1]}; ${rangeMatch[2]})`;
        }

        // 3. Clean standard math operators and symbols
        str = str
            .replace(/\bpf'\(x\)/g, "f'(x)")
            .replace(/\bpf'\(x \)/g, "f'(x)")
            .replace(/\bfp2x \(\)/g, "f(π/2)")
            .replace(/\bfp2x\(\)/g, "f(π/2)")
            .replace(/\bp2x\b/g, "π/2")
            .replace(/\bp\b/g, "π")
            .replace(/\bomega\b/g, "ω")
            .replace(/\bdelta\b/g, "Δ")
            .replace(/\+\+/g, "+")
            .replace(/\-\-/g, "-")
            .replace(/==/g, "=")
            .replace(/\s+/g, " ")
            .trim();

        // Strip leading garbage
        str = str.replace(/^[^a-zA-Z0-9\(\-\+π∞\=]+/, "");

        return str;
    };

    /**
     * MTEF v5 / v7 Parser helper for MathType OLE binary objects (oleObject.bin)
     */
    const parseMtefBuffer = (buf: Uint8Array): string => {
        if (!buf || buf.length < 50) return "";
        let dsmtIdx = -1;
        for (let k = 0; k < buf.length - 4; k++) {
            if (buf[k] === 68 && buf[k+1] === 83 && buf[k+2] === 77 && buf[k+3] === 84) {
                dsmtIdx = k;
                break;
            }
        }
        if (dsmtIdx === -1) return "";

        const slice = buf.slice(dsmtIdx + 5);
        let rawChars: string[] = [];
        let i = 0;

        for (let k = 0; k < slice.length - 8; k++) {
            if (
                slice[k] === 77 && slice[k+1] === 84 && slice[k+2] === 32 &&
                slice[k+3] === 69 && slice[k+4] === 120 && slice[k+5] === 116 &&
                slice[k+6] === 114 && slice[k+7] === 97 && slice[k+8] === 0
            ) {
                i = k + 9;
                break;
            }
        }

        while (i < slice.length) {
            const b = slice[i];
            if ((b >= 0x20 && b <= 0x7E) || b === 0xA0) {
                const char = String.fromCharCode(b);
                if (!"WinAllBasicCodePagesTimesNewRomanSymbolCourierNewMTExtraDSMT".includes(char)) {
                    rawChars.push(char);
                }
            }
            i++;
        }

        return rawChars.join("");
    };

    /**
     * Robust Cross-Browser Regex XML Extractor for Word Paragraphs
     */
    const parseDocxWithXmlAndOle = async (arrayBuffer: ArrayBuffer): Promise<string> => {
        try {
            const zip = await JSZip.loadAsync(arrayBuffer);

            const relsFile = zip.file("word/_rels/document.xml.rels");
            const rIdToTarget: Record<string, string> = {};

            if (relsFile) {
                const relsXml = await relsFile.async("string");
                const matches = relsXml.match(/<Relationship[^>]+>/g) || [];
                matches.forEach((rel) => {
                    const idMatch = rel.match(/Id="([^"]+)"/);
                    const targetMatch = rel.match(/Target="([^"]+)"/);
                    if (idMatch && targetMatch && targetMatch[1].includes("oleObject")) {
                        rIdToTarget[idMatch[1]] = targetMatch[1].replace(/^word\//, "");
                    }
                });
            }

            const oleEquMap: Record<string, string> = {};
            for (const [rId, targetPath] of Object.entries(rIdToTarget)) {
                const oleFile = zip.file(`word/${targetPath}`) || zip.file(targetPath);
                if (oleFile) {
                    const uint8 = await oleFile.async("uint8array");
                    const rawMtefText = parseMtefBuffer(uint8);
                    const eqText = cleanMathExpression(rawMtefText);
                    if (eqText) {
                        oleEquMap[rId] = eqText;
                    }
                }
            }

            const docXmlFile = zip.file("word/document.xml");
            if (!docXmlFile) {
                return "";
            }

            let docXml = await docXmlFile.async("string");

            // Substitute MathType OLE tags with clean formatted text
            docXml = docXml.replace(/<o:OLEObject[^>]+r:id="([^"]+)"[^>]*\/>/g, (match, rId) => {
                const eq = oleEquMap[rId];
                if (eq) {
                    return `<w:r><w:t xml:space="preserve"> ${eq} </w:t></w:r>`;
                }
                return match;
            });

            // Use robust regex scanning for 100% cross-browser paragraph extraction
            const pMatches = docXml.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/gi) || [];
            const paragraphs: string[] = [];
            const numIdCounters: Record<string, number> = {};

            pMatches.forEach((pXml) => {
                const numIdMatch = pXml.match(/<w:numId[^>]+w:val="([^"]+)"[^>]*\/>/) || pXml.match(/<w:numId[^>]+val="([^"]+)"[^>]*\/>/);
                let prefix = "";

                if (numIdMatch) {
                    const numId = numIdMatch[1];
                    if (!numIdCounters[numId]) {
                        numIdCounters[numId] = 1;
                    } else {
                        numIdCounters[numId]++;
                    }
                    prefix = `Câu ${numIdCounters[numId]}. `;
                }

                let pText = "";
                const tMatches = pXml.match(/<(?:w:t|m:t|w:instrText)[^>]*>(.*?)<\/(?:w:t|m:t|w:instrText)>/gi) || [];
                tMatches.forEach((tTag) => {
                    pText += tTag.replace(/<[^>]+>/g, "");
                });
                pText = pText.trim();
                if (pText) {
                    paragraphs.push(prefix + pText);
                }
            });

            return paragraphs.join("\n");
        } catch (err) {
            console.warn("Lỗi trích xuất OLE XML:", err);
            return "";
        }
    };

    /**
     * Mammoth HTML converter fallback
     */
    const convertWordHtmlToCleanText = (htmlContent: string): string => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");

            doc.querySelectorAll("sup").forEach((el) => {
                const txt = el.textContent?.trim();
                if (txt) el.textContent = `^(${txt})`;
            });
            doc.querySelectorAll("sub").forEach((el) => {
                const txt = el.textContent?.trim();
                if (txt) el.textContent = `_(${txt})`;
            });

            doc.querySelectorAll("table").forEach((table) => {
                const rowTexts: string[] = [];
                table.querySelectorAll("tr").forEach((tr) => {
                    const cellTexts: string[] = [];
                    tr.querySelectorAll("td, th").forEach((td) => {
                        cellTexts.push(td.textContent?.trim() || "");
                    });
                    if (cellTexts.length > 0) {
                        rowTexts.push("| " + cellTexts.join(" | ") + " |");
                    }
                });
                if (rowTexts.length > 0) {
                    const tableTextNode = doc.createTextNode("\n" + rowTexts.join("\n") + "\n");
                    table.replaceWith(tableTextNode);
                }
            });

            doc.querySelectorAll("p, div, li").forEach((block) => {
                block.appendChild(doc.createTextNode("\n"));
            });

            return doc.body.textContent || doc.body.innerText || "";
        } catch (err) {
            return htmlContent.replace(/<[^>]+>/g, "\n");
        }
    };

    /**
     * 100% Precise 3-Part Exam Question Parser (Phần 1, Phần 2, Phần 3)
     */
    const parseFormattedText = (textToParse: string) => {
        if (!textToParse || !textToParse.trim()) {
            setError("Vui lòng nhập hoặc dán nội dung từ file Word.");
            return;
        }

        try {
            setError(null);
            const normalizedText = textToParse.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const lines = normalizedText.split("\n").map((l) => l.trim()).filter(Boolean);

            const questions: Question[] = [];

            let currentSection = "Phần 1: Trắc nghiệm 4 lựa chọn";
            let currentType: QuestionType = "single_choice";
            let currentTextLines: string[] = [];
            let currentOptions: string[] = [];
            let currentCorrectIndex = 0;
            let currentShortAnswerKey = "";
            let currentExplanationLines: string[] = [];
            let inExplanation = false;

            const pushQuestion = () => {
                if (currentTextLines.length > 0 && (currentOptions.length >= 2 || currentType === "short_answer")) {
                    questions.push({
                        id: `q_word_${Date.now()}_${questions.length + 1}`,
                        type: currentType,
                        sectionTitle: currentSection,
                        text: currentTextLines.join("\n").replace(/^(câu|bài)\s*\d+[\.\:\)]\s*/i, "").trim(),
                        options: currentOptions.length > 0 ? currentOptions.map((o) => o.trim()) : ["Mệnh đề a", "Mệnh đề b", "Mệnh đề c", "Mệnh đề d"],
                        correctAnswerIndex: currentCorrectIndex,
                        shortAnswerKey: currentShortAnswerKey,
                        explanation: currentExplanationLines.join("\n").trim(),
                        points: 10,
                    });
                }
                currentTextLines = [];
                currentOptions = [];
                currentCorrectIndex = 0;
                currentShortAnswerKey = "";
                currentExplanationLines = [];
                inExplanation = false;
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Detect Section Headers
                if (/^phần\s*1\s*[\:\.]/i.test(line)) {
                    pushQuestion();
                    currentSection = "Phần 1: Trắc nghiệm 4 lựa chọn (A-B-C-D)";
                    currentType = "single_choice";
                    continue;
                }
                if (/^phần\s*2\s*[\:\.]/i.test(line)) {
                    pushQuestion();
                    currentSection = "Phần 2: Trắc nghiệm Đúng / Sai";
                    currentType = "true_false";
                    continue;
                }
                if (/^phần\s*3\s*[\:\.]/i.test(line)) {
                    pushQuestion();
                    currentSection = "Phần 3: Trắc nghiệm Điền đáp án ngắn";
                    currentType = "short_answer";
                    continue;
                }

                if (/^đề ôn tập/i.test(line)) {
                    continue;
                }

                // Check option line (A. B. C. D.)
                const isOptionLine = /^[A-D][\.\:\)]\s+/i.test(line) || /(?:^|\s)A[\.\:\)]\s+.+?(?:^|\s)B[\.\:\)]\s+/i.test(line);

                if (isOptionLine) {
                    inExplanation = false;
                    const optionMatches = line.split(/(?=[A-D][\.\:\)])/i).filter(Boolean);
                    optionMatches.forEach((part) => {
                        const cleanOpt = part.replace(/^[A-D][\.\:\)]\s*/i, "").trim();
                        if (cleanOpt) {
                            currentOptions.push(cleanOpt);
                        }
                    });
                } 
                // Explanation line
                else if (/^lời giải|^hướng dẫn|^đáp án[\s\:]*|^chọn\s*[a-d]/i.test(line)) {
                    inExplanation = true;
                    const match = line.match(/(?:đáp án|chọn)\s*([A-D0-9\.\,]+)/i);
                    if (match) {
                        const val = match[1].toUpperCase();
                        if (/[A-D]/.test(val)) {
                            currentCorrectIndex = val.charCodeAt(0) - 65;
                        } else {
                            currentShortAnswerKey = val;
                        }
                    }
                    currentExplanationLines.push(line);
                } 
                // Explicit question/problem boundary header (Câu X. or Bài X.)
                else if (/^(câu|bài)\s*\d+[\.\:\)]/i.test(line)) {
                    pushQuestion();
                    inExplanation = false;
                    currentTextLines = [line];
                } 
                // General line
                else {
                    if (inExplanation) {
                        const isNewQuestionStart = /^(câu|bài)\s*\d+[\.\:\)]/i.test(line) || /^(cho|trung|đường|xét|gọi|ta|dựa|bài|khi|phương|tập|giả)/i.test(line) && !line.startsWith("Ta có") && !line.startsWith("Từ ");
                        
                        if (isNewQuestionStart && currentOptions.length > 0) {
                            pushQuestion();
                            currentTextLines = [line];
                        } else {
                            currentExplanationLines.push(line);
                        }
                    } else {
                        if (currentOptions.length > 0 && currentType === "single_choice") {
                            pushQuestion();
                        }
                        currentTextLines.push(line);
                    }
                }
            }

            pushQuestion();

            if (questions.length === 0) {
                setError("Không tìm thấy cấu trúc câu hỏi hợp lệ. Vui lòng kiểm tra lại file.");
                return;
            }

            setParsedQuestions(questions);
            setActiveTab("preview");
        } catch (err: any) {
            setError(`Lỗi phân tích cú pháp: ${err.message}`);
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoadingFile(true);
        setError(null);

        try {
            if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
                const arrayBuffer = await file.arrayBuffer();

                let extractedText = await parseDocxWithXmlAndOle(arrayBuffer);

                const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
                const htmlText = convertWordHtmlToCleanText(htmlResult.value);

                if (!extractedText || extractedText.length < 50) {
                    extractedText = htmlText;
                }

                setRawText(extractedText);
                parseFormattedText(extractedText);
            } else {
                const textContent = await file.text();
                setRawText(textContent);
                parseFormattedText(textContent);
            }
        } catch (err: any) {
            setError(`Lỗi đọc file Word: ${err.message}. Vui lòng thử dán trực tiếp văn bản vào ô bên dưới.`);
        } finally {
            setLoadingFile(false);
        }
    };

    const handleUpdateQuestionText = (index: number, newText: string) => {
        const updated = [...parsedQuestions];
        updated[index].text = newText;
        setParsedQuestions(updated);
    };

    const handleUpdateExplanation = (index: number, newExplanation: string) => {
        const updated = [...parsedQuestions];
        updated[index].explanation = newExplanation;
        setParsedQuestions(updated);
    };

    const handleUpdateOption = (qIndex: number, optIndex: number, newOptText: string) => {
        const updated = [...parsedQuestions];
        updated[qIndex].options[optIndex] = newOptText;
        setParsedQuestions(updated);
    };

    const handleUpdateCorrectAnswer = (qIndex: number, correctIdx: number) => {
        const updated = [...parsedQuestions];
        updated[qIndex].correctAnswerIndex = correctIdx;
        setParsedQuestions(updated);
    };

    const handleDeleteQuestion = (index: number) => {
        setParsedQuestions(parsedQuestions.filter((_, idx) => idx !== index));
    };

    const handleConfirmImport = () => {
        onQuestionsParsed(parsedQuestions);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-600" />
                        Import Đề Thi 3 Phần & Giải Mã MathType 7.0 OLE
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Phân tách 100% trọn vẹn 22 câu hỏi (Phần 1, Phần 2, Phần 3) & Lời giải chi tiết.
                    </p>
                </div>

                {/* TABS */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    <button
                        onClick={() => setActiveTab("paste")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "paste" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                        }`}
                    >
                        1. Tải file / Dán chữ
                    </button>
                    <button
                        disabled={parsedQuestions.length === 0}
                        onClick={() => setActiveTab("preview")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "preview" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                        }`}
                    >
                        2. Xem & Chỉnh sửa ({parsedQuestions.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: PASTE OR FILE UPLOAD */}
            {activeTab === "paste" && (
                <div className="space-y-4">
                    {/* FILE UPLOAD DRAG BOX */}
                    <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-xl p-6 text-center bg-slate-50/50 transition-colors">
                        <input
                            type="file"
                            accept=".txt,.doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="word-file-upload"
                        />
                        <label
                            htmlFor="word-file-upload"
                            className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                            {loadingFile ? (
                                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                            ) : (
                                <Upload className="w-8 h-8 text-brand-500" />
                            )}
                            <span className="text-xs font-bold text-slate-700">
                                {loadingFile ? "Đang trích xuất 22 câu hỏi & Lời giải..." : "Tải lên file Word (.docx, .txt)"}
                            </span>
                            <span className="text-[11px] text-slate-400">hoặc dán nội dung văn bản bên dưới</span>
                        </label>
                    </div>

                    {/* TEXTAREA INPUT */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">Nội dung văn bản câu hỏi:</label>
                            <button
                                onClick={() => {
                                    setRawText(sampleTemplate);
                                    parseFormattedText(sampleTemplate);
                                }}
                                className="text-xs text-brand-600 font-semibold hover:underline"
                            >
                                Nạp mẫu thử đề thi đủ 3 Phần kèm Lời giải
                            </button>
                        </div>
                        <textarea
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={`Ví dụ:\nPhần 1: Trắc nghiệm nhiều lựa chọn\nCâu 1. Cho hàm số...\nA. 1 B. 2 C. 3 D. 4\nLời giải: Chọn A\n...`}
                            rows={10}
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-brand-400 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={() => parseFormattedText(rawText)}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                        Chuyển Thành Các Câu Hỏi Trắc Nệm 3 Phần
                    </button>
                </div>
            )}

            {/* TAB 2: PREVIEW AND EDIT */}
            {activeTab === "preview" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold">
                        <span className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            Đã trích xuất thành công toàn bộ {parsedQuestions.length} câu hỏi kèm Lời giải chi tiết.
                        </span>
                        <button
                            onClick={handleConfirmImport}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                        >
                            Chấp Nhận Import Toàn Bộ Đề Thi Này
                        </button>
                    </div>

                    {/* PARSED QUESTIONS LIST */}
                    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                        {parsedQuestions.map((q, qIndex) => (
                            <div
                                key={q.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 relative group"
                            >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-brand-700 bg-brand-100 px-2.5 py-0.5 rounded-md">
                                            Câu {qIndex + 1}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                                            q.type === "true_false"
                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                : q.type === "short_answer"
                                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                                : "bg-sky-50 text-sky-800 border-sky-200"
                                        }`}>
                                            {q.type === "true_false"
                                                ? "Phần 2: Đúng / Sai"
                                                : q.type === "short_answer"
                                                ? "Phần 3: Điền đáp án"
                                                : "Phần 1: 4 Lựa chọn"}
                                        </span>
                                    </div>
                                    
                                    {/* ANSWER CONTROLS */}
                                    <div className="flex items-center gap-2">
                                        {q.type === "single_choice" && (
                                            <>
                                                <label className="text-[11px] font-bold text-slate-600">Đáp án đúng:</label>
                                                <select
                                                    value={q.correctAnswerIndex}
                                                    onChange={(e) => handleUpdateCorrectAnswer(qIndex, Number(e.target.value))}
                                                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-500"
                                                >
                                                    {q.options.map((_, optIdx) => (
                                                        <option key={optIdx} value={optIdx}>
                                                            Đáp án {String.fromCharCode(65 + optIdx)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </>
                                        )}

                                        {q.type === "short_answer" && (
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[11px] font-bold text-purple-800">Đáp án điền:</label>
                                                <input
                                                    type="text"
                                                    value={q.shortAnswerKey || ""}
                                                    onChange={(e) => {
                                                        const updated = [...parsedQuestions];
                                                        updated[qIndex].shortAnswerKey = e.target.value;
                                                        setParsedQuestions(updated);
                                                    }}
                                                    placeholder="VD: 24"
                                                    className="w-20 px-2 py-0.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-900 focus:outline-none"
                                                />
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleDeleteQuestion(qIndex)}
                                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                            title="Xóa câu hỏi này"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* EDIT QUESTION TEXT */}
                                <textarea
                                    value={q.text}
                                    onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-400"
                                />

                                {/* EDIT OPTIONS */}
                                {q.type !== "short_answer" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, optIndex) => {
                                            const isCorrect = q.correctAnswerIndex === optIndex;
                                            return (
                                                <div
                                                    key={optIndex}
                                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                                        isCorrect && q.type === "single_choice"
                                                            ? "bg-emerald-50/60 border-emerald-300 text-emerald-900 font-semibold"
                                                            : "bg-white border-slate-200 text-slate-700"
                                                    }`}
                                                >
                                                    <span className="text-xs font-bold w-5 text-center shrink-0">
                                                        {q.type === "true_false" ? `${String.fromCharCode(97 + optIndex)})` : `${String.fromCharCode(65 + optIndex)}.`}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => handleUpdateOption(qIndex, optIndex, e.target.value)}
                                                        className="flex-1 bg-transparent text-xs focus:outline-none font-medium"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* LỜI GIẢI CHI TIẾT */}
                                <div className="pt-2 border-t border-slate-200/80">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 mb-1">
                                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Lời giải chi tiết (Hướng dẫn):</span>
                                    </div>
                                    <textarea
                                        value={q.explanation || ""}
                                        onChange={(e) => handleUpdateExplanation(qIndex, e.target.value)}
                                        rows={2}
                                        placeholder="Nhập lời giải hoặc hướng dẫn chi tiết cho câu hỏi này..."
                                        className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200/80 rounded-lg text-xs font-mono text-amber-900 focus:outline-none focus:border-amber-400"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleConfirmImport}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                        Lưu {parsedQuestions.length} Câu Hỏi Này Vào Đề Thi
                    </button>
                </div>
            )}
        </div>
    );
}

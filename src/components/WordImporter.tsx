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
a) Hàm số có 2 điểm cực trị.
b) Giá trị lớn nhất trên đoạn [1; 3] bằng 5.
c) Hàm số đồng biến trên (3; +∞).
d) Đồ thị hàm số có 1 tiệm cận ngang.
Lời giải: Chọn a) đúng, b) sai, c) đúng, d) sai.

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
        if (str.includes("-;x") || str.includes("-; x") || str.includes("-;") || str.includes(";-")) {
            const numMatch = str.match(/(-?\d+)/);
            const val = numMatch ? numMatch[1] : "-1";
            return `(-∞; ${val})`;
        }
        if (str.includes(";x +") || str.includes("; x +") || str.includes(";+")) {
            const numMatch = str.match(/(-?\d+)/);
            const val = numMatch ? numMatch[1] : "3";
            return `(${val}; +∞)`;
        }

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
     * Escape XML special characters to avoid parsing errors
     */
    const escapeXml = (unsafe: string): string => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };

    /**
     * Pre-process word/document.xml inside ZIP to preserve OLE formulas and standard OMML math tags
     */
    const preProcessDocxBuffer = async (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
        const zip = await JSZip.loadAsync(arrayBuffer);

        // 1. Get OLE object relationship mappings
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

        // 2. Parse MTEF equations from OLE targets
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

        // 3. Read and modify word/document.xml
        const docXmlFile = zip.file("word/document.xml");
        if (!docXmlFile) {
            return arrayBuffer;
        }

        let docXml = await docXmlFile.async("string");

        // Substitute OLE object tags with escaped plain text tags
        docXml = docXml.replace(/<o:OLEObject[^>]+r:id="([^"]+)"[^>]*\/>/g, (match, rId) => {
            const eq = oleEquMap[rId];
            if (eq) {
                const escaped = escapeXml(eq);
                return `<w:r><w:t xml:space="preserve"> ${escaped} </w:t></w:r>`;
            }
            return match;
        });

        // Convert standard math tags <m:t> into word text tags <w:t> so Mammoth converts them
        docXml = docXml.replace(/<m:t([^>]*)>/g, '<w:t$1>').replace(/<\/m:t>/g, '</w:t>');

        zip.file("word/document.xml", docXml);
        return await zip.generateAsync({ type: "arraybuffer" });
    };

    const cleanPrefix = (text: string): string => {
        return text.replace(/^(câu|bài)\s*\d+[\.\:\)]\s*/i, "").trim();
    };

    /**
     * DOM-based HTML Parser to extract questions for all 3 parts
     */
    const parseQuestionsFromHtml = (htmlContent: string) => {
        if (!htmlContent || !htmlContent.trim()) {
            setError("Vui lòng nhập hoặc dán nội dung từ file Word.");
            return;
        }

        try {
            setError(null);
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");
            const body = doc.body;

            const questions: Question[] = [];
            let currentSection = "Phần 1: Trắc nghiệm nhiều lựa chọn (A-B-C-D)";
            let currentType: QuestionType = "single_choice";

            let currentQuestion: Partial<Question> | null = null;
            let inExplanation = false;
            let explanationHtmls: string[] = [];

            const pushCurrentQuestion = () => {
                if (currentQuestion && currentQuestion.text) {
                    currentQuestion.explanation = explanationHtmls.join("").trim();
                    currentQuestion.text = cleanPrefix(currentQuestion.text);

                    if (currentQuestion.options && currentQuestion.options.length > 0) {
                        currentQuestion.options = currentQuestion.options.map(opt => {
                            return opt.replace(/^[A-D\(\)a-d][\.\:\)]\s*/i, "").trim();
                        });
                    } else {
                        currentQuestion.options = [];
                    }

                    // 1. Determine Correct Answer Index for Part 1
                    if (currentType === "single_choice" && currentQuestion.explanation) {
                        const expText = currentQuestion.explanation.replace(/<[^>]+>/g, "");
                        const match = expText.match(/(?:chọn|đáp án)\s*([A-D])/i);
                        if (match) {
                            currentQuestion.correctAnswerIndex = match[1].toUpperCase().charCodeAt(0) - 65;
                        } else {
                            // Fallback string matcher
                            let matchedIdx = 0;
                            for (let i = 0; i < currentQuestion.options.length; i++) {
                                const optText = currentQuestion.options[i].replace(/<[^>]+>/g, "").trim();
                                if (optText.length > 2 && expText.includes(optText)) {
                                    matchedIdx = i;
                                    break;
                                }
                            }
                            currentQuestion.correctAnswerIndex = matchedIdx;
                        }
                    }

                    // 2. Parse Correct Answers List for Part 2
                    if (currentType === "true_false" && currentQuestion.explanation) {
                        const expText = currentQuestion.explanation.replace(/<[^>]+>/g, "");
                        const correctAnswers: boolean[] = [];
                        ["a", "b", "c", "d"].forEach((letter) => {
                            const reg = new RegExp(`${letter}\\)\\s*[^\\n\\|]+?\\s*(đúng|sai)`, "i");
                            const match = expText.match(reg);
                            if (match) {
                                correctAnswers.push(match[1].toLowerCase() === "đúng");
                            } else {
                                const reg2 = new RegExp(`${letter}\\.\\s*[^\\n\\|]+?\\s*(đúng|sai)`, "i");
                                const match2 = expText.match(reg2);
                                if (match2) {
                                    correctAnswers.push(match2[1].toLowerCase() === "đúng");
                                } else {
                                    const idx = expText.toLowerCase().indexOf(`${letter})`);
                                    if (idx !== -1) {
                                        const slice = expText.toLowerCase().slice(idx, idx + 100);
                                        if (slice.includes("đúng")) correctAnswers.push(true);
                                        else if (slice.includes("sai")) correctAnswers.push(false);
                                        else correctAnswers.push(true);
                                    } else {
                                        correctAnswers.push(true);
                                    }
                                }
                            }
                        });
                        currentQuestion.correctAnswers = correctAnswers;
                    }

                    // 3. Parse Short Answer Key for Part 3
                    if (currentType === "short_answer" && currentQuestion.explanation) {
                        const expText = currentQuestion.explanation.replace(/<[^>]+>/g, "");
                        const match = expText.match(/(?:bằng|là|≈|=)\s*(-?\d+(?:[\.,]\d+)?)/i) || expText.match(/(\d+(?:[\.,]\d+)?)\s*(?:sản phẩm|nghìn đồng)/i);
                        if (match) {
                            currentQuestion.shortAnswerKey = match[1];
                        } else {
                            currentQuestion.shortAnswerKey = "";
                        }
                    }

                    questions.push(currentQuestion as Question);
                }

                currentQuestion = null;
                explanationHtmls = [];
                inExplanation = false;
            };

            const children = Array.from(body.childNodes);

            for (let i = 0; i < children.length; i++) {
                const node = children[i] as HTMLElement;
                if (node.nodeType !== 1) continue; // Skip raw text nodes

                const text = node.textContent?.trim() || "";
                const htmlContent = node.outerHTML;

                // Detect Section Headers
                if (/^Phần\s*1\s*[\:\.]/i.test(text)) {
                    pushCurrentQuestion();
                    currentSection = "Phần 1: Trắc nghiệm nhiều lựa chọn (A-B-C-D)";
                    currentType = "single_choice";
                    continue;
                }
                if (/^Phần\s*2\s*[\:\.]/i.test(text)) {
                    pushCurrentQuestion();
                    currentSection = "Phần 2: Trắc nghiệm Đúng / Sai";
                    currentType = "true_false";
                    continue;
                }
                if (/^Phần\s*3\s*[\:\.]/i.test(text)) {
                    pushCurrentQuestion();
                    currentSection = "Phần 3: Trắc nghiệm Điền đáp án ngắn";
                    currentType = "short_answer";
                    continue;
                }

                // Detect question start boundary
                const isQuestionStart = /^(Câu|Bài)\s*\d+/i.test(text) || node.tagName === "LI";

                if (isQuestionStart) {
                    pushCurrentQuestion();
                    currentQuestion = {
                        id: `q_word_${Date.now()}_${questions.length + 1}`,
                        type: currentType,
                        sectionTitle: currentSection,
                        text: htmlContent,
                        options: [],
                        correctAnswerIndex: 0,
                        points: 10
                    };
                    continue;
                }

                if (!currentQuestion) continue;

                // Check option paragraph (A. B. C. D.)
                const hasOptions = /^[A-D][\.\:\)]\s+/i.test(text) || /<strong>\s*[A-D][\.\:\)]\s*<\/strong>/i.test(htmlContent) || /A\.\s+.*B\.\s+.*C\.\s+.*D\./i.test(text);

                if (hasOptions && currentType === "single_choice") {
                    const optMatches = htmlContent.split(/(?=<p>)?(?=<strong>\s*[A-D][\.\:\)])|(?=\b[A-D][\.\:\)]\s+)/gi);
                    const filteredOpts = optMatches
                        .map(o => o.replace(/<\/p>|<p>/g, "").trim())
                        .filter(o => /^[A-D][\.\:\)]/i.test(o.replace(/<[^>]+>/g, "").trim()));

                    if (filteredOpts.length >= 2) {
                        currentQuestion.options = filteredOpts;
                    } else {
                        currentQuestion.options?.push(htmlContent);
                    }
                    continue;
                }

                // Parse Part 2 statement tables
                if (node.tagName === "TABLE" && currentType === "true_false") {
                    const rows = Array.from(node.querySelectorAll("tr"));
                    const options: string[] = [];
                    rows.forEach((row, rIdx) => {
                        if (rIdx === 0) return; // Skip header
                        const firstCell = row.querySelector("td");
                        if (firstCell) {
                            options.push(firstCell.innerHTML.trim());
                        }
                    });
                    currentQuestion.options = options;
                    currentQuestion.text += htmlContent;
                    continue;
                }

                // Detect explanation tag
                const isExplanationStart = /^Lời giải/i.test(text) || /^Hướng dẫn/i.test(text);
                if (isExplanationStart) {
                    inExplanation = true;
                    explanationHtmls.push(htmlContent);
                    continue;
                }

                if (inExplanation) {
                    explanationHtmls.push(htmlContent);
                } else {
                    currentQuestion.text += htmlContent;
                }
            }

            pushCurrentQuestion();

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

                // Preprocess docx buffer (OLE formulas and OMML math)
                const preProcessed = await preProcessDocxBuffer(arrayBuffer);

                const options = {
                    convertImage: mammoth.images.imgElement(function(image: any) {
                        if (image.contentType === 'image/png' || image.contentType === 'image/jpeg') {
                            return image.read("base64").then(function(imageBuffer: string) {
                                return {
                                    src: "data:" + image.contentType + ";base64," + imageBuffer
                                };
                            });
                        }
                        return Promise.resolve({ src: '' });
                    })
                };

                const htmlResult = await mammoth.convertToHtml({ arrayBuffer: preProcessed }, options);
                let html = htmlResult.value.replace(/<img src=""\s*\/?>/g, '');

                setRawText(html);
                parseQuestionsFromHtml(html);
            } else {
                const textContent = await file.text();
                setRawText(textContent);
                parseQuestionsFromHtml(textContent);
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
                        Import Đề Thi 3 Phần & Đồ Họa + Math XML
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Giải mã trọn vẹn 22 câu hỏi (Phần 1, Phần 2, Phần 3), hình ảnh, bảng biểu và lời giải chi tiết.
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
                                {loadingFile ? "Đang trích xuất câu hỏi, hình ảnh & bảng biểu..." : "Tải lên file Word (.docx, .txt)"}
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
                                    parseQuestionsFromHtml(sampleTemplate);
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
                        onClick={() => parseQuestionsFromHtml(rawText)}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                        Chuyển Thành Các Câu Hỏi Đề Thi
                    </button>
                </div>
            )}

            {/* TAB 2: PREVIEW AND EDIT */}
            {activeTab === "preview" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-semibold">
                        <span className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            Đã trích xuất thành công toàn bộ {parsedQuestions.length} câu hỏi kèm Lời giải & hình ảnh.
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

                                        {q.type === "true_false" && (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <label className="text-[11px] font-bold text-amber-800">Đáp án Đúng/Sai:</label>
                                                <div className="flex gap-2">
                                                    {["a", "b", "c", "d"].map((letter, optIdx) => {
                                                        const val = q.correctAnswers ? q.correctAnswers[optIdx] : false;
                                                        return (
                                                            <div key={letter} className="flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                                                                <span className="text-[10px] font-bold text-slate-600 uppercase">{letter}:</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...parsedQuestions];
                                                                        if (!updated[qIndex].correctAnswers) {
                                                                            updated[qIndex].correctAnswers = [false, false, false, false];
                                                                        }
                                                                        updated[qIndex].correctAnswers![optIdx] = !val;
                                                                        setParsedQuestions(updated);
                                                                    }}
                                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-all cursor-pointer ${
                                                                        val 
                                                                            ? "bg-emerald-500 text-white" 
                                                                            : "bg-rose-500 text-white"
                                                                    }`}
                                                                >
                                                                    {val ? "Đ" : "S"}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
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

                                {/* RENDERED QUESTION PREVIEW */}
                                <div 
                                    className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 overflow-x-auto shadow-2xs"
                                    dangerouslySetInnerHTML={{ __html: q.text }}
                                />

                                {/* EDIT QUESTION TEXT (RAW HTML) */}
                                <textarea
                                    value={q.text}
                                    onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500 focus:outline-none focus:border-brand-400"
                                    placeholder="HTML câu hỏi..."
                                />

                                {/* EDIT OPTIONS */}
                                {q.type !== "short_answer" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, optIndex) => {
                                            let isCorrect = false;
                                            let label = "";
                                            let tfIndicator = null;

                                            if (q.type === "single_choice") {
                                                isCorrect = q.correctAnswerIndex === optIndex;
                                                label = `${String.fromCharCode(65 + optIndex)}.`;
                                            } else if (q.type === "true_false") {
                                                const tfVal = q.correctAnswers ? q.correctAnswers[optIndex] : false;
                                                label = `${String.fromCharCode(97 + optIndex)})`;
                                                tfIndicator = (
                                                    <span className={`ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                                        tfVal ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                    }`}>
                                                        {tfVal ? "ĐÚNG" : "SAI"}
                                                    </span>
                                                );
                                            }

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
                                                        {label}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => handleUpdateOption(qIndex, optIndex, e.target.value)}
                                                        className="flex-1 bg-transparent text-xs focus:outline-none font-medium"
                                                    />
                                                    {tfIndicator}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* LỜI GIẢI CHI TIẾT */}
                                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Lời giải chi tiết (Hướng dẫn):</span>
                                    </div>
                                    <div 
                                        className="p-3 bg-amber-50/10 border border-amber-200/40 rounded-xl text-xs text-amber-900 overflow-x-auto"
                                        dangerouslySetInnerHTML={{ __html: q.explanation || "" }}
                                    />
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

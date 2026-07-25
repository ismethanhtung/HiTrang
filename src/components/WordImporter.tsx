import React, { useState, useEffect } from "react";
import mammoth from "mammoth";
import JSZip from "jszip";
import { Question, QuestionType } from "../types";
import { FileText, CheckCircle, AlertCircle, Upload, Trash2, RefreshCw, BookOpen, Edit, CheckCircle2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { renderMathHtml } from "../lib/math";

interface WordImporterProps {
    onQuestionsParsed: (parsedQuestions: Question[], suggestedTitle?: string) => void;
}

function WordImporter({ onQuestionsParsed }: WordImporterProps) {
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loadingFile, setLoadingFile] = useState(false);
    const [activeTab, setActiveTab] = useState<"paste" | "preview" | "raw">("paste");
    const [expandedHtmlQuestions, setExpandedHtmlQuestions] = useState<Record<string, boolean>>({});
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [fontSize, setFontSize] = useState(14);
    const [fileName, setFileName] = useState("");

    // Keyboard Arrow Keys navigation for questions preview
    useEffect(() => {
        if (activeTab !== "preview" || parsedQuestions.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === "ArrowLeft") {
                setCurrentQuestionIdx(prev => Math.max(0, prev - 1));
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                setCurrentQuestionIdx(prev => Math.min(parsedQuestions.length - 1, prev + 1));
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [activeTab, parsedQuestions.length]);

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
        let clean = str.trim();
        
        // Post-process custom interval brackets from MathType (e.g. "4;5[)" -> "[4;5)")
        // Semicolon separator
        clean = clean.replace(/([^\[\]()$]+)\s*;\s*([^\[\]()$]+)\s*\[\s*\)/g, "[$1; $2)");
        clean = clean.replace(/([^\[\]()$]+)\s*;\s*([^\[\]()$]+)\s*\(\s*\]/g, "($1; $2]");
        clean = clean.replace(/([^\[\]()$]+)\s*;\s*([^\[\]()$]+)\s*\[\s*\]/g, "[$1; $2]");
        clean = clean.replace(/([^\[\]()$]+)\s*;\s*([^\[\]()$]+)\s*\(\s*\)/g, "($1; $2)");
        
        // Comma separator
        clean = clean.replace(/([^\[\]()$]+)\s*,\s*([^\[\]()$]+)\s*\[\s*\)/g, "[$1, $2)");
        clean = clean.replace(/([^\[\]()$]+)\s*,\s*([^\[\]()$]+)\s*\(\s*\]/g, "($1, $2]");
        
        // Wrap sđ / Sđ in unified text tags
        clean = clean.replace(/s\\text\{đ\}/g, "\\text{sđ}");
        clean = clean.replace(/S\\text\{đ\}/g, "\\text{Sđ}");
        
        // Fix MathType C_n^k notation: C_{nk} -> C_n^k (e.g. C_{42} → C_{4}^{2})
        // MTEF subscript template emits both the subscript index and superscript digits sequentially
        clean = clean.replace(/C_\{(\d+?)(\d)\}/g, "C_{$1}^{$2}");
        
        return clean;
    };

    interface TmplContext {
        selector: number;
        variation: number;
        lineCount: number;
        openedScript?: boolean;
        nonEmptyLinesCount?: number;
        startFence?: string;
        closeFence?: string;
        startFenceAppended?: boolean;
        startOutLen?: number;
        buffers?: string[];
    }

    /**
     * MTEF v5 / v7 Parser helper for MathType OLE binary objects (oleObject.bin)
     * Parses the binary stream record by record to extract clean LaTeX.
     */
    /**
     * Helper to extract the Equation Native stream from raw OLE compound buffer
     */
    const extractEquationNativeStream = (data: Uint8Array): Uint8Array | null => {
        if (!data || data.length < 512) return null;
        
        // Check OLE signature: D0 CF 11 E0 A1 B1 1A E1
        if (data[0] !== 0xD0 || data[1] !== 0xCF || data[2] !== 0x11 || data[3] !== 0xE0 ||
            data[4] !== 0xA1 || data[5] !== 0xB1 || data[6] !== 0x1A || data[7] !== 0xE1) {
            return null;
        }
        
        try {
            const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
            const sectorSize = 1 << view.getUint16(30, true);
            const miniSectorSize = 1 << view.getUint16(32, true);
            
            const dirStartSector = view.getUint32(48, true);
            const miniCutoff = view.getUint32(56, true);
            const miniFatStart = view.getUint32(60, true);
            
            // Load DIFAT (up to 109 sectors from header)
            const difat: number[] = [];
            for (let k = 0; k < 109; k++) {
                const s = view.getUint32(76 + k * 4, true);
                if (s < 0xFFFFFFFC) {
                    difat.push(s);
                }
            }
            
            // Load FAT sectors
            const fat: number[] = [];
            for (const s of difat) {
                const offset = (s + 1) * sectorSize;
                if (offset + sectorSize <= data.length) {
                    for (let k = 0; k < sectorSize; k += 4) {
                        fat.push(view.getUint32(offset + k, true));
                    }
                }
            }
            
            // Load Directory sectors
            let dirData = new Uint8Array(0);
            let curr = dirStartSector;
            while (curr !== 0xFFFFFFFE && curr < fat.length) {
                const offset = (curr + 1) * sectorSize;
                if (offset + sectorSize <= data.length) {
                    const nextDir = new Uint8Array(dirData.length + sectorSize);
                    nextDir.set(dirData);
                    nextDir.set(data.subarray(offset, offset + sectorSize), dirData.length);
                    dirData = nextDir;
                }
                curr = fat[curr];
            }
            
            // Parse Directory Entries to find Root Entry and Equation Native
            let rootStart = 0;
            let rootSize = 0;
            let eqStart = 0;
            let eqSize = 0;
            
            const dirView = new DataView(dirData.buffer, dirData.byteOffset, dirData.byteLength);
            
            // Root Entry is always entry 0 (first 128 bytes)
            if (dirData.length >= 128) {
                rootStart = dirView.getUint32(116, true);
                rootSize = dirView.getUint32(120, true);
            }
            
            // Find Equation Native
            for (let i = 1; i * 128 < dirData.length; i++) {
                const offset = i * 128;
                const nameLen = dirView.getUint16(offset + 64, true);
                if (nameLen > 2) {
                    let name = "";
                    for (let k = 0; k < nameLen - 2; k += 2) {
                        name += String.fromCharCode(dirView.getUint16(offset + k, true));
                    }
                    if (name === "Equation Native") {
                        eqStart = dirView.getUint32(offset + 116, true);
                        eqSize = dirView.getUint32(offset + 120, true);
                        break;
                    }
                }
            }
            
            if (eqSize === 0) return null;
            
            // Load Mini FAT
            let miniFatData = new Uint8Array(0);
            curr = miniFatStart;
            while (curr !== 0xFFFFFFFE && curr < fat.length) {
                const offset = (curr + 1) * sectorSize;
                if (offset + sectorSize <= data.length) {
                    const nextMini = new Uint8Array(miniFatData.length + sectorSize);
                    nextMini.set(miniFatData);
                    nextMini.set(data.subarray(offset, offset + sectorSize), miniFatData.length);
                    miniFatData = nextMini;
                }
                curr = fat[curr];
            }
            
            const miniFat: number[] = [];
            if (miniFatData.length > 0) {
                const mfView = new DataView(miniFatData.buffer, miniFatData.byteOffset, miniFatData.byteLength);
                for (let k = 0; k < miniFatData.length; k += 4) {
                    miniFat.push(mfView.getUint32(k, true));
                }
            }
            
            // Load Mini Stream Data
            let miniStream = new Uint8Array(0);
            curr = rootStart;
            while (curr !== 0xFFFFFFFE && curr < fat.length) {
                const offset = (curr + 1) * sectorSize;
                if (offset + sectorSize <= data.length) {
                    const nextStream = new Uint8Array(miniStream.length + sectorSize);
                    nextStream.set(miniStream);
                    nextStream.set(data.subarray(offset, offset + sectorSize), miniStream.length);
                    miniStream = nextStream;
                }
                curr = fat[curr];
            }
            
            // Read Equation Native Stream data
            const eqData = new Uint8Array(eqSize);
            let bytesRead = 0;
            
            if (eqSize < miniCutoff) {
                // Read from Mini Stream
                curr = eqStart;
                while (curr !== 0xFFFFFFFE && curr < miniFat.length && bytesRead < eqSize) {
                    const offset = curr * miniSectorSize;
                    const toRead = Math.min(miniSectorSize, eqSize - bytesRead);
                    if (offset + toRead <= miniStream.length) {
                        eqData.set(miniStream.subarray(offset, offset + toRead), bytesRead);
                        bytesRead += toRead;
                    }
                    curr = miniFat[curr];
                }
            } else {
                // Read from FAT
                curr = eqStart;
                while (curr !== 0xFFFFFFFE && curr < fat.length && bytesRead < eqSize) {
                    const offset = (curr + 1) * sectorSize;
                    const toRead = Math.min(sectorSize, eqSize - bytesRead);
                    if (offset + toRead <= data.length) {
                        eqData.set(data.subarray(offset, offset + toRead), bytesRead);
                        bytesRead += toRead;
                    }
                    curr = fat[curr];
                }
            }
            
            return eqData;
        } catch (e) {
            console.error("Error extracting OLE stream", e);
            return null;
        }
    };

    const parseMtefBuffer = (rawBuf: Uint8Array): string => {
        if (!rawBuf) return "";
        const buf = extractEquationNativeStream(rawBuf) || rawBuf;
        if (buf.length < 30) return "";
        
        // Find DSMT signature
        let dsmtIdx = -1;
        for (let k = 0; k < buf.length - 4; k++) {
            if (buf[k] === 68 && buf[k+1] === 83 && buf[k+2] === 77 && buf[k+3] === 84) {
                dsmtIdx = k;
                break;
            }
        }
        if (dsmtIdx === -1) return "";
        let mtefVer = 3;
        if (dsmtIdx >= 5) {
            const v5 = buf[dsmtIdx - 5];
            const v4 = buf[dsmtIdx - 4];
            if (v5 === 3 || v5 === 5) {
                mtefVer = v5;
            } else if (v4 === 3 || v4 === 5) {
                mtefVer = v4;
            }
        }

        // Find the end of the font list (MT Extra\0)
        let startIdx = -1;
        for (let k = dsmtIdx; k < buf.length - 9; k++) {
            if (
                buf[k] === 77 && buf[k+1] === 84 && buf[k+2] === 32 &&
                buf[k+3] === 69 && buf[k+4] === 120 && buf[k+5] === 116 &&
                buf[k+6] === 114 && buf[k+7] === 97 && buf[k+8] === 0
            ) {
                startIdx = k + 9;
                break;
            }
        }
        if (startIdx === -1) {
            startIdx = dsmtIdx + 30; // Fallback
        }

        // Helper to read/skip nudge
        const skipNudge = (idx: number, opts: number): number => {
            if (opts & 0x08) { // mtefOPT_NUDGE
                let cur = idx;
                if (cur >= buf.length) return buf.length;
                
                // MTEF v3 nudges are always 2 bytes (8-bit signed)
                if (mtefVer === 3) {
                    return cur + 2;
                }
                
                // MTEF v5 can have 16-bit nudges starting with 128
                const dxVal = buf[cur];
                if (dxVal === 128) {
                    cur += 3;
                } else {
                    cur += 1;
                }
                if (cur >= buf.length) return buf.length;
                const dyVal = buf[cur];
                if (dyVal === 128) {
                    cur += 3;
                } else {
                    cur += 1;
                }
                return cur;
            }
            return idx;
        };

        const FENCE_SYMBOLS: Record<number, [string, string]> = {
            1: ["(", ")"],
            2: ["\\{", "\\}"],
            3: ["[", "]"],
            4: ["|", "|"],
            5: ["\\|", "\\|"],
            6: ["\\lfloor ", "\\rfloor "],
            7: ["\\lceil ", "\\rceil "],
            8: ["\\langle ", "\\rangle "]
        };

        const mathTypeSymbolMap: Record<number, string> = {
            // Basic symbols
            0x2032: "'",
            162: "'",
            176: "^{\\circ}",
            272: "\\text{Đ}",
            273: "\\text{đ}",
            8747: "\\int ",
            8748: "\\iint ",
            8749: "\\iiint ",
            8750: "\\oint ",
            92: "\\setminus ",
            0x2212: "-",
            0x221e: "\\infty ",
            0x2265: "\\ge ",
            0x2264: "\\le ",
            0x2208: "\\in ",
            0x21d2: "\\Rightarrow ",
            0x21d4: "\\Leftrightarrow ",
            0x2260: "\\neq ",
            0x00b1: "\\pm ",
            0x2205: "\\emptyset ",
            0x2192: "\\rightarrow ",
            0x221a: "\\sqrt ",
            0x2248: "\\approx ",
            0x2261: "\\equiv ",
            0x223c: "\\sim ",
            0x2220: "\\angle ",
            0x22a5: "\\perp ",
            0x2225: "\\parallel ",
            
            // Greek Lowercase
            0x03c0: "\\pi ",
            0x03b1: "\\alpha ",
            0x03b2: "\\beta ",
            0x03b3: "\\gamma ",
            0x03b4: "\\delta ",
            0x03b5: "\\epsilon ",
            0x03b6: "\\zeta ",
            0x03b7: "\\eta ",
            0x03b8: "\\theta ",
            0x03b9: "\\iota ",
            0x03ba: "\\kappa ",
            0x03bb: "\\lambda ",
            0x03bc: "\\mu ",
            0x03bd: "\\nu ",
            0x03be: "\\xi ",
            0x03c1: "\\rho ",
            0x03c2: "\\varsigma ",
            0x03c3: "\\sigma ",
            0x03c4: "\\tau ",
            0x03c5: "\\upsilon ",
            0x03c6: "\\phi ",
            0x03c7: "\\chi ",
            0x03c8: "\\psi ",
            0x03c9: "\\omega ",
            
            // Greek Uppercase
            0x0393: "\\Gamma ",
            0x0394: "\\Delta ",
            0x0398: "\\Theta ",
            0x039b: "\\Lambda ",
            0x039e: "\\Xi ",
            0x03a0: "\\Pi ",
            0x03a3: "\\Sigma ",
            0x03a5: "\\Upsilon ",
            0x03a6: "\\Phi ",
            0x03a8: "\\Psi ",
            0x03a9: "\\Omega ",
            
            // Double-struck / Sets
            0x211d: "\\mathbb{R}",
            0x2124: "\\mathbb{Z}",
            0x2115: "\\mathbb{N}",
            0x211a: "\\mathbb{Q}",
            0x2102: "\\mathbb{C}",
            
            // Relations / Set operations
            0x2209: "\\notin ",
            0x2282: "\\subset ",
            0x2283: "\\supset ",
            0x222a: "\\cup ",
            0x2229: "\\cap ",
            0x2200: "\\forall ",
            0x2203: "\\exists ",
            0x2194: "\\leftrightarrow ",
            0x21d0: "\\Leftarrow ",

            // Set difference / exclusion
            0x2216: "\\setminus ",   // ∖ set difference (used in "R \ { ... }")
            0x2223: "|",              // ∣ vertical divider / divides

            // Curly braces as content characters (in set notation)
            0x7b: "\\{",
            0x7d: "\\}",

            // Trig functions (text-mode fallback)
            0x74: "t",
            0x61: "a",
            0x6e: "n",
        };

        let i = startIdx;
        let out = "";
        
        // Track templates and container stack
        const tmplStack: TmplContext[] = [];
        const containerStack: ("LINE" | "TMPL")[] = [];
        let indent = 0;
        let hasStarted = false;
        let propertyCharsToSkip = 0;

        const ensureStartFences = (): void => {
            for (let k = 0; k < tmplStack.length; k++) {
                const tmpl = tmplStack[k];
                if (!tmpl.startFenceAppended && tmpl.startFence) {
                    out += tmpl.startFence;
                    tmpl.startFenceAppended = true;
                }
            }
        };

        while (i < buf.length - 1) {
            const tag = buf[i];
            
            if (tag === 0) { // END
                i += 1;
                if (hasStarted) {
                    const lastContainer = containerStack.pop();
                    if (lastContainer !== "EMBELL") {
                        indent -= 1;
                    }
                    if (lastContainer === "LINE") {
                        if (tmplStack.length > 0) {
                            const tmpl = tmplStack[tmplStack.length - 1];
                            if (tmpl.selector === 15) {
                                const startLen = tmpl.startOutLen ?? 0;
                                const lineContent = out.substring(startLen);
                                out = out.substring(0, startLen);
                                tmpl.buffers = tmpl.buffers || [];
                                tmpl.buffers.push(lineContent);
                            }
                        }
                    }
                    if (lastContainer === "TMPL" && tmplStack.length > 0) {
                        const tmpl = tmplStack.pop()!;
                        if (tmpl.openedScript) {
                            out += "}";
                        } else {
                            if (tmpl.startFenceAppended && tmpl.closeFence) {
                                out += tmpl.closeFence;
                            }
                            if (tmpl.selector >= 1 && tmpl.selector <= 8) {
                                const isLeftOnly = tmpl.variation === 1;
                                const isRightOnly = tmpl.variation === 2;
                                if (isLeftOnly || isRightOnly) {
                                    propertyCharsToSkip += 1;
                                }
                            }
                        }
                        if (tmpl.lineCount > 0 && !tmpl.openedScript) {
                            if (tmpl.selector === 10) { // Radical nth root
                                if (tmpl.variation === 1) {
                                    out += "}";
                                }
                            } else if (tmpl.selector === 23) {
                                // Limit layout, no closing symbols needed
                            } else if (tmpl.selector === 11) { // Fraction
                                out += "}";
                            } else if (tmpl.selector === 31 || tmpl.selector === 33) { // Arrow & Hat templates
                                out += "}";
                            }
                        }
                        if (tmpl.selector === 15) { // Integral template assembly
                            const integrand = tmpl.buffers?.[0] || "";
                            const lower = tmpl.buffers?.[1] || "";
                            const upper = tmpl.buffers?.[2] || "";
                            let integralLatex = "\\int";
                            if (lower || upper) {
                                integralLatex += `_{${lower}}^{${upper}}`;
                            }
                            integralLatex += `{${integrand}}`;
                            out += integralLatex;
                        }
                    }
                }
                continue;
            }
            
            // Structure records (tags 1 to 7)
            if (tag >= 1 && tag <= 7) {
                const opts = buf[i+1];
                let idx = i + 2;
                idx = skipNudge(idx, opts);
                
                if (tag === 1) { // LINE
                    if (opts & 0x02) {
                        idx += 1; // skip ruler index
                    }
                    
                    const isNull = (opts & 0x01) !== 0;
                    
                    if (!hasStarted) {
                        hasStarted = true;
                    }
                    if (!isNull) {
                        containerStack.push("LINE");
                        indent += 1;
                    }
                    
                    // Increment line count for the current template
                    if (tmplStack.length > 0) {
                        const tmpl = tmplStack[tmplStack.length - 1];
                        tmpl.lineCount += 1;
                        if (tmpl.selector === 15) {
                            tmpl.startOutLen = out.length;
                            if (!tmpl.buffers) {
                                tmpl.buffers = [];
                            }
                        }
                        
                        if (!isNull) {
                            const hasPrefix = tmpl.selector === 10 || tmpl.selector === 23 || tmpl.selector === 27 || tmpl.selector === 28 || tmpl.selector === 29 || tmpl.selector === 11;
                            if (hasPrefix) {
                                ensureStartFences();
                            }
                            
                            // Formatting based on line index
                            if (tmpl.selector === 10) { // Radical nth root
                                if (tmpl.variation === 1) {
                                    if (tmpl.lineCount === 1) {
                                        out += "\\sqrt[";
                                    } else if (tmpl.lineCount === 2) {
                                        out += "]{";
                                    }
                                }
                            } else if (tmpl.selector === 23) { // Limit / Big Operator layout
                                if (tmpl.lineCount === 2) {
                                    out += "\\limits_{";
                                    tmpl.openedScript = true;
                                } else if (tmpl.lineCount === 3) {
                                    if (tmpl.openedScript) {
                                        out += "}";
                                        tmpl.openedScript = false;
                                    }
                                    out += "^{";
                                    tmpl.openedScript = true;
                                }
                            } else if (tmpl.selector === 27) { // Sub-superscript
                                if (tmpl.lineCount === 1) {
                                    out += "_{";
                                    tmpl.openedScript = true;
                                } else if (tmpl.lineCount === 2) {
                                    out += "}^{";
                                    tmpl.openedScript = true;
                                }
                            } else if (tmpl.selector === 29) { // Subscript
                                if (tmpl.lineCount === 1) {
                                    out += "_{";
                                    tmpl.openedScript = true;
                                }
                            } else if (tmpl.selector === 28) { // Superscript
                                if (tmpl.lineCount === 1) {
                                    out += "^{";
                                    tmpl.openedScript = true;
                                }
                            } else if (tmpl.selector === 11) { // Fraction
                                if (tmpl.lineCount === 1) {
                                    out += "\\frac{";
                                } else if (tmpl.lineCount === 2) {
                                    out += "}{";
                                }
                            } else if (tmpl.selector === 31) { // Arrow template
                                if (tmpl.lineCount === 1) {
                                    if (tmpl.variation === 1) {
                                        out += "\\overleftarrow{";
                                    } else if (tmpl.variation === 3) {
                                        out += "\\overleftrightarrow{";
                                    } else {
                                        out += "\\overrightarrow{";
                                    }
                                }
                            } else if (tmpl.selector === 33) { // Hat/Arc/Angle template
                                if (tmpl.lineCount === 1) {
                                    out += "\\widehat{";
                                }
                            } else if (tmpl.selector >= 1 && tmpl.selector <= 8) { // Fence case layouts
                                const isLeftOnly = tmpl.variation === 1;
                                const isRightOnly = tmpl.variation === 2;
                                if (isLeftOnly || isRightOnly) {
                                    const nonEmpty = tmpl.nonEmptyLinesCount || 0;
                                    if (nonEmpty > 0) {
                                        out += " \\\\ ";
                                    }
                                    tmpl.nonEmptyLinesCount = nonEmpty + 1;
                                }
                            }
                        }
                    }
                    
                    i = idx;
                    continue;
                }
                
                if (tag === 2) { // CHAR
                    if (idx >= buf.length) break;
                    const typeface = buf[idx];
                    idx += 1;
                    
                    let mtcode = 0;
                    if (!(opts & 0x20)) { // mtefOPT_CHAR_ENC_NO_MTCODE
                        if (idx + 1 >= buf.length) break;
                        mtcode = buf[idx] + (buf[idx+1] << 8);
                        idx += 2;
                    }
                    
                    // Skip character font positions if present
                    let char8: number | null = null;
                    if (opts & 0x04) { // mtefOPT_CHAR_ENC_CHAR_8
                        char8 = buf[idx];
                        idx += 1;
                    }
                    let char16: number | null = null;
                    if (opts & 0x10) { // mtefOPT_CHAR_ENC_CHAR_16
                        char16 = buf[idx] + (buf[idx+1] << 8);
                        idx += 2;
                    }
                    
                    // Track embellishments list to let main loop parse them
                    if (opts & 0x01) {
                        containerStack.push("EMBELL");
                    }
                    
                    if (hasStarted) {
                        const charCode = mtcode > 0 ? mtcode : (char8 !== null ? char8 : (char16 !== null ? char16 : 0));
                        
                        const isInsideLine = containerStack.length > 0 && containerStack[containerStack.length - 1] === "LINE";
                        const isBracket = charCode === 40 || charCode === 41 || charCode === 91 || charCode === 93 || charCode === 60423 || charCode === 60424;
                        
                        if (charCode > 0) {
                            if (isBracket && propertyCharsToSkip > 0) {
                                propertyCharsToSkip -= 1;
                            } else if (isBracket && !isInsideLine) {
                                // Skip template property bracket characters
                            } else {
                                let charStr = "";
                                const isIntegChar = charCode === 8747 || charCode === 8748 || charCode === 8749 || charCode === 8750;
                                const isInsideIntegral = tmplStack.some(t => t.selector === 15);
                                if (isIntegChar && isInsideIntegral) {
                                    // skip duplicate integral symbol character
                                } else if (mathTypeSymbolMap[charCode] !== undefined) {
                                    charStr = mathTypeSymbolMap[charCode];
                                } else if (charCode >= 57344 && charCode <= 63743) {
                                    charStr = " ";
                                } else if ((charCode & 0xFF) === 0x78 || (charCode >> 8) === 0x78) {
                                    charStr = "x";
                                } else if ((charCode & 0xFF) === 0x71 || (charCode >> 8) === 0x71) {
                                    charStr = "x";
                                } else if (charCode >= 32 && charCode < 127) {
                                    charStr = String.fromCharCode(charCode);
                                }
                                
                                if (charStr) {
                                    ensureStartFences();
                                    out += charStr;
                                }
                            }
                        }
                    }
                    
                    i = idx;
                    continue;
                }
                
                if (tag === 3) { // TMPL
                    if (idx + 2 >= buf.length) break;
                    const selector = buf[idx];
                    const variation = buf[idx+1] + (buf[idx+2] << 8);
                    
                    if (hasStarted) {
                        let startFence = "";
                        let closeFence = "";
                        if (selector === 10) { // Radical
                            if (variation === 0) {
                                startFence = "\\sqrt{";
                                closeFence = "}";
                            }
                        } else if (selector >= 1 && selector <= 8) {
                            const isLeftOnly = variation === 1;
                            const isRightOnly = variation === 2;
                            if (isLeftOnly) {
                                startFence = `\\left${FENCE_SYMBOLS[selector][0]} \\begin{matrix} `;
                                closeFence = " \\end{matrix} \\right.";
                            } else if (isRightOnly) {
                                startFence = "\\left. \\begin{matrix} ";
                                const closeSym = FENCE_SYMBOLS[selector][1];
                                closeFence = ` \\end{matrix} \\right${closeSym}`;
                            } else {
                                startFence = FENCE_SYMBOLS[selector][0];
                                closeFence = FENCE_SYMBOLS[selector][1];
                            }
                        } else if (selector === 9) { // Interval template
                            if (variation === 16) {
                                startFence = "[";
                                closeFence = "]";
                            } else if (variation === 32) {
                                startFence = "[";
                                closeFence = ")";
                            } else if (variation === 48) {
                                startFence = "(";
                                closeFence = "]";
                            } else if (variation === 64) {
                                startFence = "(";
                                closeFence = ")";
                            } else {
                                startFence = "(";
                                closeFence = ")";
                            }
                        }
                        
                        tmplStack.push({
                            selector,
                            variation,
                            lineCount: 0,
                            openedScript: false,
                            nonEmptyLinesCount: 0,
                            startFence,
                            closeFence,
                            startFenceAppended: false
                        });
                        containerStack.push("TMPL");
                        indent += 1;
                    }
                    
                    i = idx + 3;
                    continue;
                }
                
                if (tag === 6) { // EMBELL
                    if (idx >= buf.length) break;
                    const embellType = buf[idx];
                    idx += 1;
                    
                    if (hasStarted) {
                        const EMBELL_MAP: Record<number, [string, string]> = {
                            1: ["\\dot{", "}"],          // emb1DOT
                            2: ["\\ddot{", "}"],         // emb2DOT
                            3: ["\\dddot{", "}"],        // emb3DOT
                            4: ["\\ddddot{", "}"],       // emb4DOT
                            5: ["", "'"],                // emb1PRIME (single prime)
                            6: ["", "''"],               // emb2PRIME (double prime)
                            7: ["", "'''"],              // emb3PRIME (triple prime)
                            8: ["\\tilde{", "}"],        // embTILDE
                            9: ["\\hat{", "}"],          // embHAT
                            11: ["\\vec{", "}"],         // embRARROW (vector)
                            12: ["\\overleftarrow{", "}"], // embLARROW
                            13: ["\\overleftrightarrow{", "}"], // embDARROW
                            14: ["\\overline{", "}"],    // embOBAR
                            15: ["\\underline{", "}"],   // embUBAR
                            17: ["\\overline{", "}"]     // embOBAR (alternative)
                        };
                        
                        if (EMBELL_MAP[embellType] !== undefined) {
                            const [prefix, suffix] = EMBELL_MAP[embellType];
                            const lastTokenRegex = /(\\[a-zA-Z]+(?:\s*\{[^}]*\})*|\\[a-zA-Z]+\s*|[\s\S])$/;
                            const match = out.match(lastTokenRegex);
                            if (match) {
                                const lastToken = match[1];
                                const startIdx = match.index ?? 0;
                                let wrapped = `${prefix}${lastToken.trim()}${suffix}`;
                                if (lastToken.endsWith(" ")) {
                                    wrapped += " ";
                                }
                                out = out.substring(0, startIdx) + wrapped;
                            }
                        }
                    }
                    
                    i = idx;
                    continue;
                }
                
                // Other structure tags skipping
                if (tag === 4) idx += 2; // halign, valign
                else if (tag === 5) idx += 4; // row_spacing, col_spacing, rows, cols
                i = idx;
                continue;
            }
            
            // Style/definition records (no options, no nudge!)
            let idx = i + 1;
            if (tag === 8) { // FONT_STYLE_DEF
                idx += 1; // fontDefIndex
                while (idx < buf.length && buf[idx] !== 0) {
                    idx += 1;
                }
                idx += 1; // skip null byte
            } else if (tag === 17) { // FONT_DEF
                idx += 1; // encDefIndex
                while (idx < buf.length && buf[idx] !== 0) {
                    idx += 1;
                }
                idx += 1; // skip null byte
            } else if (tag === 9) { // SIZE
                idx += 2; // lsize, dsize
            } else if (tag === 10 || tag === 11 || tag === 12 || tag === 13 || tag === 14) { // FULL, SUB, SUB2, SYM, SUBSYM
                // 1-byte size change tags, no payload!
                if (tag === 10) {
                    if (tmplStack.length > 0) {
                        const tmpl = tmplStack[tmplStack.length - 1];
                        if (tmpl.selector === 27 || tmpl.selector === 28 || tmpl.selector === 29) {
                            if (tmpl.openedScript) {
                                out += "}";
                            }
                            tmplStack.pop();
                            const tmplIdx = containerStack.lastIndexOf("TMPL");
                            if (tmplIdx !== -1) {
                                containerStack.splice(tmplIdx, 1);
                            }
                        }
                    }
                }
            } else if (tag === 15) { // COLOR selects color index
                idx += 1;
            } else if (tag === 16) { // COLOR_DEF defines color name string
                if (idx < buf.length) {
                    const opts = buf[idx];
                    idx += 1;
                    if (opts & 0x01) {
                        idx += 4; // CMYK
                    } else {
                        idx += 3; // RGB
                    }
                    while (idx < buf.length && buf[idx] !== 0) {
                        idx += 1;
                    }
                    idx += 1; // skip null byte
                }
            } else if (tag === 18) { // EQN_PREFS
                if (idx < buf.length) {
                    // Skip options byte (buf[idx], which is buf[i+1] since idx started at i+1)
                    idx += 1; 
                    if (idx < buf.length) {
                        const S_sz = buf[idx];
                        idx += 1 + ((S_sz + 1) >> 1); // skip sizes count and data
                        if (idx < buf.length) {
                            const S_sp = buf[idx];
                            idx += 1 + ((S_sp + 1) >> 1); // skip spaces count and data
                            idx += 16; // skip styles
                        }
                    }
                }
            } else {
                idx = i + 1; // default fallback skip
            }
            
            i = idx;
        }
        
        // Close any unclosed scopes to be safe
        while (tmplStack.length > 0) {
            const tmpl = tmplStack.pop()!;
            if (tmpl.openedScript) {
                out += "}";
            } else {
                if (tmpl.startFenceAppended && tmpl.closeFence) {
                    out += tmpl.closeFence;
                }
                if (tmpl.selector >= 1 && tmpl.selector <= 8) {
                    const isLeftOnly = tmpl.variation === 1;
                    const isRightOnly = tmpl.variation === 2;
                    if (isLeftOnly || isRightOnly) {
                        propertyCharsToSkip += 1;
                    }
                }
            }
            if (tmpl.lineCount > 0 && !tmpl.openedScript) {
                if (tmpl.selector === 10) {
                    if (tmpl.variation === 1) {
                        out += "}";
                    }
                } else if (tmpl.selector === 23) {
                    // Limit layout, handled by openedScript block
                } else if (tmpl.selector === 11) {
                    out += "}";
                } else if (tmpl.selector === 31 || tmpl.selector === 33) {
                    out += "}";
                }
            }
        }
        
        // Clean control characters like \x0c (Form Feed) in the output LaTeX
        let cleanedOut = out.replace(/\u000c/g, "\\f");

        // Map common functions to LaTeX syntax (e.g., lim, sin, cos)
        const funcs = ["lim", "sin", "cos", "tan", "log", "ln", "max", "min"];
        for (const func of funcs) {
            const regex = new RegExp(`\\b${func}\\b`, "g");
            cleanedOut = cleanedOut.replace(regex, `\\${func}`);
        }
        
        return cleanedOut ? `$${cleanedOut}$` : "";
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

    // Helper to recursively parse OMML XML nodes and convert them to standard LaTeX
    const convertOmmlToLatex = (node: Node): string => {
        if (node.nodeType === 3) { // Text Node
            return node.textContent || "";
        }
        if (node.nodeType !== 1) { // Not an Element
            return "";
        }

        const tagName = node.nodeName.replace(/^m:/, "");

        switch (tagName) {
            case "oMath": {
                let result = "";
                node.childNodes.forEach((child) => {
                    result += convertOmmlToLatex(child);
                });
                return `$${result}$`;
            }
            case "r": {
                let text = "";
                node.childNodes.forEach((child) => {
                    const childName = child.nodeName.replace(/^m:/, "");
                    if (childName === "t") {
                        text += child.textContent || "";
                    }
                });
                return text;
            }
            case "f": { // Fraction
                let num = "";
                let den = "";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "num") num = convertOmmlToLatex(child);
                    if (name === "den") den = convertOmmlToLatex(child);
                });
                return `\\frac{${num}}{${den}}`;
            }
            case "sSup": { // Superscript
                let base = "";
                let sup = "";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") base = convertOmmlToLatex(child);
                    if (name === "sup") sup = convertOmmlToLatex(child);
                });
                return `${base}^{${sup}}`;
            }
            case "sSub": { // Subscript
                let base = "";
                let sub = "";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") base = convertOmmlToLatex(child);
                    if (name === "sub") sub = convertOmmlToLatex(child);
                });
                return `${base}_{${sub}}`;
            }
            case "sSubSup": { // Sub-superscript
                let base = "";
                let sub = "";
                let sup = "";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") base = convertOmmlToLatex(child);
                    if (name === "sub") sub = convertOmmlToLatex(child);
                    if (name === "sup") sup = convertOmmlToLatex(child);
                });
                return `${base}_{${sub}}^{${sup}}`;
            }
            case "rad": { // Square root
                let base = "";
                let deg = "";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") base = convertOmmlToLatex(child);
                    if (name === "deg") deg = convertOmmlToLatex(child);
                });
                if (deg) {
                    return `\\sqrt[${deg}]{${base}}`;
                }
                return `\\sqrt{${base}}`;
            }
            case "d": { // Parentheses / fences
                let content = "";
                let open = "(";
                let close = ")";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") {
                        content = convertOmmlToLatex(child);
                    } else if (name === "dPr") {
                        for (let j = 0; j < child.childNodes.length; j++) {
                            const dPrChild = child.childNodes[j];
                            const dPrChildName = dPrChild.nodeName.replace(/^m:/, "");
                            if (dPrChildName === "begCh" || dPrChildName === "beg") {
                                open = (dPrChild as Element).getAttribute("m:val") || (dPrChild as Element).getAttribute("val") || "(";
                            } else if (dPrChildName === "endCh" || dPrChildName === "end") {
                                close = (dPrChild as Element).getAttribute("m:val") || (dPrChild as Element).getAttribute("val") || ")";
                            }
                        }
                    }
                });
                return `\\left${open}${content}\\right${close}`;
            }
            case "nary": { // Sum, Integral
                let base = "";
                let sub = "";
                let sup = "";
                let op = "\\sum";
                node.childNodes.forEach((child) => {
                    const name = child.nodeName.replace(/^m:/, "");
                    if (name === "e") base = convertOmmlToLatex(child);
                    if (name === "sub") sub = convertOmmlToLatex(child);
                    if (name === "sup") sup = convertOmmlToLatex(child);
                    if (name === "naryPr") {
                        for (let j = 0; j < child.childNodes.length; j++) {
                            const naryChild = child.childNodes[j];
                            const naryChildName = naryChild.nodeName.replace(/^m:/, "");
                            if (naryChildName === "chr") {
                                const val = (naryChild as Element).getAttribute("m:val") || (naryChild as Element).getAttribute("val");
                                if (val === "∫") op = "\\int";
                                else if (val === "∏") op = "\\prod";
                            }
                        }
                    }
                });
                return `${op}_{${sub}}^{${sup}}{${base}}`;
            }
            default: {
                let result = "";
                node.childNodes.forEach((child) => {
                    result += convertOmmlToLatex(child);
                });
                return result;
            }
        }
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
                if (idMatch && targetMatch) {
                    const target = targetMatch[1];
                    if (target.includes("oleObject") || target.endsWith(".wmf")) {
                        rIdToTarget[idMatch[1]] = target.replace(/^word\//, "");
                    }
                }
            });
        }

        // 2. Parse MTEF equations from OLE & WMF targets
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

        // Substitute wmf drawing tags with escaped plain text tags
        docXml = docXml.replace(/<w:drawing>[\s\S]*?<a:blip[^>]+r:(?:embed|link)="([^"]+)"[\s\S]*?<\/w:drawing>/g, (match, rId) => {
            const eq = oleEquMap[rId];
            if (eq) {
                const escaped = escapeXml(eq);
                return `<w:r><w:t xml:space="preserve"> ${escaped} </w:t></w:r>`;
            }
            return match;
        });

        // 4. Parse native OMML equations using the DOM parser
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(docXml, "application/xml");
            
            // Find all oMath elements
            const oMathElements = xmlDoc.getElementsByTagNameNS("http://schemas.openxmlformats.org/officeDocument/2006/math", "oMath");
            const elementsList = oMathElements.length > 0 
                ? Array.from(oMathElements) 
                : Array.from(xmlDoc.querySelectorAll("oMath, m\\:oMath"));

            elementsList.forEach((el) => {
                const latex = convertOmmlToLatex(el);
                if (latex) {
                    const wR = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
                    const wT = xmlDoc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
                    wT.setAttribute("xml:space", "preserve");
                    wT.textContent = ` ${latex} `;
                    wR.appendChild(wT);
                    el.parentNode?.replaceChild(wR, el);
                }
            });

            const serializer = new XMLSerializer();
            docXml = serializer.serializeToString(xmlDoc);
        } catch (ommlErr) {
            console.error("Error parsing OMML math tags, falling back to regex mapping:", ommlErr);
            docXml = docXml.replace(/<m:t([^>]*)>/g, '<w:t$1>').replace(/<\/m:t>/g, '</w:t>');
        }

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
                            let clean = opt.trim();
                            // If it starts with <p> and ends with </p>, strip them
                            if (clean.startsWith("<p>") && clean.endsWith("</p>")) {
                                clean = clean.substring(3, clean.length - 4).trim();
                            }
                            
                            // Strip leading strong/b/span wrappers around the option letter,
                            // allowing unmatched opening tags (A, B, C, D followed by dot, colon, bracket, dash)
                            // Note: Avoid stripping plain space options like 'A ' that match words starting with option letters.
                            clean = clean.replace(/^(?:<(?:strong|b|span|p|em|i|u)[^>]*>)*\s*[A-D\(\)a-d][\.\:\-\)]\s*(?:<\/(?:strong|b|span|p|em|i|u)>)*\s*/i, "");
                            
                            // Clean up unbalanced inline tags left over from splits
                            const tags = ["strong", "b", "span", "em", "i", "u"];
                            tags.forEach(tag => {
                                const openReg = new RegExp(`<${tag}[^>]*>`, "gi");
                                const closeReg = new RegExp(`</${tag}>`, "gi");
                                const openCount = (clean.match(openReg) || []).length;
                                const closeCount = (clean.match(closeReg) || []).length;
                                
                                if (closeCount > openCount) {
                                    clean = clean.replace(new RegExp(`</${tag}>\\s*$`, "i"), "");
                                } else if (openCount > closeCount) {
                                    clean = clean.replace(new RegExp(`^\\s*<${tag}[^>]*>`, "i"), "");
                                }
                            });
                            
                            return clean.trim();
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

            // Flatten all OL/UL lists in the body to make LI elements top-level children of body
            const lists = Array.from(body.querySelectorAll("ol, ul"));
            lists.forEach((list) => {
                const parent = list.parentNode;
                if (parent) {
                    while (list.firstChild) {
                        parent.insertBefore(list.firstChild, list);
                    }
                    parent.removeChild(list);
                }
            });

            const children = Array.from(body.childNodes);

            for (let i = 0; i < children.length; i++) {
                const node = children[i] as HTMLElement;
                if (node.nodeType !== 1) continue; // Skip raw text nodes

                const text = node.textContent?.trim() || "";
                const htmlContent = node.outerHTML;

                // Detect Section Headers
                const partMatch = text.match(/^Phần\s*(\d+)/i);
                if (partMatch) {
                    const partNum = partMatch[1];
                    pushCurrentQuestion();
                    currentSection = text; // Keep exact wording from the document
                    if (partNum === "1") {
                        currentType = "single_choice";
                    } else if (partNum === "2") {
                        currentType = "true_false";
                    } else {
                        currentType = "short_answer";
                    }
                    continue;
                }

                // Detect question start boundary
                const isQuestionStart = 
                    /^(Câu|Bài)\s*\d+/i.test(text) || 
                    /^(Câu|Bài)\s*[\:\.]/i.test(text) || 
                    node.tagName === "LI";

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

                // Detect explanation tag
                const isExplanationStart = 
                    /^(Lời giải|Bài giải|Lời giải chi tiết)/i.test(text) || 
                    /^Hướng dẫn/i.test(text) || 
                    /^Chọn[\s\.\:\-]*(?:đáp\s+án\s+)?[A-D]/i.test(text) ||
                    /^Đáp án/i.test(text);
                if (isExplanationStart) {
                    inExplanation = true;
                    explanationHtmls.push(htmlContent);
                    continue;
                }

                if (inExplanation) {
                    explanationHtmls.push(htmlContent);
                    continue;
                }

                // Check option paragraph (A. B. C. D.)
                const hasOptions = /^[A-D][\.\:\-\)]\s*/i.test(text) || /<strong>\s*[A-D][\.\:\-\)]\s*<\/strong>/i.test(htmlContent) || /A[\.\:\-\)]\s*.*B[\.\:\-\)]\s*.*C[\.\:\-\)]\s*.*D/i.test(text);

                if (hasOptions && currentType === "single_choice") {
                    const optMatches = htmlContent.split(/(?=<p>)?(?=<strong>\s*[A-D][\.\:\-\)])|(?<=\s|^|>)(?=[A-D][\.\:\-\)]\s*)/gi);
                    const filteredOpts = optMatches
                        .map(o => o.replace(/<\/p>|<p>/g, "").trim())
                        .filter(o => /^[A-D][\.\:\-\)]/i.test(o.replace(/<[^>]+>/g, "").trim()));

                    if (filteredOpts.length >= 2) {
                        currentQuestion.options = [...(currentQuestion.options || []), ...filteredOpts];
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

                // Otherwise, append to question text
                currentQuestion.text += htmlContent;
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

        // Extract filename without extension as suggestion
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setFileName(nameWithoutExt);

        setLoadingFile(true);
        setError(null);

        try {
            if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
                const arrayBuffer = await file.arrayBuffer();

                // Preprocess docx buffer client-side (OMML math & MathType OLE formulas)
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
                const html = htmlResult.value.replace(/<img src=""\s*\/?>/g, '');

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
        onQuestionsParsed(parsedQuestions, fileName);
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
                    <button
                        disabled={!rawText}
                        onClick={() => setActiveTab("raw")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === "raw" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400"
                        }`}
                    >
                        3. Dữ liệu gốc sau đọc Word
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
            {activeTab === "preview" && parsedQuestions.length > 0 && (
                <div className="w-full relative flex-1 min-h-0 flex flex-col xl:flex-row xl:justify-center xl:items-start gap-6 text-left">
                    {/* CENTER COLUMN: Question Box Card & Options */}
                    <div className="w-full xl:flex-1 xl:max-w-4xl flex flex-col">
                        <div className="bg-white border border-gray-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
                            {/* Quiz Player Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                                <div>
                                    <span className="text-[9px] font-bold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                                        Duyệt đề thi
                                    </span>
                                    <h2 className="text-sm font-bold text-slate-900 mt-2">
                                        Xem trước giao diện & câu hỏi đề thi
                                    </h2>
                                </div>

                                {/* Timer Pill Emulation */}
                                <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border bg-brand-50 border-brand-200 text-brand-700 text-xs font-bold self-start sm:self-auto">
                                    <BookOpen className="w-4.5 h-4.5" />
                                    <span>Tổng số: {parsedQuestions.length} câu</span>
                                </div>
                            </div>

                            {/* Progress tracker */}
                            {(() => {
                                const progressPercent = Math.round(((currentQuestionIdx + 1) / parsedQuestions.length) * 100);
                                return (
                                    <div>
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5">
                                            <span>
                                                Câu hỏi {currentQuestionIdx + 1} trên {parsedQuestions.length}
                                            </span>
                                            <span>
                                                Tiến độ: {progressPercent}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-300 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${progressPercent}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Question Box Card content */}
                            {(() => {
                                const q = parsedQuestions[currentQuestionIdx];
                                if (!q) return null;
                                return (
                                    <div className="space-y-5" style={{ fontSize: `${fontSize}px` }}>
                                        <div className="bg-bg-base dark:bg-bg-card border border-border-primary dark:border-slate-800 p-6 rounded-xl space-y-4">
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
                                                        Câu {currentQuestionIdx + 1}
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

                                                {/* Header Toolbar Actions */}
                                                <div className="flex items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedHtmlQuestions(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                                                            expandedHtmlQuestions[q.id]
                                                                ? "bg-slate-200 border-slate-300 text-slate-700"
                                                                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700"
                                                        }`}
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                        <span>Sửa mã HTML</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const nextIdx = currentQuestionIdx > 0 ? currentQuestionIdx - 1 : 0;
                                                            setParsedQuestions(parsedQuestions.filter((_, idx) => idx !== currentQuestionIdx));
                                                            setCurrentQuestionIdx(nextIdx);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                        title="Xóa câu hỏi này"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* RENDERED QUESTION TEXT */}
                                            <h3
                                                className="font-semibold text-slate-900 leading-relaxed overflow-x-auto text-left [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                                                style={{ fontSize: `${fontSize + 1}px` }}
                                                dangerouslySetInnerHTML={{ __html: renderMathHtml(q.text) }}
                                            />

                                            {/* COLLAPSIBLE HTML TEXTAREA */}
                                            {expandedHtmlQuestions[q.id] && (
                                                <div className="space-y-1.5 animate-in fade-in duration-150 text-left">
                                                    <label className="text-[10px] font-bold text-slate-550 uppercase tracking-wider block">Mã HTML câu hỏi:</label>
                                                    <textarea
                                                        value={q.text}
                                                        onChange={(e) => handleUpdateQuestionText(currentQuestionIdx, e.target.value)}
                                                        rows={4}
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-650 focus:outline-none focus:border-blue-500 focus:bg-white"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* OPTIONS RENDER */}
                                        {(() => {
                                            if (!q.type || q.type === "single_choice") {
                                                return (
                                                    <div className="space-y-3 text-left">
                                                        {q.options.map((option, idx) => {
                                                            const isSelected = q.correctAnswerIndex === idx;
                                                            const letter = String.fromCharCode(65 + idx);
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        if (!expandedHtmlQuestions[q.id]) {
                                                                            handleUpdateCorrectAnswer(currentQuestionIdx, idx);
                                                                        }
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-4 border rounded-lg text-left font-medium transition-all duration-150 cursor-pointer ${
                                                                        isSelected
                                                                            ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20"
                                                                            : "bg-white border-gray-200 text-slate-700 hover:border-gray-300"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleUpdateCorrectAnswer(currentQuestionIdx, idx);
                                                                            }}
                                                                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] cursor-pointer transition-all ${
                                                                                isSelected
                                                                                    ? "bg-emerald-500 text-white font-medium"
                                                                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                                            }`}
                                                                        >
                                                                            {letter}
                                                                        </button>
                                                                        {expandedHtmlQuestions[q.id] ? (
                                                                            <input
                                                                                type="text"
                                                                                value={option}
                                                                                onChange={(e) => handleUpdateOption(currentQuestionIdx, idx, e.target.value)}
                                                                                className="flex-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-xs font-mono text-slate-850 focus:outline-none focus:bg-white"
                                                                                placeholder={`Phương án ${letter}`}
                                                                            />
                                                                        ) : (
                                                                            <span
                                                                                className="flex-1 text-slate-800 text-xs font-semibold leading-relaxed overflow-x-auto"
                                                                                dangerouslySetInnerHTML={{ __html: renderMathHtml(option) }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    {isSelected && (
                                                                        <div className="w-5 h-5 rounded-full bg-brand-300 text-white font-medium flex items-center justify-center animate-scale-in">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            } else if (q.type === "true_false") {
                                                return (
                                                    <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-3 overflow-x-auto text-left">
                                                        <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase pb-2 border-b border-slate-200 min-w-[320px]">
                                                            <div className="col-span-8 sm:col-span-9">
                                                                Khẳng định / Nhận định (Nhập nội dung)
                                                            </div>
                                                            <div className="col-span-4 sm:col-span-3 text-center">
                                                                Đáp án Đúng/Sai
                                                            </div>
                                                        </div>
                                                        {q.options.map((option, idx) => {
                                                            const tfAnswers = q.correctAnswers || [false, false, false, false];
                                                            const currentVal = tfAnswers[idx];
                                                            const letter = String.fromCharCode(97 + idx);

                                                            const handleToggleTF = (newVal: boolean) => {
                                                                const updated = [...parsedQuestions];
                                                                if (!updated[currentQuestionIdx].correctAnswers) {
                                                                    updated[currentQuestionIdx].correctAnswers = [false, false, false, false];
                                                                }
                                                                updated[currentQuestionIdx].correctAnswers![idx] = newVal;
                                                                setParsedQuestions(updated);
                                                            };

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="grid grid-cols-12 items-center gap-2 py-2 border-b border-slate-100 last:border-0 min-w-[320px]"
                                                                >
                                                                    <div className="col-span-8 sm:col-span-9 flex gap-2 text-slate-800">
                                                                        <span className="font-bold text-slate-500 uppercase">
                                                                            {letter})
                                                                        </span>
                                                                        {expandedHtmlQuestions[q.id] ? (
                                                                            <input
                                                                                type="text"
                                                                                value={option}
                                                                                onChange={(e) => handleUpdateOption(currentQuestionIdx, idx, e.target.value)}
                                                                                className="flex-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-xs font-mono text-slate-800 focus:outline-none focus:bg-white"
                                                                                placeholder={`Khẳng định ${letter}`}
                                                                            />
                                                                        ) : (
                                                                            <span
                                                                                className="flex-1 text-slate-800 text-xs font-semibold leading-relaxed overflow-x-auto"
                                                                                dangerouslySetInnerHTML={{ __html: renderMathHtml(option) }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="col-span-4 sm:col-span-3 flex justify-center gap-1.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleTF(true)}
                                                                            className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                currentVal === true
                                                                                    ? "bg-emerald-500 text-white shadow-sm"
                                                                                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                            }`}
                                                                        >
                                                                            Đúng
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleTF(false)}
                                                                            className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                                                                                currentVal === false
                                                                                    ? "bg-rose-500 text-white shadow-sm"
                                                                                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                                            }`}
                                                                        >
                                                                            Sai
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            } else if (q.type === "short_answer") {
                                                return (
                                                    <div className="space-y-2 text-left">
                                                        <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                                                            Đáp án điền khuyết của câu hỏi (Đáp số):
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={q.shortAnswerKey || ""}
                                                            onChange={(e) => {
                                                                const updated = [...parsedQuestions];
                                                                updated[currentQuestionIdx].shortAnswerKey = e.target.value;
                                                                setParsedQuestions(updated);
                                                            }}
                                                            placeholder="Ví dụ: 150, 24, 2.05, -3..."
                                                            className="w-full px-4 py-3 bg-slate-50 border border-purple-200 hover:border-purple-300 focus:border-purple-500 focus:bg-white font-bold text-slate-900 rounded-lg focus:outline-none transition-all placeholder:text-slate-400"
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* LỜI GIẢI CHI TIẾT */}
                                        {q.explanation && (
                                            <div className="pt-4 border-t border-slate-200/60 space-y-2 text-left">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                                                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                                                    <span>Lời giải chi tiết:</span>
                                                </div>
                                                <div 
                                                    className="p-4 bg-amber-50/15 border border-amber-200/35 rounded-xl text-xs text-slate-700 overflow-x-auto shadow-3xs leading-relaxed font-semibold [&_img]:mx-auto [&_img]:block [&_img]:my-3"
                                                    dangerouslySetInnerHTML={{ __html: renderMathHtml(q.explanation || "") }}
                                                />
                                            </div>
                                        )}

                                        {/* EDIT EXPLANATION (HTML COLLAPSIBLE) */}
                                        {expandedHtmlQuestions[q.id] && (
                                            <div className="space-y-1.5 pt-3 border-t border-slate-200/60 animate-in fade-in duration-150 text-left">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Lời giải gốc (HTML):</label>
                                                <textarea
                                                    value={q.explanation || ""}
                                                    onChange={(e) => handleUpdateExplanation(currentQuestionIdx, e.target.value)}
                                                    rows={2}
                                                    placeholder="Nhập lời giải..."
                                                    className="w-full px-3 py-2 bg-amber-50/20 border border-amber-200/40 rounded-xl text-xs font-mono text-amber-900 focus:outline-none focus:border-amber-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Navigation buttons row */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIdx === 0}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-gray-100 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span>Quay lại</span>
                                </button>

                                {currentQuestionIdx < parsedQuestions.length - 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                                    >
                                        <span>Tiếp theo</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Questions Tracker & Quick Select Panel */}
                    <div className="w-full xl:w-80 bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-6 flex flex-col justify-between shrink-0">
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                Bảng câu hỏi
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Click vào số câu để chuyển nhanh. Câu chưa có đáp án có nền vàng nhạt, câu đã cấu hình đáp án có nền xanh lá.
                            </p>
                        </div>

                        {/* Progress counter */}
                        {(() => {
                            const configuredAnswersCount = parsedQuestions.filter(q => {
                                if (q.type === "single_choice") {
                                    return q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== -1;
                                }
                                if (q.type === "true_false") {
                                    return q.correctAnswers && q.correctAnswers.some(x => x !== undefined && x !== null);
                                }
                                if (q.type === "short_answer") {
                                    return q.shortAnswerKey && q.shortAnswerKey.trim() !== "";
                                }
                                return false;
                            }).length;

                            return (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                        <span>Tiến độ đáp án:</span>
                                        <span>{configuredAnswersCount} / {parsedQuestions.length} câu</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className="bg-emerald-500 h-1.5 transition-all duration-300"
                                            style={{ width: `${(configuredAnswersCount / parsedQuestions.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Render sections grouped by Section */}
                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
                            {(() => {
                                const sections: Record<string, { qIndex: number; q: Question }[]> = {};
                                parsedQuestions.forEach((q, idx) => {
                                    let secTitle = "Phần 1: Trắc nghiệm";
                                    if (q.type === "true_false") {
                                        secTitle = "Phần 2: Đúng / Sai";
                                    } else if (q.type === "short_answer") {
                                        secTitle = "Phần 3: Điền đáp án";
                                    }
                                    if (!sections[secTitle]) {
                                        sections[secTitle] = [];
                                    }
                                    sections[secTitle].push({ qIndex: idx, q });
                                });

                                return Object.entries(sections).map(([secTitle, items]) => (
                                    <div key={secTitle} className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-brand-600 bg-brand-50/50 px-2 py-1 rounded border border-brand-100/40">
                                            {secTitle}
                                        </h4>
                                        <div className="grid grid-cols-5 gap-2 p-1">
                                            {items.map(({ qIndex, q }) => {
                                                const isCurrent = qIndex === currentQuestionIdx;
                                                
                                                let isConfigured = false;
                                                if (q.type === "single_choice") {
                                                    isConfigured = q.correctAnswerIndex !== undefined && q.correctAnswerIndex !== -1;
                                                } else if (q.type === "true_false") {
                                                    isConfigured = q.correctAnswers && q.correctAnswers.some(x => x !== undefined && x !== null);
                                                } else if (q.type === "short_answer") {
                                                    isConfigured = q.shortAnswerKey && q.shortAnswerKey.trim() !== "";
                                                }

                                                return (
                                                    <button
                                                        key={q.id}
                                                        type="button"
                                                        onClick={() => setCurrentQuestionIdx(qIndex)}
                                                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all relative flex items-center justify-center cursor-pointer border ${
                                                            isCurrent
                                                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                                                : isConfigured
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-amber-50 text-amber-750 border-amber-200"
                                                        }`}
                                                    >
                                                        {qIndex + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Font Size Adjuster Emulation */}
                        <div className="flex items-center justify-between px-1 py-2 border-t border-gray-100 text-xs text-slate-600 font-medium">
                            <span>Cỡ chữ hiển thị:</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFontSize((prev) => Math.max(11, prev - 1))}
                                    className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                >
                                    -
                                </button>
                                <span className="font-bold text-slate-800 w-8 text-center">
                                    {fontSize}px
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFontSize((prev) => Math.min(20, prev + 1))}
                                    className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Complete Quiz Save Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-97"
                            >
                                <span>Hoàn thành & Lưu đề thi</span>
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: RAW DATA INSPECTION */}
            {activeTab === "raw" && (
                <div className="space-y-4">
                    <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                        <span>Trình gỡ lỗi: Xem dữ liệu HTML/LaTeX gốc do Mammoth.js trích xuất sau khi xử lý công thức.</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* LEFT COLUMN: RAW TEXT/HTML MARKUP */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700">Mã HTML & LaTeX Gốc (Nguồn):</label>
                            <textarea
                                readOnly
                                value={rawText}
                                rows={25}
                                className="w-full p-3.5 bg-slate-800 border border-slate-900 rounded-xl text-[10px] font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                placeholder="Không có dữ liệu gốc"
                            />
                        </div>

                        {/* RIGHT COLUMN: RENDERED PREVIEW */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700">Trực quan hóa Giao diện Rendered (Có KaTeX):</label>
                            <div 
                                className="w-full p-4 bg-white border border-slate-200 rounded-xl max-h-[485px] overflow-y-auto text-xs text-slate-800 space-y-3 leading-relaxed shadow-2xs"
                                dangerouslySetInnerHTML={{ __html: renderMathHtml(rawText) }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default React.memo(WordImporter);

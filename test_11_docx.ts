import fs from 'fs';
import JSZip from 'jszip';

// Parser code
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
    0x2032: "'",
    162: "'",
    176: "^{\\circ}",
    272: "\\text{Đ}",
    273: "\\text{đ}",
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
    0x211d: "\\mathbb{R}",
    0x2124: "\\mathbb{Z}",
    0x2115: "\\mathbb{N}",
    0x211a: "\\mathbb{Q}",
    0x2102: "\\mathbb{C}",
    0x2209: "\\notin ",
    0x2282: "\\subset ",
    0x2283: "\\supset ",
    0x222a: "\\cup ",
    0x2229: "\\cap ",
    0x2200: "\\forall ",
    0x2203: "\\exists ",
    0x2194: "\\leftrightarrow ",
    0x21d0: "\\Leftarrow "
};

interface TmplContext {
    selector: number;
    variation: number;
    lineCount: number;
    openedScript: boolean;
    nonEmptyLinesCount: number;
    startFence?: string;
    closeFence?: string;
    startFenceAppended?: boolean;
}

const parseMtefBuffer = (buf: Uint8Array): string => {
    if (!buf || buf.length < 30) return "";
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
        if (v5 === 3 || v5 === 5) mtefVer = v5;
        else if (v4 === 3 || v4 === 5) mtefVer = v4;
    }
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
    if (startIdx === -1) startIdx = dsmtIdx + 30;

    const skipNudge = (idx: number, opts: number): number => {
        if (opts & 0x08) {
            let cur = idx;
            if (mtefVer === 3) return cur + 2;
            const dxVal = buf[cur];
            if (dxVal === 128) cur += 3;
            else cur += 1;
            const dyVal = buf[cur];
            if (dyVal === 128) cur += 3;
            else cur += 1;
            return cur;
        }
        return idx;
    };

    let i = startIdx;
    let out = "";
    const tmplStack: TmplContext[] = [];
    const containerStack: ("LINE" | "TMPL")[] = [];
    let hasStarted = false;

    const ensureStartFences = (): void => {
        for (let k = 0; k < tmplStack.length; k++) {
            const t = tmplStack[k];
            if (t.startFence && !t.startFenceAppended) {
                out += t.startFence;
                t.startFenceAppended = true;
            }
        }
    };

    while (i < buf.length - 1) {
        const tag = buf[i];
        if (tag >= 1 && tag <= 7) {
            let idx = i + 1;
            const opts = buf[idx];
            idx += 1;
            idx = skipNudge(idx, opts);

            if (tag === 1) { // LINE
                const isNull = (opts & 0x01) !== 0;
                if (!isNull) containerStack.push("LINE");
                if (tmplStack.length > 0) {
                    const tmpl = tmplStack[tmplStack.length - 1];
                    tmpl.lineCount += 1;
                    if (hasStarted) {
                        if (tmpl.selector === 11) {
                            if (tmpl.lineCount === 1) out += "\\frac{";
                            else if (tmpl.lineCount === 2) out += "}{";
                        } else if (tmpl.selector === 27) {
                            if (tmpl.lineCount === 2) { out += "_{"; tmpl.openedScript = true; }
                            else if (tmpl.lineCount === 3) { out += "}^{"; tmpl.openedScript = true; }
                        } else if (tmpl.selector === 29) {
                            if (tmpl.lineCount === 2) { out += "_{"; tmpl.openedScript = true; }
                        } else if (tmpl.selector === 28) {
                            if (tmpl.lineCount === 2) { out += "^{"; tmpl.openedScript = true; }
                        } else if (tmpl.selector === 33) {
                            if (tmpl.lineCount === 1) out += "\\widehat{";
                        }
                    }
                }
                if (isNull) { i = idx; continue; }
            }
            if (tag === 3) { // TMPL
                const selector = buf[idx];
                const variation = buf[idx+1] + (buf[idx+2] << 8);
                
                let startFence = "";
                let closeFence = "";
                if (selector === 1) {
                    if (FENCE_SYMBOLS[variation] !== undefined) {
                        startFence = FENCE_SYMBOLS[variation][0];
                        closeFence = FENCE_SYMBOLS[variation][1];
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
                i = idx + 3;
                continue;
            }
            if (tag === 2) { // CHAR
                const typeface = buf[idx];
                idx += 1;
                let mtcode = 0;
                if (!(opts & 0x20)) {
                    mtcode = buf[idx] + (buf[idx+1] << 8);
                    idx += 2;
                }
                let char8 = null;
                if (opts & 0x04) {
                    char8 = buf[idx];
                    idx += 1;
                }
                if (hasStarted) {
                    const charCode = mtcode > 0 ? mtcode : (char8 !== null ? char8 : 0);
                    let charStr = "";
                    if (mathTypeSymbolMap[charCode] !== undefined) {
                        charStr = mathTypeSymbolMap[charCode];
                    } else if (charCode >= 32 && charCode < 127) {
                        charStr = String.fromCharCode(charCode);
                    }
                    if (charStr) {
                        ensureStartFences();
                        out += charStr;
                    }
                }
                i = idx;
                continue;
            }
            i = idx;
            continue;
        }
        if (tag === 0) { // END
            if (!hasStarted) {
                hasStarted = true;
                i += 1;
                continue;
            }
            if (containerStack.length > 0) {
                const lastContainer = containerStack.pop();
                if (lastContainer === "TMPL" && tmplStack.length > 0) {
                    const tmpl = tmplStack.pop()!;
                    if (tmpl.openedScript) out += "}";
                    if (tmpl.selector === 11) out += "}";
                    else if (tmpl.selector === 1 && tmpl.startFenceAppended) out += tmpl.closeFence;
                }
            }
            i += 1;
            continue;
        }
        let idx = i + 1;
        if (tag === 8 || tag === 17) {
            idx += 1;
            while (idx < buf.length && buf[idx] !== 0) idx += 1;
            idx += 1;
        } else if (tag === 9) {
            idx += 2;
        } else if (tag === 10) {
            if (tmplStack.length > 0) {
                const tmpl = tmplStack[tmplStack.length - 1];
                if (tmpl.selector === 27 || tmpl.selector === 28 || tmpl.selector === 29) {
                    if (tmpl.openedScript) out += "}";
                    tmplStack.pop();
                    const tmplIdx = containerStack.lastIndexOf("TMPL");
                    if (tmplIdx !== -1) containerStack.splice(tmplIdx, 1);
                }
            }
        }
        i = idx;
    }
    return out;
};

async function run() {
    const docxPath = '/Users/thanhtung/Downloads/hitrang/11.docx';
    const fileData = fs.readFileSync(docxPath);
    const zip = await JSZip.loadAsync(fileData);
    
    // Find files
    for (const key of Object.keys(zip.files)) {
        if (key.startsWith("word/embeddings/") || key.startsWith("word/media/")) {
            const file = zip.file(key);
            if (!file) continue;
            const buf = await file.async("uint8array");
            const text = parseMtefBuffer(buf);
            if (text.includes("log") || text.includes("9") || text.includes("infty")) {
                console.log(`File: ${key}`);
                console.log(`Parsed: ${text}`);
            }
        }
    }
}

run().catch(err => console.error(err));

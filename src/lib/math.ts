import katex from "katex";
import "katex/dist/katex.min.css";

const unicodeToLatexMap: Record<string, string> = {
    "α": "\\alpha",
    "β": "\\beta",
    "γ": "\\gamma",
    "δ": "\\delta",
    "ε": "\\epsilon",
    "ζ": "\\zeta",
    "η": "\\eta",
    "θ": "\\theta",
    "ι": "\\iota",
    "κ": "\\kappa",
    "λ": "\\lambda",
    "μ": "\\mu",
    "ν": "\\nu",
    "ξ": "\\xi",
    "π": "\\pi",
    "ρ": "\\rho",
    "σ": "\\sigma",
    "τ": "\\tau",
    "υ": "\\upsilon",
    "φ": "\\phi",
    "χ": "\\chi",
    "ψ": "\\psi",
    "ω": "\\omega",
    "Δ": "\\Delta",
    "Ω": "\\Omega",
    "Φ": "\\Phi",
    "Π": "\\Pi",
    "Σ": "\\Sigma",
    "ℤ": "\\mathbb{Z}",
    "ℝ": "\\mathbb{R}",
    "ℕ": "\\mathbb{N}",
    "ℚ": "\\mathbb{Q}",
    "ℂ": "\\mathbb{C}",
    "∈": "\\in",
    "∉": "\\notin",
    "⊂": "\\subset",
    "⊃": "\\supset",
    "∪": "\\cup",
    "∩": "\\cap",
    "∅": "\\emptyset",
    "∀": "\\forall",
    "∃": "\\exists",
    "⇒": "\\Rightarrow",
    "⇔": "\\Leftrightarrow",
    "→": "\\rightarrow",
    "←": "\\leftarrow",
    "≤": "\\le",
    "≥": "\\ge",
    "≠": "\\ne",
    "≈": "\\approx",
    "±": "\\pm",
    "×": "\\times",
    "÷": "\\div",
    "∞": "\\infty"
};

const translateUnicodeToLatex = (tex: string): string => {
    let clean = tex;
    for (const [unicodeChar, latexCmd] of Object.entries(unicodeToLatexMap)) {
        clean = clean.split(unicodeChar).join(latexCmd + " ");
    }
    return clean;
};

/**
 * Parses an HTML string, finds math expressions wrapped in $...$ or $$...$$,
 * renders them using KaTeX, and returns the updated HTML string.
 */
export const renderMathHtml = (html: string): string => {
    if (!html) return "";

    let result = html;

    // 1. Replace display math $$...$$
    result = result.replace(/\$\$(.*?)\$\$/g, (match, tex) => {
        try {
            // Unescape common XML entities that mammoth might have introduced
            let cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            cleanTex = translateUnicodeToLatex(cleanTex);
            return katex.renderToString(cleanTex, { displayMode: true, throwOnError: false });
        } catch (err) {
            return match;
        }
    });

    // 2. Replace inline math $...$
    result = result.replace(/\$(.*?)\$/g, (match, tex) => {
        try {
            // Unescape common XML entities that mammoth might have introduced
            let cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            cleanTex = translateUnicodeToLatex(cleanTex);
            return katex.renderToString(cleanTex, { displayMode: false, throwOnError: false });
        } catch (err) {
            return match;
        }
    });

    return result;
};

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

// In-memory LRU-like cache for full HTML math rendering to eliminate repeated KaTeX computations
const MAX_HTML_CACHE_SIZE = 2000;
const mathHtmlCache = new Map<string, string>();

// Sub-cache for individual TeX formulas
const MAX_TEX_CACHE_SIZE = 2000;
const texDisplayCache = new Map<string, string>();
const texInlineCache = new Map<string, string>();

/**
 * Parses an HTML string, finds math expressions wrapped in $...$ or $$...$$,
 * renders them using KaTeX with high-performance memory caching, and returns the updated HTML string.
 */
export const renderMathHtml = (html: string): string => {
    if (!html) return "";

    // Fast-path: if there are no math delimiters at all, return directly
    if (!html.includes("$")) {
        return html;
    }

    // Cache hit for entire snippet
    const cached = mathHtmlCache.get(html);
    if (cached !== undefined) {
        return cached;
    }

    let result = html;

    // 1. Replace display math $$...$$
    result = result.replace(/\$\$(.*?)\$\$/g, (match, tex) => {
        const cachedTex = texDisplayCache.get(tex);
        if (cachedTex !== undefined) {
            return cachedTex;
        }

        try {
            // Unescape common XML entities that mammoth might have introduced
            let cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            cleanTex = translateUnicodeToLatex(cleanTex);
            const rendered = katex.renderToString(cleanTex, { displayMode: true, throwOnError: false });

            if (texDisplayCache.size >= MAX_TEX_CACHE_SIZE) {
                const firstKey = texDisplayCache.keys().next().value;
                if (firstKey) texDisplayCache.delete(firstKey);
            }
            texDisplayCache.set(tex, rendered);
            return rendered;
        } catch (err) {
            return match;
        }
    });

    // 2. Replace inline math $...$
    result = result.replace(/\$(.*?)\$/g, (match, tex) => {
        const cachedTex = texInlineCache.get(tex);
        if (cachedTex !== undefined) {
            return cachedTex;
        }

        try {
            // Unescape common XML entities that mammoth might have introduced
            let cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            cleanTex = translateUnicodeToLatex(cleanTex);
            const rendered = katex.renderToString(cleanTex, { displayMode: false, throwOnError: false });

            if (texInlineCache.size >= MAX_TEX_CACHE_SIZE) {
                const firstKey = texInlineCache.keys().next().value;
                if (firstKey) texInlineCache.delete(firstKey);
            }
            texInlineCache.set(tex, rendered);
            return rendered;
        } catch (err) {
            return match;
        }
    });

    // Store in HTML cache
    if (mathHtmlCache.size >= MAX_HTML_CACHE_SIZE) {
        const firstKey = mathHtmlCache.keys().next().value;
        if (firstKey) mathHtmlCache.delete(firstKey);
    }
    mathHtmlCache.set(html, result);

    return result;
};

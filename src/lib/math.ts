import katex from "katex";
import "katex/dist/katex.min.css";

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
            const cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            return katex.renderToString(cleanTex, { displayMode: true, throwOnError: false });
        } catch (err) {
            return match;
        }
    });

    // 2. Replace inline math $...$
    result = result.replace(/\$(.*?)\$/g, (match, tex) => {
        try {
            // Unescape common XML entities that mammoth might have introduced
            const cleanTex = tex
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            return katex.renderToString(cleanTex, { displayMode: false, throwOnError: false });
        } catch (err) {
            return match;
        }
    });

    return result;
};

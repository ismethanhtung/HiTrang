/**
 * Tiện ích hỗ trợ tìm kiếm không dấu tiếng Việt (Diacritics-insensitive search)
 * và tìm kiếm theo cụm từ/từ khóa phân tách (Multi-token fuzzy matching).
 */

/**
 * Loại bỏ dấu tiếng Việt và chuẩn hóa chuỗi về chữ thường không dấu.
 * Ví dụ: "CHƯƠNG 2: Ôn tập" -> "chuong 2: on tap"
 */
export function removeVietnameseTones(str?: string | null): string {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "d"))
        .toLowerCase()
        .trim();
}

/**
 * Kiểm tra xem `target` (chuỗi hoặc mảng chuỗi) có khớp với `query` tìm kiếm hay không.
 * - Hỗ trợ gõ không dấu (ví dụ "chu" khớp với "chương", "on tap" khớp với "Ôn tập").
 * - Hỗ trợ tìm theo từng từ rời rạc (tất cả các từ khóa trong ô tìm kiếm phải xuất hiện trong target).
 */
export function matchesSearch(
    target: string | null | undefined | (string | null | undefined)[],
    query: string,
): boolean {
    if (!query || !query.trim()) return true;

    const cleanQuery = removeVietnameseTones(query);
    if (!cleanQuery) return true;

    const targets = Array.isArray(target) ? target : [target];
    const combinedTarget = removeVietnameseTones(
        targets.filter((t): t is string => Boolean(t)).join(" "),
    );

    if (!combinedTarget) return false;

    // Khớp nguyên chuỗi trực tiếp
    if (combinedTarget.includes(cleanQuery)) return true;

    // Khớp theo từng từ (tất cả token trong query phải có trong target)
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    return tokens.every((token) => combinedTarget.includes(token));
}

/**
 * Tìm kiếm chuyên dụng cho đối tượng Đề thi (Quiz).
 * Tìm trên: tiêu đề (title), mô tả (description), môn học/chủ đề (subject), khối lớp (grade), và ngày tạo (createdAt).
 */
export function matchesQuiz(
    quiz: {
        title?: string;
        description?: string;
        subject?: string;
        grade?: string;
        createdAt?: string;
    },
    query: string,
): boolean {
    if (!query || !query.trim()) return true;

    let formattedDate1 = "";
    let formattedDate2 = "";
    if (quiz.createdAt) {
        try {
            const d = new Date(quiz.createdAt);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, "0");
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const year = d.getFullYear();
                formattedDate1 = `${day}/${month}/${year}`;
                formattedDate2 = `${d.getDate()}/${d.getMonth() + 1}/${year}`;
            }
        } catch {
            // ignore date parsing error
        }
    }

    const targets = [
        quiz.title,
        quiz.description,
        quiz.subject,
        quiz.grade ? `Lớp ${quiz.grade}` : "",
        quiz.grade,
        quiz.createdAt,
        formattedDate1,
        formattedDate2,
    ];

    return matchesSearch(targets, query);
}

# Workspace Instructions - HiTrang

Chào mừng bạn đến với dự án HiTrang. Khi làm việc trên codebase này, hãy luôn tuân thủ các chỉ dẫn thiết kế và lập trình sau:

## 📋 Hướng dẫn Giao diện (UI/UX)
*   **Thống nhất Phong cách:** Mọi trang mới, thành phần (component), bố cục (layout) hoặc hộp thoại (modal) được tạo ra bắt buộc phải áp dụng phong cách thiết kế **"Flat Sage-White" (Light Mode)** và **"Midnight Steel Navy" (Dark Mode)**.
*   **Tuân thủ Tài liệu Phong cách:** Xem chi tiết hướng dẫn thiết kế, mã màu, biến CSS và các thành phần mẫu tại file quy tắc: [ui-style.md](file:///Users/thanhtung/Downloads/hitrang/.agents/rules/ui-style.md).
*   **Quy tắc màu sắc:** Tuyệt đối không hardcode mã màu hex trong class. Sử dụng các biến CSS thích ứng (`var(--bg-base)`, `var(--bg-card)`, `var(--text-primary)`, v.v.) hoặc các class Tailwind đã được ánh xạ sẵn (`bg-white` ứng với card, `bg-slate-50` ứng với surface, v.v.).
*   **Phông chữ (Fonts):** Luôn sử dụng hệ phông chữ của dự án (`font-sans`, `font-mono`, `font-brand` / `font-calligraphy`) thay vì phông chữ mặc định của trình duyệt.
*   **Tương thích tối/sáng (Dark Mode/Light Mode):** Bắt buộc phải thử nghiệm và tối ưu hóa hiển thị trên cả hai chế độ màu sáng (`:root`) và tối (`.dark`).
*   **Hiệu ứng & Chuyển động (Micro-animations):** Sử dụng các hiệu ứng chuyển tab, tải dữ liệu, hover mượt mà bằng thư viện `motion/react` (Framer Motion) và các transition Tailwind có sẵn.

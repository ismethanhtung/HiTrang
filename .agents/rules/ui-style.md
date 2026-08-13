# Hướng dẫn Phong cách Thiết kế Giao diện (UI Style Guidelines) - HiTrang

Tài liệu này định nghĩa hệ thống thiết kế giao diện **"Flat Sage-White" (Light Mode)** và **"Midnight Steel Navy" (Dark Mode)** của ứng dụng HiTrang. Toàn bộ các trang mới, component hoặc layout được phát triển thêm trong tương lai bắt buộc phải tuân theo các quy tắc dưới đây để đảm bảo giao diện đồng nhất, cao cấp và mượt mà.

---

## 1. Hệ thống Màu sắc & Biến CSS (Design Tokens)

Dự án sử dụng Tailwind CSS v4 kết hợp với các biến CSS thích ứng (adaptive CSS variables) được định nghĩa trong `src/index.css`. Không sử dụng mã màu cứng (hardcoded hex code) khi viết CSS hoặc Tailwind classes. Hãy luôn dùng các biến hoặc Tailwind class tương ứng:

### 1.1. Light Mode: Ultra-Clean Flat Sage-White
Phong cách chủ đạo là sự nhẹ nhàng, tinh tế với nền xanh xám xô thơm nhạt (sage-white) phối hợp với các thẻ trắng tinh khiết (card):
*   **Nền tảng (Base/Surface Background):** `--bg-base: #F4F7F5` và `--bg-surface: #F4F7F5`
    *   *Mô tả:* Màu xanh xám xô thơm rất nhạt, tạo cảm giác thư thái, dễ chịu, chống mỏi mắt.
*   **Thẻ & Thanh bên (Cards & Sidebar Background):** `--bg-card: #ffffff`
    *   *Mô tả:* Trắng tinh khiết giúp các khối nội dung nổi bật trên nền xám xô thơm.
*   **Hệ thống chữ (Typography Colors):**
    *   Chữ chính (Primary Text): `--text-primary: #1A2824` (Deep Forest Sage - xanh rừng đậm, tránh dùng màu đen tuyệt đối `#000` để giữ độ dịu).
    *   Chữ phụ (Secondary Text): `--text-secondary: #455752` (Medium Sage-Slate).
    *   Chữ chú thích (Tertiary Text): `--text-tertiary: #7E938D` (Soft Sage-Gray).
*   **Hệ thống đường viền (Border Colors):**
    *   Viền ngoài thẻ (Card Outlines): `--border-primary: #E1EAE5` (Subtle Sage-Gray).
    *   Đường phân cách (Dividers): `--border-secondary: #C8D7CF` (Refined Divider).
*   **Hệ màu thương hiệu (Teal & Sage Brand System):**
    *   `--brand-50` / `--brand-100` / `--brand-200`: `#F0F6F3` / `#E1ECE7` / `#C8D9D2` (Dùng cho hover, active, background badge).
    *   `--brand-300` / `--brand-400` / `--brand-500`: `#88BDA4` (Sage Green) / `#659287` (Deep Sage Teal) / `#4B726B`.
    *   `--brand-600` / `--brand-700`: `#395953` / `#28403C`.

### 1.2. Dark Mode: Midnight Steel Navy
Khi chuyển sang chế độ tối (sử dụng class `.dark`), giao diện chuyển sang tông màu hải quân thép huyền bí và dịu mát:
*   **Nền tảng (Base/Surface Background):** `--bg-base: #1E2B3E` và `--bg-surface: #1E2B3E` (Midnight Navy).
*   **Thẻ & Thanh bên (Cards & Sidebar Background):** `--bg-card: #27374D` (Deep Steel Navy).
*   **Hệ thống chữ (Typography Colors):**
    *   Chữ chính: `--text-primary: #DDE6ED` (Ice Blue - xanh băng mát mắt).
    *   Chữ phụ: `--text-secondary: #9DB2BF` (Soft Grayish Blue).
    *   Chữ chú thích: `--text-tertiary: #526D82` (Steel Blue).
*   **Hệ thống đường viền (Border Colors):**
    *   Viền ngoài thẻ: `--border-primary: #34475E` (Steel Navy outline).
    *   Đường phân cách: `--border-secondary: #526D82` (Steel Blue divider).
*   **Hệ màu thương hiệu tối (Navy Steel & Ice Blue):**
    *   `--brand-200`: `#526D82` (Steel Blue).
    *   `--brand-300`: `#9DB2BF` (Soft Grayish Blue active accent).
    *   `--brand-400`: `#DDE6ED` (Ice Blue active text & highlight).

---

## 2. Quy tắc Ghi đè Tailwind Tiêu chuẩn (Tailwind Class Remapping)

Tập tin `src/index.css` đã ghi đè toàn bộ các class tiện ích mặc định của Tailwind để chúng tự động thích ứng với cơ chế Light/Dark theme. Khi viết code mới, hãy lưu ý:
1.  **Dùng `bg-white`** thay vì các mã màu card tùy biến. Hệ thống sẽ tự dịch sang `var(--bg-card)` ở cả hai chế độ.
2.  **Dùng `bg-slate-50`** cho các khu vực surface nền phụ (nó sẽ tự động ánh xạ thành `var(--bg-surface)`).
3.  **Dùng `text-slate-900` / `text-gray-900`** cho chữ tiêu đề (sẽ tự động dùng `var(--text-primary)`).
4.  **Dùng `text-slate-600` / `text-gray-600`** cho mô tả (sẽ tự động dùng `var(--text-secondary)`).
5.  **Dùng `text-slate-400` / `text-gray-400`** cho chữ gợi ý phụ (sẽ tự động dùng `var(--text-tertiary)`).
6.  **Dùng `border-slate-100` / `border-slate-200`** cho viền (sẽ tự động dùng `var(--border-primary)`).

---

## 3. Hệ thống Typography (Phông chữ)

*   **Không dùng font mặc định.** Dự án sử dụng hệ font cấu hình qua `@theme` trong CSS:
    *   `font-sans`: `"Inter", ui-sans-serif, system-ui, sans-serif` (Dùng cho toàn bộ text chính, nút bấm, bảng biểu).
    *   `font-mono`: `"JetBrains Mono", ui-monospace` (Dùng cho khối code, điểm số, ký tự kỹ thuật).
    *   `font-brand` / `font-calligraphy`: `"Pacifico", cursive` (Dùng cho các điểm nhấn viết tay nghệ thuật).

---

## 4. Thiết kế Layout & Chi tiết Thành phần (Component Guidelines)

### 4.1. Khối chào mừng (Welcome Header Banner)
Mọi trang chủ hoặc trang dashboard của một phân hệ mới cần bắt đầu với một Header tinh gọn có bố cục như sau:
```tsx
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200">
    <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Chào mừng quay trở lại, {user.name} 👋
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Đối thủ của bạn đang cày đề, còn bạn làm gì?
        </p>
    </div>
    
    {/* Thống kê nhanh dạng lưới phẳng, không có viền bao cứng bên ngoài */}
    <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 p-4 rounded-2xl">
        <div className="text-center min-w-[50px]">
            <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">Số đề thi</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">{quizzes.length}</span>
        </div>
        <div className="text-center border-l border-gray-200 dark:border-slate-800 pl-3 min-w-[50px]">
            <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">Hoàn thành</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">{completionRate}%</span>
        </div>
        <div className="text-center border-l border-gray-200 dark:border-slate-800 pl-3 min-w-[50px]">
            <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">Điểm TB</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-slate-800 dark:text-slate-200 block mt-0.5">{averageScore}/10</span>
        </div>
    </div>
</div>
```

### 4.2. Khối thẻ nội dung (Card Component)
*   Thẻ phải sử dụng các góc bo tròn lớn: `rounded-2xl` hoặc `rounded-3xl`.
*   Đường viền cực mảnh và tinh tế, không bóng đổ quá đậm (sử dụng flat design).
*   Ví dụ cấu trúc thẻ:
    ```tsx
    <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-brand-300 dark:hover:border-brand-200 transition-all duration-200 flex flex-col justify-between">
        {/* Nội dung bên trong */}
    </div>
    ```

### 4.3. Băng rôn cảnh báo / Thông báo hành động (Alert/Action Banners)
*   Sử dụng màu nền nhạt pha trộn màu thương hiệu (Brand tint với opacity thấp) thay vì màu đỏ hay xanh lá rực rỡ chuẩn.
*   Cấu trúc chuẩn của banner đang làm dở bài thi:
    *   Nền: `bg-[#3B6D85]/5` kết hợp viền `border border-[#3B6D85]/15`
    *   Huy hiệu tiêu đề nhỏ (micro badge): `text-[9px] font-black uppercase tracking-wider text-[#3B6D85] bg-[#3B6D85]/10 px-2 py-0.5 rounded`

### 4.4. Nút bấm (Buttons)
*   Bo tròn góc: `rounded-xl` (không dùng rounded-md hay rounded-lg để giữ tính trẻ trung mềm mại).
*   Độ đậm chữ: `font-bold` hoặc `font-black` (cho các nút kêu gọi hành động quan trọng).
*   Hiệu ứng: Bắt buộc thêm `transition-all duration-200 hover:scale-[1.02] cursor-pointer` hoặc hover đổi nền nhạt/đậm.

### 4.5. Hiệu ứng chuyển động (Micro-animations)
Dự án tích hợp thư viện `motion/react` (framer-motion). Mọi thay đổi trạng thái, danh sách hoặc chuyển trang cần được lồng vào chuyển động mượt mà:
*   **Chuyển trang/tab chính:**
    ```tsx
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
    >
        {/* ... */}
    </motion.div>
    ```

---

## 5. Quy trình Kiểm thử & Phát triển Giao diện Mới
Khi thiết kế một thành phần mới, AI agent hoặc nhà phát triển phải:
1.  **Kiểm tra Dark Mode:** Đảm bảo toàn bộ chữ và nền đều hiển thị rõ nét trên cả hai chế độ tối/sáng mà không bị chói hay thiếu tương phản.
2.  **Thiết kế Mobile-First:** Sử dụng các tiền tố kích thước của Tailwind (`sm:`, `md:`, `lg:`) cho khoảng cách (padding/margin) và kích thước chữ. Ví dụ: `text-xl sm:text-2xl` cho các tiêu đề chính.
3.  **Giữ khoảng cách thoáng đãng (Spacing & Breathing room):** Bố cục cần rộng rãi, sạch sẽ bằng cách sử dụng `space-y-8` đến `space-y-12` cho các khối lớn và `gap-6` đến `gap-12` cho hệ lưới (grid).

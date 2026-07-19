# Hướng dẫn Thiết kế và Phong cách Giao diện (Design System & Style Guide)

Tài liệu này định nghĩa hệ thống thiết kế giao diện cho toàn bộ trang web **Học Viện Tinh Tế** nhằm duy trì tính nhất quán về thẩm mỹ trên cả máy tính (laptop) và điện thoại (mobile).

---

## 1. Bảng màu (Color Palette)

Hệ thống sử dụng tông màu chủ đạo là **Emerald** (Xanh ngọc lục bảo) kết hợp với các tông màu trung tính **Slate** và **Gray**.

*   **Màu nhấn chính (Primary Color):** Emerald đại diện cho tri thức, sự chuyên nghiệp và năng động.
    *   Màu chính nút bấm: `bg-emerald-600` (hover: `bg-emerald-700`, active: `bg-emerald-800`).
    *   Màu nền phụ: `bg-emerald-50` (thường dùng cho icon highlight hoặc nhãn active).
    *   Màu chữ nhấn: `text-emerald-600` / `hover:text-emerald-700`.
    *   Màu viền nhấn: `border-emerald-100` / `focus:border-emerald-500`.
*   **Màu trung tính nền tảng (Neutrals & Slate):**
    *   Tiêu đề & Chữ đậm: `text-slate-900` hoặc `text-gray-900`.
    *   Văn bản thông thường: `text-slate-600` hoặc `text-gray-600`.
    *   Mô tả nhỏ & Nhãn (Labels): `text-gray-400` hoặc `text-slate-400`.
    *   Nền ứng dụng (Body Background): `bg-[#fafafa]` (màu xám trắng dịu mắt).
    *   Nền bảng điều khiển & Thẻ card: `bg-white`.
*   **Màu trạng thái (Status Colors):**
    *   **Thành công (Success):** Emerald (`text-emerald-600`, `bg-emerald-50`, `border-emerald-100`).
    *   **Lỗi (Error/Danger):** Red/Rose (`text-red-600`, `bg-red-50`, `border-red-100`).
    *   **Cảnh báo (Warning):** Amber (`text-amber-600`, `bg-amber-50`, `border-amber-100`).

---

## 2. Kiểu chữ (Typography)

*   **Phông chữ mặc định:** **Inter** (đã định cấu hình qua `--font-sans`).
*   **Phông chữ hiển thị code/monospaced:** **JetBrains Mono** (đã định cấu hình qua `--font-mono`).
*   **Kích thước chuẩn:**
    *   Tiêu đề trang (H2): `text-2xl font-semibold tracking-tight text-slate-900`
    *   Tiêu đề mục / Card title: `text-sm font-semibold text-slate-900`
    *   Văn bản / Nhãn nút: `text-sm font-medium`
    *   Mô tả nhỏ / Nhãn input: `text-xs font-medium text-gray-500`

---

## 3. Các thành phần giao diện mẫu (UI Components)

### Nút bấm (Buttons)
1.  **Nút hành động chính (Primary Button):**
    ```html
    <button className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-2">
      <span>Đăng nhập</span>
    </button>
    ```
2.  **Nút hành động phụ (Secondary Button):**
    ```html
    <button className="py-2.5 px-4 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.99]">
      <span>Hủy bỏ</span>
    </button>
    ```

### Ô nhập liệu (Input Form Fields)
Tất cả các ô nhập liệu trong form phải thống nhất kiểu hiển thị:
```tsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-gray-600">Nhãn trường dữ liệu</label>
  <div className="relative">
    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
      {/* Icon ở đây */}
    </span>
    <input
      type="text"
      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-colors placeholder:text-gray-400"
      placeholder="Nhập giá trị..."
    />
  </div>
</div>
```

### Hộp thông báo (Alerts & Notifications)
*   **Hộp lỗi:**
    ```html
    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
      Mật khẩu xác nhận không khớp.
    </div>
    ```
*   **Hộp thành công:**
    ```html
    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 font-medium animate-pulse">
      Thao tác thành công!
    </div>
    ```

---

## 4. Thiết kế đáp ứng (Responsive Grid & Layout)

Để giao diện hiển thị xuất sắc cả trên Laptop lớn lẫn Điện thoại di động nhỏ:
1.  **Sidebar linh hoạt:** Sidebar ẩn trên thiết bị di động (`hidden lg:flex`) và chuyển thành thanh trượt overlay thông qua trạng thái `sidebarOpen`. Một nút Menu ở Header di động để kích hoạt Sidebar.
2.  **Grid đa cột:** Sử dụng Tailwind breakpoints:
    *   Điện thoại di động: `grid-cols-1 gap-4`
    *   Tablet: `md:grid-cols-2 gap-6`
    *   Laptop: `lg:grid-cols-3 gap-6`
3.  **Tỷ lệ padding:**
    *   Mobile: `px-4 py-6` hoặc `p-4`
    *   Laptop: `px-8 py-8` hoặc `p-8`
4.  **Bảng biểu cuộn ngang:** Mọi bảng dữ liệu (Table) phải nằm trong thẻ wrapper `overflow-x-auto w-full` để không làm vỡ giao diện trên màn hình nhỏ.

---

## 5. Hiệu ứng chuyển động (Micro-animations)

Sử dụng thư viện `motion/react` (trước đây là `framer-motion`) để tạo các hiệu ứng chuyển cảnh mượt mà:
*   **Xuất hiện form / modal:**
    ```tsx
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Content */}
    </motion.div>
    ```
*   **Nút bấm nhẹ nhàng:** Sử dụng `active:scale-[0.99]` hoặc `active:scale-98` kết hợp với `transition-all duration-150` để tạo cảm giác phản hồi xúc giác (tactile feedback).

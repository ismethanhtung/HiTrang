-- 1. Bảng hồ sơ người dùng (Profiles) để liên kết thông tin mở rộng của auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  username text unique not null,
  role text not null check (role in ('student', 'teacher')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bật Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Thêm RLS Policies cho profiles
create policy "Cho phép mọi người đọc profile" on public.profiles
  for select using (true);

create policy "Cho phép người dùng tạo profile của chính mình" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Cho phép người dùng cập nhật profile của chính mình" on public.profiles
  for update using (auth.uid() = id);


-- 2. Bảng quản lý đề thi (Quizzes)
create table if not exists public.quizzes (
  id text primary key,
  title text not null,
  description text,
  subject text not null,
  duration integer not null, -- Thời gian làm bài tính bằng phút
  questions jsonb not null, -- Mảng câu hỏi lưu trữ dưới dạng JSONB
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);

-- Bật RLS cho quizzes
alter table public.quizzes enable row level security;

-- Thêm RLS Policies cho quizzes
create policy "Cho phép mọi người đọc danh sách đề thi" on public.quizzes
  for select using (true);

create policy "Cho phép giáo viên tạo đề thi" on public.quizzes
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

create policy "Cho phép giáo viên xóa đề thi" on public.quizzes
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

create policy "Cho phép giáo viên sửa đề thi" on public.quizzes
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );


-- 3. Bảng quản lý kết quả nộp bài (Submissions)
create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  quiz_id text not null,
  quiz_title text not null,
  student_id uuid references auth.users(id) not null,
  student_name text not null,
  score numeric not null,
  total_questions integer not null,
  answers jsonb not null, -- Nhật ký đáp án của học sinh
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bật RLS cho submissions
alter table public.submissions enable row level security;

-- Thêm RLS Policies cho submissions
create policy "Cho phép học sinh xem bài nộp của mình và giáo viên xem tất cả" on public.submissions
  for select using (
    auth.uid() = student_id or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'teacher'
    )
  );

create policy "Cho phép học sinh tự nộp bài của mình" on public.submissions
  for insert with check (
    auth.uid() = student_id and
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'student'
    )
  );

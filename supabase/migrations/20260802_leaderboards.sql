-- Migration: Bảng xếp hạng theo Khối lớp (Leaderboards by Grade)
-- File: supabase/migrations/20260802_leaderboards.sql

-- 1. Tạo bảng lưu trữ thông tin Xếp hạng Tổng
CREATE TABLE IF NOT EXISTS public.user_overall_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_exp NUMERIC DEFAULT 0,
  tests_completed INT DEFAULT 0,
  current_rank INT,
  previous_rank INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bật RLS cho user_overall_stats
ALTER TABLE public.user_overall_stats ENABLE ROW LEVEL SECURITY;

-- Xóa chính sách cũ nếu tồn tại trước khi tạo mới
DROP POLICY IF EXISTS "Cho phép mọi người đọc bảng xếp hạng tổng" ON public.user_overall_stats;

-- Tạo chính sách RLS cho phép mọi người dùng đã xác thực đọc thông tin xếp hạng
CREATE POLICY "Cho phép mọi người đọc bảng xếp hạng tổng" ON public.user_overall_stats
  FOR SELECT TO authenticated USING (true);

-- 2. Tạo Indexes để tối ưu hiệu năng truy vấn lượt thi đầu tiên
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_quiz_started
  ON public.exam_attempts (user_id, quiz_id, started_at ASC);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_status_submitted
  ON public.exam_attempts (status) WHERE status = 'submitted';

-- 3. Function cập nhật lại Bảng xếp hạng Tổng (xếp hạng riêng theo từng Khối)
CREATE OR REPLACE FUNCTION public.refresh_overall_leaderboard()
RETURNS VOID AS $$
BEGIN
  -- Bước A: Lưu lại current_rank cũ vào previous_rank trước khi tính thứ hạng mới
  UPDATE public.user_overall_stats
  SET previous_rank = current_rank
  WHERE user_id IS NOT NULL;

  -- Bước B: Cập nhật tổng điểm tích lũy của từng học sinh (chỉ lấy điểm của lần làm đầu tiên của mỗi bài test)
  WITH first_attempts AS (
    SELECT DISTINCT ON (ea.user_id, ea.quiz_id)
      ea.user_id,
      ea.quiz_id,
      ea.score
    FROM public.exam_attempts ea
    JOIN public.profiles p ON p.id = ea.user_id
    WHERE ea.status = 'submitted'
      AND p.role = 'student' -- Loại trừ giáo viên
    ORDER BY ea.user_id, ea.quiz_id, ea.started_at ASC
  ),
  aggregated_stats AS (
    SELECT 
      user_id,
      SUM(score) AS calculated_exp,
      COUNT(quiz_id) AS total_tests
    FROM first_attempts
    GROUP BY user_id
  )
  INSERT INTO public.user_overall_stats (user_id, total_exp, tests_completed, updated_at)
  SELECT user_id, calculated_exp, total_tests, now()
  FROM aggregated_stats
  ON CONFLICT (user_id) DO UPDATE 
  SET 
    total_exp = EXCLUDED.total_exp,
    tests_completed = EXCLUDED.tests_completed,
    updated_at = now();

  -- Bước C: Xóa học sinh không còn bài làm nào (nếu có trường hợp xóa sạch lượt làm bài)
  DELETE FROM public.user_overall_stats
  WHERE user_id NOT IN (
    SELECT DISTINCT ea.user_id 
    FROM public.exam_attempts ea
    JOIN public.profiles p ON p.id = ea.user_id
    WHERE ea.status = 'submitted' AND p.role = 'student'
  );

  -- Bước D: Đánh lại current_rank mới dựa trên total_exp theo từng Khối (grade)
  WITH ranked_users AS (
    SELECT 
      uos.user_id,
      DENSE_RANK() OVER (
        PARTITION BY COALESCE(p.grade, '') 
        ORDER BY uos.total_exp DESC, uos.tests_completed DESC
      ) AS new_rank
    FROM public.user_overall_stats uos
    JOIN public.profiles p ON p.id = uos.user_id
  )
  UPDATE public.user_overall_stats uos
  SET current_rank = ru.new_rank
  FROM ranked_users ru
  WHERE uos.user_id = ru.user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Sửa đổi trigger đồng bộ nộp bài để tự động làm mới BXH Tổng
CREATE OR REPLACE FUNCTION public.sync_attempt_to_submission()
RETURNS TRIGGER AS $$
DECLARE
  v_quiz_title text;
  v_student_name text;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'inprogress' THEN
    -- Lấy tiêu đề đề thi
    SELECT title INTO v_quiz_title FROM public.quizzes WHERE id = NEW.quiz_id;
    -- Lấy tên học sinh
    SELECT name INTO v_student_name FROM public.profiles WHERE id = NEW.user_id;

    -- Lưu thẳng bản ghi nộp bài vào bảng submissions hiện tại, sử dụng chung ID của lượt thi để liên kết 1-1
    INSERT INTO public.submissions (
      id,
      quiz_id,
      quiz_title,
      student_id,
      student_name,
      score,
      total_questions,
      answers,
      submitted_at
    ) VALUES (
      NEW.id,
      NEW.quiz_id,
      COALESCE(v_quiz_title, 'Đề thi không tên'),
      NEW.user_id,
      COALESCE(v_student_name, 'Học sinh'),
      NEW.score,
      NEW.total_questions,
      NEW.answers,
      NEW.submitted_at
    )
    ON CONFLICT (id) DO UPDATE SET
      score = EXCLUDED.score,
      total_questions = EXCLUDED.total_questions,
      answers = EXCLUDED.answers,
      submitted_at = EXCLUDED.submitted_at;

    -- Tự động làm mới bảng xếp hạng tổng ngay lập tức để cập nhật biến động
    PERFORM public.refresh_overall_leaderboard();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC Function: Lấy bảng xếp hạng của một đề thi cụ thể (chỉ tính lượt thi đầu tiên)
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(p_quiz_id text)
RETURNS TABLE (
  rank_position bigint,
  student_id uuid,
  student_name text,
  student_username text,
  student_grade text,
  score numeric,
  duration_seconds integer,
  submitted_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  WITH first_attempts AS (
    SELECT DISTINCT ON (ea.user_id)
      ea.user_id,
      ea.score,
      EXTRACT(EPOCH FROM (ea.submitted_at - ea.started_at))::integer AS dur_sec,
      ea.submitted_at
    FROM public.exam_attempts ea
    JOIN public.profiles p ON p.id = ea.user_id
    WHERE ea.quiz_id = p_quiz_id 
      AND ea.status = 'submitted'
      AND p.role = 'student' -- Loại bỏ giáo viên khỏi BXH
    ORDER BY ea.user_id, ea.started_at ASC
  ),
  ranked_attempts AS (
    SELECT
      f.user_id,
      f.score,
      f.dur_sec,
      f.submitted_at,
      DENSE_RANK() OVER (
        ORDER BY 
          f.score DESC, 
          f.dur_sec ASC, 
          f.submitted_at ASC
      ) AS rank_pos
    FROM first_attempts f
  )
  SELECT
    r.rank_pos,
    r.user_id,
    p.name,
    p.username,
    p.grade,
    r.score,
    r.dur_sec,
    r.submitted_at
  FROM ranked_attempts r
  JOIN public.profiles p ON p.id = r.user_id
  ORDER BY r.rank_pos ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC Function: Lấy bảng xếp hạng chung theo Khối (Chỉ học sinh cùng khối mới được hiển thị)
CREATE OR REPLACE FUNCTION public.get_overall_leaderboard(p_grade text)
RETURNS TABLE (
  rank_position integer,
  previous_rank_position integer,
  student_id uuid,
  student_name text,
  student_username text,
  student_grade text,
  total_points numeric,
  tests_completed integer
) AS $$
DECLARE
  v_role text;
  v_user_grade text;
BEGIN
  -- Lấy thông tin role và grade của người đang đăng nhập
  SELECT role, grade INTO v_role, v_user_grade
  FROM public.profiles
  WHERE id = auth.uid();

  -- Nếu là học sinh, cưỡng chế chỉ xem khối lớp của chính mình
  IF v_role = 'student' THEN
    p_grade := COALESCE(v_user_grade, '');
  END IF;

  RETURN QUERY
  SELECT
    uos.current_rank,
    uos.previous_rank,
    uos.user_id,
    p.name,
    p.username,
    p.grade,
    uos.total_exp AS total_points,
    uos.tests_completed
  FROM public.user_overall_stats uos
  JOIN public.profiles p ON p.id = uos.user_id
  WHERE p.role = 'student' 
    AND COALESCE(p.grade, '') = p_grade
  ORDER BY uos.current_rank ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Làm mới bảng xếp hạng tổng lần đầu khi chạy migration để đồng bộ dữ liệu cũ
SELECT public.refresh_overall_leaderboard();

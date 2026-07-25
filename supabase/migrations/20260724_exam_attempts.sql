-- 1. Tạo bảng quản lý lượt làm bài (Exam Attempts)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id text REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  status text CHECK (status IN ('inprogress', 'submitted')) DEFAULT 'inprogress' NOT NULL,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  score numeric,
  total_questions integer,
  submitted_at timestamp with time zone
);

-- Bật Row Level Security (RLS)
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 2. Thêm RLS Policies cho exam_attempts
CREATE POLICY "Người dùng tự xem lượt thi của mình, giáo viên xem tất cả"
ON public.exam_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
  )
);

CREATE POLICY "Học sinh tự khởi tạo lượt thi của chính mình"
ON public.exam_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Học sinh tự cập nhật đáp án nháp hoặc nộp bài khi còn giờ"
ON public.exam_attempts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'inprogress'
  AND now() <= (expires_at + interval '10 seconds') -- 10 giây grace period cho mạng chậm
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Cập nhật đáp án nháp trong khi làm bài
    (status = 'inprogress' AND now() <= (expires_at + interval '10 seconds'))
    OR
    -- Nộp bài
    (status = 'submitted' AND now() <= (expires_at + interval '10 seconds'))
  )
);

CREATE POLICY "Giáo viên được quyền xóa lượt làm bài"
ON public.exam_attempts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
  )
);


-- 3. Tạo function tự động thiết lập thời gian cho lượt thi mới (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.set_attempt_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.started_at := now();
  NEW.expires_at := now() + (NEW.duration_minutes || ' minutes')::interval;
  NEW.status := 'inprogress';
  NEW.answers := COALESCE(NEW.answers, '{}'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_set_attempt_timestamps
BEFORE INSERT ON public.exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.set_attempt_timestamps();


-- 4. Tạo helper function tính điểm tự động bằng PL/pgSQL
CREATE OR REPLACE FUNCTION public.calculate_score(
  p_quiz_id text,
  p_answers jsonb
)
RETURNS TABLE (
  calculated_score numeric,
  total_questions int
) AS $$
DECLARE
  v_questions jsonb;
  v_question jsonb;
  v_q_id text;
  v_q_type text;
  v_correct_count numeric := 0;
  v_total_questions int := 0;
  v_chosen jsonb;
  v_correct_idx int;
  v_correct_tf jsonb;
  v_correct_key text;
  v_student_key text;
  v_student_tf jsonb;
  v_tf_matches int;
  v_i int;
  v_raw_score numeric;
BEGIN
  -- Lấy danh sách câu hỏi của đề thi
  SELECT questions INTO v_questions FROM public.quizzes WHERE id = p_quiz_id;
  IF v_questions IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0;
    RETURN;
  END IF;

  v_total_questions := jsonb_array_length(v_questions);
  IF v_total_questions = 0 THEN
    RETURN QUERY SELECT 0::numeric, 0;
    RETURN;
  END IF;

  -- Duyệt qua từng câu hỏi để so sánh đáp án
  FOR v_i IN 0..(v_total_questions - 1) LOOP
    v_question := v_questions -> v_i;
    v_q_id := v_question ->> 'id';
    v_q_type := COALESCE(v_question ->> 'type', 'single_choice');
    
    v_chosen := p_answers -> v_q_id;
    IF v_chosen IS NOT NULL AND v_chosen != 'null'::jsonb THEN
      IF v_q_type = 'single_choice' THEN
        v_correct_idx := (v_question ->> 'correctAnswerIndex')::int;
        IF (v_chosen::text)::int = v_correct_idx THEN
          v_correct_count := v_correct_count + 1.0;
        END IF;
        
      ELSIF v_q_type = 'true_false' THEN
        v_correct_tf := v_question -> 'correctAnswers'; -- mảng boolean gốc
        v_student_tf := v_chosen; -- mảng học sinh chọn (true/false/null)
        
        IF v_correct_tf IS NOT NULL AND jsonb_array_length(v_correct_tf) = 4 AND jsonb_typeof(v_student_tf) = 'array' THEN
          v_tf_matches := 0;
          FOR v_i IN 0..3 LOOP
            IF v_student_tf -> v_i IS NOT NULL AND v_student_tf -> v_i != 'null'::jsonb AND (v_student_tf -> v_i)::boolean = (v_correct_tf -> v_i)::boolean THEN
              v_tf_matches := v_tf_matches + 1;
            END IF;
          END LOOP;
          
          -- Quy chế chấm điểm của Bộ GD ĐTQG Việt Nam cho Phần II Đúng/Sai
          IF v_tf_matches = 4 THEN
            v_correct_count := v_correct_count + 1.0;
          ELSIF v_tf_matches = 3 THEN
            v_correct_count := v_correct_count + 0.5;
          ELSIF v_tf_matches = 2 THEN
            v_correct_count := v_correct_count + 0.25;
          ELSIF v_tf_matches = 1 THEN
            v_correct_count := v_correct_count + 0.1;
          END IF;
        END IF;
        
      ELSIF v_q_type = 'short_answer' THEN
        v_correct_key := trim(lower(v_question ->> 'shortAnswerKey'));
        v_student_key := trim(lower(replace(v_chosen::text, '"', '')));
        IF v_correct_key = v_student_key THEN
          v_correct_count := v_correct_count + 1.0;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Tính toán điểm số trên thang 10.0 và làm tròn đến 1 chữ số thập phân
  v_raw_score := (v_correct_count / v_total_questions::numeric) * 10.0;
  v_raw_score := round(v_raw_score, 1);

  RETURN QUERY SELECT v_raw_score, v_total_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Tạo trigger hoàn thiện điểm số khi nộp bài (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.finalize_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_calculated_score numeric;
  v_total_questions int;
BEGIN
  -- Khi chuyển trạng thái từ 'inprogress' sang 'submitted'
  IF NEW.status = 'submitted' AND OLD.status = 'inprogress' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    
    -- Nếu client chưa tính điểm hoặc nộp auto tự động, server tự tính
    IF NEW.score IS NULL OR NEW.total_questions IS NULL THEN
      SELECT calculated_score, total_questions 
      INTO v_calculated_score, v_total_questions
      FROM public.calculate_score(NEW.quiz_id, NEW.answers);
      
      NEW.score := COALESCE(NEW.score, v_calculated_score);
      NEW.total_questions := COALESCE(NEW.total_questions, v_total_questions);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_finalize_attempt
BEFORE UPDATE ON public.exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.finalize_attempt();


-- 6. Tạo trigger đồng bộ lượt nộp sang bảng submissions (AFTER UPDATE)
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_attempt_to_submission
AFTER UPDATE ON public.exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.sync_attempt_to_submission();


-- 7. RPC Function: Lấy hoặc tự động tạo lượt thi (Dựa 100% trên giờ Server)
CREATE OR REPLACE FUNCTION public.get_or_create_attempt(
  p_quiz_id text,
  p_duration_minutes int
)
RETURNS TABLE (
  attempt_id uuid,
  quiz_id text,
  user_id uuid,
  started_at timestamp with time zone,
  duration_minutes int,
  expires_at timestamp with time zone,
  status text,
  answers jsonb,
  remaining_seconds int
) AS $$
DECLARE
  v_user_id uuid;
  v_attempt_id uuid;
  v_started_at timestamp with time zone;
  v_expires_at timestamp with time zone;
  v_status text;
  v_answers jsonb;
  v_remaining_seconds int;
BEGIN
  -- Lấy user_id đang đăng nhập từ auth context của Supabase
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Tìm lượt thi 'inprogress' mới nhất chưa hết giờ
  SELECT ea.id, ea.started_at, ea.expires_at, ea.status, ea.answers, 
         EXTRACT(EPOCH FROM (ea.expires_at - now()))::int
  INTO v_attempt_id, v_started_at, v_expires_at, v_status, v_answers, v_remaining_seconds
  FROM public.exam_attempts AS ea
  WHERE ea.quiz_id = p_quiz_id
    AND ea.user_id = v_user_id
    AND ea.status = 'inprogress'
    AND ea.expires_at > now()
  ORDER BY ea.started_at DESC
  LIMIT 1;

  -- Nếu tìm thấy lượt thi đang dang dở, khôi phục lại
  IF v_attempt_id IS NOT NULL THEN
    RETURN QUERY SELECT v_attempt_id, p_quiz_id, v_user_id, v_started_at, p_duration_minutes, v_expires_at, v_status, v_answers, v_remaining_seconds;
    RETURN;
  END IF;

  -- Nếu không có lượt nào chưa hết giờ, tự động tạo lượt mới hoàn toàn
  INSERT INTO public.exam_attempts AS ea (quiz_id, user_id, duration_minutes)
  VALUES (p_quiz_id, v_user_id, p_duration_minutes)
  RETURNING ea.id, ea.started_at, ea.expires_at, ea.status, ea.answers, 
            EXTRACT(EPOCH FROM (ea.expires_at - now()))::int
  INTO v_attempt_id, v_started_at, v_expires_at, v_status, v_answers, v_remaining_seconds;

  RETURN QUERY SELECT v_attempt_id, p_quiz_id, v_user_id, v_started_at, p_duration_minutes, v_expires_at, v_status, v_answers, v_remaining_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. RPC Function: Lazy Auto-submit dọn dẹp các bài làm quá hạn chưa nộp
CREATE OR REPLACE FUNCTION public.auto_submit_expired_attempts()
RETURNS integer AS $$
DECLARE
  v_submitted_count integer := 0;
  v_attempt record;
BEGIN
  -- Tìm và quét các lượt làm bài 'inprogress' đã quá expires_at cộng grace period 10 giây
  FOR v_attempt IN 
    SELECT id, expires_at FROM public.exam_attempts
    WHERE status = 'inprogress' 
      AND (expires_at + interval '10 seconds') < now()
  LOOP
    -- Đổi trạng thái để kích hoạt Trigger tính điểm tự động và sync sang submissions
    UPDATE public.exam_attempts
    SET status = 'submitted',
        submitted_at = v_attempt.expires_at -- Đóng sổ đúng thời điểm hết giờ
    WHERE id = v_attempt.id;

    v_submitted_count := v_submitted_count + 1;
  END LOOP;

  RETURN v_submitted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

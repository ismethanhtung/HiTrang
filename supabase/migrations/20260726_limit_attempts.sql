-- Migration: Giới hạn tối đa 5 lượt thi tại Database Level
-- File: supabase/migrations/20260726_limit_attempts.sql

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
  v_attempts_count int;
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

  -- Đếm số lượt đã làm (bao gồm cả inprogress đã hết hạn và submitted) trước khi tạo lượt mới
  SELECT count(*)::int INTO v_attempts_count
  FROM public.exam_attempts AS ea
  WHERE ea.quiz_id = p_quiz_id AND ea.user_id = v_user_id;

  IF v_attempts_count >= 5 THEN
    RAISE EXCEPTION 'Bạn đã hết lượt làm bài thi này (tối đa 5 lượt).';
  END IF;

  -- Nếu không có lượt nào chưa hết giờ và chưa quá 5 lượt, tự động tạo lượt mới hoàn toàn
  INSERT INTO public.exam_attempts AS ea (quiz_id, user_id, duration_minutes)
  VALUES (p_quiz_id, v_user_id, p_duration_minutes)
  RETURNING ea.id, ea.started_at, ea.expires_at, ea.status, ea.answers, 
            EXTRACT(EPOCH FROM (ea.expires_at - now()))::int
  INTO v_attempt_id, v_started_at, v_expires_at, v_status, v_answers, v_remaining_seconds;

  RETURN QUERY SELECT v_attempt_id, p_quiz_id, v_user_id, v_started_at, p_duration_minutes, v_expires_at, v_status, v_answers, v_remaining_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

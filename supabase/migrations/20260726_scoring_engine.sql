-- 1. Bổ sung cột cấu hình chấm điểm (scoring_config) vào bảng quizzes
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS scoring_config jsonb;


-- 2. Cập nhật hàm tính điểm calculate_score nâng cao (hỗ trợ SECTION_BASED và true_false_rules)
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
  v_scoring_config jsonb;
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
  
  -- Các biến cấu hình chấm điểm
  v_config_type text;
  v_tf_rule_1 numeric := 0.1;
  v_tf_rule_2 numeric := 0.25;
  v_tf_rule_3 numeric := 0.5;
  v_tf_rule_4 numeric := 1.0;
  
  -- Biến hỗ trợ tính điểm theo Phần (Section)
  v_section_id text;
  v_section_points numeric;
  v_questions_in_section int;
  v_points_per_question numeric;
  v_q_score numeric;
BEGIN
  -- Lấy danh sách câu hỏi và cấu hình chấm điểm của đề thi
  SELECT questions, scoring_config 
  INTO v_questions, v_scoring_config 
  FROM public.quizzes 
  WHERE id = p_quiz_id;

  IF v_questions IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0;
    RETURN;
  END IF;

  v_total_questions := jsonb_array_length(v_questions);
  IF v_total_questions = 0 THEN
    RETURN QUERY SELECT 0::numeric, 0;
    RETURN;
  END IF;

  -- Đọc cấu hình chấm điểm từ đề thi (nếu có)
  IF v_scoring_config IS NOT NULL THEN
    v_config_type := v_scoring_config ->> 'type';
    
    -- Quy tắc chấm điểm trắc nghiệm Đúng/Sai bậc thang
    IF v_scoring_config -> 'true_false_rules' IS NOT NULL THEN
      v_tf_rule_1 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '1_correct')::numeric, 0.1);
      v_tf_rule_2 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '2_correct')::numeric, 0.25);
      v_tf_rule_3 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '3_correct')::numeric, 0.5);
      v_tf_rule_4 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '4_correct')::numeric, 1.0);
    END IF;
  END IF;

  -- Duyệt qua từng câu hỏi để chấm điểm
  FOR v_i IN 0..(v_total_questions - 1) LOOP
    v_question := v_questions -> v_i;
    v_q_id := v_question ->> 'id';
    v_q_type := COALESCE(v_question ->> 'type', 'single_choice');
    v_section_id := v_question ->> 'sectionTitle'; -- Nhận diện section_id qua tiêu đề phần
    
    v_chosen := p_answers -> v_q_id;
    v_q_score := 0;
    
    IF v_chosen IS NOT NULL AND v_chosen != 'null'::jsonb THEN
      IF v_q_type = 'single_choice' THEN
        v_correct_idx := (v_question ->> 'correctAnswerIndex')::int;
        IF (v_chosen::text)::int = v_correct_idx THEN
          v_q_score := 1.0;
        END IF;
        
      ELSIF v_q_type = 'true_false' THEN
        v_correct_tf := v_question -> 'correctAnswers';
        v_student_tf := v_chosen;
        
        IF v_correct_tf IS NOT NULL AND jsonb_array_length(v_correct_tf) = 4 AND jsonb_typeof(v_student_tf) = 'array' THEN
          v_tf_matches := 0;
          FOR v_i IN 0..3 LOOP
            IF v_student_tf -> v_i IS NOT NULL AND v_student_tf -> v_i != 'null'::jsonb AND (v_student_tf -> v_i)::boolean = (v_correct_tf -> v_i)::boolean THEN
              v_tf_matches := v_tf_matches + 1;
            END IF;
          END LOOP;
          
          IF v_tf_matches = 4 THEN
            v_q_score := v_tf_rule_4;
          ELSIF v_tf_matches = 3 THEN
            v_q_score := v_tf_rule_3;
          ELSIF v_tf_matches = 2 THEN
            v_q_score := v_tf_rule_2;
          ELSIF v_tf_matches = 1 THEN
            v_q_score := v_tf_rule_1;
          END IF;
        END IF;
        
      ELSIF v_q_type = 'short_answer' THEN
        v_correct_key := trim(lower(v_question ->> 'shortAnswerKey'));
        v_student_key := trim(lower(replace(v_chosen::text, '"', '')));
        IF v_correct_key = v_student_key THEN
          v_q_score := 1.0;
        END IF;
      END IF;
    END IF;

    -- Kiểm tra nếu áp dụng chia điểm theo phần (SECTION_BASED)
    IF v_config_type = 'SECTION_BASED' AND v_section_id IS NOT NULL AND v_q_score > 0 THEN
      -- Đếm tổng số câu thuộc phần này trong đề thi
      SELECT COUNT(*) INTO v_questions_in_section 
      FROM jsonb_array_elements(v_questions) AS q
      WHERE q ->> 'sectionTitle' = v_section_id;
      
      -- Đọc điểm tổng phần từ cấu hình
      SELECT (sec ->> 'total_points')::numeric INTO v_section_points
      FROM jsonb_array_elements(v_scoring_config -> 'sections') AS sec
      WHERE sec ->> 'section_id' = v_section_id;

      v_points_per_question := v_section_points / NULLIF(v_questions_in_section, 0);
      v_correct_count := v_correct_count + (v_q_score * COALESCE(v_points_per_question, 0));
    ELSE
      -- Cộng dồn điểm câu hỏi thông thường
      v_correct_count := v_correct_count + v_q_score;
    END IF;
  END LOOP;

  -- Quy đổi điểm số
  IF v_config_type = 'SECTION_BASED' THEN
    -- Nếu tính theo phần thì điểm số đã là điểm tổng thực tế
    v_raw_score := v_correct_count;
  ELSE
    -- Mặc định tính theo tỷ lệ phần trăm số câu đúng quy đổi ra thang điểm 10.0
    v_raw_score := (v_correct_count / v_total_questions::numeric) * 10.0;
  END IF;
  
  -- Làm tròn 2 chữ số thập phân để đảm bảo chính xác tiền tệ/điểm số
  v_raw_score := round(v_raw_score::numeric, 2);

  RETURN QUERY SELECT v_raw_score, v_total_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Cập nhật trigger finalize_attempt để luôn luôn tính điểm ở server (chống hack điểm từ client)
CREATE OR REPLACE FUNCTION public.finalize_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_calculated_score numeric;
  v_total_questions int;
  v_quiz_id text;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'inprogress' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    
    -- Luôn luôn chấm lại trên server bằng dữ liệu chính xác, ghi đè hoàn toàn score/total_questions gửi từ client
    SELECT calculated_score, total_questions 
    INTO v_calculated_score, v_total_questions
    FROM public.calculate_score(NEW.quiz_id, NEW.answers);
    
    NEW.score := v_calculated_score;
    NEW.total_questions := v_total_questions;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RPC Function: Lấy danh sách câu hỏi an toàn cho học sinh (Loại bỏ đáp án đúng)
CREATE OR REPLACE FUNCTION public.get_student_questions(p_quiz_id text)
RETURNS jsonb AS $$
DECLARE
  v_questions jsonb;
  v_stripped_questions jsonb;
BEGIN
  SELECT questions INTO v_questions FROM public.quizzes WHERE id = p_quiz_id;
  IF v_questions IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Loại bỏ toàn bộ các key đáp án đúng và lời giải thích khi đang làm bài
  SELECT jsonb_agg(
    elem - 'correctAnswerIndex' - 'correctAnswers' - 'shortAnswerKey' - 'explanation'
  ) INTO v_stripped_questions
  FROM jsonb_array_elements(v_questions) AS elem;

  RETURN COALESCE(v_stripped_questions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. RPC Function: Lấy danh sách câu hỏi xem lại (Có đáp án đúng, chỉ khả dụng sau khi đã nộp bài)
CREATE OR REPLACE FUNCTION public.get_review_questions(p_submission_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_student_id uuid;
  v_quiz_id text;
  v_questions jsonb;
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Truy vấn thông tin bài nộp
  SELECT student_id, quiz_id INTO v_student_id, v_quiz_id
  FROM public.submissions
  WHERE id = p_submission_id;

  IF v_quiz_id IS NULL THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;

  -- Truy vấn quyền hạn của người dùng hiện tại
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

  -- Chỉ cho phép chính học sinh làm bài thi đó hoặc giáo viên xem lại đáp án
  IF v_user_id != v_student_id AND COALESCE(v_role, '') != 'teacher' THEN
    RAISE EXCEPTION 'Not authorized to view answers';
  END IF;

  -- Trả về danh sách câu hỏi gốc bao gồm cả đáp án đúng và lời giải
  SELECT questions INTO v_questions FROM public.quizzes WHERE id = v_quiz_id;
  RETURN COALESCE(v_questions, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. RPC Function: get_quizzes_for_client (Chống rò rỉ đáp án khi truy vấn danh sách đề thi)
CREATE OR REPLACE FUNCTION public.get_quizzes_for_client()
RETURNS TABLE (
  id text,
  title text,
  description text,
  subject text,
  duration int,
  questions jsonb,
  scoring_config jsonb,
  created_at timestamp with time zone,
  created_by uuid,
  is_public boolean
) AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  END IF;

  -- Nếu là giáo viên, cho phép xem toàn bộ câu hỏi và đáp án đúng để chỉnh sửa
  IF COALESCE(v_role, '') = 'teacher' THEN
    RETURN QUERY 
    SELECT q.id, q.title, q.description, q.subject, q.duration, q.questions, q.scoring_config, q.created_at, q.created_by, q.is_public
    FROM public.quizzes q
    ORDER BY q.created_at DESC;
  ELSE
    -- Nếu là học sinh hoặc khách vãng lai, trả về câu hỏi đã được lược bỏ đáp án đúng
    RETURN QUERY 
    SELECT 
      q.id, q.title, q.description, q.subject, q.duration,
      (
        CASE 
          WHEN q.questions IS NULL THEN '[]'::jsonb
          ELSE (
            SELECT COALESCE(jsonb_agg(
              elem - 'correctAnswerIndex' - 'correctAnswers' - 'shortAnswerKey' - 'explanation'
            ), '[]'::jsonb)
            FROM jsonb_array_elements(q.questions) AS elem
          )
        END
      ) AS questions,
      q.scoring_config,
      q.created_at, q.created_by, q.is_public
    FROM public.quizzes q
    ORDER BY q.created_at DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

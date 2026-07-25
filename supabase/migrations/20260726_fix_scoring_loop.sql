-- Khắc phục lỗi trùng lặp biến chạy v_i ở vòng lặp trong (gây nhảy chỉ số vòng lặp ngoài và sai lệch kết quả chấm điểm)
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
  v_j int; -- Biến chạy riêng biệt cho vòng lặp trong (xét 4 ý đúng/sai)
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
    v_config_type := COALESCE(v_scoring_config ->> 'type', 'EQUAL_WEIGHT');
    
    -- Quy tắc chấm điểm trắc nghiệm Đúng/Sai bậc thang (cho THPT_QG hoặc SECTION_BASED)
    IF v_scoring_config -> 'true_false_rules' IS NOT NULL THEN
      v_tf_rule_1 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '1_correct')::numeric, 0.1);
      v_tf_rule_2 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '2_correct')::numeric, 0.25);
      v_tf_rule_3 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '3_correct')::numeric, 0.5);
      v_tf_rule_4 := COALESCE((v_scoring_config -> 'true_false_rules' ->> '4_correct')::numeric, 1.0);
    END IF;
  ELSE
    v_config_type := 'EQUAL_WEIGHT';
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
          FOR v_j IN 0..3 LOOP
            IF v_student_tf -> v_j IS NOT NULL AND v_student_tf -> v_j != 'null'::jsonb AND (v_student_tf -> v_j)::boolean = (v_correct_tf -> v_j)::boolean THEN
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

    -- Kiểm tra nếu áp dụng chia điểm theo phần (SECTION_BASED hoặc THPT_QG)
    IF (v_config_type = 'SECTION_BASED' OR v_config_type = 'THPT_QG') AND v_section_id IS NOT NULL AND v_q_score > 0 THEN
      -- Đếm tổng số câu thuộc phần này trong đề thi (ví dụ: đếm xem có bao nhiêu câu thuộc 'Phần I')
      SELECT COUNT(*) INTO v_questions_in_section 
      FROM jsonb_array_elements(v_questions) AS q
      WHERE trim(lower(q ->> 'sectionTitle')) = trim(lower(v_section_id))
         OR (trim(lower(q ->> 'sectionTitle')) IN ('phần i', 'phần 1') AND trim(lower(v_section_id)) IN ('phần i', 'phần 1'))
         OR (trim(lower(q ->> 'sectionTitle')) IN ('phần ii', 'phần 2') AND trim(lower(v_section_id)) IN ('phần ii', 'phần 2'))
         OR (trim(lower(q ->> 'sectionTitle')) IN ('phần iii', 'phần 3') AND trim(lower(v_section_id)) IN ('phần iii', 'phần 3'));
      
      -- Đọc điểm tổng phần từ cấu hình (hỗ trợ so khớp thông minh số La Mã và chữ số thường)
      IF v_config_type = 'THPT_QG' THEN
        -- Đề thi THPT Quốc Gia có bareme chuẩn cứng: Phần I = 3.0đ, Phần II = 4.0đ, Phần III = 3.0đ
        IF trim(lower(v_section_id)) IN ('phần i', 'phần 1') THEN
          v_section_points := 3.0;
        ELSIF trim(lower(v_section_id)) IN ('phần ii', 'phần 2') THEN
          v_section_points := 4.0;
        ELSIF trim(lower(v_section_id)) IN ('phần iii', 'phần 3') THEN
          v_section_points := 3.0;
        ELSE
          v_section_points := 0.0;
        END IF;
      ELSE
        -- Đề thi tự cấu hình theo phần (SECTION_BASED)
        SELECT (sec ->> 'total_points')::numeric INTO v_section_points
        FROM jsonb_array_elements(v_scoring_config -> 'sections') AS sec
        WHERE trim(lower(sec ->> 'section_id')) = trim(lower(v_section_id))
           OR (trim(lower(v_section_id)) IN ('phần i', 'phần 1') AND trim(lower(sec ->> 'section_id')) IN ('phần i', 'phần 1'))
           OR (trim(lower(v_section_id)) IN ('phần ii', 'phần 2') AND trim(lower(sec ->> 'section_id')) IN ('phần ii', 'phần 2'))
           OR (trim(lower(v_section_id)) IN ('phần iii', 'phần 3') AND trim(lower(sec ->> 'section_id')) IN ('phần iii', 'phần 3'));
      END IF;

      v_points_per_question := COALESCE(v_section_points, 0) / NULLIF(v_questions_in_section, 0);
      v_correct_count := v_correct_count + (v_q_score * COALESCE(v_points_per_question, 0));
    ELSE
      -- Cộng dồn điểm câu hỏi thông thường (EQUAL_WEIGHT hoặc trường hợp không chia phần)
      v_correct_count := v_correct_count + v_q_score;
    END IF;
  END LOOP;

  -- Quy đổi điểm số cuối cùng
  IF v_config_type = 'SECTION_BASED' OR v_config_type = 'THPT_QG' THEN
    -- Đã là thang điểm thực tế (tổng cộng các phần = 10.0)
    v_raw_score := v_correct_count;
  ELSE
    -- Mặc định EQUAL_WEIGHT: tính theo tỷ lệ phần trăm số câu đúng quy đổi ra thang điểm 10.0
    v_raw_score := (v_correct_count / v_total_questions::numeric) * 10.0;
  END IF;
  
  -- Làm tròn 2 chữ số thập phân để đảm bảo chính xác điểm số
  v_raw_score := round(v_raw_score::numeric, 2);

  RETURN QUERY SELECT v_raw_score, v_total_questions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Tự động chạy cập nhật lại điểm số cho các lượt làm bài đã nộp trước đó để sửa dữ liệu cũ
UPDATE public.exam_attempts
SET score = calc.calculated_score,
    total_questions = calc.total_questions
FROM (
  SELECT ea.id, cs.calculated_score, cs.total_questions
  FROM public.exam_attempts ea
  CROSS JOIN LATERAL public.calculate_score(ea.quiz_id, ea.answers) cs
  WHERE ea.status = 'submitted'
) AS calc
WHERE public.exam_attempts.id = calc.id;

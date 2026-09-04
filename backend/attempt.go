package main

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StandardizeSection maps section names to standard keys to resolve fuzzy spelling
func StandardizeSection(title string) string {
	t := strings.ToLower(strings.TrimSpace(title))
	if strings.Contains(t, "phần iii") || strings.Contains(t, "phần 3") || strings.Contains(t, "part iii") || strings.Contains(t, "part 3") {
		return "section_3"
	}
	if strings.Contains(t, "phần ii") || strings.Contains(t, "phần 2") || strings.Contains(t, "part ii") || strings.Contains(t, "part 2") {
		return "section_2"
	}
	if strings.Contains(t, "phần i") || strings.Contains(t, "phần 1") || strings.Contains(t, "part i") || strings.Contains(t, "part 1") {
		return "section_1"
	}
	return t
}

// CalculateScore computes the attempt score based on scoring configs
func CalculateScore(quiz *Quiz, answers map[string]interface{}) (float64, int) {
	totalQuestions := len(quiz.Questions)
	if totalQuestions == 0 {
		return 0.0, 0
	}

	configType := "EQUAL_WEIGHT"
	var tfRule1, tfRule2, tfRule3, tfRule4 float64 = 0.1, 0.25, 0.5, 1.0

	if quiz.ScoringConfig != nil {
		if quiz.ScoringConfig.Type != "" {
			configType = quiz.ScoringConfig.Type
		}
		if quiz.ScoringConfig.TrueFalseRules != nil {
			if r1, ok := quiz.ScoringConfig.TrueFalseRules["1_correct"]; ok {
				tfRule1 = r1
			}
			if r2, ok := quiz.ScoringConfig.TrueFalseRules["2_correct"]; ok {
				tfRule2 = r2
			}
			if r3, ok := quiz.ScoringConfig.TrueFalseRules["3_correct"]; ok {
				tfRule3 = r3
			}
			if r4, ok := quiz.ScoringConfig.TrueFalseRules["4_correct"]; ok {
				tfRule4 = r4
			}
		}
	}

	// Count questions in sections
	sectionCounts := make(map[string]int)
	for _, q := range quiz.Questions {
		if q.SectionTitle != "" {
			sKey := StandardizeSection(q.SectionTitle)
			sectionCounts[sKey]++
		}
	}

	totalCorrectPoints := 0.0

	for _, q := range quiz.Questions {
		chosen, ok := answers[q.ID]
		qScore := 0.0

		if ok && chosen != nil {
			switch q.Type {
			case "single_choice":
				// Handle both numeric representation (float64 from json parse or string)
				var chosenIdx int
				isMatch := false
				switch v := chosen.(type) {
				case float64:
					chosenIdx = int(v)
					isMatch = true
				case int:
					chosenIdx = v
					isMatch = true
				case string:
					if parsed, err := strconv.Atoi(v); err == nil {
						chosenIdx = parsed
						isMatch = true
					}
				}
				if isMatch && chosenIdx == q.CorrectAnswerIndex {
					qScore = 1.0
				}

			case "true_false":
				// chosen should be a list of boolean values
				var studentTf []bool
				if list, ok := chosen.([]interface{}); ok {
					for _, item := range list {
						if b, ok := item.(bool); ok {
							studentTf = append(studentTf, b)
						} else {
							// If null is sent, append false or ignore.
							studentTf = append(studentTf, false)
						}
					}
				} else if list, ok := chosen.([]bool); ok {
					studentTf = list
				}

				if len(q.CorrectAnswers) == 4 && len(studentTf) == 4 {
					tfMatches := 0
					for i := 0; i < 4; i++ {
						if studentTf[i] == q.CorrectAnswers[i] {
							tfMatches++
						}
					}
					switch tfMatches {
					case 4:
						qScore = tfRule4
					case 3:
						qScore = tfRule3
					case 2:
						qScore = tfRule2
					case 1:
						qScore = tfRule1
					}
				}

			case "short_answer":
				studentStr := ""
				if s, ok := chosen.(string); ok {
					studentStr = s
				} else if f, ok := chosen.(float64); ok {
					studentStr = strconv.FormatFloat(f, 'f', -1, 64)
				}
				studentStr = strings.TrimSpace(strings.ToLower(studentStr))
				correctStr := strings.TrimSpace(strings.ToLower(q.ShortAnswerKey))
				if studentStr == correctStr && correctStr != "" {
					qScore = 1.0
				}
			}
		}

		// Apply Section-based scoring if configured
		if (configType == "SECTION_BASED" || configType == "THPT_QG") && q.SectionTitle != "" && qScore > 0 {
			sKey := StandardizeSection(q.SectionTitle)
			questionsInSec := sectionCounts[sKey]
			sectionPoints := 0.0

			if configType == "THPT_QG" {
				if sKey == "section_1" {
					sectionPoints = 3.0
				} else if sKey == "section_2" {
					sectionPoints = 4.0
				} else if sKey == "section_3" {
					sectionPoints = 3.0
				}
			} else { // SECTION_BASED
				if quiz.ScoringConfig != nil {
					for _, sec := range quiz.ScoringConfig.Sections {
						if StandardizeSection(sec.SectionID) == sKey {
							sectionPoints = sec.TotalPoints
							break
						}
					}
				}
			}

			pointsPerQuestion := 0.0
			if questionsInSec > 0 {
				pointsPerQuestion = sectionPoints / float64(questionsInSec)
			}
			totalCorrectPoints += qScore * pointsPerQuestion
		} else {
			// EQUAL_WEIGHT: simple accumulation
			totalCorrectPoints += qScore
		}
	}

	var rawScore float64
	if configType == "SECTION_BASED" || configType == "THPT_QG" {
		rawScore = totalCorrectPoints
	} else {
		// Default scale of 10.0
		rawScore = (totalCorrectPoints / float64(totalQuestions)) * 10.0
	}

	// Round to 2 decimal places
	roundedScore := math.Round(rawScore*100) / 100
	return roundedScore, totalQuestions
}

// RefreshOverallLeaderboard recalculates overall ranks grouped by grade
func RefreshOverallLeaderboard(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// A. Fetch profiles and their attempts
		var students []Profile
		if err := tx.Where("role = 'student'").Find(&students).Error; err != nil {
			return err
		}

		for _, student := range students {
			studentGrade := ""
			if student.Grade != nil {
				studentGrade = strings.TrimSpace(*student.Grade)
			}

			// Find earliest successful submission for each quiz for this student.
			// Only count quizzes that match the student's grade or are for all grades.
			var firstAttempts []struct {
				QuizID string
				Score  float64
			}

			query := `
				SELECT ea.quiz_id, ea.score 
				FROM exam_attempts ea
				JOIN quizzes q ON q.id = ea.quiz_id
				WHERE ea.user_id = ? AND ea.status = 'submitted'
				AND (q.grade = ? OR q.grade IS NULL OR q.grade = '' OR ? = '')
				AND ea.started_at = (
					SELECT MIN(started_at) 
					FROM exam_attempts 
					WHERE user_id = ea.user_id AND quiz_id = ea.quiz_id AND status = 'submitted'
				)
			`
			if err := tx.Raw(query, student.ID, studentGrade, studentGrade).Scan(&firstAttempts).Error; err != nil {
				return err
			}

			totalExp := 0.0
			for _, fa := range firstAttempts {
				totalExp += fa.Score
			}
			testsCompleted := len(firstAttempts)

			// Update UserOverallStats (total_exp & tests_completed) without touching previous_rank or current_rank
			upsertQuery := `
				INSERT INTO user_overall_stats (user_id, total_exp, tests_completed, updated_at)
				VALUES (?, ?, ?, NOW())
				ON DUPLICATE KEY UPDATE 
					total_exp = VALUES(total_exp),
					tests_completed = VALUES(tests_completed),
					updated_at = NOW()
			`
			if err := tx.Exec(upsertQuery, student.ID, totalExp, testsCompleted).Error; err != nil {
				return err
			}
		}

		// B. Remove stats of users who have no valid submitted attempts in their grade
		deleteStatsQuery := `
			DELETE FROM user_overall_stats 
			WHERE tests_completed = 0 OR total_exp <= 0
		`
		if err := tx.Exec(deleteStatsQuery).Error; err != nil {
			return err
		}

		// C. Recalculate ranks partitioned by grade using Standard Competition Ranking (1224)
		today := time.Now().Format("2006-01-02")

		var statsWithGrade []struct {
			UserID         string
			Grade          string
			TotalExp       float64
			TestsCompleted int
			CurrentRank    *int
			PreviousRank   *int
			RankDate       string
		}

		selectQuery := `
			SELECT uos.user_id, COALESCE(p.grade, '') as grade, uos.total_exp, uos.tests_completed, uos.current_rank, uos.previous_rank, COALESCE(uos.rank_date, '') as rank_date
			FROM user_overall_stats uos
			JOIN profiles p ON p.id = uos.user_id
			WHERE p.role = 'student'
			ORDER BY grade, uos.total_exp DESC, uos.tests_completed DESC
		`
		if err := tx.Raw(selectQuery).Scan(&statsWithGrade).Error; err != nil {
			return err
		}

		currentGrade := "__none__"
		rank := 1
		positionInGrade := 0
		var lastExp float64 = -1.0
		lastTests := -1

		for _, row := range statsWithGrade {
			if row.Grade != currentGrade {
				currentGrade = row.Grade
				positionInGrade = 1
				rank = 1
				lastExp = row.TotalExp
				lastTests = row.TestsCompleted
			} else {
				positionInGrade++
				// Standard Competition Ranking (1224):
				// If score or tests completed differs from previous student,
				// the rank jumps to the 1-based index (positionInGrade)
				if row.TotalExp != lastExp || row.TestsCompleted != lastTests {
					rank = positionInGrade
					lastExp = row.TotalExp
					lastTests = row.TestsCompleted
				}
				// If tied, rank stays the same
			}

			newRank := rank
			if row.CurrentRank == nil {
				// Newly ranked student on leaderboard for the first time
				if err := tx.Exec("UPDATE user_overall_stats SET current_rank = ?, previous_rank = NULL, rank_date = ? WHERE user_id = ?", newRank, today, row.UserID).Error; err != nil {
					return err
				}
			} else if row.RankDate != today {
				// Daily rollover: lock previous_rank as the student's ending rank from previous day, and update rank_date to today
				if err := tx.Exec("UPDATE user_overall_stats SET previous_rank = current_rank, current_rank = ?, rank_date = ? WHERE user_id = ?", newRank, today, row.UserID).Error; err != nil {
					return err
				}
			} else {
				// Same day: Keep the locked daily baseline (previous_rank), only update current_rank if changed
				if *row.CurrentRank != newRank {
					if err := tx.Exec("UPDATE user_overall_stats SET current_rank = ? WHERE user_id = ?", newRank, row.UserID).Error; err != nil {
						return err
					}
				}
			}
		}

		return nil
	})
}

func HandleGetActiveAttempt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		quizID := c.Query("quizId")

		var attempt ExamAttempt
		err := db.Where("quiz_id = ? AND user_id = ? AND status = 'inprogress' AND expires_at > ?", quizID, userID, time.Now()).
			Order("started_at desc").First(&attempt).Error

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusOK, nil)
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi truy vấn lượt thi đang diễn ra"})
			}
			return
		}

		c.JSON(http.StatusOK, attempt)
	}
}

func HandleGetAnyActiveAttempt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var attempt ExamAttempt
		err := db.Where("user_id = ? AND status = 'inprogress' AND expires_at > ?", userID, time.Now()).
			Order("started_at desc").First(&attempt).Error

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusOK, nil)
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi truy vấn lượt thi"})
			}
			return
		}

		c.JSON(http.StatusOK, attempt)
	}
}

type CreateAttemptRequest struct {
	QuizID          string `json:"p_quiz_id" binding:"required"`
	DurationMinutes int    `json:"p_duration_minutes" binding:"required"`
}

func HandleGetOrCreateAttempt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req CreateAttemptRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu yêu cầu không hợp lệ"})
			return
		}

		// 1. Check if active attempt already exists
		var attempt ExamAttempt
		err := db.Where("quiz_id = ? AND user_id = ? AND status = 'inprogress' AND expires_at > ?", req.QuizID, userID, time.Now()).
			Order("started_at desc").First(&attempt).Error

		if err == nil {
			// Found, return active attempt
			remainingSec := int(time.Until(attempt.ExpiresAt).Seconds())
			c.JSON(http.StatusOK, []gin.H{{
				"attempt_id":        attempt.ID,
				"quiz_id":           attempt.QuizID,
				"user_id":           attempt.UserID,
				"started_at":        attempt.StartedAt,
				"duration_minutes":  attempt.DurationMinutes,
				"expires_at":        attempt.ExpiresAt,
				"status":            attempt.Status,
				"answers":           attempt.Answers,
				"remaining_seconds": remainingSec,
			}})
			return
		}

		// 2. Count attempts limit (max 5)
		var attemptsCount int64
		db.Model(&ExamAttempt{}).Where("quiz_id = ? AND user_id = ?", req.QuizID, userID).Count(&attemptsCount)

		if attemptsCount >= 5 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bạn đã hết lượt làm bài thi này (tối đa 5 lượt)."})
			return
		}

		// 3. Fetch quiz to get official duration
		var quiz Quiz
		if err := db.Where("id = ?", req.QuizID).First(&quiz).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đề thi"})
			return
		}

		// 4. Create a new attempt
		now := time.Now()
		expiresAt := now.Add(time.Duration(quiz.Duration) * time.Minute)
		newAttempt := ExamAttempt{
			ID:              uuid.New().String(),
			QuizID:          req.QuizID,
			UserID:          userID.(string),
			StartedAt:       now,
			DurationMinutes: quiz.Duration,
			ExpiresAt:       expiresAt,
			Status:          "inprogress",
			Answers:         make(map[string]interface{}),
		}

		if err := db.Create(&newAttempt).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo lượt làm bài mới: " + err.Error()})
			return
		}

		remainingSec := int(time.Until(expiresAt).Seconds())
		c.JSON(http.StatusOK, []gin.H{{
			"attempt_id":        newAttempt.ID,
			"quiz_id":           newAttempt.QuizID,
			"user_id":           newAttempt.UserID,
			"started_at":        newAttempt.StartedAt,
			"duration_minutes":  newAttempt.DurationMinutes,
			"expires_at":        newAttempt.ExpiresAt,
			"status":            newAttempt.Status,
			"answers":           newAttempt.Answers,
			"remaining_seconds": remainingSec,
		}})
	}
}

type UpdateAnswersRequest struct {
	Answers map[string]interface{} `json:"answers" binding:"required"`
}

func HandleUpdateAttemptAnswers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		attemptID := c.Param("id")

		var attempt ExamAttempt
		if err := db.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy lượt làm bài"})
			return
		}

		if attempt.UserID != userID.(string) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền cập nhật lượt làm bài này"})
			return
		}

		if attempt.Status != "inprogress" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Bài thi đã được nộp từ trước"})
			return
		}

		// Grace period 10 seconds for slow network
		if time.Now().After(attempt.ExpiresAt.Add(10 * time.Second)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Thời gian làm bài đã kết thúc"})
			return
		}

		var req UpdateAnswersRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Đáp án không hợp lệ"})
			return
		}

		attempt.Answers = req.Answers
		if err := db.Save(&attempt).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu nháp đáp án"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Lưu nháp thành công"})
	}
}

type FinalizeAttemptRequest struct {
	Answers map[string]interface{} `json:"answers" binding:"required"`
}

func HandleFinalizeAndSubmitAttempt(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		attemptID := c.Param("id")

		var attempt ExamAttempt
		if err := db.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy lượt làm bài"})
			return
		}

		if attempt.UserID != userID.(string) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền nộp bài lượt thi này"})
			return
		}

		if attempt.Status != "inprogress" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Lượt thi này đã được nộp trước đó"})
			return
		}

		// Grace period 15 seconds for slow network latency when submitting
		if time.Now().After(attempt.ExpiresAt.Add(15 * time.Second)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Thời gian làm bài thi đã kết thúc"})
			return
		}

		var req FinalizeAttemptRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu nộp bài không hợp lệ"})
			return
		}

		// Fetch quiz to score
		var quiz Quiz
		if err := db.Where("id = ?", attempt.QuizID).First(&quiz).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải cấu trúc đề thi để chấm điểm"})
			return
		}

		// Compute score on Go side (Equivalent to Postgres trigger finalize_attempt)
		score, totalQuestions := CalculateScore(&quiz, req.Answers)

		now := time.Now()
		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 1. Update attempt status, answers and score
		attempt.Status = "submitted"
		attempt.Answers = req.Answers
		attempt.Score = &score
		attempt.TotalQuestions = &totalQuestions
		attempt.SubmittedAt = &now

		if err := tx.Save(&attempt).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi cập nhật trạng thái nộp bài"})
			return
		}

		// 2. Sync to submissions (Equivalent to Postgres trigger sync_attempt_to_submission)
		var studentProfile Profile
		if err := tx.Where("id = ?", userID).First(&studentProfile).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tìm thấy thông tin hồ sơ học sinh"})
			return
		}

		submission := Submission{
			ID:             attempt.ID, // keeping 1-1 ID match
			QuizID:         attempt.QuizID,
			QuizTitle:      quiz.Title,
			StudentID:      userID.(string),
			StudentName:    studentProfile.Name,
			Score:          score,
			TotalQuestions: totalQuestions,
			Answers:        req.Answers,
			SubmittedAt:    now,
		}

		if err := tx.Save(&submission).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi đồng bộ kết quả thi"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi kết thúc giao dịch lưu bài"})
			return
		}

		// 3. Refresh Leaderboard in background/foreground
		go func() {
			if err := RefreshOverallLeaderboard(db); err != nil {
				println("Lỗi tính toán lại BXH tổng:", err.Error())
			}
		}()

		c.JSON(http.StatusOK, gin.H{
			"score":          score,
			"totalQuestions": totalQuestions,
		})
	}
}

func HandleGetStudentQuestions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		quizID := c.Query("p_quiz_id")

		var quiz Quiz
		if err := db.Where("id = ?", quizID).First(&quiz).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đề thi"})
			return
		}

		// Strip correct answers
		stripped := StripAnswers(quiz.Questions)
		c.JSON(http.StatusOK, stripped)
	}
}

func HandleGetReviewQuestions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		roleVal, _ := c.Get("role")
		submissionID := c.Query("p_submission_id")

		var sub Submission
		if err := db.Where("id = ?", submissionID).First(&sub).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy bài nộp"})
			return
		}

		// Auth guard: Only the student who took it, or teacher/admin can view full questions
		if sub.StudentID != userID.(string) && roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền xem đáp án bài thi này"})
			return
		}

		var quiz Quiz
		if err := db.Where("id = ?", sub.QuizID).First(&quiz).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tìm thấy đề thi liên kết"})
			return
		}

		c.JSON(http.StatusOK, quiz.Questions) // return full questions with answers
	}
}

func HandleGetSubmissions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		userID, _ := c.Get("userID")

		var submissions []Submission
		var err error

		if roleVal.(string) == "student" {
			err = db.Where("student_id = ?", userID).Order("submitted_at desc").Find(&submissions).Error
		} else {
			// Teacher/Admin can see all
			err = db.Order("submitted_at desc").Find(&submissions).Error
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải danh sách kết quả bài nộp"})
			return
		}

		// Fetch duration/timeSpent from exam_attempts in seconds
		timeMap := make(map[string]int)
		if len(submissions) > 0 {
			ids := make([]string, len(submissions))
			for i, s := range submissions {
				ids[i] = s.ID
			}
			type AttemptTime struct {
				ID        string `gorm:"column:id"`
				TimeSpent int    `gorm:"column:time_spent"`
			}
			var attemptTimes []AttemptTime
			db.Table("exam_attempts").
				Select("id, TIMESTAMPDIFF(SECOND, started_at, submitted_at) as time_spent").
				Where("id IN ?", ids).
				Scan(&attemptTimes)

			for _, at := range attemptTimes {
				timeMap[at.ID] = at.TimeSpent
			}
		}

		// Map to match frontend interface
		response := make([]gin.H, len(submissions))
		for i, s := range submissions {
			tSpent, hasTime := timeMap[s.ID]
			resObj := gin.H{
				"id":             s.ID,
				"quizId":         s.QuizID,
				"quizTitle":      s.QuizTitle,
				"studentId":      s.StudentID,
				"studentName":    s.StudentName,
				"score":          s.Score,
				"totalQuestions": s.TotalQuestions,
				"answers":        s.Answers,
				"submittedAt":    s.SubmittedAt.Format("2006-01-02 15:04:05"),
			}
			if hasTime {
				resObj["timeSpent"] = tSpent
			} else {
				resObj["timeSpent"] = 0
			}
			response[i] = resObj
		}

		c.JSON(http.StatusOK, response)
	}
}

func HandleGetQuizLeaderboard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		quizID := c.Query("p_quiz_id")

		// Query earliest submitted attempts for each student on this quiz (first attempt BXH)
		type LeaderboardRow struct {
			StudentID        string    `json:"studentId"`
			StudentName      string    `json:"studentName"`
			StudentUsername  string    `json:"studentUsername"`
			StudentGrade     *string   `json:"studentGrade"`
			StudentAvatarURL *string   `json:"studentAvatarUrl"`
			Score            float64   `json:"score"`
			DurationSeconds  int       `json:"durationSeconds"`
			SubmittedAt      time.Time `json:"submittedAt"`
		}

		var rows []LeaderboardRow
		query := `
			SELECT 
				ea.user_id as student_id,
				p.name as student_name,
				p.username as student_username,
				p.grade as student_grade,
				p.avatar_url as student_avatar_url,
				ea.score as score,
				TIMESTAMPDIFF(SECOND, ea.started_at, ea.submitted_at) as duration_seconds,
				ea.submitted_at as submitted_at
			FROM exam_attempts ea
			JOIN profiles p ON p.id = ea.user_id
			WHERE ea.quiz_id = ? AND ea.status = 'submitted' AND p.role = 'student'
			AND ea.started_at = (
				SELECT MIN(started_at) 
				FROM exam_attempts 
				WHERE user_id = ea.user_id AND quiz_id = ea.quiz_id AND status = 'submitted'
			)
			ORDER BY score DESC, duration_seconds ASC, submitted_at ASC
		`

		if err := db.Raw(query, quizID).Scan(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tính toán bảng xếp hạng đề thi: " + err.Error()})
			return
		}

		// Compute rank positions (Dense rank behavior)
		rankedResponse := make([]gin.H, len(rows))
		rank := 0
		var lastScore float64 = -1.0
		var lastDur int = -1

		for i, r := range rows {
			if r.Score != lastScore || r.DurationSeconds != lastDur {
				rank = i + 1
				lastScore = r.Score
				lastDur = r.DurationSeconds
			}
			rankedResponse[i] = gin.H{
				"rankPosition":     rank,
				"studentId":        r.StudentID,
				"studentName":      r.StudentName,
				"studentUsername":  r.StudentUsername,
				"studentGrade":     r.StudentGrade,
				"studentAvatarUrl": r.StudentAvatarURL,
				"score":            r.Score,
				"durationSeconds":  r.DurationSeconds,
				"submittedAt":      r.SubmittedAt.Format("2006-01-02 15:04:05"),
			}
		}

		c.JSON(http.StatusOK, rankedResponse)
	}
}

func HandleGetOverallLeaderboard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		grade := c.Query("p_grade")

		// Retrieve ranking from precomputed user_overall_stats table joined with profiles
		today := time.Now().Format("2006-01-02")

		type OverallRow struct {
			RankPosition         int     `json:"rankPosition"`
			PreviousRankPosition *int    `json:"previousRankPosition"`
			RankDate             string  `json:"-"`
			StudentID            string  `json:"studentId"`
			StudentName          string  `json:"studentName"`
			StudentUsername      string  `json:"studentUsername"`
			StudentGrade         *string `json:"studentGrade"`
			StudentAvatarURL     *string `json:"studentAvatarUrl"`
			TotalPoints          float64 `json:"totalPoints"`
			TestsCompleted       int     `json:"testsCompleted"`
		}

		rows := []OverallRow{}
		query := `
			SELECT 
				uos.current_rank as rank_position,
				uos.previous_rank as previous_rank_position,
				COALESCE(uos.rank_date, '') as rank_date,
				uos.user_id as student_id,
				p.name as student_name,
				p.username as student_username,
				p.grade as student_grade,
				p.avatar_url as student_avatar_url,
				uos.total_exp as total_points,
				uos.tests_completed as tests_completed
			FROM user_overall_stats uos
			JOIN profiles p ON p.id = uos.user_id
			WHERE p.role = 'student' AND p.grade = ?
			ORDER BY uos.total_exp DESC, uos.tests_completed DESC
		`

		if err := db.Raw(query, grade).Scan(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lấy BXH tổng hợp"})
			return
		}

		// Dynamically compute Standard Competition Ranking (1224 rank) on the returned rows.
		// This guarantees that:
		// 1. Two students tied at 11 will be followed by 13 (not 12).
		// 2. If a student was recently moved from another grade, they will be ranked
		//    strictly according to their actual points in this grade, never stuck at Top 1.
		rank := 1
		var lastExp float64 = -1.0
		var lastTests int = -1

		for i, r := range rows {
			if r.TotalPoints != lastExp || r.TestsCompleted != lastTests {
				rank = i + 1
				lastExp = r.TotalPoints
				lastTests = r.TestsCompleted
			}
			rows[i].RankPosition = rank

			// If it's a new day and rank hasn't moved yet today, daily baseline defaults to current rank
			if r.RankDate != "" && r.RankDate != today && r.PreviousRankPosition == nil {
				rows[i].PreviousRankPosition = &rank
			}
		}

		c.JSON(http.StatusOK, rows)
	}
}

func HandleRefreshOverallLeaderboard(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên có quyền làm mới bảng xếp hạng"})
			return
		}

		if err := RefreshOverallLeaderboard(db); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể làm mới BXH: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Làm mới bảng xếp hạng thành công"})
	}
}

func HandleGetRecentSubmissionsByGrade(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		grade := c.Query("p_grade")

		type RecentRow struct {
			ID          string    `json:"id"`
			QuizTitle   string    `json:"quiz_title"`
			StudentName string    `json:"student_name"`
			Score       float64   `json:"score"`
			SubmittedAt time.Time `json:"submitted_at"`
		}

		rows := []RecentRow{}
		query := `
			SELECT s.id, s.quiz_title, s.student_name, s.score, s.submitted_at
			FROM submissions s
			JOIN profiles p ON p.id = s.student_id
			WHERE p.role = 'student' AND p.grade = ?
			ORDER BY s.submitted_at DESC
			LIMIT 5
		`
		if err := db.Raw(query, grade).Scan(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tải bảng tin hoạt động"})
			return
		}

		c.JSON(http.StatusOK, rows)
	}
}

// HandleRecordVisit records/increments daily visit count
func HandleRecordVisit(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		today := time.Now().Format("2006-01-02")
		db.Exec(`
			INSERT INTO site_visits (date, visits, updated_at) 
			VALUES (?, 1, NOW()) 
			ON DUPLICATE KEY UPDATE visits = visits + 1, updated_at = NOW()
		`, today)

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// HandleGetSystemStats returns real live system metrics
func HandleGetSystemStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		today := time.Now().Format("2006-01-02")

		// 1. Visits today
		var todayVisits int64
		_ = db.Model(&SiteVisit{}).Where("date = ?", today).Select("COALESCE(visits, 0)").Scan(&todayVisits).Error
		if todayVisits == 0 {
			db.Exec(`
				INSERT INTO site_visits (date, visits, updated_at) 
				VALUES (?, 1, NOW()) 
				ON DUPLICATE KEY UPDATE visits = visits + 1, updated_at = NOW()
			`, today)
			todayVisits = 1
		}

		// 2. Total visits
		var totalVisits int64
		_ = db.Model(&SiteVisit{}).Select("COALESCE(SUM(visits), 0)").Scan(&totalVisits).Error

		// 3. Online users (active within last 5 minutes)
		var onlineCount int64
		fiveMinsAgo := time.Now().Add(-5 * time.Minute)
		_ = db.Model(&Profile{}).Where("last_active_at >= ?", fiveMinsAgo).Count(&onlineCount).Error
		if onlineCount == 0 {
			onlineCount = 1 // Current visiting user
		}

		// 4. Total test submissions
		var totalSubmissions int64
		_ = db.Model(&Submission{}).Count(&totalSubmissions).Error

		c.JSON(http.StatusOK, gin.H{
			"todayVisits":      todayVisits,
			"totalVisits":      totalVisits,
			"onlineCount":      onlineCount,
			"totalSubmissions": totalSubmissions,
			"version":          AppVersion,
		})
	}
}


package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// StripAnswers removes answers & explanations from questions to prevent cheating
func StripAnswers(questions []Question) []Question {
	stripped := make([]Question, len(questions))
	for i, q := range questions {
		stripped[i] = Question{
			ID:           q.ID,
			Text:         q.Text,
			Options:      q.Options,
			Type:         q.Type,
			SectionTitle: q.SectionTitle,
			Points:       q.Points,
			// Excluded:
			// CorrectAnswerIndex
			// CorrectAnswers
			// ShortAnswerKey
			// Explanation
		}
	}
	return stripped
}

func HandleGetQuizzes(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		type QuizItem struct {
			ID             string         `json:"id"`
			Title          string         `json:"title"`
			Description    string         `json:"description"`
			Subject        string         `json:"subject"`
			Duration       int            `json:"duration"`
			Grade          *string        `json:"grade"`
			IsPublic       bool           `json:"isPublic" gorm:"column:is_public"`
			CreatedAt      time.Time      `json:"createdAt" gorm:"column:created_at"`
			ScoringConfig  *ScoringConfig `json:"scoringConfig" gorm:"column:scoring_config;type:json;serializer:json"`
			TotalQuestions int            `json:"totalQuestions" gorm:"column:total_questions"`
		}

		var list []QuizItem
		if err := db.Model(&Quiz{}).
			Select("id, title, description, subject, duration, grade, is_public, created_at, scoring_config, JSON_LENGTH(questions) as total_questions").
			Order("created_at desc").
			Scan(&list).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải danh sách đề thi"})
			return
		}

		responseQuizzes := make([]gin.H, len(list))
		for i, q := range list {
			grade := ""
			if q.Grade != nil {
				grade = *q.Grade
			}
			if grade == "" && q.TotalQuestions > 0 {
				grade = "10"
			}

			dummyQs := make([]gin.H, q.TotalQuestions)
			for j := range dummyQs {
				dummyQs[j] = gin.H{}
			}

			responseQuizzes[i] = gin.H{
				"id":            q.ID,
				"title":         q.Title,
				"description":   q.Description,
				"subject":       q.Subject,
				"duration":      q.Duration,
				"questions":     dummyQs,
				"grade":         grade,
				"isPublic":      q.IsPublic,
				"createdAt":     q.CreatedAt.Format("2006-01-02"),
				"scoringConfig": q.ScoringConfig,
			}
		}

		c.JSON(http.StatusOK, responseQuizzes)
	}
}

func HandleGetQuiz(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var quiz Quiz
		if err := db.First(&quiz, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đề thi"})
			return
		}

		roleVal, exists := c.Get("role")
		role := ""
		if exists {
			role = roleVal.(string)
		}

		if role != "teacher" && role != "admin" {
			quiz.Questions = StripAnswers(quiz.Questions)
		}

		c.JSON(http.StatusOK, quiz)
	}
}

func HandleCreateQuiz(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên mới có quyền tạo đề thi"})
			return
		}

		var quiz Quiz
		if err := c.ShouldBindJSON(&quiz); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đề thi không hợp lệ: " + err.Error()})
			return
		}

		userIDVal, _ := c.Get("userID")
		createdByID := userIDVal.(string)
		quiz.CreatedBy = &createdByID
		quiz.CreatedAt = time.Now()

		if err := db.Create(&quiz).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu đề thi: " + err.Error()})
			return
		}

		// Tự động tạo thông báo đề thi mới cho học sinh thuộc Khối lớp tương ứng
		go CreateQuizNotification(db, &quiz)

		c.JSON(http.StatusCreated, gin.H{"message": "Tạo đề thi thành công"})
	}
}

func HandleUpdateQuiz(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên mới có quyền cập nhật đề thi"})
			return
		}

		quizID := c.Param("id")
		var quiz Quiz
		if err := db.Where("id = ?", quizID).First(&quiz).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đề thi"})
			return
		}

		var updateData map[string]interface{}
		if err := c.ShouldBindJSON(&updateData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu cập nhật không hợp lệ"})
			return
		}

		// Map JSON keys to DB column names
		columnMapping := map[string]string{
			"title":         "title",
			"description":   "description",
			"subject":       "subject",
			"duration":      "duration",
			"grade":         "grade",
			"isPublic":      "is_public",
			"questions":     "questions",
			"scoringConfig": "scoring_config",
		}

		dbUpdateData := make(map[string]interface{})
		for k, v := range updateData {
			dbCol, ok := columnMapping[k]
			if !ok {
				continue
			}

			if dbCol == "questions" || dbCol == "scoring_config" {
				jsonBytes, err := json.Marshal(v)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Lỗi định dạng dữ liệu JSON cho cột " + dbCol})
					return
				}
				dbUpdateData[dbCol] = string(jsonBytes)
			} else {
				dbUpdateData[dbCol] = v
			}
		}

		if err := db.Model(&quiz).Updates(dbUpdateData).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật đề thi thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật đề thi thành công"})
	}
}

func HandleDeleteQuiz(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên mới có quyền xóa đề thi"})
			return
		}

		quizID := c.Param("id")
		if err := db.Where("id = ?", quizID).Delete(&Quiz{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Xóa đề thi thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Xóa đề thi thành công"})
	}
}

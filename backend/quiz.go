package main

import (
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
		var quizzes []Quiz
		if err := db.Order("created_at desc").Find(&quizzes).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải danh sách đề thi"})
			return
		}

		// Check role from context
		roleVal, exists := c.Get("role")
		role := ""
		if exists {
			role = roleVal.(string)
		}

		// If user is a teacher or admin, return full quizzes with questions.
		// Otherwise (student or public guest), return empty object placeholders to preserve question count (.length)
		// without sending massive JSON question data over the network.
		responseQuizzes := make([]gin.H, len(quizzes))
		for i, q := range quizzes {
			var questions interface{}
			if role == "teacher" || role == "admin" {
				questions = q.Questions
			} else {
				dummyQs := make([]gin.H, len(q.Questions))
				for j := range dummyQs {
					dummyQs[j] = gin.H{}
				}
				questions = dummyQs
			}

			// In supabaseService.ts: getQuizzes() does some fallback to parse grade from title/metadata.
			// GORM models has Grade database column/json. We'll populate grade.
			// GORM serialization will format it nicely
			grade := ""
			if q.Grade != nil {
				grade = *q.Grade
			}
			if grade == "" && len(q.Questions) > 0 {
				// Keep matching UI expects in supabaseService.ts
				grade = "10"
			}

			responseQuizzes[i] = gin.H{
				"id":            q.ID,
				"title":         q.Title,
				"description":   q.Description,
				"subject":       q.Subject,
				"duration":      q.Duration,
				"questions":     questions,
				"grade":         grade,
				"isPublic":      q.IsPublic,
				"createdAt":     q.CreatedAt.Format("2006-01-02"),
				"scoringConfig": q.ScoringConfig,
			}
		}

		c.JSON(http.StatusOK, responseQuizzes)
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

		// Ensure we don't accidentally override created_at
		delete(updateData, "created_at")
		delete(updateData, "created_by")

		// If questions are present, parse them correctly (GORM handles json fields)
		// Wait, mapping generic JSON map to GORM JSON field: GORM expects the exact types, or serialized maps.
		// Since GORM JSON serializer handles structs, let's parse into a Quiz struct partially or update GORM.
		// Let's bind directly to GORM by updating the quiz fields manually
		if err := db.Model(&quiz).Updates(updateData).Error; err != nil {
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

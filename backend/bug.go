package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func HandleCreateBugReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ReporterName string `json:"reporterName" binding:"required"`
			Description  string `json:"description" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu báo lỗi không hợp lệ: " + err.Error()})
			return
		}

		userIDVal, exists := c.Get("userID")
		var userID *string
		if exists {
			uid := userIDVal.(string)
			userID = &uid
		}

		bug := BugReport{
			ID:           uuid.New().String(),
			UserID:       userID,
			ReporterName: req.ReporterName,
			Description:  req.Description,
			CreatedAt:    time.Now(),
		}

		if err := db.Create(&bug).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu báo cáo lỗi: " + err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "Gửi báo cáo lỗi thành công! Cảm ơn bạn."})
	}
}

func HandleGetBugReports(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên mới được xem báo cáo lỗi"})
			return
		}

		type BugReportItem struct {
			ID           string    `json:"id"`
			UserID       *string   `json:"userId"`
			ReporterName string    `json:"reporterName"`
			Description  string    `json:"description"`
			CreatedAt    time.Time `json:"createdAt"`
			Username     *string   `json:"username"`
			UserRole     *string   `json:"userRole"`
			AvatarURL    *string   `json:"avatarUrl"`
			Grade        *string   `json:"grade"`
			Email        *string   `json:"email"`
		}

		var reports []BugReportItem
		err := db.Model(&BugReport{}).
			Select("bug_reports.*, profiles.username as username, profiles.role as user_role, profiles.avatar_url as avatar_url, profiles.grade as grade, users.email as email").
			Joins("left join profiles on profiles.id = bug_reports.user_id").
			Joins("left join users on users.id = bug_reports.user_id").
			Order("bug_reports.created_at desc").
			Scan(&reports).Error

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách báo cáo lỗi: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, reports)
	}
}

func HandleDeleteBugReport(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên mới có quyền xóa báo cáo lỗi"})
			return
		}

		bugID := c.Param("id")
		if bugID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu mã báo cáo lỗi cần xóa"})
			return
		}

		if err := db.Where("id = ?", bugID).Delete(&BugReport{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi xóa báo cáo lỗi: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa báo cáo lỗi thành công!"})
	}
}


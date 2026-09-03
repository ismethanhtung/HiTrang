package main

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// NotificationResponse wraps a notification with the read status for the requesting user
type NotificationResponse struct {
	ID          string    `json:"id"`
	UserID      *string   `json:"userId"`
	TargetGrade *string   `json:"targetGrade"`
	TargetPlan  *string   `json:"targetPlan"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Message     string    `json:"message"`
	Link        string    `json:"link"`
	QuizID      *string   `json:"quizId"`
	CreatedBy   *string   `json:"createdBy,omitempty"`
	IsRead      bool      `json:"isRead"`
	ReadCount   int       `json:"readCount,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CreateQuizNotification creates a notification when a new quiz is published
func CreateQuizNotification(db *gorm.DB, quiz *Quiz) {
	if quiz == nil || quiz.ID == "" {
		return
	}

	targetGrade := "all"
	gradeDisplay := "tất cả các lớp"
	if quiz.Grade != nil && strings.TrimSpace(*quiz.Grade) != "" {
		cleanGrade := strings.TrimSpace(*quiz.Grade)
		targetGrade = cleanGrade
		gradeDisplay = fmt.Sprintf("Lớp %s", cleanGrade)
	}

	quizTitle := strings.TrimSpace(quiz.Title)
	if quizTitle == "" {
		quizTitle = "Đề ôn tập mới"
	}

	allPlan := "all"
	notif := Notification{
		ID:          uuid.New().String(),
		UserID:      nil, // Broadcast to target grade
		TargetGrade: &targetGrade,
		TargetPlan:  &allPlan,
		Type:        "new_quiz",
		Title:       "Đề thi mới từ Cô Trang 📝",
		Message:     fmt.Sprintf("Cô Trang vừa đăng đề thi mới cho %s: \"%s\". Vào test ngay nhé!", gradeDisplay, quizTitle),
		Link:        fmt.Sprintf("/quiz/%s", quiz.ID),
		QuizID:      &quiz.ID,
		CreatedBy:   quiz.CreatedBy,
		CreatedAt:   time.Now(),
	}

	_ = db.Create(&notif).Error
}

// HandleGetNotifications (Protected)
// GET /api/notifications
func HandleGetNotifications(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, _ := c.Get("userID")
		userID := userIDVal.(string)

		// Get user's profile to check their grade and plan
		var profile Profile
		_ = db.Where("id = ?", userID).First(&profile)

		userGrade := ""
		if profile.Grade != nil && *profile.Grade != "" {
			userGrade = strings.TrimSpace(*profile.Grade)
		}
		userPlan := strings.TrimSpace(profile.Plan)
		if userPlan == "" {
			userPlan = "nothing"
		}

		// Query notifications relevant to this user
		var rawNotifs []Notification
		query := db.Order("created_at desc").Limit(50)

		if profile.Role == "teacher" || profile.Role == "admin" {
			// Teachers/Admins see all broadcast notifications plus personal ones
			query = query.Where("user_id = ? OR user_id IS NULL", userID)
		} else {
			// Students see:
			// 1. Personal notifications (user_id = userID)
			// 2. Broadcast matching grade AND matching plan
			gradeCondition := "(target_grade = 'all' OR target_grade IS NULL OR target_grade = '')"
			if userGrade != "" {
				gradeCondition = fmt.Sprintf("(target_grade = '%s' OR target_grade = 'all' OR target_grade IS NULL OR target_grade = '')", userGrade)
			}

			planCondition := fmt.Sprintf("(target_plan = '%s' OR target_plan = 'all' OR target_plan IS NULL OR target_plan = '')", userPlan)

			query = query.Where(
				fmt.Sprintf("user_id = ? OR (user_id IS NULL AND %s AND %s)", gradeCondition, planCondition),
				userID,
			)
		}

		if err := query.Find(&rawNotifs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải thông báo"})
			return
		}

		// Find which of these notifications have been read by the user
		var notifIDs []string
		for _, n := range rawNotifs {
			notifIDs = append(notifIDs, n.ID)
		}

		readMap := make(map[string]bool)
		if len(notifIDs) > 0 {
			var reads []NotificationRead
			_ = db.Where("user_id = ? AND notification_id IN ?", userID, notifIDs).Find(&reads).Error
			for _, r := range reads {
				readMap[r.NotificationID] = true
			}
		}

		// Format output with isRead flag and count unread
		notifications := make([]NotificationResponse, 0, len(rawNotifs))
		unreadCount := 0

		for _, n := range rawNotifs {
			isRead := readMap[n.ID]
			if !isRead {
				unreadCount++
			}
			linkStr := ""
			if n.Link != "" {
				linkStr = n.Link
			}
			notifications = append(notifications, NotificationResponse{
				ID:          n.ID,
				UserID:      n.UserID,
				TargetGrade: n.TargetGrade,
				TargetPlan:  n.TargetPlan,
				Type:        n.Type,
				Title:       n.Title,
				Message:     n.Message,
				Link:        linkStr,
				QuizID:      n.QuizID,
				CreatedBy:   n.CreatedBy,
				IsRead:      isRead,
				CreatedAt:   n.CreatedAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"notifications": notifications,
			"unreadCount":   unreadCount,
		})
	}
}

// HandleMarkNotificationRead (Protected)
// POST /api/notifications/:id/read
func HandleMarkNotificationRead(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, _ := c.Get("userID")
		userID := userIDVal.(string)
		notifID := c.Param("id")

		if strings.TrimSpace(notifID) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID thông báo không hợp lệ"})
			return
		}

		readEntry := NotificationRead{
			NotificationID: notifID,
			UserID:         userID,
			ReadAt:         time.Now(),
		}

		// Ignore duplicate conflict
		_ = db.Clauses(clause.OnConflict{DoNothing: true}).Create(&readEntry).Error

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// HandleMarkAllNotificationsRead (Protected)
// POST /api/notifications/read-all
func HandleMarkAllNotificationsRead(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, _ := c.Get("userID")
		userID := userIDVal.(string)

		var profile Profile
		_ = db.Where("id = ?", userID).First(&profile)

		userGrade := ""
		if profile.Grade != nil && *profile.Grade != "" {
			userGrade = strings.TrimSpace(*profile.Grade)
		}
		userPlan := strings.TrimSpace(profile.Plan)
		if userPlan == "" {
			userPlan = "nothing"
		}

		var rawNotifs []Notification
		query := db.Select("id").Limit(100)

		if profile.Role == "teacher" || profile.Role == "admin" {
			query = query.Where("user_id = ? OR user_id IS NULL", userID)
		} else {
			gradeCondition := "(target_grade = 'all' OR target_grade IS NULL OR target_grade = '')"
			if userGrade != "" {
				gradeCondition = fmt.Sprintf("(target_grade = '%s' OR target_grade = 'all' OR target_grade IS NULL OR target_grade = '')", userGrade)
			}
			planCondition := fmt.Sprintf("(target_plan = '%s' OR target_plan = 'all' OR target_plan IS NULL OR target_plan = '')", userPlan)

			query = query.Where(
				fmt.Sprintf("user_id = ? OR (user_id IS NULL AND %s AND %s)", gradeCondition, planCondition),
				userID,
			)
		}

		_ = query.Find(&rawNotifs).Error

		now := time.Now()
		for _, n := range rawNotifs {
			entry := NotificationRead{
				NotificationID: n.ID,
				UserID:         userID,
				ReadAt:         now,
			}
			_ = db.Clauses(clause.OnConflict{DoNothing: true}).Create(&entry).Error
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// ----------------------------------------------------
// ADMIN NOTIFICATION DISPATCHER HANDLERS
// ----------------------------------------------------

type AdminSendNotificationRequest struct {
	Title       string  `json:"title" binding:"required"`
	Message     string  `json:"message" binding:"required"`
	Type        string  `json:"type" binding:"required"` // "new_quiz", "teacher_message", "reminder", "system"
	TargetGrade *string `json:"targetGrade"`            // "all", "8", "9", "10", "11", "12"
	TargetPlan  *string `json:"targetPlan"`             // "all", "nothing", "basic", "vip"
	UserID      *string `json:"userId"`                 // Specific recipient
	Link        *string `json:"link"`
	QuizID      *string `json:"quizId"`
}

// HandleAdminSendNotification (Admin/Teacher only)
// POST /api/admin/notifications
func HandleAdminSendNotification(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		role := roleVal.(string)
		if role != "admin" && role != "teacher" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên hoặc giáo viên mới có quyền phát thông báo"})
			return
		}

		userIDVal, _ := c.Get("userID")
		adminUserID := userIDVal.(string)

		var req AdminSendNotificationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
			return
		}

		title := strings.TrimSpace(req.Title)
		message := strings.TrimSpace(req.Message)
		notifType := strings.TrimSpace(req.Type)
		if title == "" || message == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tiêu đề và nội dung không được để trống"})
			return
		}
		if notifType == "" {
			notifType = "teacher_message"
		}

		var targetGrade *string
		if req.TargetGrade != nil && strings.TrimSpace(*req.TargetGrade) != "" {
			val := strings.TrimSpace(*req.TargetGrade)
			targetGrade = &val
		} else {
			allGrade := "all"
			targetGrade = &allGrade
		}

		var targetPlan *string
		if req.TargetPlan != nil && strings.TrimSpace(*req.TargetPlan) != "" {
			val := strings.TrimSpace(*req.TargetPlan)
			targetPlan = &val
		} else {
			allPlan := "all"
			targetPlan = &allPlan
		}

		var targetUserID *string
		if req.UserID != nil && strings.TrimSpace(*req.UserID) != "" {
			val := strings.TrimSpace(*req.UserID)
			targetUserID = &val
			// If sending to specific user, clear broadcast grade/plan
			targetGrade = nil
			targetPlan = nil
		}

		var linkVal string
		if req.Link != nil {
			linkVal = strings.TrimSpace(*req.Link)
		}

		var quizIDVal *string
		if req.QuizID != nil && strings.TrimSpace(*req.QuizID) != "" {
			val := strings.TrimSpace(*req.QuizID)
			quizIDVal = &val
		}

		notif := Notification{
			ID:          uuid.New().String(),
			UserID:      targetUserID,
			TargetGrade: targetGrade,
			TargetPlan:  targetPlan,
			Type:        notifType,
			Title:       title,
			Message:     message,
			Link:        linkVal,
			QuizID:      quizIDVal,
			CreatedBy:   &adminUserID,
			CreatedAt:   time.Now(),
		}

		if err := db.Create(&notif).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu thông báo: " + err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"success":      true,
			"message":      "Đã gửi thông báo thành công",
			"notification": notif,
		})
	}
}

// HandleAdminGetNotifications (Admin/Teacher only)
// GET /api/admin/notifications
func HandleAdminGetNotifications(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		role := roleVal.(string)
		if role != "admin" && role != "teacher" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Không có quyền truy cập"})
			return
		}

		var notifs []Notification
		if err := db.Order("created_at desc").Limit(100).Find(&notifs).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tải danh sách thông báo"})
			return
		}

		if len(notifs) == 0 {
			c.JSON(http.StatusOK, gin.H{"notifications": []NotificationResponse{}})
			return
		}

		notifIDs := make([]string, len(notifs))
		for i, n := range notifs {
			notifIDs[i] = n.ID
		}

		// Count reads per notification
		type ReadStat struct {
			NotificationID string `gorm:"column:notification_id"`
			Count          int    `gorm:"column:read_count"`
		}
		var stats []ReadStat
		_ = db.Model(&NotificationRead{}).
			Select("notification_id, COUNT(*) as read_count").
			Where("notification_id IN ?", notifIDs).
			Group("notification_id").
			Find(&stats).Error

		readCountMap := make(map[string]int)
		for _, s := range stats {
			readCountMap[s.NotificationID] = s.Count
		}

		result := make([]NotificationResponse, len(notifs))
		for i, n := range notifs {
			result[i] = NotificationResponse{
				ID:          n.ID,
				UserID:      n.UserID,
				TargetGrade: n.TargetGrade,
				TargetPlan:  n.TargetPlan,
				Type:        n.Type,
				Title:       n.Title,
				Message:     n.Message,
				Link:        n.Link,
				QuizID:      n.QuizID,
				CreatedBy:   n.CreatedBy,
				ReadCount:   readCountMap[n.ID],
				CreatedAt:   n.CreatedAt,
			}
		}

		c.JSON(http.StatusOK, gin.H{"notifications": result})
	}
}

// HandleAdminDeleteNotification (Admin/Teacher only)
// DELETE /api/admin/notifications/:id
func HandleAdminDeleteNotification(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		role := roleVal.(string)
		if role != "admin" && role != "teacher" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Không có quyền thực hiện thao tác"})
			return
		}

		id := c.Param("id")
		if strings.TrimSpace(id) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
			return
		}

		// Delete notification reads first
		_ = db.Where("notification_id = ?", id).Delete(&NotificationRead{}).Error

		// Delete the notification
		if err := db.Where("id = ?", id).Delete(&Notification{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa thông báo: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã xóa thông báo thành công"})
	}
}

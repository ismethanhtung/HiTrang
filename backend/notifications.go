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
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Message     string    `json:"message"`
	Link        string    `json:"link"`
	QuizID      *string   `json:"quizId"`
	IsRead      bool      `json:"isRead"`
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

	notif := Notification{
		ID:          uuid.New().String(),
		UserID:      nil, // Broadcast to target grade
		TargetGrade: &targetGrade,
		Type:        "new_quiz",
		Title:       "Đề thi mới từ Cô Trang 📝",
		Message:     fmt.Sprintf("Cô Trang vừa đăng đề thi mới cho %s: \"%s\". Vào test ngay nhé!", gradeDisplay, quizTitle),
		Link:        fmt.Sprintf("/quiz/%s", quiz.ID),
		QuizID:      &quiz.ID,
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

		// Get user's profile to check their grade
		var profile Profile
		_ = db.Where("id = ?", userID).First(&profile)

		userGrade := ""
		if profile.Grade != nil && *profile.Grade != "" {
			userGrade = strings.TrimSpace(*profile.Grade)
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
			// 2. Broadcast to all grades (target_grade = 'all' OR target_grade IS NULL OR target_grade = '')
			// 3. Broadcast to user's grade (target_grade = userGrade)
			if userGrade != "" {
				query = query.Where(
					"user_id = ? OR (user_id IS NULL AND (target_grade = ? OR target_grade = 'all' OR target_grade IS NULL OR target_grade = ''))",
					userID, userGrade,
				)
			} else {
				query = query.Where(
					"user_id = ? OR (user_id IS NULL AND (target_grade = 'all' OR target_grade IS NULL OR target_grade = ''))",
					userID,
				)
			}
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
			notifications = append(notifications, NotificationResponse{
				ID:          n.ID,
				UserID:      n.UserID,
				TargetGrade: n.TargetGrade,
				Type:        n.Type,
				Title:       n.Title,
				Message:     n.Message,
				Link:        n.Link,
				QuizID:      n.QuizID,
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

		var rawNotifs []Notification
		query := db.Select("id").Limit(100)

		if profile.Role == "teacher" || profile.Role == "admin" {
			query = query.Where("user_id = ? OR user_id IS NULL", userID)
		} else if userGrade != "" {
			query = query.Where(
				"user_id = ? OR (user_id IS NULL AND (target_grade = ? OR target_grade = 'all' OR target_grade IS NULL OR target_grade = ''))",
				userID, userGrade,
			)
		} else {
			query = query.Where(
				"user_id = ? OR (user_id IS NULL AND (target_grade = 'all' OR target_grade IS NULL OR target_grade = ''))",
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

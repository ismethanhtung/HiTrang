package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	jwtSecret     []byte
	usernameRegex = regexp.MustCompile(`^[a-z0-9_.]{4,30}$`)
)

func IsValidUsername(u string) bool {
	return usernameRegex.MatchString(u)
}

func InitJWT(secret string) {
	jwtSecret = []byte(secret)
}

type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID, username, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(72 * time.Hour)), // Token valid for 3 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// AuthMiddleware protects routes and injects claims into context
func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Thiếu mã xác thực (Authorization header)"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Mã xác thực sai định dạng (Bearer token)"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên đăng nhập hết hạn hoặc không hợp lệ"})
			c.Abort()
			return
		}

		tokenHash := hashToken(tokenStr)

		// Check if this session was explicitly revoked
		var sessionCount int64
		db.Model(&UserSession{}).Where("user_id = ?", claims.UserID).Count(&sessionCount)
		if sessionCount > 0 {
			var sess UserSession
			if err := db.Where("user_id = ? AND token_hash = ?", claims.UserID, tokenHash).First(&sess).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Phiên đăng nhập của thiết bị này đã bị đăng xuất"})
				c.Abort()
				return
			}
			// Update last seen
			go func(sid string) {
				_ = db.Model(&UserSession{}).Where("id = ?", sid).Update("last_seen", time.Now())
			}(sess.ID)
		}

		// Update last active time
		go func(uid string) {
			db.Model(&Profile{}).Where("id = ?", uid).Update("last_active_at", time.Now())
		}(claims.UserID)

		// Inject into Gin context
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("tokenHash", tokenHash)
		c.Next()
	}
}

type RegisterRequest struct {
	Name     string  `json:"name" binding:"required"`
	Username string  `json:"username" binding:"required"`
	Password string  `json:"password" binding:"required"`
	Role     string  `json:"role" binding:"required"` // student or teacher
	Grade    *string `json:"grade"`
}

func HandleRegister(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu đăng ký không đầy đủ hoặc sai định dạng"})
			return
		}

		cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))
		if cleanUsername == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên đăng nhập không được để trống"})
			return
		}

		if !IsValidUsername(cleanUsername) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên đăng nhập không hợp lệ. Tên đăng nhập phải từ 4-30 ký tự, chỉ gồm chữ cái không dấu (a-z), số (0-9), dấu gạch dưới (_) hoặc dấu chấm (.), không chứa khoảng trắng, dấu @ hay ký tự tiếng Việt có dấu."})
			return
		}

		// Hash password
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xử lý mật khẩu"})
			return
		}

		userID := uuid.New().String()

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 1. Create User (Email is nil for username-based signups)
		user := User{
			ID:           userID,
			Username:     cleanUsername,
			Email:        nil,
			PasswordHash: string(hashedBytes),
		}
		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			if strings.Contains(err.Error(), "Duplicate entry") {
				c.JSON(http.StatusConflict, gin.H{"error": "Tên đăng nhập này đã tồn tại trong hệ thống."})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi tạo tài khoản"})
			}
			return
		}

		// 2. Create Profile
		profile := Profile{
			ID:       userID,
			Name:     strings.TrimSpace(req.Name),
			Username: cleanUsername,
			Role:     req.Role,
			Plan:     "nothing",
			Grade:    req.Grade,
		}
		if err := tx.Create(&profile).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi tạo hồ sơ"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi hoàn tất đăng ký"})
			return
		}

		// Generate JWT token
		token, err := GenerateJWT(userID, cleanUsername, req.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo mã xác thực đăng nhập"})
			return
		}

		RecordUserSession(db, c, userID, token)

		c.JSON(http.StatusCreated, gin.H{
			"token": token,
			"user": gin.H{
				"id":        userID,
				"name":      profile.Name,
				"username":  profile.Username,
				"role":      profile.Role,
				"grade":     profile.Grade,
				"plan":      profile.Plan,
				"avatarUrl": profile.AvatarURL,
			},
		})
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	TOTPCode string `json:"totpCode"`
}

func HandleLogin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"})
			return
		}

		cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))

		var user User
		if err := db.Where("username = ? OR (email IS NOT NULL AND email = ?)", cleanUsername, cleanUsername).First(&user).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Tên đăng nhập hoặc mật khẩu không chính xác."})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi xác thực"})
			}
			return
		}

		// Compare bcrypt hash
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Tên đăng nhập hoặc mật khẩu không chính xác."})
			return
		}

		// If user has 2FA required on login, verify TOTP code
		if user.Require2FALogin && user.TOTPSecret != nil {
			if strings.TrimSpace(req.TOTPCode) == "" {
				c.JSON(http.StatusOK, gin.H{
					"require2FA": true,
					"message":    "Tài khoản đã bật bảo vệ 2 bước khi đăng nhập. Vui lòng nhập mã Google Authenticator.",
				})
				return
			}
			if !VerifyTOTP(*user.TOTPSecret, req.TOTPCode) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Mã xác thực 2 bước (Google Authenticator) không đúng hoặc đã hết hạn."})
				return
			}
		}

		var profile Profile
		if err := db.Where("id = ?", user.ID).First(&profile).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tìm thấy hồ sơ người dùng"})
			return
		}

		token, err := GenerateJWT(user.ID, user.Username, profile.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo mã xác thực đăng nhập"})
			return
		}

		RecordUserSession(db, c, user.ID, token)

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": gin.H{
				"id":              user.ID,
				"name":            profile.Name,
				"username":        profile.Username,
				"role":            profile.Role,
				"grade":           profile.Grade,
				"plan":            profile.Plan,
				"avatarUrl":       profile.AvatarURL,
				"totpEnabled":       user.TOTPSecret != nil,
				"totpLinked":        user.TOTPSecret != nil,
				"require2FALogin":   user.Require2FALogin,
				"passwordUpdatedAt": user.PasswordUpdatedAt,
			},
		})
	}
}

func HandleMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		var profile Profile
		if err := db.Where("id = ?", userID).First(&profile).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Hồ sơ người dùng không tồn tại"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":                profile.ID,
			"name":              profile.Name,
			"username":          profile.Username,
			"role":              profile.Role,
			"grade":             profile.Grade,
			"plan":              profile.Plan,
			"avatarUrl":         profile.AvatarURL,
			"totpEnabled":       user.TOTPSecret != nil,
			"totpLinked":        user.TOTPSecret != nil,
			"require2FALogin":   user.Require2FALogin,
			"passwordUpdatedAt": user.PasswordUpdatedAt,
		})
	}
}

func HandleGetAllProfiles(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ admin hoặc giáo viên mới có quyền xem danh sách người dùng"})
			return
		}

		type UserRow struct {
			ID           string     `json:"id"`
			Name         string     `json:"name"`
			Username     string     `json:"username"`
			Email        *string    `json:"email"`
			Role         string     `json:"role"`
			Plan         string     `json:"plan"`
			Grade        *string    `json:"grade"`
			AvatarURL    *string    `json:"avatarUrl"`
			CreatedAt    time.Time  `json:"created_at"`
			LastActiveAt *time.Time `json:"lastActiveAt"`
		}

		var userRows []UserRow
		if err := db.Table("profiles").
			Select("profiles.id, profiles.name, profiles.username, users.email, profiles.role, profiles.plan, profiles.grade, profiles.avatar_url, profiles.created_at, profiles.last_active_at").
			Joins("LEFT JOIN users ON users.id = profiles.id").
			Order("profiles.created_at desc").
			Scan(&userRows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách người dùng"})
			return
		}

		type ActiveExamInfo struct {
			QuizID          string `json:"quizId"`
			QuizTitle       string `json:"quizTitle"`
			StartedAt       string `json:"startedAt"`
			ExpiresAt       string `json:"expiresAt"`
			DurationMinutes int    `json:"durationMinutes"`
			AttemptNumber   int    `json:"attemptNumber"`
		}

		type UserResponse struct {
			ID           string          `json:"id"`
			Name         string          `json:"name"`
			Username     string          `json:"username"`
			Email        *string         `json:"email,omitempty"`
			IsGoogle     bool            `json:"isGoogle"`
			Role         string          `json:"role"`
			Plan         string          `json:"plan"`
			Grade        *string         `json:"grade"`
			AvatarURL    *string         `json:"avatarUrl"`
			CreatedAt    string          `json:"createdAt"`
			LastActiveAt *time.Time      `json:"lastActiveAt"`
			ActiveExam   *ActiveExamInfo `json:"activeExam,omitempty"`
		}

		// Find inprogress unexpired attempts
		var activeAttempts []struct {
			UserID          string
			QuizID          string
			StartedAt       time.Time
			ExpiresAt       time.Time
			DurationMinutes int
			QuizTitle       string
		}

		_ = db.Table("exam_attempts").
			Select("exam_attempts.user_id, exam_attempts.quiz_id, exam_attempts.started_at, exam_attempts.expires_at, exam_attempts.duration_minutes, COALESCE(quizzes.title, 'Đề thi') as quiz_title").
			Joins("LEFT JOIN quizzes ON quizzes.id = exam_attempts.quiz_id").
			Where("exam_attempts.status = 'inprogress' AND exam_attempts.expires_at > ?", time.Now()).
			Order("exam_attempts.started_at desc").
			Scan(&activeAttempts)

		// Count previous submissions for these active attempts
		submissionCountMap := make(map[string]int)
		if len(activeAttempts) > 0 {
			var counts []struct {
				StudentID string `gorm:"column:student_id"`
				QuizID    string `gorm:"column:quiz_id"`
				Count     int    `gorm:"column:count"`
			}
			_ = db.Table("submissions").
				Select("student_id, quiz_id, COUNT(*) as count").
				Group("student_id, quiz_id").
				Scan(&counts)
			for _, c := range counts {
				submissionCountMap[c.StudentID+"_"+c.QuizID] = c.Count
			}
		}

		activeMap := make(map[string]*ActiveExamInfo)
		for _, a := range activeAttempts {
			if _, exists := activeMap[a.UserID]; !exists {
				attemptNum := submissionCountMap[a.UserID+"_"+a.QuizID] + 1
				activeMap[a.UserID] = &ActiveExamInfo{
					QuizID:          a.QuizID,
					QuizTitle:       a.QuizTitle,
					StartedAt:       a.StartedAt.Format(time.RFC3339),
					ExpiresAt:       a.ExpiresAt.Format(time.RFC3339),
					DurationMinutes: a.DurationMinutes,
					AttemptNumber:   attemptNum,
				}
			}
		}

		resp := make([]UserResponse, len(userRows))
		for i, p := range userRows {
			isGoogle := false
			if p.Email != nil && strings.TrimSpace(*p.Email) != "" {
				isGoogle = true
			} else if p.AvatarURL != nil && strings.Contains(*p.AvatarURL, "googleusercontent.com") {
				isGoogle = true
			}

			resp[i] = UserResponse{
				ID:           p.ID,
				Name:         p.Name,
				Username:     p.Username,
				Email:        p.Email,
				IsGoogle:     isGoogle,
				Role:         p.Role,
				Plan:         p.Plan,
				Grade:        p.Grade,
				AvatarURL:    p.AvatarURL,
				CreatedAt:    p.CreatedAt.Format("2006-01-02"),
				LastActiveAt: p.LastActiveAt,
				ActiveExam:   activeMap[p.ID],
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

type UpdateUserProfileRequest struct {
	Name     string  `json:"name" binding:"required"`
	Username string  `json:"username" binding:"required"`
	Role     string  `json:"role" binding:"required"`
	Plan     string  `json:"plan" binding:"required"`
	Grade    *string `json:"grade"`
}

func HandleUpdateUserProfile(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ admin hoặc giáo viên mới có quyền cập nhật người dùng"})
			return
		}

		userID := c.Param("id")
		var profile Profile
		if err := db.Where("id = ?", userID).First(&profile).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		var req UpdateUserProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu cập nhật không hợp lệ"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Update profile
		profile.Name = req.Name
		profile.Username = strings.ToLower(strings.TrimSpace(req.Username))
		profile.Role = req.Role
		profile.Plan = req.Plan
		profile.Grade = req.Grade

		if err := tx.Save(&profile).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi cập nhật hồ sơ người dùng"})
			return
		}

		// Also update User username
		var user User
		if err := tx.Where("id = ?", userID).First(&user).Error; err == nil {
			user.Username = profile.Username
			if err := tx.Save(&user).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi cập nhật tài khoản người dùng"})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi giao dịch khi lưu cập nhật"})
			return
		}

		// Asynchronously refresh leaderboard ranks
		go func() {
			_ = RefreshOverallLeaderboard(db)
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật tài khoản thành công"})
	}
}

func HandleDeleteUserProfile(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ admin hoặc giáo viên mới có quyền xóa người dùng"})
			return
		}

		userID := c.Param("id")

		// Delete from User table which cascades to Profiles
		if err := db.Where("id = ?", userID).Delete(&User{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Xóa người dùng thất bại: " + err.Error()})
			return
		}

		// Asynchronously refresh leaderboard ranks
		go func() {
			_ = RefreshOverallLeaderboard(db)
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Xóa người dùng thành công"})
	}
}

type UpdateUserPlanRequest struct {
	Plan string `json:"plan" binding:"required"`
}

func HandleUpdateUserPlan(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ admin hoặc giáo viên mới có quyền thay đổi gói dịch vụ"})
			return
		}

		userID := c.Param("id")
		var req UpdateUserPlanRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Gói dịch vụ không hợp lệ"})
			return
		}

		if err := db.Model(&Profile{}).Where("id = ?", userID).Update("plan", req.Plan).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật gói dịch vụ: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật gói dịch vụ thành công"})
	}
}

type UpdateUserGradeRequest struct {
	Grade *string `json:"grade"`
}

func HandleUpdateUserGrade(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		// A user can update their own grade, or teacher/admin can do it.
		requestingUserID, _ := c.Get("userID")
		roleVal, _ := c.Get("role")

		if requestingUserID.(string) != userID && roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền cập nhật khối lớp cho tài khoản này"})
			return
		}

		var req UpdateUserGradeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Khối lớp không hợp lệ"})
			return
		}

		if err := db.Model(&Profile{}).Where("id = ?", userID).Update("grade", req.Grade).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật khối lớp: " + err.Error()})
			return
		}

		// Asynchronously refresh leaderboard ranks
		go func() {
			_ = RefreshOverallLeaderboard(db)
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật khối lớp thành công"})
	}
}

type UpdateProfileNameRequest struct {
	Name string `json:"name" binding:"required"`
}

func HandleUpdateProfileName(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req UpdateProfileNameRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Họ và tên không hợp lệ"})
			return
		}

		if err := db.Model(&Profile{}).Where("id = ?", userID).Update("name", req.Name).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật họ tên: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật họ tên thành công"})
	}
}

type UpdateUsernameRequest struct {
	Username string `json:"username" binding:"required"`
}

func HandleUpdateUsername(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists || userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Chưa xác thực người dùng"})
			return
		}
		roleVal, _ := c.Get("role")

		var req UpdateUsernameRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập tên đăng nhập mới"})
			return
		}

		cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))
		if !IsValidUsername(cleanUsername) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên đăng nhập không hợp lệ. Tên đăng nhập phải từ 4-30 ký tự, chỉ gồm chữ cái không dấu (a-z), số (0-9), dấu gạch dưới (_) hoặc dấu chấm (.), không chứa khoảng trắng, dấu @ hay ký tự tiếng Việt có dấu."})
			return
		}

		// Check if username already exists in another user
		var existing User
		if err := db.Where("username = ? AND id != ?", cleanUsername, userID).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Tên đăng nhập này đã được sử dụng bởi tài khoản khác. Vui lòng chọn tên khác."})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Update users table
		if err := tx.Model(&User{}).Where("id = ?", userID).Update("username", cleanUsername).Error; err != nil {
			tx.Rollback()
			if strings.Contains(err.Error(), "Duplicate entry") {
				c.JSON(http.StatusConflict, gin.H{"error": "Tên đăng nhập này đã được sử dụng."})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi cập nhật tài khoản: " + err.Error()})
			}
			return
		}

		// Update profiles table
		if err := tx.Model(&Profile{}).Where("id = ?", userID).Update("username", cleanUsername).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi cập nhật hồ sơ: " + err.Error()})
			return
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu giao dịch khi đổi tên đăng nhập"})
			return
		}

		roleStr := "student"
		if r, ok := roleVal.(string); ok && r != "" {
			roleStr = r
		}
		newToken, err := GenerateJWT(userID.(string), cleanUsername, roleStr)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"message":  "Đổi tên đăng nhập thành công",
				"username": cleanUsername,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Đổi tên đăng nhập thành công",
			"username": cleanUsername,
			"token":    newToken,
		})
	}
}

type UpdatePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	Password        string `json:"password" binding:"required"`
}

func HandleUpdatePassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req UpdatePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập mật khẩu mới"})
			return
		}

		if len(req.Password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu mới phải có ít nhất 6 ký tự"})
			return
		}

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		// Nếu người dùng cung cấp mật khẩu hiện tại, kiểm tra tính chính xác
		if strings.TrimSpace(req.CurrentPassword) != "" {
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu hiện tại không chính xác"})
				return
			}
		}

		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi mã hóa mật khẩu mới"})
			return
		}

		now := time.Now()
		updates := map[string]interface{}{
			"password_hash":       string(hashedBytes),
			"password_updated_at": &now,
		}

		if err := db.Model(&User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật mật khẩu thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":           "Cập nhật mật khẩu thành công",
			"passwordUpdatedAt": now,
		})
	}
}

type GoogleLoginRequest struct {
	Code        string `json:"code" binding:"required"`
	RedirectURI string `json:"redirectUri" binding:"required"`
}

func HandleGoogleOAuthLogin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req GoogleLoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu yêu cầu không hợp lệ"})
			return
		}

		googleClientID := os.Getenv("VITE_GOOGLE_CLIENT_ID")
		if googleClientID == "" {
			googleClientID = os.Getenv("GOOGLE_CLIENT_ID")
		}
		googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")

		if googleClientID == "" || googleClientSecret == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Hệ thống chưa cấu hình Google Client ID / Client Secret"})
			return
		}

		// Exchange code for token
		tokenURL := "https://oauth2.googleapis.com/token"
		resp, err := http.PostForm(tokenURL, url.Values{
			"code":          {req.Code},
			"client_id":     {googleClientID},
			"client_secret": {googleClientSecret},
			"redirect_uri":  {req.RedirectURI},
			"grant_type":    {"authorization_code"},
		})
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không thể kết nối đến máy chủ Google OAuth: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(resp.Body)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Lỗi trao đổi token với Google: " + string(bodyBytes)})
			return
		}

		var tokenResp struct {
			AccessToken string `json:"access_token"`
			IDToken     string `json:"id_token"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc phản hồi token từ Google"})
			return
		}

		// Get user info from Google
		userInfoURL := fmt.Sprintf("https://www.googleapis.com/oauth2/v3/userinfo?access_token=%s", url.QueryEscape(tokenResp.AccessToken))
		infoResp, err := http.Get(userInfoURL)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không thể lấy thông tin người dùng từ Google: " + err.Error()})
			return
		}
		defer infoResp.Body.Close()

		if infoResp.StatusCode != http.StatusOK {
			bodyBytes, _ := io.ReadAll(infoResp.Body)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Google từ chối cung cấp thông tin profile: " + string(bodyBytes)})
			return
		}

		var googleUser struct {
			Sub     string `json:"sub"`
			Email   string `json:"email"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		}
		if err := json.NewDecoder(infoResp.Body).Decode(&googleUser); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc dữ liệu profile từ Google"})
			return
		}

		if googleUser.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tài khoản Google của bạn không cung cấp địa chỉ email"})
			return
		}

		emailClean := strings.ToLower(strings.TrimSpace(googleUser.Email))

		// Check if user already exists
		var user User
		err = db.Preload("Profile").Where("email = ?", emailClean).First(&user).Error

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Create new user
				userID := uuid.New().String()
				emailParts := strings.Split(emailClean, "@")
				baseUsername := emailParts[0]
				uniqueUsername := GenerateUniqueUsername(db, baseUsername)

				// Create random password hash because of non-null db constraint
				randomPass := uuid.New().String()
				hashedBytes, _ := bcrypt.GenerateFromPassword([]byte(randomPass), bcrypt.DefaultCost)

				tx := db.Begin()
				defer func() {
					if r := recover(); r != nil {
						tx.Rollback()
					}
				}()

				user = User{
					ID:           userID,
					Username:     uniqueUsername,
					Email:        &emailClean,
					PasswordHash: string(hashedBytes),
				}
				if err := tx.Create(&user).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo tài khoản mới: " + err.Error()})
					return
				}

				nameClean := strings.TrimSpace(googleUser.Name)
				if nameClean == "" {
					nameClean = uniqueUsername
				}

				avatarVal := googleUser.Picture
				profile := Profile{
					ID:        userID,
					Name:      nameClean,
					Username:  uniqueUsername,
					Role:      "student",
					Plan:      "nothing",
					AvatarURL: &avatarVal,
				}
				if err := tx.Create(&profile).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo hồ sơ người dùng mới: " + err.Error()})
					return
				}

				if err := tx.Commit().Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hoàn tất giao dịch tạo tài khoản"})
					return
				}

				user.Profile = &profile
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi truy vấn cơ sở dữ liệu: " + err.Error()})
				return
			}
		}

		if user.Profile == nil {
			var profile Profile
			if err := db.Where("id = ?", user.ID).First(&profile).Error; err == nil {
				user.Profile = &profile
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể nạp thông tin hồ sơ của bạn"})
				return
			}
		}

		// Update profile's avatar url if it changed
		if googleUser.Picture != "" && (user.Profile.AvatarURL == nil || *user.Profile.AvatarURL != googleUser.Picture) {
			avatarVal := googleUser.Picture
			user.Profile.AvatarURL = &avatarVal
			db.Model(&Profile{}).Where("id = ?", user.ID).Update("avatar_url", avatarVal)
		}

		token, err := GenerateJWT(user.ID, user.Username, user.Profile.Role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo mã thông báo đăng nhập JWT"})
			return
		}

		RecordUserSession(db, c, user.ID, token)

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": gin.H{
				"id":        user.ID,
				"name":      user.Profile.Name,
				"username":  user.Username,
				"email":     user.Email,
				"role":      user.Profile.Role,
				"plan":      user.Profile.Plan,
				"grade":     user.Profile.Grade,
				"avatarUrl": user.Profile.AvatarURL,
				"createdAt": user.Profile.CreatedAt.Format("2006-01-02"),
			},
		})
	}
}

func GenerateUniqueUsername(db *gorm.DB, base string) string {
	username := strings.ToLower(strings.TrimSpace(base))
	var cleaned []rune
	for _, r := range username {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			cleaned = append(cleaned, r)
		}
	}
	username = string(cleaned)
	if username == "" {
		username = "user"
	}

	finalUsername := username
	var count int64
	db.Model(&User{}).Where("username = ?", finalUsername).Count(&count)

	suffix := 1
	for count > 0 {
		finalUsername = fmt.Sprintf("%s%d", username, suffix)
		db.Model(&User{}).Where("username = ?", finalUsername).Count(&count)
		suffix++
	}
	return finalUsername
}

func HandleUploadAvatar(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Không tìm thấy thông tin đăng nhập"})
			return
		}
		userID := userIDVal.(string)

		file, err := c.FormFile("avatar")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không nhận được file ảnh upload"})
			return
		}

		if file.Size > 2*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Kích thước ảnh vượt quá giới hạn 2MB"})
			return
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		allowedExts := map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".webp": true,
			".gif":  true,
		}
		if !allowedExts[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Định dạng file không được hỗ trợ (chỉ nhận JPG, JPEG, PNG, WEBP, GIF)"})
			return
		}

		filename := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), ext)
		savePath := filepath.Join("./uploads", filename)

		if err := c.SaveUploadedFile(file, savePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu file ảnh: " + err.Error()})
			return
		}

		scheme := "http"
		if c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https" {
			scheme = "https"
		}
		host := c.Request.Host
		avatarURL := fmt.Sprintf("%s://%s/uploads/%s", scheme, host, filename)

		if err := db.Model(&Profile{}).Where("id = ?", userID).Update("avatar_url", avatarURL).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi cập nhật ảnh đại diện: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":   "Tải ảnh đại diện lên thành công",
			"avatarUrl": avatarURL,
		})
	}
}

// GenerateSecureResetToken generates 32 cryptographically secure random bytes
// and returns both the raw token (to give to the user) and the SHA-256 hash (to store in DB).
func GenerateSecureResetToken() (string, string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}
	rawToken := hex.EncodeToString(bytes)
	tokenHash := HashResetToken(rawToken)
	return rawToken, tokenHash, nil
}

// HashResetToken hashes the raw token with SHA-256
func HashResetToken(rawToken string) string {
	hash := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(hash[:])
}

// HandleGenerateResetToken (Admin/Teacher only)
// POST /api/admin/users/:id/reset-token
func HandleGenerateResetToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền tạo link đặt lại mật khẩu"})
			return
		}

		targetUserID := c.Param("id")
		if targetUserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu mã tài khoản người dùng"})
			return
		}

		var targetUser User
		if err := db.Preload("Profile").Where("id = ?", targetUserID).First(&targetUser).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng trong hệ thống"})
			return
		}

		rawToken, tokenHash, err := GenerateSecureResetToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo token bảo mật ngẫu nhiên: " + err.Error()})
			return
		}

		tokenID := uuid.New().String()
		expiresAt := time.Now().Add(30 * time.Minute)

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Vô hiệu hóa các token cũ chưa sử dụng của user này
		if err := tx.Model(&PasswordResetToken{}).
			Where("user_id = ? AND used = ?", targetUserID, false).
			Update("used", true).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể vô hiệu hóa token cũ: " + err.Error()})
			return
		}

		// Lưu token hash mới
		newTokenRecord := PasswordResetToken{
			ID:        tokenID,
			UserID:    targetUserID,
			TokenHash: tokenHash,
			ExpiresAt: expiresAt,
			Used:      false,
			CreatedAt: time.Now(),
		}

		if err := tx.Create(&newTokenRecord).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu thông tin token reset: " + err.Error()})
			return
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu: " + err.Error()})
			return
		}

		name := targetUser.Username
		if targetUser.Profile != nil && targetUser.Profile.Name != "" {
			name = targetUser.Profile.Name
		}

		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"token":     rawToken,
			"expiresAt": expiresAt.Format(time.RFC3339),
			"userId":    targetUser.ID,
			"username":  targetUser.Username,
			"name":      name,
		})
	}
}

// HandleVerifyResetToken (Public)
// GET /api/auth/verify-reset-token?token=...
func HandleVerifyResetToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken := strings.TrimSpace(c.Query("token"))
		if rawToken == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"valid": false,
				"error": "Thiếu mã xác nhận đặt lại mật khẩu trong liên kết",
			})
			return
		}

		tokenHash := HashResetToken(rawToken)

		var tokenRecord PasswordResetToken
		if err := db.Where("token_hash = ? AND used = ? AND expires_at > ?", tokenHash, false, time.Now()).First(&tokenRecord).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"valid": false,
				"error": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (chỉ có hiệu lực trong 30 phút và dùng 1 lần). Vui lòng liên hệ giáo viên để nhận liên kết mới.",
			})
			return
		}

		var profile Profile
		if err := db.Where("id = ?", tokenRecord.UserID).First(&profile).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"valid": false,
				"error": "Không tìm thấy hồ sơ người dùng tương ứng",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"valid":    true,
			"username": profile.Username,
			"name":     profile.Name,
		})
	}
}

type ResetPasswordWithTokenRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// HandleResetPasswordWithToken (Public)
// POST /api/auth/reset-password
func HandleResetPasswordWithToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ResetPasswordWithTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu gửi lên không đầy đủ hoặc không hợp lệ"})
			return
		}

		req.Token = strings.TrimSpace(req.Token)
		if len(req.Password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu mới phải có ít nhất 6 ký tự"})
			return
		}

		tokenHash := HashResetToken(req.Token)

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		var tokenRecord PasswordResetToken
		if err := tx.Where("token_hash = ? AND used = ? AND expires_at > ?", tokenHash, false, time.Now()).First(&tokenRecord).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (chỉ có hiệu lực trong 30 phút và dùng 1 lần). Vui lòng liên hệ giáo viên để nhận liên kết mới.",
			})
			return
		}

		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi mã hóa mật khẩu mới"})
			return
		}

		// Cập nhật mật khẩu mới của người dùng
		if err := tx.Model(&User{}).Where("id = ?", tokenRecord.UserID).Update("password_hash", string(hashedBytes)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật mật khẩu người dùng: " + err.Error()})
			return
		}

		// Đánh dấu token này đã được sử dụng
		if err := tx.Model(&PasswordResetToken{}).Where("id = ?", tokenRecord.ID).Update("used", true).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật trạng thái token: " + err.Error()})
			return
		}

		// Vô hiệu hóa mọi token reset khác của người dùng này
		_ = tx.Model(&PasswordResetToken{}).Where("user_id = ? AND id <> ?", tokenRecord.UserID, tokenRecord.ID).Update("used", true)

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.",
		})
	}
}

// ----------------------------------------------------
// 2-STEP VERIFICATION (TOTP - RFC 6238 / RFC 4226)
// ----------------------------------------------------

// GenerateTOTPSecret generates a 20-byte random Base32 string (without padding)
func GenerateTOTPSecret() (string, error) {
	bytes := make([]byte, 20)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(bytes), nil
}

func generateHOTP(secret []byte, counter int64) string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(counter))

	mac := hmac.New(sha1.New, secret)
	mac.Write(buf)
	h := mac.Sum(nil)

	offset := h[len(h)-1] & 0x0f
	truncatedHash := binary.BigEndian.Uint32(h[offset:offset+4]) & 0x7fffffff
	code := truncatedHash % 1000000
	return fmt.Sprintf("%06d", code)
}

// VerifyTOTP verifies a 6-digit TOTP code against a Base32 secret with +/- 1 time step window (90s)
func VerifyTOTP(secretBase32 string, code string) bool {
	cleanSecret := strings.ToUpper(strings.TrimSpace(secretBase32))
	secret, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(cleanSecret)
	if err != nil {
		secret, err = base32.StdEncoding.DecodeString(cleanSecret)
		if err != nil {
			return false
		}
	}

	cleanCode := strings.TrimSpace(code)
	if len(cleanCode) != 6 {
		return false
	}

	currentTime := time.Now().Unix() / 30
	for i := int64(-1); i <= 1; i++ {
		t := currentTime + i
		if generateHOTP(secret, t) == cleanCode {
			return true
		}
	}
	return false
}

// HandleCheckForgotPassword (Public)
// POST /api/auth/forgot-password/check
func HandleCheckForgotPassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Username string `json:"username" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập tên đăng nhập hoặc email"})
			return
		}

		cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))

		var user User
		if err := db.Where("username = ? OR (email IS NOT NULL AND email = ?)", cleanUsername, cleanUsername).First(&user).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{
				"exists":  false,
				"has2FA":  false,
				"message": "Không tìm thấy tài khoản với tên đăng nhập này.",
			})
			return
		}

		var profile Profile
		_ = db.Where("id = ?", user.ID).First(&profile)

		name := user.Username
		if profile.Name != "" {
			name = profile.Name
		}

		hasGoogleAuth := user.TOTPSecret != nil && *user.TOTPSecret != ""

		c.JSON(http.StatusOK, gin.H{
			"exists":   true,
			"has2FA":   hasGoogleAuth,
			"username": user.Username,
			"name":     name,
		})
	}
}

// HandleResetWithTOTP (Public)
// POST /api/auth/forgot-password/reset-with-totp
func HandleResetWithTOTP(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Username string `json:"username" binding:"required"`
			TOTPCode string `json:"totpCode" binding:"required"`
			Password string `json:"password" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập đầy đủ thông tin"})
			return
		}

		if len(req.Password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu mới phải có ít nhất 6 ký tự"})
			return
		}

		cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))

		var user User
		if err := db.Where("username = ? OR (email IS NOT NULL AND email = ?)", cleanUsername, cleanUsername).First(&user).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không tìm thấy tài khoản người dùng"})
			return
		}

		if user.TOTPSecret == nil || *user.TOTPSecret == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Tài khoản này chưa liên kết Google Authenticator. Vui lòng nhắn tin cho cô Trang để nhận liên kết đổi mật khẩu.",
			})
			return
		}

		if !VerifyTOTP(*user.TOTPSecret, req.TOTPCode) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Mã xác thực 2 bước không chính xác hoặc đã hết hạn (mỗi mã có hiệu lực 30 giây). Vui lòng kiểm tra lại đồng hồ điện thoại.",
			})
			return
		}

		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi mã hóa mật khẩu mới"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Model(&User{}).Where("id = ?", user.ID).Update("password_hash", string(hashedBytes)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật mật khẩu: " + err.Error()})
			return
		}

		// Vô hiệu hóa mọi token reset cũ nếu có
		_ = tx.Model(&PasswordResetToken{}).Where("user_id = ? AND used = ?", user.ID, false).Update("used", true)

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi lưu dữ liệu: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.",
		})
	}
}

// HandleSetup2FA (Protected)
// POST /api/auth/2fa/setup
func HandleSetup2FA(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		secret, err := GenerateTOTPSecret()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo khóa bí mật 2 bước"})
			return
		}

		// Lưu secret tạm thời vào DB
		if err := db.Model(&User{}).Where("id = ?", user.ID).Update("totp_temp_secret", secret).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lưu khóa bí mật: " + err.Error()})
			return
		}

		// Chuẩn bị URI cho Google Authenticator
		// otpauth://totp/HiTrang:{username}?secret={secret}&issuer=HiTrang&algorithm=SHA1&digits=6&period=30
		issuer := "HiTrang"
		accountName := url.QueryEscape(user.Username)
		otpauthURI := fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
			issuer, accountName, secret, issuer)

		c.JSON(http.StatusOK, gin.H{
			"secret":     secret,
			"otpauthUri": otpauthURI,
		})
	}
}

// HandleEnable2FA (Protected)
// POST /api/auth/2fa/enable
func HandleEnable2FA(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req struct {
			Code string `json:"code" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập mã 6 số từ Google Authenticator"})
			return
		}

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		if user.TOTPTempSecret == nil || *user.TOTPTempSecret == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Chưa có yêu cầu cài đặt xác thực 2 bước. Vui lòng bấm 'Cài đặt' lại."})
			return
		}

		if !VerifyTOTP(*user.TOTPTempSecret, req.Code) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Mã xác thực không chính xác hoặc đã hết hạn. Hãy kiểm tra lại ứng dụng Google Authenticator và giờ của máy.",
			})
			return
		}

		// Kích hoạt chính thức: Lưu secret, Mặc định require_2fa_login = false để không bắt buộc mã khi đăng nhập
		updates := map[string]interface{}{
			"totp_secret":       *user.TOTPTempSecret,
			"totp_temp_secret":  nil,
			"totp_enabled":      true,
			"require_2fa_login": false,
		}

		if err := db.Model(&User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể kích hoạt xác thực 2 bước: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Liên kết Google Authenticator thành công! Bạn có thể dùng mã để khôi phục mật khẩu.",
		})
	}
}

// HandleDisable2FA (Protected)
// POST /api/auth/2fa/disable
func HandleDisable2FA(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req struct {
			Code     string `json:"code"`
			Password string `json:"password"`
		}
		_ = c.ShouldBindJSON(&req)

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		if user.TOTPSecret == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Google Authenticator hiện chưa được liên kết."})
			return
		}

		// Xác thực bằng mã TOTP hoặc mật khẩu
		authorized := false
		if strings.TrimSpace(req.Code) != "" && user.TOTPSecret != nil {
			if VerifyTOTP(*user.TOTPSecret, req.Code) {
				authorized = true
			}
		}
		if !authorized && strings.TrimSpace(req.Password) != "" {
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err == nil {
				authorized = true
			}
		}

		if !authorized {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mã xác thực hoặc mật khẩu không chính xác để hủy liên kết Google Authenticator."})
			return
		}

		updates := map[string]interface{}{
			"totp_secret":       nil,
			"totp_temp_secret":  nil,
			"totp_enabled":      false,
			"require_2fa_login": false,
		}

		if err := db.Model(&User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể hủy liên kết Google Authenticator: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Đã hủy liên kết Google Authenticator thành công.",
		})
	}
}

// HandleToggle2FALogin (Protected)
// PUT /api/auth/2fa/login-required
func HandleToggle2FALogin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req struct {
			Enabled bool `json:"enabled"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu yêu cầu không hợp lệ"})
			return
		}

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		if req.Enabled && (user.TOTPSecret == nil || *user.TOTPSecret == "") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng liên kết Google Authenticator trước khi bật xác thực lúc đăng nhập"})
			return
		}

		if err := db.Model(&User{}).Where("id = ?", user.ID).Update("require_2fa_login", req.Enabled).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật cấu hình: " + err.Error()})
			return
		}

		msg := "Đã tắt yêu cầu mã xác thực khi đăng nhập."
		if req.Enabled {
			msg = "Đã bật yêu cầu mã xác thực khi đăng nhập."
		}

		c.JSON(http.StatusOK, gin.H{
			"success":         true,
			"message":         msg,
			"require2FALogin": req.Enabled,
		})
	}
}

// ----------------------------------------------------
// ACTIVE SESSIONS & DEVICE MANAGEMENT
// ----------------------------------------------------

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func parseUserAgent(ua string) (browser, os, device string) {
	if ua == "" {
		return "Chrome 152.0.0.0", "macOS 10.15.7", "Desktop"
	}

	// 1. Device
	device = "Desktop"
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "mobile") || strings.Contains(uaLower, "iphone") || strings.Contains(uaLower, "android") {
		device = "Mobile"
	} else if strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "tablet") {
		device = "Tablet"
	}

	// 2. OS
	os = "Unknown OS"
	if strings.Contains(ua, "Macintosh") || strings.Contains(ua, "Mac OS X") {
		reMac := regexp.MustCompile(`Mac OS X ([0-9_.]+)`)
		match := reMac.FindStringSubmatch(ua)
		if len(match) > 1 {
			ver := strings.ReplaceAll(match[1], "_", ".")
			os = "macOS " + ver
		} else {
			os = "macOS 10.15.7"
		}
	} else if strings.Contains(ua, "Windows NT 10.0") {
		os = "Windows 11"
	} else if strings.Contains(ua, "Windows") {
		os = "Windows"
	} else if strings.Contains(ua, "iPhone") {
		os = "iOS"
	} else if strings.Contains(ua, "Android") {
		os = "Android"
	} else if strings.Contains(ua, "Linux") {
		os = "Linux"
	}

	// 3. Browser
	browser = "Trình duyệt Web"
	if strings.Contains(ua, "Edg/") {
		re := regexp.MustCompile(`Edg/([0-9.]+)`)
		m := re.FindStringSubmatch(ua)
		if len(m) > 1 {
			browser = "Edge " + m[1]
		} else {
			browser = "Edge"
		}
	} else if strings.Contains(ua, "Chrome/") {
		re := regexp.MustCompile(`Chrome/([0-9.]+)`)
		m := re.FindStringSubmatch(ua)
		if len(m) > 1 {
			browser = "Chrome " + m[1]
		} else {
			browser = "Chrome"
		}
	} else if strings.Contains(ua, "Firefox/") {
		re := regexp.MustCompile(`Firefox/([0-9.]+)`)
		m := re.FindStringSubmatch(ua)
		if len(m) > 1 {
			browser = "Firefox " + m[1]
		} else {
			browser = "Firefox"
		}
	} else if strings.Contains(ua, "Safari/") && strings.Contains(ua, "Version/") {
		re := regexp.MustCompile(`Version/([0-9.]+)`)
		m := re.FindStringSubmatch(ua)
		if len(m) > 1 {
			browser = "Safari " + m[1]
		} else {
			browser = "Safari"
		}
	}

	return browser, os, device
}

func RecordUserSession(db *gorm.DB, c *gin.Context, userID, token string) {
	if token == "" || userID == "" {
		return
	}
	tokenHash := hashToken(token)
	ua := c.GetHeader("User-Agent")
	browser, osName, device := parseUserAgent(ua)

	ip := c.ClientIP()
	if ip == "" {
		ip = c.RemoteIP()
	}
	if ip == "" {
		ip = "127.0.0.1"
	}

	location := "VN"
	if country := c.GetHeader("CF-IPCountry"); country != "" {
		location = country
	}

	sess := UserSession{
		ID:        uuid.New().String(),
		UserID:    userID,
		TokenHash: tokenHash,
		Browser:   browser,
		OS:        osName,
		Device:    device,
		IPAddress: ip,
		Location:  location,
		LastSeen:  time.Now(),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
		CreatedAt: time.Now(),
	}

	_ = db.Create(&sess)
}

// HandleGetSessions (Protected)
// GET /api/auth/sessions
func HandleGetSessions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		currentTokenHash, _ := c.Get("tokenHash")
		tokenHashStr, _ := currentTokenHash.(string)

		var sessions []UserSession
		db.Where("user_id = ?", userID).Order("last_seen DESC").Find(&sessions)

		// If no session found, record one on the fly for current device
		if len(sessions) == 0 && tokenHashStr != "" {
			ua := c.GetHeader("User-Agent")
			browser, osName, device := parseUserAgent(ua)
			ip := c.ClientIP()
			if ip == "" {
				ip = "127.0.0.1"
			}
			newSess := UserSession{
				ID:        uuid.New().String(),
				UserID:    userID.(string),
				TokenHash: tokenHashStr,
				Browser:   browser,
				OS:        osName,
				Device:    device,
				IPAddress: ip,
				Location:  "VN",
				LastSeen:  time.Now(),
				ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
				CreatedAt: time.Now(),
			}
			db.Create(&newSess)
			sessions = append(sessions, newSess)
		}

		for i := range sessions {
			if sessions[i].TokenHash == tokenHashStr {
				sessions[i].IsCurrent = true
			}
		}

		c.JSON(http.StatusOK, sessions)
	}
}

// HandleRevokeSession (Protected)
// DELETE /api/auth/sessions/:id
func HandleRevokeSession(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		sessionID := c.Param("id")

		if err := db.Where("id = ? AND user_id = ?", sessionID, userID).Delete(&UserSession{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể đăng xuất phiên: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã đăng xuất thiết bị."})
	}
}

// HandleRevokeAllOtherSessions (Protected)
// POST /api/auth/sessions/logout-all
func HandleRevokeAllOtherSessions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		currentTokenHash, _ := c.Get("tokenHash")
		tokenHashStr, _ := currentTokenHash.(string)

		if tokenHashStr != "" {
			if err := db.Where("user_id = ? AND token_hash <> ?", userID, tokenHashStr).Delete(&UserSession{}).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể đăng xuất các thiết bị khác: " + err.Error()})
				return
			}
		} else {
			_ = db.Where("user_id = ?", userID).Delete(&UserSession{})
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã đăng xuất toàn bộ thiết bị khác."})
	}
}

// HandleDeleteAccount (Protected)
// DELETE /api/auth/account
func HandleDeleteAccount(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req struct {
			Password string `json:"password"`
		}
		_ = c.ShouldBindJSON(&req)

		var user User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy người dùng"})
			return
		}

		// If user has password set and password is provided
		if user.PasswordHash != "" && req.Password != "" {
			if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu xác nhận không chính xác."})
				return
			}
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Delete cascading data
		_ = tx.Where("user_id = ?", user.ID).Delete(&UserSession{})
		_ = tx.Where("user_id = ?", user.ID).Delete(&PasswordResetToken{})
		_ = tx.Where("user_id = ?", user.ID).Delete(&Submission{})
		_ = tx.Where("user_id = ?", user.ID).Delete(&ExamAttempt{})
		_ = tx.Where("user_id = ?", user.ID).Delete(&UserOverallStats{})
		_ = tx.Where("reporter_id = ?", user.ID).Delete(&BugReport{})
		_ = tx.Where("id = ?", user.ID).Delete(&Profile{})
		if err := tx.Where("id = ?", user.ID).Delete(&User{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa tài khoản: " + err.Error()})
			return
		}

		if err := tx.Commit().Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hoàn tất xóa tài khoản: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Tài khoản của bạn đã được xóa vĩnh viễn."})
	}
}





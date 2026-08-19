package main

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var jwtSecret []byte

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
func AuthMiddleware() gin.HandlerFunc {
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

		// Inject into Gin context
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
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

		// Hash password
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xử lý mật khẩu"})
			return
		}

		userID := uuid.New().String()
		email := cleanUsername + "@hocvientinhte.edu.vn"

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 1. Create User
		user := User{
			ID:           userID,
			Username:     cleanUsername,
			Email:        email,
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

		c.JSON(http.StatusCreated, gin.H{
			"token": token,
			"user": gin.H{
				"id":       userID,
				"name":     profile.Name,
				"username": profile.Username,
				"role":     profile.Role,
				"grade":    profile.Grade,
				"plan":     profile.Plan,
			},
		})
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
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
		if err := db.Where("username = ?", cleanUsername).First(&user).Error; err != nil {
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

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user": gin.H{
				"id":       user.ID,
				"name":     profile.Name,
				"username": profile.Username,
				"role":     profile.Role,
				"grade":    profile.Grade,
				"plan":     profile.Plan,
			},
		})
	}
}

func HandleMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var profile Profile
		if err := db.Where("id = ?", userID).First(&profile).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Hồ sơ người dùng không tồn tại"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":       profile.ID,
			"name":     profile.Name,
			"username": profile.Username,
			"role":     profile.Role,
			"grade":    profile.Grade,
			"plan":     profile.Plan,
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

		var profiles []Profile
		if err := db.Order("created_at desc").Find(&profiles).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách người dùng"})
			return
		}

		type UserResponse struct {
			ID        string  `json:"id"`
			Name      string  `json:"name"`
			Username  string  `json:"username"`
			Role      string  `json:"role"`
			Plan      string  `json:"plan"`
			Grade     *string `json:"grade"`
			CreatedAt string  `json:"createdAt"`
		}

		resp := make([]UserResponse, len(profiles))
		for i, p := range profiles {
			resp[i] = UserResponse{
				ID:        p.ID,
				Name:      p.Name,
				Username:  p.Username,
				Role:      p.Role,
				Plan:      p.Plan,
				Grade:     p.Grade,
				CreatedAt: p.CreatedAt.Format("2006-01-02"),
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

		// Also update User username/email
		var user User
		if err := tx.Where("id = ?", userID).First(&user).Error; err == nil {
			user.Username = profile.Username
			user.Email = profile.Username + "@hocvientinhte.edu.vn"
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

type UpdatePasswordRequest struct {
	Password string `json:"password" binding:"required"`
}

func HandleUpdatePassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req UpdatePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu mới không hợp lệ"})
			return
		}

		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi mã hóa mật khẩu mới"})
			return
		}

		if err := db.Model(&User{}).Where("id = ?", userID).Update("password_hash", string(hashedBytes)).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Cập nhật mật khẩu thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật mật khẩu thành công"})
	}
}


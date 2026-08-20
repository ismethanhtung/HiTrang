package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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
				"id":        user.ID,
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

func HandleMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var profile Profile
		if err := db.Where("id = ?", userID).First(&profile).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Hồ sơ người dùng không tồn tại"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống khi tải hồ sơ: " + err.Error()})
			}
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":        profile.ID,
			"name":      profile.Name,
			"username":  profile.Username,
			"role":      profile.Role,
			"grade":     profile.Grade,
			"plan":      profile.Plan,
			"avatarUrl": profile.AvatarURL,
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
			AvatarURL *string `json:"avatarUrl"`
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
				AvatarURL: p.AvatarURL,
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
					Email:        emailClean,
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


package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

const AppVersion = "1.0.77"

func main() {
	// 1. Configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "hitrang"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "hitrang_pass"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "hitrang"
	}

	jwtSecretStr := os.Getenv("JWT_SECRET")
	if jwtSecretStr == "" {
		jwtSecretStr = "hitrang_grading_jwt_secret_key_2026_xyz"
	}
	InitJWT(jwtSecretStr)

	adminPasskey := os.Getenv("ADMIN_PASSKEY")
	if adminPasskey == "" {
		adminPasskey = "hitrang2026"
	}

	// 2. Connect to MySQL with retry loop
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	var db *gorm.DB
	var err error

	for i := 0; i < 15; i++ {
		log.Printf("Đang kết nối MySQL tại %s:%s (Lần thử %d/15)...", dbHost, dbPort, i+1)
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			break
		}
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Không thể kết nối đến MySQL: %v", err)
	}
	log.Println("Kết nối MySQL thành công!")

	// 3. Auto Migration
	log.Println("Đang chạy Auto Migration...")
	err = db.AutoMigrate(
		&User{},
		&Profile{},
		&Quiz{},
		&ExamAttempt{},
		&Submission{},
		&UserOverallStats{},
		&BugReport{},
		&ScheduleSlot{},
		&PasswordResetToken{},
		&UserSession{},
		&Notification{},
		&NotificationRead{},
		&SiteVisit{},
	)
	if err != nil {
		log.Fatalf("Migration thất bại: %v", err)
	}
	log.Println("Migration hoàn tất!")

	// Đảm bảo cột avatar_url có kiểu TEXT để tránh tràn dữ liệu khi lưu avatar từ Google OAuth
	if err := db.Exec("ALTER TABLE profiles MODIFY avatar_url TEXT").Error; err != nil {
		log.Printf("Cảnh báo: Không thể MODIFY avatar_url: %v", err)
	}

	// Đảm bảo cột email của users cho phép NULL (đăng ký username không bắt buộc và không gắn domain ảo)
	if err := db.Exec("ALTER TABLE users MODIFY email VARCHAR(255) NULL").Error; err != nil {
		log.Printf("Cảnh báo: Không thể MODIFY email: %v", err)
	}

	// Seed Schedule
	SeedScheduleIfEmpty(db)

	// 4. Auto Restore if Empty Database
	AutoRestoreIfEmpty(db, "/app/backup")

	// 5. Start background worker for expired attempts
	StartExpiredAttemptsWorker(db, 10*time.Second)

	// 6. Initialize Router
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// 6. CORS & Logging Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	if err := os.MkdirAll("./uploads", 0755); err != nil {
		log.Printf("Lỗi tạo thư mục uploads: %v", err)
	}
	r.Static("/uploads", "./uploads")

	// 7. API Routes
	api := r.Group("/api")
	{
		// Authentication
		api.POST("/auth/register", HandleRegister(db))
		api.POST("/auth/login", HandleLogin(db))
		api.POST("/auth/google", HandleGoogleOAuthLogin(db))
		api.GET("/auth/verify-reset-token", HandleVerifyResetToken(db))
		api.POST("/auth/reset-password", HandleResetPasswordWithToken(db))
		api.POST("/auth/forgot-password/check", HandleCheckForgotPassword(db))
		api.POST("/auth/forgot-password/reset-with-totp", HandleResetWithTOTP(db))
		api.GET("/version", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"version": AppVersion,
			})
		})
		api.GET("/stats/system", HandleGetSystemStats(db))
		api.POST("/stats/visit", HandleRecordVisit(db))
		api.GET("/schedule", HandleGetSchedule(db))
		api.POST("/auth/verify-admin", func(c *gin.Context) {
			var req struct {
				Password string `json:"password" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Mật khẩu không được trống"})
				return
			}
			isValid := req.Password == "admin123" || req.Password == "hitrang2026" || req.Password == adminPasskey
			c.JSON(http.StatusOK, gin.H{
				"success": isValid,
				"message": "Admin verification status",
			})
		})

		// Protected APIs
		protected := api.Group("")
		protected.Use(AuthMiddleware(db))
		{
			// User Me & Profile updates
			protected.GET("/auth/me", HandleMe(db))
			protected.PUT("/auth/me/name", HandleUpdateProfileName(db))
			protected.PUT("/auth/me/username", HandleUpdateUsername(db))
			protected.PUT("/auth/me/password", HandleUpdatePassword(db))
			protected.POST("/auth/me/avatar", HandleUploadAvatar(db))

			// Two-Factor Authentication (2FA)
			protected.POST("/auth/2fa/setup", HandleSetup2FA(db))
			protected.POST("/auth/2fa/enable", HandleEnable2FA(db))
			protected.POST("/auth/2fa/disable", HandleDisable2FA(db))
			protected.PUT("/auth/2fa/login-required", HandleToggle2FALogin(db))

			// Active Sessions & Account Deletion
			protected.GET("/auth/sessions", HandleGetSessions(db))
			protected.DELETE("/auth/sessions/:id", HandleRevokeSession(db))
			protected.POST("/auth/sessions/logout-all", HandleRevokeAllOtherSessions(db))
			protected.DELETE("/auth/account", HandleDeleteAccount(db))

			// In-App Notifications
			protected.GET("/notifications", HandleGetNotifications(db))
			protected.POST("/notifications/:id/read", HandleMarkNotificationRead(db))
			protected.POST("/notifications/read-all", HandleMarkAllNotificationsRead(db))
			protected.POST("/admin/notifications", HandleAdminSendNotification(db))
			protected.GET("/admin/notifications", HandleAdminGetNotifications(db))
			protected.DELETE("/admin/notifications/:id", HandleAdminDeleteNotification(db))

			// User Management (Admin/Teacher)
			protected.GET("/admin/users", HandleGetAllProfiles(db))
			protected.PUT("/admin/users/:id", HandleUpdateUserProfile(db))
			protected.DELETE("/admin/users/:id", HandleDeleteUserProfile(db))
			protected.PUT("/admin/users/:id/plan", HandleUpdateUserPlan(db))
			protected.PUT("/admin/users/:id/grade", HandleUpdateUserGrade(db))
			protected.POST("/admin/users/:id/reset-token", HandleGenerateResetToken(db))

			// Quizzes
			protected.GET("/quizzes", HandleGetQuizzes(db))
			protected.GET("/quizzes/:id", HandleGetQuiz(db))
			protected.POST("/quizzes", HandleCreateQuiz(db))
			protected.PUT("/quizzes/:id", HandleUpdateQuiz(db))
			protected.DELETE("/quizzes/:id", HandleDeleteQuiz(db))
			protected.POST("/quizzes/:id/rescore", HandleRescoreQuiz(db))

			// Exam Attempts
			protected.GET("/attempts/active", HandleGetActiveAttempt(db))
			protected.GET("/attempts/any-active", HandleGetAnyActiveAttempt(db))
			protected.POST("/attempts", HandleGetOrCreateAttempt(db))
			protected.PUT("/attempts/:id", HandleUpdateAttemptAnswers(db))
			protected.POST("/attempts/:id/finalize", HandleFinalizeAndSubmitAttempt(db))
			protected.GET("/attempts/student-questions", HandleGetStudentQuestions(db))
			protected.GET("/attempts/review-questions", HandleGetReviewQuestions(db))

			// Submissions
			protected.GET("/submissions", HandleGetSubmissions(db))

			// Leaderboards
			protected.GET("/leaderboard/quiz", HandleGetQuizLeaderboard(db))
			protected.GET("/leaderboard/overall", HandleGetOverallLeaderboard(db))
			protected.POST("/leaderboard/refresh", HandleRefreshOverallLeaderboard(db))
			// Bug Reports
			protected.POST("/bugs", HandleCreateBugReport(db))
			protected.GET("/admin/bugs", HandleGetBugReports(db))

			// Schedule & Settings
			protected.PUT("/admin/schedule", HandleUpdateSchedule(db))

			// Backups
			protected.GET("/admin/backup", HandleDownloadBackup(db))
			protected.POST("/admin/restore", HandleUploadRestore(db))
		}
	}

	// 8. Serve Frontend Static files
	// Make sure /app/dist exists (generated in Stage 1 Dockerfile)
	if _, err := os.Stat("/app/dist"); err == nil {
		r.Static("/assets", "/app/dist/assets")
		r.StaticFile("/favicon.ico", "/app/dist/favicon.ico")

		// Serve React single page app
		r.NoRoute(func(c *gin.Context) {
			c.File("/app/dist/index.html")
		})
	} else {
		log.Println("Cảnh báo: Không tìm thấy thư mục /app/dist để serve static frontend.")
	}

	// 9. Start Server
	log.Printf("Server đang chạy tại cổng :%s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Không thể khởi động server: %v", err)
	}
}

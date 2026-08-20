package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BackupData helper struct containing all table contents
type BackupData struct {
	Users            []User             `json:"users"`
	Profiles         []Profile          `json:"profiles"`
	Quizzes          []Quiz             `json:"quizzes"`
	Submissions      []Submission       `json:"submissions"`
	ExamAttempts     []ExamAttempt      `json:"exam_attempts"`
	UserOverallStats []UserOverallStats `json:"user_overall_stats"`
}

// GenerateBackupZip runs queries and bundles table outputs to a zip file in memory
func GenerateBackupZip(db *gorm.DB) ([]byte, error) {
	var data BackupData

	if err := db.Find(&data.Users).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.Profiles).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.Quizzes).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.Submissions).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.ExamAttempts).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.UserOverallStats).Error; err != nil {
		return nil, err
	}

	// Create Zip Archive
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Helper to add JSON to zip
	addJSONFile := func(filename string, data interface{}) error {
		jsonBytes, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			return err
		}
		f, err := zipWriter.Create(filename)
		if err != nil {
			return err
		}
		_, err = f.Write(jsonBytes)
		return err
	}

	// Write tables
	if err := addJSONFile("users.json", data.Users); err != nil {
		return nil, err
	}
	if err := addJSONFile("profiles.json", data.Profiles); err != nil {
		return nil, err
	}
	if err := addJSONFile("quizzes.json", data.Quizzes); err != nil {
		return nil, err
	}
	if err := addJSONFile("submissions.json", data.Submissions); err != nil {
		return nil, err
	}
	if err := addJSONFile("exam_attempts.json", data.ExamAttempts); err != nil {
		return nil, err
	}
	if err := addJSONFile("user_overall_stats.json", data.UserOverallStats); err != nil {
		return nil, err
	}

	// Walk ./uploads and add to zip to support full avatar backups
	uploadsDir := "./uploads"
	if entries, err := os.ReadDir(uploadsDir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			filePath := filepath.Join(uploadsDir, entry.Name())
			fileBytes, err := os.ReadFile(filePath)
			if err != nil {
				continue
			}
			f, err := zipWriter.Create("uploads/" + entry.Name())
			if err != nil {
				return nil, err
			}
			if _, err := f.Write(fileBytes); err != nil {
				return nil, err
			}
		}
	}

	if err := zipWriter.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// PerformRestore reads zip contents and loads tables inside a transaction
func PerformRestore(db *gorm.DB, zipReader *zip.Reader) error {
	var backup BackupData

	// Helper to read JSON from zip file
	readJSONFile := func(filename string, target interface{}) error {
		for _, file := range zipReader.File {
			if file.Name == filename {
				f, err := file.Open()
				if err != nil {
					return err
				}
				defer f.Close()
				content, err := io.ReadAll(f)
				if err != nil {
					return err
				}
				return json.Unmarshal(content, target)
			}
		}
		return fmt.Errorf("không tìm thấy file sao lưu %s trong zip", filename)
	}

	// Extract tables
	if err := readJSONFile("users.json", &backup.Users); err != nil {
		return err
	}
	if err := readJSONFile("profiles.json", &backup.Profiles); err != nil {
		return err
	}
	if err := readJSONFile("quizzes.json", &backup.Quizzes); err != nil {
		return err
	}
	if err := readJSONFile("submissions.json", &backup.Submissions); err != nil {
		return err
	}
	if err := readJSONFile("exam_attempts.json", &backup.ExamAttempts); err != nil {
		return err
	}
	if err := readJSONFile("user_overall_stats.json", &backup.UserOverallStats); err != nil {
		return err
	}

	// Execute restoring inside a transaction
	return db.Transaction(func(tx *gorm.DB) error {
		// Clear existing tables in reverse dependency order
		if err := tx.Exec("SET FOREIGN_KEY_CHECKS = 0").Error; err != nil {
			return err
		}
		defer tx.Exec("SET FOREIGN_KEY_CHECKS = 1")

		if err := tx.Exec("TRUNCATE TABLE user_overall_stats").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE submissions").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE exam_attempts").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE quizzes").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE profiles").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE users").Error; err != nil {
			return err
		}

		// Insert restored items
		// 1. Users
		if len(backup.Users) > 0 {
			if err := tx.Create(&backup.Users).Error; err != nil {
				return fmt.Errorf("khôi phục users thất bại: %w", err)
			}
		}
		// 2. Profiles
		if len(backup.Profiles) > 0 {
			if err := tx.Create(&backup.Profiles).Error; err != nil {
				return fmt.Errorf("khôi phục profiles thất bại: %w", err)
			}
		}
		// 3. Quizzes
		if len(backup.Quizzes) > 0 {
			if err := tx.Create(&backup.Quizzes).Error; err != nil {
				return fmt.Errorf("khôi phục quizzes thất bại: %w", err)
			}
		}
		// 4. Attempts
		if len(backup.ExamAttempts) > 0 {
			if err := tx.Create(&backup.ExamAttempts).Error; err != nil {
				return fmt.Errorf("khôi phục exam_attempts thất bại: %w", err)
			}
		}
		// 5. Submissions
		if len(backup.Submissions) > 0 {
			if err := tx.Create(&backup.Submissions).Error; err != nil {
				return fmt.Errorf("khôi phục submissions thất bại: %w", err)
			}
		}
		// 6. Stats
		if len(backup.UserOverallStats) > 0 {
			if err := tx.Create(&backup.UserOverallStats).Error; err != nil {
				return fmt.Errorf("khôi phục user_overall_stats thất bại: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Restore uploaded avatars files from zip
	if err := os.MkdirAll("./uploads", 0755); err != nil {
		return fmt.Errorf("không thể tạo thư mục uploads: %w", err)
	}

	for _, file := range zipReader.File {
		if strings.HasPrefix(file.Name, "uploads/") {
			filename := strings.TrimPrefix(file.Name, "uploads/")
			if filename == "" {
				continue
			}
			if err := func() error {
				f, err := file.Open()
				if err != nil {
					return err
				}
				defer f.Close()
				content, err := io.ReadAll(f)
				if err != nil {
					return err
				}
				outPath := filepath.Join("./uploads", filename)
				return os.WriteFile(outPath, content, 0644)
			}(); err != nil {
				return fmt.Errorf("không thể phục hồi file ảnh %s: %w", filename, err)
			}
		}
	}

	return nil
}

// AutoRestoreIfEmpty checks for backup restore.zip at startup
func AutoRestoreIfEmpty(db *gorm.DB, backupDir string) {
	// Check if database is empty by counting users
	var count int64
	db.Model(&User{}).Count(&count)
	if count > 0 {
		log.Println("Cơ sở dữ liệu đã có dữ liệu. Bỏ qua tự động phục hồi.")
		return
	}

	restorePath := filepath.Join(backupDir, "restore.zip")
	if _, err := os.Stat(restorePath); os.IsNotExist(err) {
		log.Println("Không tìm thấy file tự động phục hồi tại:", restorePath)
		return
	}

	log.Printf("Phát hiện file khôi phục tại %s. Đang tiến hành tự động khôi phục dữ liệu...", restorePath)

	zipFile, err := os.Open(restorePath)
	if err != nil {
		log.Println("Lỗi mở file restore.zip:", err)
		return
	}
	defer zipFile.Close()

	stat, err := zipFile.Stat()
	if err != nil {
		log.Println("Lỗi đọc thông tin file restore.zip:", err)
		return
	}

	zipReader, err := zip.NewReader(zipFile, stat.Size())
	if err != nil {
		log.Println("Lỗi giải nén file restore.zip:", err)
		return
	}

	if err := PerformRestore(db, zipReader); err != nil {
		log.Println("Khôi phục tự động thất bại:", err)
	} else {
		log.Println("Khôi phục tự động thành công! Toàn bộ dữ liệu đã được nạp.")
	}
}

func HandleDownloadBackup(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền sao lưu dữ liệu"})
			return
		}

		passkey := c.Query("passkey")
		h := sha256.New()
		h.Write([]byte(passkey))
		hashed := fmt.Sprintf("%x", h.Sum(nil))

		// SHA256 of "tungtung"
		if hashed != "56dd3c1a83d4b388e6c43b8f1ce465e747edacc0c4faf8c4525be19bc0adc56d" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Mật khẩu cấp 2 không chính xác"})
			return
		}

		zipBytes, err := GenerateBackupZip(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo file sao lưu: " + err.Error()})
			return
		}

		filename := fmt.Sprintf("hitrang_backup_%s.zip", time.Now().Format("20060102_150405"))

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.Header("Content-Type", "application/zip")
		c.Header("Content-Length", fmt.Sprintf("%d", len(zipBytes)))
		c.Data(http.StatusOK, "application/zip", zipBytes)
	}
}

func HandleUploadRestore(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền phục hồi dữ liệu"})
			return
		}

		file, err := c.FormFile("backup_file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không nhận được file upload"})
			return
		}

		srcFile, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc file upload"})
			return
		}
		defer srcFile.Close()

		// Read into bytes to create a zip reader in-memory
		buf := new(bytes.Buffer)
		if _, err := io.Copy(buf, srcFile); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc nội dung file"})
			return
		}

		zipReader, err := zip.NewReader(bytes.NewReader(buf.Bytes()), file.Size)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "File tải lên không đúng định dạng zip"})
			return
		}

		if err := PerformRestore(db, zipReader); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Phục hồi thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Khôi phục dữ liệu thành công"})
	}
}

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
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	MaxBackupFiles   = 50
	DefaultBackupDir = "./backups"
)

// BackupMetadata stores descriptive snapshot metrics
type BackupMetadata struct {
	SnapshotID       string    `json:"snapshot_id"`
	CreatedAt        time.Time `json:"created_at"`
	Type             string    `json:"type"` // "auto" | "manual"
	AppVersion       string    `json:"app_version"`
	TotalUsers       int       `json:"total_users"`
	TotalProfiles    int       `json:"total_profiles"`
	TotalQuizzes     int       `json:"total_quizzes"`
	TotalSubmissions int       `json:"total_submissions"`
	TotalAttempts    int       `json:"total_attempts"`
	TotalBugReports  int       `json:"total_bug_reports"`
	TotalSiteVisits  int       `json:"total_site_visits"`
}

// BackupSnapshotInfo represents item in the backup list for frontend
type BackupSnapshotInfo struct {
	ID               string    `json:"id"`
	Filename         string    `json:"filename"`
	SizeBytes        int64     `json:"sizeBytes"`
	SizeFormatted    string    `json:"sizeFormatted"`
	CreatedAt        time.Time `json:"createdAt"`
	Type             string    `json:"type"` // "auto" | "manual"
	ChecksumSHA256   string    `json:"checksumSha256"`
	TotalUsers       int       `json:"totalUsers"`
	TotalQuizzes     int       `json:"totalQuizzes"`
	TotalSubmissions int       `json:"totalSubmissions"`
	TotalBugReports  int       `json:"totalBugReports"`
	IsValid          bool      `json:"isValid"`
}

// BackupData helper struct containing all table contents
type BackupData struct {
	Metadata         *BackupMetadata    `json:"metadata,omitempty"`
	Users            []User             `json:"users"`
	Profiles         []Profile          `json:"profiles"`
	Quizzes          []Quiz             `json:"quizzes"`
	Submissions      []Submission       `json:"submissions"`
	ExamAttempts     []ExamAttempt      `json:"exam_attempts"`
	UserOverallStats []UserOverallStats `json:"user_overall_stats"`
	BugReports       []BugReport        `json:"bug_reports"`
	SiteVisits       []SiteVisit        `json:"site_visits"`
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

// GenerateBackupZip runs queries and bundles table outputs to a zip file in memory
func GenerateBackupZip(db *gorm.DB, backupType string) ([]byte, error) {
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
	if err := db.Find(&data.BugReports).Error; err != nil {
		return nil, err
	}
	if err := db.Find(&data.SiteVisits).Error; err != nil {
		return nil, err
	}

	meta := &BackupMetadata{
		SnapshotID:       fmt.Sprintf("snap_%s", time.Now().Format("20060102_150405")),
		CreatedAt:        time.Now(),
		Type:             backupType,
		AppVersion:       AppVersion,
		TotalUsers:       len(data.Users),
		TotalProfiles:    len(data.Profiles),
		TotalQuizzes:     len(data.Quizzes),
		TotalSubmissions: len(data.Submissions),
		TotalAttempts:    len(data.ExamAttempts),
		TotalBugReports:  len(data.BugReports),
		TotalSiteVisits:  len(data.SiteVisits),
	}
	data.Metadata = meta

	// Create Zip Archive
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Helper to add JSON to zip
	addJSONFile := func(filename string, payload interface{}) error {
		jsonBytes, err := json.MarshalIndent(payload, "", "  ")
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
	if err := addJSONFile("metadata.json", data.Metadata); err != nil {
		return nil, err
	}
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
	if err := addJSONFile("bug_reports.json", data.BugReports); err != nil {
		return nil, err
	}
	if err := addJSONFile("site_visits.json", data.SiteVisits); err != nil {
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

// VerifyBackupZip verifies all required JSON files are valid and parseable
func VerifyBackupZip(zipReader *zip.Reader) (*BackupMetadata, error) {
	hasUsers := false
	hasProfiles := false
	hasQuizzes := false
	var metadata BackupMetadata

	for _, file := range zipReader.File {
		if file.Name == "metadata.json" {
			f, err := file.Open()
			if err == nil {
				_ = json.NewDecoder(f).Decode(&metadata)
				f.Close()
			}
		}
		if file.Name == "users.json" {
			hasUsers = true
		}
		if file.Name == "profiles.json" {
			hasProfiles = true
		}
		if file.Name == "quizzes.json" {
			hasQuizzes = true
		}
	}

	if !hasUsers || !hasProfiles || !hasQuizzes {
		return nil, fmt.Errorf("file sao lưu không hợp lệ: thiếu cấu trúc dữ liệu người dùng hoặc đề thi")
	}

	return &metadata, nil
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
	if err := readJSONFile("bug_reports.json", &backup.BugReports); err != nil {
		log.Printf("Cảnh báo: Không tìm thấy bug_reports.json trong file backup (Bỏ qua): %v", err)
	}
	if err := readJSONFile("site_visits.json", &backup.SiteVisits); err != nil {
		log.Printf("Cảnh báo: Không tìm thấy site_visits.json trong file backup (Bỏ qua): %v", err)
	}

	// Execute restoring inside a transaction
	err := db.Transaction(func(tx *gorm.DB) error {
		// Clear existing tables in reverse dependency order
		if err := tx.Exec("SET FOREIGN_KEY_CHECKS = 0").Error; err != nil {
			return err
		}
		defer tx.Exec("SET FOREIGN_KEY_CHECKS = 1")

		_ = tx.Exec("TRUNCATE TABLE bug_reports").Error
		_ = tx.Exec("TRUNCATE TABLE user_overall_stats").Error
		_ = tx.Exec("TRUNCATE TABLE submissions").Error
		_ = tx.Exec("TRUNCATE TABLE exam_attempts").Error
		_ = tx.Exec("TRUNCATE TABLE quizzes").Error
		_ = tx.Exec("TRUNCATE TABLE profiles").Error
		_ = tx.Exec("TRUNCATE TABLE users").Error
		_ = tx.Exec("TRUNCATE TABLE site_visits").Error

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
		// 7. Bug Reports
		if len(backup.BugReports) > 0 {
			if err := tx.Create(&backup.BugReports).Error; err != nil {
				return fmt.Errorf("khôi phục bug_reports thất bại: %w", err)
			}
		}
		// 8. Site Visits
		if len(backup.SiteVisits) > 0 {
			if err := tx.Create(&backup.SiteVisits).Error; err != nil {
				return fmt.Errorf("khôi phục site_visits thất bại: %w", err)
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

// InspectBackupFile inspects a single zip file on disk and returns its snapshot metadata
func InspectBackupFile(filePath string) (*BackupSnapshotInfo, error) {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	zipFile, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer zipFile.Close()

	zipReader, err := zip.NewReader(zipFile, fileInfo.Size())
	if err != nil {
		return nil, err
	}

	filename := filepath.Base(filePath)
	backupType := "auto"
	if strings.Contains(filename, "_manual_") {
		backupType = "manual"
	}

	info := &BackupSnapshotInfo{
		ID:            filename,
		Filename:      filename,
		SizeBytes:     fileInfo.Size(),
		SizeFormatted: formatBytes(fileInfo.Size()),
		CreatedAt:     fileInfo.ModTime(),
		Type:          backupType,
		IsValid:       true,
	}

	// Compute Checksum SHA256
	_, _ = zipFile.Seek(0, io.SeekStart)
	hasher := sha256.New()
	if _, err := io.Copy(hasher, zipFile); err == nil {
		info.ChecksumSHA256 = fmt.Sprintf("%x", hasher.Sum(nil))
	}

	// Check metadata.json inside zip
	for _, f := range zipReader.File {
		if f.Name == "metadata.json" {
			if r, err := f.Open(); err == nil {
				var meta BackupMetadata
				if err := json.NewDecoder(r).Decode(&meta); err == nil {
					if !meta.CreatedAt.IsZero() {
						info.CreatedAt = meta.CreatedAt
					}
					if meta.Type != "" {
						info.Type = meta.Type
					}
					info.TotalUsers = meta.TotalUsers
					info.TotalQuizzes = meta.TotalQuizzes
					info.TotalSubmissions = meta.TotalSubmissions
					info.TotalBugReports = meta.TotalBugReports
				}
				r.Close()
			}
		}
	}

	return info, nil
}

// PruneOldBackups ensures there are at most maxCount zip files in backupDir
func PruneOldBackups(backupDir string, maxCount int) {
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		return
	}

	type fileWithTime struct {
		name    string
		path    string
		modTime time.Time
	}

	var backupFiles []fileWithTime
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".zip") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		backupFiles = append(backupFiles, fileWithTime{
			name:    entry.Name(),
			path:    filepath.Join(backupDir, entry.Name()),
			modTime: info.ModTime(),
		})
	}

	if len(backupFiles) <= maxCount {
		return
	}

	// Sort newest first
	sort.Slice(backupFiles, func(i, j int) bool {
		return backupFiles[i].modTime.After(backupFiles[j].modTime)
	})

	// Remove files beyond maxCount
	for i := maxCount; i < len(backupFiles); i++ {
		log.Printf("Xoá bản sao lưu cũ để duy trì tối đa %d bản: %s", maxCount, backupFiles[i].name)
		_ = os.Remove(backupFiles[i].path)
	}
}

// SaveBackupSnapshot creates a zip snapshot in backupDir and prunes excess
func SaveBackupSnapshot(db *gorm.DB, backupDir string, backupType string) (*BackupSnapshotInfo, error) {
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, err
	}

	zipBytes, err := GenerateBackupZip(db, backupType)
	if err != nil {
		return nil, err
	}

	timestamp := time.Now()
	filename := fmt.Sprintf("hitrang_backup_%s_%s.zip", backupType, timestamp.Format("20060102_150405"))
	targetPath := filepath.Join(backupDir, filename)

	if err := os.WriteFile(targetPath, zipBytes, 0644); err != nil {
		return nil, err
	}

	// Prune older backups if more than MaxBackupFiles
	PruneOldBackups(backupDir, MaxBackupFiles)

	info, err := InspectBackupFile(targetPath)
	if err != nil {
		h := sha256.New()
		h.Write(zipBytes)
		return &BackupSnapshotInfo{
			ID:             filename,
			Filename:       filename,
			SizeBytes:      int64(len(zipBytes)),
			SizeFormatted:  formatBytes(int64(len(zipBytes))),
			CreatedAt:      timestamp,
			Type:           backupType,
			ChecksumSHA256: fmt.Sprintf("%x", h.Sum(nil)),
			IsValid:        true,
		}, nil
	}

	return info, nil
}

// StartAutoBackupWorker runs a background goroutine every interval (e.g. 1 hour)
func StartAutoBackupWorker(db *gorm.DB, backupDir string, interval time.Duration) {
	go func() {
		log.Printf("Khởi chạy tiến trình Auto-Backup định kỳ mỗi %v (Lưu tối đa %d bản tại %s)", interval, MaxBackupFiles, backupDir)

		// Wait 10 seconds before initial snapshot check
		time.Sleep(10 * time.Second)

		// Check if any backup exists in backupDir. If none, create initial auto backup snapshot.
		if entries, err := os.ReadDir(backupDir); err == nil {
			hasBackup := false
			for _, e := range entries {
				if !e.IsDir() && strings.HasSuffix(e.Name(), ".zip") {
					hasBackup = true
					break
				}
			}
			if !hasBackup {
				log.Println("Chưa có bản sao lưu nào. Đang tạo bản sao lưu tự động ban đầu...")
				if _, err := SaveBackupSnapshot(db, backupDir, "auto"); err != nil {
					log.Printf("Lỗi tạo bản sao lưu ban đầu: %v", err)
				} else {
					log.Println("Đã tạo bản sao lưu tự động ban đầu thành công!")
				}
			}
		}

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			log.Println("Đang thực hiện chu kỳ sao lưu dữ liệu tự động...")
			if _, err := SaveBackupSnapshot(db, backupDir, "auto"); err != nil {
				log.Printf("Lỗi trong quá trình sao lưu tự động: %v", err)
			} else {
				log.Printf("Sao lưu dữ liệu tự động thành công vào lúc %s", time.Now().Format("15:04:05 02/01/2006"))
			}
		}
	}()
}

// verifyLevel2Passkey checks secondary security password
func verifyLevel2Passkey(passkey string) bool {
	if strings.TrimSpace(passkey) == "" {
		return false
	}
	customPass := os.Getenv("BACKUP_PASSKEY")
	if customPass != "" && passkey == customPass {
		return true
	}
	h := sha256.New()
	h.Write([]byte(passkey))
	hashed := fmt.Sprintf("%x", h.Sum(nil))

	// SHA256 of "tungtung"
	return hashed == "56dd3c1a83d4b388e6c43b8f1ce465e747edacc0c4faf8c4525be19bc0adc56d"
}

// ----------------------------------------------------
// REST API HANDLERS
// ----------------------------------------------------

// HandleGetBackupList returns list of all stored backup snapshots
func HandleGetBackupList(backupDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền truy cập sao lưu"})
			return
		}

		if err := os.MkdirAll(backupDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể truy cập thư mục sao lưu"})
			return
		}

		entries, err := os.ReadDir(backupDir)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc danh sách sao lưu: " + err.Error()})
			return
		}

		var list []BackupSnapshotInfo
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".zip") {
				continue
			}
			filePath := filepath.Join(backupDir, entry.Name())
			info, err := InspectBackupFile(filePath)
			if err != nil {
				continue
			}
			list = append(list, *info)
		}

		// Sort newest first
		sort.Slice(list, func(i, j int) bool {
			return list[i].CreatedAt.After(list[j].CreatedAt)
		})

		var totalSize int64
		for _, item := range list {
			totalSize += item.SizeBytes
		}

		c.JSON(http.StatusOK, gin.H{
			"backups":            list,
			"totalCount":         len(list),
			"maxLimit":           MaxBackupFiles,
			"totalSizeBytes":     totalSize,
			"totalSizeFormatted": formatBytes(totalSize),
			"autoInterval":       "1 giờ / lần",
		})
	}
}

// HandleCreateManualBackup triggers an immediate manual snapshot
func HandleCreateManualBackup(db *gorm.DB, backupDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền tạo sao lưu"})
			return
		}

		info, err := SaveBackupSnapshot(db, backupDir, "manual")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo bản sao lưu: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Tạo bản sao lưu thủ công thành công",
			"backup":  info,
		})
	}
}

// HandleDownloadBackupFile downloads a backup file with passkey validation
func HandleDownloadBackupFile(backupDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền tải sao lưu"})
			return
		}

		passkey := c.Query("passkey")
		if !verifyLevel2Passkey(passkey) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Mật khẩu cấp 2 không chính xác"})
			return
		}

		filename := c.Param("filename")
		if filename == "" {
			filename = c.Query("filename")
		}
		if filename == "" || strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên file không hợp lệ"})
			return
		}

		targetPath := filepath.Join(backupDir, filename)
		fileBytes, err := os.ReadFile(targetPath)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy file sao lưu trên hệ thống"})
			return
		}

		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
		c.Header("Content-Type", "application/zip")
		c.Header("Content-Length", fmt.Sprintf("%d", len(fileBytes)))
		c.Data(http.StatusOK, "application/zip", fileBytes)
	}
}

// HandleDeleteBackupFile removes a backup snapshot with passkey validation
func HandleDeleteBackupFile(backupDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền xóa bản sao lưu"})
			return
		}

		var payload struct {
			Passkey string `json:"passkey"`
		}
		_ = c.ShouldBindJSON(&payload)

		passkey := payload.Passkey
		if passkey == "" {
			passkey = c.Query("passkey")
		}

		if !verifyLevel2Passkey(passkey) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Mật khẩu cấp 2 không chính xác"})
			return
		}

		filename := c.Param("filename")
		if filename == "" || strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên file không hợp lệ"})
			return
		}

		targetPath := filepath.Join(backupDir, filename)
		if err := os.Remove(targetPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi khi xóa file: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa bản sao lưu thành công"})
	}
}

// HandleRestoreBackupFile restores database from a stored snapshot file with passkey validation
func HandleRestoreBackupFile(db *gorm.DB, backupDir string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền phục hồi dữ liệu"})
			return
		}

		var payload struct {
			Passkey string `json:"passkey"`
		}
		if err := c.ShouldBindJSON(&payload); err != nil || payload.Passkey == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng nhập mật khẩu cấp 2 để xác nhận"})
			return
		}

		if !verifyLevel2Passkey(payload.Passkey) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Mật khẩu cấp 2 không chính xác"})
			return
		}

		filename := c.Param("filename")
		if filename == "" || strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tên file không hợp lệ"})
			return
		}

		targetPath := filepath.Join(backupDir, filename)
		zipFile, err := os.Open(targetPath)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy file sao lưu"})
			return
		}
		defer zipFile.Close()

		stat, err := zipFile.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi đọc thông tin file"})
			return
		}

		zipReader, err := zip.NewReader(zipFile, stat.Size())
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "File sao lưu bị hỏng hoặc không đúng định dạng"})
			return
		}

		// 1. Verify structure and integrity
		meta, err := VerifyBackupZip(zipReader)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Xác minh file thất bại: " + err.Error()})
			return
		}

		// 2. Perform transactional restore
		if err := PerformRestore(db, zipReader); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Quá trình phục hồi thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Phục hồi dữ liệu toàn hệ thống thành công",
			"metadata": meta,
		})
	}
}

// HandleUploadRestore handles custom uploaded backup zip restore with passkey
func HandleUploadRestore(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ giáo viên hoặc admin mới có quyền phục hồi dữ liệu"})
			return
		}

		passkey := c.PostForm("passkey")
		if !verifyLevel2Passkey(passkey) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Mật khẩu cấp 2 không chính xác"})
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

		// Verify structure first
		meta, err := VerifyBackupZip(zipReader)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "File sao lưu không hợp lệ: " + err.Error()})
			return
		}

		if err := PerformRestore(db, zipReader); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Phục hồi thất bại: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":  "Khôi phục dữ liệu từ file tải lên thành công",
			"metadata": meta,
		})
	}
}

// AutoRestoreIfEmpty checks for backup restore.zip at startup
func AutoRestoreIfEmpty(db *gorm.DB, backupDir string) {
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


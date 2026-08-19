package main

import (
	"log"
	"time"

	"gorm.io/gorm"
)

// StartExpiredAttemptsWorker runs a background ticker to sweep and auto-submit expired attempts
func StartExpiredAttemptsWorker(db *gorm.DB, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			sweepExpiredAttempts(db)
		}
	}()
}

func sweepExpiredAttempts(db *gorm.DB) {
	// Find attempts inprogress that expired more than 10 seconds ago (grace period)
	var expiredAttempts []ExamAttempt
	now := time.Now()
	cutoff := now.Add(-10 * time.Second)

	err := db.Where("status = 'inprogress' AND expires_at < ?", cutoff).Find(&expiredAttempts).Error
	if err != nil {
		log.Println("Lỗi quét lượt thi quá hạn:", err)
		return
	}

	if len(expiredAttempts) == 0 {
		return
	}

	log.Printf("Phát hiện %d lượt thi quá hạn cần nộp tự động...", len(expiredAttempts))
	submittedAny := false

	for _, attempt := range expiredAttempts {
		var quiz Quiz
		if err := db.Where("id = ?", attempt.QuizID).First(&quiz).Error; err != nil {
			log.Printf("Không thể nạp đề thi %s để tự động chấm điểm lượt %s: %s", attempt.QuizID, attempt.ID, err.Error())
			continue
		}

		score, totalQuestions := CalculateScore(&quiz, attempt.Answers)
		submittedAt := attempt.ExpiresAt // Lock at official expiration time

		tx := db.Begin()
		// 1. Update attempt
		attempt.Status = "submitted"
		attempt.Score = &score
		attempt.TotalQuestions = &totalQuestions
		attempt.SubmittedAt = &submittedAt

		if err := tx.Save(&attempt).Error; err != nil {
			tx.Rollback()
			log.Printf("Lỗi cập nhật lượt thi %s quá hạn: %s", attempt.ID, err.Error())
			continue
		}

		// 2. Sync to submissions
		var studentProfile Profile
		if err := tx.Where("id = ?", attempt.UserID).First(&studentProfile).Error; err != nil {
			tx.Rollback()
			log.Printf("Không tìm thấy profile học sinh %s của lượt thi %s: %s", attempt.UserID, attempt.ID, err.Error())
			continue
		}

		submission := Submission{
			ID:             attempt.ID,
			QuizID:         attempt.QuizID,
			QuizTitle:      quiz.Title,
			StudentID:      attempt.UserID,
			StudentName:    studentProfile.Name,
			Score:          score,
			TotalQuestions: totalQuestions,
			Answers:        attempt.Answers,
			SubmittedAt:    submittedAt,
		}

		if err := tx.Save(&submission).Error; err != nil {
			tx.Rollback()
			log.Printf("Lỗi lưu kết quả thi tự động cho lượt %s: %s", attempt.ID, err.Error())
			continue
		}

		if err := tx.Commit().Error; err != nil {
			log.Printf("Lỗi commit nộp tự động cho lượt %s: %s", attempt.ID, err.Error())
			continue
		}

		log.Printf("-> Đã nộp tự động lượt thi %s của học sinh %s (Điểm: %.2f)", attempt.ID, studentProfile.Name, score)
		submittedAny = true
	}

	if submittedAny {
		log.Println("Đang cập nhật lại bảng xếp hạng tổng hợp sau khi nộp tự động...")
		if err := RefreshOverallLeaderboard(db); err != nil {
			log.Println("Lỗi làm mới BXH tổng hợp:", err.Error())
		}
	}
}

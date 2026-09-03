package main

import (
	"time"
)

type Question struct {
	ID                 string   `json:"id"`
	Text               string   `json:"text"`
	Options            []string `json:"options"`
	CorrectAnswerIndex int      `json:"correctAnswerIndex"`
	CorrectAnswers     []bool   `json:"correctAnswers"`
	Type               string   `json:"type"`
	SectionTitle       string   `json:"sectionTitle"`
	ShortAnswerKey     string   `json:"shortAnswerKey"`
	Explanation        string   `json:"explanation"`
	Points             float64  `json:"points"`
}

type ScoringSection struct {
	SectionID   string  `json:"section_id"`
	TotalPoints float64 `json:"total_points"`
}

type ScoringConfig struct {
	Type           string            `json:"type"`
	Sections       []ScoringSection  `json:"sections"`
	TrueFalseRules map[string]float64 `json:"true_false_rules"`
}

// User represents auth.users of Supabase
type User struct {
	ID             string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Username       string    `json:"username" gorm:"uniqueIndex;type:varchar(100);not null"`
	Email          *string   `json:"email" gorm:"uniqueIndex;type:varchar(255)"`
	PasswordHash      string     `json:"password_hash" gorm:"type:varchar(255);not null"`
	PasswordUpdatedAt *time.Time `json:"passwordUpdatedAt" gorm:"column:password_updated_at"`
	TOTPSecret        *string    `json:"-" gorm:"column:totp_secret;type:varchar(64)"`
	TOTPTempSecret    *string    `json:"-" gorm:"column:totp_temp_secret;type:varchar(64)"`
	TOTPEnabled       bool       `json:"totpEnabled" gorm:"column:totp_enabled;default:false;not null"`
	Require2FALogin   bool       `json:"require2FALogin" gorm:"column:require_2fa_login;default:false;not null"`
	CreatedAt         time.Time  `json:"created_at"`
	Profile           *Profile   `json:"-" gorm:"foreignKey:ID;constraint:OnDelete:CASCADE"`
}

// Profile represents profiles table
type Profile struct {
	ID           string     `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name         string     `json:"name" gorm:"type:varchar(255);not null"`
	Username     string     `json:"username" gorm:"uniqueIndex;type:varchar(100);not null"`
	Role         string     `json:"role" gorm:"type:enum('student', 'teacher', 'admin');default:'student';not null"`
	Plan         string     `json:"plan" gorm:"type:enum('nothing', 'basic', 'vip');default:'nothing';not null"`
	Grade        *string    `json:"grade" gorm:"type:varchar(10)"`
	AvatarURL    *string    `json:"avatarUrl" gorm:"type:text"`
	CreatedAt    time.Time  `json:"created_at"`
	LastActiveAt *time.Time `json:"lastActiveAt" gorm:"column:last_active_at"`
}

// Quiz represents quizzes table
type Quiz struct {
	ID            string         `json:"id" gorm:"primaryKey;type:varchar(100)"`
	Title         string         `json:"title" gorm:"type:varchar(255);not null"`
	Description   string         `json:"description" gorm:"type:text"`
	Subject       string         `json:"subject" gorm:"type:varchar(100);not null"`
	Duration      int            `json:"duration" gorm:"not null"`
	Questions     []Question     `json:"questions" gorm:"type:json;serializer:json;not null"`
	ScoringConfig *ScoringConfig `json:"scoringConfig" gorm:"column:scoring_config;type:json;serializer:json"`
	Grade         *string        `json:"grade" gorm:"type:varchar(10)"`
	IsPublic      bool           `json:"isPublic" gorm:"column:is_public"`
	CreatedBy     *string        `json:"createdBy" gorm:"column:created_by;type:varchar(36)"`
	CreatedAt     time.Time      `json:"-" gorm:"column:created_at;index"`
	User          *User          `json:"-" gorm:"foreignKey:CreatedBy;constraint:OnDelete:SET NULL"`
}

// ExamAttempt represents exam_attempts table
type ExamAttempt struct {
	ID              string                 `json:"id" gorm:"primaryKey;type:varchar(36)"`
	QuizID          string                 `json:"quiz_id" gorm:"type:varchar(100);not null"`
	UserID          string                 `json:"user_id" gorm:"type:varchar(36);not null"`
	StartedAt       time.Time              `json:"started_at" gorm:"column:started_at;index;not null"`
	DurationMinutes int                    `json:"duration_minutes" gorm:"not null"`
	ExpiresAt       time.Time              `json:"expires_at" gorm:"not null"`
	Status          string                 `json:"status" gorm:"type:enum('inprogress', 'submitted');default:'inprogress';not null"`
	Answers         map[string]interface{} `json:"answers" gorm:"type:json;serializer:json;not null"`
	Score           *float64               `json:"score"`
	TotalQuestions  *int                   `json:"total_questions"`
	SubmittedAt     *time.Time             `json:"submitted_at"`
	Quiz            Quiz                   `json:"-" gorm:"foreignKey:QuizID;constraint:OnDelete:CASCADE"`
	User            User                   `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// Submission represents submissions table
type Submission struct {
	ID             string                 `json:"id" gorm:"primaryKey;type:varchar(36)"`
	QuizID         string                 `json:"quizId" gorm:"column:quiz_id;type:varchar(100);not null"`
	QuizTitle      string                 `json:"quizTitle" gorm:"column:quiz_title;type:varchar(255);not null"`
	StudentID      string                 `json:"studentId" gorm:"column:student_id;type:varchar(36);not null"`
	StudentName    string                 `json:"studentName" gorm:"column:student_name;type:varchar(255);not null"`
	Score          float64                `json:"score" gorm:"not null"`
	TotalQuestions int                    `json:"totalQuestions" gorm:"column:total_questions;not null"`
	Answers        map[string]interface{} `json:"answers" gorm:"type:json;serializer:json;not null"`
	SubmittedAt    time.Time              `json:"submittedAt" gorm:"column:submitted_at;index;not null"`
	User           User                   `json:"-" gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE"`
}

// UserOverallStats represents user_overall_stats table
type UserOverallStats struct {
	UserID         string    `json:"user_id" gorm:"primaryKey;type:varchar(36)"`
	TotalExp       float64   `json:"total_exp" gorm:"default:0"`
	TestsCompleted int       `json:"tests_completed" gorm:"default:0"`
	CurrentRank    *int      `json:"current_rank"`
	PreviousRank   *int      `json:"previous_rank"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	Profile        Profile   `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// BugReport represents bug_reports table
type BugReport struct {
	ID           string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID       *string   `json:"userId" gorm:"column:user_id;type:varchar(36)"`
	ReporterName string    `json:"reporterName" gorm:"column:reporter_name;type:varchar(255);not null"`
	Description  string    `json:"description" gorm:"column:description;type:text;not null"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;index"`
	User         *User     `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:SET NULL"`
}

// ScheduleSlot represents schedule_slots table
type ScheduleSlot struct {
	ID        string `json:"id" gorm:"primaryKey;type:varchar(36)"`
	TimeSlot  string `json:"timeSlot" gorm:"column:time_slot;type:varchar(50);not null"`
	DayOfWeek int    `json:"dayOfWeek" gorm:"column:day_of_week;not null"` // 2 = Thứ 2, ..., 8 = Chủ Nhật
	Content   string `json:"content" gorm:"column:content;type:varchar(255)"`
}

// PasswordResetToken represents password_reset_tokens table
type PasswordResetToken struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID    string    `json:"userId" gorm:"index;type:varchar(36);not null"`
	TokenHash string    `json:"-" gorm:"uniqueIndex;type:varchar(64);not null"`
	ExpiresAt time.Time `json:"expiresAt" gorm:"index;not null"`
	Used      bool      `json:"used" gorm:"default:false;not null"`
	CreatedAt time.Time `json:"createdAt"`
	User      *User     `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// UserSession represents active user login sessions
type UserSession struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID    string    `json:"userId" gorm:"type:varchar(36);index;not null"`
	TokenHash string    `json:"-" gorm:"type:varchar(64);index;not null"`
	Browser   string    `json:"browser" gorm:"type:varchar(100)"`
	OS        string    `json:"os" gorm:"type:varchar(100)"`
	Device    string    `json:"device" gorm:"type:varchar(50)"`
	IPAddress string    `json:"ipAddress" gorm:"type:varchar(50)"`
	Location  string    `json:"location" gorm:"type:varchar(100)"`
	IsCurrent bool      `json:"isCurrent" gorm:"-"`
	LastSeen  time.Time `json:"lastSeen" gorm:"not null"`
	ExpiresAt time.Time `json:"expiresAt" gorm:"not null"`
	CreatedAt time.Time `json:"createdAt"`
	User      *User     `json:"-" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// Notification represents in-app notifications
type Notification struct {
	ID          string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID      *string   `json:"userId" gorm:"column:user_id;type:varchar(36);index"`
	TargetGrade *string   `json:"targetGrade" gorm:"column:target_grade;type:varchar(10);index"`
	TargetPlan  *string   `json:"targetPlan" gorm:"column:target_plan;type:varchar(20);index"`
	Type        string    `json:"type" gorm:"type:varchar(50);not null"`
	Title       string    `json:"title" gorm:"type:varchar(255);not null"`
	Message     string    `json:"message" gorm:"type:text;not null"`
	Link        string    `json:"link" gorm:"type:varchar(255)"`
	QuizID      *string   `json:"quizId" gorm:"column:quiz_id;type:varchar(100);index"`
	CreatedBy   *string   `json:"createdBy" gorm:"column:created_by;type:varchar(36)"`
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;index"`
}

// NotificationRead tracks whether a user has read a notification
type NotificationRead struct {
	ID             uint      `gorm:"primaryKey;autoIncrement"`
	NotificationID string    `gorm:"column:notification_id;type:varchar(36);uniqueIndex:idx_user_notif;not null"`
	UserID         string    `gorm:"column:user_id;type:varchar(36);uniqueIndex:idx_user_notif;not null"`
	ReadAt         time.Time `gorm:"column:read_at;not null"`
}

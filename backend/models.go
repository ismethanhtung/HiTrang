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
	ID           string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Username     string    `json:"username" gorm:"uniqueIndex;type:varchar(100);not null"`
	Email        string    `json:"email" gorm:"uniqueIndex;type:varchar(255);not null"`
	PasswordHash string    `json:"-" gorm:"type:varchar(255);not null"`
	CreatedAt    time.Time `json:"created_at"`
	Profile      *Profile  `json:"-" gorm:"foreignKey:ID;constraint:OnDelete:CASCADE"`
}

// Profile represents profiles table
type Profile struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name      string    `json:"name" gorm:"type:varchar(255);not null"`
	Username  string    `json:"username" gorm:"uniqueIndex;type:varchar(100);not null"`
	Role      string    `json:"role" gorm:"type:enum('student', 'teacher', 'admin');default:'student';not null"`
	Plan      string    `json:"plan" gorm:"type:enum('nothing', 'basic', 'vip');default:'nothing';not null"`
	Grade     *string   `json:"grade" gorm:"type:varchar(10)"`
	CreatedAt time.Time `json:"created_at"`
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
	IsPublic      bool           `json:"isPublic" gorm:"column:is_public;default:true"`
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

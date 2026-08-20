package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func HandleGetSchedule(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var slots []ScheduleSlot
		if err := db.Find(&slots).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy lịch học: " + err.Error()})
			return
		}

		var settings []SystemSetting
		if err := db.Find(&settings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy cấu hình lịch học: " + err.Error()})
			return
		}

		settingsMap := make(map[string]string)
		for _, s := range settings {
			settingsMap[s.Key] = s.Value
		}

		c.JSON(http.StatusOK, gin.H{
			"slots":    slots,
			"settings": settingsMap,
		})
	}
}

func HandleUpdateSchedule(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên mới được sửa lịch học"})
			return
		}

		var req []ScheduleSlot
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu lịch học không hợp lệ: " + err.Error()})
			return
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			for _, slot := range req {
				if err := tx.Save(&slot).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật lịch học: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật lịch học thành công!"})
	}
}

func HandleUpdateSettings(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, _ := c.Get("role")
		if roleVal.(string) != "teacher" && roleVal.(string) != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ quản trị viên mới được cấu hình hệ thống"})
			return
		}

		var req map[string]string
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu cấu hình không hợp lệ: " + err.Error()})
			return
		}

		err := db.Transaction(func(tx *gorm.DB) error {
			for key, val := range req {
				setting := SystemSetting{Key: key, Value: val}
				if err := tx.Save(&setting).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật cấu hình: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Cập nhật cấu hình thành công!"})
	}
}

func SeedScheduleIfEmpty(db *gorm.DB) {
	// Seed System Settings
	var count int64
	db.Model(&SystemSetting{}).Count(&count)
	if count == 0 {
		defaultSettings := []SystemSetting{
			{Key: "schedule_title", Value: "LỊCH HỌC NĂM HỌC 2026 - 2027"},
			{Key: "schedule_subtext", Value: "MÔN TOÁN - LỚP CÔ TRANG (MS CARLIE)"},
			{Key: "schedule_apply_date", Value: "BẮT ĐẦU ÁP DỤNG TỪ 01/07"},
			{Key: "schedule_address", Value: "Hẻm 111 Phùng Hưng"},
			{Key: "schedule_contact", Value: "0914765601"},
			{Key: "schedule_fb", Value: "https://www.facebook.com/nguyen.trang.724265"},
			{Key: "schedule_quote", Value: "Mối"},
		}
		for _, s := range defaultSettings {
			db.Create(&s)
		}
	}

	// Seed Schedule Slots
	db.Model(&ScheduleSlot{}).Count(&count)
	if count == 0 {
		timeSlots := []string{
			"7h15 - 9h00",
			"9h40 - 11h00",
			"13h15 - 15h00",
			"15h40 - 17h00",
			"17h30 - 19h00",
			"19h20 - 21h00",
		}

		// Predefined contents from image
		contents := map[string]map[int]struct {
			Content string
			Color   string
		}{
			"7h15 - 9h00": {
				3: {Content: "8 buổi 1", Color: "blue"},
				5: {Content: "8 buổi 2", Color: "blue"},
				7: {Content: "8 buổi 3", Color: "blue"},
			},
			"9h40 - 11h00": {
				2: {Content: "10 buổi 1", Color: "orange"},
				3: {Content: "10 buổi 1", Color: "orange"},
				4: {Content: "10 buổi 2", Color: "orange"},
				5: {Content: "10 buổi 2", Color: "orange"},
				6: {Content: "10 buổi 3", Color: "orange"},
				7: {Content: "10 buổi 3", Color: "orange"},
			},
			"15h40 - 17h00": {
				2: {Content: "11 buổi 1", Color: "green"},
				3: {Content: "11 buổi 1", Color: "green"},
				4: {Content: "11 buổi 2", Color: "green"},
				5: {Content: "11 buổi 2", Color: "green"},
				6: {Content: "11 buổi 3", Color: "green"},
				7: {Content: "11 buổi 3", Color: "green"},
			},
			"17h30 - 19h00": {
				2: {Content: "12 buổi 1", Color: "orange"},
				3: {Content: "12 buổi 1", Color: "orange"},
				4: {Content: "12 buổi 2", Color: "orange"},
				5: {Content: "12 buổi 2", Color: "orange"},
				6: {Content: "12 buổi 3", Color: "orange"},
				7: {Content: "12 buổi 3", Color: "orange"},
			},
			"19h20 - 21h00": {
				2: {Content: "9 buổi 1", Color: "blue"},
				3: {Content: "9 buổi 1", Color: "blue"},
				4: {Content: "9 buổi 2", Color: "blue"},
				5: {Content: "9 buổi 2", Color: "blue"},
				6: {Content: "9 buổi 3", Color: "blue"},
				7: {Content: "9 buổi 3", Color: "blue"},
			},
		}

		for rowIdx, ts := range timeSlots {
			for colIdx := 0; colIdx < 7; colIdx++ {
				day := colIdx + 2
				id := fmt.Sprintf("slot_%d_%d", rowIdx, colIdx)
				contentVal := ""
				colorVal := ""

				if dayMap, exists := contents[ts]; exists {
					if item, ok := dayMap[day]; ok {
						contentVal = item.Content
						colorVal = item.Color
					}
				}

				slot := ScheduleSlot{
					ID:        id,
					TimeSlot:  ts,
					DayOfWeek: day,
					Content:   contentVal,
					Color:     colorVal,
				}
				db.Create(&slot)
			}
		}
	}
}

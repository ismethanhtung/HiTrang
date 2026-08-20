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
		c.JSON(http.StatusOK, slots)
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

func SeedScheduleIfEmpty(db *gorm.DB) {
	var count int64
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
		contents := map[string]map[int]string{
			"7h15 - 9h00": {
				3: "8 buổi 1",
				5: "8 buổi 2",
				7: "8 buổi 3",
			},
			"9h40 - 11h00": {
				2: "10 buổi 1",
				3: "10 buổi 1",
				4: "10 buổi 2",
				5: "10 buổi 2",
				6: "10 buổi 3",
				7: "10 buổi 3",
			},
			"15h40 - 17h00": {
				2: "11 buổi 1",
				3: "11 buổi 1",
				4: "11 buổi 2",
				5: "11 buổi 2",
				6: "11 buổi 3",
				7: "11 buổi 3",
			},
			"17h30 - 19h00": {
				2: "12 buổi 1",
				3: "12 buổi 1",
				4: "12 buổi 2",
				5: "12 buổi 2",
				6: "12 buổi 3",
				7: "12 buổi 3",
			},
			"19h20 - 21h00": {
				2: "9 buổi 1",
				3: "9 buổi 1",
				4: "9 buổi 2",
				5: "9 buổi 2",
				6: "9 buổi 3",
				7: "9 buổi 3",
			},
		}

		for rowIdx, ts := range timeSlots {
			for colIdx := 0; colIdx < 7; colIdx++ {
				day := colIdx + 2
				id := fmt.Sprintf("slot_%d_%d", rowIdx, colIdx)
				contentVal := ""

				if dayMap, exists := contents[ts]; exists {
					if item, ok := dayMap[day]; ok {
						contentVal = item
					}
				}

				slot := ScheduleSlot{
					ID:        id,
					TimeSlot:  ts,
					DayOfWeek: day,
					Content:   contentVal,
				}
				db.Create(&slot)
			}
		}
	}
}

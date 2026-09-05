package main

import (
	"crypto/rand"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

// EmailMetadata holds contextual security information for the email recipient
type EmailMetadata struct {
	IP        string
	UserAgent string
	Time      time.Time
	ActionURL string
}

// MaskEmail masks email for privacy display (e.g. th***@gmail.com)
func MaskEmail(email string) string {
	parts := strings.Split(strings.TrimSpace(email), "@")
	if len(parts) != 2 {
		return email
	}
	name := parts[0]
	domain := parts[1]

	if len(name) <= 2 {
		return name + "***@" + domain
	}
	return name[:2] + strings.Repeat("*", len(name)-2) + "@" + domain
}

// GenerateNumericOTP generates a cryptographically secure 6-digit OTP
func GenerateNumericOTP(length int) string {
	if length <= 0 {
		length = 6
	}
	const digits = "0123456789"
	bytes := make([]byte, length)
	if _, err := io.ReadFull(rand.Reader, bytes); err != nil {
		return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
	}
	for i := range bytes {
		bytes[i] = digits[int(bytes[i])%len(digits)]
	}
	return string(bytes)
}

// parseDevice parses a user agent string into a clean "Browser OS" string (e.g. "Chrome macOS")
func parseDevice(userAgent string) string {
	if userAgent == "" {
		return "Trình duyệt Web"
	}

	os := ""
	if strings.Contains(userAgent, "Macintosh") || strings.Contains(userAgent, "Mac OS X") {
		os = "macOS"
	} else if strings.Contains(userAgent, "Windows") {
		os = "Windows"
	} else if strings.Contains(userAgent, "iPhone") {
		os = "iOS"
	} else if strings.Contains(userAgent, "iPad") {
		os = "iPadOS"
	} else if strings.Contains(userAgent, "Android") {
		os = "Android"
	} else if strings.Contains(userAgent, "Linux") {
		os = "Linux"
	}

	browser := ""
	if strings.Contains(userAgent, "Edg/") {
		browser = "Edge"
	} else if strings.Contains(userAgent, "Chrome/") {
		browser = "Chrome"
	} else if strings.Contains(userAgent, "Safari/") && !strings.Contains(userAgent, "Chrome") {
		browser = "Safari"
	} else if strings.Contains(userAgent, "Firefox/") {
		browser = "Firefox"
	}

	if browser != "" && os != "" {
		return browser + " " + os
	} else if browser != "" {
		return browser
	} else if os != "" {
		return os
	}
	return "Trình duyệt Web"
}

// formatClientIP formats IP for security card display
func formatClientIP(ip string) string {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return "Bảo mật"
	}
	if ip == "::1" || ip == "127.0.0.1" {
		return "127.0.0.1 (Localhost)"
	}
	return ip
}

// SendEmailOTP sends a minimalist, ultra-refined HTML email with a continuous 6-digit OTP code
func SendEmailOTP(toEmail, otpCode, purpose, recipientName string, meta ...EmailMetadata) error {
	smtpHost := os.Getenv("SMTP_HOST")
	if smtpHost == "" {
		smtpHost = "smtp.gmail.com"
	}
	smtpPortStr := os.Getenv("SMTP_PORT")
	if smtpPortStr == "" {
		smtpPortStr = "587"
	}
	smtpPort, err := strconv.Atoi(smtpPortStr)
	if err != nil {
		smtpPort = 587
	}

	smtpUser := strings.TrimSpace(os.Getenv("SMTP_USER"))
	smtpPass := strings.TrimSpace(os.Getenv("SMTP_PASS"))
	smtpPass = strings.ReplaceAll(smtpPass, " ", "")

	fromName := os.Getenv("SMTP_FROM_NAME")
	if fromName == "" {
		fromName = "HiTrang"
	}

	if smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("hệ thống chưa cấu hình SMTP_USER hoặc SMTP_PASS trong file .env")
	}

	// Extract metadata
	var metadata EmailMetadata
	if len(meta) > 0 {
		metadata = meta[0]
	}
	if metadata.Time.IsZero() {
		metadata.Time = time.Now()
	}

	// Format Time in ICT (UTC+7)
	ictZone := time.FixedZone("ICT", 7*3600)
	timeFormatted := metadata.Time.In(ictZone).Format("15:04, 02/01/2006")

	deviceFormatted := parseDevice(metadata.UserAgent)
	ipFormatted := formatClientIP(metadata.IP)

	if recipientName == "" {
		recipientName = "Bạn"
	}

	var subject string
	var title string
	var description string

	cleanOTP := strings.TrimSpace(otpCode)

	switch purpose {
	case "link_email":
		subject = fmt.Sprintf("[%s] Mã xác thực liên kết Email: %s", fromName, cleanOTP)
		title = "Liên kết Email"
		description = "Nhập mã xác thực dưới đây để hoàn tất:"
	case "reset_password":
		subject = fmt.Sprintf("[%s] Mã khôi phục mật khẩu: %s", fromName, cleanOTP)
		title = "Khôi phục mật khẩu"
		description = "Nhập mã xác thực dưới đây để đặt lại mật khẩu:"
	default:
		subject = fmt.Sprintf("[%s] Mã xác thực: %s", fromName, cleanOTP)
		title = "Mã xác thực"
		description = "Nhập mã xác thực dưới đây để tiếp tục:"
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>%s</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="min-height: 100vh; padding: 40px 16px; background-color: #fafafa;">
        <tr>
            <td align="center" style="vertical-align: top;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 440px; background-color: #ffffff; border-radius: 14px; border: 1px solid #eaeaea; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03); overflow: hidden;">
                    <tr>
                        <td style="padding: 36px 32px 28px 32px;">
                            <!-- Minimal Brand Text (No Sakura Logo) -->
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 700; color: #111827; letter-spacing: -0.3px; margin-bottom: 24px;">
                                HiTrang
                            </div>

                            <!-- Title & Short Description -->
                            <h1 style="margin: 0 0 6px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 21px; font-weight: 700; color: #111827; letter-spacing: -0.4px;">
                                %s
                            </h1>
                            <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #6b7280; line-height: 1.5;">
                                %s
                            </p>

                            <!-- Continuous OTP Box (Easy 1-Click Copy, No Separators) -->
                            <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 10px; padding: 18px 20px; text-align: center; margin: 0 0 6px 0;">
                                <span style="display: inline-block; font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace; font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 5px; line-height: 1; user-select: all; -webkit-user-select: all;">%s</span>
                            </div>
                            <p style="margin: 0 0 24px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">
                                Hết hạn sau 10 phút
                            </p>

                            <!-- Clean Divider List (No Full Enclosing Box) -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 9px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">Tài khoản</td>
                                    <td align="right" style="padding: 9px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #374151;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">Thiết bị</td>
                                    <td align="right" style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; font-weight: 500; color: #374151;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">Địa chỉ IP</td>
                                    <td align="right" style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; font-weight: 500; color: #374151;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af;">Thời gian</td>
                                    <td align="right" style="padding: 9px 0; border-top: 1px solid #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #374151;">%s</td>
                                </tr>
                            </table>

                            <!-- Soft Minimal Note -->
                            <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                Nếu không phải bạn yêu cầu, hãy bỏ qua email này.
                            </p>

                            <!-- Subtle Minimal Footer -->
                            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #d1d5db; font-size: 11px; text-align: center;">
                                © %d HiTrang
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
		title,
		title,
		description,
		cleanOTP,
		recipientName,
		deviceFormatted,
		ipFormatted,
		timeFormatted,
		time.Now().Year(),
	)

	header := make(map[string]string)
	header["From"] = fmt.Sprintf("%s <%s>", fromName, smtpUser)
	header["To"] = toEmail
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = "text/html; charset=\"UTF-8\""

	message := ""
	for k, v := range header {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + htmlBody

	addr := fmt.Sprintf("%s:%d", smtpHost, smtpPort)

	// Use STARTTLS for port 587 (Standard Gmail SMTP)
	if smtpPort == 587 || smtpPort == 25 {
		auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         smtpHost,
		}

		conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
		if err != nil {
			return fmt.Errorf("không thể kết nối tới máy chủ SMTP (%s): %w", addr, err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, smtpHost)
		if err != nil {
			return fmt.Errorf("lỗi khởi tạo SMTP client: %w", err)
		}
		defer client.Quit()

		if ok, _ := client.Extension("STARTTLS"); ok {
			if err = client.StartTLS(tlsConfig); err != nil {
				return fmt.Errorf("lỗi khởi động STARTTLS: %w", err)
			}
		}

		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("lỗi xác thực SMTP Gmail (kiểm tra lại SMTP_USER và SMTP_PASS App Password): %w", err)
		}

		if err = client.Mail(smtpUser); err != nil {
			return fmt.Errorf("lỗi thiết lập người gửi: %w", err)
		}

		if err = client.Rcpt(toEmail); err != nil {
			return fmt.Errorf("lỗi thiết lập người nhận (%s): %w", toEmail, err)
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("lỗi mở luồng dữ liệu email: %w", err)
		}

		_, err = w.Write([]byte(message))
		if err != nil {
			return fmt.Errorf("lỗi ghi nội dung email: %w", err)
		}

		err = w.Close()
		if err != nil {
			return fmt.Errorf("lỗi đóng luồng email: %w", err)
		}

		return nil
	}

	// Direct SSL/TLS for port 465
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         smtpHost,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("không thể kết nối SSL tới máy chủ SMTP (%s): %w", addr, err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("lỗi khởi tạo SMTP SSL client: %w", err)
	}
	defer client.Quit()

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("lỗi xác thực SMTP SSL: %w", err)
	}

	if err = client.Mail(smtpUser); err != nil {
		return fmt.Errorf("lỗi thiết lập người gửi: %w", err)
	}

	if err = client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("lỗi thiết lập người nhận: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("lỗi gửi dữ liệu email: %w", err)
	}

	if _, err = w.Write([]byte(message)); err != nil {
		return fmt.Errorf("lỗi ghi nội dung email: %w", err)
	}

	return w.Close()
}

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
		// Fallback to time-based seed if reader fails
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
		os = "iPhone iOS"
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

// SendEmailOTP sends an ultra-clean, modern HTML email containing a 6-digit OTP code using SMTP (Gmail)
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
	var actionButtonText string

	switch purpose {
	case "link_email":
		subject = fmt.Sprintf("[%s] Mã xác thực liên kết Email: %s", fromName, otpCode)
		title = "Xác thực liên kết Email"
		description = "Chúng tôi nhận được yêu cầu liên kết địa chỉ email này với tài khoản của bạn tại HiTrang. Nếu đây là bạn, vui lòng xác nhận bằng mã bên dưới để tiếp tục."
		actionButtonText = "Xác nhận liên kết Email"
	case "reset_password":
		subject = fmt.Sprintf("[%s] Mã khôi phục mật khẩu: %s", fromName, otpCode)
		title = "Khôi phục mật khẩu"
		description = "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nếu đây là bạn, vui lòng xác nhận bằng mã bên dưới để tiếp tục."
		actionButtonText = "Đặt lại mật khẩu"
	default:
		subject = fmt.Sprintf("[%s] Mã xác thực: %s", fromName, otpCode)
		title = "Xác thực tài khoản"
		description = "Chúng tôi nhận được yêu cầu xác thực bảo mật cho tài khoản của bạn. Vui lòng xác nhận bằng mã bên dưới để tiếp tục."
		actionButtonText = "Xác thực tài khoản"
	}

	// Format OTP code with space in middle for high legibility (e.g. "544 119")
	displayOTP := otpCode
	if len(otpCode) == 6 {
		displayOTP = otpCode[:3] + " &nbsp; " + otpCode[3:]
	}

	// Build optional action button HTML
	actionButtonHTML := ""
	if metadata.ActionURL != "" {
		actionButtonHTML = fmt.Sprintf(`
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="margin-bottom: 20px;">
            <tr>
                <td align="center">
                    <a href="%s" target="_blank" style="display: block; width: 100%%; box-sizing: border-box; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 13px 24px; border-radius: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; text-align: center; letter-spacing: -0.2px;">
                        %s
                    </a>
                </td>
            </tr>
        </table>
        <p style="margin: 0 0 16px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #64748b;">
            hoặc nhập mã OTP xác thực thủ công
        </p>`, metadata.ActionURL, actionButtonText)
	} else {
		actionButtonHTML = `
        <p style="margin: 0 0 12px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 500; color: #64748b;">
            Mã xác thực OTP của bạn
        </p>`
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>%s</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="min-height: 100vh; padding: 40px 15px; background-color: #f8fafc;">
        <tr>
            <td align="center" style="vertical-align: top;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); overflow: hidden;">
                    <tr>
                        <td style="padding: 40px 36px 36px 36px;">
                            <!-- Brand Header -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="vertical-align: middle; width: 36px;">
                                        <div style="width: 36px; height: 36px; background-color: #0284c7; border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px; color: #ffffff;">
                                            🌸
                                        </div>
                                    </td>
                                    <td style="vertical-align: middle; padding-left: 10px;">
                                        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">HiTrang</span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Main Heading -->
                            <h1 style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; line-height: 1.25;">
                                %s
                            </h1>
                            <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #64748b; line-height: 1.55;">
                                %s
                            </p>

                            <!-- Security Metadata Card -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 12px 18px; border-bottom: 1px solid #f1f5f9;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                            <tr>
                                                <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">
                                                    TÀI KHOẢN
                                                </td>
                                                <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #0f172a;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 18px; border-bottom: 1px solid #f1f5f9;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                            <tr>
                                                <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">
                                                    THIẾT BỊ
                                                </td>
                                                <td align="right" style="font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Consolas, monospace; font-size: 13px; font-weight: 600; color: #0f172a;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 18px; border-bottom: 1px solid #f1f5f9;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                            <tr>
                                                <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">
                                                    ĐỊA CHỈ IP
                                                </td>
                                                <td align="right" style="font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Consolas, monospace; font-size: 13px; font-weight: 600; color: #0f172a;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 18px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                            <tr>
                                                <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px;">
                                                    THỜI GIAN
                                                </td>
                                                <td align="right" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #0f172a;">
                                                    %s
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Action Button or OTP Header -->
                            %s

                            <!-- OTP Numbers Display -->
                            <div style="text-align: center; margin: 4px 0 6px 0;">
                                <span style="display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Courier New', monospace; font-size: 42px; font-weight: 800; color: #0f172a; letter-spacing: 8px; line-height: 1;">
                                    %s
                                </span>
                            </div>
                            <p style="margin: 0 0 28px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; font-weight: 500;">
                                Hiệu lực trong vòng 10 phút
                            </p>

                            <!-- Alert Warning Box -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 14px 18px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%">
                                            <tr>
                                                <td style="vertical-align: top; width: 22px; padding-right: 10px;">
                                                    <span style="font-size: 15px; line-height: 1;">⚠️</span>
                                                </td>
                                                <td style="vertical-align: middle; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #92400e; font-size: 12px; line-height: 1.55;">
                                                    Nếu bạn không thực hiện yêu cầu này, tài khoản của bạn có thể đang gặp rủi ro. Vui lòng bỏ qua email hoặc thông báo ngay cho quản trị viên để bảo vệ tài khoản.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Divider & Footer -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center;">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                            Bạn nhận được email này vì có hoạt động bảo mật đối với tài khoản của bạn.
                                        </p>
                                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #cbd5e1; font-size: 11px;">
                                            © %d HiTrang Education. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
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
		recipientName,
		deviceFormatted,
		ipFormatted,
		timeFormatted,
		actionButtonHTML,
		displayOTP,
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

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

// SendEmailOTP sends an HTML email containing a 6-digit OTP code using SMTP (Gmail)
func SendEmailOTP(toEmail, otpCode, purpose, recipientName string) error {
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
	// Remove all spaces from App Password if any (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
	smtpPass = strings.ReplaceAll(smtpPass, " ", "")

	fromName := os.Getenv("SMTP_FROM_NAME")
	if fromName == "" {
		fromName = "HiTrang Education"
	}

	if smtpUser == "" || smtpPass == "" {
		return fmt.Errorf("hệ thống chưa cấu hình SMTP_USER hoặc SMTP_PASS trong file .env")
	}

	var subject string
	var title string
	var description string

	switch purpose {
	case "link_email":
		subject = fmt.Sprintf("[%s] Mã xác thực liên kết Email: %s", fromName, otpCode)
		title = "Xác Thực Liên Kết Email"
		description = "Bạn đang thực hiện liên kết địa chỉ email này với tài khoản tại HiTrang. Sử dụng mã OTP dưới đây để hoàn tất xác thực:"
	case "reset_password":
		subject = fmt.Sprintf("[%s] Mã khôi phục mật khẩu: %s", fromName, otpCode)
		title = "Khôi Phục Mật Khẩu"
		description = "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Sử dụng mã OTP dưới đây để tạo mật khẩu mới:"
	default:
		subject = fmt.Sprintf("[%s] Mã xác thực: %s", fromName, otpCode)
		title = "Mã Xác Thực Bảo Mật"
		description = "Mã xác thực OTP của bạn:"
	}

	if recipientName == "" {
		recipientName = "Bạn"
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="min-height: 100vh; padding: 30px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 20px 32px; text-align: center; background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">%s</h1>
                            <p style="margin: 6px 0 0 0; color: #e0f2fe; font-size: 13px;">Hệ Thống Học Tập & Luyện Thi Trực Tuyến</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px;">
                            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;">%s</h2>
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                Xin chào <b>%s</b>,<br>
                                %s
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                                <span style="display: block; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Mã xác thực của bạn</span>
                                <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0284c7;">%s</span>
                                <span style="display: block; color: #94a3b8; font-size: 11px; margin-top: 8px;">Hiệu lực trong vòng <b>10 phút</b></span>
                            </div>

                            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                                ⚠️ <b>Lưu ý quan trọng:</b> Tuyệt đối không chia sẻ mã này cho bất kỳ ai. Đội ngũ quản trị viên sẽ không bao giờ yêu cầu bạn cung cấp mã xác thực này.
                            </p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc thông báo ngay cho quản trị viên để bảo vệ tài khoản.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                                © %d %s. Mọi quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`, title, fromName, title, recipientName, description, otpCode, time.Now().Year(), fromName)

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

import React from "react";

/**
 * ExamIcon - Biểu tượng Đề thi / Bài thi độc đáo phong cách Flat Sage
 * Thể hiện tờ đề thi trắc nghiệm với nếp gấp trang, dấu kiểm tra và các dòng đáp án
 */
export function ExamIcon({
    className = "w-5 h-5",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Tờ giấy đề thi bo góc với góc gập trên */}
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />

            {/* 2 dòng gạch bên trong trang giấy */}
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
    );
}

export default ExamIcon;

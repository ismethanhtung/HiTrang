import React from "react";

/**
 * NavHouseIcon - Icon Trang chủ từ public/svg/house.svg
 */
export function NavHouseIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M19,24H5c-2.757,0-5-2.243-5-5V9.724c0-1.665,.824-3.215,2.204-4.145L9.203,.855c1.699-1.146,3.895-1.146,5.594,0l7,4.724c1.379,.93,2.203,2.479,2.203,4.145v9.276c0,2.757-2.243,5-5,5ZM12,1.997c-.584,0-1.168,.172-1.678,.517L3.322,7.237c-.828,.558-1.322,1.487-1.322,2.486v9.276c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3V9.724c0-.999-.494-1.929-1.321-2.486L13.678,2.514c-.51-.345-1.094-.517-1.678-.517Z" />
        </svg>
    );
}

/**
 * NavDocumentIcon - Icon Đề thi / Khối lớp từ public/svg/document.svg
 */
export function NavDocumentIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="m17 14a1 1 0 0 1 -1 1h-8a1 1 0 0 1 0-2h8a1 1 0 0 1 1 1zm-4 3h-5a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2zm9-6.515v8.515a5.006 5.006 0 0 1 -5 5h-10a5.006 5.006 0 0 1 -5-5v-14a5.006 5.006 0 0 1 5-5h4.515a6.958 6.958 0 0 1 4.95 2.05l3.484 3.486a6.951 6.951 0 0 1 2.051 4.949zm-6.949-7.021a5.01 5.01 0 0 0 -1.051-.78v4.316a1 1 0 0 0 1 1h4.316a4.983 4.983 0 0 0 -.781-1.05zm4.949 7.021c0-.165-.032-.323-.047-.485h-4.953a3 3 0 0 1 -3-3v-4.953c-.162-.015-.321-.047-.485-.047h-4.515a3 3 0 0 0 -3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3z" />
        </svg>
    );
}

/**
 * NavCalendarIcon - Icon Lịch học từ public/svg/calendar.svg
 */
export function NavCalendarIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M19,2h-1V1c0-.552-.447-1-1-1s-1,.448-1,1v1H8V1c0-.552-.447-1-1-1s-1,.448-1,1v1h-1C2.243,2,0,4.243,0,7v12c0,2.757,2.243,5,5,5h14c2.757,0,5-2.243,5-5V7c0-2.757-2.243-5-5-5ZM5,4h14c1.654,0,3,1.346,3,3v1H2v-1c0-1.654,1.346-3,3-3Zm14,18H5c-1.654,0-3-1.346-3-3V10H22v9c0,1.654-1.346,3-3,3Zm0-8c0,.552-.447,1-1,1H6c-.553,0-1-.448-1-1s.447-1,1-1h12c.553,0,1,.448,1,1Zm-7,4c0,.552-.447,1-1,1H6c-.553,0-1-.448-1-1s.447-1,1-1h5c.553,0,1,.448,1,1Z" />
        </svg>
    );
}

/**
 * NavRankingIcon - Icon Bảng xếp hạng từ public/svg/ranking.svg
 */
export function NavRankingIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="m21.5,16h-4c-.171,0-.338.017-.5.05v-4.55c0-1.378-1.121-2.5-2.5-2.5h-5c-1.379,0-2.5,1.122-2.5,2.5v1.55c-.162-.033-.329-.05-.5-.05H2.5c-1.379,0-2.5,1.122-2.5,2.5v8.5h24v-5.5c0-1.378-1.121-2.5-2.5-2.5Zm-12.5-4.5c0-.276.225-.5.5-.5h5c.275,0,.5.224.5.5v10.5h-6v-10.5Zm-7,4c0-.276.225-.5.5-.5h4c.275,0,.5.224.5.5v6.5H2v-6.5Zm20,6.5h-5v-3.5c0-.276.225-.5.5-.5h4c.275,0,.5.224.5.5v3.5ZM10.213,4.847l-2.212-1.231v-.615h2.899l.784-3h.648l.784,3h2.883v.611l-2.197,1.273.884,2.686-.504.349-2.173-1.68-2.183,1.687-.48-.362.869-2.717Z" />
        </svg>
    );
}

/**
 * NavBellIcon - Icon Thông báo từ public/svg/bell.svg
 */
export function NavBellIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M22.555,13.662l-1.9-6.836A9.321,9.321,0,0,0,2.576,7.3L1.105,13.915A5,5,0,0,0,5.986,20H7.1a5,5,0,0,0,9.8,0h.838a5,5,0,0,0,4.818-6.338ZM12,22a3,3,0,0,1-2.816-2h5.632A3,3,0,0,1,12,22Zm8.126-5.185A2.977,2.977,0,0,1,17.737,18H5.986a3,3,0,0,1-2.928-3.651l1.47-6.616a7.321,7.321,0,0,1,14.2-.372l1.9,6.836A2.977,2.977,0,0,1,20.126,16.815Z" />
        </svg>
    );
}

/**
 * NavPacmanIcon - Icon Pacman từ public/svg/pacman.svg
 */
export function NavPacmanIcon({
    className = "w-[17px] h-[17px]",
    ...props
}: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={className}
            {...props}
        >
            <path d="M22 12H21.991M18.009 12H18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5119 7.5L10.5029 7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12C2 16.9706 5.94274 21 10.8064 21C13.2733 21 15.5033 19.9634 17.102 18.2931C17.7426 17.6238 18.0629 17.2892 17.9897 16.7418C17.9166 16.1945 17.4528 15.9208 16.525 15.3735L15.7671 14.9264C13.5637 13.6266 12.462 12.9767 12.462 12C12.462 11.0233 13.5637 10.3734 15.7671 9.07358L16.525 8.62647C17.4528 8.07919 17.9166 7.80555 17.9897 7.25817C18.0629 6.71078 17.7426 6.37617 17.102 5.70695C15.5033 4.03665 13.2733 3 10.8064 3C5.94274 3 2 7.02944 2 12Z" />
        </svg>
    );
}

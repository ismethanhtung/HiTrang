import React, { useState } from "react";
import { User, UserPlan } from "../types";
import {
    signUpUser,
    updateUserProfile,
    deleteUserProfile,
    updateUserPlan,
    updateUserGrade,
    generatePasswordResetLink,
} from "../lib/supabaseService";
import { matchesSearch as matchesSearchFn } from "../lib/searchUtils";
import {
    Search,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
    Shield,
    Zap,
    Crown,
    KeyRound,
    Copy,
    Check,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    BarChart3,
} from "lucide-react";

interface AdminPlansTabProps {
    userProfiles: User[];
    loadingProfiles: boolean;
    updatingUserId: string | null;
    setUpdatingUserId: React.Dispatch<React.SetStateAction<string | null>>;
    fetchProfiles: () => Promise<void>;
    onSelectUserForStats?: (userId: string) => void;
}

type SortField =
    | "stt"
    | "name"
    | "username"
    | "role"
    | "plan"
    | "grade"
    | "lastActive";
type SortDirection = "asc" | "desc";

export default function AdminPlansTab({
    userProfiles,
    loadingProfiles,
    updatingUserId,
    setUpdatingUserId,
    fetchProfiles,
    onSelectUserForStats,
}: AdminPlansTabProps) {
    // User Management filters, search, sorting and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "admin" | "student">(
        "all",
    );
    const [filterPlan, setFilterPlan] = useState<"all" | UserPlan>("all");
    const [filterGrade, setFilterGrade] = useState<string>("all");
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    // Create User state
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserUsername, setNewUserUsername] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState<"admin" | "student">(
        "student",
    );
    const [newUserPlan, setNewUserPlan] = useState<UserPlan>("nothing");
    const [newUserGrade, setNewUserGrade] = useState<string>("");

    // Edit User state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState("");
    const [editUserUsername, setEditUserUsername] = useState("");
    const [editUserRole, setEditUserRole] = useState<"admin" | "student">(
        "student",
    );
    const [editUserPlan, setEditUserPlan] = useState<UserPlan>("nothing");
    const [editUserGrade, setEditUserGrade] = useState<string>("");

    // Reset password link modal state
    const [resetModalUser, setResetModalUser] = useState<User | null>(null);
    const [resetLinkData, setResetLinkData] = useState<{
        token: string;
        link: string;
        expiresAt: string;
        username: string;
        name: string;
    } | null>(null);
    const [generatingResetId, setGeneratingResetId] = useState<string | null>(
        null,
    );
    const [copiedResetLink, setCopiedResetLink] = useState(false);

    const handleGenerateResetLink = async (targetUser: User) => {
        setGeneratingResetId(targetUser.id);
        try {
            const res = await generatePasswordResetLink(targetUser.id);
            const fullLink = `${window.location.origin}/reset-password?token=${res.token}`;
            setResetLinkData({
                ...res,
                link: fullLink,
            });
            setResetModalUser(targetUser);
            setCopiedResetLink(false);
        } catch (err: any) {
            console.error("Lỗi tạo link reset:", err);
            alert(
                `Lỗi tạo link đặt lại mật khẩu: ${err.message || "Vui lòng thử lại"}`,
            );
        } finally {
            setGeneratingResetId(null);
        }
    };

    const handleCopyResetLink = async () => {
        if (!resetLinkData) return;
        try {
            await navigator.clipboard.writeText(resetLinkData.link);
            setCopiedResetLink(true);
            setTimeout(() => setCopiedResetLink(false), 2500);
        } catch (e) {
            const textarea = document.createElement("textarea");
            textarea.value = resetLinkData.link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            setCopiedResetLink(true);
            setTimeout(() => setCopiedResetLink(false), 2500);
        }
    };

    // Sorting and Pagination
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection(
                field === "lastActive" || field === "plan" ? "desc" : "asc",
            );
        }
        setCurrentPage(1);
    };

    // Filtering logic
    const filteredUsers = userProfiles.filter((u) => {
        const matchesSearch = matchesSearchFn(
            [u.name, u.username],
            searchQuery,
        );
        const matchesRole = filterRole === "all" || u.role === filterRole;
        const matchesPlan =
            filterPlan === "all" || (u.plan || "nothing") === filterPlan;
        const matchesGrade =
            filterGrade === "all"
                ? true
                : filterGrade === "none"
                  ? !u.grade
                  : u.grade === filterGrade;
        return matchesSearch && matchesRole && matchesPlan && matchesGrade;
    });

    // Sorted users
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortField) return 0;
        let comparison = 0;
        if (sortField === "stt") {
            comparison = userProfiles.indexOf(a) - userProfiles.indexOf(b);
        } else if (sortField === "name") {
            comparison = (a.name || "").localeCompare(b.name || "", "vi", {
                sensitivity: "base",
                numeric: true,
            });
        } else if (sortField === "username") {
            comparison = (a.username || "").localeCompare(
                b.username || "",
                "vi",
                {
                    sensitivity: "base",
                    numeric: true,
                },
            );
        } else if (sortField === "role") {
            comparison = (a.role || "").localeCompare(b.role || "");
        } else if (sortField === "plan") {
            const getPlanWeight = (p?: string) => {
                if (p === "vip") return 3;
                if (p === "basic") return 2;
                return 1;
            };
            comparison = getPlanWeight(a.plan) - getPlanWeight(b.plan);
        } else if (sortField === "grade") {
            const getGradeVal = (g?: string) => (g ? parseInt(g, 10) || 0 : 0);
            comparison = getGradeVal(a.grade) - getGradeVal(b.grade);
        } else if (sortField === "lastActive") {
            const getActivityScore = (u: User) => {
                if (u.activeExam) return Date.now() + 100000000;
                if (!u.lastActiveAt) return 0;
                return new Date(u.lastActiveAt).getTime() || 0;
            };
            comparison = getActivityScore(a) - getActivityScore(b);
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });

    const totalPages = Math.ceil(sortedUsers.length / pageSize);
    const paginatedUsers = sortedUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Plan and Role change inline handlers
    const handlePlanChange = async (userId: string, newPlan: UserPlan) => {
        setUpdatingUserId(userId);
        try {
            await updateUserPlan(userId, newPlan);
            await fetchProfiles();
        } catch (err: any) {
            console.error("Lỗi cập nhật plan:", err);
            alert(`Lỗi cập nhật plan: ${err.message}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleRoleChange = async (
        userId: string,
        newRole: "admin" | "student",
    ) => {
        const found = userProfiles.find((u) => u.id === userId);
        if (!found) return;
        setUpdatingUserId(userId);
        try {
            await updateUserProfile(userId, {
                name: found.name,
                username: found.username,
                role: newRole,
                // Reset plan/grade according to role conventions if necessary
                plan: newRole === "admin" ? "vip" : found.plan || "nothing",
                grade: newRole === "student" ? found.grade || null : null,
            });
            await fetchProfiles();
        } catch (err: any) {
            console.error("Lỗi cập nhật vai trò:", err);
            alert(`Lỗi cập nhật vai trò: ${err.message}`);
        } finally {
            setUpdatingUserId(null);
        }
    };

    // User CRUD handlers
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (
            !newUserName.trim() ||
            !newUserUsername.trim() ||
            !newUserPassword.trim()
        ) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        try {
            // Register user via signUpUser
            const createdUser = await signUpUser(
                newUserName.trim(),
                newUserUsername.trim(),
                newUserPassword,
                newUserRole,
                newUserRole === "student" ? newUserGrade || null : null,
            );
            // If plan is not 'nothing', we need to update it
            if (newUserPlan !== "nothing") {
                await updateUserPlan(createdUser.id, newUserPlan);
            }
            alert("Tạo tài khoản thành công!");
            setIsCreateUserOpen(false);
            setNewUserName("");
            setNewUserUsername("");
            setNewUserPassword("");
            setNewUserRole("student");
            setNewUserPlan("nothing");
            setNewUserGrade("");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi tạo tài khoản: ${err.message}`);
        }
    };

    const startEditUser = (user: User) => {
        setEditingUser(user);
        setEditUserName(user.name);
        setEditUserUsername(user.username);
        setEditUserRole(user.role);
        setEditUserPlan(user.plan || "nothing");
        setEditUserGrade(user.grade || "");
    };

    const handleSaveEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        if (!editUserName.trim() || !editUserUsername.trim()) {
            alert("Vui lòng điền đầy đủ họ tên và username.");
            return;
        }
        try {
            await updateUserProfile(editingUser.id, {
                name: editUserName.trim(),
                username: editUserUsername.trim(),
                role: editUserRole,
                plan: editUserPlan,
                grade:
                    editUserRole === "student" ? editUserGrade || null : null,
            });
            alert("Cập nhật tài khoản thành công!");
            setEditingUser(null);
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi cập nhật tài khoản: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (
            !confirm(
                "Bạn có chắc chắn muốn xóa tài khoản này? Thao tác này không thể hoàn tác.",
            )
        ) {
            return;
        }
        try {
            await deleteUserProfile(userId);
            alert("Đã xóa tài khoản thành công!");
            await fetchProfiles();
        } catch (err: any) {
            alert(`Lỗi khi xóa tài khoản: ${err.message}`);
        }
    };

    const onlineCount = React.useMemo(() => {
        const now = new Date();
        return userProfiles.filter((u) => {
            if (!u.lastActiveAt) return false;
            const date = new Date(u.lastActiveAt);
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return diffMins < 5;
        }).length;
    }, [userProfiles]);

    const testingCount = React.useMemo(() => {
        return userProfiles.filter((u) => !!u.activeExam).length;
    }, [userProfiles]);

    const formatLastActive = (prof: User) => {
        if (prof.activeExam) {
            return (
                <div
                    className="flex flex-col gap-0.5 max-w-[200px]"
                    title={`Đang thi: ${prof.activeExam.quizTitle} (${prof.activeExam.durationMinutes} phút)`}
                >
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-700/50 px-2 py-0.5 rounded-md text-[10px] font-bold w-fit shadow-2xs">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span className="truncate">
                            {prof.activeExam.durationMinutes}p -{" "}
                            {prof.activeExam.quizTitle}
                        </span>
                    </span>
                </div>
            );
        }

        if (!prof.lastActiveAt)
            return <span className="text-slate-400 font-medium">—</span>;

        const date = new Date(prof.lastActiveAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 5) {
            return (
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                </span>
            );
        }

        if (diffMins < 60) {
            return (
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    {diffMins} phút trước
                </span>
            );
        }

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
            return (
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    {diffHours} giờ trước
                </span>
            );
        }

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) {
            return (
                <span className="text-slate-550 dark:text-slate-400 font-semibold">
                    {diffDays} ngày trước
                </span>
            );
        }

        return (
            <span className="text-slate-400 font-medium">
                {date.toLocaleDateString("vi-VN")}
            </span>
        );
    };

    const renderSortHeader = (
        field: SortField,
        label: string,
        align: "left" | "center" | "right" = "left",
        className: string = "",
    ) => {
        const isActive = sortField === field;
        return (
            <th
                onClick={() => handleSort(field)}
                className={`py-2.5 px-4 cursor-pointer select-none transition-colors group ${
                    align === "center"
                        ? "text-center"
                        : align === "right"
                          ? "text-right"
                          : "text-left"
                } ${className} ${
                    isActive
                        ? "text-brand-600 dark:text-brand-400 font-bold bg-brand-50/20 dark:bg-brand-950/20"
                        : "hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
                title={`Sắp xếp theo ${label} (${
                    isActive
                        ? sortDirection === "asc"
                            ? "Đang tăng dần - Nhấn để đảo chiều"
                            : "Đang giảm dần - Nhấn để đảo chiều"
                        : "Nhấn để sắp xếp"
                })`}
            >
                <div
                    className={`inline-flex items-center gap-1.5 ${
                        align === "center"
                            ? "justify-center"
                            : align === "right"
                              ? "justify-end"
                              : "justify-start"
                    }`}
                >
                    <span>{label}</span>
                    <span className="inline-flex items-center">
                        {isActive ? (
                            sortDirection === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-brand-600 dark:text-brand-400 stroke-[2.5]" />
                            ) : (
                                <ArrowDown className="w-3 h-3 text-brand-600 dark:text-brand-400 stroke-[2.5]" />
                            )
                        ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-80 transition-opacity" />
                        )}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-primary/60">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">
                        Gói Người Dùng
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Quản lý phân quyền, tìm kiếm và phân cấp gói dịch vụ học
                        viên.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateUserOpen(true)}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    Tạo tài khoản
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search & Online Badge */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Tìm tên hoặc username..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                        />
                    </div>
                    {/* Online badge & Testing badge */}
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-lg px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            online: {onlineCount}
                        </span>

                        {testingCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-lg px-2.5 py-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                testing: {testingCount}
                            </span>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                        value={filterRole}
                        onChange={(e) => {
                            setFilterRole(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">Admin</option>
                        <option value="student">Học sinh</option>
                    </select>

                    <select
                        value={filterPlan}
                        onChange={(e) => {
                            setFilterPlan(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <option value="all">Tất cả gói</option>
                        <option value="nothing">Free (Nothing)</option>
                        <option value="basic">Basic</option>
                        <option value="vip">VIP</option>
                    </select>

                    <select
                        value={filterGrade}
                        onChange={(e) => {
                            setFilterGrade(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                        <option value="all">Tất cả lớp</option>
                        <option value="none">Không lớp (Admin)</option>
                        <option value="8">Lớp 8</option>
                        <option value="9">Lớp 9</option>
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                    </select>
                </div>
            </div>

            {/* User List */}
            <div className="bg-bg-card  overflow-hidden shadow-2xs">
                <table className="w-full text-left border-1 border-slate-100">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30">
                            {renderSortHeader("stt", "STT", "center", "w-14")}
                            {renderSortHeader("name", "Tên Người Dùng")}
                            {renderSortHeader("username", "Username")}
                            {renderSortHeader("role", "Vai Trò")}
                            {renderSortHeader("plan", "Plan")}
                            {renderSortHeader("grade", "Lớp")}
                            {renderSortHeader("lastActive", "Hoạt động")}
                            <th className="py-2.5 px-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 text-xs text-slate-650">
                        {loadingProfiles ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="py-8 text-center text-slate-450"
                                >
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-350" />
                                </td>
                            </tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="py-8 text-center text-slate-450"
                                >
                                    Không tìm thấy tài khoản nào.
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((prof, index) => (
                                <tr
                                    key={prof.id}
                                    className="hover:bg-slate-50/30 transition-colors"
                                >
                                    <td className="py-3 px-4 text-center text-slate-400 font-bold">
                                        {(currentPage - 1) * pageSize +
                                            index +
                                            1}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSelectUserForStats?.(prof.id)
                                            }
                                            className="flex items-center gap-2.5 text-left group cursor-pointer hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                                            title="Nhấn để xem thống kê học sinh này"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 shadow-2xs group-hover:scale-105 transition-transform">
                                                {prof.avatarUrl ? (
                                                    <img
                                                        src={prof.avatarUrl}
                                                        alt={prof.name}
                                                        referrerPolicy="no-referrer"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display =
                                                                "none";
                                                        }}
                                                    />
                                                ) : (
                                                    (prof.name || "U")
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </div>
                                            <span className="truncate underline-offset-2 group-hover:underline font-bold">
                                                {prof.name}
                                            </span>
                                        </button>
                                    </td>
                                    <td className="py-3 px-4 text-slate-400">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSelectUserForStats?.(prof.id)
                                            }
                                            className="text-left text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hover:underline cursor-pointer transition-colors"
                                            title="Nhấn để xem thống kê học sinh này"
                                        >
                                            @{prof.username}
                                        </button>
                                    </td>
                                    <td className="py-3 px-4">
                                        <select
                                            disabled={
                                                updatingUserId === prof.id
                                            }
                                            value={prof.role}
                                            onChange={(e) =>
                                                handleRoleChange(
                                                    prof.id,
                                                    e.target.value as
                                                        | "admin"
                                                        | "student",
                                                )
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-0 focus:outline-none cursor-pointer transition-colors ${
                                                prof.role === "admin"
                                                    ? "bg-amber-50 text-amber-800"
                                                    : "bg-sky-50 text-sky-800"
                                            }`}
                                        >
                                            <option value="student">
                                                Học sinh
                                            </option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-4">
                                        <select
                                            disabled={
                                                updatingUserId === prof.id
                                            }
                                            value={prof.plan || "nothing"}
                                            onChange={(e) =>
                                                handlePlanChange(
                                                    prof.id,
                                                    e.target.value as UserPlan,
                                                )
                                            }
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-0 focus:outline-none cursor-pointer transition-colors ${
                                                prof.plan === "vip"
                                                    ? "bg-amber-50 text-amber-800"
                                                    : prof.plan === "basic"
                                                      ? "bg-sky-50 text-sky-800"
                                                      : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            <option value="nothing">
                                                FREE
                                            </option>
                                            <option value="basic">BASIC</option>
                                            <option value="vip">VIP</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-4">
                                        {prof.role === "student" ? (
                                            <select
                                                disabled={
                                                    updatingUserId === prof.id
                                                }
                                                value={prof.grade || ""}
                                                onChange={async (e) => {
                                                    const newGrade =
                                                        e.target.value || null;
                                                    setUpdatingUserId(prof.id);
                                                    try {
                                                        await updateUserGrade(
                                                            prof.id,
                                                            newGrade,
                                                        );
                                                        await fetchProfiles();
                                                    } catch (err: any) {
                                                        console.error(
                                                            "Lỗi cập nhật lớp:",
                                                            err,
                                                        );
                                                        alert(
                                                            `Lỗi cập nhật lớp: ${err.message}`,
                                                        );
                                                    } finally {
                                                        setUpdatingUserId(null);
                                                    }
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border-0 focus:outline-none cursor-pointer transition-colors ${
                                                    prof.grade
                                                        ? "bg-indigo-50 text-indigo-800"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                <option value="">
                                                    Chọn lớp
                                                </option>
                                                <option value="8">Lớp 8</option>
                                                <option value="9">Lớp 9</option>
                                                <option value="10">
                                                    Lớp 10
                                                </option>
                                                <option value="11">
                                                    Lớp 11
                                                </option>
                                                <option value="12">
                                                    Lớp 12
                                                </option>
                                            </select>
                                        ) : (
                                            <span className="text-[10px] text-slate-450 font-medium italic">
                                                Không có
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        {formatLastActive(prof)}
                                    </td>
                                    <td className="py-3 px-4 text-right space-x-1.5">
                                        <button
                                            disabled={
                                                generatingResetId === prof.id
                                            }
                                            onClick={() =>
                                                handleGenerateResetLink(prof)
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg transition-colors cursor-pointer text-[11px] font-medium disabled:opacity-50"
                                            title="Tạo link đặt lại mật khẩu cho học sinh"
                                        >
                                            {generatingResetId === prof.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <KeyRound className="w-3 h-3" />
                                            )}
                                            Reset MK
                                        </button>
                                        <button
                                            onClick={() => startEditUser(prof)}
                                            className="inline-flex items-center px-2.5 py-1 hover:bg-slate-150 text-slate-500 rounded-lg transition-colors cursor-pointer text-[11px] font-medium"
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            disabled={
                                                updatingUserId === prof.id
                                            }
                                            onClick={() =>
                                                handleDeleteUser(prof.id)
                                            }
                                            className="inline-flex items-center px-2.5 py-1 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer text-[11px] font-medium"
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border-primary/60">
                    <span className="text-[11px] text-slate-400">
                        Hiển thị {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(currentPage * pageSize, filteredUsers.length)}{" "}
                        / {filteredUsers.length} tài khoản
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-600 px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setCurrentPage((p) =>
                                    Math.min(totalPages, p + 1),
                                )
                            }
                            disabled={currentPage === totalPages}
                            className="p-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-500 rounded-lg transition-colors cursor-pointer border-0"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* CREATE USER MODAL */}
            {isCreateUserOpen && (
                <div className="fixed inset-0 bg-slate-955/20 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-bg-card rounded-2xl p-5 w-full max-w-sm border border-border-primary/60 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                            Tạo tài khoản mới
                        </h3>
                        <form
                            onSubmit={handleCreateUser}
                            className="space-y-3.5"
                        >
                            <div>
                                <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                    Họ Tên
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nguyễn Văn A"
                                    value={newUserName}
                                    onChange={(e) =>
                                        setNewUserName(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="nguyenvana"
                                    value={newUserUsername}
                                    onChange={(e) =>
                                        setNewUserUsername(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-455 mb-1 block uppercase">
                                    Mật khẩu
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Nhập mật khẩu"
                                    value={newUserPassword}
                                    onChange={(e) =>
                                        setNewUserPassword(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Vai trò
                                    </label>
                                    <select
                                        value={newUserRole}
                                        onChange={(e) =>
                                            setNewUserRole(
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="student">
                                            Học sinh
                                        </option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Plan
                                    </label>
                                    <select
                                        value={newUserPlan}
                                        onChange={(e) =>
                                            setNewUserPlan(
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="nothing">
                                            Free (Nothing)
                                        </option>
                                        <option value="basic">Basic</option>
                                        <option value="vip">VIP</option>
                                    </select>
                                </div>
                            </div>
                            {newUserRole === "student" && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Lớp
                                    </label>
                                    <select
                                        value={newUserGrade}
                                        onChange={(e) =>
                                            setNewUserGrade(e.target.value)
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="">Chọn lớp</option>
                                        <option value="8">Lớp 8</option>
                                        <option value="9">Lớp 9</option>
                                        <option value="10">Lớp 10</option>
                                        <option value="11">Lớp 11</option>
                                        <option value="12">Lớp 12</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-3 border-t border-border-primary/40">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateUserOpen(false);
                                        setNewUserGrade("");
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm active:scale-98"
                                >
                                    Tạo tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-slate-955/20 backdrop-blur-xs flex items-center justify-center z-50">
                    <div className="bg-bg-card rounded-2xl p-5 w-full max-w-sm border border-border-primary/60 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                            Chỉnh sửa tài khoản
                        </h3>
                        <form
                            onSubmit={handleSaveEditUser}
                            className="space-y-3.5"
                        >
                            <div>
                                <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                    Họ Tên
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editUserName}
                                    onChange={(e) =>
                                        setEditUserName(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editUserUsername}
                                    onChange={(e) =>
                                        setEditUserUsername(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-slate-100 border-0 rounded-lg text-xs font-normal focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Vai trò
                                    </label>
                                    <select
                                        value={editUserRole}
                                        onChange={(e) =>
                                            setEditUserRole(
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="student">
                                            Học sinh
                                        </option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Plan
                                    </label>
                                    <select
                                        value={editUserPlan}
                                        onChange={(e) =>
                                            setEditUserPlan(
                                                e.target.value as any,
                                            )
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="nothing">
                                            Free (Nothing)
                                        </option>
                                        <option value="basic">Basic</option>
                                        <option value="vip">VIP</option>
                                    </select>
                                </div>
                            </div>
                            {editUserRole === "student" && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-450 mb-1 block uppercase">
                                        Lớp
                                    </label>
                                    <select
                                        value={editUserGrade}
                                        onChange={(e) =>
                                            setEditUserGrade(e.target.value)
                                        }
                                        className="w-full px-2.5 py-2 bg-slate-100 border-0 rounded-lg text-xs focus:outline-none cursor-pointer"
                                    >
                                        <option value="">Chọn lớp</option>
                                        <option value="8">Lớp 8</option>
                                        <option value="9">Lớp 9</option>
                                        <option value="10">Lớp 10</option>
                                        <option value="11">Lớp 11</option>
                                        <option value="12">Lớp 12</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-3 border-t border-border-primary/40">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm active:scale-98"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Link Modal */}
            {resetLinkData && resetModalUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-xl border border-border-primary/80 animate-in zoom-in-95 duration-200 font-sans">
                        <div className="flex items-center justify-between pb-3 border-b border-border-primary/60 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        Link Đặt Lại Mật Khẩu
                                    </h3>
                                    <p className="text-[10px] text-slate-400">
                                        Sao chép liên kết gửi cho học sinh
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setResetLinkData(null);
                                    setResetModalUser(null);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Target User Info */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-border-primary/50 flex items-center justify-between text-xs">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        {resetModalUser.name}
                                    </p>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        @{resetModalUser.username}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">
                                    {resetModalUser.role === "admin"
                                        ? "Admin"
                                        : "Học sinh"}
                                </span>
                            </div>

                            {/* Link Box */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                                    Liên kết đặt lại mật khẩu:
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        readOnly
                                        value={resetLinkData.link}
                                        className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-none select-all truncate"
                                        onClick={(e) =>
                                            (
                                                e.target as HTMLInputElement
                                            ).select()
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyResetLink}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 active:scale-95 ${
                                            copiedResetLink
                                                ? "bg-emerald-600 text-white"
                                                : "bg-brand-600 hover:bg-brand-700 text-white"
                                        }`}
                                    >
                                        {copiedResetLink ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                Đã chép!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                Sao chép
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Security Warnings & Instructions */}
                            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                                <p className="font-bold flex items-center gap-1">
                                    ⚡ Quy tắc bảo mật:
                                </p>
                                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-700 dark:text-amber-400 pl-1">
                                    <li>
                                        Link chỉ có hiệu lực trong{" "}
                                        <b>30 phút</b>.
                                    </li>
                                    <li>
                                        Chỉ sử dụng được <b>1 lần duy nhất</b>.
                                    </li>
                                    <li>
                                        Sau khi học sinh đổi MK thành công, link
                                        lập tức vô hiệu hóa.
                                    </li>
                                </ul>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setResetLinkData(null);
                                        setResetModalUser(null);
                                    }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

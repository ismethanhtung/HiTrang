import React, { useState } from "react";
import { User, UserPlan } from "../types";
import {
    signUpUser,
    updateUserProfile,
    deleteUserProfile,
    updateUserPlan,
    updateUserGrade,
} from "../lib/supabaseService";
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
} from "lucide-react";

interface AdminPlansTabProps {
    userProfiles: User[];
    loadingProfiles: boolean;
    updatingUserId: string | null;
    setUpdatingUserId: React.Dispatch<React.SetStateAction<string | null>>;
    fetchProfiles: () => Promise<void>;
}

export default function AdminPlansTab({
    userProfiles,
    loadingProfiles,
    updatingUserId,
    setUpdatingUserId,
    fetchProfiles,
}: AdminPlansTabProps) {
    // User Management filters, search and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "admin" | "student">(
        "all",
    );
    const [filterPlan, setFilterPlan] = useState<"all" | UserPlan>("all");
    const [filterGrade, setFilterGrade] = useState<string>("all");
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

    // Filtering logic
    const filteredUsers = userProfiles.filter((u) => {
        const matchesSearch =
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase());
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

    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice(
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
                {/* Search */}
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
            <div className="bg-bg-card rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border-primary/50 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/30">
                            <th className="py-2.5 px-4">Tên Người Dùng</th>
                            <th className="py-2.5 px-4">Username</th>
                            <th className="py-2.5 px-4">Vai Trò</th>
                            <th className="py-2.5 px-4">Plan</th>
                            <th className="py-2.5 px-4">Lớp</th>
                            <th className="py-2.5 px-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/50 text-xs text-slate-650">
                        {loadingProfiles ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-8 text-center text-slate-450"
                                >
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-350" />
                                </td>
                            </tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="py-8 text-center text-slate-450"
                                >
                                    Không tìm thấy tài khoản nào.
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((prof) => (
                                <tr
                                    key={prof.id}
                                    className="hover:bg-slate-50/30 transition-colors"
                                >
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                        {prof.name}
                                    </td>
                                    <td className="py-3 px-4 text-slate-400">
                                        @{prof.username}
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
                                    <td className="py-3 px-4 text-right space-x-1.5">
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
        </div>
    );
}

import React, { useState } from "react";
import { Play, PlayCircle, Activity, ShieldCheck, AlertTriangle, CheckCircle, Database, Server, RefreshCw } from "lucide-react";

interface ApiRoute {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  category: "Auth" | "Quizzes" | "Attempts" | "Leaderboard" | "Admin";
  description: string;
  defaultParams?: Record<string, string>;
  defaultBody?: any;
}

const API_ROUTES: ApiRoute[] = [
  // Auth
  { path: "/auth/me", method: "GET", category: "Auth", description: "Lấy thông tin tài khoản đang đăng nhập" },
  { path: "/auth/me/name", method: "PUT", category: "Auth", description: "Cập nhật họ tên hiển thị", defaultBody: { name: "Học sinh thử nghiệm" } },
  { path: "/auth/me/password", method: "PUT", category: "Auth", description: "Đổi mật khẩu người dùng", defaultBody: { password: "newpassword123" } },
  
  // Quizzes
  { path: "/quizzes", method: "GET", category: "Quizzes", description: "Lấy danh sách tất cả đề thi" },
  
  // Attempts
  { path: "/attempts/any-active", method: "GET", category: "Attempts", description: "Kiểm tra xem có lượt thi nào đang chạy dở không" },
  { path: "/attempts/active", method: "GET", category: "Attempts", description: "Lấy lượt thi đang làm dở của đề thi cụ thể", defaultParams: { quizId: "1" } },
  { path: "/attempts/student-questions", method: "GET", category: "Attempts", description: "Tải danh sách câu hỏi làm bài (đã ẩn đáp án)", defaultParams: { p_quiz_id: "1" } },
  { path: "/attempts/review-questions", method: "GET", category: "Attempts", description: "Xem lại câu hỏi và đáp án của bài nộp", defaultParams: { p_submission_id: "1" } },
  
  // Submissions
  { path: "/submissions", method: "GET", category: "Quizzes", description: "Lấy lịch sử tất cả bài nộp của học sinh" },
  
  // Leaderboard
  { path: "/leaderboard/overall", method: "GET", category: "Leaderboard", description: "Lấy bảng xếp hạng tổng hợp của khối lớp", defaultParams: { p_grade: "10" } },
  { path: "/leaderboard/recent", method: "GET", category: "Leaderboard", description: "Lấy các bài nộp gần nhất theo khối", defaultParams: { p_grade: "10" } },
  { path: "/leaderboard/quiz", method: "GET", category: "Leaderboard", description: "Lấy bảng xếp hạng của một đề thi cụ thể", defaultParams: { p_quiz_id: "1" } },
  { path: "/leaderboard/refresh", method: "POST", category: "Leaderboard", description: "Kích hoạt tính toán lại toàn bộ bảng xếp hạng (Admin/Teacher)" },
  
  // Admin
  { path: "/admin/users", method: "GET", category: "Admin", description: "Lấy toàn bộ danh sách tài khoản trong hệ thống" },
  { path: "/admin/backup", method: "GET", category: "Admin", description: "Tải gói nén sao lưu toàn bộ dữ liệu (zip)" },
];

export default function AdminApiTab() {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [queryParams, setQueryParams] = useState<string>("");
  const [requestBody, setRequestBody] = useState<string>("");
  const [testingAll, setTestingAll] = useState(false);
  
  // Test results state
  const [testResults, setTestResults] = useState<Record<string, {
    status: number;
    time: number;
    loading: boolean;
    error?: string;
    data?: any;
  }>>({});

  const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

  const getHeaders = () => {
    const token = localStorage.getItem("hitrang_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleSelectRoute = (route: ApiRoute) => {
    setSelectedRoute(route);
    
    // Set query params default string
    if (route.defaultParams) {
      const q = Object.entries(route.defaultParams)
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      setQueryParams(q);
    } else {
      setQueryParams("");
    }

    // Set body default string
    if (route.defaultBody) {
      setRequestBody(JSON.stringify(route.defaultBody, null, 2));
    } else {
      setRequestBody("");
    }
  };

  const runSingleTest = async (route: ApiRoute, customQuery = "", customBody = "") => {
    const routeKey = `${route.method}:${route.path}`;
    setTestResults(prev => ({
      ...prev,
      [routeKey]: { status: 0, time: 0, loading: true }
    }));

    const start = performance.now();
    try {
      let finalPath = route.path;
      
      // Parse route placeholders like :id if present
      if (finalPath.includes("/:id")) {
        const idVal = prompt("Nhập ID đối tượng cần tác động (thay thế cho :id):", "c7845058-39a4-4d36-be82-e72e5f2608ee");
        if (idVal === null) {
          setTestResults(prev => ({
            ...prev,
            [routeKey]: { status: 0, time: 0, loading: false, error: "Đã hủy bởi người dùng" }
          }));
          return;
        }
        finalPath = finalPath.replace("/:id", `/${idVal}`);
      }

      // Append query parameters
      const qParams = customQuery || (route.defaultParams ? Object.entries(route.defaultParams).map(([k, v]) => `${k}=${v}`).join("&") : "");
      const url = `${API_BASE_URL}${finalPath}${qParams ? `?${qParams}` : ""}`;

      // Build fetch options
      const options: RequestInit = {
        method: route.method,
        headers: getHeaders(),
      };

      if (["POST", "PUT"].includes(route.method) && (customBody || route.defaultBody)) {
        options.body = customBody || JSON.stringify(route.defaultBody);
      }

      const response = await fetch(url, options);
      const end = performance.now();
      const duration = Math.round(end - start);

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => "");
      }

      setTestResults(prev => ({
        ...prev,
        [routeKey]: {
          status: response.status,
          time: duration,
          loading: false,
          data
        }
      }));
    } catch (err: any) {
      const end = performance.now();
      setTestResults(prev => ({
        ...prev,
        [routeKey]: {
          status: 0,
          time: Math.round(end - start),
          loading: false,
          error: err.message || "Lỗi kết nối tới Server API"
        }
      }));
    }
  };

  const handleTestAllGet = async () => {
    setTestingAll(true);
    const getRoutes = API_ROUTES.filter(r => r.method === "GET");
    for (const r of getRoutes) {
      await runSingleTest(r);
    }
    setTestingAll(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome & Stats Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Giám Sát Hệ Thống API <Activity className="w-5 h-5 text-brand-500 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Kiểm tra trạng thái kết nối, đo lường tốc độ phản hồi (Latency) các đầu API Backend.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestAllGet}
            disabled={testingAll}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300 text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {testingAll ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
            <span>Kiểm Tra Toàn Bộ GET</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: API List */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                DANH SÁCH ENDPOINTS ({API_ROUTES.length})
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded">
                Base: {API_BASE_URL}
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {API_ROUTES.map((route) => {
                const routeKey = `${route.method}:${route.path}`;
                const result = testResults[routeKey];
                
                let methodColor = "bg-blue-50 text-blue-650 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30";
                if (route.method === "POST") methodColor = "bg-emerald-50 text-emerald-650 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
                if (route.method === "PUT") methodColor = "bg-amber-50 text-amber-650 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
                if (route.method === "DELETE") methodColor = "bg-red-50 text-red-650 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30";

                return (
                  <div 
                    key={routeKey}
                    onClick={() => handleSelectRoute(route)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${
                      selectedRoute?.path === route.path && selectedRoute?.method === route.method 
                        ? "bg-[#EBF3FF]/40 dark:bg-slate-700/10 border-l-4 border-[#1B72E8]" 
                        : ""
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${methodColor}`}>
                          {route.method}
                        </span>
                        <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                          {route.path}
                        </code>
                        <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-medium">
                          {route.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {route.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {result && (
                        <div className="flex items-center gap-2">
                          {result.loading ? (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 animate-pulse">
                              Đang tải...
                            </span>
                          ) : result.error ? (
                            <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Lỗi
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                result.status >= 200 && result.status < 300 
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                  : "bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400"
                              }`}>
                                {result.status}
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${
                                result.time < 100 
                                  ? "text-emerald-500" 
                                  : result.time < 300 
                                    ? "text-amber-500" 
                                    : "text-red-500"
                              }`}>
                                {result.time}ms
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runSingleTest(route);
                        }}
                        disabled={result?.loading}
                        className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Chạy thử API"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: API Test Console */}
        <div className="space-y-6">
          {selectedRoute ? (
            <div className="bg-white rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  BỘ THỬ NGHIỆM API
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedRoute.method}
                </span>
              </div>

              {/* Endpoint Header */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1.5">
                <code className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 block break-all">
                  {selectedRoute.path}
                </code>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  {selectedRoute.description}
                </p>
              </div>

              {/* Input for Query Params */}
              {selectedRoute.defaultParams && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Tham số truy vấn (Query parameters)
                  </label>
                  <input
                    type="text"
                    value={queryParams}
                    onChange={(e) => setQueryParams(e.target.value)}
                    placeholder="quizId=1&p_grade=10"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors font-mono"
                  />
                </div>
              )}

              {/* Input for Body (POST/PUT only) */}
              {["POST", "PUT"].includes(selectedRoute.method) && selectedRoute.defaultBody && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Nội dung yêu cầu (JSON Body)
                  </label>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-300/25 transition-colors font-mono resize-y"
                  />
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={() => runSingleTest(selectedRoute, queryParams, requestBody)}
                disabled={testResults[`${selectedRoute.method}:${selectedRoute.path}`]?.loading}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300 text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Gửi Yêu Cầu</span>
              </button>

              {/* Response Panel */}
              {testResults[`${selectedRoute.method}:${selectedRoute.path}`] && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    KẾT QUẢ PHẢN HỒI (RESPONSE)
                  </span>

                  {(() => {
                    const res = testResults[`${selectedRoute.method}:${selectedRoute.path}`];
                    if (res.loading) {
                      return (
                        <div className="text-center py-6 text-slate-400 text-xs animate-pulse">
                          Đang chờ máy chủ phản hồi...
                        </div>
                      );
                    }
                    if (res.error) {
                      return (
                        <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl text-xs text-red-650 dark:text-red-400 font-medium">
                          {res.error}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            Trạng thái: 
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              res.status >= 200 && res.status < 300 
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                                : "bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400"
                            }`}>
                              {res.status}
                            </span>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Thời gian: <span className="font-mono text-brand-600 dark:text-brand-300">{res.time}ms</span>
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase">
                            Phần thân (JSON Data)
                          </span>
                          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl max-h-[220px] overflow-y-auto border border-slate-100 dark:border-slate-700/50">
                            <pre className="text-[10px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap word-break">
                              {typeof res.data === "object" 
                                ? JSON.stringify(res.data, null, 2) 
                                : String(res.data)
                              }
                            </pre>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 space-y-2">
              <Server className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs font-semibold">Chọn đầu API cần chạy thử</p>
              <p className="text-[10px] text-slate-400">Chọn bất kỳ Endpoint nào trong danh sách bên cạnh để cấu hình tham số, gửi yêu cầu kiểm tra latency thời gian thực.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

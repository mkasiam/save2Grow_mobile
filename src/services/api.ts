import axios from "axios";
import Constants from "expo-constants";
import { localStorageService } from "../utils/storage";

const REQUEST_TIMEOUT_MS = 10000;

const getHostFromUri = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return value.replace(/^https?:\/\//, "").split(":")[0] || null;
};

const API_URL = Constants.expoConfig?.extra?.apiUrl || Constants.manifest?.extra?.apiUrl || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await localStorageService.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;

    if (error.code === "ECONNABORTED") {
      error.message = "Network timeout";
    }

    if (!error.response && error.message !== "Network timeout") {
      error.message = "Network Error";
    }

    if (__DEV__) {
      console.warn("[API error]", {
        code: error.code,
        message: error.message,
        url: requestUrl,
        method: error.config?.method,
      });
    }

    return Promise.reject(error);
  },
);

// Authentication endpoints used during register, login, and session restore flows.
export const authService = {
  register: (data: Record<string, unknown>) => api.post("/auth/register", data),
  login: (data: Record<string, unknown>) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// User profile and stats endpoints consumed by profile and dashboard screens.
export const userService = {
  getProfile: (userId: string) => api.get(`/users/${userId}`),
  updateProfile: (userId: string, data: Record<string, unknown>) =>
    api.put(`/users/${userId}`, data),
  getStats: (userId: string) => api.get(`/users/${userId}/stats`),
  // Admin-scoped requests
  getAllStudents: () => api.get("/users"),
  verifyStudent: (userId: string, verificationStatus: 'pending' | 'verified' | 'rejected') =>
    api.put(`/users/${userId}/verify`, { verificationStatus }),
};

// Goal-related CRUD endpoints plus the helper used when adding savings to a goal.
export const goalService = {
  createGoal: (data: Record<string, unknown>) => api.post("/goals", data),
  getGoals: () => api.get("/goals"),
  getGoal: (goalId: string) => api.get(`/goals/${goalId}`),
  updateGoal: (goalId: string, data: Record<string, unknown>) =>
    api.put(`/goals/${goalId}`, data),
  deleteGoal: (goalId: string) => api.delete(`/goals/${goalId}`),
  addSavings: (goalId: string, amount: number) =>
    api.post(`/goals/${goalId}/add-savings`, { amount }),
};

// Transaction endpoints for loading activity history and goal-specific activity.
export const transactionService = {
  createTransaction: (data: Record<string, unknown>) =>
    api.post("/transactions", data),
  getTransactions: () => api.get("/transactions"),
  getGoalTransactions: (goalId: string) =>
    api.get(`/transactions/goal/${goalId}`),
  // Admin-scoped requests
  getAllTransactions: () => api.get("/transactions/all"),
  updateTransactionStatus: (transactionId: string, status: 'processing' | 'completed' | 'failed') =>
    api.put(`/transactions/${transactionId}/status`, { status }),
  createSslcommerzDepositSession: (data: Record<string, unknown>) =>
    api.post('/payments/sslcommerz/initiate', data),
};

// Challenge endpoints for listing challenges, joining one, or loading the user's joined items.
export const challengeService = {
  createChallenge: (data: Record<string, unknown>) =>
    api.post("/challenges", data),
  getChallenges: () => api.get("/challenges"),
  getAdminChallenges: (params?: { page?: number; limit?: number; status?: 'all' | 'active' | 'inactive' | 'completed' | 'cancelled' }) =>
    api.get("/challenges/admin", { params }),
  updateChallenge: (challengeId: string, data: Record<string, unknown>) =>
    api.put(`/challenges/admin/${challengeId}`, data),
  deleteChallenge: (challengeId: string) =>
    api.delete(`/challenges/admin/${challengeId}`),
  joinChallenge: (challengeId: string) =>
    api.post(`/challenges/${challengeId}/join`),
  getUserChallenges: () => api.get("/challenges/user/challenges"),
};

export const withdrawalService = {
  requestWithdrawal: (data: Record<string, unknown>) => api.post('/withdrawals/request', data),
  getMyWithdrawalRequests: () => api.get('/withdrawals/me'),
  getAllWithdrawalRequests: () => api.get('/withdrawals/admin'),
  updateWithdrawalStatus: (withdrawalId: string, status: 'approved' | 'rejected', adminNote?: string) =>
    api.put(`/withdrawals/${withdrawalId}/status`, { status, adminNote }),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
};

export default api;

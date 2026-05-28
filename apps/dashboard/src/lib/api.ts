import axios from "axios"
import { useAuthStore } from "../stores/auth"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = "/login"
    }
    const data = err.response?.data
    const parsed = {
      error: data?.error ?? "UNKNOWN",
      message: data?.message ?? "An unexpected error occurred",
      statusCode: data?.statusCode ?? 500,
      code: data?.code ?? undefined,
    }
    return Promise.reject(parsed)
  }
)

export default api

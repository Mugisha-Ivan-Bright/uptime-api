import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"
import api from "../lib/api"
import type { AuthResponse } from "@uptime/types"

export function useAuth() {
  const navigate = useNavigate()
  const { token, user, org, login, logout: storeLogout } = useAuthStore()

  const loginAction = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/v1/auth/login", { email, password })
    login(res.data.token, res.data.user, res.data.org)
  }

  const registerAction = async (orgName: string, slug: string, email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/v1/auth/register", { orgName, slug, email, password })
    login(res.data.token, res.data.user, res.data.org)
  }

  const logout = () => {
    storeLogout()
    navigate("/login")
  }

  return {
    user,
    org,
    token,
    isAuthenticated: !!token,
    login: loginAction,
    register: registerAction,
    logout,
  }
}

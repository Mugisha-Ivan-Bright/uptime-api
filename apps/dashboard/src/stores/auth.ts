import { create } from "zustand"

export interface User {
  id: string
  email: string
  role: string
}

export interface Org {
  id: string
  name: string
  slug: string
  plan: string
}

interface AuthState {
  token: string | null
  user: User | null
  org: Org | null
  login: (token: string, user: User, org: Org) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  org: null,

  login: (token, user, org) => {
    localStorage.setItem("uptime_token", token)
    localStorage.setItem("uptime_user", JSON.stringify(user))
    localStorage.setItem("uptime_org", JSON.stringify(org))
    set({ token, user, org })
  },

  logout: () => {
    localStorage.removeItem("uptime_token")
    localStorage.removeItem("uptime_user")
    localStorage.removeItem("uptime_org")
    set({ token: null, user: null, org: null })
  },

  hydrate: () => {
    const token = localStorage.getItem("uptime_token")
    const userStr = localStorage.getItem("uptime_user")
    const orgStr = localStorage.getItem("uptime_org")
    if (token && userStr && orgStr) {
      try {
        set({
          token,
          user: JSON.parse(userStr) as User,
          org: JSON.parse(orgStr) as Org,
        })
      } catch {
        localStorage.removeItem("uptime_token")
        localStorage.removeItem("uptime_user")
        localStorage.removeItem("uptime_org")
      }
    }
  },
}))

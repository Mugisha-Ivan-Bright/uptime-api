import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "../../stores/auth"
import Badge from "../ui/Badge"
import Button from "../ui/Button"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import gsap from "gsap"

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const org = useAuthStore((s) => s.org)

  useEffect(() => {
    useAuthStore.getState().hydrate()
  }, [])

  useEffect(() => {
    gsap.from(".page-content", { opacity: 0, duration: 0.2, ease: "none" })
  }, [pathname])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <main style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 32px",
        }}>
          <div className="page-content" style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

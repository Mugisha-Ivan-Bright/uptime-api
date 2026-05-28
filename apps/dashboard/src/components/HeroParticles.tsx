import { useEffect, useRef } from "react"
import * as THREE from "three"

interface HeroParticlesProps {
  height?: number
}

export default function HeroParticles({ height = 200 }: HeroParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)
  const mouseXRef = useRef(0)
  const mouseYRef = useRef(0)
  const animFrameRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.OrthographicCamera(
      width / -2, width / 2, height / 2, height / -2, 0.1, 1000
    )
    camera.position.z = 300
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const count = 400
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const green = new THREE.Color("#00ff88")
    const muted = new THREE.Color("#444444")

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 80 + Math.random() * 80

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const c = Math.random() > 0.5 ? green : muted
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)
    particlesRef.current = points

    const handleResize = () => {
      const w = container.clientWidth
      renderer.setSize(w, height)
      camera.left = w / -2
      camera.right = w / 2
      camera.updateProjectionMatrix()
    }

    const handleMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseXRef.current = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseYRef.current = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }

    window.addEventListener("resize", handleResize)
    container.addEventListener("mousemove", handleMouse)

    const animate = () => {
      if (points) {
        points.rotation.y += 0.0003
        points.rotation.x += mouseYRef.current * 0.0001
        points.rotation.z += mouseXRef.current * 0.0001
      }
      renderer.render(scene, camera)
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("resize", handleResize)
      container.removeEventListener("mousemove", handleMouse)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [height])

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        borderBottom: "1px solid var(--border-default)",
      }}
    />
  )
}

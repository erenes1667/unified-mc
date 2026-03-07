'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  px: number
  py: number
}

const STAR_COUNT = 60
const SPEED = 0.3
const MIN_Z = 0.1
const MAX_Z = 1.0

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function initStars() {
      if (!canvas) return
      starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
        x: (Math.random() - 0.5) * canvas!.width * 2,
        y: (Math.random() - 0.5) * canvas!.height * 2,
        z: Math.random() * (MAX_Z - MIN_Z) + MIN_Z,
        px: 0,
        py: 0,
      }))
    }

    function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
      return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
    }

    function draw() {
      if (!canvas || !ctx) return

      // Fade trail
      ctx.fillStyle = 'rgba(10, 10, 15, 0.25)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width / 2 + mouseRef.current.x * 30
      const cy = canvas.height / 2 + mouseRef.current.y * 20

      for (const star of starsRef.current) {
        star.px = star.x / star.z + cx
        star.py = star.y / star.z + cy

        star.z -= SPEED * star.z * 0.015

        if (star.z <= MIN_Z || star.px < 0 || star.px > canvas.width || star.py < 0 || star.py > canvas.height) {
          star.x = (Math.random() - 0.5) * canvas.width * 2
          star.y = (Math.random() - 0.5) * canvas.height * 2
          star.z = MAX_Z
          star.px = star.x / star.z + cx
          star.py = star.y / star.z + cy
          continue
        }

        const size = mapRange(star.z, MAX_Z, MIN_Z, 0.3, 2.2)
        const opacity = mapRange(star.z, MAX_Z, MIN_Z, 0.1, 0.9)

        // Alternate between white/gold/cyan stars for variety
        const hash = Math.abs(Math.floor(star.x * 13 + star.y * 7)) % 10
        let color: string
        if (hash < 7) {
          color = `rgba(200, 210, 255, ${opacity})`
        } else if (hash < 9) {
          color = `rgba(201, 168, 76, ${opacity * 0.7})`
        } else {
          color = `rgba(0, 255, 209, ${opacity * 0.6})`
        }

        ctx.beginPath()
        ctx.arc(star.px, star.py, size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 0.5,
        y: (e.clientY / window.innerHeight - 0.5) * 0.5,
      }
    }

    resize()
    initStars()
    draw()

    window.addEventListener('resize', () => { resize(); initStars() })
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#0a0a0f' }}
      aria-hidden="true"
    />
  )
}

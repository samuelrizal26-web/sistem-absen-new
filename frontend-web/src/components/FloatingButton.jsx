import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function FloatingButton({ menuItems, onItemClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 200 })
  const [isDragging, setIsDragging] = useState(false)
  const buttonRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Handle drag start (mouse)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
    e.preventDefault()
  }

  // Handle drag start (touch)
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setIsDragging(true)
    dragOffset.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    }
    e.preventDefault()
  }

  // Handle drag move (mouse)
  const handleMouseMove = (e) => {
    if (!isDragging) return
    
    const newPosition = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    }

    // Keep button within viewport
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60
    
    setPosition({
      x: Math.max(0, Math.min(newPosition.x, maxX)),
      y: Math.max(0, Math.min(newPosition.y, maxY))
    })
  }

  // Handle drag move (touch)
  const handleTouchMove = (e) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const newPosition = {
      x: touch.clientX - dragOffset.current.x,
      y: touch.clientY - dragOffset.current.y
    }

    // Keep button within viewport
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60
    
    setPosition({
      x: Math.max(0, Math.min(newPosition.x, maxX)),
      y: Math.max(0, Math.min(newPosition.y, maxY))
    })
    e.preventDefault()
  }

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Toggle menu
  const handleToggle = (e) => {
    if (isDragging) return
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  // Handle menu item click
  const handleItemClick = (item) => {
    setIsOpen(false)
    onItemClick(item)
  }

  // Add/remove event listeners for drag (mouse)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    } else {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Add/remove event listeners for drag (touch)
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
    } else {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // S Pen style menu positions (wide fan branching to upper-left)
  const menuCount = menuItems.length
  const startAngle = -160 * (Math.PI / 180)
  const totalSpread = Math.min(140, menuCount * 50) * (Math.PI / 180)
  const angleStep = menuCount > 1 ? totalSpread / (menuCount - 1) : 0
  const menuRadius = 130

  const menuItemsWithPositions = menuItems.map((item, index) => {
    const angle = startAngle + (index * angleStep)
    const radius = menuRadius + (index % 2 === 0 ? 0 : 18)
    return {
      ...item,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      angle
    }
  })

  const buttonContent = (
    <div
      ref={buttonRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {/* Menu Items with S Pen Branching Effect */}
      {isOpen && menuItemsWithPositions.map((item, index) => (
        <div key={item.id || index} style={{ position: 'absolute' }}>
          {/* Metaball/Liquid Connecting Line */}
          <svg
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: Math.max(200, Math.abs(item.x) + 100),
              height: Math.max(200, Math.abs(item.y) + 100),
              pointerEvents: 'none',
              overflow: 'visible',
              zIndex: 1
            }}
          >
            <defs>
              <filter id={`metaball-${index}`}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                  result="goo"
                />
                <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
              </filter>
            </defs>
            <g filter={`url(#metaball-${index})`}>
              {/* Main connecting path with variable width */}
              <path
                d={`M 32 32 Q ${32 + item.x * 0.5} ${32 + item.y * 0.2} ${32 + item.x} ${32 + item.y}`}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeWidth="20"
                fill="none"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1000,
                  strokeDashoffset: isOpen ? 0 : 1000,
                  transition: `stroke-dashoffset 0.5s ease-out ${index * 0.08}s`
                }}
              />
              {/* Liquid droplets along the path */}
              <circle
                cx={32 + item.x * 0.3}
                cy={32 + item.y * 0.1}
                r="12"
                fill="rgba(255, 255, 255, 0.25)"
                style={{
                  animation: `dropletPulse 1.5s ease-in-out ${index * 0.08}s infinite`
                }}
              />
              <circle
                cx={32 + item.x * 0.6}
                cy={32 + item.y * 0.15}
                r="10"
                fill="rgba(255, 255, 255, 0.2)"
                style={{
                  animation: `dropletPulse 1.5s ease-in-out ${index * 0.08 + 0.3}s infinite`
                }}
              />
              <circle
                cx={32 + item.x * 0.85}
                cy={32 + item.y * 0.2}
                r="8"
                fill="rgba(255, 255, 255, 0.18)"
                style={{
                  animation: `dropletPulse 1.5s ease-in-out ${index * 0.08 + 0.6}s infinite`
                }}
              />
            </g>
          </svg>

          {/* Action Button */}
          <button
            onClick={() => handleItemClick(item)}
            style={{
              position: 'absolute',
              left: 32 + item.x - 28,
              top: 32 + item.y - 28,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #3B82F6 0%, #1D4ED8 100%)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold',
              zIndex: 2,
              boxShadow: `
                0 10px 25px rgba(37, 99, 235, 0.45),
                inset 0 3px 6px rgba(255, 255, 255, 0.35),
                inset 0 -3px 6px rgba(0, 0, 0, 0.15)
              `,
              animation: `scaleIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${index * 0.08}s both`,
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.15)'
              e.target.style.boxShadow = `
                0 14px 32px rgba(37, 99, 235, 0.55),
                inset 0 3px 6px rgba(255, 255, 255, 0.45),
                inset 0 -3px 6px rgba(0, 0, 0, 0.15)
              `
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = `
                0 10px 25px rgba(37, 99, 235, 0.45),
                inset 0 3px 6px rgba(255, 255, 255, 0.35),
                inset 0 -3px 6px rgba(0, 0, 0, 0.15)
              `
            }}
          >
            <span style={{ textAlign: 'center', lineHeight: 1.1 }}>
              {item.title}
            </span>
          </button>
        </div>
      ))}

      {/* Main Red Button */}
      <button
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleToggle}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: isOpen
            ? 'linear-gradient(145deg, #EF4444 0%, #B91C1C 100%)'
            : 'linear-gradient(145deg, #DC2626 0%, #991B1B 100%)',
          color: 'white',
          border: '3px solid rgba(255, 255, 255, 0.85)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 'bold',
          position: 'relative',
          zIndex: 3,
          boxShadow: `
            0 12px 35px rgba(220, 38, 38, 0.55),
            inset 0 4px 8px rgba(255, 255, 255, 0.4),
            inset 0 -4px 8px rgba(0, 0, 0, 0.2)
          `,
          transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.3s',
          transform: isOpen ? 'rotate(135deg) scale(1.1)' : 'rotate(0deg) scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.target.style.boxShadow = `
              0 16px 45px rgba(220, 38, 38, 0.65),
              inset 0 4px 8px rgba(255, 255, 255, 0.5),
              inset 0 -4px 8px rgba(0, 0, 0, 0.2)
            `
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.target.style.boxShadow = `
              0 12px 35px rgba(220, 38, 38, 0.55),
              inset 0 4px 8px rgba(255, 255, 255, 0.4),
              inset 0 -4px 8px rgba(0, 0, 0, 0.2)
            `
          }
        }}
      >
        {isOpen ? '✕' : '✚'}
      </button>

      <style>{`
        @keyframes dropletPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.35;
          }
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )

  const backdropOverlay = isOpen && createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 9998,
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={() => setIsOpen(false)}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )

  return (
    <>
      {buttonContent}
      {backdropOverlay}
    </>
  )
}

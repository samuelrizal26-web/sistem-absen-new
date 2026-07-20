import { useState, useRef, useEffect } from 'react'

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

  // S Pen style menu positions (branching pattern)
  const menuItemsWithPositions = menuItems.map((item, index) => {
    const branchAngle = (index * 30 - 90) * (Math.PI / 180)
    const branchLength = 70 + (index * 15)
    return {
      ...item,
      x: Math.cos(branchAngle) * branchLength,
      y: Math.sin(branchAngle) * branchLength,
      angle: branchAngle
    }
  })

  return (
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
      {/* Backdrop Blur Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9998,
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Items with S Pen Branching Effect */}
      {isOpen && menuItemsWithPositions.map((item, index) => (
        <div key={item.id || index} style={{ position: 'absolute' }}>
          {/* Gel/Bubble Connecting Line */}
          <svg
            style={{
              position: 'absolute',
              left: 30,
              top: 30,
              width: Math.abs(item.x) + 30,
              height: Math.abs(item.y) + 30,
              pointerEvents: 'none',
              overflow: 'visible'
            }}
          >
            <defs>
              <linearGradient id={`gelGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'rgba(255, 255, 255, 0.9)', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: 'rgba(255, 255, 255, 0.7)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(255, 255, 255, 0.5)', stopOpacity: 1 }} />
              </linearGradient>
              <filter id={`bubble-${index}`}>
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feOffset in="blur" dx="2" dy="3" result="offsetBlur" />
                <feFlood floodColor="rgba(0, 0, 0, 0.2)" result="offsetColor" />
                <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                <feMerge>
                  <feMergeNode in="offsetBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={`M 30 30 Q ${30 + item.x * 0.5} ${30 + item.y * 0.5} ${30 + item.x} ${30 + item.y}`}
              stroke={`url(#gelGradient-${index})`}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              filter={`url(#bubble-${index})`}
              style={{
                animation: `drawLine 0.4s ease-out ${index * 0.1}s both`
              }}
            />
            {/* Bubble effect along the line */}
            <circle
              cx={30 + item.x * 0.3}
              cy={30 + item.y * 0.3}
              r="4"
              fill="rgba(255, 255, 255, 0.8)"
              filter={`url(#bubble-${index})`}
              style={{
                animation: `bubblePop 0.3s ease-out ${index * 0.1 + 0.2}s both`
              }}
            />
            <circle
              cx={30 + item.x * 0.6}
              cy={30 + item.y * 0.6}
              r="3"
              fill="rgba(255, 255, 255, 0.6)"
              filter={`url(#bubble-${index})`}
              style={{
                animation: `bubblePop 0.3s ease-out ${index * 0.1 + 0.3}s both`
              }}
            />
          </svg>

          {/* Action Button */}
          <button
            onClick={() => handleItemClick(item)}
            style={{
              position: 'absolute',
              left: 30 + item.x - 28,
              top: 30 + item.y - 28,
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold',
              boxShadow: `
                0 8px 20px rgba(59, 130, 246, 0.4),
                inset 0 2px 4px rgba(255, 255, 255, 0.3),
                inset 0 -2px 4px rgba(0, 0, 0, 0.1)
              `,
              animation: `scaleIn 0.4s ease-out ${index * 0.1}s both`,
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.15)'
              e.target.style.boxShadow = `
                0 12px 28px rgba(59, 130, 246, 0.5),
                inset 0 2px 4px rgba(255, 255, 255, 0.4),
                inset 0 -2px 4px rgba(0, 0, 0, 0.1)
              `
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = `
                0 8px 20px rgba(59, 130, 246, 0.4),
                inset 0 2px 4px rgba(255, 255, 255, 0.3),
                inset 0 -2px 4px rgba(0, 0, 0, 0.1)
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
            ? 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' 
            : 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
          color: 'white',
          border: '3px solid rgba(255, 255, 255, 0.8)',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 'bold',
          boxShadow: `
            0 10px 30px rgba(220, 38, 38, 0.5),
            inset 0 3px 6px rgba(255, 255, 255, 0.4),
            inset 0 -3px 6px rgba(0, 0, 0, 0.2)
          `,
          transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.3s',
          transform: isOpen ? 'rotate(135deg) scale(1.1)' : 'rotate(0deg) scale(1)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.target.style.boxShadow = `
              0 14px 40px rgba(220, 38, 38, 0.6),
              inset 0 3px 6px rgba(255, 255, 255, 0.5),
              inset 0 -3px 6px rgba(0, 0, 0, 0.2)
            `
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.target.style.boxShadow = `
              0 10px 30px rgba(220, 38, 38, 0.5),
              inset 0 3px 6px rgba(255, 255, 255, 0.4),
              inset 0 -3px 6px rgba(0, 0, 0, 0.2)
            `
          }
        }}
      >
        {isOpen ? '✕' : '✚'}
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drawLine {
          0% {
            strokeDasharray: '0, 1000';
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            strokeDasharray: '1000, 0';
            opacity: 1;
          }
        }
        @keyframes bubblePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
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
}

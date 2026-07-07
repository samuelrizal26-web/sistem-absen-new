import { useState, useRef, useEffect } from 'react'

export default function FloatingButton({ menuItems, onItemClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 200 })
  const [isDragging, setIsDragging] = useState(false)
  const buttonRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
    e.preventDefault()
  }

  // Handle drag move
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

  // Handle drag end
  const handleMouseUp = () => {
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

  // Add/remove event listeners for drag
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

  // Calculate menu item positions (circular)
  const menuRadius = 80
  const menuItemsWithPositions = menuItems.map((item, index) => {
    const angle = (index * 45 - 90) * (Math.PI / 180) // Start from top
    return {
      ...item,
      x: Math.cos(angle) * menuRadius,
      y: Math.sin(angle) * menuRadius
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
      {/* Menu Items */}
      {isOpen && menuItemsWithPositions.map((item, index) => (
        <button
          key={item.id || index}
          onClick={() => handleItemClick(item)}
          style={{
            position: 'absolute',
            left: 30 + item.x - 25,
            top: 30 + item.y - 25,
            width: 50,
            height: 50,
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: `fadeIn 0.2s ease-out ${index * 0.05}s both`,
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          <span style={{ textAlign: 'center', lineHeight: 1.2 }}>
            {item.title}
          </span>
        </button>
      ))}

      {/* Main Button */}
      <button
        onMouseDown={handleMouseDown}
        onClick={handleToggle}
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          backgroundColor: isOpen ? '#ef4444' : '#6366f1',
          color: 'white',
          border: 'none',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s, background-color 0.2s',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
      >
        {isOpen ? '✕' : '≡'}
      </button>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

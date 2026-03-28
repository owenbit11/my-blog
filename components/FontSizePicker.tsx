// components/FontSizePicker.tsx
'use client'
import { useState, useEffect } from 'react'

export default function FontSizePicker() {
  const [size, setSize] = useState('text-base')

  useEffect(() => {
    // 这里的逻辑确保能找到文章正文容器
    const article = document.querySelector('.prose')
    if (article) {
      article.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl')
      article.classList.add(size)
    }
  }, [size])

  return (
    <div className="flex gap-2 mt-4">
      {[
        { id: 'text-sm', label: '小' },
        { id: 'text-base', label: '中' },
        { id: 'text-lg', label: '大' }
      ].map((s) => (
        <button
          key={s.id}
          onClick={() => setSize(s.id)}
          className={`w-8 h-8 flex items-center justify-center border rounded transition-all text-xs font-bold ${
            size === s.id ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
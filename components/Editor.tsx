'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import Image from 'next/image'
import 'highlight.js/styles/github-dark.css'

export default function Editor({ name, defaultValue = '' }: { name: string, defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        // 将图片 Markdown 语法插入到当前内容末尾
        const imageMarkdown = `\n![${file.name}](${data.url})\n`
        setContent(prev => prev + imageMarkdown)
      }
    } catch (err) {
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded border shadow-sm"
        >
          {uploading ? '上传中...' : '插入图片'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUpload} 
          className="hidden" 
          accept="image/*" 
        />
        <span className="text-[10px] text-gray-400">支持 JPG/PNG/WebP</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 隐藏的 input 用于 Form 提交数据 */}
        <textarea
          name={name}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          className="w-full rounded border px-3 py-2 font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          placeholder="# 开始写作..."
          required
        />
        
        {/* 预览区 */}
        <div className="p-3 border rounded bg-white overflow-y-auto max-h-[400px] prose prose-sm max-w-none shadow-inner">
          <ReactMarkdown 
            rehypePlugins={[rehypeHighlight]}
            components={{
              img: ({ src, alt }) => {
                if (!src || typeof src !== 'string') return null
                return (
                  <span className="block my-4 relative w-full h-[250px]">
                    <Image 
                      src={src} 
                      alt={alt || ''} 
                      fill 
                      className="object-contain rounded-lg" 
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </span>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
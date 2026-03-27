'use client'

import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import Image from 'next/image'
import 'highlight.js/styles/github-dark.css'

interface EditorProps {
  name: string;
  defaultValue?: string;
}

export default function Editor({ name, defaultValue = '' }: EditorProps) {
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
      // 这里的 API 对应 app/api/upload/route.ts
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.url) {
        // 生成 Markdown 格式并追加到当前文本末尾
        const imgMarkdown = `\n![${file.name}](${data.url})\n`
        setContent(prev => prev + imgMarkdown)
      } else {
        throw new Error(data.error || '上传失败')
      }
    } catch (err) {
      alert('图片上传失败，请检查 Cloudinary 配置及网络。')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = '' 
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具条：上传按钮 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md border border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          {uploading ? '⌛ 上传中...' : '🖼️ 插入图片'}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUpload} 
          className="hidden" 
          accept="image/*" 
        />
        <span className="text-[11px] text-gray-400">存储至 Cloudinary (CDN)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        {/* 左侧：编辑区 */}
        <textarea
          name={name}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none bg-gray-50 shadow-sm"
          placeholder="支持 Markdown 语法，点击上方按钮插入图片..."
          required
        />
        
        {/* 右侧：预览区 */}
        <div className="h-full p-4 border border-gray-200 rounded-lg bg-white overflow-y-auto prose prose-sm max-w-none shadow-inner">
          <ReactMarkdown 
            rehypePlugins={[rehypeHighlight]}
            components={{
              img: ({ src, alt }) => {
                if (!src || typeof src !== 'string') return null
                return (
                  <span className="block my-6 relative w-full h-[300px]">
                    <Image 
                      src={src} 
                      alt={alt || 'Blog Image'} 
                      fill 
                      className="object-contain rounded-lg" 
                      sizes="(max-width: 768px) 100vw, 500px"
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
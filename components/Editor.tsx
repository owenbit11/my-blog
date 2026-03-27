'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

export default function Editor({ name, defaultValue = '' }: { name: string, defaultValue?: string }) {
  const [content, setContent] = useState(defaultValue)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <textarea
        name={name}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="w-full rounded border px-3 py-2 font-mono text-sm"
        placeholder="# 标题..."
        required
      />
      <div className="p-3 border rounded bg-gray-50 overflow-y-auto max-h-[300px] prose prose-sm max-w-none">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
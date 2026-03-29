'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function Pagination({ total, pageSize, currentPage }: { total: number, pageSize: number, currentPage: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totalPages = Math.ceil(total / pageSize)

  // 核心跳转逻辑：创建一个新的 URL 查询字符串并推送
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    // 使用 router.push 进行无刷新跳转
    router.push(`?${createQueryString('page', page.toString())}`)
  }

  if (total <= pageSize) return null // 如果只有一页，隐藏分页

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 my-12 py-6 border-t border-gray-100">
      <span className="hidden sm:inline">共 {total} 条</span>
      
      <div className="border rounded px-2 py-1 bg-white text-gray-400">
        {pageSize}条/页
      </div>

      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage <= 1} 
          className="p-2 hover:bg-gray-100 rounded disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
        >
          &lt;
        </button>
        
        {/* 页码数字 */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-9 h-9 rounded flex items-center justify-center transition-all ${
                currentPage === p 
                ? 'text-white bg-black font-bold' 
                : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 下一页 */}
        <button 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage >= totalPages} 
          className="p-2 hover:bg-gray-100 rounded disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
        >
          &gt;
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-400">前往</span>
        <input 
          type="number" 
          min={1}
          max={totalPages}
          className="w-12 border rounded text-center py-1 focus:outline-none focus:ring-1 focus:ring-black"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = Number((e.target as HTMLInputElement).value)
              if (val >= 1 && val <= totalPages) handlePageChange(val)
            }
          }}
          defaultValue={currentPage}
        />
        <span className="text-gray-400">页</span>
      </div>
    </div>
  )
}
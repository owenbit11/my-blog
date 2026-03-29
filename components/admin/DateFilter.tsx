'use client'

import React from 'react';
import { DatePicker } from '@douyinfe/semi-ui';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleRangeChange = (dateRange: any) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (dateRange && dateRange[0] && dateRange[1]) {
      // 转化为 YYYY-MM-DD 字符串格式
      const start = new Date(dateRange[0]).toLocaleDateString('en-CA'); 
      const end = new Date(dateRange[1]).toLocaleDateString('en-CA');
      params.set('startDate', start);
      params.set('endDate', end);
    } else {
      params.delete('startDate');
      params.delete('endDate');
    }
    
    params.set('page', '1'); // 筛选后回到第一页
    router.push(`?${params.toString()}`);
  };

  // 获取当前 URL 里的日期，让选择器显示已选中的值
  const defaultStart = searchParams.get('startDate');
  const defaultEnd = searchParams.get('endDate');
  const defaultValue = defaultStart && defaultEnd ? [defaultStart, defaultEnd] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-500 font-bold uppercase">按发布日期筛选</label>
      <DatePicker 
        type="dateRange" 
        density="compact" 
        style={{ width: 260 }} 
        value={defaultValue}
        onChange={handleRangeChange}
        placeholder={['开始日期', '结束日期']}
      />
    </div>
  );
}
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import { isAdminLoggedIn } from '@/lib/auth'; // 确保只有管理员能上传
import { Buffer } from 'buffer';

// 配置 Cloudinary (建议把这些变量填入 Vercel 的 Environment Variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  // 1. 安全检查
  if (!(await isAdminLoggedIn())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. 解析上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file found' }, { status: 400 });
    }

    // 3. 将文件转换为 Buffer 并上传至 Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用 Promise 封装 Cloudinary 的 upload_stream
    const uploadResponse: any = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'blog_uploads', // 在 Cloudinary 中创建的文件夹名
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    // 4. 返回 Cloudinary 的 HTTPS 链接
    return NextResponse.json({ 
      url: uploadResponse.secure_url, 
      success: true 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
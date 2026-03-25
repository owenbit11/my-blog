import { NextRequest, NextResponse } from "next/server";
import { getPostById, deletePostById } from "@/lib/posts";
import { logError } from "@/lib/logger";

// 定义上下文类型，注意 params 是 Promise
type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: Context
) {
  try {
    // 核心修复：必须 await params
    const { id } = await context.params;
    
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "文章未找到" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    logError("获取文章失败", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
) {
  try {
    // 核心修复：必须 await params
    const { id } = await context.params;

    await deletePostById(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    logError("删除文章失败", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
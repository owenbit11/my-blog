This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Windows 提示：** 若「localhost 拒绝连接」或页面打不开，请确认终端里 **`npm run dev` 已成功启动**（看到 `Ready` 后再访问）。也可直接双击项目里的 **`start-dev.bat`**，或改用 **`http://127.0.0.1:3000`** 打开。

**测试 API：** 浏览器打开 [http://127.0.0.1:3000/api/posts](http://127.0.0.1:3000/api/posts) 应看到 JSON 数组。若此处也打不开，说明开发服务器未在运行或端口不是 3000（请看终端里打印的地址）。

**生产模式：** 先执行 `npm run build`，再执行 `npm run start`（不要只运行 `start` 而不先 `build`）。

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

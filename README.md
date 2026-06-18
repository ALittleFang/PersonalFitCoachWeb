# Java FitAgent Web

独立前端项目，用于迁移 CarbonCycle-FitAgent 的 Next.js Web 应用。它不参与 Java/Spring Boot 的 Maven 构建，也不由后端托管静态资源。

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Shadcn/ui 风格组件

## Local Development

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3001
```

## API Boundary

前端通过环境变量配置后端地址：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

`src/lib/api.ts` 是唯一的后端适配层，负责：

- 调用 Java 后端 REST API
- 解析统一响应 `{ code, message, data, timestamp }`
- 在前端内部保留原页面使用的 snake_case 数据模型
- 对 Java 暂未提供的功能做前端降级，例如食物图片识别和 Agent action 执行

## Scripts

```bash
npm run lint
npm run build
npm run dev
```

## Deployment

该项目可以单独部署到任意支持 Node/Next.js 的平台。生产环境只需要配置 `NEXT_PUBLIC_API_BASE_URL` 指向后端 API 域名，并确保后端 CORS 允许该前端域名访问。

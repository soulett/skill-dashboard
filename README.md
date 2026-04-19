# Skill Dashboard

本项目是一个本地 AI 能力资产管理台，当前分支正在推进 Alpha 真实链路版本：

`扫描本地技能 -> 展示真实数据 -> 健康检查 -> 去完善 -> 保存 sidecar metadata`

## Run Locally

前置要求：

- Node.js 18+
- npm

### 1. 安装依赖

```bash
npm install
```

### 2. 启动本地 API

```bash
npm run server
```

默认监听：

`http://127.0.0.1:3210`

### 3. 启动前端开发服务

```bash
npm run dev
```

Vite 会默认尝试 `3000` 端口；如果被占用，会自动切换到下一个可用端口。

### 4. 打开应用

浏览器打开 Vite 输出的本地地址，例如：

`http://127.0.0.1:3000`

或端口冲突时：

`http://127.0.0.1:3011`

## 当前开发约定

- 开发期真实扫描目录：`skills-source/`
- sidecar metadata 路径：`skill-dashboard-data/metadata.json`
- 当前只支持扫描 `SKILL.md`
- 当前只保存 `description / category / tags / whenToUse`
- `/api` 请求通过 Vite 代理转发到本地 API

## 常用命令

```bash
npm run server
npm run dev
npm run lint
npm run build
```

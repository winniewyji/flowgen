# FlowGen 项目任务规划

> Manus-style 文件规划，用于组织和跟踪复杂任务进度

## 项目信息
- **仓库**: https://github.com/winniewyji/flowgen
- **技术栈**: Vue 3 + TypeScript (前端) | Express + TypeScript (后端)
- **核心功能**: AI 图表生成 (Mermaid)

---

## 当前阶段

**Phase 1: 基础功能完成** ✅
- 状态: completed
- 完成时间: 2026-05-03
- 内容: 图表生成核心功能

**Phase 2: Skills 集成** ✅
- 状态: completed  
- 完成时间: 2026-05-09
- 内容: 集成 cost-control, memory, smart-scheduler
- 文件: server/src/services/cost-control/, memory/, smart-scheduler/

**Phase 3: 效率工具集成** ✅
- 状态: completed
- 完成时间: 2026-05-09
- 内容: planning-with-files, superpowers-debugging

---

## 目标

### 短期目标
1. 配置 API Keys 并测试
2. 性能优化
3. 错误修复和调试工作流

### 中期目标
1. 添加更多图表类型支持
2. 实时协作功能
3. 用户认证系统

### 长期目标
1. 部署到生产环境
2. 移动端适配
3. 插件系统

---

## 待办事项

- [ ] 配置环境变量 (.env)
- [ ] 测试 MiniMax API 连通性
- [ ] 实现缓存预热策略
- [ ] 添加错误重试机制
- [ ] 优化首屏加载速度
- [ ] 添加单元测试

---

## 决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-05-09 | 集成 skills 而非自研 | 复用成熟方案，加速开发 |
| 2026-05-09 | 使用文件存储记忆 | 零外部依赖，易维护 |
| 2026-05-09 | MiniMax 作为默认模型 | 成本低，响应快 |

---

## 进行中的任务

<!-- 当前任务记录位置 -->

---

## 进度日志

### 2026-05-09
- ✅ 集成 8 个 skills 到 OpenClaw
- ✅ 创建 cost-control 模块 (token-optimizer, budget-tracker, smart-router)
- ✅ 创建 memory 模块 (self-improving, elite-longterm-memory)
- ✅ 创建 smart-scheduler 模块
- ✅ 新增 API: /api/cost/*, /api/memory/*
- ✅ 提交并推送 Git

### 2026-05-03
- ✅ 初始化 FlowGen 项目
- ✅ 完成图表生成核心功能

---

## 错误记录

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| TypeScript 编译错误 (接口未导出) | 1 | 添加 export 修饰符 |

---

## 研究发现

### Skill 集成方案
- 使用 skillhub 安装 skills
- skills 位于 ~/.openclaw/workspace/skills/
- FlowGen 通过 imports 引用 skills 功能

### Elite-longterm-memory 存储架构
- 无需外部数据库
- 使用 LanceDB (纯 JS 向量库)
- 6 层记忆: HOT RAM → WARM LanceDB → COLD Git-Notes → CURATED → CLOUD → AUTO-EXTRACT

---

*最后更新: 2026-05-09 11:30 GMT+8*
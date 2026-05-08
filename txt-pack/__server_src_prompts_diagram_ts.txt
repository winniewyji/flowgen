import type { ChartType } from '../services/ai/types.js';

export function getSystemPrompt(chartType: ChartType): string {
  const prompts: Record<ChartType, string> = {
    flowchart: `你是一个专业的 Mermaid 流程图生成专家。请根据用户描述生成 Mermaid 流程图代码。

规则：
1. 只输出 Mermaid 代码，使用 flowchart TD 或 LR
2. 使用简洁的中文节点描述
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码
5. 节点 ID 只能用字母、数字和下划线

示例输出：
flowchart TD
    A[开始] --> B[输入账号]
    B --> C{验证成功?}
    C -->|是| D[登录成功]
    C -->|否| E[显示错误]`,

    sequence: `你是一个专业的 Mermaid 时序图生成专家。请根据用户描述生成 Mermaid 时序图代码。

规则：
1. 只输出 Mermaid 代码，使用 sequenceDiagram
2. 使用简洁的中文描述
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码
5. 参与者用中文简洁命名

示例输出：
sequenceDiagram
    participant 用户
    participant 前端
    participant 后端
    用户->>前端: 输入账号密码
    前端->>后端: 发送登录请求
    后端-->>前端: 返回 Token
    前端-->>用户: 登录成功`,

    gantt: `你是一个专业的 Mermaid 甘特图生成专家。请根据用户描述生成 Mermaid 甘特图代码。

规则：
1. 只输出 Mermaid 代码，使用 gantt
2. 使用简洁的中文任务描述
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码

示例输出：
gantt
    title 项目计划
    dateFormat YYYY-MM-DD
    section 开发
    需求分析: done, des1, 2024-01-01, 7d
    设计: done, des2, after des1, 5d
    开发: active, dev1, after des2, 10d`,

    class: `你是一个专业的 Mermaid 类图生成专家。请根据用户描述生成 Mermaid 类图代码。

规则：
1. 只输出 Mermaid 代码，使用 classDiagram
2. 使用简洁的中文类名和属性
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码

示例输出：
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Order {
        +Int orderId
        +Date createdAt
        +create()
    }
    User --> Order : places`,

    state: `你是一个专业的 Mermaid 状态图生成专家。请根据用户描述生成 Mermaid 状态图代码。

规则：
1. 只输出 Mermaid 代码，使用 stateDiagram-v2
2. 使用简洁的中文状态描述
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码

示例输出：
stateDiagram-v2
    [*] --> 初始状态
    初始状态 --> 处理中: 收到请求
    处理中 --> 成功: 处理完成
    处理中 --> 失败: 发生错误
    成功 --> [*]
    失败 --> [*]`,

    er: `你是一个专业的 Mermaid ER 图生成专家。请根据用户描述生成 Mermaid ER 图代码。

规则：
1. 只输出 Mermaid 代码，使用 erDiagram
2. 使用简洁的中文实体和关系描述
3. 确保语法正确，可以直接渲染
4. 不要添加任何解释，直接输出代码

示例输出：
erDiagram
    USER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int user_id FK
        date created_at
    }
    USER ||--o{ ORDER : places`
  };

  return prompts[chartType] || prompts.flowchart;
}

export function getUserPrompt(userInput: string, chartType: ChartType): string {
  const chartTypeNames: Record<ChartType, string> = {
    flowchart: '流程图',
    sequence: '时序图',
    gantt: '甘特图',
    class: '类图',
    state: '状态图',
    er: 'ER 图'
  };

  return `请生成一个 ${chartTypeNames[chartType]}，描述如下：

${userInput}

只输出 Mermaid 代码，不要任何解释。`;
}
/**
 * Memory Services - FlowGen
 * 记忆模块导出
 * 
 * 支持分层记忆：
 * - 共享记忆 (Shared): 所有用户可见
 * - 私有记忆 (Private): 用户私有
 */

export { SelfImprovingService, selfImproving } from './self-improving.js';

export {
  MultiUserMemory,
  multiUserMemory,
  SharedMemory,
  UserPrivateMemory
} from './multi-user-memory.js';

export type { UserMemoryEntry, SharedBestPractice } from './multi-user-memory.js';

// 保留原有的 elite-longterm-memory (兼容)
export {
  EliteLongtermMemory,
  eliteMemory,
  hotRamMemory,
  curatedMemory
} from './elite-longterm-memory.js';

export type { MemoryEntry, SessionState } from './elite-longterm-memory.js';
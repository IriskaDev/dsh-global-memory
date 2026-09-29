/**
 * 本地 `cordis` 类型声明（环境补齐，非运行时实现）。
 *
 * ## 为什么需要它
 *
 * 本包把 `cordis` 声明为 peerDependency，源码里 `import type { Context } from 'cordis'`。
 * 但 DSH 实际提供的是 **vendored fork `@deepseek-ai/cordis`**（4.0.4），它并不往
 * `node_modules/cordis` 放东西；而公开 npm registry 上的 `cordis`（4.0.0-rc.x）导出面
 * 与之不同 —— 根入口不导出 `Context`。
 *
 * 结果：在 DSH 宿主之外（本仓库、CI）执行 `tsc` 会报
 * `TS2305: Module '"cordis"' has no exported member 'Context'`，
 * 使 `npm run typecheck`（husky pre-commit 门禁）恒失败。
 *
 * ## 边界
 *
 * 这里**只**声明本插件实际用到的 `Context` 成员，签名保持宽松；它不改变运行期行为
 * （源码里只有 `import type`，编译后会被完全擦除），仅用于让类型检查可离线通过。
 *
 * ## 后续
 *
 * 根治方向是把 import 改为运行期真实存在的那份类型（`@deepseek-ai/cordis`），
 * 或由上游把 fork 以 `cordis` 之名暴露。见模块档案 `session-migration` 的备注区。
 */
declare module 'cordis' {
  /** 插件 fiber；dispose 时自动执行注册的清理函数。 */
  export interface EffectScope {
    effect(callback: () => unknown, label?: string): () => void
  }

  /** 最小可用的事件与日志面。 */
  export interface Context extends EffectScope {
    readonly logger?: {
      info?(message: string): void
      warn?(message: string): void
      error?(message: string): void
    }
    /** 工具注册服务（由 `inject: ['tools']` 提供）。 */
    readonly tools: {
      register(definition: unknown): () => void
    }
    on(event: string, listener: (...args: never[]) => unknown): () => void
  }
}

# dsh-review-md-preview

DeepSeek Harness（DSH）评审页的 Markdown 预览插件：`.md` 文件的改动默认**以渲染后的样子对比**，工具栏一键切回源码对比。

## 功能

评审页，即 DSH 里查看每轮文件改动的页面：

- **Markdown 预览默认开** —— 打开 `.md` 文件直接看渲染结果，工具栏首按钮切回源码对比
- **渲染态双栏对比** —— 改前 / 改后两栏并排：删除红底、新增绿底、未变素色
- **行配对布局** —— 纯新增 / 纯删除时，缺的一侧用灰空档占位；两栏在同一个滚动容器里，滚动天然逐像素同步
- **布局可切换** —— 单栏（红旧绿新）与左右双栏，和原生源码对比共用同一个开关
- **行为兼容** —— 新建 / 删除文件的卡片与非 Markdown 文件的表现均与原生一致

验证口径一句话：22 个单元用例（分段算法的时间线形状）+ 真实桌面端会话内三轮实测（创建 / 编辑 / 纯新增）渲染正确。

## 兼容性

| DSH 版本 | 状态 |
|---|---|
| 0.2.0-rc.2 | 实测通过 |

⚠️ **宿主升级前先看这里**：浏览器端代码是官方 `0.2.0-rc.2` bundle 的修改副本（见「工作原理」），**冻结于该版本**。宿主升级 `@deepseek-ai/dsh-client-ui-deliverables` 后，本插件需要重新适配才能跟上——请等本插件发新版后再升级宿主。

## 安装

三条通道任选其一（`<name>` 换成你的 profile 名）：

```sh
# ① git（仓库提交的就是预构建 JS：git 安装不运行构建脚本，无需 pnpm 构建授权）
dsh plugin --profile <name> add github:moeform-re/dsh-review-md-preview
# 可锁版本：github:moeform-re/dsh-review-md-preview#v0.1.0

# ② tarball（在仓库目录内先打包）
pnpm pack
dsh plugin --profile <name> add ./dsh-review-md-preview-0.1.0.tgz

# ③ npm
dsh plugin --profile <name> add dsh-review-md-preview
```

装完重开一次 DSH 即生效。

## 卸载

```sh
dsh plugin --profile <name> remove dsh-review-md-preview
```

原生评审页自动恢复，无需其他清理。

## 工作原理

DSH 通过「组合包层叠」组装配置：每个插件的 `cordis.patch.yml` 是一层补丁，后应用的层可以按 `id` 覆盖前面层的行（官方 `dsh-web-app` 覆盖 `dsh-base` 的行用的就是同一机制）。

本插件三层各司其职：

1. `cordis.patch.yml` 按 `id` 禁用原生 `ui-deliverables` 行，插入本包的行；
2. 宿主半部 `host/ui-deliverables.mjs` 在运行时原样转发官方包的 `apply` / `inject`——评审页的服务端路由与提示段不变；
3. 浏览器半部 `lib/client.js` 是官方 `0.2.0-rc.2` bundle 的修改副本，预览 / 对比的全部改动都在这里。

为什么覆盖而不是走原生扩展点：评审页当前没有提供这类扩展点，按 `id` 覆盖行是官方文档明示的层叠玩法。

## 维护说明

- 宿主升级 `@deepseek-ai/dsh-client-ui-deliverables` 后，需要在新版 bundle 上重放修改：基准 = 上游 bundle + 本仓库 `lib/client.js` 相对它的 diff。修改点清单可向作者索取。
- 本地跑测试：`node tests/compare-segments-test.mjs`（22 用例，覆盖对比分段时间线的形状）。

## 许可证

MIT（见 [LICENSE](LICENSE)）。`lib/client.js` 包含对 DeepSeek Harness 官方 bundle 的修改副本，上游声明见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

## Changelog

- **0.1.0**（2026-10-02）：首发。评审页 Markdown 预览 / 源码切换、渲染态双栏对比（行配对 + 灰空档占位 + 单滚动容器）、单栏 / 左右布局切换。

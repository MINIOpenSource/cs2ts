# CS2 终端机模拟器

[![Deploy to GitHub Pages](https://github.com/MINIOpenSource/cs2ts/actions/workflows/deploy.yml/badge.svg)](https://github.com/MINIOpenSource/cs2ts/actions/workflows/deploy.yml)

一个基于 React 与 TypeScript 的 Counter-Strike 2 终端机模拟器。项目复刻创世终端机与毁灭之手终端机的开箱、报价和买断流程，并提供磨损定价、库存管理、炼金合同、价格计算与最优停时分析。

**在线体验：**

- GitHub Pages：<https://miniopensource.github.io/cs2ts/>
- Cloudflare：<https://cs2ts.pages.dev/> · <https://cs2.vmw.app/> · <https://cs2.miniopensource.com/>

GitHub Pages 使用仓库默认地址；上述 Cloudflare 入口由现有托管独立提供，不受 Pages 工作流影响。

## 功能

- **双终端机模拟**：支持封装的创世终端机与毁灭之手终端机，包含各自的收藏品池和稀有度权重。
- **报价与磨损系统**：按 7 节点分段线性磨损曲线计算皮肤价格，支持普通与 StatTrak™ 版本。
- **最优停时分析**：使用贝尔曼方程计算当前报价的继续期望价值与最优买断阈值。
- **库存与炼金合约**：管理已买断饰品，预览并执行多件饰品的炼金合同。
- **价格计算器**：手动选择皮肤、磨损和 StatTrak™ 状态，计算参考报价并加入库存。
- **钱包与历史记录**：模拟余额、充值、买断支出，并记录终端机与炼金操作历史。
- **本地持久化**：主题、钱包、库存、历史和终端机会话自动保存在浏览器 `localStorage` 中。
- **响应式界面**：基于 Fluent UI，适配桌面与移动端，并支持明暗主题。

## 技术栈

- React 18
- TypeScript
- Vite
- Fluent UI React Components
- GitHub Actions + GitHub Pages

## 本地开发

需要 Node.js 20 或更高版本。

```bash
npm ci
npm run dev
```

打开终端提示的本地地址即可访问。

### 可用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run typecheck` | 运行 TypeScript 静态类型检查 |
| `npm run build` | 类型检查并构建生产版本到 `dist/` |
| `npm run preview` | 本地预览生产构建 |

## 部署

推送到 `main` 分支后，[`deploy.yml`](.github/workflows/deploy.yml) 会自动执行类型检查、构建并部署到 GitHub Pages。也可以在 Actions 页面手动触发 `workflow_dispatch`。

首次部署时，工作流会尝试为仓库启用 GitHub Pages，并将发布源设置为 GitHub Actions。若组织策略禁止自动启用，请在仓库 **Settings → Pages → Build and deployment** 中将 **Source** 设为 **GitHub Actions**，然后重新运行工作流。

## 项目结构

```text
.
├── .github/workflows/deploy.yml   # GitHub Pages 构建与部署
├── reference/
│   └── engine.py                  # Python 参考实现（算法与定价模型对照）
├── src/
│   ├── components/                # 界面组件
│   ├── constants/                 # 稀有度、磨损与皮肤数据
│   ├── engine/                    # 引擎统一导出入口
│   ├── models/                    # Skin、Quote、Terminal 与随机数模型
│   ├── services/                  # 持久化、终端机工厂与炼金服务
│   ├── styles/                    # 应用样式
│   ├── types/                     # 共享类型定义
│   ├── App.tsx                    # 应用主状态与交互逻辑
│   └── main.tsx                   # 入口与主题 Provider
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

`reference/engine.py` 保留为 Python 版本的核心算法参考，不参与 Web 应用构建；浏览器端使用 `src/` 下的 TypeScript 实现。

## 数据说明

所有价格和概率均用于模拟与算法演示，数据为静态模型，不连接实时市场。清除站点数据会同时重置本地钱包与库存记录。

本项目为非官方粉丝项目，与 Valve Corporation 无关联。Counter-Strike 及相关名称、标识归 Valve Corporation 所有。

# 元宇宙数字展馆 (Metaverse Digital Gallery) —— 运行说明文档

本系统是一个集成了 **Three.js 三维渲染**、**Node.js 后端中转**以及**大语言模型（LLM）**的元宇宙应用原型。用户可以通过虚拟导览员的引领，在沉浸式展厅中浏览艺术品并获取 AI 实时生成的解说。

## 1. 核心技术栈

* **渲染引擎**：Three.js (r160)
* **后端框架**：Node.js + Express
* **AI 接口**：通义千问 (Qwen-plus) API
* **通信协议**：Fetch API + AbortController (处理异步竞态)
* **动画系统**：基于 `AnimationMixer` 的状态机平滑切换

## 2. 环境准备

在开始之前，请确保您的开发环境满足以下条件：

* **Node.js**：版本建议在 v16.x 及以上。
* **浏览器**：支持 WebGL 的现代浏览器（推荐 Chrome, Edge 或 Firefox）。
* **API Key**：获取阿里云 DashScope API 密钥。

## 3. 安装与部署步骤

### 步骤一：配置后端 API

1. 打开 `server.js` 文件。
2. 在 `makeApiRequest` 函数对应的 Authorization 请求头中，将 `Bearer ${API_KEY}` 替换为您真实的 API 密钥。

### 步骤二：安装依赖并启动后端

在项目根目录下打开终端，执行：

```bash
# 初始化环境（如尚未配置）
npm init -y
# 安装必要依赖
npm install express cors node-fetch
# 启动 API 中转服务器
node server.js

```

*注：服务器默认运行在 `http://localhost:3000`。*

### 步骤三：启动前端场景

由于使用了 ES Modules 和 3D 模型加载，必须在服务器环境下运行：

1. **VS Code 用户**：右键 `index.html` 选择 "Open with Live Server"。
2. **其他用户**：可使用 `python -m http.server 8000`。
3. 访问 `http://127.0.0.1:5500`（或对应端口）。

## 4. 关键交互说明

* **进入展馆**：点击欢迎页面的“进入展馆”按钮开启初始化加载。
* **导览操作**：点击左侧导航栏的展品名称（如“妲己”、“兰博基尼”），机器人导览员将自动行走至对应展位。
* **AI 解说**：机器人到达展位后，点击“开始讲解”按钮。系统将调用后端接口，生成约 150 字的专业外观分析并自动同步语音播报。
* **趣味互动**：直接点击 3D 场景中的机器人模型，可触发其随机动画状态（如 Jump）。

## 5. 第三方资源及许可 (License)

本项目严格遵守开源协议，相关资源来源如下：

* **机器人模型 (`RobotExpressive.glb`)**：源自 Three.js 官方 Examples (CC0)。
* **展品模型**：包含生化 Boss、车、犀牛、妲己等，均基于 **CC-BY 4.0** 许可从模型网、爱给网整合（报告中说明）。
**展品资源清单**(Asset List)
**根据 main.js 配置，系统加载了以下 3D 资产：**
展品 ID           对应文件名        缩放比例          备注
flower       Sunburst_Blossom.glb    1.0            向日葵
doraemon          doraemon.glb        2.0           哆啦A梦                                          laihama               laihama.gltf    0.2, 0.2, 0.3 瘌蛤蟆
indian              xiniu/indian.gltf 1.0           犀牛
boss                 boss/boss.glb     0.5        生化Boss
scene                lmodel/scene.gltf 0.45          车
daji                     daji.glb      2.0           妲己
apple                      apple.gltf   5.0           苹果
* **环境贴图**：使用 Poly Haven 提供的开源 HDR 贴图。

## 6. 开发者声明与伦理规范

* **AI 透明度**：系统所有讲解文本均由通义千问模型动态生成，并在界面标注“AI 生成”提示。
* **稳定性设计**：代码集成了 `AbortController` 机制。当用户在讲解中快速切换展品时，系统会自动中断前序 API 请求及语音流，确保逻辑一致。
* **隐私保护**：本原型不涉及用户敏感信息采集，相机视角限制在 `maxPolarAngle: 1.42` 以内，确保空间边界安全。

---

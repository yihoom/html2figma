# HTML to Figma Converter - Figma Plugin

一个专业的Figma插件，专注于将HTML文件转换为Figma设计元素，支持多种HTML标签、CSS样式和布局模型。

## ✨ 主要功能

### 📄 HTML文件转换
- **拖拽导入** - 直接将HTML文件拖拽到插件界面
- **文件选择** - 点击选择HTML文件进行导入
- **实时进度** - 显示解析和转换进度
- **智能解析** - 支持多种HTML标签和CSS样式

### 🎯 支持的HTML元素
- **文本元素** - `<h1>-<h6>`, `<p>`, `<span>` (自动设置字体大小和样式)
- **容器元素** - `<div>`, `<section>`, `<article>`, `<header>`, `<footer>` (转换为Frame)
- **按钮元素** - `<button>` (创建带样式的按钮组件)
- **输入元素** - `<input>`, `<textarea>` (创建输入框组件)
- **图片元素** - `<img>` (创建图片占位符)
- **列表元素** - `<ul>`, `<ol>`, `<li>` (创建列表布局)

### 🎨 CSS样式支持
- **颜色** - `color`, `background-color` (支持hex、rgb、hsl、命名颜色)
- **尺寸** - `width`, `height`, `padding`, `margin` (支持px、em、rem、vh、vw、pt单位)
- **字体** - `font-size`, `font-weight`, `font-family`, `line-height`, `text-align`
- **边框** - `border`, `border-radius`, `box-shadow`
- **布局** - `display: flex` (转换为Figma Auto Layout)

### 📐 布局转换
- **Flexbox支持** - `flex-direction`, `justify-content`, `align-items`, `gap`
- **响应式布局** - 自动调整容器大小
- **嵌套布局** - 支持复杂的嵌套结构
- **智能定位** - 自动优化元素位置和间距

## 🚀 安装和开发

### 环境要求

- Node.js (推荐 v16 或更高版本)
- npm 或 yarn
- Figma 桌面应用

### 开发设置

1. **克隆或下载项目**
   ```bash
   cd html2figma
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建插件**
   ```bash
   npm run build
   ```

4. **开发模式（监听文件变化）**
   ```bash
   npm run dev
   ```

5. **其他命令**
   ```bash
   npm run lint      # 代码检查
   npm run lint:fix  # 自动修复代码问题
   ```

### 在Figma中加载插件

1. 打开Figma桌面应用
2. 进入任意文件
3. 右键点击 → `Plugins` → `Development` → `Import plugin from manifest...`
4. 选择本项目中的 `manifest.json` 文件
5. 插件将出现在插件列表中

## 📖 使用指南

### 启动插件

1. 在Figma中右键点击 → `Plugins` → `HTML to Figma Converter`
2. 插件面板将在右侧打开

### HTML文件转换

1. **导入HTML文件**
   - 方法一：直接将HTML文件拖拽到"HTML文件导入"区域
   - 方法二：点击导入区域选择HTML文件

2. **等待转换完成**
   - 插件会显示解析进度
   - 转换完成后，元素会自动添加到画布并被选中

3. **查看和调整结果**
   - 检查转换后的Figma元素
   - 根据需要进行微调和优化

### HTML转换详细说明

#### 📄 支持的HTML示例

```html
<!-- 标题和段落 -->
<h1 style="color: #333; font-size: 32px;">主标题</h1>
<p style="color: #666; font-size: 16px;">段落文本</p>

<!-- 按钮 -->
<button style="background-color: #007AFF; color: white; padding: 12px 24px; border-radius: 8px;">
  点击按钮
</button>

<!-- 容器和布局 -->
<div style="display: flex; gap: 16px; padding: 20px;">
  <div style="background-color: white; padding: 16px; border-radius: 8px;">
    <h3>卡片标题</h3>
    <p>卡片内容</p>
  </div>
</div>

<!-- 输入框 -->
<input type="text" placeholder="请输入内容" style="width: 300px; padding: 12px;">
<textarea placeholder="多行文本" style="width: 300px; height: 80px;"></textarea>

<!-- 列表 -->
<ul>
  <li>列表项目 1</li>
  <li>列表项目 2</li>
</ul>
```

#### 🎨 CSS样式映射

| CSS属性 | Figma属性 | 说明 |
|---------|-----------|------|
| `width`, `height` | Frame尺寸 | 支持px、em、rem单位 |
| `background-color` | Fill颜色 | 支持hex、rgb、命名颜色 |
| `color` | 文本颜色 | 应用于文本元素 |
| `font-size` | 字体大小 | 自动转换单位 |
| `font-weight` | 字体样式 | 映射到Inter字体样式 |
| `border-radius` | 圆角 | 应用于Frame |
| `padding` | 内边距 | 应用于Frame |
| `display: flex` | Auto Layout | 启用自动布局 |
| `flex-direction` | 布局方向 | 水平/垂直 |
| `justify-content` | 主轴对齐 | 开始/居中/结束/分散 |
| `align-items` | 交叉轴对齐 | 开始/居中/结束 |
| `gap` | 元素间距 | Auto Layout间距 |



## 🛠️ 开发命令

```bash
# 构建项目
npm run build

# 监听文件变化并自动构建
npm run watch

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix
```

## 📁 项目结构

```
html2figma/
├── 📁 src/                      # 源代码目录
│   ├── main.ts                  # 主入口文件
│   ├── types/
│   │   └── index.ts             # 类型定义
│   └── modules/
│       ├── html-parser.ts       # HTML解析模块
│       ├── style-processor.ts   # 样式处理模块
│       └── node-factory.ts      # Figma节点创建模块
├── 📄 code.js                   # 构建输出（Figma读取）
├── 📄 ui.html                   # 插件用户界面
├── 📄 manifest.json             # 插件配置文件
├── 📄 webpack.config.js         # 构建配置
├── 📄 tsconfig.json             # TypeScript配置
├── 📄 package.json              # 项目依赖配置
├── 📄 complex-test.html         # 复杂布局测试文件
├── 📄 HTML_CONVERSION_GUIDE.md  # HTML转换优化指南
└── 📄 README.md                 # 项目说明文档
```

## 🎯 技术特点

### 🏗️ 模块化架构
- **清晰的职责分离**: HTML解析、样式处理、节点创建各司其职
- **易于维护**: 模块化设计便于代码维护和功能扩展
- **类型安全**: 完整的TypeScript类型定义和接口约束
- **构建优化**: 使用Webpack打包，支持开发和生产模式

### 🔍 强大的解析能力
- **无依赖HTML解析**: 使用正则表达式实现轻量级HTML解析
- **智能样式映射**: CSS样式到Figma属性的智能转换
- **增强的CSS支持**: 外部样式表、选择器优先级、多种颜色格式
- **布局转换**: Flexbox到Auto Layout的智能转换

### 💡 用户体验
- **实时进度提示**: 详细的解析和转换进度反馈
- **完善错误处理**: 友好的错误提示和恢复机制
- **专注性**: 专门针对HTML到Figma转换优化
- **易用性**: 简洁直观的拖拽操作界面

## 📝 示例文件

项目包含一个 `test.html` 文件，展示了插件支持的各种HTML元素和CSS样式：

- 标题和段落文本
- 带样式的按钮
- Flexbox布局容器
- 输入框和文本域
- 图片占位符
- 信息提示卡片

你可以使用这个文件来测试插件的HTML转换功能。

## 🤝 贡献

欢迎提交问题报告和功能建议！如果您想贡献代码：

1. Fork 这个项目
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

这个项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如果您遇到任何问题或需要帮助，请：

1. 查看 [Figma 插件开发文档](https://www.figma.com/plugin-docs/)
2. 提交 Issue 到这个项目
3. 参考项目中的代码注释

---

**享受使用这个插件来加速您的设计工作流程！** 🚀

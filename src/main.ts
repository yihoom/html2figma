import { PluginMessage, HtmlParseResult, ParsedElement } from './types';
import { HtmlParser } from './modules/html-parser';
import { NodeFactory } from './modules/node-factory';
import { AIAnalyzer } from './modules/ai-analyzer';
import { LayoutOptimizer } from './modules/layout-optimizer';
import { AIAnalysisConfig, UserPreferences } from './types/ai-types';

// 创建模块实例
const htmlParser = new HtmlParser();
const nodeFactory = new NodeFactory();

// AI配置 - 可以通过UI设置或环境变量配置
const aiConfig: AIAnalysisConfig = {
  model: 'local', // 默认使用本地规则引擎，避免API依赖
  maxTokens: 2000,
  temperature: 0.3,
  enableCache: true,
  fallbackToRules: true
};

const aiAnalyzer = new AIAnalyzer(aiConfig);
const layoutOptimizer = new LayoutOptimizer();

// 显示UI界面
console.log('HTML to Figma Converter plugin loaded');
figma.showUI(__html__, { 
  width: 320, 
  height: 600,
  themeColors: true 
});

// 监听来自UI的消息
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'parse-html') {
    try {
      // 更新AI配置
      if (msg.aiSettings) {
        updateAIConfig(msg.aiSettings);
      }

      figma.ui.postMessage({ type: 'html-parse-progress', message: '开始解析HTML...' });
      const result = await parseHtml(msg.htmlContent, msg.aiSettings);
      if (result.success) {
        figma.ui.postMessage({ type: 'html-parse-complete' });
        figma.notify('HTML解析完成');
      } else {
        figma.ui.postMessage({ type: 'html-parse-error', error: result.error });
        figma.notify('HTML解析失败: ' + result.error, { error: true });
      }
    } catch (error) {
      console.error('HTML解析错误:', error);
      figma.ui.postMessage({ type: 'html-parse-error', error: String(error) });
      figma.notify('HTML解析出错', { error: true });
    }
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// 更新AI配置
function updateAIConfig(settings: any): void {
  if (settings.enabled && settings.apiKey && settings.model !== 'local') {
    aiConfig.apiKey = settings.apiKey;
    aiConfig.model = settings.model as any;
  } else {
    aiConfig.model = 'local';
    aiConfig.apiKey = undefined;
  }
}

// HTML解析主函数
async function parseHtml(htmlContent: string, aiSettings?: any): Promise<HtmlParseResult> {
  try {
    figma.ui.postMessage({ type: 'html-parse-progress', message: '开始解析HTML文档...' });
    
    // 验证HTML内容
    if (!htmlContent || htmlContent.trim().length === 0) {
      return { elements: [], success: false, error: 'HTML内容为空' };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: '解析HTML结构...' });

    // 检查htmlParser是否正确初始化
    if (!htmlParser || typeof htmlParser.parseHtmlString !== 'function') {
      return { elements: [], success: false, error: 'HTML解析器初始化失败' };
    }

    // 使用HTML解析器解析HTML
    let elements;
    try {
      elements = htmlParser.parseHtmlString(htmlContent);
    } catch (error) {
      console.error('HTML解析失败:', error);
      return { elements: [], success: false, error: `HTML解析失败: ${error}` };
    }

    if (!elements || elements.length === 0) {
      return { elements: [], success: false, error: '未找到有效的HTML元素，请检查HTML格式' };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: '转换为Figma元素...' });

    // 转换为ParsedElement格式
    const cssStyles = htmlParser.extractCssStyles(htmlContent);

    // 安全地调用convertToParseElement方法
    const parsedElements: ParsedElement[] = [];
    for (const element of elements) {
      try {
        const parsedElement = htmlParser.convertToParseElement(element, cssStyles);
        parsedElements.push(parsedElement);
      } catch (error) {
        console.error('转换元素时出错:', error, element);
        // 创建一个基础的ParsedElement作为后备
        parsedElements.push({
          tagName: element.tagName,
          textContent: element.textContent,
          attributes: element.attributes,
          styles: {},
          children: []
        });
      }
    }

    // 根据用户设置决定是否使用AI分析
    let designAnalysis;
    try {
      if (aiSettings?.enabled) {
        figma.ui.postMessage({ type: 'html-parse-progress', message: 'AI分析设计模式...' });

        // 构建用户偏好
        const userPreferences: UserPreferences = {
          componentStyle: aiSettings.designPreference === 'auto' ? undefined : aiSettings.designPreference,
          targetPlatform: 'web'
        };

        // 使用AI分析设计模式和布局
        designAnalysis = await aiAnalyzer.analyzeHTML(htmlContent, parsedElements, userPreferences);
      } else {
        figma.ui.postMessage({ type: 'html-parse-progress', message: '使用规则引擎分析...' });

        // 使用本地规则引擎
        designAnalysis = await aiAnalyzer.analyzeHTML(htmlContent, parsedElements);
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      figma.ui.postMessage({ type: 'html-parse-progress', message: '分析失败，使用默认设置...' });

      // 创建默认的设计分析
      designAnalysis = {
        layoutType: 'article' as const,
        confidence: 0.5,
        visualHierarchy: {
          primary: [],
          secondary: [],
          accent: [],
          background: []
        },
        designPatterns: {
          spacing: {
            type: 'normal' as const,
            baseUnit: 16,
            scale: [8, 16, 24, 32, 48, 64]
          },
          alignment: 'left' as const,
          grouping: []
        },
        colorScheme: {
          primary: '#007AFF',
          secondary: '#5856D6',
          accent: '#FF9500',
          background: '#FFFFFF',
          text: {
            primary: '#1C1C1E',
            secondary: '#3A3A3C',
            muted: '#8E8E93'
          },
          semantic: {
            success: '#34C759',
            warning: '#FF9500',
            error: '#FF3B30',
            info: '#007AFF'
          }
        },
        typography: {
          headingScale: {
            h1: 48, h2: 36, h3: 28, h4: 24, h5: 20, h6: 18
          },
          bodySize: 16,
          lineHeight: { tight: 1.2, normal: 1.5, loose: 1.8 },
          fontWeights: { light: 300, normal: 400, medium: 500, bold: 700 }
        },
        responsive: {
          breakpoints: { mobile: 768, tablet: 1024, desktop: 1200 },
          strategy: 'mobile-first' as const
        }
      };
    }

    figma.ui.postMessage({
      type: 'html-parse-progress',
      message: `识别为${designAnalysis.layoutType}布局，置信度${Math.round(designAnalysis.confidence * 100)}%`
    });

    // 优化布局
    let optimizedLayout;
    try {
      optimizedLayout = layoutOptimizer.optimizeLayout(parsedElements, designAnalysis);
    } catch (error) {
      console.error('布局优化失败:', error);
      figma.ui.postMessage({ type: 'html-parse-progress', message: '布局优化失败，使用默认布局...' });

      // 创建默认的优化布局
      optimizedLayout = {
        spacing: {
          baseUnit: 16,
          scale: [8, 16, 24, 32, 48, 64],
          vertical: { section: 96, component: 48, element: 24 },
          horizontal: { container: 64, component: 32, element: 16 }
        },
        groups: [],
        responsive: {
          strategy: 'mobile-first' as const,
          breakpoints: {
            mobile: { width: 768, layout: 'stack' as const, spacing: 16, typography: { scale: 0.875, lineHeight: 1.5 } },
            tablet: { width: 1024, layout: 'flex' as const, columns: 2, spacing: 24, typography: { scale: 0.9375, lineHeight: 1.5 } },
            desktop: { width: 1200, layout: 'grid' as const, columns: 3, spacing: 32, typography: { scale: 1, lineHeight: 1.6 } }
          }
        },
        components: [],
        improvements: []
      };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: `正在创建 ${parsedElements.length} 个元素...` });

    // 使用AI优化的布局创建Figma节点
    const nodes: SceneNode[] = [];
    let createdCount = 0;

    // 显示AI分析结果
    if (optimizedLayout.improvements.length > 0) {
      figma.ui.postMessage({
        type: 'html-parse-progress',
        message: `发现 ${optimizedLayout.improvements.length} 个优化建议`
      });
    }

    // 显示识别的组件
    if (optimizedLayout.components.length > 0) {
      figma.ui.postMessage({
        type: 'html-parse-progress',
        message: `识别出 ${optimizedLayout.components.length} 个可复用组件`
      });
    }

    // 创建节点时应用AI优化
    for (const element of parsedElements) {
      try {
        const node = await nodeFactory.createFigmaNodeFromElement(element);
        if (node) {
          // 应用AI建议的间距和布局优化
          applyAIOptimizations(node, element, optimizedLayout, designAnalysis);

          nodes.push(node);
          createdCount++;

          // 更新进度
          if (createdCount % 5 === 0 || createdCount === parsedElements.length) {
            figma.ui.postMessage({
              type: 'html-parse-progress',
              message: `已创建 ${createdCount}/${parsedElements.length} 个元素...`
            });
          }
        }
      } catch (nodeError) {
        console.warn(`创建元素 ${element.tagName} 时出错:`, nodeError);
        // 继续处理其他元素
      }
    }
    
    if (nodes.length === 0) {
      return { elements: parsedElements, success: false, error: '无法创建任何Figma元素，请检查HTML内容' };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: '添加到画布...' });
    
    // 添加节点到当前页面
    nodes.forEach(node => figma.currentPage.appendChild(node));
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
    
    const successMessage = `成功创建 ${nodes.length} 个元素`;
    figma.ui.postMessage({ type: 'html-parse-progress', message: successMessage });
    
    return { elements: parsedElements, success: true };
  } catch (error) {
    console.error('HTML解析错误:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { elements: [], success: false, error: `解析失败: ${errorMessage}` };
  }
}

// AI优化应用函数
function applyAIOptimizations(
  node: SceneNode,
  element: any,
  optimizedLayout: any,
  designAnalysis: any
): void {
  try {
    // 应用智能间距
    if (node.type === 'FRAME') {
      const frame = node as FrameNode;
      const spacing = optimizedLayout.spacing;

      // 应用AI建议的间距系统
      if (spacing && spacing.baseUnit) {
        // 根据元素类型应用不同的间距
        if (element.tagName.match(/^h[1-6]$/)) {
          // 标题元素使用更大的间距
          frame.paddingTop = spacing.vertical.component;
          frame.paddingBottom = spacing.vertical.element;
        } else if (element.tagName === 'section' || element.tagName === 'div') {
          // 容器元素使用标准间距
          frame.paddingTop = spacing.vertical.section;
          frame.paddingBottom = spacing.vertical.section;
          frame.paddingLeft = spacing.horizontal.container;
          frame.paddingRight = spacing.horizontal.container;
        }
      }

      // 应用AI建议的布局模式
      const matchingGroup = optimizedLayout.groups.find((group: any) =>
        group.elements.some((el: any) => el.tagName === element.tagName)
      );

      if (matchingGroup) {
        // 应用Auto Layout设置
        if (matchingGroup.layout === 'flex') {
          frame.layoutMode = matchingGroup.direction === 'row' ? 'HORIZONTAL' : 'VERTICAL';
          frame.itemSpacing = matchingGroup.gap;

          // 应用对齐设置
          switch (matchingGroup.alignment.main) {
            case 'center':
              frame.primaryAxisAlignItems = 'CENTER';
              break;
            case 'end':
              frame.primaryAxisAlignItems = 'MAX';
              break;
            case 'space-between':
              frame.primaryAxisAlignItems = 'SPACE_BETWEEN';
              break;
            default:
              frame.primaryAxisAlignItems = 'MIN';
          }

          switch (matchingGroup.alignment.cross) {
            case 'center':
              frame.counterAxisAlignItems = 'CENTER';
              break;
            case 'end':
              frame.counterAxisAlignItems = 'MAX';
              break;
            case 'stretch':
              frame.counterAxisAlignItems = 'MIN'; // Figma doesn't have STRETCH
              break;
            default:
              frame.counterAxisAlignItems = 'MIN';
          }
        }
      }
    }

    // 应用AI建议的颜色优化
    if (designAnalysis.colorScheme) {
      const colors = designAnalysis.colorScheme;

      // 根据视觉层次应用颜色
      const isPrimary = designAnalysis.visualHierarchy.primary.some((ref: any) =>
        ref.tagName === element.tagName && ref.textContent === element.textContent
      );

      const isSecondary = designAnalysis.visualHierarchy.secondary.some((ref: any) =>
        ref.tagName === element.tagName && ref.textContent === element.textContent
      );

      if (node.type === 'TEXT') {
        const textNode = node as TextNode;
        if (isPrimary) {
          // 主要文本使用主色调
          textNode.fills = [{ type: 'SOLID', color: hexToRgb(colors.text.primary) }];
        } else if (isSecondary) {
          // 次要文本使用次要色调
          textNode.fills = [{ type: 'SOLID', color: hexToRgb(colors.text.secondary) }];
        }
      }
    }

    // 应用AI建议的字体优化
    if (node.type === 'TEXT' && designAnalysis.typography) {
      const textNode = node as TextNode;
      const typography = designAnalysis.typography;

      // 根据标签类型应用字体大小
      if (element.tagName.match(/^h[1-6]$/)) {
        const level = element.tagName as keyof typeof typography.headingScale;
        textNode.fontSize = typography.headingScale[level];
      } else if (element.tagName === 'p' || element.tagName === 'span') {
        textNode.fontSize = typography.bodySize;
      }

      // 应用行高
      textNode.lineHeight = { value: typography.lineHeight.normal * 100, unit: 'PERCENT' };
    }

  } catch (error) {
    console.warn('应用AI优化时出错:', error);
    // 不影响主流程，继续执行
  }
}

// 辅助函数：将hex颜色转换为RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

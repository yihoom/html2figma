import { PluginMessage, HtmlParseResult } from './types';
import { HtmlParser } from './modules/html-parser';
import { NodeFactory } from './modules/node-factory';

// 创建模块实例
const htmlParser = new HtmlParser();
const nodeFactory = new NodeFactory();

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
      figma.ui.postMessage({ type: 'html-parse-progress', message: '开始解析HTML...' });
      const result = await parseHtml(msg.htmlContent);
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

// HTML解析主函数
async function parseHtml(htmlContent: string): Promise<HtmlParseResult> {
  try {
    figma.ui.postMessage({ type: 'html-parse-progress', message: '开始解析HTML文档...' });
    
    // 验证HTML内容
    if (!htmlContent || htmlContent.trim().length === 0) {
      return { elements: [], success: false, error: 'HTML内容为空' };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: '解析HTML结构...' });
    
    // 使用HTML解析器解析HTML
    const elements = htmlParser.parseHtmlString(htmlContent);
    
    if (elements.length === 0) {
      return { elements: [], success: false, error: '未找到有效的HTML元素，请检查HTML格式' };
    }
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: '转换为Figma元素...' });
    
    // 转换为ParsedElement格式
    const cssStyles = htmlParser.extractCssStyles(htmlContent);
    const parsedElements = elements.map(el => htmlParser.convertToParseElement(el, cssStyles));
    
    figma.ui.postMessage({ type: 'html-parse-progress', message: `正在创建 ${parsedElements.length} 个元素...` });
    
    // 使用节点工厂创建Figma节点
    const nodes: SceneNode[] = [];
    let createdCount = 0;
    
    for (const element of parsedElements) {
      try {
        const node = await nodeFactory.createFigmaNodeFromElement(element);
        if (node) {
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

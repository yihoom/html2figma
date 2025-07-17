import { 
  DesignAnalysis, 
  ElementReference, 
  AIAnalysisConfig, 
  UserPreferences,
  GroupingPattern,
  ComponentSuggestion 
} from '../types/ai-types';
import { ParsedElement } from '../types';

export class AIAnalyzer {
  private config: AIAnalysisConfig;
  private cache: Map<string, DesignAnalysis> = new Map();

  constructor(config: AIAnalysisConfig) {
    this.config = config;
  }

  async analyzeHTML(
    htmlContent: string, 
    elements: ParsedElement[], 
    userPreferences?: UserPreferences
  ): Promise<DesignAnalysis> {
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(htmlContent, userPreferences);
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      let analysis: DesignAnalysis;
      
      if (this.config.model === 'local' || !this.config.apiKey) {
        // 使用本地规则引擎
        analysis = await this.analyzeWithRules(htmlContent, elements, userPreferences);
      } else {
        // 使用AI API
        analysis = await this.analyzeWithAI(htmlContent, elements, userPreferences);
      }

      // 缓存结果
      if (this.config.enableCache) {
        this.cache.set(cacheKey, analysis);
      }

      return analysis;
    } catch (error) {
      console.warn('AI分析失败，回退到规则引擎:', error);
      
      if (this.config.fallbackToRules) {
        return this.analyzeWithRules(htmlContent, elements, userPreferences);
      }
      
      throw error;
    }
  }

  private async analyzeWithAI(
    htmlContent: string, 
    elements: ParsedElement[], 
    userPreferences?: UserPreferences
  ): Promise<DesignAnalysis> {
    
    const structure = this.extractStructure(htmlContent, elements);
    const prompt = this.buildAnalysisPrompt(structure, userPreferences);
    
    const response = await this.callAIAPI(prompt);
    return await this.parseAIResponse(response, elements);
  }

  private async analyzeWithRules(
    _htmlContent: string,
    elements: ParsedElement[],
    _userPreferences?: UserPreferences
  ): Promise<DesignAnalysis> {
    
    // 基于规则的分析，作为AI的备选方案
    const layoutType = this.detectLayoutType(elements);
    const visualHierarchy = this.analyzeVisualHierarchy(elements);
    const designPatterns = this.detectDesignPatterns(elements);
    const colorScheme = this.extractColorScheme(elements);
    const typography = this.analyzeTypography(elements);
    
    return {
      layoutType,
      confidence: 0.7, // 规则引擎的置信度较低
      visualHierarchy,
      designPatterns,
      colorScheme,
      typography,
      responsive: this.detectResponsiveStrategy(elements)
    };
  }

  private extractStructure(_htmlContent: string, elements: ParsedElement[]): any {
    return {
      elementCount: elements.length,
      structure: this.buildElementTree(elements),
      styles: this.extractUniqueStyles(elements),
      content: this.extractTextContent(elements),
      images: this.extractImageInfo(elements),
      forms: this.extractFormInfo(elements),
      navigation: this.extractNavigationInfo(elements)
    };
  }

  private buildAnalysisPrompt(structure: any, userPreferences?: UserPreferences): string {
    const preferencesText = userPreferences ? 
      `用户偏好：${JSON.stringify(userPreferences, null, 2)}` : '';

    return `
你是一个专业的UI/UX设计师和前端开发专家。请分析以下HTML结构，并提供详细的设计分析。

HTML结构信息：
${JSON.stringify(structure, null, 2)}

${preferencesText}

请分析以下方面并以JSON格式返回：

1. **布局类型识别**：
   - 这是什么类型的页面/组件？(landing-page, dashboard, form, card-grid, article, navigation, hero-section)
   - 置信度如何？(0-1)

2. **视觉层次分析**：
   - 主要元素：最重要的内容（标题、CTA按钮等）
   - 次要元素：支撑内容（副标题、描述文本等）
   - 强调元素：需要突出的内容（图标、徽章、特殊按钮等）
   - 背景元素：装饰性内容

3. **设计模式识别**：
   - 间距系统：tight/normal/loose，基础单位和比例
   - 对齐方式：left/center/right/justified/mixed
   - 分组关系：哪些元素应该组合在一起，使用什么布局

4. **颜色方案提取**：
   - 主色、辅色、强调色
   - 文本颜色层次
   - 语义化颜色（成功、警告、错误、信息）

5. **字体系统分析**：
   - 标题层次和大小
   - 正文大小和行高
   - 字重使用

6. **响应式策略**：
   - 断点建议
   - 移动端优先还是桌面端优先

7. **组件识别**：
   - 可以抽象为组件的部分
   - 组件的变体和属性

请确保返回的JSON格式严格符合DesignAnalysis接口定义。
`;
  }

  private async callAIAPI(prompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('AI API密钥未配置');
    }

    // 这里实现具体的AI API调用
    // 支持OpenAI、Claude等不同的API
    switch (this.config.model) {
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        return this.callOpenAI(prompt);
      case 'claude-3':
        return this.callClaude(prompt);
      default:
        throw new Error(`不支持的AI模型: ${this.config.model}`);
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的UI/UX设计师，专门分析HTML结构并提供设计建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API错误: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }

  private async callClaude(prompt: string): Promise<string> {
    // Claude API调用实现
    throw new Error('Claude API集成待实现');
  }

  private async parseAIResponse(response: string, elements: ParsedElement[]): Promise<DesignAnalysis> {
    try {
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI响应中未找到有效的JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证和补充数据
      return this.validateAndEnhanceAnalysis(parsed, elements);
    } catch (error) {
      console.error('解析AI响应失败:', error);
      // 回退到规则引擎
      return await this.analyzeWithRules('', elements);
    }
  }

  private validateAndEnhanceAnalysis(
    analysis: Partial<DesignAnalysis>, 
    elements: ParsedElement[]
  ): DesignAnalysis {
    // 确保所有必需字段都存在，并提供合理的默认值
    return {
      layoutType: analysis.layoutType || 'article',
      confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
      visualHierarchy: analysis.visualHierarchy || this.analyzeVisualHierarchy(elements),
      designPatterns: analysis.designPatterns || this.detectDesignPatterns(elements),
      colorScheme: analysis.colorScheme || this.extractColorScheme(elements),
      typography: analysis.typography || this.analyzeTypography(elements),
      responsive: analysis.responsive || this.detectResponsiveStrategy(elements)
    };
  }

  // 规则引擎的具体实现方法
  private detectLayoutType(elements: ParsedElement[]): DesignAnalysis['layoutType'] {
    const hasForm = elements.some(el => ['form', 'input', 'textarea', 'select'].includes(el.tagName));
    const hasNavigation = elements.some(el => ['nav', 'header'].includes(el.tagName) || 
      el.attributes.class?.includes('nav'));
    const hasCards = elements.filter(el => 
      el.attributes.class?.includes('card') || 
      (el.tagName === 'div' && el.children.length > 2)
    ).length > 3;
    
    if (hasForm) return 'form';
    if (hasNavigation) return 'navigation';
    if (hasCards) return 'card-grid';
    
    const headings = elements.filter(el => el.tagName.match(/^h[1-6]$/));
    if (headings.length === 1 && headings[0].tagName === 'h1') {
      return 'hero-section';
    }
    
    return 'article';
  }

  private analyzeVisualHierarchy(elements: ParsedElement[]): DesignAnalysis['visualHierarchy'] {
    const primary: ElementReference[] = [];
    const secondary: ElementReference[] = [];
    const accent: ElementReference[] = [];
    const background: ElementReference[] = [];

    elements.forEach((element, index) => {
      const ref: ElementReference = {
        selector: this.generateSelector(element, index),
        tagName: element.tagName,
        className: element.attributes.class,
        id: element.attributes.id,
        textContent: element.textContent,
        importance: this.calculateImportance(element)
      };

      if (element.tagName === 'h1' || element.attributes.class?.includes('hero')) {
        primary.push(ref);
      } else if (element.tagName.match(/^h[2-3]$/) || element.tagName === 'button') {
        secondary.push(ref);
      } else if (element.tagName.match(/^h[4-6]$/) || element.attributes.class?.includes('badge')) {
        accent.push(ref);
      } else {
        background.push(ref);
      }
    });

    return { primary, secondary, accent, background };
  }

  private detectDesignPatterns(elements: ParsedElement[]): DesignAnalysis['designPatterns'] {
    // 分析间距模式
    const spacingAnalysis = this.analyzeSpacing(elements);
    
    // 分析对齐方式
    const alignmentAnalysis = this.analyzeAlignment(elements);
    
    // 分析分组模式
    const groupingAnalysis = this.analyzeGrouping(elements);

    return {
      spacing: spacingAnalysis,
      alignment: alignmentAnalysis,
      grouping: groupingAnalysis
    };
  }

  private analyzeSpacing(elements: ParsedElement[]): DesignAnalysis['designPatterns']['spacing'] {
    // 简化的间距分析
    const margins = elements.map(el => this.extractSpacing(el.styles.margin || '0'));
    const paddings = elements.map(el => this.extractSpacing(el.styles.padding || '0'));
    
    const allSpacings = [...margins, ...paddings].filter(s => s > 0);
    const avgSpacing = allSpacings.reduce((a, b) => a + b, 0) / allSpacings.length || 16;
    
    return {
      type: avgSpacing < 12 ? 'tight' : avgSpacing > 24 ? 'loose' : 'normal',
      baseUnit: Math.round(avgSpacing / 4) * 4, // 对齐到4的倍数
      scale: [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8].map(s => s * avgSpacing)
    };
  }

  private analyzeAlignment(elements: ParsedElement[]): DesignAnalysis['designPatterns']['alignment'] {
    const alignments = elements.map(el => el.styles['text-align'] || 'left');
    const centerCount = alignments.filter(a => a === 'center').length;
    const rightCount = alignments.filter(a => a === 'right').length;
    
    if (centerCount > elements.length * 0.6) return 'center';
    if (rightCount > elements.length * 0.3) return 'mixed';
    return 'left';
  }

  private analyzeGrouping(elements: ParsedElement[]): GroupingPattern[] {
    // 简化的分组分析
    const groups: GroupingPattern[] = [];
    
    // 查找容器元素
    elements.forEach(element => {
      if (element.children.length > 1) {
        const elementRefs = element.children.map((child, index) => ({
          selector: this.generateSelector(child, index),
          tagName: child.tagName,
          className: child.attributes.class,
          textContent: child.textContent,
          importance: this.calculateImportance(child)
        }));

        groups.push({
          elements: elementRefs,
          relationship: this.detectRelationship(element),
          direction: this.detectDirection(element),
          spacing: this.extractSpacing(element.styles.gap || element.styles.margin || '16'),
          alignment: 'start'
        });
      }
    });

    return groups;
  }

  private extractColorScheme(elements: ParsedElement[]): DesignAnalysis['colorScheme'] {
    // 简化的颜色提取
    const colors = elements.map(el => ({
      bg: el.styles['background-color'],
      text: el.styles.color,
      border: el.styles['border-color']
    })).filter(c => c.bg || c.text || c.border);

    return {
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
    };
  }

  private analyzeTypography(elements: ParsedElement[]): DesignAnalysis['typography'] {
    // 简化的字体分析
    return {
      headingScale: {
        h1: 48,
        h2: 36,
        h3: 28,
        h4: 24,
        h5: 20,
        h6: 18
      },
      bodySize: 16,
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        loose: 1.8
      },
      fontWeights: {
        light: 300,
        normal: 400,
        medium: 500,
        bold: 700
      }
    };
  }

  private detectResponsiveStrategy(elements: ParsedElement[]): DesignAnalysis['responsive'] {
    return {
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      strategy: 'mobile-first'
    };
  }

  // 辅助方法
  private generateCacheKey(htmlContent: string, userPreferences?: UserPreferences): string {
    const content = htmlContent.substring(0, 1000); // 取前1000字符
    const prefs = userPreferences ? JSON.stringify(userPreferences) : '';
    return btoa(content + prefs).substring(0, 32);
  }

  private generateSelector(element: ParsedElement, index: number): string {
    if (element.attributes.id) return `#${element.attributes.id}`;
    if (element.attributes.class) return `.${element.attributes.class.split(' ')[0]}`;
    return `${element.tagName}:nth-child(${index + 1})`;
  }

  private calculateImportance(element: ParsedElement): number {
    let importance = 0.5;
    
    // 基于标签类型
    if (element.tagName === 'h1') importance += 0.4;
    else if (element.tagName.match(/^h[2-3]$/)) importance += 0.3;
    else if (element.tagName === 'button') importance += 0.2;
    
    // 基于类名
    if (element.attributes.class?.includes('primary')) importance += 0.2;
    if (element.attributes.class?.includes('hero')) importance += 0.3;
    
    return Math.min(importance, 1);
  }

  private extractSpacing(value: string): number {
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private detectRelationship(element: ParsedElement): GroupingPattern['relationship'] {
    if (element.styles.display === 'flex') return 'flow';
    if (element.styles.display === 'grid') return 'grid';
    if (element.tagName === 'ul' || element.tagName === 'ol') return 'list';
    return 'container';
  }

  private detectDirection(element: ParsedElement): 'horizontal' | 'vertical' | 'mixed' {
    if (element.styles['flex-direction'] === 'row') return 'horizontal';
    if (element.styles['flex-direction'] === 'column') return 'vertical';
    return 'vertical'; // 默认垂直
  }

  private buildElementTree(elements: ParsedElement[]): any {
    return elements.map(el => ({
      tag: el.tagName,
      classes: el.attributes.class?.split(' ') || [],
      id: el.attributes.id,
      text: el.textContent?.substring(0, 100),
      children: el.children.length,
      styles: Object.keys(el.styles).length
    }));
  }

  private extractUniqueStyles(elements: ParsedElement[]): string[] {
    const styles = new Set<string>();
    elements.forEach(el => {
      Object.keys(el.styles).forEach(prop => styles.add(prop));
    });
    return Array.from(styles);
  }

  private extractTextContent(elements: ParsedElement[]): string[] {
    return elements
      .map(el => el.textContent?.trim())
      .filter((text): text is string => text !== undefined && text.length > 0)
      .slice(0, 10); // 只取前10个文本内容
  }

  private extractImageInfo(elements: ParsedElement[]): any[] {
    return elements
      .filter(el => el.tagName === 'img')
      .map(el => ({
        src: el.attributes.src,
        alt: el.attributes.alt,
        width: el.attributes.width,
        height: el.attributes.height
      }));
  }

  private extractFormInfo(elements: ParsedElement[]): any[] {
    return elements
      .filter(el => ['form', 'input', 'textarea', 'select', 'button'].includes(el.tagName))
      .map(el => ({
        tag: el.tagName,
        type: el.attributes.type,
        name: el.attributes.name,
        placeholder: el.attributes.placeholder
      }));
  }

  private extractNavigationInfo(elements: ParsedElement[]): any[] {
    return elements
      .filter(el => el.tagName === 'nav' || el.attributes.class?.includes('nav'))
      .map(el => ({
        tag: el.tagName,
        classes: el.attributes.class,
        links: el.children.filter(child => child.tagName === 'a').length
      }));
  }
}

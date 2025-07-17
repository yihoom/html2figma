import { 
  DesignAnalysis, 
  OptimizedLayout, 
  SpacingSystem, 
  LayoutGroup, 
  ResponsiveRules, 
  ComponentSuggestion,
  LayoutImprovement,
  ElementReference 
} from '../types/ai-types';
import { ParsedElement } from '../types';

export class LayoutOptimizer {
  
  optimizeLayout(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): OptimizedLayout {
    
    const spacing = this.createSpacingSystem(analysis);
    const groups = this.createLayoutGroups(elements, analysis);
    const responsive = this.createResponsiveRules(analysis);
    const components = this.identifyComponents(elements, analysis);
    const improvements = this.generateImprovements(elements, analysis);

    return {
      spacing,
      groups,
      responsive,
      components,
      improvements
    };
  }

  private createSpacingSystem(analysis: DesignAnalysis): SpacingSystem {
    const { spacing } = analysis.designPatterns;
    
    return {
      baseUnit: spacing.baseUnit,
      scale: spacing.scale,
      vertical: {
        section: spacing.baseUnit * 6,  // 96px for sections
        component: spacing.baseUnit * 3, // 48px for components
        element: spacing.baseUnit * 1.5  // 24px for elements
      },
      horizontal: {
        container: spacing.baseUnit * 4, // 64px for containers
        component: spacing.baseUnit * 2, // 32px for components
        element: spacing.baseUnit       // 16px for elements
      }
    };
  }

  private createLayoutGroups(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutGroup[] {
    
    const groups: LayoutGroup[] = [];
    
    // 基于AI分析的分组模式创建布局组
    analysis.designPatterns.grouping.forEach((pattern, index) => {
      const group: LayoutGroup = {
        id: `group-${index}`,
        name: this.generateGroupName(pattern),
        elements: pattern.elements,
        layout: this.mapRelationshipToLayout(pattern.relationship),
        direction: pattern.direction === 'horizontal' ? 'row' : 'column',
        gap: pattern.spacing,
        alignment: {
          main: this.mapAlignmentToMain(pattern.alignment),
          cross: this.mapAlignmentToCross(pattern.alignment)
        },
        responsive: this.shouldBeResponsive(pattern)
      };
      
      groups.push(group);
    });

    // 为未分组的元素创建默认组
    const ungroupedElements = this.findUngroupedElements(elements, groups);
    if (ungroupedElements.length > 0) {
      groups.push(this.createDefaultGroup(ungroupedElements, analysis));
    }

    return groups;
  }

  private createResponsiveRules(analysis: DesignAnalysis): ResponsiveRules {
    const { responsive } = analysis;
    
    return {
      strategy: responsive.strategy === 'adaptive' ? 'mobile-first' : responsive.strategy,
      breakpoints: {
        mobile: {
          width: responsive.breakpoints.mobile,
          layout: 'stack',
          spacing: analysis.designPatterns.spacing.baseUnit,
          typography: {
            scale: 0.875, // 14px base
            lineHeight: 1.5
          }
        },
        tablet: {
          width: responsive.breakpoints.tablet,
          layout: 'flex',
          columns: 2,
          spacing: analysis.designPatterns.spacing.baseUnit * 1.5,
          typography: {
            scale: 0.9375, // 15px base
            lineHeight: 1.5
          }
        },
        desktop: {
          width: responsive.breakpoints.desktop,
          layout: 'grid',
          columns: this.calculateOptimalColumns(analysis.layoutType),
          spacing: analysis.designPatterns.spacing.baseUnit * 2,
          typography: {
            scale: 1, // 16px base
            lineHeight: 1.6
          }
        }
      }
    };
  }

  private identifyComponents(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    const components: ComponentSuggestion[] = [];
    
    // 识别按钮组件
    const buttons = this.identifyButtons(elements, analysis);
    components.push(...buttons);
    
    // 识别卡片组件
    const cards = this.identifyCards(elements, analysis);
    components.push(...cards);
    
    // 识别表单组件
    const forms = this.identifyForms(elements, analysis);
    components.push(...forms);
    
    // 识别导航组件
    const navigation = this.identifyNavigation(elements, analysis);
    components.push(...navigation);
    
    // 识别英雄区域组件
    const heroes = this.identifyHeroSections(elements, analysis);
    components.push(...heroes);

    return components;
  }

  private identifyButtons(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    const buttonElements = elements.filter(el => 
      el.tagName === 'button' || 
      (el.tagName === 'a' && el.attributes.class?.includes('btn')) ||
      el.attributes.class?.includes('button')
    );

    if (buttonElements.length === 0) return [];

    const primaryButtons = buttonElements.filter(el => 
      analysis.visualHierarchy.primary.some(ref => 
        ref.tagName === el.tagName && ref.textContent === el.textContent
      )
    );

    const secondaryButtons = buttonElements.filter(el => 
      !primaryButtons.includes(el) &&
      analysis.visualHierarchy.secondary.some(ref => 
        ref.tagName === el.tagName && ref.textContent === el.textContent
      )
    );

    const suggestions: ComponentSuggestion[] = [];

    if (primaryButtons.length > 0) {
      suggestions.push({
        name: 'PrimaryButton',
        type: 'button',
        elements: primaryButtons.map(el => this.elementToReference(el)),
        reusability: 0.9,
        variants: [
          {
            name: 'default',
            description: '默认主要按钮',
            modifications: { size: 'medium', style: 'primary', state: 'default' }
          },
          {
            name: 'large',
            description: '大尺寸主要按钮',
            modifications: { size: 'large', style: 'primary', state: 'default' }
          },
          {
            name: 'disabled',
            description: '禁用状态',
            modifications: { size: 'medium', style: 'primary', state: 'disabled' }
          }
        ],
        props: [
          { name: 'text', type: 'text', defaultValue: 'Button', description: '按钮文本' },
          { name: 'size', type: 'enum', defaultValue: 'medium', description: '按钮尺寸', options: ['small', 'medium', 'large'] },
          { name: 'disabled', type: 'boolean', defaultValue: false, description: '是否禁用' }
        ]
      });
    }

    if (secondaryButtons.length > 0) {
      suggestions.push({
        name: 'SecondaryButton',
        type: 'button',
        elements: secondaryButtons.map(el => this.elementToReference(el)),
        reusability: 0.8,
        variants: [
          {
            name: 'default',
            description: '默认次要按钮',
            modifications: { size: 'medium', style: 'secondary', state: 'default' }
          },
          {
            name: 'outline',
            description: '轮廓样式',
            modifications: { size: 'medium', style: 'outline', state: 'default' }
          }
        ],
        props: [
          { name: 'text', type: 'text', defaultValue: 'Button', description: '按钮文本' },
          { name: 'variant', type: 'enum', defaultValue: 'secondary', description: '按钮变体', options: ['secondary', 'outline', 'ghost'] }
        ]
      });
    }

    return suggestions;
  }

  private identifyCards(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    // 查找可能的卡片元素
    const cardCandidates = elements.filter(el => 
      el.tagName === 'div' && 
      el.children.length >= 2 && 
      (el.attributes.class?.includes('card') || 
       el.styles['border-radius'] || 
       el.styles['box-shadow'] ||
       el.styles['border'])
    );

    if (cardCandidates.length < 2) return []; // 至少需要2个相似的结构才认为是组件

    // 分析卡片结构的相似性
    const cardStructures = cardCandidates.map(card => ({
      element: card,
      structure: this.analyzeCardStructure(card)
    }));

    // 找到相似的卡片结构
    const similarCards = this.findSimilarStructures(cardStructures);
    
    if (similarCards.length === 0) return [];

    return [{
      name: 'Card',
      type: 'card',
      elements: similarCards.map(card => this.elementToReference(card.element)),
      reusability: 0.85,
      variants: [
        {
          name: 'default',
          description: '默认卡片',
          modifications: { style: 'primary' }
        },
        {
          name: 'elevated',
          description: '带阴影的卡片',
          modifications: { style: 'primary' }
        }
      ],
      props: [
        { name: 'title', type: 'text', defaultValue: 'Card Title', description: '卡片标题' },
        { name: 'content', type: 'text', defaultValue: 'Card content', description: '卡片内容' },
        { name: 'image', type: 'text', defaultValue: '', description: '卡片图片URL' },
        { name: 'elevated', type: 'boolean', defaultValue: false, description: '是否显示阴影' }
      ]
    }];
  }

  private identifyForms(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    const formElements = elements.filter(el => 
      el.tagName === 'form' || 
      el.children.some(child => ['input', 'textarea', 'select'].includes(child.tagName))
    );

    if (formElements.length === 0) return [];

    return [{
      name: 'Form',
      type: 'form',
      elements: formElements.map(el => this.elementToReference(el)),
      reusability: 0.7,
      variants: [
        {
          name: 'default',
          description: '默认表单',
          modifications: { style: 'primary' }
        }
      ],
      props: [
        { name: 'title', type: 'text', defaultValue: 'Form', description: '表单标题' },
        { name: 'submitText', type: 'text', defaultValue: 'Submit', description: '提交按钮文本' }
      ]
    }];
  }

  private identifyNavigation(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    const navElements = elements.filter(el => 
      el.tagName === 'nav' || 
      el.attributes.class?.includes('nav') ||
      (el.tagName === 'header' && el.children.some(child => child.tagName === 'a'))
    );

    if (navElements.length === 0) return [];

    return [{
      name: 'Navigation',
      type: 'navigation',
      elements: navElements.map(el => this.elementToReference(el)),
      reusability: 0.95,
      variants: [
        {
          name: 'horizontal',
          description: '水平导航',
          modifications: { style: 'primary' }
        },
        {
          name: 'vertical',
          description: '垂直导航',
          modifications: { style: 'secondary' }
        }
      ],
      props: [
        { name: 'items', type: 'text', defaultValue: '[]', description: '导航项目' },
        { name: 'orientation', type: 'enum', defaultValue: 'horizontal', description: '导航方向', options: ['horizontal', 'vertical'] }
      ]
    }];
  }

  private identifyHeroSections(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): ComponentSuggestion[] {
    
    if (analysis.layoutType !== 'hero-section' && analysis.layoutType !== 'landing-page') {
      return [];
    }

    const heroElements = elements.filter(el => 
      analysis.visualHierarchy.primary.some(ref => ref.tagName === el.tagName) ||
      el.attributes.class?.includes('hero') ||
      (el.tagName === 'section' && el.children.some(child => child.tagName === 'h1'))
    );

    if (heroElements.length === 0) return [];

    return [{
      name: 'HeroSection',
      type: 'hero',
      elements: heroElements.map(el => this.elementToReference(el)),
      reusability: 0.6,
      variants: [
        {
          name: 'centered',
          description: '居中对齐的英雄区域',
          modifications: { style: 'primary' }
        },
        {
          name: 'left-aligned',
          description: '左对齐的英雄区域',
          modifications: { style: 'secondary' }
        }
      ],
      props: [
        { name: 'title', type: 'text', defaultValue: 'Hero Title', description: '主标题' },
        { name: 'subtitle', type: 'text', defaultValue: 'Hero subtitle', description: '副标题' },
        { name: 'ctaText', type: 'text', defaultValue: 'Get Started', description: 'CTA按钮文本' },
        { name: 'backgroundImage', type: 'text', defaultValue: '', description: '背景图片URL' }
      ]
    }];
  }

  private generateImprovements(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutImprovement[] {
    
    const improvements: LayoutImprovement[] = [];
    
    // 检查间距一致性
    improvements.push(...this.checkSpacingConsistency(elements, analysis));
    
    // 检查对齐问题
    improvements.push(...this.checkAlignment(elements, analysis));
    
    // 检查颜色对比度
    improvements.push(...this.checkColorContrast(elements, analysis));
    
    // 检查字体层次
    improvements.push(...this.checkTypographyHierarchy(elements, analysis));

    return improvements;
  }

  // 辅助方法
  private generateGroupName(pattern: any): string {
    switch (pattern.relationship) {
      case 'list': return 'List Group';
      case 'grid': return 'Grid Group';
      case 'flow': return 'Flow Group';
      case 'stack': return 'Stack Group';
      default: return 'Container Group';
    }
  }

  private mapRelationshipToLayout(relationship: string): LayoutGroup['layout'] {
    switch (relationship) {
      case 'grid': return 'grid';
      case 'flow': 
      case 'list': return 'flex';
      case 'stack': return 'stack';
      default: return 'flex';
    }
  }

  private mapAlignmentToMain(alignment: string): LayoutGroup['alignment']['main'] {
    switch (alignment) {
      case 'center': return 'center';
      case 'end': return 'end';
      case 'stretch': return 'space-between';
      default: return 'start';
    }
  }

  private mapAlignmentToCross(alignment: string): LayoutGroup['alignment']['cross'] {
    switch (alignment) {
      case 'center': return 'center';
      case 'end': return 'end';
      case 'stretch': return 'stretch';
      default: return 'start';
    }
  }

  private shouldBeResponsive(pattern: any): boolean {
    return pattern.elements.length > 2; // 超过2个元素的组建议响应式
  }

  private calculateOptimalColumns(layoutType: string): number {
    switch (layoutType) {
      case 'card-grid': return 3;
      case 'dashboard': return 4;
      case 'form': return 1;
      default: return 2;
    }
  }

  private findUngroupedElements(
    elements: ParsedElement[], 
    groups: LayoutGroup[]
  ): ParsedElement[] {
    const groupedSelectors = new Set(
      groups.flatMap(group => group.elements.map(el => el.selector))
    );
    
    return elements.filter((el, index) => {
      const selector = this.generateSelector(el, index);
      return !groupedSelectors.has(selector);
    });
  }

  private createDefaultGroup(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutGroup {
    return {
      id: 'default-group',
      name: 'Default Group',
      elements: elements.map(el => this.elementToReference(el)),
      layout: 'stack',
      direction: 'column',
      gap: analysis.designPatterns.spacing.baseUnit,
      alignment: {
        main: 'start',
        cross: 'stretch'
      },
      responsive: true
    };
  }

  private elementToReference(element: ParsedElement): ElementReference {
    return {
      selector: this.generateSelector(element, 0),
      tagName: element.tagName,
      className: element.attributes.class,
      id: element.attributes.id,
      textContent: element.textContent,
      importance: 0.5
    };
  }

  private generateSelector(element: ParsedElement, index: number): string {
    if (element.attributes.id) return `#${element.attributes.id}`;
    if (element.attributes.class) return `.${element.attributes.class.split(' ')[0]}`;
    return `${element.tagName}:nth-child(${index + 1})`;
  }

  private analyzeCardStructure(card: ParsedElement): any {
    return {
      childCount: card.children.length,
      hasImage: card.children.some(child => child.tagName === 'img'),
      hasHeading: card.children.some(child => child.tagName.match(/^h[1-6]$/)),
      hasButton: card.children.some(child => child.tagName === 'button'),
      hasParagraph: card.children.some(child => child.tagName === 'p')
    };
  }

  private findSimilarStructures(structures: any[]): any[] {
    // 简化的结构相似性检查
    if (structures.length < 2) return [];
    
    const first = structures[0].structure;
    return structures.filter(s => 
      s.structure.childCount === first.childCount &&
      s.structure.hasImage === first.hasImage &&
      s.structure.hasHeading === first.hasHeading
    );
  }

  private checkSpacingConsistency(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutImprovement[] {
    // 简化的间距检查
    return [];
  }

  private checkAlignment(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutImprovement[] {
    // 简化的对齐检查
    return [];
  }

  private checkColorContrast(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutImprovement[] {
    // 简化的颜色对比度检查
    return [];
  }

  private checkTypographyHierarchy(
    elements: ParsedElement[], 
    analysis: DesignAnalysis
  ): LayoutImprovement[] {
    // 简化的字体层次检查
    return [];
  }
}

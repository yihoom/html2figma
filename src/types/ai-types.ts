// AI分析相关的类型定义

export interface DesignAnalysis {
  layoutType: 'landing-page' | 'dashboard' | 'form' | 'card-grid' | 'article' | 'navigation' | 'hero-section';
  confidence: number; // 0-1之间的置信度
  
  visualHierarchy: {
    primary: ElementReference[];    // 主要元素（标题、CTA按钮等）
    secondary: ElementReference[];  // 次要元素（副标题、描述等）
    accent: ElementReference[];     // 强调元素（图标、徽章等）
    background: ElementReference[]; // 背景元素
  };
  
  designPatterns: {
    spacing: {
      type: 'tight' | 'normal' | 'loose' | 'custom';
      baseUnit: number; // 基础间距单位（px）
      scale: number[];  // 间距比例 [0.5, 1, 1.5, 2, 3, 4, 6, 8]
    };
    alignment: 'left' | 'center' | 'right' | 'justified' | 'mixed';
    grouping: GroupingPattern[];
  };
  
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  
  typography: {
    headingScale: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
    };
    bodySize: number;
    lineHeight: {
      tight: number;   // 1.2
      normal: number;  // 1.5
      loose: number;   // 1.8
    };
    fontWeights: {
      light: number;
      normal: number;
      medium: number;
      bold: number;
    };
  };
  
  responsive: {
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
    strategy: 'mobile-first' | 'desktop-first' | 'adaptive';
  };
}

export interface ElementReference {
  selector: string;
  tagName: string;
  className?: string;
  id?: string;
  textContent?: string;
  importance: number; // 0-1之间，表示重要性
}

export interface GroupingPattern {
  elements: ElementReference[];
  relationship: 'container' | 'list' | 'grid' | 'flow' | 'stack' | 'cluster';
  direction: 'horizontal' | 'vertical' | 'mixed';
  spacing: number;
  alignment: 'start' | 'center' | 'end' | 'stretch';
}

export interface ComponentSuggestion {
  name: string;
  type: 'button' | 'card' | 'form' | 'navigation' | 'hero' | 'feature' | 'testimonial' | 'footer';
  elements: ElementReference[];
  reusability: number; // 0-1之间，表示可复用性
  variants: ComponentVariant[];
  props: ComponentProp[];
}

export interface ComponentVariant {
  name: string;
  description: string;
  modifications: {
    size?: 'small' | 'medium' | 'large';
    style?: 'primary' | 'secondary' | 'outline' | 'ghost';
    state?: 'default' | 'hover' | 'active' | 'disabled';
  };
}

export interface ComponentProp {
  name: string;
  type: 'text' | 'color' | 'size' | 'boolean' | 'enum';
  defaultValue: any;
  description: string;
  options?: string[]; // 用于enum类型
}

export interface OptimizedLayout {
  spacing: SpacingSystem;
  groups: LayoutGroup[];
  responsive: ResponsiveRules;
  components: ComponentSuggestion[];
  improvements: LayoutImprovement[];
}

export interface SpacingSystem {
  baseUnit: number;
  scale: number[];
  vertical: {
    section: number;
    component: number;
    element: number;
  };
  horizontal: {
    container: number;
    component: number;
    element: number;
  };
}

export interface LayoutGroup {
  id: string;
  name: string;
  elements: ElementReference[];
  layout: 'flex' | 'grid' | 'stack' | 'absolute';
  direction: 'row' | 'column';
  gap: number;
  alignment: {
    main: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
    cross: 'start' | 'center' | 'end' | 'stretch';
  };
  responsive: boolean;
}

export interface ResponsiveRules {
  strategy: 'mobile-first' | 'desktop-first';
  breakpoints: {
    mobile: BreakpointRule;
    tablet: BreakpointRule;
    desktop: BreakpointRule;
  };
}

export interface BreakpointRule {
  width: number;
  layout: 'stack' | 'grid' | 'flex';
  columns?: number;
  spacing: number;
  typography: {
    scale: number;
    lineHeight: number;
  };
}

export interface LayoutImprovement {
  type: 'spacing' | 'alignment' | 'grouping' | 'typography' | 'color' | 'component';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  element?: ElementReference;
  before: any;
  after: any;
}

export interface UserPreferences {
  designSystem?: 'material' | 'ant-design' | 'chakra' | 'tailwind' | 'custom';
  colorPreference?: 'vibrant' | 'muted' | 'monochrome' | 'brand';
  spacingPreference?: 'tight' | 'normal' | 'loose';
  componentStyle?: 'minimal' | 'detailed' | 'playful' | 'professional';
  targetPlatform?: 'web' | 'mobile' | 'desktop' | 'universal';
}

export interface AIAnalysisConfig {
  apiKey?: string;
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'local';
  maxTokens: number;
  temperature: number;
  enableCache: boolean;
  fallbackToRules: boolean; // 当AI不可用时是否回退到规则引擎
}

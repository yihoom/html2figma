import { SimpleElement, ParsedElement } from '../types';

export class HtmlParser {
  parseHtmlString(html: string): SimpleElement[] {
    try {
      // Extract and parse CSS styles first
      const cssStyles = this.extractCssStyles(html);
      
      // Remove comments, scripts, and styles
      html = html.replace(/<!--[\s\S]*?-->/g, '');
      html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
      html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
      
      // Extract body content if present
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        html = bodyMatch[1];
      }
      
      const elements = this.parseElements(html, cssStyles);
      
      // If no elements found in body, try to parse the entire document
      if (elements.length === 0) {
        return this.parseElements(html, cssStyles);
      }
      
      return elements;
    } catch (error) {
      console.error('解析HTML字符串时出错:', error);
      return [];
    }
  }

  extractCssStyles(html: string): { [selector: string]: { [property: string]: string } } {
    const styles: { [selector: string]: { [property: string]: string } } = {};
    
    // Extract CSS from <style> tags
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      for (const styleMatch of styleMatches) {
        const cssContent = styleMatch.replace(/<\/?style[^>]*>/gi, '');
        this.parseCssRules(cssContent, styles);
      }
    }
    
    return styles;
  }

  private parseCssRules(css: string, styles: { [selector: string]: { [property: string]: string } }): void {
    // Simple CSS parser - handles basic selectors and properties
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(css)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2];
      
      const properties: { [property: string]: string } = {};
      const declarationRegex = /([^:;]+):\s*([^;]+)/g;
      let declMatch;
      
      while ((declMatch = declarationRegex.exec(declarations)) !== null) {
        const property = declMatch[1].trim();
        const value = declMatch[2].trim();
        properties[property] = value;
      }
      
      styles[selector] = properties;
    }
  }

  private parseElements(html: string, cssStyles: { [selector: string]: { [property: string]: string } } = {}): SimpleElement[] {
    const elements: SimpleElement[] = [];
    const tagRegex = /<(\w+)([^>]*?)(?:\s*\/\s*>|>([\s\S]*?)<\/\1>)/g;
    
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1].toLowerCase();
      const attributesStr = match[2];
      const content = match[3] || '';
      
      // Skip script and style tags
      if (tagName === 'script' || tagName === 'style') {
        continue;
      }
      
      const attributes = this.parseAttributes(attributesStr);
      
      const element: SimpleElement = {
        tagName,
        attributes,
        textContent: this.extractTextContent(content),
        children: this.parseElements(content, cssStyles)
      };
      
      elements.push(element);
    }
    
    return elements;
  }

  private parseAttributes(attributesStr: string): { [key: string]: string } {
    const attributes: { [key: string]: string } = {};
    const attrRegex = /(\w+)(?:\s*=\s*["']([^"']*)["'])?/g;
    
    let match;
    while ((match = attrRegex.exec(attributesStr)) !== null) {
      attributes[match[1]] = match[2] || '';
    }
    
    return attributes;
  }

  private extractTextContent(html: string): string {
    // Remove HTML tags and get text content
    return html.replace(/<[^>]*>/g, '').trim();
  }

  convertToParseElement(element: SimpleElement, cssStyles: { [selector: string]: { [property: string]: string } } = {}): ParsedElement {
    // Combine inline styles with CSS styles
    const inlineStyles = this.parseInlineStyles(element.attributes.style || '');
    const appliedStyles = this.applyCssStyles(element, cssStyles, inlineStyles);
    
    return {
      tagName: element.tagName,
      textContent: element.textContent,
      attributes: element.attributes,
      styles: appliedStyles,
      children: element.children.map(child => this.convertToParseElement(child, cssStyles))
    };
  }

  private applyCssStyles(
    element: SimpleElement, 
    cssStyles: { [selector: string]: { [property: string]: string } }, 
    inlineStyles: { [property: string]: string }
  ): { [property: string]: string } {
    const combinedStyles: { [property: string]: string } = {};
    
    // Apply universal selector styles first
    if (cssStyles['*']) {
      Object.assign(combinedStyles, cssStyles['*']);
    }
    
    // Apply CSS styles based on tag name
    if (cssStyles[element.tagName]) {
      Object.assign(combinedStyles, cssStyles[element.tagName]);
    }
    
    // Apply CSS styles based on class (with specificity)
    if (element.attributes.class) {
      const classes = element.attributes.class.split(' ').filter(c => c.trim());
      for (const className of classes) {
        const classSelector = `.${className.trim()}`;
        if (cssStyles[classSelector]) {
          Object.assign(combinedStyles, cssStyles[classSelector]);
        }
        
        // Also check for compound selectors like .class1.class2
        for (const selector in cssStyles) {
          if (selector.includes(`.${className}`) && selector !== classSelector) {
            // Simple check for compound class selectors
            const selectorClasses = selector.split('.').filter(c => c.trim());
            if (selectorClasses.every(sc => classes.indexOf(sc) !== -1)) {
              Object.assign(combinedStyles, cssStyles[selector]);
            }
          }
        }
      }
    }
    
    // Apply CSS styles based on id
    if (element.attributes.id && cssStyles[`#${element.attributes.id}`]) {
      Object.assign(combinedStyles, cssStyles[`#${element.attributes.id}`]);
    }
    
    // Apply pseudo-class styles (basic support)
    const tagWithPseudo = `${element.tagName}:hover`;
    if (cssStyles[tagWithPseudo]) {
      // For now, just apply hover styles as regular styles
      Object.assign(combinedStyles, cssStyles[tagWithPseudo]);
    }
    
    // Apply descendant selectors (basic support)
    for (const selector in cssStyles) {
      if (selector.includes(' ') && !selector.includes('.') && !selector.includes('#')) {
        const parts = selector.split(' ').map(p => p.trim());
        if (parts[parts.length - 1] === element.tagName) {
          // This is a very basic descendant selector check
          Object.assign(combinedStyles, cssStyles[selector]);
        }
      }
    }
    
    // Inline styles have highest priority, so apply them last
    Object.assign(combinedStyles, inlineStyles);
    
    return combinedStyles;
  }

  private parseInlineStyles(styleStr: string): { [property: string]: string } {
    const styles: { [property: string]: string } = {};
    
    if (!styleStr) return styles;
    
    const declarations = styleStr.split(';');
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map((s: string) => s.trim());
      if (property && value) {
        styles[property] = value;
      }
    }
    
    return styles;
  }
}

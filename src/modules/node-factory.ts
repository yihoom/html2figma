import { ParsedElement } from '../types';
import { StyleProcessor } from './style-processor';

export class NodeFactory {
  private styleProcessor: StyleProcessor;

  constructor() {
    this.styleProcessor = new StyleProcessor();
  }

  async loadFonts(): Promise<void> {
    try {
      await Promise.all([
        figma.loadFontAsync({ family: "Inter", style: "Regular" }),
        figma.loadFontAsync({ family: "Inter", style: "Medium" }),
        figma.loadFontAsync({ family: "Inter", style: "Bold" })
      ]);
    } catch (error) {
      console.warn('字体加载失败，使用默认字体:', error);
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    }
  }

  async createFigmaNodeFromElement(element: ParsedElement): Promise<SceneNode | null> {
    try {
      await this.loadFonts();
      
      switch (element.tagName) {
        case 'div':
        case 'section':
        case 'article':
        case 'header':
        case 'footer':
          return await this.createContainerNode(element);
        
        case 'h1': case 'h2': case 'h3': 
        case 'h4': case 'h5': case 'h6':
        case 'p': case 'span':
          return await this.createTextNode(element);
        
        case 'button':
          return await this.createButtonNode(element);
        
        case 'input':
        case 'textarea':
          return await this.createInputNode(element);
        
        case 'img':
          return await this.createImageNode(element);
        
        case 'ul': case 'ol':
          return await this.createListNode(element);
        
        case 'li':
          return await this.createListItemNode(element);
        
        default:
          return await this.createContainerNode(element);
      }
    } catch (error) {
      console.error('创建Figma节点时出错:', error);
      return null;
    }
  }

  async createContainerNode(element: ParsedElement): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = element.tagName.toUpperCase();
    
    // Apply basic styling first
    this.styleProcessor.applyBasicStyles(frame, element);
    
    // Determine layout type
    const isFlexContainer = element.styles.display === 'flex';
    const isBlockContainer = !isFlexContainer && (element.tagName === 'div' || element.tagName === 'section' || element.tagName === 'article');
    
    // Set intelligent default sizes based on content and context
    let defaultWidth = 800; // Wider default for better layout
    let defaultHeight: number | 'auto' = 'auto';
    
    // Adjust defaults based on element type
    if (element.tagName === 'header' || element.tagName === 'nav') {
      defaultWidth = 1200;
      defaultHeight = 60;
    } else if (element.tagName === 'footer') {
      defaultWidth = 1200;
      defaultHeight = 80;
    }
    
    // Apply width
    if (element.styles.width) {
      const width = this.styleProcessor.parseSize(element.styles.width);
      if (width > 0) {
        frame.resize(width, frame.height);
      }
    } else {
      frame.resize(defaultWidth, frame.height);
    }
    
    if (isFlexContainer) {
      // Configure Auto Layout for flex containers
      frame.layoutMode = 'HORIZONTAL'; // Default flex direction
      
      // Handle flex-direction
      if (element.styles['flex-direction'] === 'column' || element.styles['flex-direction'] === 'column-reverse') {
        frame.layoutMode = 'VERTICAL';
      }
      
      // Handle gap
      if (element.styles.gap) {
        const gap = this.styleProcessor.parseSize(element.styles.gap);
        frame.itemSpacing = gap;
      } else {
        frame.itemSpacing = 12; // Better default spacing
      }
      
      // Handle justify-content (main axis alignment)
      switch (element.styles['justify-content']) {
        case 'center':
          frame.primaryAxisAlignItems = 'CENTER';
          break;
        case 'flex-end':
        case 'end':
          frame.primaryAxisAlignItems = 'MAX';
          break;
        case 'space-between':
          frame.primaryAxisAlignItems = 'SPACE_BETWEEN';
          break;
        case 'space-around':
        case 'space-evenly':
          frame.primaryAxisAlignItems = 'SPACE_BETWEEN'; // Closest approximation
          break;
        default:
          frame.primaryAxisAlignItems = 'MIN'; // flex-start
      }
      
      // Handle align-items (cross axis alignment)
      switch (element.styles['align-items']) {
        case 'center':
          frame.counterAxisAlignItems = 'CENTER';
          break;
        case 'flex-end':
        case 'end':
          frame.counterAxisAlignItems = 'MAX';
          break;
        case 'stretch':
          frame.counterAxisAlignItems = 'MIN'; // Fallback since STRETCH not available
          break;
        default:
          frame.counterAxisAlignItems = 'MIN'; // flex-start
      }
      
      // Set sizing mode for better responsiveness
      frame.primaryAxisSizingMode = 'AUTO';
      frame.counterAxisSizingMode = 'AUTO';
      
      // Apply padding for flex containers
      const padding = this.styleProcessor.parseSize(element.styles.padding || '16');
      frame.paddingTop = frame.paddingRight = frame.paddingBottom = frame.paddingLeft = padding;
    }
    
    // Create child nodes
    if (isFlexContainer) {
      // For flex containers, add children with Auto Layout
      for (const child of element.children) {
        const childNode = await this.createFigmaNodeFromElement(child);
        if (childNode) {
          frame.appendChild(childNode);
        }
      }
    } else if (isBlockContainer) {
      // For block containers, use vertical stacking with proper spacing
      frame.layoutMode = 'VERTICAL';
      frame.itemSpacing = 16;
      frame.paddingTop = frame.paddingRight = frame.paddingBottom = frame.paddingLeft = 20;
      frame.primaryAxisSizingMode = 'AUTO';
      frame.counterAxisSizingMode = 'AUTO';
      
      for (const child of element.children) {
        const childNode = await this.createFigmaNodeFromElement(child);
        if (childNode) {
          frame.appendChild(childNode);
        }
      }
    } else {
      // For other containers, use manual positioning
      let yOffset = 20; // Start with some padding
      const xOffset = 20;
      
      for (const child of element.children) {
        const childNode = await this.createFigmaNodeFromElement(child);
        if (childNode) {
          childNode.x = xOffset;
          childNode.y = yOffset;
          frame.appendChild(childNode);
          yOffset += childNode.height + 16; // Add spacing between elements
        }
      }
      
      // Adjust frame height based on content
      if (element.children.length > 0 && !element.styles.height) {
        frame.resize(frame.width, Math.max(yOffset + 20, 100)); // Add bottom padding
      }
    }
    
    // Apply height after children are added
    if (element.styles.height && defaultHeight !== 'auto') {
      const height = this.styleProcessor.parseSize(element.styles.height);
      if (height > 0) {
        frame.resize(frame.width, height);
      }
    } else if (typeof defaultHeight === 'number') {
      frame.resize(frame.width, defaultHeight);
    }
    
    return frame;
  }

  async createTextNode(element: ParsedElement): Promise<TextNode> {
    const text = figma.createText();
    
    // Get text content, fallback to tag name if empty
    const textContent = element.textContent?.trim() || element.tagName.toUpperCase();
    text.characters = textContent;
    
    // Set font size based on heading level with better defaults
    let fontSize = 16;
    switch (element.tagName) {
      case 'h1': fontSize = 48; break;  // Larger for better hierarchy
      case 'h2': fontSize = 36; break;
      case 'h3': fontSize = 28; break;
      case 'h4': fontSize = 24; break;
      case 'h5': fontSize = 20; break;
      case 'h6': fontSize = 18; break;
      case 'p': fontSize = 16; break;
      case 'span': fontSize = 14; break;
      case 'small': fontSize = 12; break;
      case 'strong': fontSize = 16; break;
      case 'em': fontSize = 16; break;
    }
    
    // Apply font size from styles if specified
    if (element.styles['font-size']) {
      const styleFontSize = this.styleProcessor.parseFontSize(element.styles['font-size']);
      if (styleFontSize > 0) {
        fontSize = styleFontSize;
      }
    }
    
    text.fontSize = fontSize;
    
    // Apply font weight with better mapping
    let fontStyle = 'Regular';
    if (element.styles['font-weight']) {
      const weight = element.styles['font-weight'];
      if (weight === 'bold' || weight === 'bolder' || parseInt(weight) >= 700) {
        fontStyle = 'Bold';
      } else if (weight === '500' || weight === 'medium') {
        fontStyle = 'Medium';
      } else if (parseInt(weight) >= 600) {
        fontStyle = 'SemiBold';
      }
    }
    
    // Apply semantic styling
    if (element.tagName.startsWith('h')) {
      fontStyle = 'Bold'; // All headings are bold
    } else if (element.tagName === 'strong' || element.tagName === 'b') {
      fontStyle = 'Bold';
    } else if (element.tagName === 'em' || element.tagName === 'i') {
      // Note: Figma doesn't have italic in Inter, so we'll use Medium
      fontStyle = 'Medium';
    }
    
    try {
      text.fontName = { family: "Inter", style: fontStyle };
    } catch (error) {
      // Fallback to Regular if the style doesn't exist
      text.fontName = { family: "Inter", style: "Regular" };
    }
    
    // Apply text color with better defaults
    let textColor = { r: 0.11, g: 0.11, b: 0.11 }; // Default dark gray
    
    if (element.styles.color) {
      const color = this.styleProcessor.parseColor(element.styles.color);
      if (color) {
        textColor = color;
      }
    }
    
    text.fills = [{ type: 'SOLID', color: textColor }];
    
    // Apply text alignment if specified
    if (element.styles['text-align']) {
      switch (element.styles['text-align']) {
        case 'center':
          text.textAlignHorizontal = 'CENTER';
          break;
        case 'right':
          text.textAlignHorizontal = 'RIGHT';
          break;
        case 'justify':
          text.textAlignHorizontal = 'JUSTIFIED';
          break;
        default:
          text.textAlignHorizontal = 'LEFT';
      }
    }
    
    // Set line height if specified
    if (element.styles['line-height']) {
      const lineHeight = parseFloat(element.styles['line-height']);
      if (!isNaN(lineHeight)) {
        if (lineHeight > 3) {
          // Assume pixel value, convert to percentage
          text.lineHeight = { value: (lineHeight / fontSize) * 100, unit: 'PERCENT' };
        } else {
          // Assume multiplier
          text.lineHeight = { value: lineHeight * 100, unit: 'PERCENT' };
        }
      }
    } else {
      // Set default line height for better readability
      text.lineHeight = { value: 140, unit: 'PERCENT' };
    }
    
    return text;
  }

  async createButtonNode(element: ParsedElement): Promise<FrameNode> {
    const button = figma.createFrame();
    button.name = "Button";

    // Set default button size
    button.resize(120, 40);

    // Apply styling
    this.styleProcessor.applyBasicStyles(button, element);

    // Set default button styling if not specified
    if (!element.styles['background-color']) {
      button.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#007AFF')! }];
    }

    if (!element.styles['border-radius']) {
      button.cornerRadius = 8;
    }

    // Add button text
    const text = figma.createText();
    text.characters = element.textContent || 'Button';
    text.fontSize = 16;
    text.fontName = { family: "Inter", style: "Medium" };
    text.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#FFFFFF')! }];

    // Center text in button
    text.x = (button.width - text.width) / 2;
    text.y = (button.height - text.height) / 2;

    button.appendChild(text);
    return button;
  }

  async createInputNode(element: ParsedElement): Promise<FrameNode> {
    const input = figma.createFrame();
    input.name = element.tagName === 'textarea' ? 'Textarea' : 'Input';

    // Set default input size
    const height = element.tagName === 'textarea' ? 80 : 44;
    input.resize(280, height);

    // Apply styling
    this.styleProcessor.applyBasicStyles(input, element);

    // Set default input styling if not specified
    if (!element.styles['background-color']) {
      input.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#F2F2F7')! }];
    }

    if (!element.styles['border-radius']) {
      input.cornerRadius = 8;
    }

    // Add border
    input.strokes = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#D1D1D6')! }];
    input.strokeWeight = 1;

    // Add placeholder text
    const placeholder = figma.createText();
    const placeholderText = element.attributes.placeholder || element.textContent || 'Enter text...';
    placeholder.characters = placeholderText;
    placeholder.fontSize = 16;
    placeholder.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#8E8E93')! }];
    placeholder.x = 12;
    placeholder.y = element.tagName === 'textarea' ? 12 : (input.height - placeholder.height) / 2;

    input.appendChild(placeholder);
    return input;
  }

  async createImageNode(element: ParsedElement): Promise<RectangleNode> {
    const rect = figma.createRectangle();
    rect.name = "Image Placeholder";

    // Set default image size
    let width = 200;
    let height = 150;

    // Try to get dimensions from attributes
    if (element.attributes.width) {
      width = parseInt(element.attributes.width) || width;
    }
    if (element.attributes.height) {
      height = parseInt(element.attributes.height) || height;
    }

    rect.resize(width, height);

    // Apply styling
    this.styleProcessor.applyBasicStyles(rect, element);

    // Set placeholder styling
    rect.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#E5E5EA')! }];
    rect.strokes = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#D1D1D6')! }];
    rect.strokeWeight = 1;

    return rect;
  }

  async createListNode(element: ParsedElement): Promise<FrameNode> {
    const list = figma.createFrame();
    list.name = element.tagName === 'ol' ? 'Ordered List' : 'Unordered List';

    // Apply styling
    this.styleProcessor.applyBasicStyles(list, element);

    // Set default list styling
    list.resize(300, 100);
    list.fills = [];

    // Create list items
    let yOffset = 0;
    for (let i = 0; i < element.children.length; i++) {
      const child = element.children[i];
      const listItem = await this.createListItemNode(child, element.tagName === 'ol' ? i + 1 : undefined);
      if (listItem) {
        listItem.y = yOffset;
        list.appendChild(listItem);
        yOffset += listItem.height + 8;
      }
    }

    // Adjust list height
    if (yOffset > 0) {
      list.resize(list.width, yOffset);
    }

    return list;
  }

  async createListItemNode(element: ParsedElement, index?: number): Promise<FrameNode> {
    const listItem = figma.createFrame();
    listItem.name = "List Item";
    listItem.resize(280, 24);
    listItem.fills = [];

    // Create bullet or number
    const bullet = figma.createText();
    bullet.characters = index ? `${index}.` : '•';
    bullet.fontSize = 16;
    bullet.fontName = { family: "Inter", style: "Regular" };
    bullet.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#1C1C1E')! }];
    bullet.x = 0;
    bullet.y = 0;

    // Create text content
    const text = figma.createText();
    text.characters = element.textContent || 'List item';
    text.fontSize = 16;
    text.fontName = { family: "Inter", style: "Regular" };
    text.fills = [{ type: 'SOLID', color: this.styleProcessor.parseColor('#1C1C1E')! }];
    text.x = 20;
    text.y = 0;

    listItem.appendChild(bullet);
    listItem.appendChild(text);

    return listItem;
  }
}

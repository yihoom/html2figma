// This plugin creates various UI components based on user selection
// It provides a UI interface for users to choose different component types

/// <reference types="@figma/plugin-typings" />

// Load fonts at startup
async function loadFonts() {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
}

// Show the UI when plugin starts
figma.showUI(__html__, { width: 320, height: 480 });

// Load fonts
loadFonts().catch(err => {
  console.error('Failed to load fonts:', err);
  figma.notify('字体加载失败，部分功能可能受影响');
});

// Define message types for better type safety
interface ParseHtmlMessage {
  type: 'parse-html';
  htmlContent: string;
}

interface CancelMessage {
  type: 'cancel';
}

type PluginMessage = ParseHtmlMessage | CancelMessage;

// HTML parsing interfaces
interface ParsedElement {
  tagName: string;
  textContent?: string;
  attributes: { [key: string]: string };
  styles: { [key: string]: string };
  children: ParsedElement[];
}

interface HtmlParseResult {
  elements: ParsedElement[];
  success: boolean;
  error?: string;
}

// Listen for messages from the UI
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



// Simple HTML Element interface for parsing
interface SimpleElement {
  tagName: string;
  attributes: { [key: string]: string };
  textContent: string;
  children: SimpleElement[];
}

// HTML Parsing Functions
async function parseHtml(htmlContent: string): Promise<HtmlParseResult> {
  try {
    figma.ui.postMessage({ type: 'html-parse-progress', message: '开始解析HTML文档...' });

    // Validate HTML content
    if (!htmlContent || htmlContent.trim().length === 0) {
      return { elements: [], success: false, error: 'HTML内容为空' };
    }

    figma.ui.postMessage({ type: 'html-parse-progress', message: '解析HTML结构...' });

    // Parse HTML using simple regex-based parser
    const elements = parseHtmlString(htmlContent);

    if (elements.length === 0) {
      return { elements: [], success: false, error: '未找到有效的HTML元素，请检查HTML格式' };
    }

    figma.ui.postMessage({ type: 'html-parse-progress', message: '转换为Figma元素...' });

    // Convert to ParsedElement format
    const cssStyles = extractCssStyles(htmlContent);
    const parsedElements = elements.map(el => convertToParseElement(el, cssStyles));

    figma.ui.postMessage({ type: 'html-parse-progress', message: `正在创建 ${parsedElements.length} 个元素...` });

    // Create Figma nodes from parsed elements
    const nodes: SceneNode[] = [];
    let createdCount = 0;

    for (const element of parsedElements) {
      try {
        const node = await createFigmaNodeFromElement(element);
        if (node) {
          nodes.push(node);
          createdCount++;

          // Update progress
          if (createdCount % 5 === 0 || createdCount === parsedElements.length) {
            figma.ui.postMessage({
              type: 'html-parse-progress',
              message: `已创建 ${createdCount}/${parsedElements.length} 个元素...`
            });
          }
        }
      } catch (nodeError) {
        console.warn(`创建元素 ${element.tagName} 时出错:`, nodeError);
        // Continue with other elements
      }
    }

    if (nodes.length === 0) {
      return { elements: parsedElements, success: false, error: '无法创建任何Figma元素，请检查HTML内容' };
    }

    figma.ui.postMessage({ type: 'html-parse-progress', message: '添加到画布...' });

    // Add nodes to the current page
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

function parseHtmlString(html: string): SimpleElement[] {
  try {
    // Extract and parse CSS styles first
    const cssStyles = extractCssStyles(html);

    // Remove comments, scripts, and styles
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Extract body content if present
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      html = bodyMatch[1];
    }

    const elements = parseElements(html, cssStyles);

    // If no elements found in body, try to parse the entire document
    if (elements.length === 0) {
      return parseElements(html, cssStyles);
    }

    return elements;
  } catch (error) {
    console.error('解析HTML字符串时出错:', error);
    return [];
  }
}

function extractCssStyles(html: string): { [selector: string]: { [property: string]: string } } {
  const styles: { [selector: string]: { [property: string]: string } } = {};

  // Extract CSS from <style> tags
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (styleMatches) {
    for (const styleMatch of styleMatches) {
      const cssContent = styleMatch.replace(/<\/?style[^>]*>/gi, '');
      parseCssRules(cssContent, styles);
    }
  }

  return styles;
}

function parseCssRules(css: string, styles: { [selector: string]: { [property: string]: string } }): void {
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

function parseElements(html: string, cssStyles: { [selector: string]: { [property: string]: string } } = {}): SimpleElement[] {
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

    const attributes = parseAttributes(attributesStr);

    const element: SimpleElement = {
      tagName,
      attributes,
      textContent: extractTextContent(content),
      children: parseElements(content, cssStyles)
    };

    elements.push(element);
  }

  return elements;
}

function parseAttributes(attributesStr: string): { [key: string]: string } {
  const attributes: { [key: string]: string } = {};
  const attrRegex = /(\w+)(?:\s*=\s*["']([^"']*)["'])?/g;

  let match;
  while ((match = attrRegex.exec(attributesStr)) !== null) {
    attributes[match[1]] = match[2] || '';
  }

  return attributes;
}

function extractTextContent(html: string): string {
  // Remove HTML tags and get text content
  return html.replace(/<[^>]*>/g, '').trim();
}

function convertToParseElement(element: SimpleElement, cssStyles: { [selector: string]: { [property: string]: string } } = {}): ParsedElement {
  // Combine inline styles with CSS styles
  const inlineStyles = parseInlineStyles(element.attributes.style || '');
  const appliedStyles = applyCssStyles(element, cssStyles, inlineStyles);

  return {
    tagName: element.tagName,
    textContent: element.textContent,
    attributes: element.attributes,
    styles: appliedStyles,
    children: element.children.map(child => convertToParseElement(child, cssStyles))
  };
}

function applyCssStyles(
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

function parseInlineStyles(styleStr: string): { [key: string]: string } {
  const styles: { [key: string]: string } = {};

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



async function createFigmaNodeFromElement(element: ParsedElement): Promise<SceneNode | null> {
  try {
    await loadFonts();

    switch (element.tagName) {
      case 'div':
      case 'section':
      case 'article':
      case 'header':
      case 'footer':
        return await createContainerNode(element);

      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'p':
      case 'span':
        return await createTextNode(element);

      case 'button':
        return await createButtonNode(element);

      case 'input':
      case 'textarea':
        return await createInputNode(element);

      case 'img':
        return await createImageNode(element);

      case 'ul':
      case 'ol':
        return await createListNode(element);

      case 'li':
        return await createListItemNode(element);

      default:
        // For unknown elements, create a generic container
        return await createContainerNode(element);
    }
  } catch (error) {
    console.error('创建Figma节点时出错:', error);
    return null;
  }
}

async function createContainerNode(element: ParsedElement): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = element.tagName.toUpperCase();

  // Apply basic styling first
  applyBasicStyles(frame, element);

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
    const width = parseSize(element.styles.width);
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
      const gap = parseSize(element.styles.gap);
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
    const padding = parseSize(element.styles.padding || '16');
    frame.paddingTop = frame.paddingRight = frame.paddingBottom = frame.paddingLeft = padding;
  }

  // Create child nodes
  if (isFlexContainer) {
    // For flex containers, add children with Auto Layout
    for (const child of element.children) {
      const childNode = await createFigmaNodeFromElement(child);
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
      const childNode = await createFigmaNodeFromElement(child);
      if (childNode) {
        frame.appendChild(childNode);
      }
    }
  } else {
    // For other containers, use manual positioning
    let yOffset = 20; // Start with some padding
    const xOffset = 20;

    for (const child of element.children) {
      const childNode = await createFigmaNodeFromElement(child);
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
    const height = parseSize(element.styles.height);
    if (height > 0) {
      frame.resize(frame.width, height);
    }
  } else if (typeof defaultHeight === 'number') {
    frame.resize(frame.width, defaultHeight);
  }

  return frame;
}

async function createTextNode(element: ParsedElement): Promise<TextNode> {
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
    const styleFontSize = parseFontSize(element.styles['font-size']);
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
    const color = parseColor(element.styles.color);
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

async function createButtonNode(element: ParsedElement): Promise<FrameNode> {
  const button = figma.createFrame();
  button.name = "Button";

  // Set default button size
  button.resize(120, 40);

  // Apply styling
  applyBasicStyles(button, element);

  // Set default button styling if not specified
  if (!element.styles['background-color']) {
    button.fills = [{ type: 'SOLID', color: hexToRgb('#007AFF') }];
  }

  if (!element.styles['border-radius']) {
    button.cornerRadius = 8;
  }

  // Add button text
  const text = figma.createText();
  text.characters = element.textContent || 'Button';
  text.fontSize = 16;
  text.fontName = { family: "Inter", style: "Medium" };
  text.fills = [{ type: 'SOLID', color: hexToRgb('#FFFFFF') }];

  // Center text in button
  text.x = (button.width - text.width) / 2;
  text.y = (button.height - text.height) / 2;

  button.appendChild(text);
  return button;
}

async function createInputNode(element: ParsedElement): Promise<FrameNode> {
  const input = figma.createFrame();
  input.name = element.tagName === 'textarea' ? 'Textarea' : 'Input';

  // Set default input size
  const height = element.tagName === 'textarea' ? 80 : 44;
  input.resize(280, height);

  // Apply styling
  applyBasicStyles(input, element);

  // Set default input styling if not specified
  if (!element.styles['background-color']) {
    input.fills = [{ type: 'SOLID', color: hexToRgb('#F2F2F7') }];
  }

  if (!element.styles['border-radius']) {
    input.cornerRadius = 8;
  }

  // Add border
  input.strokes = [{ type: 'SOLID', color: hexToRgb('#D1D1D6') }];
  input.strokeWeight = 1;

  // Add placeholder text
  const placeholder = figma.createText();
  const placeholderText = element.attributes.placeholder || element.textContent || 'Enter text...';
  placeholder.characters = placeholderText;
  placeholder.fontSize = 16;
  placeholder.fills = [{ type: 'SOLID', color: hexToRgb('#8E8E93') }];
  placeholder.x = 12;
  placeholder.y = element.tagName === 'textarea' ? 12 : (input.height - placeholder.height) / 2;

  input.appendChild(placeholder);
  return input;
}

async function createImageNode(element: ParsedElement): Promise<RectangleNode> {
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
  applyBasicStyles(rect, element);

  // Set placeholder styling
  rect.fills = [{ type: 'SOLID', color: hexToRgb('#E5E5EA') }];
  rect.strokes = [{ type: 'SOLID', color: hexToRgb('#D1D1D6') }];
  rect.strokeWeight = 1;

  return rect;
}

async function createListNode(element: ParsedElement): Promise<FrameNode> {
  const list = figma.createFrame();
  list.name = element.tagName === 'ol' ? 'Ordered List' : 'Unordered List';

  // Apply styling
  applyBasicStyles(list, element);

  // Set default list styling
  list.resize(300, 100);
  list.fills = [];

  // Create list items
  let yOffset = 0;
  for (let i = 0; i < element.children.length; i++) {
    const child = element.children[i];
    const listItem = await createListItemNode(child, element.tagName === 'ol' ? i + 1 : undefined);
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

async function createListItemNode(element: ParsedElement, index?: number): Promise<FrameNode> {
  const listItem = figma.createFrame();
  listItem.name = "List Item";
  listItem.resize(280, 24);
  listItem.fills = [];

  // Create bullet or number
  const bullet = figma.createText();
  bullet.characters = index ? `${index}.` : '•';
  bullet.fontSize = 16;
  bullet.fontName = { family: "Inter", style: "Regular" };
  bullet.fills = [{ type: 'SOLID', color: hexToRgb('#1C1C1E') }];
  bullet.x = 0;
  bullet.y = 0;

  // Create text content
  const text = figma.createText();
  text.characters = element.textContent || 'List item';
  text.fontSize = 16;
  text.fontName = { family: "Inter", style: "Regular" };
  text.fills = [{ type: 'SOLID', color: hexToRgb('#1C1C1E') }];
  text.x = 20;
  text.y = 0;

  listItem.appendChild(bullet);
  listItem.appendChild(text);

  return listItem;
}

// Helper functions for styling
function applyBasicStyles(node: SceneNode, element: ParsedElement): void {
  // Apply width and height if specified
  if (node.type === 'FRAME' || node.type === 'RECTANGLE') {
    const frameNode = node as FrameNode | RectangleNode;

    // Apply width with better handling
    if (element.styles.width) {
      const width = parseSize(element.styles.width);
      if (width > 0) {
        frameNode.resize(width, frameNode.height);
      }
    } else if (element.styles['max-width']) {
      const maxWidth = parseSize(element.styles['max-width']);
      if (maxWidth > 0 && frameNode.width > maxWidth) {
        frameNode.resize(maxWidth, frameNode.height);
      }
    }

    // Apply height with better handling
    if (element.styles.height) {
      const height = parseSize(element.styles.height);
      if (height > 0) {
        frameNode.resize(frameNode.width, height);
      }
    } else if (element.styles['min-height']) {
      const minHeight = parseSize(element.styles['min-height']);
      if (minHeight > 0 && frameNode.height < minHeight) {
        frameNode.resize(frameNode.width, minHeight);
      }
    }

    // Apply background color with gradient support
    if (element.styles['background-color'] || element.styles.background) {
      const bgColor = element.styles['background-color'] || element.styles.background;
      const color = parseColor(bgColor);
      if (color) {
        frameNode.fills = [{ type: 'SOLID', color }];
      }
    }

    // Apply border radius with individual corners
    if (frameNode.type === 'FRAME') {
      const frame = frameNode as FrameNode;

      if (element.styles['border-radius']) {
        const radius = parseSize(element.styles['border-radius']);
        if (radius >= 0) {
          frame.cornerRadius = radius;
        }
      } else {
        // Apply individual corner radii
        if (element.styles['border-top-left-radius']) {
          frame.topLeftRadius = parseSize(element.styles['border-top-left-radius']);
        }
        if (element.styles['border-top-right-radius']) {
          frame.topRightRadius = parseSize(element.styles['border-top-right-radius']);
        }
        if (element.styles['border-bottom-left-radius']) {
          frame.bottomLeftRadius = parseSize(element.styles['border-bottom-left-radius']);
        }
        if (element.styles['border-bottom-right-radius']) {
          frame.bottomRightRadius = parseSize(element.styles['border-bottom-right-radius']);
        }
      }

      // Apply borders
      if (element.styles.border || element.styles['border-width']) {
        const borderWidth = parseSize(element.styles['border-width'] || element.styles.border || '1');
        const borderColor = parseColor(element.styles['border-color'] || '#ddd');

        if (borderWidth > 0 && borderColor) {
          frame.strokes = [{ type: 'SOLID', color: borderColor }];
          frame.strokeWeight = borderWidth;
        }
      }

      // Apply box shadow
      if (element.styles['box-shadow']) {
        const shadow = parseBoxShadow(element.styles['box-shadow']);
        if (shadow) {
          frame.effects = [shadow];
        }
      }

      // Apply padding with better defaults
      const defaultPadding = 0;

      if (element.styles.padding) {
        const padding = parseSize(element.styles.padding);
        frame.paddingTop = frame.paddingRight = frame.paddingBottom = frame.paddingLeft = padding >= 0 ? padding : defaultPadding;
      } else {
        // Apply individual paddings
        frame.paddingTop = element.styles['padding-top'] ? parseSize(element.styles['padding-top']) : defaultPadding;
        frame.paddingRight = element.styles['padding-right'] ? parseSize(element.styles['padding-right']) : defaultPadding;
        frame.paddingBottom = element.styles['padding-bottom'] ? parseSize(element.styles['padding-bottom']) : defaultPadding;
        frame.paddingLeft = element.styles['padding-left'] ? parseSize(element.styles['padding-left']) : defaultPadding;
      }
    }
  }
}

function parseBoxShadow(boxShadow: string): DropShadowEffect | null {
  // Basic box-shadow parsing: "0 2px 10px rgba(0,0,0,0.1)"
  const match = boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px\s+(.+)/);
  if (match) {
    const offsetX = parseInt(match[1]);
    const offsetY = parseInt(match[2]);
    const blur = parseInt(match[3]);
    const color = parseColor(match[4]);

    if (color) {
      return {
        type: 'DROP_SHADOW',
        color: { ...color, a: 0.1 }, // Default alpha
        offset: { x: offsetX, y: offsetY },
        radius: blur,
        visible: true,
        blendMode: 'NORMAL'
      };
    }
  }

  return null;
}

function parseSize(size: string): number {
  if (!size) return 0;

  const value = parseFloat(size);
  if (isNaN(value)) return 0;

  // Convert different units to pixels
  if (size.includes('em')) {
    return value * 16; // 1em = 16px
  } else if (size.includes('rem')) {
    return value * 16; // 1rem = 16px
  } else if (size.includes('%')) {
    return value; // Keep percentage as-is for now
  } else if (size.includes('vh')) {
    return value * 10; // Rough approximation: 1vh ≈ 10px
  } else if (size.includes('vw')) {
    return value * 14; // Rough approximation: 1vw ≈ 14px
  } else if (size.includes('pt')) {
    return value * 1.33; // 1pt = 1.33px
  }

  return value; // Assume pixels or unitless
}

function parseFontSize(fontSize: string): number {
  if (!fontSize) return 16;

  const size = parseFloat(fontSize);
  if (isNaN(size)) {
    // Handle named font sizes
    switch (fontSize.toLowerCase()) {
      case 'xx-small': return 9;
      case 'x-small': return 10;
      case 'small': return 13;
      case 'medium': return 16;
      case 'large': return 18;
      case 'x-large': return 24;
      case 'xx-large': return 32;
      default: return 16;
    }
  }

  // Convert units
  if (fontSize.includes('em')) {
    return size * 16;
  } else if (fontSize.includes('rem')) {
    return size * 16;
  } else if (fontSize.includes('%')) {
    return (size / 100) * 16;
  } else if (fontSize.includes('pt')) {
    return size * 1.33;
  }

  return size;
}

function parseColor(color: string): RGB | null {
  if (!color) return null;

  color = color.trim().toLowerCase();

  // Handle hex colors
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }

  // Handle rgb/rgba colors
  if (color.startsWith('rgb')) {
    const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/);
    if (match) {
      return {
        r: parseInt(match[1]) / 255,
        g: parseInt(match[2]) / 255,
        b: parseInt(match[3]) / 255
      };
    }
  }

  // Handle hsl/hsla colors (basic conversion)
  if (color.startsWith('hsl')) {
    const match = color.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*[\d.]+)?\s*\)/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      return hslToRgb(h, s, l);
    }
  }

  // Handle named colors (expanded set)
  const namedColors: { [key: string]: string } = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'silver': '#c0c0c0',
    'gray': '#808080',
    'grey': '#808080',
    'maroon': '#800000',
    'olive': '#808000',
    'lime': '#00ff00',
    'aqua': '#00ffff',
    'teal': '#008080',
    'navy': '#000080',
    'fuchsia': '#ff00ff',
    'purple': '#800080',
    'orange': '#ffa500',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'darkgray': '#a9a9a9',
    'darkgrey': '#a9a9a9',
    'lightgray': '#d3d3d3',
    'lightgrey': '#d3d3d3',
    'transparent': '#ffffff'
  };

  if (namedColors[color]) {
    return hexToRgb(namedColors[color]);
  }

  return null;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255) / 255,
    g: Math.round(g * 255) / 255,
    b: Math.round(b * 255) / 255
  };
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

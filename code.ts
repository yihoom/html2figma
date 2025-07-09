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
interface CreateComponentMessage {
  type: 'create-component';
  componentType: string;
  options: ComponentOptions;
}

interface CancelMessage {
  type: 'cancel';
}

type PluginMessage = CreateComponentMessage | CancelMessage;

interface ComponentOptions {
  // Button options
  text?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  
  // Card options
  title?: string;
  description?: string;
  
  // Input options
  placeholder?: string;
  
  // Avatar options
  initials?: string;
  size?: number;
}

// Listen for messages from the UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'create-component') {
    await createComponent(msg.componentType, msg.options);
  } else if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

async function createComponent(type: string, options: ComponentOptions) {
  try {
    // Ensure fonts are loaded
    await loadFonts();
    
    const nodes: SceneNode[] = [];
    
    switch (type) {
      case 'button':
        nodes.push(await createButton(options));
        break;
      case 'card':
        nodes.push(await createCard(options));
        break;
      case 'input':
        nodes.push(await createInput(options));
        break;
      case 'badge':
        nodes.push(await createBadge(options));
        break;
      case 'avatar':
        nodes.push(await createAvatar(options));
        break;
      default:
        figma.notify('Unknown component type');
        return;
    }

    // Add to current page and select
    nodes.forEach(node => figma.currentPage.appendChild(node));
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
    
    figma.notify(`${type.charAt(0).toUpperCase() + type.slice(1)} component created!`);
  } catch (error) {
    console.error('Error creating component:', error);
    figma.notify('创建组件时出错，请重试');
  }
}

async function createButton(options: ComponentOptions): Promise<FrameNode> {
  const button = figma.createFrame();
  button.name = "Button";
  button.resize(options.width || 120, options.height || 40);
  
  // Set button styling
  button.cornerRadius = options.borderRadius || 8;
  button.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.backgroundColor || '#007AFF')
  }];
  
  // Add shadow
  button.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 4,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Add text
  const text = figma.createText();
  text.characters = options.text || 'Button';
  text.fontSize = 16;
  text.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.textColor || '#FFFFFF')
  }];
  
  // Center text in button
  text.x = (button.width - text.width) / 2;
  text.y = (button.height - text.height) / 2;
  
  button.appendChild(text);
  return button;
}

async function createCard(options: ComponentOptions): Promise<FrameNode> {
  const card = figma.createFrame();
  card.name = "Card";
  card.resize(options.width || 280, options.height || 200);
  
  // Set card styling
  card.cornerRadius = options.borderRadius || 12;
  card.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.backgroundColor || '#FFFFFF')
  }];
  
  // Add shadow
  card.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 4 },
    radius: 12,
    visible: true,
    blendMode: 'NORMAL'
  }];
  
  // Add padding
  card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 20;
  
  // Add title
  const title = figma.createText();
  title.characters = options.title || 'Card Title';
  title.fontSize = 20;
  title.fontName = { family: "Inter", style: "Bold" };
  title.fills = [{
    type: 'SOLID',
    color: hexToRgb('#1C1C1E')
  }];
  title.x = 20;
  title.y = 20;
  
  // Add description
  const description = figma.createText();
  description.characters = options.description || 'This is a card description that provides more details about the card content.';
  description.fontSize = 14;
  description.fills = [{
    type: 'SOLID',
    color: hexToRgb('#8E8E93')
  }];
  description.x = 20;
  description.y = 55;
  description.resize(card.width - 40, description.height);
  
  card.appendChild(title);
  card.appendChild(description);
  return card;
}

async function createInput(options: ComponentOptions): Promise<FrameNode> {
  const input = figma.createFrame();
  input.name = "Input Field";
  input.resize(options.width || 280, options.height || 44);
  
  // Set input styling
  input.cornerRadius = options.borderRadius || 8;
  input.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.backgroundColor || '#F2F2F7')
  }];
  
  // Add stroke
  input.strokes = [{
    type: 'SOLID',
    color: hexToRgb('#D1D1D6')
  }];
  input.strokeWeight = 1;
  
  // Add placeholder text
  const placeholder = figma.createText();
  placeholder.characters = options.placeholder || 'Enter text...';
  placeholder.fontSize = 16;
  placeholder.fills = [{
    type: 'SOLID',
    color: hexToRgb('#8E8E93')
  }];
  placeholder.x = 12;
  placeholder.y = (input.height - placeholder.height) / 2;
  
  input.appendChild(placeholder);
  return input;
}

async function createBadge(options: ComponentOptions): Promise<FrameNode> {
  const badge = figma.createFrame();
  badge.name = "Badge";
  
  const text = figma.createText();
  text.characters = options.text || 'Badge';
  text.fontSize = 12;
  text.fontName = { family: "Inter", style: "Medium" };
  text.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.textColor || '#FFFFFF')
  }];
  
  // Size badge based on text
  badge.resize(text.width + 16, text.height + 8);
  badge.cornerRadius = badge.height / 2;
  badge.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.backgroundColor || '#34C759')
  }];
  
  // Center text
  text.x = 8;
  text.y = 4;
  
  badge.appendChild(text);
  return badge;
}

async function createAvatar(options: ComponentOptions): Promise<FrameNode> {
  const avatar = figma.createFrame();
  avatar.name = "Avatar";
  const size = options.size || 48;
  avatar.resize(size, size);
  avatar.cornerRadius = size / 2;
  
  // Set background color
  avatar.fills = [{
    type: 'SOLID',
    color: hexToRgb(options.backgroundColor || '#007AFF')
  }];
  
  // Add initials
  const initials = figma.createText();
  initials.characters = options.initials || 'AB';
  initials.fontSize = size * 0.4;
  initials.fontName = { family: "Inter", style: "Medium" };
  initials.fills = [{
    type: 'SOLID',
    color: hexToRgb('#FFFFFF')
  }];
  
  // Center initials
  initials.x = (avatar.width - initials.width) / 2;
  initials.y = (avatar.height - initials.height) / 2;
  
  avatar.appendChild(initials);
  return avatar;
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

import { RGB, DropShadowEffect, ParsedElement } from '../types';

export class StyleProcessor {
  parseSize(size: string): number {
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

  parseFontSize(fontSize: string): number {
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

  parseColor(color: string): RGB | null {
    if (!color) return null;
    
    color = color.trim().toLowerCase();
    
    // Handle hex colors
    if (color.startsWith('#')) {
      return this.hexToRgb(color);
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
        return this.hslToRgb(h, s, l);
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
      return this.hexToRgb(namedColors[color]);
    }
    
    return null;
  }

  private hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  }

  private hslToRgb(h: number, s: number, l: number): RGB {
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

  parseBoxShadow(boxShadow: string): DropShadowEffect | null {
    // Basic box-shadow parsing: "0 2px 10px rgba(0,0,0,0.1)"
    const match = boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px\s+(.+)/);
    if (match) {
      const offsetX = parseInt(match[1]);
      const offsetY = parseInt(match[2]);
      const blur = parseInt(match[3]);
      const color = this.parseColor(match[4]);
      
      if (color) {
        return {
          type: 'DROP_SHADOW',
          color: { r: color.r, g: color.g, b: color.b, a: 0.1 }, // Default alpha
          offset: { x: offsetX, y: offsetY },
          radius: blur,
          visible: true,
          blendMode: 'NORMAL'
        };
      }
    }
    
    return null;
  }

  applyBasicStyles(node: SceneNode, element: ParsedElement): void {
    // Apply width and height if specified
    if (node.type === 'FRAME' || node.type === 'RECTANGLE') {
      const frameNode = node as FrameNode | RectangleNode;
      
      // Apply width with better handling
      if (element.styles.width) {
        const width = this.parseSize(element.styles.width);
        if (width > 0) {
          frameNode.resize(width, frameNode.height);
        }
      } else if (element.styles['max-width']) {
        const maxWidth = this.parseSize(element.styles['max-width']);
        if (maxWidth > 0 && frameNode.width > maxWidth) {
          frameNode.resize(maxWidth, frameNode.height);
        }
      }
      
      // Apply height with better handling
      if (element.styles.height) {
        const height = this.parseSize(element.styles.height);
        if (height > 0) {
          frameNode.resize(frameNode.width, height);
        }
      } else if (element.styles['min-height']) {
        const minHeight = this.parseSize(element.styles['min-height']);
        if (minHeight > 0 && frameNode.height < minHeight) {
          frameNode.resize(frameNode.width, minHeight);
        }
      }
      
      // Apply background color with gradient support
      if (element.styles['background-color'] || element.styles.background) {
        const bgColor = element.styles['background-color'] || element.styles.background;
        const color = this.parseColor(bgColor);
        if (color) {
          frameNode.fills = [{ type: 'SOLID', color }];
        }
      }
      
      // Apply border radius with individual corners
      if (frameNode.type === 'FRAME') {
        const frame = frameNode as FrameNode;
        
        if (element.styles['border-radius']) {
          const radius = this.parseSize(element.styles['border-radius']);
          if (radius >= 0) {
            frame.cornerRadius = radius;
          }
        } else {
          // Apply individual corner radii
          if (element.styles['border-top-left-radius']) {
            frame.topLeftRadius = this.parseSize(element.styles['border-top-left-radius']);
          }
          if (element.styles['border-top-right-radius']) {
            frame.topRightRadius = this.parseSize(element.styles['border-top-right-radius']);
          }
          if (element.styles['border-bottom-left-radius']) {
            frame.bottomLeftRadius = this.parseSize(element.styles['border-bottom-left-radius']);
          }
          if (element.styles['border-bottom-right-radius']) {
            frame.bottomRightRadius = this.parseSize(element.styles['border-bottom-right-radius']);
          }
        }
        
        // Apply borders
        if (element.styles.border || element.styles['border-width']) {
          const borderWidth = this.parseSize(element.styles['border-width'] || element.styles.border || '1');
          const borderColor = this.parseColor(element.styles['border-color'] || '#ddd');
          
          if (borderWidth > 0 && borderColor) {
            frame.strokes = [{ type: 'SOLID', color: borderColor }];
            frame.strokeWeight = borderWidth;
          }
        }
        
        // Apply box shadow
        if (element.styles['box-shadow']) {
          const shadow = this.parseBoxShadow(element.styles['box-shadow']);
          if (shadow) {
            frame.effects = [shadow];
          }
        }
        
        // Apply padding with better defaults
        const defaultPadding = 0;
        
        if (element.styles.padding) {
          const padding = this.parseSize(element.styles.padding);
          frame.paddingTop = frame.paddingRight = frame.paddingBottom = frame.paddingLeft = padding >= 0 ? padding : defaultPadding;
        } else {
          // Apply individual paddings
          frame.paddingTop = element.styles['padding-top'] ? this.parseSize(element.styles['padding-top']) : defaultPadding;
          frame.paddingRight = element.styles['padding-right'] ? this.parseSize(element.styles['padding-right']) : defaultPadding;
          frame.paddingBottom = element.styles['padding-bottom'] ? this.parseSize(element.styles['padding-bottom']) : defaultPadding;
          frame.paddingLeft = element.styles['padding-left'] ? this.parseSize(element.styles['padding-left']) : defaultPadding;
        }
      }
    }
  }
}

// 消息类型定义
export interface ParseHtmlMessage {
  type: 'parse-html';
  htmlContent: string;
}

export interface CancelMessage {
  type: 'cancel';
}

export type PluginMessage = ParseHtmlMessage | CancelMessage;

// HTML解析相关类型
export interface ParsedElement {
  tagName: string;
  textContent?: string;
  attributes: { [key: string]: string };
  styles: { [key: string]: string };
  children: ParsedElement[];
}

export interface SimpleElement {
  tagName: string;
  attributes: { [key: string]: string };
  textContent: string;
  children: SimpleElement[];
}

export interface HtmlParseResult {
  elements: ParsedElement[];
  success: boolean;
  error?: string;
}

// 颜色类型
export interface RGB {
  r: number;
  g: number;
  b: number;
}

// 阴影效果类型
export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  color: RGB & { a: number };
  offset: { x: number; y: number };
  radius: number;
  visible: boolean;
  blendMode: 'NORMAL';
}

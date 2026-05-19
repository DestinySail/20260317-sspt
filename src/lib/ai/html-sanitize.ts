const HTML_CODE_FENCE_START = /^\s*```(?:html)?\s*/i;
const HTML_CODE_FENCE_END = /\s*```\s*$/;

export function stripHtmlCodeFence(html: string): string {
  return html.replace(HTML_CODE_FENCE_START, "").replace(HTML_CODE_FENCE_END, "");
}

export function findHtmlStart(text: string):
  | { index: number; contentStart: number }
  | null {
  const codeFenceMatch = text.match(/```html\s*/i);
  if (codeFenceMatch?.index !== undefined) {
    return {
      index: codeFenceMatch.index,
      contentStart: codeFenceMatch.index + codeFenceMatch[0].length,
    };
  }

  const doctypeMatch = text.match(/<!DOCTYPE/i);
  if (doctypeMatch?.index !== undefined) {
    return {
      index: doctypeMatch.index,
      contentStart: doctypeMatch.index,
    };
  }

  const htmlMatch = text.match(/<html/i);
  if (htmlMatch?.index !== undefined) {
    return {
      index: htmlMatch.index,
      contentStart: htmlMatch.index,
    };
  }

  return null;
}

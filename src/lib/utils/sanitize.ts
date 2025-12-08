import DOMPurify from "isomorphic-dompurify";

// Configurar DOMPurify com opções seguras
DOMPurify.addHook("afterSanitizeAttributes", function (node) {
  // Remover event handlers potencialmente perigosos
  if (node instanceof Element) {
    for (const attr of Array.from(node.attributes)) {
      if (/^on/.test(attr.name)) {
        node.removeAttribute(attr.name);
      }
    }
    
    // Remover hrefs perigosos
    if (node.tagName === "A" && node instanceof HTMLAnchorElement) {
      const href = node.getAttribute("href");
      if (href && !/^https?:\/\/|\/|#/.test(href)) {
        node.removeAttribute("href");
      }
    }
  }
});

/**
 * Sanitiza conteúdo HTML para prevenir XSS
 * @param content - Conteúdo HTML a ser sanitizado
 * @returns Conteúdo HTML seguro
 */
export function sanitizeHtml(content: string): string {
  if (!content) return "";
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ol', 'ul', 'li', 'blockquote', 'a', 'img', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'target', 'rel'
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onmouseover', 'onload', 'onerror', 'onfocus', 'onblur']
  });
}

// Exportar também como padrão para compatibilidade
export default sanitizeHtml;
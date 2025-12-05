export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

export function extractBpmnXmlFromText(text: string): string | null {
  // Try to extract BPMN XML from markdown code blocks
  const xmlBlockMatch = text.match(/```xml\n([\s\S]*?)\n```/);
  if (xmlBlockMatch) {
    return xmlBlockMatch[1].trim();
  }

  // Try to extract raw XML
  const xmlMatch = text.match(/<\?xml[\s\S]*?<\/bpmn.*?definitions>/);
  if (xmlMatch) {
    return xmlMatch[0];
  }

  // Check if the entire text looks like XML
  if (text.trim().startsWith('<?xml') || text.trim().startsWith('<bpmn')) {
    return text.trim();
  }

  return null;
}

export function validateBpmnXml(xml: string): boolean {
  try {
    // Basic structure checks
    if (!xml || xml.trim().length === 0) {
      return false;
    }

    // Must have XML declaration or start with bpmn tag
    const trimmed = xml.trim();
    if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<bpmn')) {
      return false;
    }

    // Must have closing definitions tag for complete XML
    if (!trimmed.includes('</bpmn:definitions>') && !trimmed.includes('</definitions>')) {
      console.warn('⚠️ BPMN XML missing closing definitions tag - incomplete');
      return false;
    }

    // Parse XML to check for syntax errors
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('❌ XML parsing error:', parserError.textContent);
      return false;
    }

    // Check if it contains BPMN elements
    const hasBpmn = xml.includes('bpmn') || xml.includes('BPMN');
    if (!hasBpmn) {
      console.warn('⚠️ XML does not contain BPMN elements');
    }

    return hasBpmn;
  } catch (error) {
    console.error('❌ Error validating BPMN XML:', error);
    return false;
  }
}

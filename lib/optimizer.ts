import { ChatMessage, TokenOptimizationOptions } from './types';

/**
 * Token Compressor & Optimizer inspired by 9Router RTK Token Saver
 */
export function optimizeMessages(
  messages: ChatMessage[],
  options: TokenOptimizationOptions = {}
): { optimizedMessages: ChatMessage[]; charsSaved: number } {
  let originalLength = 0;
  let newLength = 0;

  const optimizedMessages = messages.map((msg) => {
    let contentStr = '';
    if (typeof msg.content === 'string') {
      contentStr = msg.content;
      originalLength += contentStr.length;

      if (options.enableCompression) {
        contentStr = compressText(contentStr);
      }
      newLength += contentStr.length;
      return { ...msg, content: contentStr };
    } else if (Array.isArray(msg.content)) {
      const newArray = msg.content.map((part) => {
        if (part.type === 'text' && part.text) {
          originalLength += part.text.length;
          let text = part.text;
          if (options.enableCompression) {
            text = compressText(text);
          }
          newLength += text.length;
          return { ...part, text };
        }
        return part;
      });
      return { ...msg, content: newArray };
    }
    return msg;
  });

  // Apply Caveman Mode if requested (drastically saves output tokens by curtailing AI verbosity)
  if (options.cavemanMode) {
    const cavemanPrompt =
      'SYSTEM DIRECTIVE: Terse / Caveman Mode enabled. Be exceptionally direct, concise, and code-focused. Eliminate conversational filler, pleasantries, apologies, and duplicate code restatements. Provide exact code diffs and concise technical answers only.';

    const systemIndex = optimizedMessages.findIndex((m) => m.role === 'system');
    if (systemIndex >= 0) {
      const existing = optimizedMessages[systemIndex];
      if (typeof existing.content === 'string') {
        optimizedMessages[systemIndex] = {
          ...existing,
          content: `${existing.content}\n\n${cavemanPrompt}`,
        };
      }
    } else {
      optimizedMessages.unshift({
        role: 'system',
        content: cavemanPrompt,
      });
    }
  }

  const charsSaved = Math.max(0, originalLength - newLength);
  return { optimizedMessages, charsSaved };
}

/**
 * Compresses redundant whitespace, excessive newlines, and repetitive delimiters
 */
export function compressText(input: string): string {
  return (
    input
      // Collapse 3 or more newlines into 2
      .replace(/\n{3,}/g, '\n\n')
      // Strip trailing whitespace per line
      .replace(/[ \t]+$/gm, '')
      // Compress long repetitive lines like '------------------' or '=================='
      .replace(/([=\-_#*~]){8,}/g, '$1$1$1$1')
      // Strip duplicate space sequences in regular text (while preserving indentation at line start)
      .replace(/(?<!^)[ \t]{2,}/gm, ' ')
  );
}

/**
 * Estimate tokens saved (~4 characters per token)
 */
export function estimateTokensSaved(charsSaved: number): number {
  return Math.round(charsSaved / 4);
}

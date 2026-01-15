/**
 * Claude Content Script
 * Extracts conversation from claude.ai
 */

(function() {
  'use strict';

  /**
   * Extract all messages from Claude conversation
   * @returns {Array<{role: string, content: string}>}
   */
  function extractConversation() {
    const messages = [];
    
    // Claude uses specific class patterns for messages
    // Human messages and AI responses have different containers
    const humanMessages = document.querySelectorAll('[data-testid="human-turn"]');
    const aiMessages = document.querySelectorAll('[data-testid="ai-turn"]');
    
    // Alternative selectors if data-testid not present
    const allMessages = document.querySelectorAll('.font-claude-message, .font-user-message, [class*="ConversationItem"]');
    
    if (humanMessages.length > 0 || aiMessages.length > 0) {
      // Combine and sort by position in DOM
      const allTurns = [...document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]')];
      
      allTurns.forEach((turn) => {
        const isHuman = turn.getAttribute('data-testid') === 'human-turn';
        const contentElement = turn.querySelector('.whitespace-pre-wrap, .prose, p');
        
        if (contentElement) {
          messages.push({
            role: isHuman ? 'user' : 'assistant',
            content: contentElement.innerText.trim()
          });
        }
      });
    } else {
      // Fallback: try to find messages by structure
      const conversationContainer = document.querySelector('[class*="conversation"], main');
      if (conversationContainer) {
        const messageBlocks = conversationContainer.querySelectorAll('[class*="message"], [class*="turn"]');
        
        messageBlocks.forEach((block) => {
          const text = block.innerText.trim();
          if (text) {
            // Detect role by class or position
            const isUser = block.className.includes('human') || 
                          block.className.includes('user') ||
                          block.querySelector('[class*="human"]');
            
            messages.push({
              role: isUser ? 'user' : 'assistant',
              content: text
            });
          }
        });
      }
    }
    
    return messages;
  }

  /**
   * Get conversation title
   * @returns {string}
   */
  function getConversationTitle() {
    // Try sidebar active conversation
    const titleElement = document.querySelector('[class*="ConversationTitle"]') ||
                        document.querySelector('h1') ||
                        document.querySelector('title');
    
    if (titleElement) {
      const title = titleElement.innerText || titleElement.textContent;
      if (title && !title.includes('Claude')) {
        return title.trim().substring(0, 100);
      }
    }
    
    return `Claude-${new Date().toISOString().split('T')[0]}`;
  }

  /**
   * Get current conversation URL
   * @returns {string}
   */
  function getConversationUrl() {
    return window.location.href;
  }

  /**
   * Format conversation as Markdown
   * @param {Array<{role: string, content: string}>} messages
   * @returns {string}
   */
  function formatAsMarkdown(messages) {
    let markdown = '';
    
    messages.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? '**Human**' : '**Claude**';
      markdown += `### ${roleLabel}\n\n${msg.content}\n\n---\n\n`;
    });
    
    return markdown;
  }

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractConversation') {
      try {
        const messages = extractConversation();
        const title = getConversationTitle();
        const url = getConversationUrl();
        const markdown = formatAsMarkdown(messages);
        
        sendResponse({
          success: true,
          data: {
            title: title,
            url: url,
            messages: messages,
            markdown: markdown,
            source: 'Claude',
            extractedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      }
    }
    
    return true;
  });

  console.log('[SessionVault] Claude content script loaded');
})();

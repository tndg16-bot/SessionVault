/**
 * Gemini Content Script
 * Extracts conversation from gemini.google.com
 */

(function() {
  'use strict';

  /**
   * Extract all messages from Gemini conversation
   * @returns {Array<{role: string, content: string}>}
   */
  function extractConversation() {
    const messages = [];
    
    // Gemini uses specific query/response containers
    const queryElements = document.querySelectorAll('.query-content, [class*="query"], user-query');
    const responseElements = document.querySelectorAll('.response-content, [class*="response"], model-response');
    
    // Alternative: look for message containers
    const messageContainers = document.querySelectorAll(
      '[class*="conversation-turn"], ' +
      '[class*="message-content"], ' +
      '.chat-message'
    );
    
    if (messageContainers.length > 0) {
      messageContainers.forEach((container) => {
        const isUser = container.className.includes('user') || 
                      container.className.includes('query') ||
                      container.querySelector('[class*="user"]');
        
        // Get text content, excluding UI elements
        const contentElement = container.querySelector('.markdown-content, .text-content, p') || container;
        const content = contentElement.innerText.trim();
        
        if (content && content.length > 0) {
          messages.push({
            role: isUser ? 'user' : 'assistant',
            content: content
          });
        }
      });
    } else {
      // Fallback: try to match query/response pairs
      const allElements = document.querySelectorAll('[data-message-id], [class*="turn"]');
      
      allElements.forEach((el) => {
        const text = el.innerText.trim();
        if (text) {
          const isUser = el.getAttribute('data-author-role') === 'user' ||
                        el.className.includes('user');
          
          messages.push({
            role: isUser ? 'user' : 'assistant',
            content: text
          });
        }
      });
    }
    
    return messages;
  }

  /**
   * Get conversation title
   * @returns {string}
   */
  function getConversationTitle() {
    const titleElement = document.querySelector('.conversation-title') ||
                        document.querySelector('[class*="chat-title"]') ||
                        document.querySelector('h1');
    
    if (titleElement) {
      const title = titleElement.innerText || titleElement.textContent;
      if (title && !title.includes('Gemini')) {
        return title.trim().substring(0, 100);
      }
    }
    
    return `Gemini-${new Date().toISOString().split('T')[0]}`;
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
      const roleLabel = msg.role === 'user' ? '**User**' : '**Gemini**';
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
            source: 'Gemini',
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

  console.log('[SessionVault] Gemini content script loaded');
})();

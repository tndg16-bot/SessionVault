/**
 * Google AI Studio Content Script
 * Extracts conversation from aistudio.google.com
 */

(function() {
  'use strict';

  /**
   * Extract all messages from Google AI Studio conversation
   * @returns {Array<{role: string, content: string}>}
   */
  function extractConversation() {
    const messages = [];
    
    // AI Studio typically uses mat- prefixed Angular components
    const turnContainers = document.querySelectorAll(
      '[class*="chat-turn"], ' +
      '[class*="message-row"], ' +
      'mat-card[class*="message"], ' +
      '.prompt-response-pair'
    );
    
    if (turnContainers.length > 0) {
      turnContainers.forEach((container) => {
        // Check for user/model indicators
        const isUser = container.className.includes('user') ||
                      container.className.includes('prompt') ||
                      container.querySelector('[class*="user-icon"]') ||
                      container.querySelector('[class*="prompt"]');
        
        // Get content
        const contentElement = container.querySelector(
          '.message-content, ' +
          '.text-content, ' +
          '[class*="markdown"], ' +
          'p'
        ) || container;
        
        const content = contentElement.innerText.trim();
        
        if (content && content.length > 0) {
          messages.push({
            role: isUser ? 'user' : 'assistant',
            content: content
          });
        }
      });
    } else {
      // Fallback: look for textarea inputs and response areas
      const promptArea = document.querySelector('textarea, [contenteditable="true"]');
      const responseArea = document.querySelector('[class*="response"], [class*="output"]');
      
      // Try to find historical messages in any container
      const anyMessages = document.querySelectorAll('[class*="history"] > div, [class*="chat"] > div');
      
      anyMessages.forEach((el, index) => {
        const text = el.innerText.trim();
        if (text && text.length > 10) {
          messages.push({
            role: index % 2 === 0 ? 'user' : 'assistant',
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
    // Try to get from page title or project name
    const titleElement = document.querySelector('[class*="project-name"]') ||
                        document.querySelector('.title') ||
                        document.querySelector('h1');
    
    if (titleElement) {
      const title = titleElement.innerText || titleElement.textContent;
      if (title && !title.includes('AI Studio') && title.length > 0) {
        return title.trim().substring(0, 100);
      }
    }
    
    return `AIStudio-${new Date().toISOString().split('T')[0]}`;
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
      const roleLabel = msg.role === 'user' ? '**User**' : '**Model**';
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
            source: 'GoogleAIStudio',
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

  console.log('[SessionVault] Google AI Studio content script loaded');
})();

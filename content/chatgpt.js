/**
 * ChatGPT Content Script
 * Extracts conversation from chat.openai.com
 */

(function() {
  'use strict';

  /**
   * Extract all messages from ChatGPT conversation
   * @returns {Array<{role: string, content: string}>}
   */
  function extractConversation() {
    const messages = [];
    
    // Get all message elements with role attribute
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    console.log(`[SessionVault] Found ${messageElements.length} message elements`);
    
    messageElements.forEach((element, index) => {
      const role = element.getAttribute('data-message-author-role');
      // Use innerText directly from the element
      const content = element.innerText.trim();
      
      console.log(`[SessionVault] Message ${index}: role=${role}, length=${content.length}`);
      
      if (content && content.length > 0) {
        messages.push({
          role: role === 'user' ? 'user' : 'assistant',
          content: content
        });
      }
    });
    
    console.log(`[SessionVault] Extracted ${messages.length} valid messages`);
    return messages;
  }

  /**
   * Get conversation title from page
   * @returns {string}
   */
  function getConversationTitle() {
    // Try to get title from the active conversation in sidebar
    const titleElement = document.querySelector('nav [class*="active"] .truncate') ||
                        document.querySelector('h1') ||
                        document.querySelector('title');
    
    if (titleElement) {
      const title = titleElement.innerText || titleElement.textContent;
      if (title && title !== 'ChatGPT') {
        return title.trim();
      }
    }
    
    return `ChatGPT-${new Date().toISOString().split('T')[0]}`;
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
      const roleLabel = msg.role === 'user' ? '**User**' : '**Assistant**';
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
            source: 'ChatGPT',
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
    
    // Return true to indicate async response
    return true;
  });

  // Notify that content script is loaded
  console.log('[SessionVault] ChatGPT content script loaded');
})();

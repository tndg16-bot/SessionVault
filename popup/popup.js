/**
 * SessionVault Popup Script
 */

// Default settings
const DEFAULT_SETTINGS = {
  vaultName: 'papa-notes',
  folderPath: 'SessionVault-logs',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'gemma3:1b',
  obsidianApiKey: 'e02a92151916c4bad4894534f03c58f745d44bf5fa6e0c21fe77c8dd6acce56e',
  includeSummary: true,
  includeMermaid: false,
  showPreview: true
};

// Version info
const CURRENT_VERSION = '1.0.0';
const GITHUB_API_URL = 'https://api.github.com/repos/tndg16-bot/SessionVault/releases/latest';

// State
let currentData = null;

// DOM Elements
const elements = {
  status: document.getElementById('status'),
  statusText: document.getElementById('statusText'),
  previewSection: document.getElementById('previewSection'),
  preview: document.getElementById('preview'),
  extractBtn: document.getElementById('extractBtn'),
  saveBtn: document.getElementById('saveBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  vaultName: document.getElementById('vaultName'),
  folderPath: document.getElementById('folderPath'),
  ollamaEndpoint: document.getElementById('ollamaEndpoint'),
  ollamaModel: document.getElementById('ollamaModel'),
  includeSummary: document.getElementById('includeSummary'),
  includeMermaid: document.getElementById('includeMermaid'),
  showPreview: document.getElementById('showPreview')
};

/**
 * Initialize popup
 */
async function init() {
  await loadSettings();
  checkCurrentTab();
  setupEventListeners();
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = { ...DEFAULT_SETTINGS, ...result.settings };

    elements.vaultName.value = settings.vaultName;
    elements.folderPath.value = settings.folderPath;
    elements.ollamaEndpoint.value = settings.ollamaEndpoint;
    elements.ollamaModel.value = settings.ollamaModel;
    elements.includeSummary.checked = settings.includeSummary;
    elements.includeMermaid.checked = settings.includeMermaid;
    elements.showPreview.checked = settings.showPreview;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  const settings = {
    vaultName: elements.vaultName.value || DEFAULT_SETTINGS.vaultName,
    folderPath: elements.folderPath.value || DEFAULT_SETTINGS.folderPath,
    ollamaEndpoint: elements.ollamaEndpoint.value || DEFAULT_SETTINGS.ollamaEndpoint,
    ollamaModel: elements.ollamaModel.value || DEFAULT_SETTINGS.ollamaModel,
    includeSummary: elements.includeSummary.checked,
    includeMermaid: elements.includeMermaid.checked,
    showPreview: elements.showPreview.checked
  };

  try {
    await chrome.storage.local.set({ settings });
    updateStatus('ready', '設定を保存しました');
  } catch (error) {
    updateStatus('error', '設定の保存に失敗しました');
    console.error('Failed to save settings:', error);
  }
}

/**
 * Check if current tab is a supported site
 */
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      updateStatus('error', 'タブ情報を取得できません');
      return;
    }

    const supportedSites = [
      { pattern: /chat\.openai\.com|chatgpt\.com/, name: 'ChatGPT' },
      { pattern: /claude\.ai/, name: 'Claude' },
      { pattern: /gemini\.google\.com/, name: 'Gemini' },
      { pattern: /aistudio\.google\.com/, name: 'Google AI Studio' }
    ];

    const site = supportedSites.find(s => s.pattern.test(tab.url));

    if (site) {
      updateStatus('ready', `${site.name} - 準備完了`);
      elements.extractBtn.disabled = false;
    } else {
      updateStatus('error', '対応サイトではありません');
      elements.extractBtn.disabled = true;
    }
  } catch (error) {
    updateStatus('error', 'エラーが発生しました');
    console.error('Tab check error:', error);
  }
}

/**
 * Update status display
 */
function updateStatus(state, message) {
  elements.status.className = `status ${state}`;
  elements.statusText.textContent = message;
}

/**
 * Extract conversation from current tab
 */
async function extractConversation() {
  updateStatus('', '会話を取得中...');
  elements.extractBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab ? tab.id : null;

    if (!tabId) {
      throw new Error('アクティブなタブが見つかりません');
    }

    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'extractConversation'
    });

    if (response?.success) {
      currentData = response.data;

      // Show preview if enabled
      if (elements.showPreview.checked) {
        showPreview(currentData);
      }

      updateStatus('ready', `${currentData.messages.length}件のメッセージを取得`);
      elements.saveBtn.disabled = false;
    } else {
      throw new Error(response?.error || '会話の取得に失敗しました');
    }
  } catch (error) {
    updateStatus('error', error.message);
    console.error('Extraction error:', error);
  } finally {
    elements.extractBtn.disabled = false;
  }
}

/**
 * Show preview of extracted data
 */
function showPreview(data) {
  elements.previewSection.classList.remove('hidden');

  let previewText = `📌 ${data.title}\n`;
  previewText += `🔗 ${data.url}\n`;
  previewText += `📝 ${data.messages.length}件のメッセージ\n\n`;

  // Show first few messages
  const maxPreview = 3;
  data.messages.slice(0, maxPreview).forEach((msg, i) => {
    const role = msg.role === 'user' ? '👤' : '🤖';
    const content = msg.content.substring(0, 100);
    previewText += `${role} ${content}${msg.content.length > 100 ? '...' : ''}\n\n`;
  });

  if (data.messages.length > maxPreview) {
    previewText += `... 他 ${data.messages.length - maxPreview}件`;
  }

  elements.preview.textContent = previewText;
}

/**
 * Save to Obsidian via Local REST API
 */
async function saveToObsidian() {
  if (!currentData) {
    updateStatus('error', '保存するデータがありません');
    return;
  }

  updateStatus('', 'Obsidianに保存中...');
  elements.saveBtn.disabled = true;

  try {
    // Get settings
    const result = await chrome.storage.local.get('settings');
    const settings = {
      ...DEFAULT_SETTINGS,
      ...result.settings,
      includeSummary: elements.includeSummary.checked,
      includeMermaid: elements.includeMermaid.checked
    };

    // Generate summary if enabled
    let summary = '';
    if (settings.includeSummary) {
      summary = await generateSummary(currentData.messages, settings);
    }

    // Generate Mermaid if enabled
    let mermaid = '';
    if (settings.includeMermaid) {
      mermaid = await generateMermaid(currentData.messages, settings);
    }

    // Build markdown content
    const content = buildMarkdownContent(currentData, summary, mermaid);

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const safeTitle = currentData.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
    const filename = `${date}_${currentData.source}_${safeTitle}.md`;

    // Save via Obsidian REST API
    const filePath = `${settings.folderPath}/${filename}`;
    await saveViaRestApi(settings.vaultName, filePath, content);

    updateStatus('ready', '保存完了!');

    // Reset state
    setTimeout(() => {
      currentData = null;
      elements.saveBtn.disabled = true;
      elements.previewSection.classList.add('hidden');
    }, 2000);

  } catch (error) {
    updateStatus('error', `保存失敗: ${error.message}`);
    console.error('Save error:', error);
  } finally {
    elements.saveBtn.disabled = false;
  }
}

/**
 * Generate summary using Ollama
 */
async function generateSummary(messages, settings) {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const prompt = `以下の会話を簡潔に要約してください。重要なポイントを箇条書きで3-5点にまとめてください。

会話:
${conversationText}

要約:`;

    const response = await fetch(`${settings.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('Ollama API error');
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Summary generation failed:', error);
    return '(要約の生成に失敗しました)';
  }
}

/**
 * Generate Mermaid diagram using Ollama
 */
async function generateMermaid(messages, settings) {
  try {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const prompt = `以下の会話の流れをMermaid.jsのフローチャート形式で表現してください。
シンプルで見やすい図にしてください。コードブロックは不要で、Mermaid記法のみを出力してください。

会話:
${conversationText}

Mermaidフローチャート:`;

    const response = await fetch(`${settings.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('Ollama API error');
    }

    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Mermaid generation failed:', error);
    return '';
  }
}

/**
 * Build markdown content
 */
function buildMarkdownContent(data, summary, mermaid) {
  const date = new Date().toISOString();

  let content = `---
source: ${data.source}
url: ${data.url}
created: ${date}
tags: [ai-chat, ${data.source.toLowerCase()}]
---

# ${data.title}

`;

  if (summary) {
    content += `## 要約

${summary}

`;
  }

  if (mermaid) {
    content += `## フロー図

\`\`\`mermaid
${mermaid}
\`\`\`

`;
  }

  content += `## 会話ログ

🔗 元のチャット: ${data.url}

${data.markdown}`;

  return content;
}

/**
 * Save file via Obsidian Local REST API
 */
async function saveViaRestApi(vaultName, filePath, content) {
  const result = await chrome.storage.local.get('settings');
  const settings = { ...DEFAULT_SETTINGS, ...result.settings };
  const apiKey = settings.obsidianApiKey || DEFAULT_SETTINGS.obsidianApiKey;

  const apiUrl = `http://127.0.0.1:27123/vault/${encodeURIComponent(filePath)}`;

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/markdown',
      'Authorization': `Bearer ${apiKey}`
    },
    body: content
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`REST API error: ${response.status} - ${errorText}`);
  }

  return true;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  elements.extractBtn.addEventListener('click', extractConversation);
  elements.saveBtn.addEventListener('click', saveToObsidian);
  elements.settingsBtn.addEventListener('click', saveSettings);
  document.getElementById('checkUpdate').addEventListener('click', checkForUpdate);
}

/**
 * Check for updates from GitHub
 */
async function checkForUpdate() {
  updateStatus('', '更新を確認中...');

  try {
    const response = await fetch(GITHUB_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      console.error('GitHub API response:', response.status, response.statusText);
      if (response.status === 404) {
        throw new Error('リポジトリが見つかりません');
      } else if (response.status === 403) {
        throw new Error('APIレート限');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', '');

    console.log(`Versions: Current=${CURRENT_VERSION}, Latest=${latestVersion}`);

    // Simple version comparison
    const currentParts = CURRENT_VERSION.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);

    let isNewer = false;
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const current = currentParts[i] || 0;
      const latest = latestParts[i] || 0;
      if (latest > current) {
        isNewer = true;
        break;
      }
      if (latest < current) {
        break;
      }
    }

    if (isNewer) {
      updateStatus('ready', `新しいバージョン v${latestVersion} があります！`);
      if (confirm(`更新があります！\n\n現在: v${CURRENT_VERSION}\n最新: v${latestVersion}\n\nGitHub Releasesページを開きますか？`)) {
        chrome.tabs.create({ url: 'https://github.com/tndg16-bot/SessionVault/releases' });
      }
    } else {
      updateStatus('ready', '最新バージョンを使用中');
    }
  } catch (error) {
    console.error('Update check error:', error);
    updateStatus('error', `更新確認失敗: ${error.message}`);

    // Show error details
    setTimeout(() => {
      alert(`更新確認中にエラーが発生しました：\n${error.message}\n\nリポジトリを作成していない場合、最初にGitHubでリポジトリを作成してください。`);
    }, 500);
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

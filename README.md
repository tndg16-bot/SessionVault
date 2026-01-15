# SessionVault

Chrome拡張機能：AIチャットの会話をObsidianにMarkdown/Mermaid形式で保存

## 概要

Web上のAIチャットサービスでの会話を、ワンクリックでObsidianに構造化して保存する拡張機能。

## 対応サービス

- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Google AI Studio (aistudio.google.com)

## 機能要件

### コア機能

1. **会話キャプチャ**
   - 現在のチャット会話全体を取得
   - User/Assistant の発言を構造化抽出

2. **保存トリガー**
   - 拡張機能アイコンクリック（手動）
   - ポップアップUIから保存ボタン

3. **出力形式**
   - Markdown（会話テキスト）
   - Mermaid図（選択式）
     - フローチャート
     - シーケンス図
     - マインドマップ

4. **AI要約**
   - 会話の要約を自動生成
   - 保存時にファイル冒頭に追加

### Obsidian連携

1. **保存方法**
   - ローカルファイルとして直接保存
   - Obsidian Local REST API または Native Messaging

2. **テンプレート**
   - 統一フォーマットで保存
   - テンプレートは拡張機能設定で管理

3. **メタデータ**
   - タグ付け（サービス名、トピック等）
   - フォルダ分類（設定で指定）
   - フロントマター（YAML）でメタデータ埋め込み

## 保存テンプレート（案）

```markdown
---
source: {{service}}
url: {{url}}
date: {{date}}
tags: [ai-chat, {{service}}, {{topic}}]
---

# {{title}}

## 要約

{{summary}}

## Mermaid図

```mermaid
{{mermaid_diagram}}
```

## 会話ログ

{{conversation}}
```

## 技術スタック

- **拡張機能**: Chrome Extension Manifest V3
- **UI**: Popup + Content Script
- **要約/Mermaid生成**: ローカルLLM（Ollama等）
- **Obsidian連携**: Obsidian Local REST API プラグイン

### 保存先

- **Obsidian Vault内**: `Apps/Tools/SessionVault/logs/`
- ※ 将来的に変更の可能性あり

## フォルダ構成（予定）

```
SessionVault/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── chatgpt.js
│   ├── claude.js
│   ├── gemini.js
│   └── google-ai-studio.js
├── background/
│   └── service-worker.js
├── lib/
│   ├── parser.js
│   ├── mermaid-generator.js
│   ├── summarizer.js
│   └── obsidian-connector.js
└── assets/
    └── icons/
```

## 開発フェーズ

### Phase 1: MVP
- [ ] ChatGPT対応（1サービスのみ）
- [ ] 基本Markdown保存
- [ ] 手動トリガー

### Phase 2: 拡張
- [ ] Claude, Gemini, Google AI Studio対応
- [ ] AI要約機能
- [ ] Mermaid図生成

### Phase 3: 完成
- [ ] テンプレートカスタマイズUI
- [ ] タグ・フォルダ分類設定
- [ ] Obsidian連携の安定化

## 決定事項

- [x] 要約生成に使うLLM → **ローカルLLM**
- [x] Obsidian連携の具体的方式 → **Obsidian Local REST API**
- [x] 保存先 → `Apps/Tools/SessionVault/logs/`（変更可能性あり）

## 未決定事項

- [x] ローカルLLMの具体的な選定（Ollama + **gemma3:1b**）
- [ ] Mermaid図の自動生成ロジック

## 参考

- 参考動画: https://www.threads.com/@naritai_ai/post/DTXZfFBAG_Y/media

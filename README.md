# Glim – YouTube Summaries Inside Your Browser

![Glim](https://img.shields.io/badge/Glim-YouTube_Summarizer-red)
![License](https://img.shields.io/badge/license-MIT-blue)
A Chrome extension that generates structured summaries for any YouTube video. It extracts the transcript, identifies key topics, produces questions and ELI5 answers, and renders a clean HTML summary directly from your browser.

## What It Does

- Captures the transcript of the current YouTube video
- Detects main topics
- Generates questions per topic
- Produces simple explanations
- Builds a readable HTML summary
- Works with multiple LLM providers (Gemini)

## How It Works in the Extension

1. Open any YouTube video
1. Click the Glim extension icon
1. Press “Summarize”
1. The extension sends the transcript and prompts to LLM
1. The summary appears in a new tab, formatted using the selected theme
1. Optional PDF export

## Features

- One-click summarization from YouTube
- Adjustable themes for the output
- Language selection
- Built on the same PocketFlow pipeline used in the CLI version

## Extension Structure

```
popup/
  index.html
  popup.js
  popup.css

options/
  options.html
  options.js
  options.css

src/
  index.js
  flow.js
  nodes.js
  config.js
  pocketflow.js
  utils/
    callLLM.js
    youtubeProcessor.js
    yt-transcript-apt.js
    htmlGenerator.js
    logger.js

vite.config.js
```

- **popup/**: user interface for triggering summaries
- **options/**: settings (API keys, provider, theme, language)
- **src/**: core logic, identical to CLI but adapted for extension
- **utils/**: transcript extraction, LLM calls, HTML generation, logging

## Configuration

The extension exposes configuration through the Options page.

Configurable items:

- Max topic / Max questions
- Language for output
- Theme for HTML

Stored using Chrome storage.

## Supported AI Providers

### Google Gemini

- Default provider
- Requires API key (for development)
- Models: gemini-2.0-flash or any compatible

## Workflow (Inside Extension)

1. *Popup* triggers summarization
1. *youtubeProcessor* extracts ID + transcript
1. *callLLM* sends transcript to selected provider
1. Topics → questions → ELI5 answers
1. *htmlGenerator* builds summary
1. Summary opens in a new tab

## HTML Themes

- default
- neomorphism
- glassmorphism
- retroY2K
- hacker
- typography
- maximalist
- brutalist
- flat
- minimalist
- material

Selectable via Options page.

## Development Setup

```
npm install
npm run build
```

Load the `dist/` folder as an unpacked Chrome extension after building.

## License

[MIT](./LICENSE)

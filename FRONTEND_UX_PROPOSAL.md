# Frontend UX Proposal

## Goal

Turn the current frontend from a minimal chat demo into a more distinctive, useful, and emotionally engaging product without making the codebase harder to maintain.

This proposal focuses on:

- visual identity
- chat usability
- richer message composition
- conversation history
- progressive enhancement
- frontend modularity that can support more UX over time

## Current State

The current frontend is tidy and easy to follow, but it feels like a starter template rather than a product.

What exists today:

- a single-page app with a title, chat window, and input bar
- streamed assistant output over WebSocket
- basic message bubbles for user and assistant
- CSS modules with a simple neutral palette

Files that shape the current experience:

- [frontend/src/App.tsx](/Users/yjin/dev/repos/singularity/frontend/src/App.tsx:1)
- [frontend/src/model/useChatModel.ts](/Users/yjin/dev/repos/singularity/frontend/src/model/useChatModel.ts:1)
- [frontend/src/view/ChatWindow.tsx](/Users/yjin/dev/repos/singularity/frontend/src/view/ChatWindow.tsx:1)
- [frontend/src/view/InputBar.tsx](/Users/yjin/dev/repos/singularity/frontend/src/view/InputBar.tsx:1)
- [frontend/src/view/MessageBubble.tsx](/Users/yjin/dev/repos/singularity/frontend/src/view/MessageBubble.tsx:1)

What feels limiting today:

- no conversation history or session switching
- no visual personality beyond a basic blue button and gray bubbles
- no emoji picker, composer tools, or input affordances
- no empty-state storytelling or onboarding
- no typing states, timestamps, metadata, or message actions
- no distinction between app shell state and chat session state
- the UI is centered on one conversation view, with no room for future product features

## Product Direction

The UI should feel less like “demo chat” and more like a creative local AI studio.

Recommended design direction:

- warm, cinematic, slightly editorial
- layered backgrounds instead of flat gray
- stronger typography with a more intentional voice
- chat interface that feels alive, not static
- room for history, saved conversations, and assistant tooling

A useful mental model:

- left rail for chat history and session controls
- main stage for the active conversation
- richer composer at the bottom with emoji, multiline input, and quick actions

## UX Priorities

### 1. Add a Real App Shell

The current app is a single centered column. That is simple, but it leaves no structural space for product growth.

Proposal:

- add a responsive app shell with:
  - sidebar for conversation history
  - top bar for title, model, and session actions
  - main conversation panel
  - bottom composer panel

Desktop behavior:

- persistent left sidebar
- spacious conversation panel

Mobile behavior:

- sidebar becomes drawer or slide-over
- composer stays anchored

Benefits:

- unlocks chat history
- makes the app feel like a tool, not a demo page
- creates clear boundaries for future features

## 2. Make the Visual Language More Distinctive

The current visual system is very generic:

- system fonts
- flat background
- standard rounded boxes
- default “blue CTA” treatment

Proposal:

- define a clear visual theme with CSS variables
- use a more expressive type stack
- add layered background shapes, gradients, or soft noise
- make assistant and user bubbles feel intentionally different
- introduce depth with blur, glow, shadow, and translucent panels

Suggested direction:

- background: parchment-to-ink or dawn-to-charcoal gradient field
- surface: glass or matte cards
- accent: copper, coral, electric cyan, or moss rather than default blue
- title treatment: editorial, slightly oversized, with stronger hierarchy

Important constraint:

- keep the UI readable and fast
- avoid novelty that makes long chats tiring

## 3. Upgrade the Composer

The current composer is a single-line input plus send button.

Proposal:

- replace with a multiline textarea composer
- support `Enter` to send and `Shift+Enter` for newline
- add emoji insertion
- add lightweight quick actions

Suggested composer features:

- emoji button and picker
- “new chat” action
- clear draft behavior
- visible disabled/loading state
- character growth up to a max height before scrolling

Optional future tools:

- attachments
- slash commands
- prompt templates
- voice input

Why this matters:

- the composer is the most frequently touched part of the UI
- improving it has outsized UX impact

## 4. Add Chat History

This is the highest-value feature after visual polish.

Users expect:

- multiple conversations
- the ability to revisit earlier sessions
- quick context switching

Proposal:

- introduce a `ConversationSummary[]` collection in client state
- store conversations locally first using `localStorage`
- show title, preview, and updated time in the sidebar
- support:
  - create new chat
  - rename conversation
  - delete conversation
  - switch active conversation

Initial local-first model:

- no backend persistence required for phase 1
- preserve history between refreshes

Future migration path:

- keep the frontend state shape compatible with server-backed conversations later

## 5. Improve Message Presentation

Right now messages are just text in left/right bubbles.

Proposal:

- add metadata and message actions
- improve hierarchy inside each message block

Suggested message features:

- avatar or role badge
- timestamp
- copy action
- retry or resend action for user messages
- better handling for multiline responses
- loading placeholder while assistant is streaming
- optional markdown rendering later

Visual guidance:

- assistant messages can feel more “crafted” and content-first
- user messages can stay compact and directional

## 6. Add Micro-Interactions That Matter

The app does not need a lot of motion, but it does need meaningful motion.

Proposal:

- staggered entrance for historical messages on load
- subtle composer glow on focus
- animated streaming cursor or pulse while assistant is responding
- smooth sidebar selection transitions
- empty-state transition when first message is sent

Avoid:

- generic hover animations everywhere
- excessive spring motion
- flashy effects on every bubble

## 7. Add Delightful but Useful Features

Emoji support is a good example of “small feature, high delight.”

Proposal:

- add emoji support at the composer layer first
- do not overcomplicate it

Minimum useful version:

- emoji button opens small picker
- clicking inserts at cursor position
- typed emoji characters render naturally in messages

Other lightweight delight features worth considering:

- suggested starter prompts
- “saved prompts” row
- message reaction icons
- chat title generated from first prompt

## 8. Separate View State From Chat State

The current `useChatModel` hook handles everything in one place.

That is still manageable today, but richer UX will make it grow quickly.

Proposal:

- split conversation state from UI state

Suggested state domains:

- `chat` state
  - active conversation id
  - conversations
  - messages
  - streaming state

- `composer` state
  - draft text
  - emoji picker open/closed
  - cursor handling

- `shell` state
  - sidebar open/closed
  - selected model
  - mobile layout state

Benefits:

- cleaner mental model
- easier testing
- easier to add features without turning one hook into a monolith

## Proposed Frontend Structure

Suggested layout:

```text
frontend/src/
  app/
    AppShell.tsx
  features/chat/
    model/
      useChatSession.ts
      useConversationStore.ts
    components/
      ChatPanel.tsx
      MessageList.tsx
      MessageCard.tsx
      Composer.tsx
      EmojiPicker.tsx
  features/history/
    components/
      Sidebar.tsx
      ConversationList.tsx
      ConversationItem.tsx
  shared/
    ui/
    hooks/
    lib/
    theme/
  types/
```

This gives us room to grow while still staying lightweight.

## Visual System Proposal

### Theme Tokens

Introduce a shared theme layer in CSS variables for:

- background
- surface
- border
- accent
- accent-strong
- text-primary
- text-secondary
- user-bubble
- assistant-bubble
- shadow

### Typography

Avoid default system-only styling for the core brand voice.

Suggested approach:

- expressive display font for page title only
- readable sans-serif for body and chat content
- compact monospace accent for metadata or model badges

### Surfaces

Use three surface levels:

- ambient page background
- app shell panel
- content cards and bubbles

That layering alone will make the app feel much less flat.

## Feature Roadmap

### Phase 1: Style and Shell

- add theme variables
- redesign layout into sidebar + main panel
- improve empty state
- improve bubble styling
- upgrade composer to multiline

Outcome:

- the app stops feeling generic

### Phase 2: Local History and Composer Delight

- add local conversation history
- add new chat and switch chat flows
- add emoji picker
- add timestamps and metadata

Outcome:

- the app becomes meaningfully usable across sessions

### Phase 3: Richer Chat UX

- add loading states and streaming cursor
- add message actions
- add generated chat titles
- improve keyboard accessibility

Outcome:

- the interaction quality feels polished

### Phase 4: Advanced Product Features

- server-backed history
- search
- attachments
- markdown rendering
- model switching

Outcome:

- the app grows into a real product surface

## Implementation Notes

### Local History Model

Suggested local shape:

```ts
type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};
```

Persist this to `localStorage` behind a small storage utility so we can later swap it for server persistence.

### Better Streaming State

Current streaming is represented as one boolean.

Proposal:

- track the active conversation id for the stream
- track connection state
- track error state
- track whether the assistant placeholder is pending or complete

This will help as soon as we support multiple chats.

### WebSocket Config

The current client hard-codes:

- `ws://localhost:8000/api/v1/chat/stream`

That should move behind an environment-aware utility so the frontend works cleanly in both dev and production.

## Accessibility and Quality Bar

While making the UI more expressive, we should keep a strong usability baseline:

- keyboard-navigable sidebar
- accessible contrast on all bubble types
- visible focus states
- motion reduced when the user prefers reduced motion
- mobile-safe composer and scroll behavior

Fancy should not mean fragile.

## Recommended Immediate Next Steps

1. Create a new app shell with sidebar and main content regions.
2. Introduce theme variables and replace the flat gray styling.
3. Refactor `useChatModel` into conversation state plus composer state.
4. Add local conversation history with `localStorage`.
5. Replace the single-line input with a multiline composer and emoji button.
6. Add streaming polish and message metadata.

## Character & Provider Selection (Implemented)

The UI now treats **character** (who you're talking to) as a first-class concept, separate from **provider** (which inference service is used).

### Character Model

Each character has:
- `id` — stable key stored with the conversation
- `name` — display name (shown in bubbles, header, empty state)
- `bot_name` — the name sent to the inference API (may differ from display name)
- `description` — one-line persona description
- `emoji` — avatar shown in message bubbles and conversation list

Characters are fetched from `GET /api/v1/characters` on load, with hardcoded fallback so the UI works even when the backend is down. Defined in `backend/core/settings.py` — add entries there to expand the roster.

### Character Picker

A 2-column card grid lives at the top of the sidebar. Selecting a character sets the **default character for the next new conversation**. Each `Conversation` stores its own `characterId` so you can have simultaneous conversations with different characters.

### Per-Conversation Character

`Conversation.characterId` is set when the conversation is created. Switching characters in the picker does not change active conversations — it only affects new ones. The conversation list shows each conversation's character emoji next to the title.

### Provider Selection

Provider (chai / echo) remains server-side config via `Settings.provider` in `.env`. Character selection is user-facing; provider selection is operator-facing. This separation keeps the UI clean and avoids exposing infrastructure choices.

---

## Summary

The current frontend is a solid scaffold, but the product experience is still plain. The biggest opportunity is not only prettier CSS, but a better interaction model: history, a stronger app shell, a richer composer, and a more memorable visual identity. If we do those together, the UI will feel less like a demo and more like a real chat product.

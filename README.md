# Eldertable

**Eldertable** is a modular, open-architecture Virtual Tabletop (VTT) with deep Discord integration. It handles maps, tokens, character sheets, dice rolling, and combat — while delegating voice, video, and social presence entirely to Discord.

---

## Architecture

```
eldertable/
├── apps/
│   ├── web/           # React + Vite + PixiJS frontend
│   ├── api/           # NestJS backend + Prisma + Socket.IO
│   └── discord-bot/   # discord.js slash-command bot
├── packages/
│   ├── shared/        # Shared TypeScript types and constants
│   ├── dice-engine/   # Dice expression parser and roller
│   ├── rules-engine/  # System registry and definitions
│   ├── module-engine/ # Module registry
│   ├── event-bus/     # In-process event bus
│   ├── discord-bridge/# Discord message formatters
│   └── ui/            # Shared UI utilities (cn helper)
└── content/
    ├── systems/       # Game system definitions
    └── modules/       # Optional module definitions
```

### Concepts

| Concept        | Description                                                   |
| -------------- | ------------------------------------------------------------- |
| **World**      | A campaign/setting. Every table session lives inside a world. |
| **Scene**      | A map or encounter. One scene is "active" at a time.          |
| **Actor**      | A character, NPC, or monster (stored as a Document).          |
| **Item**       | A weapon, spell, feat, or equipment piece.                    |
| **Journal**    | Notes, handouts, and lore entries.                            |
| **Compendium** | Reusable content packs (monsters, items, spells).             |
| **System**     | A game-rule plugin (generic-d20, d100, dice-pool…).           |
| **Module**     | An optional extension (combat tracker, fog-of-war…).          |
| **Macro**      | A one-click command or dice expression in the macro bar.      |

---

## Prerequisites

| Tool                    | Version                |
| ----------------------- | ---------------------- |
| Node.js                 | 20+                    |
| pnpm                    | 9+                     |
| Docker & Docker Compose | any recent             |
| PostgreSQL              | via Docker (automatic) |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url> eldertable
cd eldertable
cp .env.example .env
pnpm install
```

### 2. Start PostgreSQL (Docker)

```bash
pnpm docker:up
```

### 3. Generate Prisma client and push schema

```bash
pnpm db:generate
pnpm db:push
```

### 4. Start everything in dev mode

```bash
pnpm dev
```

This starts three processes in parallel:

| Process         | URL                                    |
| --------------- | -------------------------------------- |
| Frontend (Vite) | http://localhost:5173                  |
| API (NestJS)    | http://localhost:3001                  |
| Discord Bot     | (no HTTP, connects to Discord gateway) |

---

## Detailed Setup

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for core functionality
DATABASE_URL="postgresql://eldertable:eldertable_secret@localhost:5432/eldertable"
JWT_SECRET=change-me-in-production

# Required for Discord bot
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-app-client-id
DISCORD_GUILD_ID=your-dev-server-id   # for slash command deployment

# Optional — enables Discord OAuth2 login
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
```

### Discord Bot Setup

1. Create a Discord Application at https://discord.com/developers/applications
2. Create a Bot under the application, copy the token to `DISCORD_BOT_TOKEN`
3. Enable the following Privileged Gateway Intents: **GUILDS**, **GUILD_MESSAGES**
4. Invite the bot to your server with scopes: `bot`, `applications.commands`
5. Deploy slash commands:

```bash
pnpm --filter @eldertable/discord-bot run deploy-commands
```

### Discord Bot Commands

| Command              | Description                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `/roll <expression>` | Roll dice. Sends result to VTT if channel is bound. Examples: `1d20`, `2d6+3`, `4d6dl1`, `3d10>=6` |
| `/session link`      | Get the table link for this channel                                                                |
| `/session start`     | Announce session start and share the table link                                                    |
| `/scene current`     | Show info about the active scene                                                                   |
| `/help`              | Show all commands                                                                                  |

### Linking a World to Discord

1. Open a world in Eldertable
2. Click **Link Discord** in the top bar
3. Enter your Discord **Guild ID** and **Channel ID**
   - Enable Developer Mode in Discord: Settings → App Settings → Advanced
   - Right-click a server → Copy Server ID (Guild ID)
   - Right-click a channel → Copy Channel ID
4. Click **Link Channel**

After linking, `/roll` in that channel will appear in the VTT roll log, and `/session start` will post the table link.

---

## Dice Engine

Supported expressions:

| Expression   | Meaning                                 |
| ------------ | --------------------------------------- |
| `1d20`       | Roll 1 twenty-sided die                 |
| `1d20+5`     | Roll 1d20 and add 5                     |
| `2d6`        | Roll 2 six-sided dice                   |
| `4d6dl1`     | Roll 4d6, drop lowest 1                 |
| `2d20kh1`    | Roll 2d20, keep highest (Advantage)     |
| `2d20kl1`    | Roll 2d20, keep lowest (Disadvantage)   |
| `1d100`      | Percentile roll                         |
| `3d10>=6`    | Dice pool — count dice ≥ 6 as successes |
| `1d20+1d4+3` | Complex expression with multiple terms  |

---

## API Reference

### Authentication

```http
POST /api/auth/mock-login
Body: { "name": "Gandalf", "email": "gandalf@example.com" }
Response: { "user": {...}, "token": "jwt..." }
```

```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Worlds

```http
GET    /api/worlds                      # List worlds you belong to
POST   /api/worlds                      # Create world
GET    /api/worlds/:slug                # Get world by slug
PATCH  /api/worlds/:id                  # Update world
DELETE /api/worlds/:id                  # Delete world
POST   /api/worlds/:id/discord-bind     # Bind Discord channel
```

### Documents

```http
GET    /api/worlds/:worldId/documents           # List (filter by ?type=actor)
POST   /api/worlds/:worldId/documents           # Create
GET    /api/worlds/:worldId/documents/:id       # Get one
PATCH  /api/worlds/:worldId/documents/:id       # Update
DELETE /api/worlds/:worldId/documents/:id       # Delete
```

Document types: `actor`, `item`, `scene`, `journal`, `roll-table`, `playlist`, `macro`, `folder`

### Dice

```http
POST /api/worlds/:worldId/dice/roll
Body: { "expression": "1d20+5", "label": "Attack Roll" }
```

```http
GET /api/worlds/:worldId/dice/history
```

### Chat

```http
GET /api/worlds/:worldId/chat/messages?limit=100
```

---

## WebSocket Events

Connect to `ws://localhost:3001` with Socket.IO.

### Client → Server

| Event             | Payload                                           |
| ----------------- | ------------------------------------------------- |
| `world:join`      | `{ worldId, userId }`                             |
| `world:leave`     | `{ worldId }`                                     |
| `chat:send`       | `{ worldId, userId, speaker, content, type }`     |
| `roll:create`     | `{ worldId, userId, expression, result, label? }` |
| `token:move`      | `{ worldId, sceneId, tokenId, x, y, userId }`     |
| `scene:activate`  | `{ worldId, sceneId }`                            |
| `combat:start`    | `{ worldId, sceneId, combatants }`                |
| `combat:nextTurn` | `{ worldId, round, turn, combatantId }`           |

### Server → Client

| Event                   | Description                    |
| ----------------------- | ------------------------------ |
| `chat:message`          | New chat message broadcast     |
| `roll:create`           | Dice roll broadcast            |
| `discord:roll-received` | Roll received from Discord bot |
| `token:move`            | Token position update          |
| `scene:activate`        | Active scene changed           |
| `combat:start`          | Combat initiated               |
| `combat:nextTurn`       | Turn advanced                  |
| `world:userJoined`      | Player connected               |
| `world:userLeft`        | Player disconnected            |

---

## Game Systems

Systems are defined in `content/systems/`. Each system has:

- `system.json` — metadata, actor/item types, attributes
- `template.json` — default data structure for new actors/items

| System ID      | Description                                  |
| -------------- | -------------------------------------------- |
| `generic-d20`  | d20-based fantasy (D&D-compatible structure) |
| `generic-d100` | Percentile system (investigation/horror)     |
| `dice-pool`    | Pool system counting successes (WoD-style)   |
| `dnd5e-srd`    | Placeholder for D&D 5e SRD structure         |

---

## Modules

Optional extensions in `content/modules/`:

| Module             | Status       | Description                |
| ------------------ | ------------ | -------------------------- |
| `combat-tracker`   | Active (MVP) | Initiative tracker         |
| `discord-bridge`   | Active (MVP) | Discord ↔ VTT sync         |
| `fog-of-war`       | Planned      | Dynamic fog of war         |
| `animated-dice`    | Planned      | 3D dice animations         |
| `journal-enhancer` | Planned      | Rich text + image handouts |

---

## Development

### Running individual apps

```bash
pnpm --filter @eldertable/web dev
pnpm --filter @eldertable/api dev
pnpm --filter @eldertable/discord-bot dev
```

### Database

```bash
pnpm db:studio     # Open Prisma Studio
pnpm db:migrate    # Create and apply migrations
pnpm db:push       # Push schema without migrations (dev only)
```

### Type checking

```bash
pnpm typecheck     # All packages
```

---

## Roadmap

- [ ] Discord OAuth2 login
- [ ] Fog of War
- [ ] Animated 3D dice
- [ ] Rich actor/item sheets per system
- [ ] Asset upload (S3/R2)
- [ ] Compendium import/export
- [ ] Macros with JS scripting
- [ ] Module hot-reload
- [ ] Multi-scene navigation
- [ ] Walls and line-of-sight
- [ ] Audio playlist integration
- [ ] Journal with rich text

---

## License

MIT — no Foundry VTT code, assets, or trademarks used. Architecture inspired by modular VTT design principles.

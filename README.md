# Mafia Client

Веб-клієнт онлайн-гри «Мафія». Працює в парі з [`mafia-server`](../mafia-server)
(Go HTTP API + WebSocket) — сервер є джерелом істини для стану гри, а клієнт
відмальовує лобі, кімнати та ігровий екран і шле дії гравця в API.

## Техстек

- **React 19** + **TypeScript**
- **Vite 7** (dev server + build)
- **React Router 7** (маршрутизація)
- **Tailwind CSS v4** (стилі)
- **Vitest** + Testing Library (unit-тести)

## Запуск

```bash
npm install
npm run dev
```

Клієнт підніметься на `http://localhost:5173`. За замовчуванням він ходить у backend
на `http://localhost:8080` — спочатку запусти `mafia-server` (`go run ./cmd/api`).

База API налаштовується через змінну середовища:

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## Скрипти

| Команда | Призначення |
|---|---|
| `npm run dev` | Dev-сервер з HMR |
| `npm run build` | Перевірка типів (`tsc -b`) + продакшн-збірка |
| `npm run lint` | ESLint |
| `npm test` | Unit-тести (`vitest run`) |
| `npm run preview` | Локальний перегляд продакшн-збірки |

## Маршрути

- `/` — головна сторінка + вхід за nickname
- `/rules` — правила гри
- `/rooms` — лобі (тільки доступні кімнати: `waiting`/`recruiting`/`preparation`)
- `/room/:id` — сторінка кімнати (склад гравців, код, старт)
- `/room/:id/game` — ігровий екран
- `/404` — не знайдено

Маршрути `/rooms`, `/room/:id`, `/room/:id/game` закриті через `ProtectedRoute`
(потрібна сесія).

## Як це працює

- Вхід — лише за nickname (без пароля). Сесія (`token` + `user`) зберігається в
  `sessionStorage`; токен живе 24 год на сервері.
- Глобальний стан — у `src/context/GameContext.tsx` (кімнати, гра, WebSocket,
  recovery після reload/reconnect).
- HTTP-клієнт — у `src/lib/api.ts`. Realtime — підписка на `/ws`; після сигналу
  `game.updated` клієнт дочитує приватний стан через `GET /api/games/{roomId}`.
- Ігровий екран (`src/pages/GamePage.tsx`) рендерить серверний snapshot: фази,
  кроки, таймери, ролі, дії та журнал подій.

### Ознайомчий перший раунд

Перший раунд гри — ознайомчий. На ознайомчій ночі ролі лише прокидаються по черзі
(дії заблоковано), а на ознайомчому дні немає голосування на вигнання. Тому на
round 1 ігровий екран ховає вибір цілі та показує відповідні підказки, а кнопка
зміни фази в кінці першого дня веде «До ночі». Повноцінні дії та голосування —
з раунду 2.

## Тести

`src/test/gameUtils.test.ts` — unit-тести допоміжних функцій ігрового екрана
(`formatTimer`, `getInitials`, `getSecondsLeft`).

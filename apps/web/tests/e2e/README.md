# E2E (Playwright)

Ces tests parcourent le flux complet (objectif → diagnostic → plan → session → feedback) dans un
vrai navigateur, contre une vraie API. Ils ne sont **pas** exécutés par la CI par défaut (pas
d'installation de binaires navigateurs dans le pipeline actuel) — à lancer localement :

```bash
# Terminal 1
npm run start:api            # depuis la racine du monorepo (port 3000)

# Terminal 2
cd apps/web
npx playwright install chromium   # une seule fois
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run dev &   # ou un port dédié
npm run e2e
```

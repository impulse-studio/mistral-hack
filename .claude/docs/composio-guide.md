# Composio Integration Guide

Guide structurel pour intégrer Composio dans un projet avec AI SDK. Agnostique du framework et du backend.

---

## Architecture

### Deux clients distincts

Composio nécessite **deux instances séparées** selon le contexte d'utilisation :

**Client AI (avec provider)** — pour la couche d'exécution des outils IA :

```typescript
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export const composio = new Composio({
    apiKey: COMPOSIO_API_KEY,
    provider: new VercelProvider(),
});
```

Le `VercelProvider` convertit automatiquement les outils Composio au format attendu par `streamText()` / `generateText()` du Vercel AI SDK. Les outils retournés sont directement passables au paramètre `tools`.

**Client REST (sans provider)** — pour les opérations de gestion (OAuth, auth configs, triggers) :

```typescript
import { Composio } from "@composio/core";

export const composio = new Composio({ apiKey: COMPOSIO_API_KEY });
```

Utilisé côté serveur (API routes, mutations) pour tout ce qui ne passe pas par le LLM.

> **Pourquoi deux clients ?** Le provider ajoute une couche de conversion schema/exécution qui n'a de sens que pour les appels IA. Les opérations REST (créer une auth config, initier un OAuth, lister des comptes) n'en ont pas besoin et seraient alourdies inutilement.

---

## Modèle de données

### Tables essentielles

```
integrationAuthConfig
├── id (PK)
├── organizationId (FK)
├── toolkitSlug          # "gmail", "attio", "slack"
├── authConfigId         # ID Composio distant (e.g. "ac_xxx")
├── type                 # "use_composio_managed_auth" | "use_custom_auth"
├── scopesHash           # Hash déterministe des scopes pour détecter les changements
└── UNIQUE(organizationId, toolkitSlug)

integrationConnection
├── id (PK local)
├── organizationId (FK)
├── composioAccountId    # ID Composio distant (e.g. "ca_xxx")
├── toolkitSlug
├── toolkitVersion       # Version figée à la connexion
├── title                # Nom libre ("Gmail Perso", "Gmail Pro")
├── needsReauth          # Flag quand les scopes changent
└── authConfigId (FK)

integrationToolPreference
├── organizationId (FK)
├── integrationConnectionId (FK)
├── toolSlug             # "GMAIL_SEND_EMAIL"
└── status               # "enabled" | "disabled" | "sensitive"
```

### Distinction critique des IDs

| Champ               | Scope   | Usage                                     |
| ------------------- | ------- | ----------------------------------------- |
| `id`                | Local   | Clé primaire BDD, référencé dans les flux |
| `composioAccountId` | Distant | ID Composio, utilisé pour les appels API  |
| `authConfigId`      | Distant | ID auth config Composio                   |

Ne jamais mélanger ces IDs. Les validateurs Zod côté input doivent être explicites sur quel ID est attendu.

---

## Flux de connexion

### OAuth (le plus courant)

```
[User clique "Connecter Gmail"]
    │
    ▼
1. Serveur: getOrCreateAuthConfig(org, "gmail")
    │  → Crée ou réutilise une auth config Composio pour l'org
    │  → Gère la détection de changement de scopes
    │
    ▼
2. Serveur: composio.connectedAccounts.initiate(entityId, authConfigId)
    │  → Retourne { id: "creq_xxx", redirectUrl: "https://accounts.google.com/..." }
    │
    ▼
3. Serveur: Stocker les données en attente dans un store temporaire (Redis, KV, etc.)
    │  → Clé: `oauth:pending:{organizationId}:{toolkitSlug}`
    │  → TTL: 10 minutes
    │  → Valeur: { connectionRequestId, toolkitSlug, title, createdAt }
    │
    ▼
4. Client: Redirect vers redirectUrl
    │
    ▼
5. Client: Poll le serveur pour vérifier le statut
    │  → Utilise composio.connectedAccounts.waitForConnection()
    │  → Timeout configurable (max recommandé: 120s)
    │
    ▼
6. Serveur (quand ACTIVE): Créer le record integrationConnection en BDD
    │  → Stocker toolkitVersion (fetcher si absent)
    │  → Créer les toolPreferences par défaut (enabled)
    │  → Nettoyer le store temporaire
```

### Clé API (plus simple)

```
1. Récupérer les champs requis: composio.toolkits.getConnectedAccountInitiationFields()
2. Créer/réutiliser l'auth config (type: "use_custom_auth", authScheme: "API_KEY")
3. composio.connectedAccounts.initiate() avec config API_KEY + status ACTIVE
4. → Le compte est immédiatement actif, pas de redirect
```

### Callback URL : validation obligatoire

Toujours valider que la `callbackUrl` fournie par le client correspond à l'origin de l'app ou à une liste blanche. Sinon, un attaquant pourrait rediriger l'OAuth vers son propre serveur.

```typescript
function isValidCallbackUrl(url: string): boolean {
    const parsed = new URL(url);
    return (
        parsed.origin === APP_ORIGIN ||
        ALLOWED_CALLBACK_HOSTS.includes(parsed.host)
    );
}
```

---

## Auth Config Management

### Logique getOrCreateAuthConfig

C'est le coeur de la gestion d'authentification. L'algorithme :

```
1. Vérifier si les scopes ont changé (hash actuel vs hash stocké)
2. Si changement détecté:
   a. Patch la config Composio distante avec les nouveaux scopes
   b. Marquer toutes les connexions de ce toolkit comme needsReauth
   c. Mettre à jour le scopesHash en BDD
3. Chercher une auth config existante valide pour (org + toolkit)
4. Si trouvée → la retourner
5. Sinon → en créer une nouvelle
   → Gérer la race condition (unique constraint PG 23505)
   → Si conflit: réessayer la recherche
```

### Les trois types d'auth

| Type           | Quand                                                    | Ce qui est envoyé à Composio                                     |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| `managed`      | Pas de custom OAuth, pas de credentials custom           | `{ type: "use_composio_managed_auth", scopes? }`                 |
| `custom_oauth` | Extension avec `customOAuth` configuré                   | `{ type: "use_custom_auth", authScheme: "OAUTH2", credentials }` |
| `custom_auth`  | L'utilisateur fournit ses propres credentials (API keys) | `{ type: "use_custom_auth", authScheme, credentials }`           |

Logique de détermination :

```typescript
function determineAuthType(customOAuth, optionsType): AuthConfigType {
    if (customOAuth) return "custom_oauth"; // Extension custom OAuth
    if (optionsType === "use_custom_auth") return "custom_auth"; // Credentials utilisateur
    return "managed"; // Auth gérée par Composio
}
```

### Custom OAuth : quand et pourquoi

Composio fournit ses propres apps OAuth pour chaque service, mais parfois leurs scopes sont insuffisants. Exemple concret : l'app OAuth Composio pour Attio n'a pas les scopes `comment:read-write` et `meeting:read`.

Solution : enregistrer ses propres credentials OAuth via l'extension :

```typescript
registerExtension({
  toolkitSlug: "attio",
  requiredScopes: "comment:read-write,meeting:read,call_recording:read",
  customOAuth: {
    getClientId: () => env.ATTIO_CLIENT_ID,       // Lazy (lu au runtime)
    getClientSecret: () => env.ATTIO_CLIENT_SECRET,
    redirectUri: "https://...",                     // Optionnel
  },
  tools: [...],
});
```

Les fonctions `getClientId` / `getClientSecret` sont lazy (pas des valeurs directes) pour éviter de crash au démarrage si les env vars ne sont pas encore chargées.

---

## Récupération des outils pour l'IA

### Flux principal

```typescript
async function getComposioToolsForConnections(
    organizationId: string,
    connectionIds: string[], // IDs locaux (BDD)
    connectionToolStatus?: Record<string, Record<string, ToolStatus>>,
): Promise<{ tools: ToolSet; sensitiveToolNames: Set<string> }>;
```

Étapes internes :

1. **Fetch des connexions** depuis la BDD → obtenir `composioAccountId`, `toolkitSlug`, `toolkitVersion`
2. **Résolution des versions manquantes** : si `toolkitVersion` est null, fetch depuis `composio.toolkits.get()` et utiliser `meta.availableVersions[0]`
3. **Enregistrement des custom tools** : pour chaque toolkit, appeler `composio.tools.createCustomTool()` si une extension existe
4. **Fetch des outils** via `composio.tools.get()` avec un hook `beforeExecute` qui injecte :
    - `userId` (= organizationId)
    - `connectedAccountId` (= composioAccountId Composio)
    - `version` (= version figée)
5. **Filtrage** selon les préférences (org-level defaults + node-level overrides)

### Le hook beforeExecute

C'est le mécanisme clé pour associer les bons comptes et versions aux outils :

```typescript
const tools = await composio.tools.get(
    organizationId,
    { toolkits },
    {
        beforeExecute: (context) => {
            const params = { ...context.params };
            params.userId = organizationId;
            params.connectedAccountId = toolkitToAccountId.get(
                context.toolkitSlug,
            );
            params.version = toolkitToVersion.get(context.toolkitSlug);
            return params;
        },
    },
);
```

Sans ce hook, Composio ne sait pas quel compte utilisateur utiliser pour l'exécution.

### Versioning des toolkits

Pourquoi stocker la version ? Composio met à jour ses toolkits régulièrement. Si un toolkit passe en v2, les anciens outils pourraient changer de schema ou de comportement. En figeant la version à la connexion, on garantit la stabilité.

```
Connexion créée le 1er mars  → version: "2.0.0"
Toolkit mis à jour le 15 mars → version: "3.0.0"
L'ancienne connexion continue d'utiliser "2.0.0"
Nouvelle connexion → version: "3.0.0"
```

### Outils sans authentification

Certains toolkits ne nécessitent pas de connexion utilisateur (ex: calculateur, convertisseur). Ils ont leur propre chemin :

```typescript
async function getComposioToolsForNoAuthToolkits(
    organizationId: string,
    toolkitSlugs: string[],
    toolkitToolStatus?: Record<string, Record<string, ToolStatus>>,
);
```

Même logique de filtrage, mais sans `connectedAccountId`.

---

## Filtrage des outils

### Trois statuts

| Statut      | Comportement                                           |
| ----------- | ------------------------------------------------------ |
| `enabled`   | Outil disponible pour le LLM                           |
| `disabled`  | Outil exclu du ToolSet                                 |
| `sensitive` | Outil disponible mais nécessite approbation avant exec |

### Deux niveaux de configuration

**Org-level** (table `integrationToolPreference`) : configuration par défaut pour toute l'organisation. Chaque outil d'une connexion a un statut.

**Node-level** (passé en paramètre `connectionToolStatus`) : override au niveau d'un noeud de flux spécifique. Fonctionne en **whitelist** : si un override existe pour une connexion, **seuls les outils explicitement listés sont inclus**. Les absents sont considérés `disabled`.

```typescript
// Sans overrides → org defaults s'appliquent
// Avec overrides pour conn_123:
connectionToolStatus = {
    conn_123: {
        GMAIL_SEND_EMAIL: "enabled",
        GMAIL_READ_EMAIL: "sensitive",
        // GMAIL_DELETE_EMAIL absent → disabled (whitelist)
    },
};
```

---

## Outils sensibles : mécanisme d'approbation

### Contexte : tâches asynchrones (flows)

Quand un LLM appelle un outil marqué `sensitive`, l'exécution est interceptée par un wrapper :

```
LLM appelle GMAIL_SEND_EMAIL
    │
    ▼
Wrapper intercepte l'appel
    │
    ▼
Debounce 500ms (accumule les appels simultanés en batch)
    │
    ▼
Crée un token d'attente (Trigger.dev wait.forToken, timeout 30j)
    │
    ▼
Insère les toolApproval en BDD + notifie le client en temps réel
    │
    ▼
Pause l'exécution du flow
    │
    ▼
L'utilisateur approuve / rejette / envoie un follow-up message
    │
    ▼
Résolution:
  - Approuvé → exécute l'outil avec les données (potentiellement modifiées)
  - Rejeté → retourne un message d'erreur au LLM
  - Follow-up → retourne le message utilisateur, le LLM doit s'adapter
```

**Le debounce de 500ms** est important : quand le LLM fait plusieurs appels d'outils en parallèle (tool calls groupés), on veut les batcher en une seule demande d'approbation plutôt que d'afficher N popups.

**Le processing lock** empêche les appels concurrents à `wait.forToken()`. Trigger.dev n'en supporte qu'un seul à la fois.

### Contexte : chat interactif

En chat, le mécanisme est différent (pas de batch, pas de Trigger.dev) :

```
LLM appelle un outil sensitive
    │
    ▼
Wrapper retourne immédiatement: { pendingApproval: true, toolCallId, toolInput }
    │
    ▼
Client affiche une carte d'approbation inline
    │
    ▼
Utilisateur approuve → appel API séparé pour exécuter l'outil
    │
    ▼
Résultat injecté dans la conversation, le chat reprend
```

### Extension du schema d'input

Pour permettre au LLM de fournir un contexte d'approbation, le schema Zod de chaque outil sensible est **étendu** dynamiquement avec des champs meta :

```typescript
// Schema original: z.object({ to: z.string(), body: z.string() })
// Schema étendu: z.object({
//   to: z.string(),
//   body: z.string(),
//   _approvalReason: z.string(),      // Pourquoi le LLM veut exécuter cet outil
//   _renderConfig: z.object({...}),   // Config d'affichage pour le client
// })
```

Ces champs sont retirés avant l'exécution réelle de l'outil.

---

## Custom Tool Extensions

### Structure d'une extension

```typescript
// extensions/toolkits/attio.ts
import { z } from "zod";
import { registerExtension } from "../registry";
import { createCustomTool } from "../types";

const createComment = createCustomTool({
    slug: "ATTIO_CREATE_COMMENT", // TOOLKIT_ACTION (uppercase)
    name: "Create Comment",
    description: "Creates a comment on an Attio record. Use this when...",
    inputParams: z.object({
        recordId: z.string().describe("The Attio record ID to comment on"),
        content: z.string().describe("The comment content in plain text"),
    }),
    execute: async (input, _connectionConfig, executeToolRequest) => {
        return executeToolRequest({
            endpoint: "/comments",
            method: "POST",
            body: {
                data: {
                    entry_id: input.recordId,
                    body_text: input.content,
                },
            },
        });
    },
});

registerExtension({
    toolkitSlug: "attio",
    requiredScopes: "comment:read-write,meeting:read,call_recording:read",
    customOAuth: {
        getClientId: () => env.ATTIO_CLIENT_ID,
        getClientSecret: () => env.ATTIO_CLIENT_SECRET,
    },
    tools: [createComment],
});
```

### Registry pattern

```
extensions/
├── index.ts              # Import side-effects: "./toolkits/attio", "./toolkits/lemlist"
├── registry.ts           # Map<string, ToolkitExtension> + fonctions d'accès
├── types.ts              # Types + createCustomTool()
└── toolkits/
    ├── attio.ts
    └── lemlist.ts
```

L'import dans `index.ts` est un **side-effect import** : le simple fait d'importer le fichier exécute `registerExtension()`.

### Accès depuis le serveur

Le serveur a besoin d'informations sur les extensions (scopes, custom OAuth, liste des tools) mais **pas** de la logique d'exécution. On expose des fonctions de lecture séparées :

```typescript
// Depuis le serveur:
import {
    getToolkitScopes,
    getCustomOAuthCredentials,
    getCustomToolsInfo,
} from "@repo/tasks/custom-tools";

getToolkitScopes("attio"); // → "comment:read-write,meeting:read,..."
getCustomOAuthCredentials("attio"); // → { clientId, clientSecret, redirectUri? }
getCustomToolsInfo("attio"); // → [{ slug, name, description }]
```

### Convention de nommage

- Slug : `TOOLKIT_ACTION_NAME` (uppercase, underscores)
- Le prefix toolkit doit matcher le `toolkitSlug` de l'extension
- Les descriptions doivent être suffisamment détaillées pour guider le LLM

---

## Triggers & Webhooks

### Création d'un trigger

```typescript
const { triggerId } = await composio.triggers.create(
    organizationId,
    triggerSlug,
    {
        triggerConfig: {
            /* filtres spécifiques au trigger */
        },
        connectedAccountId: "ca_xxx",
    },
);
// triggerId = "ti_xxx"
```

Le trigger est stocké en BDD avec une table de jonction vers les flux publiés.

### Webhook : réception et vérification

Composio utilise le **format Svix** pour les webhooks :

**Headers requis :**

- `webhook-id` : ID unique du message
- `webhook-timestamp` : Unix timestamp (secondes)
- `webhook-signature` : `v1,<base64-hmac-sha256>`

**Vérification :**

```typescript
const signingString = `${messageId}.${timestamp}.${rawBody}`;
const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(signingString)
    .digest("base64");

// Comparaison constant-time obligatoire (timing attack prevention)
crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
```

**Validations supplémentaires :**

- Timestamp dans les 10 dernières minutes (anti-replay)
- Skip la vérification en développement (optionnel)
- Comparaison constant-time (`timingSafeEqual`)

### Payload webhook

```json
{
  "id": "evt_xxx",
  "type": "github_commit_event",
  "timestamp": "2025-01-15T10:00:00Z",
  "data": { "...trigger-specific..." },
  "metadata": {
    "log_id": "log_xxx",
    "trigger_slug": "GITHUB_COMMIT_EVENT",
    "trigger_id": "ti_xxx",
    "connected_account_id": "ca_xxx",
    "user_id": "org_xxx"
  }
}
```

---

## Cas particuliers & Edge Cases

### 1. Race condition sur la création d'auth config

Deux requêtes simultanées pour le même (org + toolkit) peuvent créer un doublon.

**Solution** : Unique constraint en BDD sur `(organizationId, toolkitSlug)` + catch du code PostgreSQL `23505` :

```typescript
try {
  await db.insert(integrationAuthConfig).values({ ... });
} catch (error) {
  if (isUniqueConstraintError(error)) { // error.code === "23505"
    // Un autre processus a créé la config en premier → la récupérer
    return await findExistingAuthConfig(db, organizationId, toolkitSlug);
  }
  throw error;
}
```

### 2. Changement de scopes après déploiement

Quand un développeur ajoute un custom tool nécessitant de nouveaux scopes :

1. Le code déployé contient les nouveaux `requiredScopes`
2. Au prochain `getOrCreateAuthConfig()`, le hash des scopes ne match plus
3. → Patch de l'auth config Composio distante
4. → Toutes les connexions du toolkit marquées `needsReauth: true`
5. → L'UI affiche un badge "Re-authorization required"
6. → L'utilisateur doit re-faire l'OAuth pour accorder les nouvelles permissions

**Patch des scopes** : le SDK Composio ne supporte pas nativement cette opération. Il faut passer par l'API REST :

```typescript
await fetch(
    `https://backend.composio.dev/api/v3/auth_configs/${authConfigId}`,
    {
        method: "PATCH",
        headers: {
            "x-api-key": COMPOSIO_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(
            authType === "custom"
                ? { type: "custom", credentials: { scopes } } // Scopes dans credentials
                : { type: "default", scopes }, // Scopes à la racine
        ),
    },
);
```

Le format du body diffère selon le type d'auth (`default` vs `custom`).

### 3. Comptes Composio orphelins

Un compte Composio peut devenir orphelin si :

- L'OAuth est initié mais jamais complété
- Le compte perd son statut ACTIVE (token expiré, revoqué côté provider)

**Solution** : Nettoyage au moment du listing des connexions :

```typescript
// Lors de listConnections:
// 1. Fetch les statuts réels depuis Composio
// 2. Si une connexion locale a > 5 minutes ET le compte Composio n'est plus ACTIVE
// 3. → Supprimer le compte Composio + le record local
```

Le **grace period de 5 minutes** évite de supprimer une connexion qui vient d'être créée et dont le statut n'est pas encore propagé.

### 4. Nettoyage avant une nouvelle connexion OAuth

Avant d'initier un nouveau flow OAuth, nettoyer les comptes non-actifs du même toolkit pour éviter les conflits :

```typescript
const existing = await composio.connectedAccounts.list({
    userIds: [entityId],
    toolkitSlugs: [toolkitSlug],
});

for (const account of existing.items.filter((a) => a.status !== "ACTIVE")) {
    await composio.connectedAccounts.delete(account.id);
}
```

### 5. Multiples connexions du même toolkit

Un utilisateur peut avoir "Gmail Perso" et "Gmail Pro". Implications :

- Chaque connexion a son propre `composioAccountId`
- Le champ `title` distingue les connexions pour l'utilisateur
- Quand les deux sont utilisées dans un flux, les outils sont mergés mais chaque exécution utilise le bon compte via `beforeExecute`
- **Attention** : si deux connexions du même toolkit sont passées, le dernier `composioAccountId` gagne dans le map toolkit → accountId. L'UI doit empêcher de sélectionner deux connexions du même toolkit dans un seul noeud.

### 6. Erreurs Composio : parsing non standard

Les erreurs Composio arrivent dans un format `"<status> <JSON>"` qu'il faut parser :

```typescript
function parseComposioError(errorMessage: string) {
    const jsonMatch = errorMessage.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
}
```

**Slugs d'erreur connus et leur mapping :**

| Slug Composio                                   | Code HTTP | Action                         |
| ----------------------------------------------- | --------- | ------------------------------ |
| `TriggerInstance_WebhookConfigInvalid`          | 400       | Config invalide                |
| `TriggerInstance_NotFound` / `Trigger_NotFound` | 404       | Trigger inexistant             |
| `ConnectedAccount_NotFound`                     | 404       | Compte supprimé → reconnecter  |
| `ConnectedAccount_Unauthorized`                 | 403       | Permissions insuffisantes      |
| `ConnectedAccount_InsufficientPermissions`      | 403       | Idem                           |
| `RateLimit_Exceeded`                            | 429       | Rate limit                     |
| Autres                                          | 500       | Log + trace ID pour le support |

### 7. Webhook : timestamp en formats multiples

Le header `webhook-timestamp` peut arriver en secondes, millisecondes, ou ISO string selon la version de Composio :

```typescript
const parsed = parseInt(timestamp, 10);
if (!isNaN(parsed)) {
    // > 1e12 → millisecondes, sinon secondes
    seconds = parsed > 1e12 ? Math.floor(parsed / 1000) : parsed;
} else {
    // ISO string
    seconds = Math.floor(new Date(timestamp).getTime() / 1000);
}
```

### 8. Auth config orpheline après erreur d'insertion BDD

Si l'insertion en BDD échoue après la création de l'auth config chez Composio, on a un orphelin distant. **Toujours nettoyer** :

```typescript
const newAuthConfig = await composio.authConfigs.create(toolkitSlug, options);
try {
  await db.insert(integrationAuthConfig).values({ authConfigId: newAuthConfig.id, ... });
} catch (error) {
  // Cleanup: supprimer l'auth config distante orpheline
  await composio.authConfigs.delete(newAuthConfig.id).catch(() => {});
  throw error;
}
```

### 9. Conflit de comptes multiples

Composio peut lever `ComposioMultipleConnectedAccountsError` quand un utilisateur a plusieurs comptes actifs pour le même toolkit. Intercepter et retourner un 409 pour que le client affiche un message approprié.

### 10. Données Redis expirées pendant un OAuth

Si les données en attente dans Redis expirent (TTL 10min) avant que l'utilisateur ne complète l'OAuth, le poll côté client ne trouvera pas les données. Le serveur doit retourner une erreur claire indiquant que le flow OAuth a expiré et qu'il faut recommencer.

---

## Checklist d'intégration

### Setup initial

- [ ] Deux clients Composio (avec et sans provider)
- [ ] Variables d'env : `COMPOSIO_API_KEY`, `COMPOSIO_WEBHOOK_SECRET`
- [ ] Tables BDD : `integrationAuthConfig`, `integrationConnection`, `integrationToolPreference`
- [ ] Contrainte UNIQUE sur `(organizationId, toolkitSlug)` dans `integrationAuthConfig`
- [ ] Store temporaire pour les données OAuth en attente (Redis / KV avec TTL)

### Connexion OAuth

- [ ] Validation du callback URL
- [ ] Nettoyage des comptes non-actifs avant nouvelle connexion
- [ ] Stockage du `connectionRequestId` avec TTL
- [ ] Polling avec timeout pour `waitForConnection()`
- [ ] Création du record local avec `toolkitVersion` figée
- [ ] Création des `toolPreferences` par défaut

### Récupération des outils

- [ ] Hook `beforeExecute` pour injecter userId, connectedAccountId, version
- [ ] Enregistrement des custom tools avant le fetch
- [ ] Filtrage enabled/disabled/sensitive
- [ ] Support des overrides node-level (whitelist)

### Gestion des scopes

- [ ] Hash déterministe des scopes (sort + join)
- [ ] Détection du changement au `getOrCreateAuthConfig`
- [ ] Patch de l'auth config distante
- [ ] Flag `needsReauth` sur les connexions impactées

### Webhooks

- [ ] Vérification de signature (Svix format)
- [ ] Validation du timestamp (fenêtre 10min)
- [ ] Comparaison constant-time
- [ ] Health check endpoint (GET)
- [ ] Gestion des triggers inactifs / flows non-publiés

### Robustesse

- [ ] Race condition sur auth config (unique constraint + retry)
- [ ] Nettoyage des orphelins (BDD + Composio)
- [ ] Parsing des erreurs Composio non-standard
- [ ] Grace period avant nettoyage des connexions récentes
- [ ] Cleanup de l'auth config distante si l'insertion BDD échoue

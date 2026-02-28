# Convex Guidelines

## Function Guidelines

### New Function Syntax
- ALWAYS use the new function syntax for Convex functions:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    handler: async (ctx, args) => {
    // Function body
    },
});
```

### HTTP Endpoint Syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
    }),
});
```
- HTTP endpoints are always registered at the exact path you specify in the `path` field.

### Validators
- Array validator example:
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
},
handler: async (ctx, args) => {
    //...
},
});
```
- Discriminated union schema example:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    results: defineTable(
        v.union(
            v.object({
                kind: v.literal("error"),
                errorMessage: v.string(),
            }),
            v.object({
                kind: v.literal("success"),
                value: v.number(),
            }),
        ),
    )
});
```
- Valid Convex types:

| Convex Type | TS/JS type  | Example Usage          | Validator                       | Notes                                                                                          |
| ----------- | ----------- | ---------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Id          | string      | `doc._id`              | `v.id(tableName)`               |                                                                                                |
| Null        | null        | `null`                 | `v.null()`                      | `undefined` is not valid. Functions returning `undefined` return `null` from client. Use `null` |
| Int64       | bigint      | `3n`                   | `v.int64()`                     | Only BigInts between -2^63 and 2^63-1                                                          |
| Float64     | number      | `3.1`                  | `v.number()`                    | All IEEE-754 double-precision floating point numbers                                           |
| Boolean     | boolean     | `true`                 | `v.boolean()`                   |                                                                                                |
| String      | string      | `"abc"`                | `v.string()`                    | UTF-8, must be < 1MB                                                                          |
| Bytes       | ArrayBuffer | `new ArrayBuffer(8)`   | `v.bytes()`                     | Must be < 1MB                                                                                  |
| Array       | Array       | `[1, 3.2, "abc"]`      | `v.array(values)`               | Max 8192 values                                                                                |
| Object      | Object      | `{a: "abc"}`           | `v.object({property: value})`   | Max 1024 entries. Fields must not start with `$` or `_`                                        |
| Record      | Record      | `{"a": "1", "b": "2"}` | `v.record(keys, values)`        | Keys must be ASCII, nonempty, not start with `$` or `_`                                        |

### Function Registration
- Use `internalQuery`, `internalMutation`, `internalAction` for internal (private) functions. Always import from `./_generated/server`.
- Use `query`, `mutation`, `action` for public functions. Do NOT use public registrations for sensitive internal functions.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument validators for all Convex functions.
- Functions without a return value implicitly return `null`.

### Function Calling
- `ctx.runQuery` — call a query from a query, mutation, or action.
- `ctx.runMutation` — call a mutation from a mutation or action.
- `ctx.runAction` — call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. V8 to Node). Otherwise, extract shared code into a helper async function.
- Minimize calls from actions to queries/mutations. Each is a transaction — splitting logic risks race conditions.
- All calls take a `FunctionReference`. Do NOT pass the callee function directly.
- When calling a function in the same file, add a type annotation on the return value to work around TypeScript circularity:
```typescript
export const f = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

### Function References
- Use `api` object from `convex/_generated/api.ts` for public functions.
- Use `internal` object from `convex/_generated/api.ts` for internal functions.
- File-based routing: `convex/example.ts` function `f` → `api.example.f`.
- Internal: `convex/example.ts` function `g` → `internal.example.g`.
- Nested directories: `convex/messages/access.ts` function `h` → `api.messages.access.h`.

### API Design
- File-based routing — organize files thoughtfully within `convex/`.
- Use `query`, `mutation`, `action` for public functions.
- Use `internalQuery`, `internalMutation`, `internalAction` for private functions.

### Pagination
```ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listWithExtraArg = query({
    args: { paginationOpts: paginationOptsValidator, author: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
        .query("messages")
        .withIndex("by_author", (q) => q.eq("author", args.author))
        .order("desc")
        .paginate(args.paginationOpts);
    },
});
```
- `paginationOpts` properties: `numItems` (v.number()), `cursor` (v.union(v.string(), v.null()))
- `.paginate()` returns: `page` (array of docs), `isDone` (boolean), `continueCursor` (string)

## Validator Guidelines
- `v.bigint()` is deprecated. Use `v.int64()` instead.
- Use `v.record()` for record types. `v.map()` and `v.set()` are NOT supported.

## Schema Guidelines
- Always define schema in `convex/schema.ts`.
- Always import schema definition functions from `convex/server`.
- System fields `_creationTime` (v.number()) and `_id` (v.id(tableName)) are auto-added.
- Include all index fields in the index name (e.g. `by_field1_and_field2`).
- Index fields must be queried in order. Create separate indexes for different query orders.

## TypeScript Guidelines
- Use `Id<'tableName'>` from `./_generated/dataModel` for table ID types.
- Record with Id example:
```ts
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const exampleQuery = query({
    args: { userIds: v.array(v.id("users")) },
    handler: async (ctx, args) => {
        const idToUsername: Record<Id<"users">, string> = {};
        for (const userId of args.userIds) {
            const user = await ctx.db.get(userId);
            if (user) {
                idToUsername[user._id] = user.username;
            }
        }
        return idToUsername;
    },
});
```
- Be strict with types — use `Id<'users'>` not `string` for document IDs.
- Use `as const` for string literals in discriminated unions.
- Declare arrays as `const array: Array<T> = [...]`.
- Declare records as `const record: Record<KeyType, ValueType> = {...}`.

## Full Text Search
```ts
const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);
```

## Query Guidelines
- Do NOT use `filter` in queries. Define an index and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Use `.collect()`, iterate, and call `ctx.db.delete(row._id)`.
- Use `.unique()` for single documents (throws if multiple match).
- For async iteration, use `for await (const row of query)` — not `.collect()` or `.take(n)`.

### Ordering
- Default order: ascending `_creationTime`.
- Use `.order('asc')` or `.order('desc')` to set order.
- Index-based queries order by index columns.

## Mutation Guidelines
- `ctx.db.replace` — fully replace an existing document (throws if not found).
- `ctx.db.patch` — shallow merge updates into a document (throws if not found).

## Action Guidelines
- Always add `"use node";` at the top of files using Node.js built-in modules.
- NEVER add `"use node";` to files that also export queries or mutations. Put actions in separate files.
- `fetch()` is available in the default runtime — no need for `"use node";` just for fetch.
- NEVER use `ctx.db` inside an action. Actions don't have database access.
- Action syntax:
```ts
import { action } from "./_generated/server";

export const exampleAction = action({
    args: {},
    handler: async (ctx, args) => {
        console.log("This action does not return anything");
        return null;
    },
});
```

## Scheduling Guidelines

### Crons
- Only use `crons.interval` or `crons.cron` methods. Do NOT use `crons.hourly`, `crons.daily`, or `crons.weekly`.
- Both methods take a FunctionReference — do NOT pass functions directly.
- Define crons by declaring a top-level `crons` object, calling methods, and exporting as default:
```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const empty = internalAction({
  args: {},
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```
- You can register Convex functions within `crons.ts`.
- Always import `internal` from `_generated/api`, even for functions in the same file.

## File Storage Guidelines
- Convex includes file storage for large files (images, videos, PDFs).
- `ctx.storage.getUrl()` returns a signed URL (or `null` if file doesn't exist).
- Do NOT use deprecated `ctx.storage.getMetadata`. Query the `_storage` system table instead:
```ts
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
    _id: Id<"_storage">;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
}

export const exampleQuery = query({
    args: { fileId: v.id("_storage") },
    handler: async (ctx, args) => {
        const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
        return metadata;
    },
});
```
- Convex storage stores items as `Blob` objects. Convert to/from `Blob` when using storage.

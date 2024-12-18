import { Elysia, t } from "elysia";
import { AuthRoutes, TenantRoutes } from "./routes";
import { AUTH_PREFIX, TENANT_PREFIX } from "./utils/key_types";
import { ip } from "elysia-ip";
import { createClient } from "redis";
import { REDIS_URL } from "./utils/constants";
import { Seeding } from "./seed/seed";

export const clientRedis = createClient({
  url: REDIS_URL,
  password: "",
})

const app = new Elysia()

//Home page
// app.get('/', () => 'Hello from chatgpt service! v0.0.0')
app.get('/', () => 'Hello from chatgpt service DEV! v0.0.1')

//Api Routes
const prefix = "/api"
app.use(ip())
app.group(`${prefix}/${AUTH_PREFIX}`, (app) => app.use(AuthRoutes))
app.group(`${prefix}/${TENANT_PREFIX}`, (app) => app.use(TenantRoutes))


app.ws('/ws', {
  body: t.Object({
    message: t.String(),
  }),
  open: (ws) => {
    // ws.raw.id = ws.id = crypto.randomUUID()
    ws.id = crypto.randomUUID()
    ws.send(`Open ID ${ws.id}`)
    // console.log('Open ID:', ws.raw.id)
  },
  message: (ws) => {
    ws.send(`Open ID ${ws.id}`)
    console.log('message:', ws.id);
  },
  close: (ws) => {
    console.log('close:', ws.id);
  },
  error: (c) => {
    console.log('error:', JSON.stringify(c));
  },
})

app.listen({idleTimeout:20,port:3001})

const checkConnRedis = async() => {
  try {
    clientRedis
      .on('error', (err) => console.log('❌ Redis Failed to connect with error: ', err))
      .connect().then(() => Seeding().then(() => console.log('✅ Successfully seeded to redis')))

  } catch (e: any) {
    console.log('❌ Failed connection to redis check with error: ', e)
  }
}

checkConnRedis()

console.log(
  `✅ Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

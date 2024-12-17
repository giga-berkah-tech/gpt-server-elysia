import { Elysia, t } from "elysia";


const app = new Elysia().ws('/ws', {
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
    .listen(3001)




console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

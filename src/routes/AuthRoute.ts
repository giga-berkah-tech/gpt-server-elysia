import Elysia, { Context, t } from "elysia";
import { addIpAllowed, getListIp, getMyIp, removeIpAllowed } from "../controllers/AuthController";
import { failedResponse } from "../helpers/response_json";

// const prefix = "/auth"

const Routes = new Elysia()
    .get(`/list`, () => getListIp())
    .get(`/my-ip`, ({ ip }: any) => getMyIp(ip))
    .post(`/add`, ({ body }) => addIpAllowed(body as { ip: string }), {
        body: t.Object({
            ip: t.String(),
        }),
    })
    .delete(`/remove`, ({ body }) => removeIpAllowed(body as { ip: string }), {
        body: t.Object({
            ip: t.String(),
        }),
    }).onError(({ code, error }: any) => {
        var message = JSON.parse(error.message)
        return failedResponse(message.errors.map((val: any) => val.summary).join(', '), 200)
    })

export const AuthRoutes = Routes;
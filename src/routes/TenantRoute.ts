import Elysia, { Context, t } from "elysia";
import { createTenant, deleteAllTenant, deleteTenantWithTenantKey, editTenant, getTenantData, getTenantDetail, getTenants } from "../controllers/TenantController";
import { checkIp } from "../controllers/AuthController";
import { failedResponse } from "../helpers/response_json";
import { checkValidToken, tokenNotValidMsg } from "../services/AuthService";
import { json } from "stream/consumers";

// const prefix = "/auth"

const Routes = new Elysia()
    .get(`/`, async (context: Context) => {
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenants()
    })
    .get(`/:id`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenantDetail(context.params.id)
    })
    .post(`/`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return createTenant(context.body)
    }, {
        body: t.Object({
            name: t.String(),
            max_context: t.Optional(t.String()),
            max_consumption_token: t.Optional(t.String()) ,
            chat_gpt_key: t.String(),
            status: t.Boolean(),
            model_open_ai_id: t.Optional(t.String()),
        }),
    })
    .put(`/:id`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return editTenant(context.body, context.params.id)
    }, {
        body: t.Object({
            name: t.String(),
            max_context: t.Optional(t.String()) ,
            max_consumption_token: t.Optional(t.String()),
            chat_gpt_key: t.Optional(t.String()),
            model_open_ai_id: t.Optional(t.String()),
            status: t.Boolean(),
        }),
    })
    .delete(`/`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return deleteTenantWithTenantKey(context.body)
    }, {
        body: t.Object({
            tenant_name: t.String(),
        }),
    })
    .delete(`/all`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return deleteAllTenant()
    })
    .get(`/data/:id?`, async (context: Context) => {
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        if (context.params.id == null) {
            return failedResponse("Tenant must not be empty", 200)
        }
        return getTenantData(context.params.id ?? '')
    }).onError(({ code, error }: any) => {
        var message = JSON.parse(error.message)
        return failedResponse(message.errors.map((val: any) => val.summary).join(', '), 200)
    })

export const TenantRoutes = Routes;
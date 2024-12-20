import Elysia, { Context, t } from "elysia";
import { createTenant, deleteAllTenant, deleteTenantWithTenantKey, editTenant, getTenantData, getTenantDetail, getTenants } from "../controllers/TenantController";
import { checkIp } from "../controllers/AuthController";
import { failedResponse } from "../helpers/response_json";
import { checkValidToken } from "../services/AuthService";

// const prefix = "/auth"

const Routes = new Elysia()
    .get(`/`, async (context: Context) => {
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenants()
    })
    .get(`/:id`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenantDetail(context.params.id)
    })
    .post(`/`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
       return createTenant(context.body)
    }, {
        body: t.Object({
            name: t.String(),
            max_context: t.Number(),
            chat_gpt_key: t.String(),
            status: t.Boolean(),
        }),
    })
    .put(`/:id`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return editTenant(context.body,context.params.id)
    }, {
        body: t.Object({
            tenant_name: t.String(),
            max_consumption_token: t.Number(),
            max_context: t.Number(),
            status: t.Boolean(),
        }),
    })
    .delete(`/`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!checkValidToken(context)) {
            return failedResponse("Token not valid", 401)
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
            return failedResponse("Token not valid", 401)
        }
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return deleteAllTenant()
    })
    .get(`/data/:id`, async (context: Context) => {
        console.log(context.headers.authorization)
        if (!await checkIp(context)) {
            return failedResponse("You are not allowed", 403)
        }
        return getTenantData(context.params.id)
    })

export const TenantRoutes = Routes;
import Elysia, { Context, t } from "elysia";
import { checkValidToken, tokenNotValidMsg} from "../services/AuthService";
import { failedResponse } from "../helpers/response_json";
import { getModelListByTenant, createTenantModelList } from "../controllers/TenantModelListController";
import { cors } from '@elysiajs/cors';

const Routes = new Elysia()
    .use(cors({
        origin: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }))
    .get(`/:id`, async (context: Context) => {
        const tenant = context.params.id as string;
        return getModelListByTenant(tenant);
    })
    .post(`/`, async (context: Context) => {
        if (!checkValidToken(context)) {
          return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401)
        }
        const { tenant, models } = context.body as { tenant: string, models: string[] };
        
        if (!tenant || !models || !Array.isArray(models)) {
            return failedResponse("Tenant and models array are required", 400);
        }
        
        return createTenantModelList(tenant, models);
    }, {
        body: t.Object({
            tenant: t.String(),
            models: t.Array(t.String())
        })
    })
    .onError(({ code, error }: any) => {
        try {
            var message = JSON.parse(error.message);
            return failedResponse(message.errors.map((val: any) => val.summary).join(', '), 200);
        } catch (e) {
            return failedResponse(error.message, 500);
        }
    });

export const TenantModelListRoutes = Routes;

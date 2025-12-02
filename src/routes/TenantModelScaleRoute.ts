import Elysia, { Context, t } from 'elysia';
import {
  getTenantModelScale,
  createTenantModelScale,
  getTenantModelScaleDetail,
  deleteTenantModelScale,
  getTenantModelScaleRedis,
} from '../controllers/TenantScaledModel';
import { checkIp } from '../controllers/AuthController';
import { failedResponse } from '../helpers/response_json';
import { checkValidToken, tokenNotValidMsg } from '../services/AuthService';

// const prefix = "/auth"

const Routes = new Elysia()
  .get(`/`, async (context: Context) => {
    if (!checkValidToken(context)) {
      return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401);
    }
    if (!(await checkIp(context))) {
      return failedResponse('You are not allowed', 403);
    }
    return getTenantModelScaleRedis();
  })
  .get(`/:model`, async (context: Context) => {
    const params = context.params.model as string;
    if (!checkValidToken(context)) {
      return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401);
    }
    if (!(await checkIp(context))) {
      return failedResponse('You are not allowed', 403);
    }
    return getTenantModelScaleDetail(params);
  })
  .post(`/`, async (context: Context) => {
    const { model, scale } = context.body as { model: string; scale: number };
    if (!checkValidToken(context)) {
      return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401);
    }
    if (!(await checkIp(context))) {
      return failedResponse('You are not allowed', 403);
    }
    return createTenantModelScale(model, scale);
  })
  .delete(`/:model`, async (context: Context) => {
    const params = context.params.model as string;
    if (!checkValidToken(context)) {
      return failedResponse(`Token not valid => ${tokenNotValidMsg}`, 401);
    }
    if (!(await checkIp(context))) {
      return failedResponse('You are not allowed', 403);
    }
    return deleteTenantModelScale(params);
  })
  .onError(({ code, error }: any) => {
    var message = JSON.parse(error.message);
    return failedResponse(
      message.errors.map((val: any) => val.summary).join(', '),
      200
    );
  });

export const TenantModelScaleRoute = Routes;

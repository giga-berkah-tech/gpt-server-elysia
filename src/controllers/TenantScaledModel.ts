import prisma from '../helpers/prisma_client';
import { failedResponse, successDataResponse } from '../helpers/response_json';
import { clientRedis } from '..';

interface ScalePrice {
  id: number;
  model: string;
  scale: number;
}

const REDIS_KEY = 'scale_price';

const createOrUpdateRedis = async (
  mode: 'create' | 'update',
  data: ScalePrice
) => {
  const raw = await clientRedis.get(REDIS_KEY);
  const parsed: ScalePrice[] = raw ? JSON.parse(raw) : [];
  if (mode === 'create') {
    const created: ScalePrice[] = [...parsed, data];
    return await clientRedis.set(REDIS_KEY, JSON.stringify(created));
  }

  const filtered: ScalePrice[] = parsed.filter(
    (item) => item.model !== data.model
  );

  const updated: ScalePrice[] = [...filtered, data];

  await clientRedis.set(REDIS_KEY, JSON.stringify(updated));
};

export const getTenantModelScaleRedis = async () => {
  const redisValue = await clientRedis.get(REDIS_KEY);
  const redisResponse = successDataResponse(JSON.parse(redisValue || '[]'));
  return redisValue ? redisResponse : await getTenantModelScale();
};

export const getTenantModelScale = async () => {
  const tenantModelScaleList = await prisma.tenantScaledModel.findMany();
  if (tenantModelScaleList.length > 0) {
    return successDataResponse(tenantModelScaleList);
  }
  return failedResponse('Tenant Model Scale is empty', 404);
};

export const getTenantModelScaleDetail = async (model: string) => {
  const existingTenantModelScale = await prisma.tenantScaledModel.findFirst({
    where: { model },
  });
  if (existingTenantModelScale) {
    return successDataResponse(existingTenantModelScale);
  }
  return failedResponse(`The model ${model} is not found`, 404);
};

export const createTenantModelScale = async (model: string, scale: number) => {
  try {
    const existingTenantModelScale = await prisma.tenantScaledModel.findFirst({
      where: { model },
    });

    if (existingTenantModelScale) {
      const tenantScaledModel = await prisma.tenantScaledModel.update({
        where: { model },
        data: { model, scale },
      });
      await createOrUpdateRedis('update', tenantScaledModel);
      return successDataResponse(tenantScaledModel);
    }
    const tenantScaledModel = await prisma.tenantScaledModel.create({
      data: { model, scale },
    });
    await createOrUpdateRedis('create', tenantScaledModel);
    return successDataResponse(tenantScaledModel);
  } catch (error) {
    return failedResponse(`Error creating tenant model scale: ${error}`, 500);
  }
};

export const deleteTenantModelScale = async (model: string) => {
  try {
    const existingTenantModelScale = await prisma.tenantScaledModel.findFirst({
      where: { model },
    });
    if (existingTenantModelScale) {
      const tenantScaledModel = await prisma.tenantScaledModel.delete({
        where: { model },
      });
      return successDataResponse(tenantScaledModel);
    }
    return failedResponse(`The model ${model} was not found`, 404);
  } catch (error) {
    return failedResponse('Error deleting model scale list', 500);
  }
};

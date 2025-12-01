import prisma from '../helpers/prisma_client';
import { failedResponse, successDataResponse } from '../helpers/response_json';

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
      return successDataResponse(tenantScaledModel);
    }
    const tenantScaledModel = await prisma.tenantScaledModel.create({
      data: { model, scale },
    });
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

import prisma from "../helpers/prisma_client"
import { failedResponse, successDataResponse } from "../helpers/response_json";

export const getModelListByTenant = async (tenant: string) => {
    if (!tenant) {
        return failedResponse('Tenant is required', 400);
    }

    const tenantModelList = await prisma.tenantModelList.findUnique({
        where: {
            tenant: tenant
        }
    });

    if (tenantModelList) {
        return successDataResponse({
            tenant: tenantModelList.tenant,
            models: tenantModelList.models
        });
    } else {
        return failedResponse('Model list for this tenant not found', 404);
    }
}

export const createTenantModelList = async (tenant: string, models: string[]) => {
    try {
        const existingTenantModelList = await prisma.tenantModelList.findUnique({
            where: {
                tenant: tenant
            }
        });

        if (existingTenantModelList) {
            const updatedTenantModelList = await prisma.tenantModelList.update({
                where: {
                    tenant: tenant
                },
                data: {
                    models: models
                }
            });
            return successDataResponse(updatedTenantModelList);
        } else {
            const newTenantModelList = await prisma.tenantModelList.create({
                data: {
                    tenant: tenant,
                    models: models
                }
            });
            return successDataResponse(newTenantModelList);
        }
    } catch (error) {
        return failedResponse(`Error creating/updating tenant model list: ${error}`, 500);
    }
}

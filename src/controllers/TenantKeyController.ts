import prisma from "../helpers/prisma_client"
import { failedResponse, successDataResponse, successResponse } from "../helpers/response_json"
import { fetchTenantKeys, tenantKeyData } from "../services/LoadDataService"
import { TenantKeys } from "../types/tenant"

export const getTenantKeys = async () => {
    let tenantKeyTemp: TenantKeys[] = []
    const getTenantKey = tenantKeyData
    if (getTenantKey.length > 0) {
        getTenantKey.map((val: any) => {
            tenantKeyTemp.push({
                ...val
            })
        })
        return successDataResponse(tenantKeyTemp)
    }else{
        return failedResponse('Tenants_keys not found', 404)
    }
}

export const editTenantKey = async (body:any) => {

    let tenantKeyTemp: TenantKeys[] = []

    if (body.chat_gpt_key == null || body.chat_gpt_key == '' || body.chat_gpt_key == undefined || body.tenant_name == null || body.tenant_name == '') {
        return failedResponse( 'Tenant name and Chat gpt key is required', 422)
    }

    const getTenantKeys = tenantKeyData

    if (getTenantKeys.length > 0) {

        getTenantKeys.map((val: any) => {
            tenantKeyTemp.push({
                ...val
            })
        })

        if (getTenantKeys.find((val: any) => val.tenantName == body.tenant_name) == null) {
            return failedResponse( 'Tenant name not found', 404)
        }

        tenantKeyTemp = tenantKeyTemp.map((val: any) => {
            if (val.tenantName == body.tenant_name) {
                return {
                    ...val,
                    chatGptKey: body.chat_gpt_key == undefined ? val.chatGptKey : body.chat_gpt_key
                }
            } else {
                return val
            }
        })

        await prisma.tenantKey.update({
            where: {
                tenantName: body.tenant_name
            },
            data: {
                chatGptKey: body.chat_gpt_key
            }
        })
        fetchTenantKeys()

        return successResponse( 'Success edit tenant key', 200)
    } else {
        return failedResponse( 'Tenant not found', 404)
    }

}
import { Context } from "elysia"
import { clientRedis } from ".."
import { failedResponse, successDataResponse, successResponse } from "../helpers/response_json"
import { Tenant, TenantKeys } from "../types/tenant"
import { REDIS_TENANT, REDIS_TENANT_KEYS } from "../utils/key_types"
import { fetchTenantKeys, tenantKeyData } from "../services/LoadDataService"
import prisma from "../helpers/prisma_client"

export const getTenants = async () => {
    let tenantTemp: Tenant[] = []
    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenantKey = tenantKeyData
    if (getTenants != null && getTenantKey.length > 0) {
        JSON.parse(getTenants).map((val: any) => {
            tenantTemp.push({
                ...val,
                chatGptKey: getTenantKey.find((valTenantKey: any) => valTenantKey.tenantName == val.id)?.chatGptKey != null
            })
        })
        fetchTenantKeys()
        return successDataResponse(tenantTemp)
    }else{
        return failedResponse( 'Tenants or tenants_key not found', 404)
    }
}

export const getTenantDetail = async (tenantId: any) => {

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenantKey = tenantKeyData
    if (getTenants != null && getTenantKey.length > 0) {
        if (JSON.parse(getTenants).find((val: any) => val.id == tenantId) != null) {
            var result = {
                ...JSON.parse(getTenants).find((val: any) => val.id == tenantId),
                chatGptKey: tenantKeyData.find((val: any) => val.tenantName == tenantId.toString())?.chatGptKey != null &&tenantKeyData.find((val: any) => val.tenantName == tenantId.toString())?.chatGptKey != "" ,
            }
            return successDataResponse(result)
        }else{
            return failedResponse( 'Tenant or tenant_key not found', 404)
        }
    }else{
        return failedResponse( 'Tenants_keys or tenants_key key not found', 404)
    }
}

export const createTenant = async (body:any) => {

    let tenantTemp: Tenant[] = []
    let tenantKeyTemp: TenantKeys[] = []

    if (body.name == undefined || body.max_context == undefined || body.chat_gpt_key == undefined || body.name == null || body.max_context == null || body.chat_gpt_key == null || body.name == '' || body.max_context == '' || body.chat_gpt_key == '') {
        return failedResponse( 'Name tenant, max input token and chat gpt key is required', 422)
    }

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenant_keys = tenantKeyData

    if (getTenants != null && getTenant_keys != null) {
        JSON.parse(getTenants).map((val: any) => {
            tenantTemp.push({
                ...val
            })
        })
        getTenant_keys.map((val: any) => {
            tenantKeyTemp.push({
                // id: val.id,
               ...val
            })
        })
        if (JSON.parse(getTenants).find((val: any) => val.id == body.name) != null) {
            return failedResponse( 'Tenants already exists', 409)
        }

        if (getTenant_keys.find((val: any) => val.tenantName == body.name) != null) {
            return failedResponse( 'Tenant_key already exists', 409)
        }

        //============= Redis ===================
        tenantTemp.push({
            id: body.name.replaceAll(' ', '_').toString(),
            name: body.name.toString(),
            maxContext: parseInt(body.max_context),
            maxConsumptionToken: body.max_consumption_token == undefined ? 1000000 : parseInt(body.max_consumption_token),
            totalPromptTokenUsage: 0,
            totalCompletionTokenUsage: 0,
            status: body.status ?? false
        })

        // tenantKeyTemp.push({
        //     tenantName: body.name.toString(),
        //     chatGptKey: body.chat_gpt_key,
        // })

        await clientRedis.set(
            REDIS_TENANT,
            JSON.stringify([...tenantTemp]),
        )

        // await clientRedis.set(
        //     REDIS_TENANT_KEYS,
        //     JSON.stringify([...tenantKeyTemp]),
        // )

        //============= Postgree ====================
        await prisma.tenant.create({
            data: {
                id: body.name.replaceAll(' ', '_').toString(),
                name: body.name.toString(),
                maxContext: parseInt(body.max_context),
                maxConsumptionToken: body.max_consumption_token == undefined ? 1000000 : parseInt(body.max_consumption_token),
                totalPromptTokenUsage: 0,
                totalCompletionTokenUsage: 0,
                status: body.status ?? false
            }
        })

        await prisma.tenantKey.create({
            data: {
                tenantName: body.name.replaceAll(' ', '_').toString(),
                chatGptKey: body.chat_gpt_key,
            }
        })

        fetchTenantKeys()

        return successResponse( 'Success add new tenant', 200)
    } else {
        return failedResponse( 'Tenant or tenant key not found in redis', 404)
    }
}

export const deleteTenantWithTenantKey = async (body:any) => {

    let tenantTemp: Tenant[] = []
    let tenantKeyTemp: TenantKeys[] = []


    if (body.tenant_name == null || body.tenant_name == '') {
        return failedResponse('Tenant name is required', 422)
    }

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenant_keys = tenantKeyData

    if (getTenants != null && getTenant_keys.length > 0) {
        JSON.parse(getTenants).map((val: any) => {
            tenantTemp.push({
                ...val
            })
        })
        tenantKeyData.map((val: any) => {
            tenantKeyTemp.push({
                // id: val.id,
                ...val
            })
        })

        if (JSON.parse(getTenants).find((val: any) => val.id == body.tenant_name) == null) {
            return failedResponse('Tenant not found', 404)
        }

        if (tenantKeyData.find((val: any) => val.tenantName == body.tenant_name) == null) {
            return failedResponse('Tenant key not found', 404)
        }

        //============= Redis ===================

        tenantTemp = tenantTemp.filter((val: any) => val.id != body.tenant_name)
        tenantKeyTemp = tenantKeyTemp.filter((val: any) => val.tenantName != body.tenant_name)

        await clientRedis.set(
            REDIS_TENANT,
            JSON.stringify([...tenantTemp]),
        )

        await clientRedis.set(
            REDIS_TENANT_KEYS,
            JSON.stringify([...tenantKeyTemp]),
        )

        //============= Postgree ===================

        await prisma.tenant.delete({
            where: {
                id: body.tenant_name
            }
        })

        await prisma.tenantKey.delete({
            where: {
                tenantName: body.tenant_name
            }
        })

        fetchTenantKeys()

        return successResponse('Success delete tenant', 200)
    } else {
        return failedResponse('Tenant or tenant key not found in redis', 404)
    }
}

export const editTenant = async (body:any,tenantId:string) => {

    let tenantTemp: Tenant[] = []
    let tenantKeyTemp: TenantKeys[] = []


    if (body.tenant_name == null || body.max_context == null || body.tenant_name == '' || body.max_context == '' || body.status == null) {
        return failedResponse('Name tenant, max context & status must not be empty', 422)
    }

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenantKeys = tenantKeyData

    if (getTenants != null && getTenantKeys.length > 0) {
        JSON.parse(getTenants).map((val: any) => {
            tenantTemp.push({
                ...val
            })
        })

        getTenantKeys.map((val: any) => {
            tenantKeyTemp.push({
                // id: val.id,
                ...val
            })
        })

        if (JSON.parse(getTenants).find((val: any) => val.id == tenantId) == null) {
            return failedResponse('Tenant not found', 404)
        }

        if (getTenantKeys.find((val: any) => val.tenantName == tenantId) == null) {
            return failedResponse('Tenant key not found', 404)
        }

        //============= Redis ===================

        tenantTemp = tenantTemp.map((val: any) => {
            if (val.id == tenantId) {
                return {
                    ...val,
                    id:  body.tenant_name == undefined ? val.tenantName : body.tenant_name.replaceAll(' ', '_'),
                    name: body.tenant_name == undefined ? val.tenantName : body.tenant_name,
                    maxContext: body.max_context == undefined ? val.maxContext : parseInt(body.max_context),
                    maxConsumptionToken: body.max_consumption_token == undefined ? val.maxConsumptionToken : parseInt(body.max_consumption_token),
                    status: body.status == undefined ? val.status : body.status,
                }
            } else {
                return val
            }
        })

        // tenantKeyTemp = tenantKeyTemp.map((val: any) => {
        //     if (val.tenantName == body.tenant_name) {
        //         return {
        //             ...val,
        //             chatGptKey: body.chat_gpt_key == undefined ? val.chatGptKey : body.chat_gpt_key
        //         }
        //     } else {
        //         return val
        //     }
        // })

        await clientRedis.set(
            REDIS_TENANT,
            JSON.stringify([...tenantTemp]),
        )

        // await clientRedis.set(
        //     REDIS_TENANT_KEYS,
        //     JSON.stringify([...tenantKeyTemp]),
        // )

        //============= Postgree ===================

        await prisma.tenant.update({
            where: {
                id: tenantId
            },
            data: {
                id: body.tenant_name == undefined ? body.tenant_name : body.tenant_name.replaceAll(' ', '_'),
                name: body.tenant_name == undefined ? body.tenant_name : body.tenant_name,
                maxContext: body.max_context == undefined ? body.max_context : parseInt(body.max_context),
                maxConsumptionToken: body.max_consumption_token == undefined ? body.max_consumption_token : parseInt(body.max_consumption_token),
                status: body.status == undefined ? body.status : body.status,
            }
        })

        await prisma.tenantKey.update({
            where: {
                tenantName: tenantId
            },
            data: {
                tenantName: body.tenant_name == undefined ? body.tenant_name : body.tenant_name.replaceAll(' ', '_')
            }
        })
        

        fetchTenantKeys()

        return successResponse('Success edit tenant', 200)
    } else {
        return failedResponse('Tenant not found in redis', 404)
    }
}

export const deleteAllTenant = async () => {

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    const getTenantKeys = await clientRedis.get(REDIS_TENANT_KEYS) ?? null

    if (getTenants != null && getTenantKeys != null) {

        //============= Redis ===================
        await clientRedis.set(
            REDIS_TENANT,
            JSON.stringify([]),
        )

        await clientRedis.set(
            REDIS_TENANT_KEYS,
            JSON.stringify([]),
        )

        //============= Postgree ===================

        await prisma.tenant.deleteMany()
        await prisma.tenantKey.deleteMany()

        fetchTenantKeys()
        return successResponse('Success delete all tenant', 200)
    } else {
       return failedResponse('Tenant or tenant key not found in redis', 404)     
    }
}

export const getTenantData = async (tenantId: any) => {

    const getTenants = await clientRedis.get(REDIS_TENANT) ?? null
    if (getTenants != null) {
        if (JSON.parse(getTenants).find((val: any) => val.id == tenantId) != null) {
            var result:Tenant = {
                ...JSON.parse(getTenants).find((val: any) => val.id == tenantId)
            }
            return successDataResponse({
                maxContext: result.maxContext,
            })
        }else{
            return failedResponse( 'Tenant not found', 404)
        }
    }else{
        return failedResponse( 'Tenants_keys not found in redis', 404)
    }
}
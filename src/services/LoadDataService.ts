import prisma from "../helpers/prisma_client";
import { IpAllowed } from "../types/auth";
import { Tenant, TenantKeys } from "../types/tenant";

export const tenantKeyData:TenantKeys[] = []
export const tenantData:Tenant[] = []
export const ipAllowedData:IpAllowed[] = []

export const fetchTenantKeys = async () => {

    try {
        const tenantKeys = await prisma.tenantKey.findMany();

        tenantKeys.map((val: any) => {
            if (!tenantKeyData.find((item) => item.tenantName === val.tenantName)) {
                tenantKeyData.push({
                    ...val
                })
            }
        })
    } catch (error) {
        console.log("❌ Failed fetch tenant keys with error: ", error)
    }
    
}

export const fetchTenant = async () => {

    try {
        const tenants = await prisma.tenant.findMany();

        tenants.map((val: any) => {
            if (!tenantData.find((item) => item.id === val.id)) {
                tenantData.push({
                    ...val
                })
            }
        })
    } catch (error) {
        console.log("❌ Failed fetch tenant with error: ", error)
    }
}

export const fetchIpAllowed = async () => {

    try {
        const ipAlloweds = await prisma.ipAllowed.findMany();

        ipAlloweds.map((val: any) => {
            if (!ipAllowedData.find((item) => item.ip === val.ip)) {
                ipAllowedData.push({
                    ...val
                })
            }
        })
    } catch (error) {
        console.log("❌ Failed fetch ip_allowed with error: ", error)
    }
}
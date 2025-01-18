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
            const findTenantKey = tenantKeyData.find((item) => item.tenantName === val.tenantName);
            if (!findTenantKey) {
                tenantKeyData.push({
                    ...val
                })
            } else {
                const index = tenantKeyData.indexOf(findTenantKey);
                tenantKeyData[index] = {
                    ...val
                }
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
            const findTenant = tenantData.find((item) => item.id === val.id);
            if (!findTenant) {
                tenantData.push({
                    ...val
                })
            } else {
                const index = tenantData.indexOf(findTenant);
                tenantData[index] = {
                    ...val
                }
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
            const findIpAllowed = ipAllowedData.find((item) => item.ip === val.ip);
            if (!findIpAllowed) {
                ipAllowedData.push({
                    ...val
                });
            } else {
                const index = ipAllowedData.indexOf(findIpAllowed);
                ipAllowedData[index] = {
                    ...val
                };
            }
        })
    } catch (error) {
        console.log("❌ Failed fetch ip_allowed with error: ", error)
    }
}
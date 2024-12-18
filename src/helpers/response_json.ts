import { HttpStatusCode } from "axios"
import { Context } from "elysia"

export const successResponse = (message?: string, status?: HttpStatusCode) => {
     return {
          status: status ?? 200,
          message: message ?? 'Success'
     }
}

export const successDataResponse = (data: any, extras?: any, message?: string, status?: HttpStatusCode) => {
     return {
          status: status ?? 200,
          message: message ?? 'Success',
          data,
          extras
     }
}

export const failedResponse = (message?: string, status?: HttpStatusCode) => {
     return {
          status: status ?? 500,
          message: message ?? 'failed'
     }
}

export const failedDataResponse = (c: Context, data: any, message?: string, status?: HttpStatusCode) => {
     return {
          status: status ?? 500,
          message: message ?? 'failed',
          data
     }
}
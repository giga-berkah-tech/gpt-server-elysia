
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET_KEY } from "../utils/constants";
import { Context } from 'elysia';


export const checkValidToken = (c: Context) => {
    try {
        const token = c.headers.authorization
        jwt.verify(token ?? "", JWT_SECRET_KEY ?? "IS_A_SECRET_KEY");
        return true
    } catch (error: any) {
        console.log(error)
        return false
    }
}

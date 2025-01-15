import Elysia from "elysia";
import { getDateInDb, updateDateNow } from "../controllers/DateInDbController";
import { failedResponse } from "../helpers/response_json";

const Routes = new Elysia()
    .get(`/`, () => getDateInDb())
    .put(`/update`, () => updateDateNow())


export const DateInDbRoutes = Routes;
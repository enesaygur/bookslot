import { RequestHandler } from "express";
import { ZodType } from "zod";

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.query = schema.parse(req.query);
    next();
  };

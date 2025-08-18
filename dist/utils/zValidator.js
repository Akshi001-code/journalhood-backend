"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zValidator = void 0;
const zod_1 = require("zod");
const zValidator = ({ schema, type }) => {
    return async (req, res, next) => {
        try {
            const data = await schema.parse(req[type]);
            req[type] = data;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json(error.errors);
            }
        }
    };
};
exports.zValidator = zValidator;
//# sourceMappingURL=zValidator.js.map
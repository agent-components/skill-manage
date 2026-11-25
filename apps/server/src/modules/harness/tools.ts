import { z } from "zod";
import { TOOL_DEFINITIONS } from "../../shared/tool-definitions.js";

/** 宿主拉取的公开工具。path 相对本组件域名。 */
export type HarnessTool = {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

type ObjectJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

/** 由共享 zod 定义派生 JSON Schema；输入态保留 default，已选字段不进入 required。 */
function toInputSchema(params: z.ZodRawShape): ObjectJsonSchema {
  const schema = z.toJSONSchema(z.object(params), {
    target: "draft-7",
    io: "input",
  }) as ObjectJsonSchema & { $schema?: string };
  return schema.required
    ? { type: schema.type, properties: schema.properties, required: schema.required }
    : { type: schema.type, properties: schema.properties };
}

export const HARNESS_TOOLS: HarnessTool[] = TOOL_DEFINITIONS.flatMap((tool) =>
  tool.rest
    ? [
        {
          name: tool.name,
          description: tool.description,
          method: tool.rest.method,
          path: tool.rest.path,
          inputSchema: toInputSchema(tool.params),
        },
      ]
    : []
);

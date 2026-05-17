const tools = new Map();

export function registerTool(name, handler) {
  tools.set(name, handler);
}

export async function executeTool(name, args, context) {
  const handler = tools.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(args, context);
}

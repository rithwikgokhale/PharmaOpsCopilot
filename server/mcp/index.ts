/**
 * Stdio entry point for the PharmaOps MCP server.
 *
 *   npm run mcp
 *
 * Add to an MCP client (Cursor, Claude Desktop, …) with a command of
 * `npx tsx server/mcp/index.ts` run from the repository root. See
 * `mcp.json.example` and the README "MCP server" section.
 *
 * All logging goes to stderr — stdout is the protocol channel.
 */

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer, MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./server";
import { DataLoadError, isDataReady } from "../data/localDataAccess";
import { isLlmEnabled } from "../agent/llm";

async function main() {
  try {
    isDataReady();
  } catch (err) {
    const msg = err instanceof DataLoadError ? err.message : String(err);
    console.error(`[mcp] data not loaded — ${msg}`);
    process.exit(1);
  }

  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[mcp] ${MCP_SERVER_NAME} v${MCP_SERVER_VERSION} ready on stdio (llm: ${isLlmEnabled() ? "enabled" : "deterministic"})`
  );
}

main().catch((err) => {
  console.error("[mcp] fatal:", err);
  process.exit(1);
});

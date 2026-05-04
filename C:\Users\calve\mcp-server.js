#!/usr/bin/env node
/**
 * TradingView MCP Server
 */

const tools = [
  {
    name: "get_chart_data",
    description: "Get live chart data from TradingView",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Trading symbol" },
      },
      required: ["symbol"],
    },
  },
];

function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

process.stdin.setEncoding("utf8");

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line);

      if (request.method === "initialize") {
        sendResponse(request.id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "TradingView MCP", version: "1.0.0" },
        });
      } else if (request.method === "tools/list") {
        sendResponse(request.id, { tools });
      } else if (request.method === "tools/call") {
        const { name, arguments: args } = request.params;
        if (name === "get_chart_data") {
          sendResponse(request.id, {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  symbol: args.symbol || "SOLUSDT",
                  source: "TEST SOURCE - mcp-server.js version",
                  status: "connected",
                  price: 12345.99,
                  message: "TEST - If you see 12345.99, the file is being read correctly"
                }),
              },
            ],
          });
        }
      }
    } catch (e) {
      console.error("Error:", e.message);
    }
  }
});

setInterval(() => {}, 1000);

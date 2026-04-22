import axios from 'axios';

export class MCPService {
  constructor() { }

  async mcpInitialConnection(env: object) {
    try {
      const payload = {
        mcpServers: {
          'maps-and-gmail-server': {
            command: '/home/ubuntu/mcp_bot_builder/mcp-env/bin/python',
            args: ['/home/ubuntu/mcp_bot_builder/mcp_server.py'],
            env,
            transport: 'stdio',
          },
        },
      };

      const response = await axios.post(`${process.env.MCP_SERVER_URL}/connect_mcp`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      console.log('✅ MCP Connection successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error while connecting to MCP:', error.response?.data || error.message);
      throw error;
    }
  }

  async mcpCallTool(toolName: string, parameters: object) {
    try {
      const payload = {
        tool_name: toolName,
        parameters
      };

      const response = await axios.post(`${process.env.MCP_SERVER_URL}/call_tool`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      console.log('✅ MCP Tool calling successful:', response.data);
      return response.data;
    } catch (error) {
      console.log('error while calling mcp tool :', error);
    }
  }
}

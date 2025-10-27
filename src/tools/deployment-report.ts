import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraService } from '../services/jira';
import { formatResponse, formatErrorResponse } from './utils';

/**
 * Register the deployment-report tool with the MCP server
 * @param server The MCP server instance
 * @param jiraService The Jira service instance
 */
export function registerDeploymentReportTool(
  server: McpServer,
  jiraService: JiraService,
) {
  server.tool(
    'deployment_report',
    {
      project: z
        .string()
        .describe('Project key to track status changes for (e.g., "PROJ1")'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in DD-MM format (e.g., "10-10"). Defaults to 7 days ago.'),
      endDate: z
        .string()
        .optional()
        .describe('End date in DD-MM format (e.g., "15-10"). Defaults to today.'),
    },
    async ({ project, startDate, endDate }) => {
      try {
        // Validate project parameter
        if (!project) {
          throw new Error('project parameter is required. Please specify a project key (e.g., "PROJ1")');
        }

        // Parse dates with year-wrapping logic
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        let startDateFormatted: string;
        let endDateFormatted: string;

        if (startDate && endDate) {
          // Parse DD-MM format
          const [startDay, startMonth] = startDate.split('-').map(Number);
          const [endDay, endMonth] = endDate.split('-').map(Number);

          // Validate date components
          if (isNaN(startDay) || isNaN(startMonth) || isNaN(endDay) || isNaN(endMonth)) {
            throw new Error('Invalid date format. Use DD-MM format (e.g., "10-10" for Oct 10)');
          }
          if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
            throw new Error('Invalid month. Month must be between 01-12');
          }
          if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
            throw new Error('Invalid day. Day must be between 01-31');
          }

          // Smart year handling for year boundaries
          let startYear = currentYear;
          let endYear = currentYear;

          // If we're in early year (Jan-Mar) and start month is late year (Oct-Dec), use last year
          if (currentMonth <= 3 && startMonth >= 10) {
            startYear = currentYear - 1;
            endYear = currentYear;
          }
          // If end month < start month, assume year boundary crossed
          else if (endMonth < startMonth) {
            endYear = currentYear + 1;
          }

          startDateFormatted = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
          endDateFormatted = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        } else {
          // Default: last 7 days
          endDateFormatted = new Date().toISOString().split('T')[0];
          const start = new Date();
          start.setDate(start.getDate() - 7);
          startDateFormatted = start.toISOString().split('T')[0];
        }

        // Build JQL - note: status changed DURING syntax, with dynamic project
        const jql = `project = ${project} AND status changed DURING ("${startDateFormatted}", "${endDateFormatted}") ORDER BY updated DESC`;

        // Fetch with ONLY 6 fields - use searchIssuesRaw to preserve all field data
        const results = await jiraService.searchIssuesRaw(
          jql,
          50,
          undefined, // nextPageToken (first page)
          undefined, // expand
          ['summary', 'status', 'issuetype', 'updated', 'assignee', 'priority'],
        );

        // Group by current status
        const byStatus: Record<string, any[]> = {};

        results.issues.forEach((issue: any) => {
          const status = issue.fields?.status?.name || 'Unknown';
          if (!byStatus[status]) {
            byStatus[status] = [];
          }
          byStatus[status].push(issue);
        });

        // Format output
        const startDateDisplay = new Date(startDateFormatted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const endDateDisplay = new Date(endDateFormatted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        let output = `## Status Changes (${startDateDisplay} - ${endDateDisplay})\n\n`;

        Object.keys(byStatus).sort().forEach(status => {
          output += `### ${status}\n`;
          byStatus[status].forEach(issue => {
            const key = issue.key;
            const summary = issue.fields?.summary || 'No summary';
            const assignee = issue.fields?.assignee?.displayName || 'Unassigned';
            output += `- **${key}** - ${summary} (Assigned: ${assignee})\n`;
          });
          output += '\n';
        });

        output += `**Total: ${results.issues.length} tickets** changed status in this period`;

        return formatResponse({
          text: output,
          metadata: {
            dateRange: { start: startDateFormatted, end: endDateFormatted },
            totalTickets: results.issues.length,
            byStatus: Object.keys(byStatus).reduce((acc, status) => {
              acc[status] = byStatus[status].length;
              return acc;
            }, {} as Record<string, number>),
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    },
  );
}

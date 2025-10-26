import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { JiraService } from '../services/jira';
import { formatResponse, formatErrorResponse } from './utils';

/**
 * Register the calculate-story-points tool with the MCP server
 * @param server The MCP server instance
 * @param jiraService The Jira service instance
 */
export function registerCalculateStoryPointsTool(
  server: McpServer,
  jiraService: JiraService,
) {
  server.tool(
    'calculate_story_points',
    {
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD HH:mm format. Defaults to 14 days ago.'),
      projects: z
        .array(z.string())
        .optional()
        .describe('Array of project keys to track (e.g., ["PROJ1", "PROJ2", "PROJ3"]). If not provided, user must specify projects.'),
    },
    async ({ startDate, projects }) => {
      try {
        // Validate projects parameter
        if (!projects || projects.length === 0) {
          throw new Error('projects parameter is required. Please specify an array of project keys (e.g., ["PROJ1", "PROJ2", "PROJ3"])');
        }

        // Build JQL query with dynamic projects
        const projectsJql = projects.join(', ');
        let jql = `project IN (${projectsJql}) AND status = 'Done' AND `;

        if (startDate) {
          // Parse date string and convert to JQL format
          const date = new Date(startDate);
          const jqlDate = date.toISOString().slice(0, 16).replace('T', ' ');
          jql += `resolved >= "${jqlDate}"`;
        } else {
          jql += "resolved >= -14d";
        }

        // Fetch with ONLY 2 fields
        const results = await jiraService.searchIssues(
          jql,
          150,
          0, // startAt
          undefined, // expand
          ['project', 'customfield_10016'], // Only project and story points
        );

        // Process results
        const stats: Record<string, { tickets: number; points: number }> = {};

        // Initialize all specified projects (ensure they appear even with 0 tickets)
        projects.forEach(p => stats[p] = { tickets: 0, points: 0 });

        // Aggregate
        results.issues.forEach((issue: any) => {
          const project = issue.fields?.project?.key || 'Unknown';
          const points = issue.fields?.customfield_10016 || 0;

          if (stats[project]) {
            stats[project].tickets += 1;
            stats[project].points += points;
          }
        });

        // Format as markdown table
        const startDateStr = startDate || '14 days ago';
        let table = `## Story Points Completed (${startDateStr} to now)\n\n`;
        table += '| Project | Number of Tickets | Sum of Story Points |\n';
        table += '|---------|-------------------|---------------------|\n';

        // Sort projects alphabetically for consistent output
        const sortedProjects = projects.sort();
        sortedProjects.forEach(project => {
          const s = stats[project];
          table += `| ${project} | ${s.tickets} | ${s.points} |\n`;
        });

        return formatResponse({
          text: table,
          metadata: {
            dateRange: { start: startDate || '-14d', end: 'now' },
            projects: stats,
            projectsList: projects,
          },
        });
      } catch (err) {
        return formatErrorResponse(err);
      }
    },
  );
}

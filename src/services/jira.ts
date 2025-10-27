import { Version3Client } from 'jira.js';
import config from '@/config/env';

// Default fields for optimized queries
const DEFAULT_FIELDS = ['key', 'summary', 'status', 'assignee', 'priority'];

// Add Node.js types for process
declare global {
  interface Process {
    env: ProcessEnv;
  }
  interface ProcessEnv {
    NODE_TLS_REJECT_UNAUTHORIZED?: string;
  }
}

// Define interfaces for Jira issue types
interface JiraComment {
  body: string;
  created: string;
  author: {
    displayName?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface JiraIssueFields {
  summary?: string;
  description?: string;
  created: string;
  issuetype?: {
    name: string;
    [key: string]: unknown;
  };
  status?: {
    name: string;
    [key: string]: unknown;
  };
  assignee?: {
    displayName?: string;
    [key: string]: unknown;
  };
  comment?: {
    comments: JiraComment[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
  [key: string]: unknown;
}

interface StructuredJiraIssue {
  key: string;
  title: string;
  type: string;
  status: string;
  created: string;
  description: string;
  comments: {
    body: string;
    created: string;
    author: string;
  }[];
}

interface JiraSearchResult {
  nextPageToken?: string;
  isLast: boolean;
  maxResults: number;
  issues: JiraIssue[];
}

interface StructuredJiraSearchResult {
  nextPageToken?: string;
  isLast: boolean;
  maxResults: number;
  issues: StructuredJiraIssue[];
}

/**
 * Jira service for interacting with the Jira API
 */
export class JiraService {
  private client: Version3Client;

  constructor() {
    // Use the dedicated Jira URL if available, otherwise derive from Atlassian host
    const jiraUrl = config.jira.url || config.atlassian.host;

    // Disable SSL verification globally for Node.js (bypass self-signed certificate issues)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    this.client = new Version3Client({
      host: jiraUrl,
      authentication: {
        basic: {
          email: config.atlassian.email,
          apiToken: config.atlassian.apiToken,
        },
      },
    });
  }

  /**
   * Clean text by removing HTML tags and normalizing whitespace
   * @param text The text to clean
   * @returns The cleaned text
   */
  private cleanText(text: string | any): string {
    if (!text) return '';
    // If text is an object (ADF format), convert to string
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }
    // Remove HTML tags
    const withoutHtml = text.replace(/<[^>]*>/g, '');
    // Normalize whitespace
    return withoutHtml.replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse date string to a formatted date
   * @param dateString The date string to parse
   * @returns The formatted date string
   */
  private parseDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', error);
      return dateString;
    }
  }

  /**
   * Get an issue by key with parsed and structured fields
   * @param issueKey The key of the issue to retrieve
   * @param expand Optional fields to expand in the response (comma-separated string)
   * @returns The structured issue object
   */
  async getIssue(
    issueKey: string,
    expand?: string,
  ): Promise<StructuredJiraIssue> {
    try {
      // Use jira.js getIssue method
      const issue = (await this.client.issues.getIssue({
        issueIdOrKey: issueKey,
        expand: expand,
      })) as JiraIssue;

      // Extract fields
      const fields = issue.fields;

      // Process description
      const description = this.cleanText(fields.description || '');

      // Process comments
      const comments = [];
      if (fields.comment && fields.comment.comments) {
        for (const comment of fields.comment.comments) {
          comments.push({
            body: this.cleanText(comment.body),
            created: this.parseDate(comment.created),
            author: comment.author?.displayName || 'Unknown',
          });
        }
      }

      // Format created date
      const createdDate = this.parseDate(fields.created);

      // Create structured response
      const structuredIssue: StructuredJiraIssue = {
        key: issueKey,
        title: fields.summary || '',
        type: fields.issuetype?.name || '',
        status: fields.status?.name || '',
        created: createdDate,
        description,
        comments,
      };

      return structuredIssue;
    } catch (error) {
      console.error(`Error getting issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Search for issues using JQL (raw results)
   * @param jql The JQL query
   * @param maxResults The maximum number of results to return
   * @param nextPageToken Token for pagination (optional, for first page)
   * @param expand Optional fields to expand in the response (comma-separated string)
   * @param fields Optional fields to include in the response (for token optimization)
   * @returns The raw search results from Jira API
   */
  async searchIssuesRaw(
    jql: string,
    maxResults = 20,
    nextPageToken?: string,
    expand?: string,
    fields?: string[],
  ): Promise<JiraSearchResult> {
    try {
      // Build search options
      const searchOptions: {
        maxResults: number;
        nextPageToken?: string;
        expand?: string;
        fields?: string[];
      } = {
        maxResults,
        nextPageToken,
      };

      // Add expand if provided
      if (expand) {
        searchOptions.expand = expand;
      }

      // Add fields if provided (for token optimization)
      if (fields && fields.length > 0) {
        searchOptions.fields = fields;
      }

      // Execute search using jira.js searchForIssuesUsingJqlEnhancedSearch (new endpoint)
      const searchResult = await this.client.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql,
        maxResults: searchOptions.maxResults,
        nextPageToken: searchOptions.nextPageToken,
        expand: searchOptions.expand,
        fields: searchOptions.fields,
      }) as JiraSearchResult;

      return searchResult;
    } catch (error: any) {
      // Handle Jira API errors with clear messages
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          `Authentication failed. Please check your Jira credentials. Error: ${error.message}`,
        );
      }
      console.error('Error searching issues:', error);
      throw error;
    }
  }

  /**
   * Search for issues using JQL
   * @param jql The JQL query
   * @param maxResults The maximum number of results to return
   * @param nextPageToken Token for pagination (optional, for first page)
   * @param expand Optional fields to expand in the response (comma-separated string)
   * @param fields Optional fields to include in the response (for token optimization)
   * @returns The structured search results
   */
  async searchIssues(
    jql: string,
    maxResults = 20,
    nextPageToken?: string,
    expand?: string,
    fields?: string[],
  ): Promise<StructuredJiraSearchResult> {
    try {
      // Build search options
      const searchOptions: {
        maxResults: number;
        nextPageToken?: string;
        expand?: string;
        fields?: string[];
      } = {
        maxResults,
        nextPageToken,
      };

      // Add expand if provided
      if (expand) {
        searchOptions.expand = expand;
      }

      // Add fields if provided (for token optimization)
      if (fields && fields.length > 0) {
        searchOptions.fields = fields;
      }

      // Execute search using jira.js searchForIssuesUsingJqlEnhancedSearch (new endpoint)
      const searchResult = await this.client.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
        jql,
        maxResults: searchOptions.maxResults,
        nextPageToken: searchOptions.nextPageToken,
        expand: searchOptions.expand,
        fields: searchOptions.fields,
      }) as JiraSearchResult;

      // Note: The new API does not provide total count, so we cannot warn about truncation

      // Process each issue in the results
      const structuredIssues: StructuredJiraIssue[] = searchResult.issues.map(
        (issue) => {
          const fields = issue.fields;

          // Process description
          const description = this.cleanText(fields.description || '');

          // Process comments
          const comments = [];
          if (fields.comment && fields.comment.comments) {
            for (const comment of fields.comment.comments) {
              comments.push({
                body: this.cleanText(comment.body),
                created: this.parseDate(comment.created),
                author: comment.author?.displayName || 'Unknown',
              });
            }
          }

          // Format created date
          const createdDate = this.parseDate(fields.created);

          // Create structured issue
          return {
            key: issue.key,
            title: fields.summary || '',
            type: fields.issuetype?.name || '',
            status: fields.status?.name || '',
            created: createdDate,
            description,
            comments,
          };
        },
      );

      // Return structured search result
      return {
        nextPageToken: searchResult.nextPageToken,
        isLast: searchResult.isLast,
        maxResults: searchResult.maxResults,
        issues: structuredIssues,
      };
    } catch (error: any) {
      // Handle Jira API errors with clear messages
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          'Jira authentication failed. Check ATLASSIAN_API_TOKEN and ATLASSIAN_EMAIL in .env file',
        );
      }
      if (error.response?.status === 400) {
        const jiraError =
          error.response.data.errorMessages?.[0] || 'Invalid request';
        throw new Error(`Invalid JQL query: ${jql}\nJira error: ${jiraError}`);
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error(
          'Cannot connect to Jira. Check ATLASSIAN_HOST in .env and network connection',
        );
      }
      if (error.code === 'ENOTFOUND') {
        throw new Error(
          `Cannot resolve Jira host. Check ATLASSIAN_HOST in .env: ${process.env.ATLASSIAN_HOST}`,
        );
      }
      // Re-throw unexpected errors with context
      console.error(`Error searching issues with query ${jql}:`, error);
      throw new Error(`Jira API error: ${error.message}`);
    }
  }

  /**
   * Create a new issue
   * @param issueData The issue data to create
   * @returns The created issue
   */
  async createIssue(issueData: {
    project: string;
    summary: string;
    description?: string;
    issueType: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
    components?: string[];
    [key: string]: unknown;
  }): Promise<unknown> {
    try {
      const issue = {
        fields: {
          project: { key: issueData.project },
          summary: issueData.summary,
          description: issueData.description || '',
          issuetype: { name: issueData.issueType },
          ...(issueData.priority && { priority: { name: issueData.priority } }),
          ...(issueData.assignee && { assignee: { name: issueData.assignee } }),
          ...(issueData.labels && { labels: issueData.labels }),
          ...(issueData.components && {
            components: issueData.components.map((c) => ({ name: c })),
          }),
        },
      };

      return await this.client.issues.createIssue(issue);
    } catch (error) {
      console.error('Error creating issue:', error);
      throw error;
    }
  }

  /**
   * Update an existing issue
   * @param issueKey The key of the issue to update
   * @param updateData The data to update
   * @returns The updated issue
   */
  async updateIssue(
    issueKey: string,
    updateData: {
      summary?: string;
      description?: string;
      priority?: string;
      assignee?: string;
      labels?: string[];
      [key: string]: unknown;
    },
  ): Promise<void> {
    try {
      const update: { fields: Record<string, unknown> } = { fields: {} };

      if (updateData.summary) update.fields.summary = updateData.summary;
      if (updateData.description)
        update.fields.description = updateData.description;
      if (updateData.priority)
        update.fields.priority = { name: updateData.priority };
      if (updateData.assignee)
        update.fields.assignee = { name: updateData.assignee };
      if (updateData.labels) update.fields.labels = updateData.labels;

      await this.client.issues.editIssue({
        issueIdOrKey: issueKey,
        ...update,
      });
    } catch (error) {
      console.error(`Error updating issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete an issue
   * @param issueKey The key of the issue to delete
   * @returns Success status
   */
  async deleteIssue(issueKey: string): Promise<void> {
    try {
      await this.client.issues.deleteIssue({
        issueIdOrKey: issueKey,
      });
    } catch (error) {
      console.error(`Error deleting issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Add a comment to an issue
   * @param issueKey The key of the issue
   * @param comment The comment text
   * @returns The added comment
   */
  async addComment(issueKey: string, comment: string): Promise<unknown> {
    try {
      return await this.client.issueComments.addComment({
        issueIdOrKey: issueKey,
        comment: comment,
      });
    } catch (error) {
      console.error(`Error adding comment to issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get available transitions for an issue
   * @param issueKey The key of the issue
   * @returns Available transitions
   */
  async getTransitions(issueKey: string): Promise<unknown> {
    try {
      return await this.client.issues.getTransitions({
        issueIdOrKey: issueKey,
      });
    } catch (error) {
      console.error(`Error getting transitions for issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Transition an issue to a new status
   * @param issueKey The key of the issue
   * @param transitionId The ID of the transition
   * @param comment Optional comment for the transition
   * @returns The transition result
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    comment?: string,
  ): Promise<void> {
    try {
      const transition: {
        transition: { id: string };
        update?: { comment: Array<{ add: { body: string } }> };
      } = { transition: { id: transitionId } };
      if (comment) {
        transition.update = { comment: [{ add: { body: comment } }] };
      }
      await this.client.issues.doTransition({
        issueIdOrKey: issueKey,
        ...transition,
      });
    } catch (error) {
      console.error(`Error transitioning issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get all projects
   * @returns List of all projects
   */
  async getAllProjects(): Promise<unknown> {
    try {
      return await this.client.projects.searchProjects();
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw error;
    }
  }

  /**
   * Add work log to an issue
   * @param issueKey The key of the issue
   * @param timeSpent Time spent (e.g., "2h 30m")
   * @param comment Optional comment
   * @param started Optional start date
   * @returns The added work log
   */
  async addWorklog(
    issueKey: string,
    timeSpent: string,
    comment?: string,
    started?: string,
  ): Promise<unknown> {
    try {
      const worklog: { timeSpent: string; comment?: string; started?: string } =
        { timeSpent };
      if (comment) worklog.comment = comment;
      if (started) worklog.started = started;

      return await this.client.issueWorklogs.addWorklog({
        issueIdOrKey: issueKey,
        ...worklog,
      });
    } catch (error) {
      console.error(`Error adding worklog to issue ${issueKey}:`, error);
      throw error;
    }
  }

  // TODO: Implement getWorklog when API signature is clarified
  // async getWorklog(issueKey: string): Promise<any> { ... }
}
